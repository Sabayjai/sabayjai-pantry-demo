/**
 * ui/product-card.js — ใบการ์ดสินค้าใบเดียวกันทั้งแอป (จอรายการ + จอต้องใช้ก่อน)
 *
 * หนึ่งการ์ด = หนึ่งล็อต (1 lot = 1 จุดเก็บ + 1 วันหมดอายุ + 1 ยอด):
 * ชื่อ+ป้ายวันหมดอายุของล็อตนั้น · ยอด+จุดเก็บ+หมวดหมู่ · stepper ร่างยอด ·
 * ชุดกิจกรรม (ย้าย/ทิ้ง/หมด/ประวัติ) · ฟอร์มย้าย · ไทม์ไลน์ประวัติของล็อต
 * ทุกปุ่มจัดการทีละล็อตตรง ๆ ไม่ต้องเดาว่าโดนล็อตไหน — ชั้นข้อมูลมีคำสั่งระดับล็อตครบอยู่แล้ว
 */
import { el, on } from './dom.js';
import { notify } from '../store.js';
import {
  discardLot,
  listLocations,
  listMovements,
  moveLot,
  setLotQuantity,
} from '../data/db.js';
import { clearUndo, remember, undoLast } from '../data/undo.js';
import { expiryStatus } from '../data/selectors.js';
import {
  draftStepper,
  historyTimeline,
  iconButton,
  showToast,
  showUndoToast,
  statusBadge,
} from './components.js';
import { ValidationError } from '../data/validate.js';

/**
 * state ระดับจอของการ์ด (เก็บข้าม re-render ทั้งจอ)
 * - drafts: ร่างยอดค้างบันทึก (lotId → จำนวนที่แก้บนจอ)
 * - movingLotId: id ล็อตที่กำลังเปิดฟอร์มย้าย (ทีละล็อต)
 */
export function createCardState() {
  return { drafts: new Map(), movingLotId: null };
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

/**
 * ใบการ์ดล็อต 1 ใบ
 * @param {object} lot ล็อตที่ยังมีของ
 * @param {object} product สินค้าของล็อตนั้น (ชื่อ+หน่วย+หมวด+หมายเหตุ)
 * @param {Map} locationNames / categoryNames ตารางชื่อไว้แสดง
 * @param {{ drafts: Map, movingLotId: string | null }} cardState state ของจอนั้น (สร้างด้วย createCardState)
 */
export function lotCard(lot, product, locationNames, categoryNames, cardState) {
  const { drafts } = cardState;
  const name = product?.name ?? 'ไม่พบสินค้า';
  const unit = product?.unit ?? 'ชิ้น';
  const total = Math.max(0, Number(lot.quantity) || 0);
  const status = expiryStatus(lot);

  const meta = [
    `${total} ${unit}`,
    locationNames.get(lot.locationId) ?? 'ไม่ระบุจุดเก็บ',
    product?.categoryId ? categoryNames.get(product.categoryId) ?? null : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // stepper ร่างยอด (shared) — กด +/− เปลี่ยนแค่ตัวเลขบนจอ สต็อกจริงยังไม่ขยับจนกว่าจะกด ✓ บันทึก
  const stepper = draftStepper({
    name,
    unit,
    total,
    draft: drafts.get(lot.id) ?? null,
    onDraft: (qty) => {
      if (qty === null) drafts.delete(lot.id);
      else drafts.set(lot.id, qty);
    },
    onCancel: () => {
      drafts.delete(lot.id);
      notify();
    },
    onSave: (qty, diff) => {
      drafts.delete(lot.id);
      remember();
      try {
        setLotQuantity(lot.id, qty);
      } catch (error) {
        clearUndo();
        drafts.set(lot.id, qty);
        notify();
        showToast(error instanceof ValidationError ? error.message : String(error.message ?? error));
        return;
      }
      toastUndo(
        qty === 0
          ? `ใช้ “${name}” หมดแล้ว`
          : diff < 0
            ? `หยิบ “${name}” ออก ${-diff} ${unit}`
            : `เติม “${name}” ${diff} ${unit}`,
      );
    },
  });

  // ชุดกิจกรรม (activity set) — ย้ายมีปลายทางให้ไปเสมอในเดโมนี้ (ฟอร์มจะบอกเองถ้าจุดอื่นพักใช้หมด)
  const moveButton = iconButton('⇄', 'ย้าย', { ariaLabel: `ย้าย “${name}” ล็อตนี้ไปจุดเก็บอื่น` });
  on(moveButton, 'click', () => {
    cardState.movingLotId = cardState.movingLotId === lot.id ? null : lot.id;
    notify();
  });
  const discardButton = iconButton('🗑', 'ทิ้ง', { ariaLabel: `ทิ้ง “${name}” ล็อตนี้ ${total} ${unit}` });
  on(discardButton, 'click', () => {
    remember();
    try {
      discardLot(lot.id);
    } catch (error) {
      clearUndo();
      showToast(error instanceof ValidationError ? error.message : String(error.message ?? error));
      return;
    }
    toastUndo(`ทิ้ง “${name}” ${total} ${unit}`);
  });
  const usedUpButton = iconButton('⛔', 'หมด', { ariaLabel: `ใช้ “${name}” ล็อตนี้หมดแล้ว (ยังไม่บันทึก)` });
  on(usedUpButton, 'click', () => stepper.api.set(0));

  const historyBox = el(
    'div',
    { class: 'card-move history-box' },
    historyTimeline(listMovements({ lotId: lot.id }), unit),
  );
  historyBox.style.display = 'none';
  const historyButton = iconButton('📜', 'ประวัติ', { ariaLabel: `ดูประวัติ “${name}” ล็อตนี้` });
  historyButton.setAttribute('aria-expanded', 'false');
  on(historyButton, 'click', () => {
    const open = historyBox.style.display === 'none';
    historyBox.style.display = open ? '' : 'none';
    historyButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  const actionsRow = el(
    'div',
    { class: 'card-move' },
    el('div', { class: 'card-actions' }, moveButton, discardButton, usedUpButton, historyButton),
  );

  return el(
    'article',
    {
      class: 'card',
      dataset: { id: lot.id, status },
    },
    el(
      'div',
      { class: 'card-top' },
      el('h3', { class: 'card-name' }, name),
      statusBadge(lot),
    ),
    el('p', { class: 'card-meta' }, meta),
    product?.note ? el('p', { class: 'card-meta' }, `หมายเหตุ: ${product.note}`) : null,
    stepper.stepper,
    stepper.saveRow,
    actionsRow,
    historyBox,
    cardState.movingLotId === lot.id ? moveForm(lot, product, locationNames, cardState) : null,
  );
}

/**
 * ลำดับการ์ดตาม **OQ-R13 (ตอบ A · 2026-10-16): แดง → เหลือง → ที่เหลือ (ชื่อ ก-ฮ)**
 * ดูสถานะรายล็อต (ใบละล็อตแล้ว ไม่ต้องหาล็อตใกล้สุด) · ชื่อเทียบ ก-ฮ
 */
export function sortLotCards(cards) {
  const STATUS_ORDER = { expired: 0, expiring: 1 };
  return cards.slice().sort((a, b) => {
    const orderA = STATUS_ORDER[expiryStatus(a.lot)] ?? 2;
    const orderB = STATUS_ORDER[expiryStatus(b.lot)] ?? 2;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.product?.name ?? '').localeCompare(String(b.product?.name ?? ''), 'th');
  });
}

/** ฟอร์มย้ายล็อต — เลือกปลายทาง (เฉพาะที่ใช้งาน ไม่รวมที่เดิม) + จำนวน (เริ่ม = ทั้งล็อต) */
function moveForm(lot, product, locationNames, cardState) {
  const unit = product?.unit ?? 'ชิ้น';
  const name = product?.name ?? 'ไม่พบสินค้า';
  const targets = listLocations({ activeOnly: true })
    .filter((location) => location.id !== lot.locationId)
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
  const available = Math.max(0, Number(lot.quantity) || 0);

  // ใช้โครง .field.field-inline + .select-chevron ชุดเดียวกับ dropdown ตัวกรองจอรายการ (pattern เดียวกันทั้งแอป)
  const targetSelect = el(
    'select',
    { id: `move-target-${lot.id}` },
    ...targets.map((location) => el('option', { value: location.id }, location.name)),
  );
  const targetField = el(
    'div',
    { class: 'field field-inline' },
    el('label', { for: `move-target-${lot.id}` }, 'จุดเก็บปลายทาง'),
    targetSelect,
    el('span', { class: 'select-chevron', 'aria-hidden': 'true' }),
  );
  const qtyInput = el('input', {
    type: 'number',
    id: `move-qty-${lot.id}`,
    min: '1',
    max: String(Math.max(available, 1)),
    step: '1',
    value: String(Math.max(available, 1)),
  });
  const qtyField = el(
    'div',
    { class: 'field field-inline' },
    el('label', { for: `move-qty-${lot.id}` }, `จำนวนที่ย้าย (มี ${available} ${unit})`),
    qtyInput,
  );
  const errorEl = el('p', { class: 'field-error', role: 'alert' });
  errorEl.style.display = 'none';
  const confirmButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'ย้าย');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
  on(cancelButton, 'click', () => {
    cardState.movingLotId = null;
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
    cardState.movingLotId = null;
    toastUndo(
      qty >= available
        ? `ย้าย “${name}” จาก${fromName}ไป${toName}แล้ว`
        : `ย้าย “${name}” ${qty} ${unit} ไป${toName}แล้ว`,
    );
  });

  if (targets.length === 0) {
    return el('li', {}, el('p', { class: 'card-meta' }, 'ไม่มีจุดเก็บปลายทางให้ย้าย (จุดอื่นพักใช้อยู่ทั้งหมด)'));
  }
  return el(
    'div',
    { class: 'card-move' },
    el(
      'div',
      { class: 'inline-form' },
      targetField,
      qtyField,
      errorEl,
      el('div', { class: 'form-row' }, confirmButton, cancelButton),
    ),
  );
}
