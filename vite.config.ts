import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5174,
    cors: true,
    strictPort: true,
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'CallWidgetBundle',
      fileName: () => 'call-widget.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'call-widget[extname]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __WIDGET_VERSION__: JSON.stringify(pkg.version),
  },
});
