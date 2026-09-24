import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Cho phép import code dùng chung ở ../shared
    fs: { allow: ['..'] },
    // API chạy bằng `wrangler dev` ở cổng 8787
    proxy: { '/api': 'http://localhost:8787' },
  },
})
