/**
 * ui/components.js — องค์ประกอบนำกลับใช้ (แบบร่าง UX/UI ข้อ 4)
 *
 * R001 · S3 · Task 8: `status-badge` · `summary-bar` · `empty-state`
 * R002: `filter-chips` (ทั้งหมด/ใช้งาน/พักใช้) · `active-badge` (ป้ายใช้งาน/พักใช้) ·
 * `confirm-dialog` (ยืนยันพักใช้) · `reference-card` (การ์ดจุดเก็บ/หมวดหมู่บนโครง .card เดียวกับ #/items)
 *
 * ชื่อคลาสต้องตรงกับ docs/design/ux-ui/prototype.html
 * — แบบร่างและแอปจริงใช้โทเคน/องค์ประกอบชุดเดียวกัน (แบบร่างข้อ 3)
 * R002 ตัดสิน Card ล้วนทุก layout (ภาษาเดียวกัน) — จออ้างอิงใช้การ์ด ไม่ใช้แถว
 */
import { el, on } from './dom.js';
import { expiryLabel, expiryStatus } from '../data/selectors.js';

/** คู่สี+ข้อความของสถานะหมดอายุ (แบบร่างข้อ 3) — สีไม่เคยพูดคนเดียว */
export const STATUS_BADGE_CLASS = {
  expired: 'badge badge-danger',
  expiring: 'badge badge-warn',
  fresh: 'badge badge-fresh',
};

/**
 * ป้ายสถานะของ "หน่วยที่มีวันหมดอายุ" (ล็อต) — ข้อความไทยมาจาก selectors เพื่อให้ถ้อยคำตรงกับที่เทสต์ไว้
 * ไม่มีข้อมูล / ล็อตที่ไม่ระบุวันหมดอายุ (`none`) → ไม่มีป้าย (คืน null ให้ `el()` ข้ามไป)
 */
export function statusBadge(item) {
  if (!item) return null;
  const status = expiryStatus(item);
  if (status === 'none') return null;
  return el(
    'span',
    { class: STATUS_BADGE_CLASS[status] ?? 'badge badge-fresh', dataset: { status } },
    expiryLabel(item),
  );
}

/** แถบสรุปของใกล้หมดอายุ (US-005) — ข้อความจาก `selectors.expiringSummary` */
export function summaryBar(summary) {
  const text =
    summary.total === 0
      ? 'ยังไม่มีของที่ต้องใช้ก่อน'
      : `มีของต้องใช้ ${summary.total} ล็อต · หมดอายุ ${summary.expired} · ใกล้หมดอายุ ${summary.expiring}`;
  return el('p', { class: 'summary-bar' }, text);
}

/** ป้ายสถานะใช้งาน/พักใช้ของ master data (R002) — สี+ข้อความคู่กันเสมอ (ข้อ 4.2) */
export function activeBadge(isActive) {
  const active = isActive !== false;
  return el(
    'span',
    { class: active ? 'badge badge-active' : 'badge badge-inactive', dataset: { status: active ? 'active' : 'inactive' } },
    active ? 'ใช้งาน' : 'พักใช้',
  );
}

/** ตัวกรอง ทั้งหมด/ใช้งาน/พักใช้ (R002 · ใช้ชุดเดียวกับตัวกรอง #/items ใน R004) */
export function filterChips(options, current, onSelect) {
  return el(
    'div',
    { class: 'chips', role: 'group', 'aria-label': 'กรองตามสถานะ' },
    ...options.map((option) => {
      const button = el(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': option.value === current ? 'true' : 'false',
        },
        `${option.label} (${option.count})`,
      );
      on(button, 'click', () => onSelect(option.value));
      return button;
    }),
  );
}

/**
 * dialog ยืนยัน (R002 · OQ-R2-3) — ปุ่มทำลายสีแดง · Esc = ยกเลิก · คลิกฉากหลัง = ยกเลิก
 * ไม่ใช้ <dialog> เพราะต้องคุมโฟกัส/สไตล์เองให้ตรงโทเคน และให้ view ที่ re-render ทั้งจอเรียกใช้ง่าย
 */
export function confirmDialog({ title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก', danger = true, onConfirm, onCancel }) {
  const confirmButton = el('button', { type: 'button', class: danger ? 'btn btn-danger' : 'btn btn-primary' }, confirmLabel);
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, cancelLabel);
  const dialogEl = el(
    'div',
    { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
    el('h3', {}, title),
    el('p', {}, message),
    el('div', { class: 'dialog-actions' }, cancelButton, confirmButton),
  );
  const backdrop = el('div', { class: 'dialog-backdrop' }, dialogEl);

  const close = (result) => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey, true);
    if (result === true) onConfirm?.();
    else onCancel?.();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close(false);
    }
  };
  document.addEventListener('keydown', onKey, true);
  on(confirmButton, 'click', () => close(true));
  on(cancelButton, 'click', () => close(false));
  on(backdrop, 'click', (event) => {
    if (event.target === backdrop) close(false);
  });

  cancelButton.focus?.();
  return backdrop;
}

/** toast ธรรมดาอ่านอย่างเดียว (R003 · US-001) — ไม่ใช่ undo (undo อยู่ R005) · หายเอง 5 วิ */
export function showToast(text) {
  document.querySelector('.toast')?.remove();
  const toastEl = el('p', { class: 'toast', role: 'status' }, text);
  document.body.append(toastEl);
  setTimeout(() => toastEl.remove(), 5000);
  return toastEl;
}

/**
 * toast-undo (R005 · US-003) — ครั้งละ 1 อัน อันใหม่มาแทนอันเก่า · นับถอยหลัง 5 วิ · Esc/หมดเวลา = หมดสิทธิ์ย้อน
 * onTimeout ไว้ให้ผู้เรียกทิ้งภาพจำ (undo.js) เมื่อ toast หมดอายุโดยไม่กดย้อนกลับ
 */
export function showUndoToast({ message, undoLabel = 'ย้อนกลับ', seconds = 5, onUndo, onTimeout }) {
  document.querySelector('.toast')?.remove();
  document.querySelector('.undo-toast')?.remove();
  if (window.__sjUndoTimer) clearTimeout(window.__sjUndoTimer);

  const label = el('span', {}, message);
  const button = el('button', { type: 'button', class: 'btn btn-primary' }, `${undoLabel} (${seconds})`);
  const toastEl = el('div', { class: 'undo-toast', role: 'status' }, label, button);
  document.body.append(toastEl);

  let left = seconds;
  const timer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(timer);
      window.__sjUndoTimer = null;
      toastEl.remove();
      onTimeout?.();
    } else {
      button.textContent = `${undoLabel} (${left})`;
    }
  }, 1000);
  window.__sjUndoTimer = timer;

  const close = (undone) => {
    clearInterval(timer);
    window.__sjUndoTimer = null;
    toastEl.remove();
    if (undone) onUndo?.();
    else onTimeout?.();
  };
  on(button, 'click', () => close(true));
  return toastEl;
}

/** สถานะว่าง — ต้องบอกว่าทำอะไรต่อได้ ไม่ปล่อยจอเงียบ (หลักการข้อ 5 ของแบบร่าง) */
export function emptyState({ text, actionLabel = null, actionHref = null } = {}) {
  return el(
    'div',
    { class: 'empty' },
    el('p', {}, text),
    actionLabel && actionHref ? el('a', { class: 'btn btn-primary', href: actionHref }, actionLabel) : null,
  );
}
