import { defineConfig } from 'vite';

/**
 * Separate build for the loader (integration script).
 * Run: vite build --config vite.loader.config.ts
 * Output: dist/loader.js
 *
 * Vite does not support multiple IIFE entries in one build, so the loader
 * is built in a second pass.
 */
export default defineConfig({
  build: {
    lib: {
      entry: 'src/loader.ts',
      name: 'CallWidgetLoader',
      fileName: () => 'loader.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
