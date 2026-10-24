import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = globalThis.process.env.EXODUS_API_TARGET || 'http://127.0.0.1:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': apiTarget } },
  preview: { proxy: { '/api': apiTarget } },
})
