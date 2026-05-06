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
import { lpTokensToTradingTokens, tradingTokensToLpTokens } from '../../lib/liquidity-math';
import { applySlippageMax, applySlippageMin } from '../../lib/slippage';
import { formatTokenAmount, parseTokenAmount } from '../../lib/format';
import { getTokenMeta } from '../../solana/tokens';
import './liquidity-widget.css';

type Mode = 'add' | 'remove';
type LiquidityInputSide = 'token0' | 'token1';

interface LiquidityWidgetProps {
  pool: PoolView;
}

interface AddLiquidityQuote {
  lpAmount: bigint;
  token0Amount: bigint;
  token1Amount: bigint;
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

function formatInputAmount(raw: bigint, decimals: number): string {
  return formatTokenAmount(raw, decimals, { maxFractionDigits: decimals }).replace(/,/g, '');
}

function quoteAddLiquidity(
  pool: PoolView,
  side: LiquidityInputSide,
  sourceAmount: bigint,
): AddLiquidityQuote | null {
  if (sourceAmount <= 0n || pool.state.lpSupply === 0n) {
    return null;
  }

  const totalSource = side === 'token0' ? pool.netToken0 : pool.netToken1;
  const lpAmount = tradingTokensToLpTokens(sourceAmount, pool.state.lpSupply, totalSource, 'floor');
  if (lpAmount <= 0n) {
    return null;
  }

  const split = lpTokensToTradingTokens(
    lpAmount,
    pool.state.lpSupply,
    pool.netToken0,
    pool.netToken1,
    'ceil',
  );
  return {
    lpAmount,
    token0Amount: split.token0Amount,
    token1Amount: split.token1Amount,
  };
}

function findMaxAddLiquiditySourceAmount(
  pool: PoolView,
  side: LiquidityInputSide,
  sourceBalance: bigint,
  token0Balance: bigint,
  token1Balance: bigint,
): bigint {
  if (sourceBalance <= 0n || token0Balance <= 0n || token1Balance <= 0n) {
    return 0n;
  }

  let low = 0n;
  let high = sourceBalance;

  while (low < high) {
    const mid = (low + high + 1n) / 2n;
    const quote = quoteAddLiquidity(pool, side, mid);
    const canCover =
      quote != null && quote.token0Amount <= token0Balance && quote.token1Amount <= token1Balance;

    if (canCover) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }

  return low;
}

function AddLiquidityForm({
  pool,
  account,
}: {
  pool: PoolView;
  account: UiWalletAccount;
}) {
  const [token0AmountText, setToken0AmountText] = useState('');
  const [token1AmountText, setToken1AmountText] = useState('');
  const [lastEdited, setLastEdited] = useState<LiquidityInputSide>('token0');

  const token0Decimals = pool.state.mint0Decimals;
  const token1Decimals = pool.state.mint1Decimals;
  const lpDecimals = pool.state.lpMintDecimals;
  const sourceAmountText = lastEdited === 'token0' ? token0AmountText : token1AmountText;
  const sourceDecimals = lastEdited === 'token0' ? token0Decimals : token1Decimals;
  const sourceAmount = useMemo(
    () => parseTokenAmount(sourceAmountText, sourceDecimals),
    [sourceAmountText, sourceDecimals],
  );

  const quote = useMemo(() => {
    if (!sourceAmount || sourceAmount <= 0n) return null;
    return quoteAddLiquidity(pool, lastEdited, sourceAmount);
  }, [lastEdited, pool, sourceAmount]);

  const token0Meta = getTokenMeta(pool.config.token0Mint);
  const token1Meta = getTokenMeta(pool.config.token1Mint);

  const displayedToken0AmountText =
    lastEdited === 'token0'
      ? token0AmountText
      : quote
        ? formatInputAmount(quote.token0Amount, token0Decimals)
        : '';
  const displayedToken1AmountText =
    lastEdited === 'token1'
      ? token1AmountText
      : quote
        ? formatInputAmount(quote.token1Amount, token1Decimals)
        : '';

  const maximumToken0Amount = useMemo(
    () => parseTokenAmount(displayedToken0AmountText, token0Decimals),
    [displayedToken0AmountText, token0Decimals],
  );
  const maximumToken1Amount = useMemo(
    () => parseTokenAmount(displayedToken1AmountText, token1Decimals),
    [displayedToken1AmountText, token1Decimals],
  );

  const token0Balance = useTokenBalance({
    mint: pool.config.token0Mint,
    tokenProgram: pool.state.token0Program,
  });
  const token1Balance = useTokenBalance({
    mint: pool.config.token1Mint,
    tokenProgram: pool.state.token1Program,
  });
  const token0BalanceAmount = token0Balance.data ?? 0n;
  const token1BalanceAmount = token1Balance.data ?? 0n;

  const maxToken0SourceAmount = useMemo(
    () =>
      findMaxAddLiquiditySourceAmount(
        pool,
        'token0',
        token0BalanceAmount,
        token0BalanceAmount,
        token1BalanceAmount,
      ),
    [pool, token0BalanceAmount, token1BalanceAmount],
  );
  const maxToken1SourceAmount = useMemo(
    () =>
      findMaxAddLiquiditySourceAmount(
        pool,
        'token1',
        token1BalanceAmount,
        token0BalanceAmount,
        token1BalanceAmount,
      ),
    [pool, token0BalanceAmount, token1BalanceAmount],
  );

  const submit = useSubmitDeposit(account);

  const insufficient0 =
    maximumToken0Amount != null && token0Balance.data != null
      ? maximumToken0Amount > token0Balance.data
      : false;
  const insufficient1 =
    maximumToken1Amount != null && token1Balance.data != null
      ? maximumToken1Amount > token1Balance.data
      : false;

  const onSubmit = () => {
    if (!quote || !maximumToken0Amount || !maximumToken1Amount) return;
    submit.mutate({
      pool,
      lpTokenAmount: quote.lpAmount,
      maximumToken0Amount,
      maximumToken1Amount,
    });
  };

  const onToken0Max = () => {
    setLastEdited('token0');
    setToken0AmountText(formatInputAmount(maxToken0SourceAmount, token0Decimals));
  };

  const onToken1Max = () => {
    setLastEdited('token1');
    setToken1AmountText(formatInputAmount(maxToken1SourceAmount, token1Decimals));
  };

  const hasSourceInput = sourceAmountText.trim().length > 0;
  const invalidSourceAmount = hasSourceInput && sourceAmount == null;
  const amountTooSmall = hasSourceInput && sourceAmount != null && sourceAmount > 0n && !quote;

  const disabled =
    pool.depositDisabled ||
    !quote ||
    !maximumToken0Amount ||
    !maximumToken1Amount ||
    submit.isPending ||
    insufficient0 ||
    insufficient1 ||
    pool.state.lpSupply === 0n;

  const label = pool.depositDisabled
    ? 'Deposit disabled'
    : pool.state.lpSupply === 0n
      ? 'Pool not initialized'
      : invalidSourceAmount
        ? 'Invalid amount'
        : amountTooSmall
          ? 'Amount too small'
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
        label={`${token0Meta.symbol} to provide`}
        token={token0Meta}
        decimals={token0Decimals}
        amountText={displayedToken0AmountText}
        onChange={(next) => {
          setLastEdited('token0');
          setToken0AmountText(next);
        }}
        balance={token0Balance.data ?? null}
        onMax={maxToken0SourceAmount > 0n ? onToken0Max : undefined}
      />

      <TokenInput
        label={`${token1Meta.symbol} to provide`}
        token={token1Meta}
        decimals={token1Decimals}
        amountText={displayedToken1AmountText}
        onChange={(next) => {
          setLastEdited('token1');
          setToken1AmountText(next);
        }}
        balance={token1Balance.data ?? null}
        onMax={maxToken1SourceAmount > 0n ? onToken1Max : undefined}
      />

      <LiquidityMintPreview
        lpAmount={quote?.lpAmount ?? null}
        lpDecimals={lpDecimals}
        poolLabel={pool.config.label}
      />

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

function LiquidityMintPreview({
  lpAmount,
  lpDecimals,
  poolLabel,
}: {
  lpAmount: bigint | null;
  lpDecimals: number;
  poolLabel: string;
}) {
  return (
    <div className="liquidity-split">
      <p className="liquidity-split-title">You mint</p>
      <div className="liquidity-split-rows">
        <div>
          <span>{poolLabel} LP</span>
          <span>
            {lpAmount != null
              ? formatTokenAmount(lpAmount, lpDecimals, { maxFractionDigits: 6 })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
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
