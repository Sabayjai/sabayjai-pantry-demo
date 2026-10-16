/**
 * main.js — bootstrap ของแอป
 * ลำดับ: สร้าง shell → เริ่ม router (ชั้นข้อมูลโหลด state เองตอน import db.js)
 */
import './styles/main.css';
import { startRouter } from './router.js';
import { createShell } from './ui/shell.js';

const app = document.getElementById('app');

if (!app) {
  throw new Error('ไม่พบ <div id="app"> ใน index.html');
}

const { root, outlet } = createShell();
app.replaceChildren(root);

startRouter(outlet);

// หลักฐานเกณฑ์ OQ-14 (เห็นรายการภายใน 1 วินาที) — อ่านค่าได้จากคอนโซลเบราว์เซอร์
const renderedMs = Math.round(performance.now());
console.info(`[sabayjai] เรนเดอร์จอแรกเสร็จที่ ${renderedMs} ms หลังเริ่มโหลด (เกณฑ์ 1000 ms)`);
