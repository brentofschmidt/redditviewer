import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    // The API stays on the Python server, started separately. Proxying keeps it
    // same-origin from the browser's point of view, so there's no CORS to set up.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
