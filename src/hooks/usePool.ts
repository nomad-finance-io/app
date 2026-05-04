import { useQuery } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { fetchToken, type Token } from '@solana-program/token';
import {
  fetchAmmConfig,
  fetchPoolState,
  type AmmConfig,
  type PoolState,
} from '../generated';
import { derivePoolAddresses, poolKey, type PoolConfig } from '../solana/pools';
import { useRpc, type SolanaClient } from '../solana/rpc';

export interface PoolView {
  config: PoolConfig;
  poolStateAddress: Address;
  state: PoolState;
  ammConfig: AmmConfig;
  vault0: Token;
  vault1: Token;
  /** Effective trade fee rate, FEE_RATE_DENOMINATOR_VALUE-scaled (1e6). */
  effectiveTradeFeeRate: bigint;
  /** Pool status flags (bit0=deposit disabled, bit1=withdraw disabled, bit2=swap disabled). */
  swapDisabled: boolean;
  depositDisabled: boolean;
  withdrawDisabled: boolean;
  /** Net vault balances after pool fees are subtracted. */
  netToken0: bigint;
  netToken1: bigint;
  oracleSeeded: boolean;
}

const STATUS_DEPOSIT_DISABLED = 0b001;
const STATUS_WITHDRAW_DISABLED = 0b010;
const STATUS_SWAP_DISABLED = 0b100;

async function loadPool(rpc: SolanaClient, config: PoolConfig): Promise<PoolView> {
  const addresses = await derivePoolAddresses(config);
  const pool = await fetchPoolState(rpc, addresses.poolState);
  const ammConfig = await fetchAmmConfig(rpc, pool.data.ammConfig);
  const [vault0, vault1] = await Promise.all([
    fetchToken(rpc, pool.data.token0Vault),
    fetchToken(rpc, pool.data.token1Vault),
  ]);

  const status = pool.data.status;
  const effectiveTradeFeeRate =
    pool.data.dynamicFeeRate > 0n ? pool.data.dynamicFeeRate : ammConfig.data.tradeFeeRate;

  const netToken0 =
    vault0.data.amount -
    pool.data.protocolFeesToken0 -
    pool.data.fundFeesToken0 -
    pool.data.creatorFeesToken0;
  const netToken1 =
    vault1.data.amount -
    pool.data.protocolFeesToken1 -
    pool.data.fundFeesToken1 -
    pool.data.creatorFeesToken1;

  return {
    config,
    poolStateAddress: addresses.poolState,
    state: pool.data,
    ammConfig: ammConfig.data,
    vault0: vault0.data,
    vault1: vault1.data,
    effectiveTradeFeeRate,
    swapDisabled: (status & STATUS_SWAP_DISABLED) !== 0,
    depositDisabled: (status & STATUS_DEPOSIT_DISABLED) !== 0,
    withdrawDisabled: (status & STATUS_WITHDRAW_DISABLED) !== 0,
    netToken0: netToken0 < 0n ? 0n : netToken0,
    netToken1: netToken1 < 0n ? 0n : netToken1,
    oracleSeeded:
      pool.data.effectiveBidMantissa !== 0n && pool.data.effectiveAskMantissa !== 0n,
  };
}

export function usePool(config: PoolConfig | null) {
  const rpc = useRpc();
  return useQuery({
    queryKey: ['pool', config ? poolKey(config) : null],
    queryFn: () => loadPool(rpc, config!),
    enabled: config != null,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}
