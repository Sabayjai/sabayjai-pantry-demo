/**
 * views/items.js — จอ #/items ของ S2: **ลิสต์เรียบ** จาก seed (สคีมา v2)
 *
 * เป้าหมายของรอบนี้คือ "ยืนยันว่าชั้นข้อมูลต่อกับจอได้จริง" ไม่ใช่ความสวย
 * → ไม่มีการ์ด ไม่มีป้ายสี ไม่มีปุ่ม −/+ (ของพวกนั้นคือ S3 + R004/US-002/US-003)
 *
 * สคีมา v2: หนึ่งแถวต่อหนึ่ง **สินค้า** (รวมล็อตของสินค้านั้น) — ของไม่ซ้ำหลายแถว
 * สถานะหมดอายุ: ใช้ล็อตที่หมดอายุใกล้สุด · แสดงเป็น "ข้อความ" เสมอ (ข้อ 4.2)
 */
import { el } from '../ui/dom.js';
import { listCategories, listLots, listLocations, listProducts } from '../data/db.js';
import {
  expiringSummary,
  expiryLabel,
  expiryStatus,
  groupByProduct,
  nearestExpiryLot,
  sortLotsByFEFO,
} from '../data/selectors.js';

export function renderItems() {
  const lots = listLots();
  const locationNames = new Map(listLocations().map((location) => [location.id, location.name]));
  const categoryNames = new Map(listCategories().map((category) => [category.id, category.name]));
  const summary = expiringSummary(lots);

  const rows = groupByProduct(listProducts(), lots).filter((row) => row.total > 0);

  const listItems = rows.map((row) => {
    const { product, activeLots: active, total } = row;
    const locations = [...new Set(active.map((lot) => lot.locationId))]
      .map((id) => locationNames.get(id) ?? 'ไม่ระบุจุดเก็บ')
      .join(', ');
    const batchNote = active.length > 1 ? `${active.length} ล็อต` : null;
    const nearest = nearestExpiryLot(active);
    const label = nearest ? expiryLabel(nearest) : '';

    const details = [
      `${total} ${product.unit}`,
      locations,
      product.categoryId ? categoryNames.get(product.categoryId) ?? null : null,
      batchNote,
      product.note ? `หมายเหตุ: ${product.note}` : null,
    ].filter(Boolean);

    return el(
      'li',
      { class: 'item-row', dataset: { id: product.id, status: nearest ? expiryStatus(nearest) : 'none' } },
      el('span', { class: 'item-name' }, product.name),
      el('span', { class: 'item-details' }, details.join(' · ')),
      label ? el('span', { class: 'item-status' }, label) : null,
    );
  });

  // ล็อตที่ยังมีของ เรียงตาม FEFO — ให้เห็นว่า "ทยอยใช้" จะหยิบล็อตไหนก่อน
  const lotRows = sortLotsByFEFO(activeLotsOf(rows)).map((lot) => {
    const product = listProducts().find((entry) => entry.id === lot.productId);
    const location = locationNames.get(lot.locationId) ?? 'ไม่ระบุจุดเก็บ';
    const label = expiryLabel(lot);
    return el(
      'li',
      { class: 'item-row', dataset: { id: lot.id, status: expiryStatus(lot) } },
      el('span', { class: 'item-name' }, `↳ ${product?.name ?? 'ไม่พบสินค้า'}`),
      el('span', { class: 'item-details' }, `${lot.quantity} ${product?.unit ?? ''} · ${location}`),
      label ? el('span', { class: 'item-status' }, label) : null,
    );
  });

  return el(
    'section',
    { class: 'view view-items' },
    el('h2', {}, `รายการของทั้งหมด (${rows.length} สินค้า)`),
    el(
      'p',
      { class: 'view-note' },
      `ต้องใช้ก่อน ${summary.total} ล็อต · หมดอายุ ${summary.expired} · ใกล้หมดอายุ ${summary.expiring}`,
    ),
    el(
      'p',
      { class: 'view-note' },
      'S2 · ลิสต์เรียบจากข้อมูลตัวอย่าง (สคีมา v2: สินค้า + ล็อต) — การ์ด/ป้ายสถานะ/ปุ่มปรับจำนวนจะทำใน S3 และ R004',
    ),
    rows.length ? el('ul', { class: 'item-list' }, ...listItems) : el('p', {}, 'ยังไม่มีของในรายการ — เพิ่มของได้ที่เมนู "เพิ่ม"'),
    rows.length ? el('h3', {}, 'ล็อตที่ยังมีของ (เรียงตามหมดอายุใกล้สุด)') : null,
    rows.length ? el('ul', { class: 'item-list' }, ...lotRows) : null,
  );
}

function activeLotsOf(rows) {
  return rows.flatMap((row) => row.activeLots);
}
