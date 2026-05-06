import { useMemo, useState } from 'react';
import { useWalletUi } from '@wallet-ui/react';
import type { UiWalletAccount } from '@wallet-standard/react';
import type { Address } from '@solana/kit';
import { Button } from '../ui/Button';
import { TokenInput } from '../ui/TokenInput';
import { TransactionSignatureLink } from '../ui/TransactionSignatureLink';
import { DirectionToggle } from './DirectionToggle';
import { SlippageControl } from './SlippageControl';
import { useDebounced } from '../../hooks/useDebounced';
import { useSwapQuote } from '../../hooks/useSwapQuote';
import { useSubmitSwap } from '../../hooks/useSubmitSwap';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import type { PoolView } from '../../hooks/usePool';
import { resolveDirection, type SwapDirection } from '../../solana/simulate';
import { getTokenMeta } from '../../solana/tokens';
import { formatTokenAmount, parseTokenAmount } from '../../lib/format';
import { applySlippageMin } from '../../lib/slippage';
import './swap-widget.css';

interface SwapWidgetProps {
  pool: PoolView;
}

export function SwapWidget({ pool }: SwapWidgetProps) {
  const { account } = useWalletUi();
  if (!account) {
    return <ConnectGate />;
  }
  return <SwapWidgetConnected pool={pool} account={account} />;
}

function ConnectGate() {
  return (
    <div className="swap-cta-card" role="status">
      <p className="swap-cta-title">Connect a wallet to swap</p>
      <p className="swap-cta-help">
        Live quotes are computed by simulating the swap with your account.
      </p>
    </div>
  );
}

function SwapWidgetConnected({
  pool,
  account,
}: {
  pool: PoolView;
  account: UiWalletAccount;
}) {
  const [direction, setDirection] = useState<SwapDirection>('zeroForOne');
  const [amountInText, setAmountInText] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);

  const accounts = useMemo(() => resolveDirection(pool, direction), [pool, direction]);
  const inputMeta = getTokenMeta(accounts.inputMint);
  const outputMeta = getTokenMeta(accounts.outputMint);

  const inputBalanceQuery = useTokenBalance({
    mint: accounts.inputMint,
    tokenProgram: accounts.inputTokenProgram,
  });
  const outputBalanceQuery = useTokenBalance({
    mint: accounts.outputMint,
    tokenProgram: accounts.outputTokenProgram,
  });

  const amountIn = useMemo(
    () => parseTokenAmount(amountInText, accounts.inputDecimals),
    [amountInText, accounts.inputDecimals],
  );
  const debouncedAmountIn = useDebounced(amountIn, 280);

  const owner = account.address as Address;
  const quote = useSwapQuote({
    pool,
    owner,
    direction,
    amountIn: debouncedAmountIn,
  });

  const submit = useSubmitSwap(account);

  const inputBalance = inputBalanceQuery.data ?? null;
  const outputBalance = outputBalanceQuery.data ?? null;
  const insufficient =
    amountIn != null && inputBalance != null && amountIn > inputBalance;

  const outputAmount = quote.data?.outputAmount;
  const outputText = outputAmount != null
    ? formatTokenAmount(outputAmount, accounts.outputDecimals, { maxFractionDigits: 6 })
    : '';

  const minimumAmountOut = useMemo(() => {
    if (outputAmount == null) return null;
    return applySlippageMin(outputAmount, slippageBps);
  }, [outputAmount, slippageBps]);

  const onMax = () => {
    if (inputBalance == null) return;
    setAmountInText(formatTokenAmount(inputBalance, accounts.inputDecimals, { maxFractionDigits: accounts.inputDecimals }).replace(/,/g, ''));
  };

  const onToggle = () => {
    setDirection((d) => (d === 'zeroForOne' ? 'oneForZero' : 'zeroForOne'));
    setAmountInText('');
    submit.reset();
  };

  const onSubmit = () => {
    if (amountIn == null || amountIn <= 0n || minimumAmountOut == null) return;
    submit.mutate({
      pool,
      direction,
      amountIn,
      minimumAmountOut,
    });
  };

  const errorMessage =
    submit.error instanceof Error
      ? submit.error.message
      : quote.isError && quote.error instanceof Error
        ? quote.error.message
        : null;

  const submitDisabled =
    pool.swapDisabled ||
    insufficient ||
    !pool.oracleSeeded ||
    submit.isPending ||
    quote.isFetching ||
    amountIn == null ||
    amountIn <= 0n ||
    outputAmount == null ||
    quote.isError;

  const submitLabel = pool.swapDisabled
    ? 'Swap disabled'
    : !pool.oracleSeeded
      ? 'Oracle not initialized'
      : insufficient
        ? `Insufficient ${inputMeta.symbol}`
        : submit.isPending
          ? 'Sending…'
          : quote.isFetching
            ? 'Quoting…'
            : 'Swap';

  return (
    <div className="swap-widget">
      <TokenInput
        label="You pay"
        token={inputMeta}
        decimals={accounts.inputDecimals}
        amountText={amountInText}
        onChange={setAmountInText}
        balance={inputBalance}
        onMax={inputBalance && inputBalance > 0n ? onMax : undefined}
      />
      <DirectionToggle onToggle={onToggle} disabled={submit.isPending} />
      <TokenInput
        label="You receive"
        token={outputMeta}
        decimals={accounts.outputDecimals}
        amountText={outputText}
        balance={outputBalance}
        readOnly
        placeholder={quote.isFetching ? 'Quoting…' : '0.00'}
      />

      <QuoteSummary
        pool={pool}
        quote={quote.data}
        minimumAmountOut={minimumAmountOut}
        outputDecimals={accounts.outputDecimals}
        outputSymbol={outputMeta.symbol}
      />

      <SlippageControl bps={slippageBps} onChange={setSlippageBps} />

      {errorMessage && (
        <p className="swap-error" role="alert">
          {errorMessage}
        </p>
      )}

      {submit.data && (
        <p className="swap-success" role="status">
          Swap sent · <TransactionSignatureLink signature={submit.data} />
        </p>
      )}

      <Button
        type="button"
        size="lg"
        onClick={onSubmit}
        disabled={submitDisabled}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

interface QuoteSummaryProps {
  pool: PoolView;
  quote: ReturnType<typeof useSwapQuote>['data'];
  minimumAmountOut: bigint | null;
  outputDecimals: number;
  outputSymbol: string;
}

function QuoteSummary({
  pool,
  quote,
  minimumAmountOut,
  outputDecimals,
  outputSymbol,
}: QuoteSummaryProps) {
  if (!quote) return null;
  const feePct = Number(pool.effectiveTradeFeeRate) / 10_000;
  const minOutText = minimumAmountOut != null
    ? formatTokenAmount(minimumAmountOut, outputDecimals, { maxFractionDigits: 6 })
    : '—';
  return (
    <dl className="quote-summary">
      <div>
        <dt>Min received</dt>
        <dd>
          {minOutText} {outputSymbol}
        </dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>{feePct.toFixed(2)}%</dd>
      </div>
    </dl>
  );
}
