import { useQuery } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { fetchMaybeToken, findAssociatedTokenPda } from '@solana-program/token';
import { useWalletUi } from '@wallet-ui/react';
import { useRpc } from '../solana/rpc';

interface BalanceParams {
  mint: Address | null;
  tokenProgram: Address | null;
}

export function useTokenBalance({ mint, tokenProgram }: BalanceParams) {
  const rpc = useRpc();
  const { account } = useWalletUi();
  const owner = account?.address as Address | undefined;

  return useQuery({
    queryKey: ['tokenBalance', owner, mint, tokenProgram],
    enabled: owner != null && mint != null && tokenProgram != null,
    staleTime: 5_000,
    refetchInterval: 15_000,
    queryFn: async (): Promise<bigint> => {
      const [ata] = await findAssociatedTokenPda({
        owner: owner!,
        mint: mint!,
        tokenProgram: tokenProgram!,
      });
      const account = await fetchMaybeToken(rpc, ata);
      return account.exists ? account.data.amount : 0n;
    },
  });
}
