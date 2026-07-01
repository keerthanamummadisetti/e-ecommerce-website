import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:80',
      '/users': 'http://localhost:80',
      '/products': 'http://localhost:80',
      '/orders': 'http://localhost:80',
      '/payments': 'http://localhost:80',
      '/inventory': 'http://localhost:80',
      '/cart': 'http://localhost:80',
      '/notifications': 'http://localhost:80',
      '/search': 'http://localhost:80',
      '/reviews': 'http://localhost:80',
      '/analytics': 'http://localhost:80',
    }
  }
})
