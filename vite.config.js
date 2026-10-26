import { defineConfig } from 'vite';

// Vanilla ESM project. Vite handles dev serving, the production build, and
// dependency pre-bundling for three; no framework plugin is needed.
export default defineConfig({
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // three is a single large dependency by design; the game is one route.
    chunkSizeWarningLimit: 700,
  },
});
