import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `@solana/errors` reads `process.env.NODE_ENV` directly in its browser bundle
  // (and so do a few other kit deps). Vite doesn't shim `process` for
  // pre-bundled deps, so we inline the value at build/dev time.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
}));
