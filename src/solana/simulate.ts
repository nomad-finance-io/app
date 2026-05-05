import {
  appendTransactionMessageInstruction,
  blockhash,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit';
import { findAssociatedTokenPda } from '@solana-program/token';
import {
  getSwapBaseInputInstructionAsync,
  getSwapBaseOutputInstructionAsync,
} from '../generated';
import type { PoolView } from '../hooks/usePool';
import type { SolanaClient } from './rpc';
import { findSwapEvent, type SwapEvent } from './events';

export type SwapDirection = 'zeroForOne' | 'oneForZero';

const PLACEHOLDER_BLOCKHASH = blockhash('11111111111111111111111111111111');

interface DirectionAccounts {
  inputMint: Address;
  outputMint: Address;
  inputVault: Address;
  outputVault: Address;
  inputTokenProgram: Address;
  outputTokenProgram: Address;
  inputDecimals: number;
  outputDecimals: number;
}

export function resolveDirection(pool: PoolView, direction: SwapDirection): DirectionAccounts {
  if (direction === 'zeroForOne') {
    return {
      inputMint: pool.state.token0Mint,
      outputMint: pool.state.token1Mint,
      inputVault: pool.state.token0Vault,
      outputVault: pool.state.token1Vault,
      inputTokenProgram: pool.state.token0Program,
      outputTokenProgram: pool.state.token1Program,
      inputDecimals: pool.state.mint0Decimals,
      outputDecimals: pool.state.mint1Decimals,
    };
  }
  return {
    inputMint: pool.state.token1Mint,
    outputMint: pool.state.token0Mint,
    inputVault: pool.state.token1Vault,
    outputVault: pool.state.token0Vault,
    inputTokenProgram: pool.state.token1Program,
    outputTokenProgram: pool.state.token0Program,
    inputDecimals: pool.state.mint1Decimals,
    outputDecimals: pool.state.mint0Decimals,
  };
}

async function deriveUserAtas(owner: Address, accounts: DirectionAccounts) {
  const [inputAta] = await findAssociatedTokenPda({
    owner,
    mint: accounts.inputMint,
    tokenProgram: accounts.inputTokenProgram,
  });
  const [outputAta] = await findAssociatedTokenPda({
    owner,
    mint: accounts.outputMint,
    tokenProgram: accounts.outputTokenProgram,
  });
  return { inputAta, outputAta };
}

interface BuildArgs {
  pool: PoolView;
  direction: SwapDirection;
  payer: TransactionSigner;
  amountIn: bigint;
  minimumAmountOut: bigint;
}

export async function buildSwapInstruction({
  pool,
  direction,
  payer,
  amountIn,
  minimumAmountOut,
}: BuildArgs): Promise<Instruction> {
  const accounts = resolveDirection(pool, direction);
  const { inputAta, outputAta } = await deriveUserAtas(payer.address, accounts);
  return getSwapBaseInputInstructionAsync({
    payer,
    ammConfig: pool.state.ammConfig,
    poolState: pool.poolStateAddress,
    inputTokenAccount: inputAta,
    outputTokenAccount: outputAta,
    inputVault: accounts.inputVault,
    outputVault: accounts.outputVault,
    inputTokenProgram: accounts.inputTokenProgram,
    outputTokenProgram: accounts.outputTokenProgram,
    inputTokenMint: accounts.inputMint,
    outputTokenMint: accounts.outputMint,
    observationState: pool.state.observationKey,
    amountIn,
    minimumAmountOut,
  });
}

interface BuildExactOutArgs {
  pool: PoolView;
  direction: SwapDirection;
  payer: TransactionSigner;
  amountOut: bigint;
  maximumAmountIn: bigint;
}

export async function buildSwapExactOutInstruction({
  pool,
  direction,
  payer,
  amountOut,
  maximumAmountIn,
}: BuildExactOutArgs): Promise<Instruction> {
  const accounts = resolveDirection(pool, direction);
  const { inputAta, outputAta } = await deriveUserAtas(payer.address, accounts);
  return getSwapBaseOutputInstructionAsync({
    payer,
    ammConfig: pool.state.ammConfig,
    poolState: pool.poolStateAddress,
    inputTokenAccount: inputAta,
    outputTokenAccount: outputAta,
    inputVault: accounts.inputVault,
    outputVault: accounts.outputVault,
    inputTokenProgram: accounts.inputTokenProgram,
    outputTokenProgram: accounts.outputTokenProgram,
    inputTokenMint: accounts.inputMint,
    outputTokenMint: accounts.outputMint,
    observationState: pool.state.observationKey,
    maxAmountIn: maximumAmountIn,
    amountOut,
  });
}

export interface QuoteResult {
  event: SwapEvent;
  outputAmount: bigint;
  inputAmount: bigint;
  tradeFee: bigint;
  effectiveTradeFeeRate: bigint;
  oracleLastUpdateUnix: bigint;
}

export class QuoteError extends Error {
  constructor(message: string, readonly logs?: readonly string[]) {
    super(message);
    this.name = 'QuoteError';
  }
}

interface QuoteParams {
  rpc: SolanaClient;
  pool: PoolView;
  owner: Address;
  direction: SwapDirection;
  amountIn: bigint;
}

export async function quoteSwap({
  rpc,
  pool,
  owner,
  direction,
  amountIn,
}: QuoteParams): Promise<QuoteResult> {
  if (amountIn <= 0n) throw new QuoteError('Enter an amount greater than zero');
  if (!pool.oracleSeeded) {
    throw new QuoteError('Pool oracle not yet initialized');
  }
  if (pool.swapDisabled) {
    throw new QuoteError('Swap is disabled for this pool');
  }

  const noopSigner = createNoopSigner(owner);
  const ix = await buildSwapInstruction({
    pool,
    direction,
    payer: noopSigner,
    amountIn,
    minimumAmountOut: 0n,
  });

  const message = (() => {
    const m1 = createTransactionMessage({ version: 0 });
    const m2 = setTransactionMessageFeePayerSigner(noopSigner, m1);
    const m3 = setTransactionMessageLifetimeUsingBlockhash(
      { blockhash: PLACEHOLDER_BLOCKHASH, lastValidBlockHeight: 0n },
      m2,
    );
    return appendTransactionMessageInstruction(ix, m3);
  })();

  const signed = await partiallySignTransactionMessageWithSigners(message);
  const wire = getBase64EncodedWireTransaction(signed);

  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `[quoteSwap] ${direction} amountIn=${amountIn} pool=${pool.poolStateAddress}`,
  );
  // eslint-disable-next-line no-console
  console.log('wire (base64):', wire);
  // eslint-disable-next-line no-console
  console.log(
    'inspect:',
    `https://explorer.solana.com/tx/inspector?message=${encodeURIComponent(wire)}`,
  );

  const sim = await rpc
    .simulateTransaction(wire, {
      encoding: 'base64',
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment: 'processed',
    })
    .send();

  const logs = sim.value.logs ?? [];
  // eslint-disable-next-line no-console
  console.log('err:', sim.value.err);
  // eslint-disable-next-line no-console
  console.log('logs:', logs);
  // eslint-disable-next-line no-console
  console.groupEnd();
  if (sim.value.err) {
    const reason = describeSimError(sim.value.err, logs);
    throw new QuoteError(reason, logs);
  }
  const event = findSwapEvent(logs);
  if (!event) {
    throw new QuoteError('Simulation completed but emitted no SwapEvent', logs);
  }
  return {
    event,
    outputAmount: event.outputAmount - event.outputTransferFee,
    inputAmount: event.inputAmount,
    tradeFee: event.tradeFee,
    effectiveTradeFeeRate: event.effectiveTradeFeeRate,
    oracleLastUpdateUnix: event.oracleLastUpdateUnix,
  };
}

function describeSimError(err: unknown, logs: readonly string[]): string {
  const lastLog = [...logs].reverse().find((line) => line.includes('Error'));
  if (lastLog) {
    if (lastLog.includes('OracleNotInitialized')) {
      return 'Pool oracle not yet initialized';
    }
    if (lastLog.includes('NotApproved')) {
      return 'Swap not allowed (pool paused or not yet open)';
    }
    if (lastLog.includes('insufficient funds')) {
      return 'Insufficient input balance';
    }
    if (lastLog.includes('ZeroTradingTokens')) {
      return 'Amount too small — increase the input or the pool has insufficient liquidity';
    }
    return lastLog.replace(/^Program log: /, '').slice(0, 160);
  }
  return typeof err === 'string' ? err : 'Simulation failed';
}
