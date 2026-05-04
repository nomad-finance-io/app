import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase58Decoder,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
} from '@solana/kit';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
} from '@solana-program/token';
import { useWalletAccountTransactionSendingSigner, useWalletUi } from '@wallet-ui/react';
import type { UiWalletAccount } from '@wallet-standard/react';
import { useRpc } from '../solana/rpc';
import {
  buildSwapInstruction,
  resolveDirection,
  type SwapDirection,
} from '../solana/simulate';
import type { PoolView } from './usePool';

interface SubmitSwapParams {
  pool: PoolView;
  account: UiWalletAccount;
  direction: SwapDirection;
  amountIn: bigint;
  minimumAmountOut: bigint;
}

const sigDecoder = getBase58Decoder();

export function useSubmitSwap(account: UiWalletAccount) {
  const rpc = useRpc();
  const { cluster } = useWalletUi();
  const queryClient = useQueryClient();
  const sendingSigner = useWalletAccountTransactionSendingSigner(account, cluster.id);

  return useMutation({
    mutationFn: async ({
      pool,
      direction,
      amountIn,
      minimumAmountOut,
    }: Omit<SubmitSwapParams, 'account'>): Promise<string> => {
      const accounts = resolveDirection(pool, direction);
      const [outputAta] = await findAssociatedTokenPda({
        owner: sendingSigner.address,
        mint: accounts.outputMint,
        tokenProgram: accounts.outputTokenProgram,
      });
      const ensureOutputAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: sendingSigner,
        owner: sendingSigner.address,
        mint: accounts.outputMint,
        ata: outputAta,
        tokenProgram: accounts.outputTokenProgram,
      });
      const swapIx = await buildSwapInstruction({
        pool,
        direction,
        payer: sendingSigner,
        amountIn,
        minimumAmountOut,
      });

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const m1 = createTransactionMessage({ version: 0 });
      const m2 = setTransactionMessageFeePayerSigner(sendingSigner, m1);
      const m3 = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m2);
      const message = appendTransactionMessageInstructions([ensureOutputAta, swapIx], m3);

      const signature = await signAndSendTransactionMessageWithSigners(message);
      return sigDecoder.decode(signature);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool'] });
      queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
    },
  });
}

