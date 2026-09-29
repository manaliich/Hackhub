import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['hackhub-gdg.embarko.app'],
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
  }
})