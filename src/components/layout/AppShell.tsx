import { Outlet } from 'react-router';
import { NavBar } from './NavBar';
import './app-shell.css';

export function AppShell() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
