import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001/facom-techweek-layerx/us-east1/api',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js', 'scripts/**/*.test.mjs'],
  },
})
