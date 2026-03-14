import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // อนุญาตให้รันใน Docker แล้วเรียกจากนอก Container ได้
    port: 5173,
    watch: {
      usePolling: true, // ทำให้ Hot Reload ทำงานกับ Docker Volumes
    }
  }
})