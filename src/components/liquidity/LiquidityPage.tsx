import { PoolFrame } from '../ui/PoolFrame';
import { LiquidityWidget } from './LiquidityWidget';
import { PoolStats } from './PoolStats';
import '../swap/swap-page.css';

export function LiquidityPage() {
  return (
    <section className="swap-page" aria-labelledby="liquidity-heading">
      <header className="page-header">
        <h1 id="liquidity-heading" className="page-title">
          Liquidity
        </h1>
        <p className="page-lede">
          Add or withdraw liquidity from oracle-anchored pools.
        </p>
      </header>
      <PoolFrame>
        {(pool) => (
          <>
            <LiquidityWidget pool={pool} />
            <PoolStats pool={pool} />
          </>
        )}
      </PoolFrame>
    </section>
  );
}
