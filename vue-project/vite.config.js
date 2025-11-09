import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',  // 外部可访问（局域网/公网）
    port: 5002,
    // 【关键】移除所有 proxy！现在所有代理都在 8000
  }
})