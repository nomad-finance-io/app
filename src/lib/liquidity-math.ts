function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function floorDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  return numerator / denominator;
}

export type RoundDirection = 'ceil' | 'floor';

export interface TokenSplit {
  token0Amount: bigint;
  token1Amount: bigint;
}

/**
 * Mirrors `CurveCalculator::lp_tokens_to_trading_tokens` from the on-chain
 * curve module. Used for both deposit (round = 'ceil') and withdraw (round =
 * 'floor') quotes — the math is the same, only rounding direction differs.
 */
export function lpTokensToTradingTokens(
  lpAmount: bigint,
  lpSupply: bigint,
  totalToken0: bigint,
  totalToken1: bigint,
  round: RoundDirection,
): TokenSplit {
  if (lpSupply === 0n) {
    return { token0Amount: 0n, token1Amount: 0n };
  }
  const div = round === 'ceil' ? ceilDiv : floorDiv;
  return {
    token0Amount: div(lpAmount * totalToken0, lpSupply),
    token1Amount: div(lpAmount * totalToken1, lpSupply),
  };
}
