/**
 * views/expiring.js — จอ #/expiring (R006 · US-005)
 *
 * มุมรวมของที่ต้องใช้ก่อนในที่เดียว: กลุ่ม "หมดอายุแล้ว" (แดง) มาก่อน
 * กลุ่ม "ใกล้หมดอายุ" (เหลือง) · เรียงในกลุ่มตามวันน้อยสุดก่อน
 * แถวละ 1 ล็อต: ชื่อสินค้า · จำนวน · จุดเก็บ · ป้ายวัน (ใช้สี+ข้อความคู่กันเสมอ)
 */
import { el } from '../ui/dom.js';
import { listLots, listLocations, listProducts } from '../data/db.js';
import { daysLeft, expiringLots, expiringSummary, expiryStatus } from '../data/selectors.js';
import { emptyState, statusBadge, summaryBar } from '../ui/components.js';

export function renderExpiring() {
  const lots = listLots({ activeOnly: true });
  const summary = expiringSummary(lots);
  const productNames = new Map(listProducts().map((product) => [product.id, product]));
  const locationNames = new Map(listLocations().map((location) => [location.id, location.name]));

  const items = expiringLots(lots)
    .slice()
    .sort((a, b) => {
      const order = { expired: 0, expiring: 1 };
      const diff = (order[expiryStatus(a)] ?? 2) - (order[expiryStatus(b)] ?? 2);
      if (diff !== 0) return diff;
      return (daysLeft(a) ?? 0) - (daysLeft(b) ?? 0);
    });

  if (items.length === 0) {
    return el(
      'section',
      { class: 'view view-expiring' },
      el('h2', {}, 'ต้องใช้ก่อน'),
      summaryBar(summary),
      emptyState({ text: 'ไม่มีของที่ต้องรีบใช้ — ทุกอย่างยังสดดี', actionLabel: 'ดูของในบ้าน', actionHref: '#/items' }),
    );
  }

  const expired = items.filter((lot) => expiryStatus(lot) === 'expired');
  const expiring = items.filter((lot) => expiryStatus(lot) === 'expiring');

  const row = (lot) => {
    const product = productNames.get(lot.productId);
    return el(
      'li',
      { class: 'item-row', dataset: { id: lot.id, status: expiryStatus(lot) } },
      el('span', { class: 'item-name' }, product?.name ?? 'ไม่พบสินค้า'),
      el(
        'span',
        { class: 'item-details' },
        `${lot.quantity} ${product?.unit ?? 'ชิ้น'} · ${locationNames.get(lot.locationId) ?? 'ไม่ระบุจุดเก็บ'}`,
      ),
      statusBadge(lot),
    );
  };
  const group = (title, rows) =>
    rows.length === 0
      ? null
      : el('div', { class: 'expiring-group' }, el('h3', {}, title), el('ul', { class: 'item-list' }, ...rows.map(row)));

  return el(
    'section',
    { class: 'view view-expiring' },
    el('h2', {}, 'ต้องใช้ก่อน'),
    summaryBar(summary),
    group(`หมดอายุแล้ว (${expired.length})`, expired),
    group(`ใกล้หมดอายุ (${expiring.length})`, expiring),
  );
}
