/** views/shopping.js — จอ #/shopping · สร้างจริงใน R007 (US-008) · แบบจออยู่ S3 */
import { el } from '../ui/dom.js';
import { listShopping } from '../data/db.js';

export function renderShopping() {
  const entries = listShopping();

  return el(
    'section',
    { class: 'view view-shopping' },
    el('h2', {}, 'รายการที่ต้องซื้อ'),
    el('p', { class: 'view-note' }, `มี ${entries.length} รายการ · สมุดโน้ตอิสระ ไม่ผูกกับรายการของ (OQ-13 · OQ-15)`),
    el('p', { class: 'view-note' }, 'S2 ทำเฉพาะโครงเส้นทางนี้ · เพิ่ม/ติ๊กซื้อแล้ว/ลบ จริงสร้างใน R007 (US-008)'),
  );
}
