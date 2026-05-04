import { POOLS, poolKey, type PoolConfig } from '../../solana/pools';
import './pair-selector.css';

interface PairSelectorProps {
  value: PoolConfig | null;
  onChange: (config: PoolConfig) => void;
}

export function PairSelector({ value, onChange }: PairSelectorProps) {
  if (POOLS.length === 0) {
    return (
      <div className="pair-empty" role="status">
        <p className="pair-empty-title">No pools configured</p>
        <p className="pair-empty-help">
          Add entries to <code>src/solana/pools.ts</code> with{' '}
          <code>{'{ token0Mint, token1Mint, ammConfigIndex }'}</code> for each
          pool you want to expose.
        </p>
      </div>
    );
  }

  return (
    <label className="pair-selector">
      <span className="pair-label">Pool</span>
      <select
        className="pair-select"
        value={value ? poolKey(value) : ''}
        onChange={(event) => {
          const next = POOLS.find((pool) => poolKey(pool) === event.target.value);
          if (next) onChange(next);
        }}
      >
        {!value && <option value="">Select a pool</option>}
        {POOLS.map((pool) => (
          <option key={poolKey(pool)} value={poolKey(pool)}>
            {pool.label}
          </option>
        ))}
      </select>
    </label>
  );
}
