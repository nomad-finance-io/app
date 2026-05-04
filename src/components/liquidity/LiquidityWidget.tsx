import { useMemo, useState } from 'react';
import { useWalletUi } from '@wallet-ui/react';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import type { UiWalletAccount } from '@wallet-standard/react';
import { Button } from '../ui/Button';
import { TokenInput } from '../ui/TokenInput';
import { SlippageControl } from '../swap/SlippageControl';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useSubmitDeposit } from '../../hooks/useSubmitDeposit';
import { useSubmitWithdraw } from '../../hooks/useSubmitWithdraw';
import type { PoolView } from '../../hooks/usePool';
import { lpTokensToTradingTokens } from '../../lib/liquidity-math';
import { applySlippageMax, applySlippageMin } from '../../lib/slippage';
import { formatTokenAmount, parseTokenAmount } from '../../lib/format';
import { getTokenMeta } from '../../solana/tokens';
import './liquidity-widget.css';

type Mode = 'add' | 'remove';

interface LiquidityWidgetProps {
  pool: PoolView;
}

export function LiquidityWidget({ pool }: LiquidityWidgetProps) {
  const { account } = useWalletUi();
  if (!account) {
    return (
      <div className="liquidity-cta-card" role="status">
        <p className="liquidity-cta-title">Connect a wallet to manage liquidity</p>
      </div>
    );
  }
  return <LiquidityWidgetConnected pool={pool} account={account} />;
}

function LiquidityWidgetConnected({
  pool,
  account: _account,
}: {
  pool: PoolView;
  account: UiWalletAccount;
}) {
  const [mode, setMode] = useState<Mode>('add');
  return (
    <div className="liquidity-widget">
      <div className="liquidity-tabs" role="tablist" aria-label="Liquidity action">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'add'}
          className={mode === 'add' ? 'liquidity-tab is-active' : 'liquidity-tab'}
          onClick={() => setMode('add')}
        >
          Add
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'remove'}
          className={mode === 'remove' ? 'liquidity-tab is-active' : 'liquidity-tab'}
          onClick={() => setMode('remove')}
        >
          Remove
        </button>
      </div>
      {mode === 'add' ? (
        <AddLiquidityForm pool={pool} account={_account} />
      ) : (
        <RemoveLiquidityForm pool={pool} account={_account} />
      )}
    </div>
  );
}

function AddLiquidityForm({
  pool,
  account,
}: {
  pool: PoolView;
  account: UiWalletAccount;
}) {
  const [lpAmountText, setLpAmountText] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);

  const lpDecimals = pool.state.lpMintDecimals;
  const lpAmount = useMemo(
    () => parseTokenAmount(lpAmountText, lpDecimals),
    [lpAmountText, lpDecimals],
  );

  const split = useMemo(() => {
    if (!lpAmount || lpAmount <= 0n) return null;
    return lpTokensToTradingTokens(
      lpAmount,
      pool.state.lpSupply,
      pool.netToken0,
      pool.netToken1,
      'ceil',
    );
  }, [lpAmount, pool]);

  const token0Meta = getTokenMeta(pool.config.token0Mint);
  const token1Meta = getTokenMeta(pool.config.token1Mint);

  const token0Balance = useTokenBalance({
    mint: pool.config.token0Mint,
    tokenProgram: pool.state.token0Program,
  });
  const token1Balance = useTokenBalance({
    mint: pool.config.token1Mint,
    tokenProgram: pool.state.token1Program,
  });

  const submit = useSubmitDeposit(account);

  const insufficient0 =
    split && token0Balance.data != null
      ? applySlippageMax(split.token0Amount, slippageBps) > token0Balance.data
      : false;
  const insufficient1 =
    split && token1Balance.data != null
      ? applySlippageMax(split.token1Amount, slippageBps) > token1Balance.data
      : false;

  const onSubmit = () => {
    if (!split || !lpAmount) return;
    submit.mutate({
      pool,
      lpTokenAmount: lpAmount,
      maximumToken0Amount: applySlippageMax(split.token0Amount, slippageBps),
      maximumToken1Amount: applySlippageMax(split.token1Amount, slippageBps),
    });
  };

  const disabled =
    pool.depositDisabled ||
    !lpAmount ||
    lpAmount <= 0n ||
    !split ||
    submit.isPending ||
    insufficient0 ||
    insufficient1 ||
    pool.state.lpSupply === 0n;

  const label = pool.depositDisabled
    ? 'Deposit disabled'
    : pool.state.lpSupply === 0n
      ? 'Pool not initialized'
      : insufficient0
        ? `Insufficient ${token0Meta.symbol}`
        : insufficient1
          ? `Insufficient ${token1Meta.symbol}`
          : submit.isPending
            ? 'Sending…'
            : 'Add liquidity';

  return (
    <div className="liquidity-form">
      <TokenInput
        label="LP shares to mint"
        token={{
          mint: pool.state.lpMint,
          symbol: 'LP',
          name: `${pool.config.label} LP`,
        }}
        decimals={lpDecimals}
        amountText={lpAmountText}
        onChange={setLpAmountText}
      />

      <LiquiditySplit
        title="You deposit"
        token0Symbol={token0Meta.symbol}
        token1Symbol={token1Meta.symbol}
        token0Decimals={pool.state.mint0Decimals}
        token1Decimals={pool.state.mint1Decimals}
        split={split}
        slippageBps={slippageBps}
        mode="ceil"
      />

      <SlippageControl bps={slippageBps} onChange={setSlippageBps} />

      {submit.error instanceof Error && (
        <p className="swap-error" role="alert">
          {submit.error.message}
        </p>
      )}

      {submit.data && (
        <p className="swap-success" role="status">
          Deposit sent · signature {submit.data.slice(0, 8)}…{submit.data.slice(-8)}
        </p>
      )}

      <Button type="button" size="lg" onClick={onSubmit} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}

function RemoveLiquidityForm({
  pool,
  account,
}: {
  pool: PoolView;
  account: UiWalletAccount;
}) {
  const [lpAmountText, setLpAmountText] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);

  const lpDecimals = pool.state.lpMintDecimals;
  const lpAmount = useMemo(
    () => parseTokenAmount(lpAmountText, lpDecimals),
    [lpAmountText, lpDecimals],
  );

  const split = useMemo(() => {
    if (!lpAmount || lpAmount <= 0n) return null;
    return lpTokensToTradingTokens(
      lpAmount,
      pool.state.lpSupply,
      pool.netToken0,
      pool.netToken1,
      'floor',
    );
  }, [lpAmount, pool]);

  const token0Meta = getTokenMeta(pool.config.token0Mint);
  const token1Meta = getTokenMeta(pool.config.token1Mint);

  const lpBalance = useTokenBalance({
    mint: pool.state.lpMint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const submit = useSubmitWithdraw(account);

  const insufficient =
    lpAmount != null && lpBalance.data != null && lpAmount > lpBalance.data;

  const onMax = () => {
    if (lpBalance.data == null) return;
    setLpAmountText(
      formatTokenAmount(lpBalance.data, lpDecimals, { maxFractionDigits: lpDecimals }).replace(
        /,/g,
        '',
      ),
    );
  };

  const onSubmit = () => {
    if (!split || !lpAmount) return;
    submit.mutate({
      pool,
      lpTokenAmount: lpAmount,
      minimumToken0Amount: applySlippageMin(split.token0Amount, slippageBps),
      minimumToken1Amount: applySlippageMin(split.token1Amount, slippageBps),
    });
  };

  const disabled =
    pool.withdrawDisabled ||
    !lpAmount ||
    lpAmount <= 0n ||
    !split ||
    submit.isPending ||
    insufficient ||
    pool.state.lpSupply === 0n;

  const label = pool.withdrawDisabled
    ? 'Withdraw disabled'
    : insufficient
      ? 'Insufficient LP balance'
      : submit.isPending
        ? 'Sending…'
        : 'Remove liquidity';

  return (
    <div className="liquidity-form">
      <TokenInput
        label="LP shares to burn"
        token={{
          mint: pool.state.lpMint,
          symbol: 'LP',
          name: `${pool.config.label} LP`,
        }}
        decimals={lpDecimals}
        amountText={lpAmountText}
        onChange={setLpAmountText}
        balance={lpBalance.data ?? null}
        onMax={lpBalance.data && lpBalance.data > 0n ? onMax : undefined}
      />

      <LiquiditySplit
        title="You receive at least"
        token0Symbol={token0Meta.symbol}
        token1Symbol={token1Meta.symbol}
        token0Decimals={pool.state.mint0Decimals}
        token1Decimals={pool.state.mint1Decimals}
        split={split}
        slippageBps={slippageBps}
        mode="floor"
      />

      <SlippageControl bps={slippageBps} onChange={setSlippageBps} />

      {submit.error instanceof Error && (
        <p className="swap-error" role="alert">
          {submit.error.message}
        </p>
      )}

      {submit.data && (
        <p className="swap-success" role="status">
          Withdraw sent · signature {submit.data.slice(0, 8)}…{submit.data.slice(-8)}
        </p>
      )}

      <Button type="button" size="lg" onClick={onSubmit} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}

interface LiquiditySplitProps {
  title: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  split: { token0Amount: bigint; token1Amount: bigint } | null;
  slippageBps: number;
  mode: 'ceil' | 'floor';
}

function LiquiditySplit({
  title,
  token0Symbol,
  token1Symbol,
  token0Decimals,
  token1Decimals,
  split,
  slippageBps,
  mode,
}: LiquiditySplitProps) {
  const apply = mode === 'ceil' ? applySlippageMax : applySlippageMin;
  const t0 = split ? apply(split.token0Amount, slippageBps) : null;
  const t1 = split ? apply(split.token1Amount, slippageBps) : null;
  return (
    <div className="liquidity-split">
      <p className="liquidity-split-title">{title}</p>
      <div className="liquidity-split-rows">
        <div>
          <span>{token0Symbol}</span>
          <span>
            {t0 != null
              ? formatTokenAmount(t0, token0Decimals, { maxFractionDigits: 6 })
              : '—'}
          </span>
        </div>
        <div>
          <span>{token1Symbol}</span>
          <span>
            {t1 != null
              ? formatTokenAmount(t1, token1Decimals, { maxFractionDigits: 6 })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
