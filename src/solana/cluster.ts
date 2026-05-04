import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaMainnet,
  createSolanaTestnet,
  type SolanaCluster,
} from '@wallet-ui/core';

const DEFAULT_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

function detectClusterFromUrl(url: string): SolanaCluster {
  if (/localhost|127\.0\.0\.1/.test(url)) return createSolanaLocalnet(url);
  if (/devnet/.test(url)) return createSolanaDevnet(url);
  if (/testnet/.test(url)) return createSolanaTestnet(url);
  return createSolanaMainnet(url);
}

export function getDefaultCluster(): SolanaCluster {
  const envUrl = import.meta.env.VITE_SOLANA_RPC_URL?.trim();
  return envUrl ? detectClusterFromUrl(envUrl) : createSolanaMainnet(DEFAULT_MAINNET_RPC);
}

export const CLUSTERS: SolanaCluster[] = [getDefaultCluster()];
