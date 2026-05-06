import { useWalletUi } from '@wallet-ui/react';
import { shortAddress } from '../../lib/format';

interface TransactionSignatureLinkProps {
  signature: string;
}

function getSolscanClusterParam(clusterUrl: string): string | null {
  if (/devnet/i.test(clusterUrl)) return 'devnet';
  if (/testnet/i.test(clusterUrl)) return 'testnet';
  return null;
}

function getSolscanTransactionUrl(signature: string, clusterUrl: string): string {
  const url = new URL(`https://solscan.io/tx/${signature}`);
  const cluster = getSolscanClusterParam(clusterUrl);
  if (cluster) {
    url.searchParams.set('cluster', cluster);
  }
  return url.toString();
}

export function TransactionSignatureLink({ signature }: TransactionSignatureLinkProps) {
  const { cluster } = useWalletUi();

  return (
    <a
      className="transaction-signature-link"
      href={getSolscanTransactionUrl(signature, cluster.url)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {shortAddress(signature, 8, 8)}
    </a>
  );
}
