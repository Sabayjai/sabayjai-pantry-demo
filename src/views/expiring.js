/**
 * views/expiring.js — จอ #/expiring (R006 · US-005)
 *
 * มุมรวมของที่ต้องใช้ก่อนในที่เดียว: กลุ่ม "หมดอายุแล้ว" (แดง) มาก่อน
 * กลุ่ม "ใกล้หมดอายุ" (เหลือง) · เรียงในกลุ่มตามวันน้อยสุดก่อน
 * ใบละ 1 ล็อตด้วย `src/ui/product-card.js` ใบเดียวกับจอรายการ — จัดการได้ครบเหมือนกัน
 * (stepper ร่างยอด · ย้าย/ทิ้ง/หมด/ประวัติ) · จอนี้เหลือแค่จัดกลุ่ม+เรียง
 */
import { el } from '../ui/dom.js';
import { listCategories, listLots, listLocations, listProducts } from '../data/db.js';
import { daysLeft, expiringLots, expiringSummary, expiryStatus } from '../data/selectors.js';
import { emptyState, summaryBar } from '../ui/components.js';
import { createCardState, lotCard } from '../ui/product-card.js';

/** state ของการ์ดจอนี้ (ร่างยอด+ฟอร์มย้าย เก็บข้าม re-render) — ใบเดียวกับจอรายการ */
const cardState = createCardState();

export function renderExpiring() {
  const lots = listLots({ activeOnly: true });
  const summary = expiringSummary(lots);
  const products = new Map(listProducts().map((product) => [product.id, product]));
  const locationNames = new Map(listLocations().map((location) => [location.id, location.name]));
  const categoryNames = new Map(listCategories().map((category) => [category.id, category.name]));

  const attention = expiringLots(lots)
    .slice()
    .sort((a, b) => (daysLeft(a) ?? 0) - (daysLeft(b) ?? 0));
  if (attention.length === 0) {
    return el(
      'section',
      { class: 'view view-expiring' },
      el('h2', {}, 'ต้องใช้ก่อน'),
      summaryBar(summary),
      emptyState({ text: 'ไม่มีของที่ต้องรีบใช้ — ทุกอย่างยังสดดี', actionLabel: 'ดูของในบ้าน', actionHref: '#/items' }),
    );
  }

  const expired = attention.filter((lot) => expiryStatus(lot) === 'expired');
  const expiring = attention.filter((lot) => expiryStatus(lot) === 'expiring');

  const group = (title, groupLots) =>
    groupLots.length === 0
      ? null
      : el(
          'div',
          { class: 'expiring-group' },
          el('h3', {}, title),
          el(
            'div',
            { class: 'cards' },
            ...groupLots.map((lot) =>
              lotCard(lot, products.get(lot.productId), locationNames, categoryNames, cardState),
            ),
          ),
        );

  return el(
    'section',
    { class: 'view view-expiring' },
    el('h2', {}, 'ต้องใช้ก่อน'),
    summaryBar(summary),
    group(`หมดอายุแล้ว (${expired.length})`, expired),
    group(`ใกล้หมดอายุ (${expiring.length})`, expiring),
  );
}
