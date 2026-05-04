export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  options: { maxFractionDigits?: number } = {},
): string {
  const { maxFractionDigits = decimals } = options;
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(decimals, '0');
  const trimmed = fracStr.slice(0, maxFractionDigits).replace(/0+$/, '');
  const wholeStr = whole.toString();
  const grouped = wholeStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = trimmed ? `${grouped}.${trimmed}` : grouped;
  return negative ? `-${out}` : out;
}

export function parseTokenAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.replace(/,/g, '').trim();
  if (!trimmed) return null;
  if (!/^\d*(?:\.\d*)?$/.test(trimmed)) return null;
  const [whole = '', frac = ''] = trimmed.split('.');
  if (frac.length > decimals) return null;
  const padded = frac.padEnd(decimals, '0');
  const combined = `${whole || '0'}${padded}`;
  return BigInt(combined);
}

export function shortAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
