import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase58Decoder,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Address,
} from '@solana/kit';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import { useWalletAccountTransactionSendingSigner, useWalletUi } from '@wallet-ui/react';
import type { UiWalletAccount } from '@wallet-standard/react';
import { getDepositInstructionAsync } from '../generated';
import { useRpc } from '../solana/rpc';
import { TOKEN_2022_PROGRAM_ADDRESS } from '../solana/programs';
import type { PoolView } from './usePool';

interface SubmitDepositParams {
  pool: PoolView;
  lpTokenAmount: bigint;
  maximumToken0Amount: bigint;
  maximumToken1Amount: bigint;
}

const sigDecoder = getBase58Decoder();

export function useSubmitDeposit(account: UiWalletAccount) {
  const rpc = useRpc();
  const { cluster } = useWalletUi();
  const queryClient = useQueryClient();
  const sendingSigner = useWalletAccountTransactionSendingSigner(account, cluster.id);

  return useMutation({
    mutationFn: async ({
      pool,
      lpTokenAmount,
      maximumToken0Amount,
      maximumToken1Amount,
    }: SubmitDepositParams): Promise<string> => {
      const owner = account.address as Address;

      const [token0Account] = await findAssociatedTokenPda({
        owner,
        mint: pool.state.token0Mint,
        tokenProgram: pool.state.token0Program,
      });
      const [token1Account] = await findAssociatedTokenPda({
        owner,
        mint: pool.state.token1Mint,
        tokenProgram: pool.state.token1Program,
      });
      const [ownerLpToken] = await findAssociatedTokenPda({
        owner,
        mint: pool.state.lpMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      });

      const ensure0 = await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: sendingSigner,
        owner,
        mint: pool.state.token0Mint,
        ata: token0Account,
        tokenProgram: pool.state.token0Program,
      });
      const ensure1 = await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: sendingSigner,
        owner,
        mint: pool.state.token1Mint,
        ata: token1Account,
        tokenProgram: pool.state.token1Program,
      });
      const ensureLp = await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: sendingSigner,
        owner,
        mint: pool.state.lpMint,
        ata: ownerLpToken,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      });

      const depositIx = await getDepositInstructionAsync({
        owner: sendingSigner,
        poolState: pool.poolStateAddress,
        ownerLpToken,
        token0Account,
        token1Account,
        token0Vault: pool.state.token0Vault,
        token1Vault: pool.state.token1Vault,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
        vault0Mint: pool.state.token0Mint,
        vault1Mint: pool.state.token1Mint,
        lpMint: pool.state.lpMint,
        lpTokenAmount,
        maximumToken0Amount,
        maximumToken1Amount,
      });

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const m1 = createTransactionMessage({ version: 0 });
      const m2 = setTransactionMessageFeePayerSigner(sendingSigner, m1);
      const m3 = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m2);
      const message = appendTransactionMessageInstructions(
        [ensure0, ensure1, ensureLp, depositIx],
        m3,
      );

      const signature = await signAndSendTransactionMessageWithSigners(message);
      return sigDecoder.decode(signature);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool'] });
      queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
    },
  });
}
