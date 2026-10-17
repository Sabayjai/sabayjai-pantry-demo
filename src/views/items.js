/**
 * views/items.js — จอ #/items
 *
 * R001 · S3 · Task 8: การ์ด + ป้ายสถานะ (หนึ่งการ์ด = หนึ่งสินค้า · ยอดรวมทุก**ล็อต**ที่ยังมีของ ·
 * ป้ายจากล็อตหมดอายุใกล้สุด · เรียงแดง → เหลือง → ที่เหลือตาม OQ-R13)
 * R004 · S2: ค้นชื่อ+หมายเหตุ + กรองจุดเก็บ+หมวดหมู่พร้อมกัน (US-002) ผ่าน `filterStockRows`
 * (มี+เทสต์แล้ว — จอแค่ต่อใช้ ไม่เขียนชั้นข้อมูลใหม่)
 * ใบการ์ดอยู่ `src/ui/product-card.js` (ใบเดียวกับจอต้องใช้ก่อน) — จอนี้เหลือแค่ค้น/กรอง/เรียง
 *
 * หมายเหตุ: การพิมพ์ค้นหา/กด chip อัปเดตผลลัพธ์แบบตรง ๆ ไม่ notify() เพื่อไม่ให้ช่องกรอกเสียโฟกัส
 * state ตัวกรองเก็บระดับโมดูล (router re-render ทั้งจอเมื่อ store เปลี่ยนจะอ่านค่าเดิมต่อ)
 */
import { el, on } from '../ui/dom.js';
import { listCategories, listLots, listLocations, listProducts } from '../data/db.js';
import { expiringSummary } from '../data/selectors.js';
import { emptyState, summaryBar } from '../ui/components.js';
import { createCardState, lotCard, sortLotCards } from '../ui/product-card.js';

/** ตัวกรองปัจจุบัน — R003 เรียก clearItemsFilter() หลังบันทึกเพื่อกลับมาเห็นของใหม่แน่ ๆ */
let query = '';
let locationId = '';
let categoryId = '';
/** state ของการ์ดจอนี้ (ร่างยอด+ฟอร์มย้าย เก็บข้าม re-render) — ใบเดียวกับจอต้องใช้ก่อน */
const cardState = createCardState();

export function clearItemsFilter() {
  query = '';
  locationId = '';
  categoryId = '';
}

export function renderItems() {
  const locations = listLocations({ activeOnly: true })
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
  const categories = listCategories({ activeOnly: true })
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
  const locationNames = new Map(listLocations().map((location) => [location.id, location.name]));
  const categoryNames = new Map(listCategories().map((category) => [category.id, category.name]));
  const summary = expiringSummary(listLots());
  const hasStock = listLots({ activeOnly: true }).length > 0;

  // ช่องค้นหา — พิมพ์แล้วกรองทันที (ค้นชื่อ+หมายเหตุ) · ไม่ re-render ทั้งจอเพื่อรักษาโฟกัส
  const searchInput = el('input', {
    type: 'search',
    id: 'items-search',
    name: 'q',
    autocomplete: 'off',
    placeholder: 'ค้นชื่อหรือหมายเหตุ…',
    value: query,
    'aria-label': 'ค้นชื่อหรือหมายเหตุ',
  });
  const clearSearchButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ล้าง');
  on(clearSearchButton, 'click', () => {
    clearItemsFilter();
    searchInput.value = '';
    refresh();
    searchInput.focus?.();
  });

  const results = el('div', { class: 'cards' });

  /**
   * วาดผลลัพธ์ใหม่จาก state ปัจจุบัน (เรียกตรง ๆ ไม่ผ่าน notify)
   * ใบละ 1 ล็อต — เกณฑ์กรองเดียวกับ filterStockRows (ชื่อ+หมายเหตุไม่สนเคส · จุดเก็บตรงล็อต · หมวดตรงสินค้า)
   */
  function renderResults() {
    const products = new Map(listProducts().map((product) => [product.id, product]));
    const needle = query.trim().toLowerCase();
    const cards = sortLotCards(
      listLots({ activeOnly: true })
        .filter((lot) => {
          const product = products.get(lot.productId);
          if (!product) return false;
          if (categoryId && product.categoryId !== categoryId) return false;
          if (locationId && lot.locationId !== locationId) return false;
          if (!needle) return true;
          return (
            String(product.name || '').toLowerCase().includes(needle) ||
            String(product.note || '').toLowerCase().includes(needle)
          );
        })
        .map((lot) => ({ lot, product: products.get(lot.productId) })),
    );
    const filtering = query.trim() !== '' || locationId !== '' || categoryId !== '';
    if (cards.length === 0 && !hasStock) {
      results.replaceChildren(
        emptyState({ text: 'ยังไม่มีของในตู้ — เริ่มจากเพิ่มชิ้นแรก', actionLabel: '＋ เพิ่มของ', actionHref: '#/add' }),
      );
      return;
    }
    if (cards.length === 0) {
      const clearButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'ล้างตัวกรอง');
      on(clearButton, 'click', () => {
        clearItemsFilter();
        searchInput.value = '';
        refresh();
      });
      results.replaceChildren(
        el('div', { class: 'empty' }, el('p', {}, 'ไม่พบของที่ตรงกับที่กรองไว้'), clearButton),
      );
      return;
    }
    results.replaceChildren(
      ...cards.map(({ lot, product }) => lotCard(lot, product, locationNames, categoryNames, cardState)),
    );
  }

  // dropdown คู่พร้อมป้ายชื่อด้านบน (OQ-R4-1 · ปรับ CSS 2026-10-17: ป้ายแยกจากค่าที่เลือก ไม่ยัด prefix ใน option)
  const locationSelect = el(
    'select',
    { id: 'items-filter-location' },
    el('option', { value: '' }, 'ทั้งหมด'),
    ...locations.map((location) =>
      el('option', { value: location.id, selected: locationId === location.id ? 'true' : null }, location.name),
    ),
  );
  const categorySelect = el(
    'select',
    { id: 'items-filter-category' },
    el('option', { value: '' }, 'ทั้งหมด'),
    ...categories.map((category) =>
      el('option', { value: category.id, selected: categoryId === category.id ? 'true' : null }, category.name),
    ),
  );
  const locationField = el(
    'div',
    { class: 'field field-inline' },
    el('label', { for: 'items-filter-location' }, 'จุดเก็บ'),
    locationSelect,
    el('span', { class: 'select-chevron', 'aria-hidden': 'true' }),
  );
  const categoryField = el(
    'div',
    { class: 'field field-inline' },
    el('label', { for: 'items-filter-category' }, 'หมวดหมู่'),
    categorySelect,
    el('span', { class: 'select-chevron', 'aria-hidden': 'true' }),
  );
  on(locationSelect, 'change', () => {
    locationId = locationSelect.value;
    refresh();
  });
  on(categorySelect, 'change', () => {
    categoryId = categorySelect.value;
    refresh();
  });

  /** ซิงก์ค่าที่ dropdown แสดงให้ตรง state (ใช้หลังล้างทั้งหมด — ค่าที่เลือกดูใน dropdown เอง) */
  function syncControls() {
    locationSelect.value = locationId;
    categorySelect.value = categoryId;
  }

  function refresh() {
    renderResults();
    syncControls();
  }

  on(searchInput, 'input', () => {
    query = searchInput.value;
    refresh();
  });

  refresh();

  return el(
    'section',
    { class: 'view view-items' },
    summaryBar(summary),
    el('h2', {}, 'ของในบ้าน'),
    el('div', { class: 'search-row' }, searchInput, clearSearchButton),
    el('div', { class: 'filter-row' }, locationField, categoryField),
    results,
    el(
      'p',
      { class: 'view-note' },
      'การ์ด + ป้ายสถานะตามแบบร่าง UX/UI · ปุ่มปรับจำนวนและ "ใช้หมดแล้ว" อยู่ใน R005 (US-002/US-003)',
    ),
  );
}
