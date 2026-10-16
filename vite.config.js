import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 4000}` },
  },
});
