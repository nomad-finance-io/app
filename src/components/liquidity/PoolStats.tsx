import { formatTokenAmount } from '../../lib/format';
import type { PoolView } from '../../hooks/usePool';
import { getTokenMeta } from '../../solana/tokens';
import './pool-stats.css';

interface PoolStatsProps {
  pool: PoolView;
}

export function PoolStats({ pool }: PoolStatsProps) {
  const token0 = getTokenMeta(pool.config.token0Mint);
  const token1 = getTokenMeta(pool.config.token1Mint);
  const fmt = (raw: bigint, decimals: number) =>
    formatTokenAmount(raw, decimals, { maxFractionDigits: 4 });

  return (
    <dl className="pool-stats" aria-label={`${pool.config.label} pool statistics`}>
      <div>
        <dt>{token0.symbol} reserves</dt>
        <dd>{fmt(pool.netToken0, pool.state.mint0Decimals)}</dd>
      </div>
      <div>
        <dt>{token1.symbol} reserves</dt>
        <dd>{fmt(pool.netToken1, pool.state.mint1Decimals)}</dd>
      </div>
      <div>
        <dt>LP supply</dt>
        <dd>{fmt(pool.state.lpSupply, pool.state.lpMintDecimals)}</dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>{(Number(pool.effectiveTradeFeeRate) / 10_000).toFixed(2)}%</dd>
      </div>
    </dl>
  );
}
