import {
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  type Address,
} from '@solana/kit';
import { findAmmConfigPda, NOMAD_AMM_PROGRAM_ADDRESS } from '../generated';

export interface PoolConfig {
  /** Display label, e.g. "SOL / USDC". */
  label: string;
  /**
   * Token-0 mint. Must sort lexicographically before `token1Mint` —
   * the on-chain initialize checks token_0_mint < token_1_mint.
   */
  token0Mint: Address;
  token1Mint: Address;
  /** AMM config PDA index (u16). Most pools use 0. */
  ammConfigIndex: number;
}

/**
 * Hardcoded pool registry. Populate after deploying / discovering pools on
 * the target cluster — there is no on-chain "list pools" query.
 */
export const POOLS: PoolConfig[] = [
  {
    label: 'SPYx / USDC',
    token0Mint: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W' as Address,
    token1Mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address,
    ammConfigIndex: 0,
  },
];

const POOL_SEED = 'pool';

const utf8 = getUtf8Encoder();
const addressEncoder = getAddressEncoder();

export interface PoolAddresses {
  poolState: Address;
  ammConfig: Address;
  token0Mint: Address;
  token1Mint: Address;
}

export async function derivePoolAddresses(config: PoolConfig): Promise<PoolAddresses> {
  const [ammConfig] = await findAmmConfigPda({ index: config.ammConfigIndex });
  const [poolState] = await getProgramDerivedAddress({
    programAddress: NOMAD_AMM_PROGRAM_ADDRESS,
    seeds: [
      utf8.encode(POOL_SEED),
      addressEncoder.encode(ammConfig),
      addressEncoder.encode(config.token0Mint),
      addressEncoder.encode(config.token1Mint),
    ],
  });
  return {
    poolState,
    ammConfig,
    token0Mint: config.token0Mint,
    token1Mint: config.token1Mint,
  };
}

export function poolKey(config: PoolConfig): string {
  return `${config.ammConfigIndex}:${config.token0Mint}:${config.token1Mint}`;
}
