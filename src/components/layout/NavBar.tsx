import { NavLink } from 'react-router';
import { CustomWalletDropdown } from './CustomWalletDropdown';
import { WalletDropdownBoundary } from './WalletDropdownBoundary';
import './nav-bar.css';

const NAV_ITEMS = [
  { to: '/swap', label: 'Swap' },
  { to: '/liquidity', label: 'Liquidity' },
] as const;

export function NavBar() {
  return (
    <header className="nav-bar">
      <div className="nav-inner">
        <div className="nav-left">
          <NavLink to="/swap" className="brand" aria-label="Nomad home">
            <img
              src="/logo.jpeg"
              alt=""
              className="brand-mark-img"
              width={28}
              height={28}
            />
            <span className="brand-wordmark">Nomad</span>
          </NavLink>
          <nav aria-label="Main" className="nav-links">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? 'nav-link is-active' : 'nav-link'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="nav-right">
          <WalletDropdownBoundary>
            <CustomWalletDropdown />
          </WalletDropdownBoundary>
        </div>
      </div>
    </header>
  );
}
