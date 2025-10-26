import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:4175',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  }
});
