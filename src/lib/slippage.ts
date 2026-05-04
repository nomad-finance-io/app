const BPS_DENOMINATOR = 10_000n;

export function applySlippageMin(amount: bigint, bps: number): bigint {
  if (bps <= 0) return amount;
  const factor = BPS_DENOMINATOR - BigInt(bps);
  return (amount * factor) / BPS_DENOMINATOR;
}

export function applySlippageMax(amount: bigint, bps: number): bigint {
  if (bps <= 0) return amount;
  const factor = BPS_DENOMINATOR + BigInt(bps);
  return (amount * factor + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR;
}
