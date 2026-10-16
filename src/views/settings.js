/**
 * views/settings.js — จอ #/settings
 *
 * S2 ทำจริงเฉพาะงานที่ผูกกับชั้นข้อมูล: รีเซ็ตข้อมูลตัวอย่าง (OQ-11) · สำเนาก่อนรีเซ็ต + กู้คืน (D8)
 * · คำนวณ "จำนวนเดิม" ของของที่ใช้หมดแล้วใหม่จากประวัติ (D10)
 * ส่วนอื่นของจอนี้ (dialog ยืนยัน · ข้อมูลเวอร์ชัน) จะขัดเกลาตอน S3/R007
 *
 * หมายเหตุการเขียนข้อความ: resetToSeed()/restoreBackup() ทำให้ state เปลี่ยน → router เรนเดอร์ view ใหม่ทั้งจอ
 * ข้อความที่เขียนลง DOM ตรง ๆ ก่อนเรียกคำสั่งจะถูกทิ้งไปพร้อม DOM ก้อนเก่า
 * → เก็บข้อความล่าสุดไว้ระดับโมดูล (lastMessage) แล้วให้จอใหม่แสดง · หลังคำสั่งจบเขียนทับอีกครั้งผ่าน setMessage()
 */
import { el, on } from '../ui/dom.js';
import { backupInfo, recalculateUsedUpQuantities, resetToSeed, restoreBackup } from '../data/db.js';
import { STORAGE_KEY, isPersistent } from '../data/storage.js';

/** ข้อความล่าสุดของจอนี้ — จอใหม่ที่ถูกเรนเดอร์หลังคำสั่งจะหยิบไปแสดง */
let lastMessage = '';
/** อ้างอิงป้ายสถานะก้อนปัจจุบัน (เปลี่ยนทุกครั้งที่เรนเดอร์) ใช้เขียนข้อความหลังคำสั่งจบ */
let statusEl = null;

const BACKUP_REASON_TEXT = {
  manual: 'กดรีเซ็ตข้อมูลตัวอย่าง',
  broken: 'พบข้อมูลที่อ่านไม่ได้',
  unsupported: 'พบข้อมูลจากแอปเวอร์ชันใหม่กว่า',
  unreadable: 'อ่านที่เก็บข้อมูลไม่ได้',
  empty: 'ที่เก็บว่าง (ครั้งแรก)',
  unknown: 'ไม่ทราบสาเหตุ',
};

const RESTORE_FAILURE_TEXT = {
  missing: 'ไม่พบสำเนาให้กู้คืน',
  broken: 'สำเนาที่เก็บไว้อยู่ในรูปแบบที่อ่านไม่ได้ — ข้อมูลปัจจุบันไม่ถูกแก้',
  unsupported: 'สำเนามาจากแอปเวอร์ชันใหม่กว่า — ข้อมูลปัจจุบันไม่ถูกแก้',
};

/**
 * ISO → 'YYYY-MM-DD HH:MM' ตามเวลาเครื่อง (รูปแบบเดียวกับจออื่นในรอบนี้ · S3 จะกำหนดรูปแบบวันที่จริง)
 * ใช้เวลาท้องถิ่น ไม่ใช่ toISOString เพราะเวลาจะเพี้ยนข้ามโซน (แนวเดียวกับ selectors.js)
 */
function formatSavedAt(value) {
  if (typeof value !== 'string' || !value) return 'ไม่ทราบเวลา';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ทราบเวลา';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setMessage(text) {
  lastMessage = text;
  if (statusEl) statusEl.textContent = text;
}

export function renderSettings() {
  const status = el('p', { class: 'view-note', role: 'status' }, lastMessage);
  statusEl = status;

  const resetButton = el('button', { type: 'button', class: 'btn' }, 'รีเซ็ตข้อมูลตัวอย่าง');
  on(resetButton, 'click', () => {
    // ⏳ S3 จะเพิ่ม dialog ยืนยันการรีเซ็ต (แบบร่างข้อ 2.1) — รอบนี้กดแล้วคืนค่า seed ทันที
    setMessage('คืนค่าข้อมูลตัวอย่างแล้ว · เก็บสำเนาข้อมูลเดิมไว้ให้กู้คืนได้ (ดูหัวข้อ "ข้อมูลสำรอง")');
    resetToSeed();
  });

  const backup = backupInfo();
  const restoreButton = el('button', { type: 'button', class: 'btn' }, 'กู้คืนข้อมูลเดิม');
  on(restoreButton, 'click', () => {
    setMessage('กำลังกู้คืนข้อมูลจากสำเนา…');
    const result = restoreBackup();
    setMessage(
      result.ok
        ? `กู้คืนข้อมูลจากสำเนาแล้ว (สำเนาเมื่อ ${formatSavedAt(result.savedAt)})`
        : RESTORE_FAILURE_TEXT[result.reason] ?? 'กู้คืนไม่สำเร็จ',
    );
  });

  const recalcButton = el('button', { type: 'button', class: 'btn' }, 'คำนวณจำนวนเดิมใหม่จากประวัติ');
  on(recalcButton, 'click', () => {
    const result = recalculateUsedUpQuantities();
    setMessage(
      result.fixed > 0
        ? `คำนวณใหม่แล้ว — แก้จำนวนเดิมของ ${result.fixed} ล็อต`
        : `ตรวจแล้ว — จำนวนเดิมของ ${result.checked} ล็อตตรงกับประวัติอยู่แล้ว`,
    );
  });

  return el(
    'section',
    { class: 'view view-settings' },
    el('h2', {}, 'ตั้งค่า'),
    el(
      'p',
      { class: 'view-note' },
      'เดโมนี้เก็บข้อมูลไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่มี Backend และไม่มีข้อมูลส่งออกนอกเครื่อง',
    ),
    el(
      'p',
      { class: 'view-note' },
      `ที่เก็บข้อมูล: ${
        isPersistent()
          ? `localStorage (คีย์ "${STORAGE_KEY}")`
          : 'หน่วยความจำชั่วคราว (ใช้ localStorage ไม่ได้)'
      }`,
    ),

    el('h3', {}, 'ข้อมูลตัวอย่าง'),
    el('p', { class: 'view-note' }, 'คืนค่าข้อมูลตัวอย่างทั้งชุด — ของเดิมจะถูกเก็บเป็นสำเนาไว้ก่อน ไม่หายไปเลย'),
    el('div', { class: 'settings-actions' }, resetButton),

    el('h3', {}, 'ข้อมูลสำรอง'),
    el(
      'p',
      { class: 'view-note' },
      backup
        ? `มีสำเนาล่าสุด: ${formatSavedAt(backup.savedAt)} · ${BACKUP_REASON_TEXT[backup.reason] ?? backup.reason} · ${backup.bytes} ไบต์`
        : 'ยังไม่มีสำเนา — ระบบจะเก็บให้อัตโนมัติเมื่อกดรีเซ็ต หรือเมื่อพบข้อมูลที่อ่านไม่ได้',
    ),
    el('div', { class: 'settings-actions' }, backup ? restoreButton : null),

    el('h3', {}, '"จำนวนเดิม" ของของที่ใช้หมดแล้ว'),
    el(
      'p',
      { class: 'view-note' },
      'ล็อตที่ยอด 0 จะจำยอดก่อนหมดไว้ (เก็บไว้ที่ล็อต · D10) ถ้าค่าที่เก็บไว้ไม่ตรงกับประวัติ กดคำนวณใหม่ได้',
    ),
    el('div', { class: 'settings-actions' }, recalcButton),

    status,
  );
}
