import { Component, type ReactNode } from 'react';

interface WalletItemBoundaryProps {
  children: ReactNode;
}

interface WalletItemBoundaryState {
  hasError: boolean;
}

/**
 * Isolates a single wallet entry. If the underlying Wallet Standard handle
 * has been unregistered, `useWalletUiWallet` throws synchronously during
 * render — this boundary swallows that and hides only the broken item, so
 * the rest of the wallet list still works.
 */
export class WalletItemBoundary extends Component<
  WalletItemBoundaryProps,
  WalletItemBoundaryState
> {
  state: WalletItemBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WalletItemBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.warn('[WalletItemBoundary] hiding stale wallet item:', error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
