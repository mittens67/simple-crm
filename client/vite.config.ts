import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin /graphql in dev so the httpOnly refresh cookie works
    // without cross-site cookie headaches.
    proxy: {
      '/graphql': 'http://localhost:4000',
    },
  },
})
