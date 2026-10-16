/** views/expiring.js — จอ #/expiring · สร้างจริงใน R006 (US-005) · แบบจออยู่ S3 */
import { el } from '../ui/dom.js';
import { listLots } from '../data/db.js';
import { expiringLots, expiringSummary } from '../data/selectors.js';

export function renderExpiring() {
  // นับจากล็อต (แต่ละล็อตมีวันหมดอายุของตัวเอง) — มุมจริงจะสร้างใน R006
  const lots = listLots({ activeOnly: true });
  const summary = expiringSummary(lots);
  const items = expiringLots(lots);

  return el(
    'section',
    { class: 'view view-expiring' },
    el('h2', {}, 'ต้องใช้ก่อน'),
    el('p', { class: 'view-note' }, `ตอนนี้มี ${summary.total} ล็อต (หมดอายุ ${summary.expired} · ใกล้หมดอายุ ${summary.expiring})`),
    el('ul', { class: 'item-list' }, ...items.map((lot) => el('li', { class: 'item-row' }, lot.expiryDate ?? 'ไม่ระบุวันหมดอายุ'))),
    el('p', { class: 'view-note' }, 'S2 ทำเฉพาะโครงเส้นทางนี้ · มุมรวมของใกล้หมดอายุจริงสร้างใน R006 (US-005)'),
  );
}
