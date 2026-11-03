import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { fileURLToPath, URL } from 'node:url';
import http from 'node:http';

export default defineConfig({
  // React Compiler memoises components and hooks at build time (Babel route: the stable 1.0 compiler)
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, // อนุญาตให้รันใน Docker แล้วเรียกจากนอก Container ได้
    port: 5173,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true', // Docker sets this via env var
      // poll ค่าเริ่มต้นทุก 100ms บน bind mount ของ Windows กิน CPU ~50% ตอนว่าง; 300ms ยังรู้สึกว่า HMR ทันที
      interval: 300,
      ignored: ['**/dist/**', '**/coverage/**'],
    },
    // แปลงไฟล์ทั้งหมดไว้ตั้งแต่ server เริ่ม ไม่ต้องรอตอนเปิดหน้าแรก (bind mount บน Windows อ่านไฟล์ช้า)
    warmup: { clientFiles: ['./src/main.tsx'] },
    // หน้าเว็บเรียก /api แบบ relative: dev ส่งต่อไป backend (prod ให้ Express เสิร์ฟทั้งคู่ใน origin เดียว)
    // keepAlive: ใช้ connection เดิม ไม่ต้อง dns.lookup ทุก request (ใน Docker คิวรอหลัง stat ของ polling ~100ms ต่อ request)
    proxy: { '/api': { target: process.env.VITE_BACKEND_TARGET || 'http://localhost:3000', agent: new http.Agent({ keepAlive: true }) } },
  }
});
