import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for a mobile-first React app
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    host: true,
    // allow ngrok tunnel hostnames (and common ngrok domains)
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io']
  }
})
