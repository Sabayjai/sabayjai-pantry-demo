/**
 * ui/components.js — องค์ประกอบนำกลับใช้ (แบบร่าง UX/UI ข้อ 4)
 *
 * รอบ R001 · S3 · Task 8 สร้างเฉพาะที่จอจริงใช้แล้ว: `status-badge` · `summary-bar` · `empty-state`
 * องค์ประกอบที่เหลือ (qty-stepper · search-field · filter-chips · toast-undo · confirm-dialog ·
 * form-field · inline-add · reference-row) จะทยอยสร้างพร้อมจอของ Release ที่รับผิดชอบ
 *
 * ชื่อคลาสต้องตรงกับ docs/design/ux-ui/prototype.html
 * — แบบร่างและแอปจริงใช้โทเคน/องค์ประกอบชุดเดียวกัน (แบบร่างข้อ 3)
 */
import { el } from './dom.js';
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

/** สถานะว่าง — ต้องบอกว่าทำอะไรต่อได้ ไม่ปล่อยจอเงียบ (หลักการข้อ 5 ของแบบร่าง) */
export function emptyState({ text, actionLabel = null, actionHref = null } = {}) {
  return el(
    'div',
    { class: 'empty' },
    el('p', {}, text),
    actionLabel && actionHref ? el('a', { class: 'btn btn-primary', href: actionHref }, actionLabel) : null,
  );
}
