import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ellipsify,
  useWalletUi,
  useWalletUiWallet,
  useWalletUiWallets,
} from '@wallet-ui/react';

type UiWallet = ReturnType<typeof useWalletUiWallets>[number];
const WALLET_UNAVAILABLE_MESSAGE =
  'This wallet is no longer available. Try refreshing the page or re-enabling the extension.';

interface ConnectAttempt {
  walletName: string;
  nonce: number;
}

interface ConnectInvokerProps {
  wallet: UiWallet;
  onSuccess: () => void;
  onError: (message: string) => void;
}

/**
 * Mounted only after the user clicks a wallet. Calls `useWalletUiWallet` —
 * which throws synchronously during render if the underlying Wallet Standard
 * handle has been unregistered — and triggers `connect()` inside an effect.
 * The parent wraps this in `<ConnectAttemptBoundary>` so a sync throw is
 * surfaced to the parent without crashing the dropdown.
 */
function ConnectInvoker({ wallet, onSuccess, onError }: ConnectInvokerProps) {
  const { connect } = useWalletUiWallet({ wallet });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await connect();
        if (!cancelled) onSuccess();
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Failed to connect wallet.';
        onError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `connect` identity changes per render of the parent hook; we only want
    // to fire once per mounted ConnectInvoker (one click → one attempt).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

interface ConnectAttemptBoundaryProps {
  children: ReactNode;
  onError: (message: string) => void;
}

interface ConnectAttemptBoundaryState {
  hasError: boolean;
}

class ConnectAttemptBoundary extends Component<
  ConnectAttemptBoundaryProps,
  ConnectAttemptBoundaryState
> {
  state: ConnectAttemptBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ConnectAttemptBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const message =
      error instanceof Error
        ? WALLET_UNAVAILABLE_MESSAGE
        : 'Failed to connect wallet.';
    this.props.onError(message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function CustomWalletDropdown() {
  const { account, connected, disconnect } = useWalletUi();
  const wallets = useWalletUiWallets();
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState<ConnectAttempt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedWallet = attempt
    ? wallets.find((wallet) => wallet.name === attempt.walletName) ?? null
    : null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!attempt || selectedWallet) return;
    setAttempt(null);
    setErrorMessage(WALLET_UNAVAILABLE_MESSAGE);
  }, [attempt, selectedWallet]);

  const startConnect = (wallet: UiWallet) => {
    setErrorMessage(null);
    setAttempt({ walletName: wallet.name, nonce: Date.now() });
  };

  const handleConnected = () => {
    setAttempt(null);
    setOpen(false);
  };

  const handleConnectError = (message: string) => {
    setAttempt(null);
    setErrorMessage(message);
  };

  const buttonLabel =
    connected && account ? ellipsify(account.address) : 'Connect Wallet';

  return (
    <div ref={containerRef} className="wallet-dropdown">
      <button
        type="button"
        className="wallet-fallback-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {buttonLabel}
      </button>
      {open && (
        <div className="wallet-menu" role="menu">
          {connected && account ? (
            <>
              <button
                type="button"
                className="wallet-menu-item"
                onClick={() => {
                  void navigator.clipboard?.writeText(account.address);
                  setOpen(false);
                }}
              >
                <span className="wallet-menu-label">Copy address</span>
              </button>
              <button
                type="button"
                className="wallet-menu-item"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                <span className="wallet-menu-label">Disconnect</span>
              </button>
            </>
          ) : wallets.length === 0 ? (
            <div className="wallet-menu-empty">No wallets detected</div>
          ) : (
            <>
              {wallets.map((wallet) => {
                const pending = attempt?.walletName === wallet.name;
                return (
                  <button
                    key={wallet.name}
                    type="button"
                    className="wallet-menu-item"
                    disabled={Boolean(attempt)}
                    onClick={() => startConnect(wallet)}
                  >
                    <img
                      src={wallet.icon}
                      alt=""
                      className="wallet-menu-icon"
                      width={20}
                      height={20}
                    />
                    <span className="wallet-menu-label">{wallet.name}</span>
                    {pending && <span className="wallet-menu-pending">…</span>}
                  </button>
                );
              })}
              {errorMessage && (
                <div className="wallet-menu-error" role="alert">
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {attempt && selectedWallet && (
        <ConnectAttemptBoundary
          key={attempt.nonce}
          onError={handleConnectError}
        >
          <ConnectInvoker
            wallet={selectedWallet}
            onSuccess={handleConnected}
            onError={handleConnectError}
          />
        </ConnectAttemptBoundary>
      )}
    </div>
  );
}
