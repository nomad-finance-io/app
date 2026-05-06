import { PoolFrame } from '../ui/PoolFrame';
import { PoolStats } from '../liquidity/PoolStats';
import { SwapWidget } from './SwapWidget';
import './swap-page.css';

export function SwapPage() {
  return (
    <section className="swap-page" aria-labelledby="swap-heading">
      <header className="page-header">
        <h1 id="swap-heading" className="page-title">
          Swap
        </h1>
        <p className="page-lede">
          Oracle-anchored quotes, executed on Solana in a single transaction.
        </p>
      </header>
      <PoolFrame>
        {(pool) => (
          <>
            <SwapWidget pool={pool} />
            <PoolStats pool={pool} />
          </>
        )}
      </PoolFrame>
    </section>
  );
}
