import { useState, type ReactNode } from 'react';
import { POOLS, type PoolConfig } from '../../solana/pools';
import { usePool, type PoolView } from '../../hooks/usePool';
import { PairSelector } from './PairSelector';
import { Surface } from './Surface';
import './pool-frame.css';

interface PoolFrameProps {
  children: (pool: PoolView) => ReactNode;
}

export function PoolFrame({ children }: PoolFrameProps) {
  const [selected, setSelected] = useState<PoolConfig | null>(POOLS[0] ?? null);
  const query = usePool(selected);

  return (
    <div className="pool-frame">
      {POOLS.length !== 1 && <PairSelector value={selected} onChange={setSelected} />}
      {selected && (
        <Surface className="pool-frame-card">
          {query.isLoading && <div className="pool-frame-state">Loading pool…</div>}
          {query.isError && (
            <div className="pool-frame-state pool-frame-error">
              {(query.error as Error).message ?? 'Failed to load pool'}
            </div>
          )}
          {query.data && children(query.data)}
        </Surface>
      )}
    </div>
  );
}
