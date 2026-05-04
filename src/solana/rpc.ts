import { useMemo } from 'react';
import { createSolanaRpc } from '@solana/kit';
import { useWalletUi } from '@wallet-ui/react';

export function useRpc() {
  const { cluster } = useWalletUi();
  return useMemo(() => createSolanaRpc(cluster.url), [cluster.url]);
}

export type SolanaClient = ReturnType<typeof useRpc>;
