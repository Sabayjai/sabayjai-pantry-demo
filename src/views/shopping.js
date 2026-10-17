/**
 * views/shopping.js — จอ #/shopping (R007 · US-008)
 *
 * สมุดโน้ตอิสระ (OQ-13 · OQ-15): ข้อความช่องเดียว ไม่มีจำนวน/หมวดหมู่/จุดเก็บ ·
 * เพิ่มเอง · ติ๊ก "ซื้อแล้ว" แล้วหาย · ลบได้ · ไม่แตะสต็อก
 */
import { el, on } from '../ui/dom.js';
import { notify } from '../store.js';
import { addShopping, listShopping, toggleShopping, removeShopping } from '../data/db.js';
import { ValidationError } from '../data/validate.js';
import { emptyState } from '../ui/components.js';

function shoppingRow(entry) {
  const doneButton = el('button', { type: 'button', class: 'btn btn-ghost', 'aria-label': `ซื้อ “${entry.text}” แล้ว` }, 'ซื้อแล้ว');
  on(doneButton, 'click', () => {
    toggleShopping(entry.id);
    notify();
  });
  const deleteButton = el('button', { type: 'button', class: 'btn btn-ghost', 'aria-label': `ลบ “${entry.text}”` }, 'ลบ');
  on(deleteButton, 'click', () => {
    removeShopping(entry.id);
    notify();
  });
  return el(
    'li',
    { class: 'item-row', dataset: { id: entry.id } },
    el('span', { class: 'item-name' }, entry.text),
    doneButton,
    deleteButton,
  );
}

export function renderShopping() {
  const entries = listShopping();

  const input = el('input', {
    type: 'text',
    id: 'shopping-input',
    name: 'text',
    autocomplete: 'off',
    placeholder: 'พิมพ์ของที่ต้องซื้อ…',
    'aria-label': 'ของที่ต้องซื้อ',
  });
  const errorEl = el('p', { class: 'field-error', role: 'alert' });
  errorEl.style.display = 'none';
  const addButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'เพิ่ม');
  const add = () => {
    try {
      addShopping(input.value);
    } catch (error) {
      errorEl.textContent = error instanceof ValidationError ? error.message : String(error.message ?? error);
      errorEl.style.display = '';
      return;
    }
    notify();
  };
  on(addButton, 'click', add);
  on(input, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  });

  return el(
    'section',
    { class: 'view view-shopping' },
    el('h2', {}, 'รายการที่ต้องซื้อ'),
    el('div', { class: 'inline-form' }, input, addButton, errorEl),
    entries.length === 0
      ? emptyState({ text: 'ยังไม่มีรายการที่ต้องซื้อ — จดไว้กันลืม' })
      : el(
          'div',
          {},
          el('p', { class: 'view-note' }, `มี ${entries.length} รายการ · สมุดโน้ตอิสระ ไม่ผูกกับสต็อก`),
          el('ul', { class: 'item-list' }, ...entries.map(shoppingRow)),
        ),
  );
}
