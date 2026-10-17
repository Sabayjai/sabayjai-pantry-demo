/**
 * main.js — bootstrap ของแอป
 * ลำดับ: สร้าง shell → เริ่ม router (ชั้นข้อมูลโหลด state เองตอน import db.js)
 */
import './styles/main.css';
import { startRouter } from './router.js';
import { createShell } from './ui/shell.js';
import { listLots } from './data/db.js';
import { expiringSummary } from './data/selectors.js';
import { showToast } from './ui/components.js';

const app = document.getElementById('app');

if (!app) {
  throw new Error('ไม่พบ <div id="app"> ใน index.html');
}

const { root, outlet } = createShell();
app.replaceChildren(root);

startRouter(outlet);

// สรุปตอนเปิดแอป (US-005 · R006): มีของต้องรีบใช้กี่ล็อต — ครั้งเดียวต่อ session · ไม่มีอะไรต้องรีบก็ไม่รบกวน
try {
  if (!globalThis.sessionStorage?.getItem('sabayjai-summary-shown')) {
    const summary = expiringSummary(listLots());
    if (summary.total > 0) {
      showToast(`มีของต้องใช้ ${summary.total} ล็อต · หมดอายุ ${summary.expired} · ใกล้หมดอายุ ${summary.expiring}`);
      console.info(`[sabayjai] สรุปตอนเปิดแอป: ต้องใช้ ${summary.total} ล็อต (หมดอายุ ${summary.expired} · ใกล้หมดอายุ ${summary.expiring})`);
    }
    globalThis.sessionStorage?.setItem('sabayjai-summary-shown', '1');
  }
} catch {
  // sessionStorage ใช้ไม่ได้ (เช่น โหมดส่วนตัวบางเบราว์เซอร์) — ข้ามสรุปไป ไม่พังแอป
}

// ลงทะเบียน service worker (R008 · PWA/ออฟไลน์) — เฉพาะบิลด์จริงผ่าน http(s) เท่านั้น
// dev ไม่ลง (กันแคชเก่าบัง HMR) · file:// หรือเบราว์เซอร์เก่า ข้ามไปเงียบ ๆ ไม่พังแอป
try {
  if (
    import.meta.env?.PROD &&
    'serviceWorker' in navigator &&
    (location.protocol === 'http:' || location.protocol === 'https:')
  ) {
    globalThis.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => {});
    });
  }
} catch {
  // ลงทะเบียนไม่ได้ — แอปยังใช้ได้ปกติ แค่ออฟไลน์รอบสองไม่ได้
}

// หลักฐานเกณฑ์ OQ-14 (เห็นรายการภายใน 1 วินาที) — อ่านค่าได้จากคอนโซลเบราว์เซอร์
const renderedMs = Math.round(performance.now());
console.info(`[sabayjai] เรนเดอร์จอแรกเสร็จที่ ${renderedMs} ms หลังเริ่มโหลด (เกณฑ์ 1000 ms)`);
