/**
 * views/items.js — จอ #/items (R001 · S3 · Task 8)
 *
 * เปลี่ยนจาก "ลิสต์เรียบของ S2" เป็น **การ์ด + ป้ายสถานะ** ตามแบบร่าง UX/UI ข้อ 5.1
 * · หนึ่งการ์ด = หนึ่งสินค้า — ยอดที่แสดง = ผลรวมทุก**ล็อต**ที่ยังมีของ
 * · ป้ายวันหมดอายุใช้ล็อตที่หมดอายุใกล้สุด (`nearestExpiryLot`) — ข้อความ+สีคู่กันเสมอ (ข้อ 4.2)
 * · ล็อตที่ยังมีของของสินค้านั้นแสดงในใบเดียวกัน เรียงตาม FEFO (เห็นว่าทยอยใช้จะหยิบล็อตไหนก่อน)
 *
 * ยังไม่ทำในรอบนี้ (ยกไป Release ที่รับผิดชอบ): ปุ่ม −/+ และ "ใช้หมดแล้ว" (R005 · US-003) ·
 * ค้นหา/กรอง (R004 · US-002) · แถบสรุปกดไป #/expiring (R006 · US-005) — รอบนี้แถบสรุปเป็นข้อความอ่านอย่างเดียว
 */
import { el } from '../ui/dom.js';
import { listCategories, listLots, listLocations, listProducts } from '../data/db.js';
import {
  expiringSummary,
  expiryStatus,
  groupByProduct,
  nearestExpiryLot,
  sortLotsByFEFO,
} from '../data/selectors.js';
import { emptyState, statusBadge, summaryBar } from '../ui/components.js';

export function renderItems() {
  const lots = listLots();
  const locationNames = new Map(listLocations().map((location) => [location.id, location.name]));
  const categoryNames = new Map(listCategories().map((category) => [category.id, category.name]));
  const summary = expiringSummary(lots);

  const rows = sortForDisplay(groupByProduct(listProducts(), lots).filter((row) => row.total > 0));

  const cards = rows.map((row) => {
    const { product, activeLots: active, total, nearest, status } = row;
    const locations = [...new Set(active.map((lot) => lot.locationId))]
      .map((id) => locationNames.get(id) ?? 'ไม่ระบุจุดเก็บ')
      .join(', ');

    const meta = [
      `${total} ${product.unit}`,
      locations,
      product.categoryId ? categoryNames.get(product.categoryId) ?? null : null,
      active.length > 1 ? `${active.length} ล็อต` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return el(
      'article',
      {
        class: 'card',
        dataset: { id: product.id, status },
      },
      el(
        'div',
        { class: 'card-top' },
        el('h3', { class: 'card-name' }, product.name),
        statusBadge(nearest),
      ),
      el('p', { class: 'card-meta' }, meta),
      product.note ? el('p', { class: 'card-meta' }, `หมายเหตุ: ${product.note}`) : null,
      active.length > 1 ? lotList(active, product, locationNames) : null,
    );
  });

  return el(
    'section',
    { class: 'view view-items' },
    summaryBar(summary),
    el('h2', {}, `ของในบ้าน (${rows.length} สินค้า)`),
    rows.length
      ? el('div', { class: 'cards' }, ...cards)
      : emptyState({
          text: 'ยังไม่มีของในตู้ — เริ่มจากเพิ่มชิ้นแรก',
          actionLabel: '＋ เพิ่มของ',
          actionHref: '#/add',
        }),
    el(
      'p',
      { class: 'view-note' },
      'การ์ด + ป้ายสถานะตามแบบร่าง UX/UI · ปุ่มปรับจำนวนและ "ใช้หมดแล้ว" อยู่ใน R005 · ค้นหา/กรองอยู่ใน R004 (US-002/US-003)',
    ),
  );
}

/**
 * ลำดับการ์ดตาม **OQ-R13 (ตอบ A · 2026-10-16): แดง → เหลือง → ที่เหลือ (ชื่อ ก-ฮ)**
 * สถานะของสินค้าหนึ่งตัวดูจากล็อตที่หมดอายุใกล้สุด · ของที่ไม่ระบุวันหมดอายุอยู่กลุ่ม "ที่เหลือ"
 * คำนวณสถานะ/ล็อตใกล้สุดครั้งเดียวตรงนี้ แล้วส่งต่อให้การ์ดใช้ (ไม่คำนวณซ้ำ)
 */
function sortForDisplay(rows) {
  const STATUS_ORDER = { expired: 0, expiring: 1 };
  return rows
    .map((row) => {
      const nearest = nearestExpiryLot(row.activeLots);
      return { ...row, nearest, status: nearest ? expiryStatus(nearest) : 'none' };
    })
    .sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 2;
      const orderB = STATUS_ORDER[b.status] ?? 2;
      if (orderA !== orderB) return orderA - orderB;
      return a.product.name.localeCompare(b.product.name, 'th');
    });
}

/** ล็อตที่ยังมีของของสินค้าหนึ่งตัว — เรียงตาม FEFO พร้อมป้ายวันหมดอายุของล็อตนั้น */
function lotList(activeLots, product, locationNames) {
  return el(
    'ul',
    { class: 'card-lots' },
    ...sortLotsByFEFO(activeLots).map((lot) =>
      el(
        'li',
        { dataset: { id: lot.id, status: expiryStatus(lot) } },
        el('span', { class: 'lot-qty' }, `${lot.quantity} ${product.unit}`),
        el('span', { class: 'lot-where' }, locationNames.get(lot.locationId) ?? 'ไม่ระบุจุดเก็บ'),
        statusBadge(lot),
      ),
    ),
  );
}
