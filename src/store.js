/**
 * store.js — pub/sub บาง ๆ ให้ view subscribe (ดีไซน์ข้อ 3.5)
 *
 * จงใจไม่ยึด state ไว้เอง: ชั้นข้อมูล (db.js) เป็นเจ้าของ state แล้ว "ผูก" ตัวอ่านเข้ามา
 * ด้วย bindState() → ทำให้ไม่เกิดวงการ import ระหว่าง store ↔ db
 * ลำดับ: action → แก้ state → persist → notify() → re-render view ปัจจุบัน
 */

const listeners = new Set();
let stateReader = () => null;

/** เรียกโดยชั้นข้อมูลตอนบูต เพื่อให้ getState() เห็น state ก้อนเดียวกัน */
export function bindState(reader) {
  stateReader = typeof reader === 'function' ? reader : () => null;
}

/** state ปัจจุบัน (อ่านเท่านั้น — ห้ามแก้ตรง ๆ ให้เรียกคำสั่งใน db.js) */
export function getState() {
  return stateReader();
}

/** subscribe(listener) → คืน unsubscribe */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** แจ้งทุก view ที่ subscribe อยู่ (เรียกหลัง commit ทุกครั้ง) */
export function notify() {
  const state = getState();
  for (const listener of [...listeners]) {
    try {
      listener(state);
    } catch (error) {
      // view ตัวเดียวพังไม่ควรทำให้ view อื่น/ข้อมูลพังตาม
      console.error('[sabayjai] listener ทำงานผิดพลาด', error);
    }
  }
}
