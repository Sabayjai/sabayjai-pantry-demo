/**
 * views/item-form.js — จอ #/add (R003 · US-001)
 *
 * ไม่เกิน 3 ขั้นตอน: พิมพ์ชื่อ → เลือกจุดเก็บ → บันทึก (จำนวน/หน่วยมีค่าเริ่มให้แก้)
 * - บังคับ: ชื่อ · จำนวน · หน่วย · จุดเก็บ — ไม่ครบ + ข้อความใต้ช่อง + โฟกัสช่องแรก (ไม่ใช้ alert)
 * - ไม่บังคับ: หมวดหมู่ · วันหมดอายุ · หมายเหตุ
 * - ช่วยกรอกของเดิม: พิมพ์ ≥ 2 ตัวอักษร → เสนอ ≤ 5 รายการ → เลือกแล้วเติมหน่วย/หมวดหมู่/หมายเหตุให้
 * - หน่วยพิมพ์ใหม่ได้ · เพิ่มจุดเก็บ/หมวดหมู่ inline ในหน้านี้ (dropdown แสดงเฉพาะที่ใช้งาน)
 * - สำเร็จ → กลับ #/items + toast (toast อ่านอย่างเดียว · undo อยู่ R005)
 */
import { el, on } from '../ui/dom.js';
import { notify } from '../store.js';
import {
  addCategory,
  addLocation,
  listCategories,
  listLocations,
  listProducts,
  listUnits,
  receiveStock,
} from '../data/db.js';
import { ValidationError } from '../data/validate.js';
import { showToast } from '../ui/components.js';
import { clearItemsFilter } from './items.js';

const CUSTOM_UNIT_VALUE = '__custom__';
const MAX_SUGGESTIONS = 5;

/** สถานะฟอร์มระดับโมดูล (router re-render ทั้งจอเมื่อ notify) — ล้างใหม่ทุกครั้งที่เปิดจอ */
let form = null;

function freshForm() {
  return {
    name: '',
    quantity: '1',
    unit: 'ชิ้น',
    customUnit: '',
    useCustomUnit: false,
    locationId: '',
    categoryId: '',
    expiryDate: '',
    note: '',
    addingLocation: false,
    addingCategory: false,
    newLocationName: '',
    newCategoryName: '',
    inlineError: '',
    errors: {},
  };
}

function unitOptions() {
  return listUnits();
}

function activeLocations() {
  return listLocations({ activeOnly: true }).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
}

function activeCategories() {
  return listCategories({ activeOnly: true }).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
}

/** ของเดิมที่ชื่อมีข้อความที่พิมพ์ (≥ 2 ตัวอักษร) — เรียง ก-ฮ จำกัด 5 */
function suggestionsFor(text) {
  const needle = String(text ?? '').trim();
  if (needle.length < 2) return [];
  return listProducts()
    .filter((product) => product.name.includes(needle))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'))
    .slice(0, MAX_SUGGESTIONS);
}

export function renderItemForm() {
  if (!form) form = freshForm();
  const state = form;
  const errors = state.errors ?? {};

  const locations = activeLocations();
  const categories = activeCategories();
  const units = unitOptions();
  if (!units.includes(state.unit) && !state.useCustomUnit) state.unit = units[0] ?? 'ชิ้น';

  // ชื่อ + รายการเสนอของเดิม (อัปเดตรายการแบบตรง ๆ ไม่ re-render เพื่อไม่ให้ช่องกรอกเสียโฟกัส)
  const nameInput = el('input', {
    type: 'text',
    id: 'add-name',
    name: 'name',
    maxlength: '60',
    autocomplete: 'off',
    placeholder: 'เช่น นมสด 1 ลิตร',
    value: state.name,
  });
  const suggestBox = el('div', { class: 'suggest', 'aria-label': 'ของเดิมที่เคยบันทึก' });
  const renderSuggestions = () => {
    suggestBox.replaceChildren(
      ...suggestionsFor(nameInput.value).map((product) => {
        const button = el('button', { type: 'button', class: 'chip' }, `${product.name} · ${product.unit}`);
        on(button, 'click', () => {
          state.name = product.name;
          state.unit = product.unit;
          state.useCustomUnit = false;
          state.categoryId = product.categoryId ?? '';
          state.note = product.note ?? '';
          state.errors = {};
          notify();
          queueMicrotask(() => document.querySelector('#add-quantity')?.focus?.());
        });
        return button;
      }),
    );
  };
  on(nameInput, 'input', () => {
    state.name = nameInput.value;
    renderSuggestions();
  });
  renderSuggestions();

  // จำนวน
  const quantityInput = el('input', {
    type: 'number',
    id: 'add-quantity',
    name: 'quantity',
    min: '1',
    step: '1',
    value: state.quantity,
  });
  on(quantityInput, 'input', () => {
    state.quantity = quantityInput.value;
  });

  // หน่วย (สำเร็จรูป + พิมพ์ใหม่)
  const unitSelect = el(
    'select',
    { id: 'add-unit', name: 'unit' },
    ...units.map((unit) => el('option', { value: unit, selected: !state.useCustomUnit && state.unit === unit ? 'true' : null }, unit)),
    el('option', { value: CUSTOM_UNIT_VALUE, selected: state.useCustomUnit ? 'true' : null }, 'พิมพ์หน่วยใหม่…'),
  );
  const customUnitInput = el('input', {
    type: 'text',
    id: 'add-unit-custom',
    name: 'customUnit',
    maxlength: '20',
    autocomplete: 'off',
    placeholder: 'เช่น กระสอบ',
    value: state.customUnit,
  });
  on(customUnitInput, 'input', () => {
    state.customUnit = customUnitInput.value;
  });
  on(unitSelect, 'change', () => {
    state.useCustomUnit = unitSelect.value === CUSTOM_UNIT_VALUE;
    if (!state.useCustomUnit) state.unit = unitSelect.value;
    notify();
  });

  // จุดเก็บ (เฉพาะที่ใช้งาน) + เพิ่ม inline
  const locationSelect = el(
    'select',
    { id: 'add-location', name: 'locationId' },
    el('option', { value: '' }, '— เลือกจุดเก็บ —'),
    ...locations.map((location) =>
      el('option', { value: location.id, selected: state.locationId === location.id ? 'true' : null }, location.name),
    ),
  );
  on(locationSelect, 'change', () => {
    state.locationId = locationSelect.value;
  });
  const locationAddButton = el('button', { type: 'button', class: 'btn btn-ghost' }, '＋ เพิ่มจุดเก็บใหม่');
  on(locationAddButton, 'click', () => {
    state.addingLocation = !state.addingLocation;
    state.inlineError = '';
    notify();
  });

  // หมวดหมู่ (เฉพาะที่ใช้งาน) + เพิ่ม inline
  const categorySelect = el(
    'select',
    { id: 'add-category', name: 'categoryId' },
    el('option', { value: '' }, '— ไม่ระบุหมวดหมู่ —'),
    ...categories.map((category) =>
      el('option', { value: category.id, selected: state.categoryId === category.id ? 'true' : null }, category.name),
    ),
  );
  on(categorySelect, 'change', () => {
    state.categoryId = categorySelect.value;
  });
  const categoryAddButton = el('button', { type: 'button', class: 'btn btn-ghost' }, '＋ เพิ่มหมวดใหม่');
  on(categoryAddButton, 'click', () => {
    state.addingCategory = !state.addingCategory;
    state.inlineError = '';
    notify();
  });

  // วันหมดอายุ + หมายเหตุ
  const expiryInput = el('input', { type: 'date', id: 'add-expiry', name: 'expiryDate', value: state.expiryDate });
  on(expiryInput, 'input', () => {
    state.expiryDate = expiryInput.value;
  });
  const noteInput = el('textarea', {
    id: 'add-note',
    name: 'note',
    rows: '2',
    maxlength: '200',
    placeholder: 'เช่น ของยาย',
  }, state.note);
  on(noteInput, 'input', () => {
    state.note = noteInput.value;
  });

  const saveButton = el('button', { type: 'button', class: 'btn btn-primary' }, 'บันทึก');
  const cancelButton = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
  on(cancelButton, 'click', () => {
    form = freshForm();
    globalThis.location.hash = '#/items';
  });
  on(saveButton, 'click', () => {
    // เก็บค่าล่าสุดจากช่องกรอกก่อนตรวจ (ผู้ใช้อาจกดบันทึกทันทีหลังพิมพ์)
    state.name = nameInput.value;
    state.quantity = quantityInput.value;
    if (state.useCustomUnit) state.customUnit = customUnitInput.value;
    else state.unit = unitSelect.value;
    state.locationId = locationSelect.value;
    state.categoryId = categorySelect.value;
    state.expiryDate = expiryInput.value;
    state.note = noteInput.value;

    const unit = state.useCustomUnit ? String(state.customUnit ?? '').trim() : String(state.unit ?? '').trim();
    try {
      const { product } = receiveStock({
        name: state.name,
        quantity: Number(state.quantity),
        unit,
        locationId: state.locationId,
        categoryId: state.categoryId || null,
        expiryDate: state.expiryDate || null,
        note: state.note,
      });
      form = freshForm();
      clearItemsFilter();
      globalThis.location.hash = '#/items';
      showToast(`เพิ่ม “${product.name}” แล้ว`);
    } catch (error) {
      state.errors = error instanceof ValidationError ? { ...error.errors } : { name: String(error.message ?? error) };
      notify();
      queueMicrotask(() => {
        const keyToId = { name: '#add-name', quantity: '#add-quantity', unit: '#add-unit-custom', locationId: '#add-location', categoryId: '#add-category', expiryDate: '#add-expiry', note: '#add-note' };
        if (!state.useCustomUnit) keyToId.unit = '#add-unit';
        const order = ['name', 'quantity', 'unit', 'locationId', 'categoryId', 'expiryDate', 'note'];
        const firstKey = order.find((key) => state.errors[key]);
        document.querySelector((firstKey && keyToId[firstKey]) || '#add-name')?.focus?.();
      });
    }
  });

  const field = (labelText, required, inputEl, errorKey, extra = null) =>
    el(
      'div',
      { class: 'field' },
      el('label', { for: inputEl.getAttribute('id') }, labelText, required ? el('span', { class: 'required' }, ' *') : null),
      inputEl,
      extra,
      errors[errorKey] ? el('p', { class: 'field-error', role: 'alert' }, errors[errorKey]) : null,
    );

  return el(
    'section',
    { class: 'view view-add' },
    el('h2', {}, 'เพิ่มของ'),
    el(
      'form',
      { class: 'form', novalidate: 'true' },
      field('ชื่อของ', true, nameInput, 'name', suggestBox),
      el(
        'div',
        { class: 'field-row' },
        field('จำนวน', true, quantityInput, 'quantity'),
        field('หน่วย', true, unitSelect, 'unit', state.useCustomUnit ? customUnitInput : null),
      ),
      field('จุดเก็บ', true, locationSelect, 'locationId', locationAddButton),
      state.addingLocation ? inlineAdd('จุดเก็บใหม่', state.newLocationName, 'location') : null,
      field('หมวดหมู่ (ไม่บังคับ)', false, categorySelect, 'categoryId', categoryAddButton),
      state.addingCategory ? inlineAdd('หมวดหมู่ใหม่', state.newCategoryName, 'category') : null,
      state.inlineError ? el('p', { class: 'field-error', role: 'alert' }, state.inlineError) : null,
      field('วันหมดอายุ (ไม่บังคับ)', false, expiryInput, 'expiryDate'),
      field('หมายเหตุ (ไม่บังคับ)', false, noteInput, 'note'),
      el('div', { class: 'form-actions' }, cancelButton, saveButton),
    ),
  );

  /** ฟอร์มย่อยเพิ่มจุดเก็บ/หมวดหมู่ inline — สำเร็จแล้วเลือกค่าใหม่ให้ทันที */
  function inlineAdd(label, currentValue, kind) {
    const input = el('input', {
      type: 'text',
      maxlength: '60',
      autocomplete: 'off',
      placeholder: label,
      value: currentValue,
      'aria-label': label,
    });
    const save = el('button', { type: 'button', class: 'btn btn-primary' }, 'เพิ่ม');
    const cancel = el('button', { type: 'button', class: 'btn btn-ghost' }, 'ยกเลิก');
    const submitInline = () => {
      try {
        if (kind === 'location') {
          const created = addLocation(input.value);
          state.locationId = created.id;
          state.addingLocation = false;
        } else {
          const created = addCategory(input.value);
          state.categoryId = created.id;
          state.addingCategory = false;
        }
        state.newLocationName = '';
        state.newCategoryName = '';
        state.inlineError = '';
        notify();
      } catch (error) {
        state.inlineError =
          error instanceof ValidationError ? (error.errors.name ?? error.message) : String(error.message ?? error);
        notify();
      }
    };
    on(save, 'click', submitInline);
    on(input, 'input', () => {
      if (kind === 'location') state.newLocationName = input.value;
      else state.newCategoryName = input.value;
    });
    on(input, 'keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitInline();
      }
    });
    on(cancel, 'click', () => {
      state.addingLocation = false;
      state.addingCategory = false;
      state.inlineError = '';
      notify();
    });
    const row = el('div', { class: 'inline-form' }, el('label', {}, label), input, el('div', { class: 'form-row' }, save, cancel));
    queueMicrotask(() => input.focus?.());
    return row;
  }
}
