import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    strictPort: true,
    port: 3069,
  },
  plugins: [react()],
})
