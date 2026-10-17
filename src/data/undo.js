/**
 * data/undo.js — ย้อนกลับ 1 ขั้น (R005 · US-003 · เลื่อนมาจาก OQ-R10)
 *
 * เก็บภาพจำ state ทั้งก้อนก่อนคำสั่งเปลี่ยนยอด (structuredClone ผ่าน JSON)
 * จำได้ทีละอันเท่านั้น — จำใหม่ทับอันเก่า (ตรงสเปก toast-undo "สลับได้ทีละอัน")
 * view เรียก remember() ก่อน mutate เสมอ · undo() คืนค่าผ่าน db.restoreState()
 */
import { getState } from '../store.js';
import { restoreState } from './db.js';

let snapshot = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** จำ state ปัจจุบันไว้ (เรียกก่อน mutate ทุกครั้ง) */
export function remember() {
  snapshot = clone(getState());
}

/** ล้างภาพจำ (เรียกเมื่อ mutate ล้มเหลว หรือ toast หมดอายุ/ถูกแทน) */
export function clearUndo() {
  snapshot = null;
}

/** มีอะไรให้ย้อนกลับไหม */
export function hasUndo() {
  return snapshot !== null;
}

/**
 * ย้อนกลับ 1 ขั้น — คืน true ถ้าย้อนสำเร็จ
 * ย้อนแล้วภาพจำหมดอายุทันที (ย้อนซ้ำไม่ได้)
 */
export function undoLast() {
  if (!snapshot) return false;
  const previous = snapshot;
  snapshot = null;
  restoreState(previous);
  return true;
}
