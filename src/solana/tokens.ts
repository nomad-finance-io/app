import type { Address } from '@solana/kit';
import { shortAddress } from '../lib/format';

export interface TokenMeta {
  mint: Address;
  symbol: string;
  name: string;
  logoURI?: string;
}

const REGISTRY: Record<string, Omit<TokenMeta, 'mint'>> = {
  So11111111111111111111111111111111111111112: {
    symbol: 'SOL',
    name: 'Wrapped SOL',
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: 'USDC',
    name: 'USD Coin',
  },
  XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W: {
    symbol: 'SPYx',
    name: 'SPYx',
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: 'USDT',
    name: 'Tether USD',
  },
};

export function getTokenMeta(mint: Address): TokenMeta {
  const known = REGISTRY[mint as string];
  if (known) return { mint, ...known };
  return { mint, symbol: shortAddress(mint as string, 3, 3), name: mint as string };
}
