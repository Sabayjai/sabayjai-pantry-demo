/**
 * views/used-up.js — จอ #/used-up (R005 · S2 · US-007)
 *
 * แถวละ 1 ล็อตยอด 0: ชื่อสินค้า · จำนวนเดิม (usedUpQuantity) · วันที่ใช้หมด ·
 * ปุ่ม "นำกลับเข้ารายการ" → กรอกจำนวนใหม่ inline → restoreLot(lotId, quantity)
 * จุดเดิมโดนพักใช้จะบันทึกไม่ได้ — โชว์ข้อความที่ db ส่งมา inline
 */
import { el, on } from '../ui/dom.js';
import { notify } from '../store.js';
import { listMovements, listUsedUpLots, restoreLot } from '../data/db.js';
import { ValidationError } from '../data/validate.js';
import { emptyState, showToast } from '../ui/components.js';

/** แถวนำกลับแบบ inline — ซ่อนฟอร์มจนกว่าจะกดปุ่ม */
function usedUpRow(entry) {
  const name = entry.product?.name ?? 'ไม่พบสินค้า';
  const unit = entry.product?.unit ?? 'ชิ้น';
  const date = String(entry.usedUpAt ?? '').slice(0, 10);
  // เหตุผลที่หมด: movement ตัวสุดท้ายของล็อตเป็น discard = ทิ้ง ไม่งั้น = ใช้หมด (อ่านจากประวัติ ไม่ต้องเก็บฟิลด์เพิ่ม)
  const discarded = listMovements({ lotId: entry.id }).at(-1)?.type === 'discard';
  const qtyLine = discarded
    ? `ทิ้ง ${entry.usedUpQuantity} ${unit} เมื่อ ${date}`
    : `เคยมียอด ${entry.usedUpQuantity} ${unit} · ใช้หมดเมื่อ ${date}`;
  const reasonBadge = el(
    'span',
    { class: discarded ? 'badge badge-danger' : 'badge badge-fresh', dataset: { status: discarded ? 'discarded' : 'used-up' } },
    discarded ? 'ทิ้ง' : 'ใช้หมด',
  );

  const qtyInput = el('input', {
    type: 'number',
    id: `used-up-qty-${entry.id}`,
    min: '1',
    step: '1',
    value: String(Math.max(entry.usedUpQuantity, 1)),
  });
  const qtyField = el(
    'div',
    { class: 'field field-inline' },
    el('label', { for: `used-up-qty-${entry.id}` }, `จำนวนที่นำกลับ (${unit})`),
    qtyInput,
  );
  const errorEl = el('p', { class: 'field-error', role: 'alert' });
  errorEl.style.display = 'none';
  const confirmButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'นำกลับ');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
  const form = el('div', { class: 'inline-form' }, qtyField, errorEl, el('div', { class: 'form-row' }, confirmButton, cancelButton));
  form.style.display = 'none';

  const restoreButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'นำกลับเข้ารายการ');
  on(restoreButton, 'click', () => {
    form.style.display = '';
    restoreButton.style.display = 'none';
    qtyInput.focus?.();
  });
  on(cancelButton, 'click', () => {
    form.style.display = 'none';
    restoreButton.style.display = '';
  });
  on(confirmButton, 'click', () => {
    try {
      restoreLot(entry.id, Number(qtyInput.value));
    } catch (error) {
      errorEl.textContent = error instanceof ValidationError ? error.message : String(error.message ?? error);
      errorEl.style.display = '';
      return;
    }
    showToast(`นำ “${name}” กลับเข้ารายการแล้ว`);
    notify();
  });

  return el(
    'article',
    { class: 'card', dataset: { id: entry.id, status: discarded ? 'discarded' : 'used-up' } },
    el('div', { class: 'card-top' }, el('h3', { class: 'card-name' }, name), reasonBadge),
    el('p', { class: 'card-meta' }, qtyLine),
    el('div', { class: 'card-actions' }, restoreButton),
    form,
  );
}

export function renderUsedUp() {
  const entries = listUsedUpLots();
  if (entries.length === 0) {
    return el(
      'section',
      { class: 'view view-used-up' },
      el('h2', {}, 'ใช้หมดแล้ว'),
      emptyState({ text: 'ยังไม่มีของที่ใช้หมด — ของที่ยอดเหลือ 0 จะมาอยู่ที่นี่', actionLabel: 'ดูของในบ้าน', actionHref: '#/items' }),
    );
  }
  return el(
    'section',
    { class: 'view view-used-up' },
    el('h2', {}, 'ใช้หมดแล้ว'),
    el('p', { class: 'view-note' }, `มี ${entries.length} รายการ · ไม่ปนกับของที่ยังมีอยู่`),
    el('div', { class: 'cards' }, ...entries.map(usedUpRow)),
  );
}
