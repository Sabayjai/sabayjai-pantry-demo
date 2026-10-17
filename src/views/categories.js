/**
 * views/categories.js — จอ #/categories (R002 · S2)
 *
 * โครงเดียวกับ #/locations ต่างแค่คำเรียกและตัวนับ:
 * หมวดหมู่นับ "สินค้า" (category อยู่ที่ product ไม่ใช่ lot)
 * Card ล้วน · ป้ายสถานะ · ตัวกรอง · พักใช้แทนลบถาวร · การ์ดกดไม่ได้ทั้งใบ
 */
import { el, on } from '../ui/dom.js';
import {
  addCategory,
  countProductsInCategory,
  listCategories,
  renameCategory,
  setCategoryActive,
} from '../data/db.js';
import { ValidationError } from '../data/validate.js';
import { notify } from '../store.js';
import { activeBadge, confirmDialog, emptyState, filterChips, iconButton } from '../ui/components.js';

let filter = 'all';
let adding = false;
let editingId = null;
let addError = '';
const editErrors = new Map();
let lastMessage = '';

function setMessage(text) {
  lastMessage = text;
}

function sortByNameThai(list) {
  return list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
}

function counts() {
  const all = listCategories();
  const active = all.filter((entry) => entry.isActive !== false).length;
  return { all: all.length, active, inactive: all.length - active };
}

export function renderCategories() {
  const all = sortByNameThai(listCategories());
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

  const addButton = el('button', { type: 'button', class: 'btn btn-primary' }, '＋ เพิ่มหมวดหมู่');
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
          ...visible.map((category) => categoryCard(category)),
        )
      : emptyState({
          text: filter === 'inactive' ? 'ยังไม่มีหมวดหมู่ที่พักใช้' : 'ยังไม่มีหมวดหมู่ — เพิ่มหมวดแรกเพื่อเริ่มจัดของในบ้าน',
        });

  return el(
    'section',
    { class: 'view view-categories' },
    el('h2', {}, `หมวดหมู่ (${total})`),
    chips,
    el('div', { class: 'settings-actions' }, addButton),
    adding ? addForm() : null,
    cards,
    lastMessage ? el('p', { class: 'view-note', role: 'status' }, lastMessage) : null,
    el(
      'p',
      { class: 'view-note' },
      'หมวดหมู่ที่พักใช้จะไม่แสดงในตัวเลือกตอนเพิ่มของใหม่ แต่สินค้าเดิมยังอยู่ครบ — เปิดใช้กลับมาได้เสมอ',
    ),
  );
}

function addForm() {
  const input = el('input', {
    type: 'text',
    id: 'category-add-name',
    name: 'name',
    maxlength: '60',
    autocomplete: 'off',
    placeholder: 'ชื่อหมวดหมู่ใหม่ เช่น ของแห้ง',
  });
  const saveButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'บันทึก');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');

  const submit = () => {
    try {
      const created = addCategory(input.value);
      adding = false;
      addError = '';
      setMessage(`เพิ่มหมวดหมู่ “${created.name}” แล้ว`);
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
    el('label', { for: 'category-add-name' }, 'ชื่อหมวดหมู่ใหม่'),
    input,
    addError ? el('p', { class: 'field-error', role: 'alert' }, addError) : null,
    el('div', { class: 'form-row' }, saveButton, cancelButton),
  );
  on(form, 'submit', (event) => event.preventDefault());
  queueMicrotask(() => input.focus?.());
  return form;
}

function categoryCard(category) {
  const count = countProductsInCategory(category.id);
  const isActive = category.isActive !== false;

  if (editingId === category.id) return editCard(category);

  const renameButton = iconButton('✏️', 'แก้ชื่อ', { ariaLabel: `แก้ชื่อหมวดหมู่ “${category.name}”` });
  on(renameButton, 'click', () => {
    editingId = category.id;
    editErrors.delete(category.id);
    notify();
  });

  const toggleButton = iconButton(isActive ? '⏸' : '▶️', isActive ? 'พักใช้' : 'เปิดใช้', {
    variant: isActive ? 'danger' : 'primary',
    ariaLabel: isActive ? `พักใช้หมวด “${category.name}”` : `เปิดใช้หมวด “${category.name}”`,
  });
  on(toggleButton, 'click', () => {
    if (isActive) {
      const countText = count > 0 ? ` สินค้าในหมวดนี้ ${count} รายการยังอยู่ครบ แค่ไม่ให้เลือกตอนเพิ่มของใหม่` : '';
      document.body.append(
        confirmDialog({
          title: `พักใช้หมวด “${category.name}”?`,
          message: `หมวดนี้จะซ่อนจากตัวเลือกตอนเพิ่มของใหม่.${countText}`,
          confirmLabel: 'พักใช้',
          onConfirm: () => {
            setCategoryActive(category.id, false);
            setMessage(`พักใช้หมวด “${category.name}” แล้ว`);
            notify();
          },
        }),
      );
    } else {
      setCategoryActive(category.id, true);
      setMessage(`เปิดใช้หมวด “${category.name}” แล้ว`);
      notify();
    }
  });

  return el(
    'article',
    { class: 'card', dataset: { id: category.id, status: isActive ? 'active' : 'inactive' } },
    el('div', { class: 'card-top' }, el('h3', { class: 'card-name' }, category.name), activeBadge(isActive)),
    el('p', { class: 'card-meta' }, `${count} สินค้า${isActive ? '' : ' · พักใช้อยู่'}`),
    el('div', { class: 'card-actions' }, renameButton, toggleButton),
  );
}

function editCard(category) {
  const input = el('input', {
    type: 'text',
    id: `category-rename-${category.id}`,
    name: 'name',
    maxlength: '60',
    autocomplete: 'off',
    value: category.name,
  });
  const saveButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'บันทึก');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
  const error = editErrors.get(category.id) ?? '';

  const submit = () => {
    try {
      const updated = renameCategory(category.id, input.value);
      editingId = null;
      editErrors.delete(category.id);
      setMessage(`เปลี่ยนชื่อเป็น “${updated.name}” แล้ว`);
      notify();
    } catch (err) {
      editErrors.set(category.id, err instanceof ValidationError ? (err.errors.name ?? err.message) : String(err.message ?? err));
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
    editErrors.delete(category.id);
    notify();
  });

  const form = el(
    'form',
    { class: 'inline-form' },
    el('label', { for: `category-rename-${category.id}` }, 'ชื่อหมวดหมู่'),
    input,
    error ? el('p', { class: 'field-error', role: 'alert' }, error) : null,
    el('div', { class: 'form-row' }, saveButton, cancelButton),
  );
  on(form, 'submit', (event) => event.preventDefault());

  return el(
    'article',
    { class: 'card', dataset: { id: category.id, status: category.isActive !== false ? 'active' : 'inactive' } },
    el('div', { class: 'card-top' }, el('h3', { class: 'card-name' }, category.name), activeBadge(category.isActive)),
    form,
  );
}
