import { Component, type ReactNode } from 'react';

interface WalletDropdownBoundaryProps {
  children: ReactNode;
}

interface WalletDropdownBoundaryState {
  hasError: boolean;
}

/**
 * Outer safety net for the wallet dropdown subtree. Per-item failures are
 * isolated by `WalletItemBoundary`; this boundary catches anything broader
 * (e.g. a top-level hook crash) so the rest of the page keeps rendering.
 */
export class WalletDropdownBoundary extends Component<
  WalletDropdownBoundaryProps,
  WalletDropdownBoundaryState
> {
  state: WalletDropdownBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WalletDropdownBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.warn('[WalletDropdownBoundary] suppressed wallet error:', error);
    }
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <button
          type="button"
          className="wallet-fallback-button"
          onClick={this.retry}
        >
          Connect Wallet
        </button>
      );
    }
    return this.props.children;
  }
}
