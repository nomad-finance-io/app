import { useQuery } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { useRpc } from '../solana/rpc';
import { quoteSwap, type QuoteResult, type SwapDirection } from '../solana/simulate';
import type { PoolView } from './usePool';

interface UseSwapQuoteParams {
  pool: PoolView | null;
  owner: Address | null;
  direction: SwapDirection;
  amountIn: bigint | null;
}

export function useSwapQuote({ pool, owner, direction, amountIn }: UseSwapQuoteParams) {
  const rpc = useRpc();
  const enabled = pool != null && owner != null && amountIn != null && amountIn > 0n;

  return useQuery<QuoteResult>({
    queryKey: [
      'swapQuote',
      pool?.poolStateAddress,
      owner,
      direction,
      amountIn?.toString(),
    ],
    enabled,
    staleTime: 5_000,
    retry: false,
    queryFn: () =>
      quoteSwap({
        rpc,
        pool: pool!,
        owner: owner!,
        direction,
        amountIn: amountIn!,
      }),
  });
}
