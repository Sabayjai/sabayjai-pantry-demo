/**
 * views/locations.js — จอ #/locations (R002 · S1)
 *
 * Card ล้วนทุก layout (ภาษาเดียวกับ #/items · คำตัดสิน 2026-10-17)
 * - 1 การ์ด = 1 จุดเก็บ · มีป้ายสถานะ ใช้งาน/พักใช้ + ตัวกรอง ทั้งหมด/ใช้งาน/พักใช้
 * - เพิ่ม/แก้ชื่อ/พักใช้-เปิดใช้ได้ · ไม่มีปุ่มลบถาวรในจอ (master data ใช้ inactive แทน)
 * - พักได้แม้มีของค้าง (OQ-R2-5 = A) · ของเดิม/ประวัติอยู่ครบ แค่ซ่อนจาก dropdown ของใหม่
 * - การ์ดกดไม่ได้ทั้งใบ (OQ-R2-2 = C) กดได้แค่ปุ่ม — กันกดพลาดบนมือถือ
 */
import { el, on } from '../ui/dom.js';
import {
  addLocation,
  countLotsInLocation,
  listLocations,
  renameLocation,
  setLocationActive,
} from '../data/db.js';
import { ValidationError } from '../data/validate.js';
import { notify } from '../store.js';
import { activeBadge, confirmDialog, emptyState, filterChips, iconButton } from '../ui/components.js';

/** ตัวกรองปัจจุบันของจอ — เก็บระดับโมดูลเพราะ router re-render ทั้งจอเมื่อ state เปลี่ยน */
let filter = 'all';
/** โหมดเพิ่ม / id ที่กำลังแก้ชื่อ — เก็บระดับโมดูลเช่นกัน */
let adding = false;
let editingId = null;
/** ข้อความผิดพลาดของฟอร์มเพิ่ม / ฟอร์มแก้ชื่อ (keyed by id) */
let addError = '';
const editErrors = new Map();
/** ข้อความสถานะล่าสุด (แสดงหลังคำสั่งสำเร็จ) */
let lastMessage = '';

function setMessage(text) {
  lastMessage = text;
}

function sortByNameThai(list) {
  return list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
}

function counts() {
  const all = listLocations();
  const active = all.filter((entry) => entry.isActive !== false).length;
  return { all: all.length, active, inactive: all.length - active };
}

function toDisplayName(value) {
  return value;
}

export function renderLocations() {
  const all = sortByNameThai(listLocations());
  const { all: total, active, inactive } = counts();
  const visible = all.filter((entry) => {
    if (filter === 'active') return entry.isActive !== false;
    if (filter === 'inactive') return entry.isActive === false;
    return true;
  });

  const chips = filterChips(
    [
      { value: 'all', label: 'ทั้งหมด', count: total },
      { value: 'active', label: 'ใช้งาน', count: active },
      { value: 'inactive', label: 'พักใช้', count: inactive },
    ],
    filter,
    (value) => {
      filter = value;
      notify();
    },
  );

  const addButton = el('button', { type: 'button', class: 'btn btn-primary' }, '＋ เพิ่มจุดเก็บ');
  on(addButton, 'click', () => {
    adding = !adding;
    addError = '';
    notify();
  });

  const cards =
    visible.length > 0
      ? el(
          'div',
          { class: 'cards' },
          ...visible.map((location) => locationCard(location)),
        )
      : emptyState({
          text:
            filter === 'inactive'
              ? 'ยังไม่มีจุดเก็บที่พักใช้'
              : 'ยังไม่มีจุดเก็บ — เพิ่มจุดแรกเพื่อเริ่มจัดของในบ้าน',
        });

  return el(
    'section',
    { class: 'view view-locations' },
    el('h2', {}, `จุดเก็บ (${total})`),
    chips,
    el('div', { class: 'settings-actions' }, addButton),
    adding ? addForm() : null,
    cards,
    lastMessage ? el('p', { class: 'view-note', role: 'status' }, lastMessage) : null,
    el(
      'p',
      { class: 'view-note' },
      'จุดเก็บที่พักใช้จะไม่แสดงในตัวเลือกตอนเพิ่มของใหม่ แต่ของเดิมยังอยู่ครบ — เปิดใช้กลับมาได้เสมอ',
    ),
  );
}

function addForm() {
  const input = el('input', {
    type: 'text',
    id: 'location-add-name',
    name: 'name',
    maxlength: '60',
    autocomplete: 'off',
    placeholder: 'ชื่อจุดเก็บใหม่ เช่น ระเบียง',
  });
  const saveButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'บันทึก');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');

  const submit = () => {
    try {
      const created = addLocation(input.value);
      adding = false;
      addError = '';
      setMessage(`เพิ่มจุดเก็บ “${created.name}” แล้ว`);
      notify();
    } catch (error) {
      addError = error instanceof ValidationError ? (error.errors.name ?? error.message) : String(error.message ?? error);
      notify();
    }
  };

  on(saveButton, 'click', submit);
  on(input, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });
  on(cancelButton, 'click', () => {
    adding = false;
    addError = '';
    notify();
  });

  const form = el(
    'form',
    { class: 'inline-form' },
    el('label', { for: 'location-add-name' }, 'ชื่อจุดเก็บใหม่'),
    input,
    addError ? el('p', { class: 'field-error', role: 'alert' }, addError) : null,
    el('div', { class: 'form-row' }, saveButton, cancelButton),
  );
  on(form, 'submit', (event) => event.preventDefault());
  queueMicrotask(() => input.focus?.());
  return form;
}

function locationCard(location) {
  const count = countLotsInLocation(location.id);
  const isActive = location.isActive !== false;

  if (editingId === location.id) return editCard(location);

  const renameButton = iconButton('✏️', 'แก้ชื่อ', { ariaLabel: `แก้ชื่อจุดเก็บ “${location.name}”` });
  on(renameButton, 'click', () => {
    editingId = location.id;
    editErrors.delete(location.id);
    notify();
  });

  const toggleButton = iconButton(isActive ? '⏸' : '▶️', isActive ? 'พักใช้' : 'เปิดใช้', {
    variant: isActive ? 'danger' : 'primary',
    ariaLabel: isActive ? `พักใช้จุดเก็บ “${location.name}”` : `เปิดใช้จุดเก็บ “${location.name}”`,
  });
  on(toggleButton, 'click', () => {
    if (isActive) {
      const countText = count > 0 ? ` ของข้างใน ${count} ล็อตยังอยู่ครบ แค่ไม่ให้เติมของใหม่เข้าไป` : '';
      document.body.append(
        confirmDialog({
          title: `พักใช้ “${toDisplayName(location.name)}”?`,
          message: `จุดเก็บนี้จะซ่อนจากตัวเลือกตอนเพิ่มของใหม่.${countText}`,
          confirmLabel: 'พักใช้',
          onConfirm: () => {
            setLocationActive(location.id, false);
            setMessage(`พักใช้จุดเก็บ “${location.name}” แล้ว`);
            notify();
          },
        }),
      );
    } else {
      setLocationActive(location.id, true);
      setMessage(`เปิดใช้จุดเก็บ “${location.name}” แล้ว`);
      notify();
    }
  });

  return el(
    'article',
    { class: 'card', dataset: { id: location.id, status: isActive ? 'active' : 'inactive' } },
    el('div', { class: 'card-top' }, el('h3', { class: 'card-name' }, location.name), activeBadge(isActive)),
    el('p', { class: 'card-meta' }, `${count} ล็อต${isActive ? '' : ' · พักใช้อยู่'}`),
    el('div', { class: 'card-actions' }, renameButton, toggleButton),
  );
}

function editCard(location) {
  const input = el('input', {
    type: 'text',
    id: `location-rename-${location.id}`,
    name: 'name',
    maxlength: '60',
    autocomplete: 'off',
    value: location.name,
  });
  const saveButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'บันทึก');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
  const error = editErrors.get(location.id) ?? '';

  const submit = () => {
    try {
      const updated = renameLocation(location.id, input.value);
      editingId = null;
      editErrors.delete(location.id);
      setMessage(`เปลี่ยนชื่อเป็น “${updated.name}” แล้ว`);
      notify();
    } catch (err) {
      editErrors.set(location.id, err instanceof ValidationError ? (err.errors.name ?? err.message) : String(err.message ?? err));
      notify();
    }
  };

  on(saveButton, 'click', submit);
  on(input, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });
  on(cancelButton, 'click', () => {
    editingId = null;
    editErrors.delete(location.id);
    notify();
  });

  const form = el(
    'form',
    { class: 'inline-form' },
    el('label', { for: `location-rename-${location.id}` }, 'ชื่อจุดเก็บ'),
    input,
    error ? el('p', { class: 'field-error', role: 'alert' }, error) : null,
    el('div', { class: 'form-row' }, saveButton, cancelButton),
  );
  on(form, 'submit', (event) => event.preventDefault());

  return el(
    'article',
    { class: 'card', dataset: { id: location.id, status: location.isActive !== false ? 'active' : 'inactive' } },
    el('div', { class: 'card-top' }, el('h3', { class: 'card-name' }, location.name), activeBadge(location.isActive)),
    form,
  );
}
