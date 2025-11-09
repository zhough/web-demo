import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {  // 【修复】移动到根级，确保构建时生效
    alias: {
      '@': resolve(__dirname, './src') // 指向 src 目录
    }
  },
  server: {
    host: '0.0.0.0',  // 外部可访问（局域网/公网）
    port: 5002,
  }
})