/**
 * ui/shell.js — โครงหน้าจอมาตรฐาน (แบบร่าง UX/UI ข้อ 2.2)
 *
 * ลายเมนู — 3 ชั้นตามขนาดจอ (จุดตัดอยู่ใน main.css)
 *   <768 px  · OQ-R14 (2026-10-16) — 8 เส้นทางยาวเกินกว่าจะพาดเป็นแถว (ต้องใช้ 645 px จาก 358 px)
 *              ⇒ ซ่อนไว้หลังปุ่ม ☰ แล้วกางเป็นรายการแนวตั้ง
 *   ≥768 px  · แถบเมนูด้านบนแนวนอน (ทั้ง 8 พอดี — วัดจริง 645 px จาก 768 px)
 *   ≥1024 px · OQ-R11 — เมนูด้านซ้ายแนวตั้ง 240 px ติดหนึบ
 *
 * ใช้เมนูชุดเดียวกันทั้งสามชั้น (NAV_ITEMS) · ไฮไลต์เส้นทางปัจจุบันด้วย aria-current="page"
 */
import { el } from './dom.js';

/**
 * รายการในเมนู — **7 รายการ** (ไม่ใช่ 8 เส้นทาง)
 * OQ-R15 (2026-10-16): ตัด `/add` ("เพิ่ม") ออก เพราะมีปุ่ม **“＋ เพิ่มของ” ที่หัวจอ** ไปที่เดียวกันอยู่แล้ว
 * และแบบร่างกำหนดให้เป็น “ปุ่มหลัก 1 ปุ่มต่อจอ” · `#/add` ยังเป็นเส้นทางจริงใน `router.js`
 * — แค่ไม่โชว์ในเมนู (จอนั้นจึงไม่มีเมนูไฮไลต์ · หัวจอบอกอยู่แล้วว่า “เพิ่มของเข้าจุดเก็บ”)
 */
export const NAV_ITEMS = [
  { path: '/items', label: 'รายการ' },
  { path: '/locations', label: 'จุดเก็บ' },
  { path: '/categories', label: 'หมวดหมู่' },
  { path: '/expiring', label: 'ใกล้หมดอายุ' },
  { path: '/used-up', label: 'ใช้หมดแล้ว' },
  { path: '/shopping', label: 'ต้องซื้อ' },
  { path: '/settings', label: 'ตั้งค่า' },
];

export const APP_TITLE = 'สบายใจ Pantry';
export const APP_FOOTNOTE = 'เดโมแบบร่าง · ข้อมูลอยู่ในเครื่องนี้เท่านั้น';

/** id ของเมนู — ปุ่ม ☰ อ้างด้วย aria-controls */
export const MENU_ID = 'main-menu';

/**
 * สร้าง shell แล้วคืน { root, outlet }
 * root   = ทั้งหน้า (เอาไปแทนที่ #app)
 * outlet = พื้นที่เนื้อหาที่ router ใช้สลับ view
 */
export function createShell() {
  const nav = el(
    'nav',
    { class: 'nav', id: MENU_ID, 'aria-label': 'เมนูหลัก' },
    el(
      'div',
      { class: 'wrap' },
      ...NAV_ITEMS.map(({ path, label }) =>
        el('a', { href: `#${path}`, 'data-route': path }, label),
      ),
    ),
  );

  // ไอคอนล้วน (☰ เป็นตัวอักษร ไม่ใช่ไฟล์ภาพ) — ถ้าใส่คำว่า "เมนู" ด้วย ชื่อแอปจะตัดเป็น 2 บรรทัดที่ 375 px
  // ชื่อที่โปรแกรมอ่านหน้าจอได้มาจาก aria-label
  const toggle = el(
    'button',
    {
      type: 'button',
      class: 'menu-toggle',
      'aria-expanded': 'false',
      'aria-controls': MENU_ID,
      'aria-label': 'เมนูหลัก',
      title: 'เมนูหลัก',
    },
    '☰',
  );

  const header = el(
    'header',
    { class: 'app-header' },
    el(
      'div',
      { class: 'wrap' },
      toggle,
      el('h1', {}, APP_TITLE),
      el('a', { class: 'btn btn-primary', href: '#/add' }, '＋ เพิ่มของ'),
    ),
  );

  const outlet = el('div', { class: 'wrap', id: 'content' });

  const root = el(
    'div',
    { class: 'shell' },
    header,
    nav,
    el('main', {}, outlet),
    el('footer', { class: 'foot' }, APP_FOOTNOTE),
  );

  wireMenu(root, toggle, nav);

  return { root, outlet };
}

/** เปิด/ปิดเมนูของจอโทรศัพท์ — สถานะอยู่ที่ data-menu-open ของ shell (CSS อ่านจากตัวนี้) */
export function setMenuOpen(root, toggle, open) {
  if (!root) return;
  root.dataset.menuOpen = open ? 'true' : 'false';
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function wireMenu(root, toggle, nav) {
  setMenuOpen(root, toggle, false);

  toggle.addEventListener('click', () => {
    setMenuOpen(root, toggle, root.dataset.menuOpen !== 'true');
  });

  // เลือกเส้นทางแล้วปิดเมนูทันที (รวมกรณีเป็นเส้นทางเดิมที่ hash ไม่เปลี่ยน)
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(root, toggle, false);
  });

  // กด Esc = ปิดแล้วคืนโฟกัสไปที่ปุ่ม · แตะนอกเมนู = ปิด
  root.ownerDocument.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset.menuOpen === 'true') {
      setMenuOpen(root, toggle, false);
      toggle.focus();
    }
  });

  root.ownerDocument.addEventListener('click', (event) => {
    if (root.dataset.menuOpen !== 'true') return;
    if (root.contains(event.target)) return;
    setMenuOpen(root, toggle, false);
  });
}

/**
 * ไฮไลต์เส้นทางปัจจุบันในแถบเมนู (aria-current="page") + ปิดเมนูจอเล็กหลังเปลี่ยนเส้นทาง
 * ใช้ event delegation ผ่าน data-route ไม่ต้องเก็บ reference ของลิงก์
 */
export function markActiveNav(path, scope = document) {
  for (const link of scope.querySelectorAll('[data-route]')) {
    const isActive = link.dataset.route === path;
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  setMenuOpen(scope.querySelector('.shell'), scope.querySelector('.menu-toggle'), false);
}
