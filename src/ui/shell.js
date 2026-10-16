/**
 * ui/shell.js — โครงหน้าจอมาตรฐานของ S2 (ดีไซน์ข้อ 4.2 + แบบร่าง UX/UI ข้อ 2.2)
 *
 * S2 = "โครงล้วน ยังไม่ตกแต่ง": หัวเรื่อง + เมนู 8 เส้นทาง + พื้นที่เนื้อหา + เชิงอรรถ
 * ยังไม่มี toast/ป้ายสถานะ/การ์ด (ของพวกนั้นอยู่ใน S3 · Task 3)
 *
 * ⏳ OQ-R11 (ลายเมนูหลัก) ยังรอคำตอบ: รอบนี้ยึด "หัวเรื่อง + แถบเมนูเลื่อนแนวนอน"
 *    ตามแบบร่างเดิม · ถ้าเปลี่ยนเป็น bottom tab bar ให้แก้ที่ NAV_ITEMS/markup ในไฟล์นี้
 *    (ชั้นข้อมูลไม่กระทบ)
 */
import { el } from './dom.js';

/** 8 เส้นทางตามดีไซน์ข้อ 4.2 — ป้ายชื่อยึดถ้อยคำในแบบร่าง UX/UI ข้อ 2.2 */
export const NAV_ITEMS = [
  { path: '/items', label: 'รายการ' },
  { path: '/add', label: 'เพิ่ม' },
  { path: '/locations', label: 'จุดเก็บ' },
  { path: '/categories', label: 'หมวดหมู่' },
  { path: '/expiring', label: 'ใกล้หมดอายุ' },
  { path: '/used-up', label: 'ใช้หมดแล้ว' },
  { path: '/shopping', label: 'ต้องซื้อ' },
  { path: '/settings', label: 'ตั้งค่า' },
];

export const APP_TITLE = 'สบายใจ Pantry';
export const APP_FOOTNOTE = 'เดโมแบบร่าง · ข้อมูลอยู่ในเครื่องนี้เท่านั้น';

/**
 * สร้าง shell แล้วคืน { root, outlet }
 * root   = ทั้งหน้า (เอาไปแทนที่ #app)
 * outlet = พื้นที่เนื้อหาที่ router ใช้สลับ view
 */
export function createShell() {
  const nav = el(
    'nav',
    { class: 'nav-chips', 'aria-label': 'เมนูหลัก' },
    ...NAV_ITEMS.map(({ path, label }) =>
      el('a', { class: 'nav-chip', href: `#${path}`, 'data-route': path }, label),
    ),
  );

  const header = el(
    'header',
    { class: 'app-header' },
    el('h1', {}, APP_TITLE),
    el('a', { class: 'add-btn', href: '#/add' }, '＋ เพิ่มของ'),
    nav,
  );

  const outlet = el('main', { class: 'app-main', id: 'content' });

  const root = el('div', { class: 'app-shell' }, header, outlet, el('footer', { class: 'app-footer' }, APP_FOOTNOTE));

  return { root, outlet };
}

/**
 * ไฮไลต์เส้นทางปัจจุบันในแถบเมนู (aria-current="page")
 * ใช้ event delegation ผ่าน data-route ไม่ต้องเก็บ reference ของลิงก์
 */
export function markActiveNav(path, scope = document) {
  for (const link of scope.querySelectorAll('[data-route]')) {
    const isActive = link.dataset.route === path;
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
