import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite builds the React app into ./dist
// Wrangler then serves ./dist as static assets from the same Worker
// that handles /api/* requests — no CORS issues, one origin.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  // During `vite dev` (not used for this project — we use `wrangler dev` instead)
  // this proxy would forward API calls to the Worker dev server.
  // With `wrangler dev` running Vite in Worker mode, this is not needed.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
