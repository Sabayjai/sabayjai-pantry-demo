/**
 * views/shopping.js — จอ #/shopping (R007 · US-008)
 *
 * สมุดโน้ตอิสระ (OQ-13 · OQ-15): ข้อความช่องเดียว ไม่มีจำนวน/หมวดหมู่/จุดเก็บ ·
 * เพิ่มเอง · ติ๊ก "ซื้อแล้ว" แล้วหาย · ลบได้ · ไม่แตะสต็อก
 * เลือกจากของเดิม (Product) ได้เป็นทางลัดการพิมพ์ — แค่กรอกข้อความให้ ไม่ผูกสต็อก
 */
import { el, on } from '../ui/dom.js';
import { notify } from '../store.js';
import { addShopping, listProducts, listShopping, toggleShopping, removeShopping } from '../data/db.js';
import { ValidationError } from '../data/validate.js';
import { emptyState } from '../ui/components.js';

function shoppingRow(entry) {
  const doneButton = el('button', { type: 'button', class: 'btn btn-primary', 'aria-label': `ซื้อ “${entry.text}” แล้ว` }, '✓ ซื้อแล้ว');
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
    'article',
    { class: 'card', dataset: { id: entry.id } },
    el('div', { class: 'card-top' }, el('h3', { class: 'card-name' }, entry.text)),
    el('div', { class: 'card-actions' }, doneButton, deleteButton),
  );
}

const MAX_SUGGESTIONS = 5;

/** ของเดิมที่ชื่อมีข้อความที่พิมพ์ (≥ 2 ตัวอักษร) — เรียง ก-ฮ จำกัด 5 (แบบเดียวกับจอเพิ่มของ) */
function suggestionsFor(text) {
  const needle = String(text ?? '').trim();
  if (needle.length < 2) return [];
  return listProducts()
    .filter((product) => product.name.includes(needle))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'))
    .slice(0, MAX_SUGGESTIONS);
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
  // ทางลัด: เลือกชื่อจากของเดิมที่เคยบันทึก (แค่กรอกข้อความให้ ไม่แตะสต็อก · ซ่อนชื่อที่มีในรายการแล้ว)
  const suggestBox = el('div', { class: 'suggest', 'aria-label': 'เลือกจากของที่เคยมี' });
  const renderSuggestions = () => {
    const existing = new Set(entries.map((entry) => entry.text));
    suggestBox.replaceChildren(
      ...suggestionsFor(input.value)
        .filter((product) => !existing.has(product.name))
        .map((product) => {
          const button = el('button', { type: 'button', class: 'chip' }, product.name);
          on(button, 'click', () => {
            input.value = product.name;
            errorEl.style.display = 'none';
            renderSuggestions();
            input.focus?.();
          });
          return button;
        }),
    );
  };
  on(input, 'input', renderSuggestions);
  renderSuggestions();
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
    el('div', { class: 'inline-form' }, input, suggestBox, addButton, errorEl),
    entries.length === 0
      ? emptyState({ text: 'ยังไม่มีรายการที่ต้องซื้อ — จดไว้กันลืม' })
      : el(
          'div',
          {},
          el('p', { class: 'view-note' }, `มี ${entries.length} รายการ · สมุดโน้ตอิสระ ไม่ผูกกับสต็อก`),
          el('div', { class: 'cards' }, ...entries.map(shoppingRow)),
        ),
  );
}
