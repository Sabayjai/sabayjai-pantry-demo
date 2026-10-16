/** views/used-up.js — จอ #/used-up · สร้างจริงใน R005 (US-007) · แบบจออยู่ S3 */
import { el } from '../ui/dom.js';
import { listUsedUpLots } from '../data/db.js';

export function renderUsedUp() {
  const entries = listUsedUpLots(); // ล็อตที่ยอด 0 → "ใช้หมดแล้ว" (คำนวณสด ไม่มีตาราง usedUp แยก)

  return el(
    'section',
    { class: 'view view-used-up' },
    el('h2', {}, 'ใช้หมดแล้ว'),
    el('p', { class: 'view-note' }, `มี ${entries.length} รายการ · ข้อความและวันที่แสดงจริงจะทำใน R005 (US-007)`),
    el(
      'ul',
      { class: 'item-list' },
      ...entries.map((entry) =>
        el(
          'li',
          { class: 'item-row' },
          el('span', { class: 'item-name' }, entry.product?.name ?? 'ไม่พบสินค้า'),
          el('span', { class: 'item-details' }, `ใช้หมดเมื่อ ${String(entry.usedUpAt).slice(0, 10)}`),
        ),
      ),
    ),
    el('p', { class: 'view-note' }, 'S2 ทำเฉพาะโครงเส้นทางนี้ · การนำกลับเข้ารายการจริงสร้างใน R005'),
  );
}
