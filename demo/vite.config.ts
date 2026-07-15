import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// The demo host app. It loads the built widget IIFE (demo/public/call-widget.js)
// via the loader — the real CDN-style integration. Relative base so it deploys
// to a GitHub Pages project subpath.
export default defineConfig({
  base: './',
  plugins: [preact()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
});
