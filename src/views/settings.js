/**
 * views/settings.js — จอ #/settings
 *
 * S2 ทำจริงเฉพาะงานที่ผูกกับชั้นข้อมูล: รีเซ็ตข้อมูลตัวอย่าง (OQ-11) · สำเนาก่อนรีเซ็ต + กู้คืน (D8)
 * · คำนวณ "จำนวนเดิม" ของของที่ใช้หมดแล้วใหม่จากประวัติ (D10)
 *
 * หมายเหตุการเขียนข้อความ: resetToSeed()/restoreBackup() ทำให้ state เปลี่ยน → router เรนเดอร์ view ใหม่ทั้งจอ
 * ข้อความที่เขียนลง DOM ตรง ๆ ก่อนเรียกคำสั่งจะถูกทิ้งไปพร้อม DOM ก้อนเก่า
 * → เก็บข้อความล่าสุดไว้ระดับโมดูล (lastMessage) แล้วให้จอใหม่แสดง · หลังคำสั่งจบเขียนทับอีกครั้งผ่าน setMessage()
 */
import { el, on } from '../ui/dom.js';
import { confirmDialog } from '../ui/components.js';
import { backupInfo, clearTransactions, recalculateUsedUpQuantities, resetToSeed, restoreBackup } from '../data/db.js';
import { STORAGE_KEY, isPersistent } from '../data/storage.js';

/** ข้อความล่าสุดของจอนี้ — จอใหม่ที่ถูกเรนเดอร์หลังคำสั่งจะหยิบไปแสดง */
let lastMessage = '';
/** อ้างอิงป้ายสถานะก้อนปัจจุบัน (เปลี่ยนทุกครั้งที่เรนเดอร์) ใช้เขียนข้อความหลังคำสั่งจบ */
let statusEl = null;

const BACKUP_REASON_TEXT = {
  manual: 'กดรีเซ็ตข้อมูลตัวอย่าง',
  'clear-seed': 'กดล้างข้อมูลตัวอย่าง',
  'clear-transactions': 'กดล้างสินค้าและรายการต้องซื้อทั้งหมด',
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

  const resetButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'รีเซ็ตข้อมูลตัวอย่าง');
  on(resetButton, 'click', () => {
    document.body.append(confirmDialog({
      title: 'รีเซ็ตข้อมูลตัวอย่าง?',
      message: 'ข้อมูลปัจจุบันทั้งหมดในเครื่องนี้จะถูกแทนที่ด้วยข้อมูลตัวอย่างชุดใหม่ ทั้งสินค้า ล็อต ประวัติ จุดเก็บ หมวดหมู่ หน่วย และรายการต้องซื้อ ระบบจะเก็บสำเนาข้อมูลปัจจุบันแทนสำเนาเดิมเพื่อให้กู้คืนได้',
      confirmLabel: 'รีเซ็ตข้อมูล',
      onConfirm: () => {
        setMessage('คืนค่าข้อมูลตัวอย่างแล้ว · เก็บสำเนาข้อมูลเดิมไว้ให้กู้คืนได้ (ดูหัวข้อ "ข้อมูลสำรอง")');
        resetToSeed();
      },
    }));
  });

  const clearButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ล้างสินค้าและรายการต้องซื้อทั้งหมด');
  on(clearButton, 'click', () => {
    document.body.append(confirmDialog({
      title: 'ล้างสินค้าและรายการต้องซื้อทั้งหมด?',
      message: 'สินค้า ล็อต ประวัติการเคลื่อนไหว และรายการต้องซื้อทั้งหมดจะถูกลบ ทั้งข้อมูลตัวอย่างและรายการที่เพิ่มเอง จุดเก็บ หมวดหมู่ และหน่วยจะคงอยู่ ระบบจะเก็บสำเนาปัจจุบันแทนสำเนาเดิมก่อนล้างเพื่อให้กู้คืนได้',
      confirmLabel: 'ล้างทั้งหมด',
      onConfirm: () => {
        const result = clearTransactions();
        if (!result.ok) {
          setMessage('ล้างไม่สำเร็จ เพราะเก็บสำเนาข้อมูลก่อนล้างไม่ได้ · ข้อมูลเดิมยังอยู่ครบ');
        } else if (result.products || result.lots || result.movements || result.shopping) {
          setMessage(`ล้างข้อมูลแล้ว — สินค้า ${result.products} รายการ · ล็อต ${result.lots} ล็อต · ประวัติ ${result.movements} รายการ · ต้องซื้อ ${result.shopping} รายการ`);
        } else {
          setMessage('ไม่มีสินค้า ล็อต ประวัติ หรือรายการต้องซื้อที่ต้องล้าง');
        }
      },
    }));
  });

  const backup = backupInfo();
  const restoreButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'กู้คืนข้อมูลเดิม');
  on(restoreButton, 'click', () => {
    document.body.append(confirmDialog({
      title: 'กู้คืนข้อมูลเดิม?',
      message: `ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยสำเนาเมื่อ ${formatSavedAt(backup?.savedAt)} การแก้ไขที่ทำหลังเวลานั้นจะหายไป`,
      confirmLabel: 'กู้คืนข้อมูล',
      onConfirm: () => {
        setMessage('กำลังกู้คืนข้อมูลจากสำเนา…');
        const result = restoreBackup();
        setMessage(
          result.ok
            ? `กู้คืนข้อมูลจากสำเนาแล้ว (สำเนาเมื่อ ${formatSavedAt(result.savedAt)})`
            : RESTORE_FAILURE_TEXT[result.reason] ?? 'กู้คืนไม่สำเร็จ',
        );
      },
    }));
  });

  const recalcButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'คำนวณจำนวนเดิมใหม่จากประวัติ');
  on(recalcButton, 'click', () => {
    document.body.append(confirmDialog({
      title: 'คำนวณจำนวนเดิมใหม่?',
      message: 'ระบบจะตรวจค่าจำนวนเดิมของทุกล็อตและแก้ให้ตรงกับประวัติที่บันทึกไว้ หากมีค่าคลาดเคลื่อน ยอดคงเหลือและประวัติจะไม่เปลี่ยน',
      confirmLabel: 'คำนวณใหม่',
      danger: false,
      onConfirm: () => {
        const result = recalculateUsedUpQuantities();
        setMessage(
          result.fixed > 0
            ? `คำนวณใหม่แล้ว — แก้จำนวนเดิมของ ${result.fixed} ล็อต`
            : `ตรวจแล้ว — จำนวนเดิมของ ${result.checked} ล็อตตรงกับประวัติอยู่แล้ว`,
        );
      },
    }));
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

    el('h3', {}, 'จัดการข้อมูล'),
    el('p', { class: 'view-note' }, 'คืนค่าข้อมูลตัวอย่างทั้งชุด — ของเดิมจะถูกเก็บเป็นสำเนาไว้ก่อน ไม่หายไปเลย'),
    el('div', { class: 'settings-actions' }, resetButton),
    el('p', { class: 'view-note' }, 'เริ่มต้นข้อมูลใหม่ โดยลบสินค้า ล็อต ประวัติ และรายการต้องซื้อทั้งหมด รวมรายการที่เพิ่มเอง · จุดเก็บ หมวดหมู่ และหน่วยยังอยู่'),
    el('div', { class: 'settings-actions' }, clearButton),

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
