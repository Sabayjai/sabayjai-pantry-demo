/**
 * views/items.js — จอ #/items
 *
 * R001 · S3 · Task 8: การ์ด + ป้ายสถานะ (หนึ่งการ์ด = หนึ่งสินค้า · ยอดรวมทุก**ล็อต**ที่ยังมีของ ·
 * ป้ายจากล็อตหมดอายุใกล้สุด · เรียงแดง → เหลือง → ที่เหลือตาม OQ-R13)
 * R004 · S2: ค้นชื่อ+หมายเหตุ + กรองจุดเก็บ+หมวดหมู่พร้อมกัน (US-002) ผ่าน `filterStockRows`
 * (มี+เทสต์แล้ว — จอแค่ต่อใช้ ไม่เขียนชั้นข้อมูลใหม่)
 * R005 · S1: stepper −/+ · ปุ่มใช้หมดแล้ว · toast-undo 5 วิ (ขั้นเดียว) · ย้ายล็อตระหว่างจุดเก็บ (US-003 + US-009)
 *
 * ยังไม่ทำ: แถบสรุปกดไป #/expiring (R006 · US-005) — รอบนี้แถบสรุปเป็นข้อความอ่านอย่างเดียว
 *
 * หมายเหตุ: การพิมพ์ค้นหา/กด chip อัปเดตผลลัพธ์แบบตรง ๆ ไม่ notify() เพื่อไม่ให้ช่องกรอกเสียโฟกัส
 * state ตัวกรองเก็บระดับโมดูล (router re-render ทั้งจอเมื่อ store เปลี่ยนจะอ่านค่าเดิมต่อ)
 */
import { el, on } from '../ui/dom.js';
import { notify } from '../store.js';
import {
  consumeProduct,
  listCategories,
  listLots,
  listLocations,
  listProducts,
  moveLot,
  receiveStock,
  setLotQuantity,
} from '../data/db.js';
import { clearUndo, remember, undoLast } from '../data/undo.js';
import {
  expiringSummary,
  expiryStatus,
  filterStockRows,
  groupByProduct,
  nearestExpiryLot,
  sortLotsByFEFO,
} from '../data/selectors.js';
import { emptyState, showToast, showUndoToast, statusBadge, summaryBar } from '../ui/components.js';
import { ValidationError } from '../data/validate.js';

/** ตัวกรองปัจจุบัน — R003 เรียก clearItemsFilter() หลังบันทึกเพื่อกลับมาเห็นของใหม่แน่ ๆ */
let query = '';
let locationId = '';
let categoryId = '';
/** id ล็อตที่กำลังเปิดฟอร์มย้าย (เก็บระดับโมดูลเพราะ re-render ทั้งจอ) */
let movingLotId = null;

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
  const hasStock = groupByProduct(listProducts(), listLots()).some((row) => row.total > 0);

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

  /** วาดผลลัพธ์ใหม่จาก state ปัจจุบัน (เรียกตรง ๆ ไม่ผ่าน notify) */
  function renderResults() {
    const rows = sortForDisplay(
      filterStockRows(groupByProduct(listProducts(), listLots()).filter((row) => row.total > 0), {
        query,
        locationId,
        categoryId,
      }),
    );
    const filtering = query.trim() !== '' || locationId !== '' || categoryId !== '';
    if (rows.length === 0 && !hasStock) {
      results.replaceChildren(
        emptyState({ text: 'ยังไม่มีของในตู้ — เริ่มจากเพิ่มชิ้นแรก', actionLabel: '＋ เพิ่มของ', actionHref: '#/add' }),
      );
      return;
    }
    if (rows.length === 0) {
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
    results.replaceChildren(...rows.map((row) => itemCard(row, locationNames, categoryNames)));
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

/** แจ้ง toast-undo มาตรฐาน — กดย้อนกลับกู้ 1 ขั้น · หมดเวลา/อันใหม่ทับ = หมดสิทธิ์ */
function toastUndo(message) {
  showUndoToast({
    message,
    onUndo: () => {
      if (!undoLast()) showToast('ย้อนกลับไม่ได้แล้ว');
    },
    onTimeout: () => clearUndo(),
  });
}

/** รันคำสั่งเปลี่ยนยอดพร้อมจำภาพไว้ย้อนกลับ — ล้มเหลวล้างภาพจำแล้วแจ้งเตือน */
function mutate(label, fn) {
  remember();
  try {
    fn();
  } catch (error) {
    clearUndo();
    showToast(error instanceof ValidationError ? error.message : String(error.message ?? error));
    return;
  }
  toastUndo(label);
}

function itemCard(row, locationNames, categoryNames) {
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

  const minusButton = el('button', { type: 'button', class: 'btn btn-ghost', 'aria-label': `หยิบ ${product.name} ออก 1 ${product.unit}` }, '−');
  on(minusButton, 'click', () => {
    mutate(total - 1 <= 0 ? `ใช้ “${product.name}” หมดแล้ว` : `หยิบ “${product.name}” ออก 1 ${product.unit}`, () =>
      consumeProduct(product.id, 1),
    );
  });
  const plusButton = el('button', { type: 'button', class: 'btn btn-ghost', 'aria-label': `เติม ${product.name} 1 ${product.unit}` }, '+');
  on(plusButton, 'click', () => {
    const target = nearest ?? active[0];
    mutate(`เติม “${product.name}” 1 ${product.unit}`, () =>
      receiveStock({
        name: product.name,
        unit: product.unit,
        quantity: 1,
        locationId: target.locationId,
        expiryDate: target.expiryDate ?? null,
      }),
    );
  });
  const usedUpButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ใช้หมดแล้ว');
  on(usedUpButton, 'click', () => {
    mutate(`ใช้ “${product.name}” หมดแล้ว`, () => {
      for (const lot of active) setLotQuantity(lot.id, 0);
    });
  });

  // สินค้าล็อตเดียวย้ายจากการ์ดได้เลย (มีแถวเดียวก็คือล็อตนั้น — OQ-R16)
  const singleLot = active.length === 1 ? active[0] : null;
  const moveButton = singleLot ? el('button', { type: 'button', class: 'btn btn-ghost' }, 'ย้ายไปจุดเก็บ…') : null;
  if (moveButton) {
    on(moveButton, 'click', () => {
      movingLotId = movingLotId === singleLot.id ? null : singleLot.id;
      notify();
    });
  }

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
    el(
      'div',
      { class: 'stepper', role: 'group', 'aria-label': `ปรับจำนวน ${product.name}` },
      minusButton,
      el('span', { class: 'stepper-qty', 'aria-live': 'polite' }, `${total}`),
      plusButton,
      usedUpButton,
    ),
    moveButton ? el('div', { class: 'card-move' }, moveButton) : null,
    singleLot && movingLotId === singleLot.id ? moveForm(singleLot, product, locationNames) : null,
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

/**
 * ล็อตที่ยังมีของของสินค้าหนึ่งตัว — เรียงตาม FEFO พร้อมป้ายวันหมดอายุของล็อตนั้น
 * แต่ละแถวย้ายจุดเก็บได้ทีละล็อต (US-009 · OQ-R16)
 */
function lotList(activeLots, product, locationNames) {
  const rows = [];
  for (const lot of sortLotsByFEFO(activeLots)) {
    const moveToggle = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ย้าย');
    on(moveToggle, 'click', () => {
      movingLotId = movingLotId === lot.id ? null : lot.id;
      notify();
    });
    rows.push(
      el(
        'li',
        { dataset: { id: lot.id, status: expiryStatus(lot) } },
        el('span', { class: 'lot-qty' }, `${lot.quantity} ${product.unit}`),
        el('span', { class: 'lot-where' }, locationNames.get(lot.locationId) ?? 'ไม่ระบุจุดเก็บ'),
        statusBadge(lot),
        moveToggle,
      ),
    );
    if (movingLotId === lot.id) rows.push(moveForm(lot, product, locationNames));
  }
  return el('ul', { class: 'card-lots' }, ...rows);
}

/** ฟอร์มย้ายล็อต — เลือกปลายทาง (เฉพาะที่ใช้งาน ไม่รวมที่เดิม) + จำนวน (เริ่ม = ทั้งล็อต) */
function moveForm(lot, product, locationNames) {
  const targets = listLocations({ activeOnly: true })
    .filter((location) => location.id !== lot.locationId)
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
  const available = Math.max(0, Number(lot.quantity) || 0);

  const targetSelect = el(
    'select',
    { 'aria-label': `ย้าย “${product.name}” ไปจุดเก็บไหน` },
    ...targets.map((location) => el('option', { value: location.id }, location.name)),
  );
  const qtyInput = el('input', {
    type: 'number',
    min: '1',
    max: String(Math.max(available, 1)),
    step: '1',
    value: String(Math.max(available, 1)),
    'aria-label': 'จำนวนที่ย้าย',
  });
  const errorEl = el('p', { class: 'field-error', role: 'alert' });
  errorEl.style.display = 'none';
  const confirmButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'ย้าย');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
  on(cancelButton, 'click', () => {
    movingLotId = null;
    notify();
  });
  on(confirmButton, 'click', () => {
    const fromName = locationNames.get(lot.locationId) ?? 'จุดเดิม';
    const toId = targetSelect.value;
    const toName = locationNames.get(toId) ?? 'จุดใหม่';
    const qty = Number(qtyInput.value);
    remember();
    try {
      moveLot(lot.id, toId, qty);
    } catch (error) {
      clearUndo();
      errorEl.textContent = error instanceof ValidationError ? error.message : String(error.message ?? error);
      errorEl.style.display = '';
      return;
    }
    movingLotId = null;
    toastUndo(
      qty >= available
        ? `ย้าย “${product.name}” จาก${fromName}ไป${toName}แล้ว`
        : `ย้าย “${product.name}” ${qty} ${product.unit} ไป${toName}แล้ว`,
    );
  });

  if (targets.length === 0) {
    return el('li', {}, el('p', { class: 'card-meta' }, 'ไม่มีจุดเก็บปลายทางให้ย้าย (จุดอื่นพักใช้อยู่ทั้งหมด)'));
  }
  return el(
    'li',
    { class: 'move-form' },
    el(
      'div',
      { class: 'inline-form' },
      el('label', {}, `ย้าย “${product.name}” (${available} ${product.unit})`),
      targetSelect,
      qtyInput,
      errorEl,
      el('div', { class: 'form-row' }, confirmButton, cancelButton),
    ),
  );
}
