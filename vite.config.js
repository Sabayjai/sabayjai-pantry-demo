import { defineConfig } from 'vite';

// ค่าตั้งต้นของเดโม: static SPA + hash routing (ดีไซน์ข้อ 1.1 · 1.2)
// - `base: './'` ทำให้ไฟล์ asset อ้างแบบ relative → ย้ายโฟลเดอร์/วางใต้ subpath ของโฮสต์ได้
// - `test` ใช้โดย Vitest (OQ-R8) โดยอ่านรวมจากไฟล์นี้ ไม่ต้องมี config แยก
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    setupFiles: ['./src/test-setup.js'],
  },
});
