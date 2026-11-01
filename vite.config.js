import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app updates don't force phones to re-parse React & co.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\/]/.test(id)) return 'react';
          if (/[\/](@tanstack|sonner)[\/]/.test(id)) return 'data';
          if (/[\/](@radix-ui|lucide-react|canvas-confetti)[\/]/.test(id)) return 'ui';
          if (/[\/]@capacitor[\/]/.test(id)) return 'native';
          return undefined;
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 4000}` },
  },
});
