import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletUi, createWalletUiConfig } from '@wallet-ui/react';
import { CLUSTERS } from './solana/cluster';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [walletConfig] = useState(() =>
    createWalletUiConfig({ clusters: CLUSTERS }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletUi config={walletConfig}>{children}</WalletUi>
    </QueryClientProvider>
  );
}
