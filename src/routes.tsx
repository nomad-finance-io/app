import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { SwapPage } from './components/swap/SwapPage';
import { LiquidityPage } from './components/liquidity/LiquidityPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, element: <Navigate to="/swap" replace /> },
      { path: 'swap', Component: SwapPage },
      { path: 'liquidity', Component: LiquidityPage },
      { path: '*', element: <Navigate to="/swap" replace /> },
    ],
  },
]);
