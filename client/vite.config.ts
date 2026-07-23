import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:4000'),
  },
  server: {
    // Same-origin /graphql in dev so the httpOnly refresh cookie works
    // without cross-site cookie headaches.
    proxy: {
      '/graphql': 'http://localhost:4000',
    },
  },
})
