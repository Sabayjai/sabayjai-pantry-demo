/**
 * data/db.js — คำสั่ง (commands) ของชั้นข้อมูล ตามดีไซน์ข้อ 3.3 · สคีมา v2
 *
 * กฎของไฟล์นี้:
 * - เป็นที่เดียวที่แก้ state ในหน่วยความจำ
 * - ทุกคำสั่งที่แก้ข้อมูลต้องจบด้วย commit() = saveState(state) + notify()
 * - view ห้ามแตะ localStorage เอง ต้องเรียกคำสั่งในไฟล์นี้
 *
 * สคีมา v2: Product (ชื่อ+หน่วย ไม่มีจำนวน) · Lot (จุดเก็บ+วันหมดอายุ+ยอด) · Movement (บันทึกทุกการเคลื่อนไหว)
 * "ทยอยใช้" = หักยอดล็อตทีละส่วนแบบ FEFO (ล็อตหมดอายุใกล้สุดก่อน)
 * ล็อตยอด 0 จำ "ยอดก่อนหมด" ไว้ที่ `usedUpQuantity` (D10 · คำตอบ ข.) — คำสั่งทุกตัวที่แตะยอดต้องอัปเดตฟิลด์นี้
 */
import { loadState, readBackupInfo, restoreBackup as restoreStorageBackup, saveState, resetToSeed as resetStorageToSeed } from './storage.js';
import { bindState, notify } from '../store.js';
import {
  ReferencedError,
  ValidationError,
  validateName,
  validateProductInput,
  validateReceiveInput,
} from './validate.js';
import { pickLotsForConsumption, usedUpQuantityFromMovements } from './selectors.js';

/** state ในหน่วยความจำ — โหลดครั้งเดียวตอนบูต แล้วเขียนกลับเฉพาะเมื่อมีการแก้ */
let state = loadState();

bindState(() => state);

function commit() {
  state.meta = { ...state.meta, updatedAt: new Date().toISOString() };
  saveState(state);
  notify();
  return state;
}

/** รหัสใหม่: ใช้ crypto.randomUUID ถ้ามี ไม่งั้นถอยไปใช้รหัสจากเวลา (ตามดีไซน์ข้อ 2.1) */
function newId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireProduct(id) {
  const product = state.products.find((entry) => entry.id === id);
  if (!product) throw new Error('ไม่พบสินค้านี้');
  return product;
}

function requireLot(id) {
  const lot = state.lots.find((entry) => entry.id === id);
  if (!lot) throw new Error('ไม่พบล็อตนี้');
  return lot;
}

function pushMovement(lot, type, delta, at, note = null) {
  const movement = {
    id: newId('mv'),
    lotId: lot.id,
    type,
    delta,
    balanceAfter: Number(lot.quantity) || 0,
    at,
    note,
  };
  state.movements.push(movement);
  return movement;
}

/**
 * คุม `usedUpQuantity` (D10 · คำตอบ ข.) — ยอดก่อนที่ล็อตจะหมด
 * - ล็อตกลับมามีของ → ล้างเป็น 0 (ของที่หมดครั้งก่อนไม่นับแล้ว)
 * - ล็อตเพิ่งหมดในจังหวะนี้ → จำยอดก่อนหักไว้
 * - ยอดเป็น 0 อยู่แล้วและไม่มีการเปลี่ยน → คงค่าที่จำไว้
 * @param {object} lot ล็อตที่เพิ่งถูกแก้ยอด
 * @param {number} quantityBefore ยอดก่อนการแก้ครั้งนี้
 */
function syncUsedUpQuantity(lot, quantityBefore) {
  const quantity = Math.max(0, Number(lot.quantity) || 0);
  if (quantity > 0) {
    lot.usedUpQuantity = 0;
  } else if (Number(quantityBefore) > 0) {
    lot.usedUpQuantity = Number(quantityBefore);
  } else {
    lot.usedUpQuantity = Math.max(0, Number(lot.usedUpQuantity) || 0);
  }
  return lot.usedUpQuantity;
}

/* --------------------------------------------------------------- Products */

export function listProducts() {
  return state.products.slice();
}

export function getProduct(id) {
  return state.products.find((product) => product.id === id) ?? null;
}

export function findProductByNameUnit(name, unit) {
  const cleanName = String(name ?? '').trim();
  const cleanUnit = String(unit ?? '').trim();
  return state.products.find((product) => product.name === cleanName && product.unit === cleanUnit) ?? null;
}

/** หา (ชื่อ+หน่วย) ที่มีอยู่แล้ว หรือสร้างใหม่ — ไม่ให้สินค้าซ้ำ (จุดประสงค์หลักของสคีมา v2) */
export function ensureProduct(input = {}) {
  const result = validateProductInput(input, { categories: state.categories });
  if (!result.ok) throw new ValidationError(result.errors);

  const unit = ensureUnitInternal(input.unit);
  const existing = findProductByNameUnit(input.name, unit);
  if (existing) return existing;

  const now = new Date().toISOString();
  const product = {
    id: newId('prod'),
    name: String(input.name).trim(),
    unit,
    categoryId: input.categoryId ?? null,
    note: String(input.note ?? '').trim(),
    createdAt: now,
    updatedAt: now,
  };
  state.products.push(product);
  commit();
  return product;
}

export function updateProduct(id, patch = {}) {
  const product = requireProduct(id);
  const merged = { ...product, ...patch };
  const result = validateProductInput(merged, { categories: state.categories });
  if (!result.ok) throw new ValidationError(result.errors);

  const name = String(merged.name).trim();
  const unit = ensureUnitInternal(merged.unit);
  const duplicate = state.products.find(
    (entry) => entry.id !== id && entry.name === name && entry.unit === unit,
  );
  if (duplicate) throw new ValidationError({ name: 'มีสินค้าชื่อ+หน่วยนี้อยู่แล้ว' });

  Object.assign(product, {
    name,
    unit,
    categoryId: merged.categoryId ?? null,
    note: String(merged.note ?? '').trim(),
    updatedAt: new Date().toISOString(),
  });
  commit();
  return product;
}

/** จำนวนล็อตที่ยังมีของของสินค้านี้ (ใช้ตัดสินว่าจะลบสินค้าได้ไหม) */
export function countActiveLotsInProduct(id) {
  return state.lots.filter((lot) => lot.productId === id && Number(lot.quantity) > 0).length;
}

/** ลบสินค้า — ห้ามลบถ้ายังมีของค้าง · ลบได้จะลบล็อต + ประวัติของสินค้านั้นไปด้วย */
export function deleteProduct(id) {
  const product = requireProduct(id);
  const active = countActiveLotsInProduct(id);
  if (active > 0) throw new ReferencedError('product', active);

  const lotIds = new Set(state.lots.filter((lot) => lot.productId === id).map((lot) => lot.id));
  state.lots = state.lots.filter((lot) => lot.productId !== id);
  state.movements = state.movements.filter((movement) => !lotIds.has(movement.lotId));
  state.products = state.products.filter((entry) => entry.id !== id);
  commit();
  return product;
}

/* ------------------------------------------------------------------- Lots */

/** ล็อตทั้งหมด หรือกรองด้วย { productId, locationId, activeOnly } */
export function listLots(filter = {}) {
  const { productId, locationId, activeOnly } = filter;
  return state.lots.filter((lot) => {
    if (productId && lot.productId !== productId) return false;
    if (locationId && lot.locationId !== locationId) return false;
    if (activeOnly && !(Number(lot.quantity) > 0)) return false;
    return true;
  });
}

export function getLot(id) {
  return state.lots.find((lot) => lot.id === id) ?? null;
}

/**
 * รับของเข้า (US-001) — หาสินค้าด้วย (ชื่อ+หน่วย) แล้วหาล็อตที่ตรง (สินค้า + จุดเก็บ + วันหมดอายุ)
 * ตรงกับล็อตเดิม → บวกเข้าล็อตนั้น (ล็อตเดียวกัน = batch เดียวกัน) · ไม่ตรง → สร้างล็อตใหม่
 * @returns {{ product, lot }}
 */
export function receiveStock(input = {}) {
  const result = validateReceiveInput(input, { locations: state.locations, categories: state.categories });
  if (!result.ok) throw new ValidationError(result.errors);

  const now = new Date().toISOString();
  const unit = ensureUnitInternal(input.unit);
  const name = String(input.name).trim();

  let product = findProductByNameUnit(name, unit);
  if (!product) {
    product = {
      id: newId('prod'),
      name,
      unit,
      categoryId: input.categoryId ?? null,
      note: String(input.note ?? '').trim(),
      createdAt: now,
      updatedAt: now,
    };
    state.products.push(product);
  }

  const locationId = input.locationId;
  const expiryDate = input.expiryDate ? String(input.expiryDate).trim() : null;
  const quantity = Number(input.quantity);

  let lot = state.lots.find(
    (entry) =>
      entry.productId === product.id &&
      entry.locationId === locationId &&
      (entry.expiryDate ?? null) === (expiryDate ?? null),
  );

  if (lot) {
    const before = Number(lot.quantity) || 0;
    lot.quantity = before + quantity;
    syncUsedUpQuantity(lot, before);
    lot.updatedAt = now;
  } else {
    lot = {
      id: newId('lot'),
      productId: product.id,
      locationId,
      quantity,
      usedUpQuantity: 0, // ล็อตใหม่ = ยังไม่เคยหมด
      expiryDate,
      createdAt: now,
      updatedAt: now,
    };
    state.lots.push(lot);
  }

  pushMovement(lot, 'in', quantity, now);
  commit();
  return { product, lot };
}

/**
 * หักของออกจากสินค้าแบบ FEFO (ทยอยใช้) — ล็อตหมดอายุใกล้สุดถูกหักก่อน
 * @param {string} productId
 * @param {number} quantity
 * @param {{ type?: 'out' | 'discard' }} opts
 * @returns {Movement[]} movement ที่เกิดขึ้น (เรียงตามล็อตที่ถูกหัก)
 */
export function consumeProduct(productId, quantity, opts = {}) {
  const type = opts.type === 'discard' ? 'discard' : 'out';
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ValidationError({ quantity: 'จำนวนต้องมากกว่า 0' });

  const product = requireProduct(productId);
  const productLots = state.lots.filter((lot) => lot.productId === productId);
  const available = productLots.reduce((sum, lot) => sum + Math.max(0, Number(lot.quantity) || 0), 0);
  if (available < qty) throw new ValidationError({ quantity: `มีของไม่พอ (เหลือ ${available})` });

  const now = new Date().toISOString();
  const created = [];
  for (const { lot, take } of pickLotsForConsumption(productLots, qty)) {
    const before = Number(lot.quantity) || 0;
    lot.quantity = before - take;
    syncUsedUpQuantity(lot, before);
    lot.updatedAt = now;
    created.push(pushMovement(lot, type, -take, now, opts.note ?? null));
  }
  commit();
  return created;
}

/** ทิ้งของ (FEFO เช่นกัน แต่แยกประวัติว่า "ทิ้ง" ไม่ใช่ "ใช้") */
export function discardProduct(productId, quantity, opts = {}) {
  return consumeProduct(productId, quantity, { ...opts, type: 'discard' });
}

/** ตั้งยอดล็อตตรง ๆ (นับสต็อกจริง) — ติดลบไม่ได้ · 0 = ใช้หมดแล้ว */
export function setLotQuantity(lotId, quantity) {
  const lot = requireLot(lotId);
  const before = Number(lot.quantity) || 0;
  const next = Math.max(0, Number(quantity) || 0);
  const delta = next - before;
  const now = new Date().toISOString();
  lot.quantity = next;
  syncUsedUpQuantity(lot, before);
  lot.updatedAt = now;
  if (delta !== 0) pushMovement(lot, 'adjust', delta, now);
  commit();
  return lot;
}

/** นำล็อตที่ใช้หมดแล้วกลับเข้ารายการ พร้อมจำนวนใหม่ (US-007) */
export function restoreLot(lotId, quantity) {
  const lot = requireLot(lotId);
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ValidationError({ quantity: 'จำนวนต้องมากกว่า 0' });
  if (lot.locationId) {
    const location = state.locations.find((entry) => entry.id === lot.locationId);
    if (!location) throw new ValidationError({ locationId: 'จุดเก็บเดิมถูกลบไปแล้ว — เลือกจุดเก็บใหม่' });
    if (location.isActive === false) {
      throw new ValidationError({ locationId: 'จุดเก็บนี้พักใช้อยู่ — เปิดใช้ก่อนจึงนำกลับได้' });
    }
  }

  const now = new Date().toISOString();
  const before = Number(lot.quantity) || 0;
  lot.quantity = before + qty;
  syncUsedUpQuantity(lot, before);
  lot.updatedAt = now;
  pushMovement(lot, 'restore', qty, now);
  commit();
  return lot;
}

/**
 * ย้ายของไปจุดเก็บอื่น (US-009 · OQ-R16 + คำตัดสิน 2026-10-17: ย้ายบางส่วนได้)
 * - ไม่ระบุ quantity = ย้ายทั้งล็อต → ยอดไม่เปลี่ยน → ไม่เขียน movement (อัปเดต updatedAt เท่านั้น)
 * - ระบุ quantity (< ยอด) = แยกบางส่วน → ล็อตเดิมลด + ล็อตปลายทางเพิ่ม (หา batch เดียวกัน: สินค้า+จุดเก็บ+วันหมดอายุ)
 *   พร้อม movement `out`/`in` คู่กัน (ยอดเปลี่ยนจึงต้องมีประวัติ — ไม่เหมือนย้ายทั้งล็อต)
 * - ปลายทางต้องมีอยู่จริงและใช้งานอยู่ (จุดพักใช้เลือกไม่ได้) · ล็อตยอด 0 ย้ายได้ทั้งล็อต (ประวัติอยู่ครบ)
 */
export function moveLot(lotId, locationId, quantity = null) {
  const lot = requireLot(lotId);
  const location = state.locations.find((entry) => entry.id === locationId);
  if (!location) throw new ValidationError({ locationId: 'ไม่พบจุดเก็บปลายทาง' });
  if (location.isActive === false) throw new ValidationError({ locationId: 'จุดเก็บนี้พักใช้อยู่ — เลือกจุดอื่น' });
  if (lot.locationId === locationId) return lot;

  const now = new Date().toISOString();
  const available = Math.max(0, Number(lot.quantity) || 0);
  if (quantity === null || quantity === undefined || quantity === '') {
    lot.locationId = locationId;
    lot.updatedAt = now;
    commit();
    return lot;
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ValidationError({ quantity: 'จำนวนที่ย้ายต้องมากกว่า 0' });
  if (qty > available) throw new ValidationError({ quantity: `ย้ายได้ไม่เกินที่มี (${available})` });
  if (qty === available) {
    lot.locationId = locationId;
    lot.updatedAt = now;
    commit();
    return lot;
  }

  lot.quantity = available - qty;
  syncUsedUpQuantity(lot, available);
  lot.updatedAt = now;
  pushMovement(lot, 'out', -qty, now, `ย้ายไป${location.name}`);

  let target = state.lots.find(
    (entry) =>
      entry.productId === lot.productId &&
      entry.locationId === locationId &&
      (entry.expiryDate ?? null) === (lot.expiryDate ?? null),
  );
  if (target) {
    const before = Math.max(0, Number(target.quantity) || 0);
    target.quantity = before + qty;
    syncUsedUpQuantity(target, before);
    target.updatedAt = now;
    pushMovement(target, 'in', qty, now, `ย้ายมาจาก${state.locations.find((entry) => entry.id === lot.locationId)?.name ?? ''}`);
  } else {
    target = {
      id: newId('lot'),
      productId: lot.productId,
      locationId,
      quantity: qty,
      usedUpQuantity: 0,
      expiryDate: lot.expiryDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    state.lots.push(target);
    pushMovement(target, 'in', qty, now, `ย้ายมาจาก${state.locations.find((entry) => entry.id === lot.locationId)?.name ?? ''}`);
  }
  commit();
  return target;
}

/** ล็อตที่ใช้หมดแล้ว (ยอด 0) พร้อมสินค้าและวันที่ใช้หมด — แทนตาราง usedUp เดิม */
export function listUsedUpLots() {
  const productById = new Map(state.products.map((product) => [product.id, product]));
  return state.lots
    .filter((lot) => !(Number(lot.quantity) > 0))
    .map((lot) => {
      let lastAt = lot.updatedAt;
      for (const movement of state.movements) {
        if (movement.lotId === lot.id) lastAt = movement.at;
      }
      return {
        ...lot,
        usedUpQuantity: Math.max(0, Number(lot.usedUpQuantity) || 0), // ยอดก่อนหมด (D10 · ข.)
        product: productById.get(lot.productId) ?? null,
        usedUpAt: lastAt,
      };
    })
    .sort((a, b) => String(b.usedUpAt).localeCompare(String(a.usedUpAt)));
}

/** ประวัติการเคลื่อนไหว — กรองด้วย { lotId, productId } */
export function listMovements(filter = {}) {
  const { lotId, productId } = filter;
  const lotIds = productId
    ? new Set(state.lots.filter((lot) => lot.productId === productId).map((lot) => lot.id))
    : null;
  return state.movements.filter((movement) => {
    if (lotId && movement.lotId !== lotId) return false;
    if (lotIds && !lotIds.has(movement.lotId)) return false;
    return true;
  });
}

/* -------------------------------------------------------------- Locations */

/** จุดเก็บทั้งหมด หรือกรอง { activeOnly: true } = เฉพาะที่ใช้งาน (ใช้ใน dropdown รับของใหม่) */
export function listLocations(filter = {}) {
  if (filter?.activeOnly) return state.locations.filter((location) => location.isActive !== false);
  return state.locations.slice();
}

/** นับล็อตที่ยังมีของอยู่ในจุดเก็บนี้ (US-004) */
export function countLotsInLocation(id) {
  return state.lots.filter((lot) => lot.locationId === id && Number(lot.quantity) > 0).length;
}

export function addLocation(name) {
  const result = validateName(name);
  if (!result.ok) throw new ValidationError(result.errors);
  const value = String(name).trim();
  if (state.locations.some((location) => location.name === value)) {
    throw new ValidationError({ name: 'มีจุดเก็บชื่อนี้อยู่แล้ว' });
  }

  const location = { id: newId('loc'), name: value, isActive: true, createdAt: new Date().toISOString() };
  state.locations.push(location);
  commit();
  return location;
}

export function renameLocation(id, name) {
  const location = state.locations.find((entry) => entry.id === id);
  if (!location) throw new Error('ไม่พบจุดเก็บนี้');

  const result = validateName(name);
  if (!result.ok) throw new ValidationError(result.errors);
  const value = String(name).trim();
  if (state.locations.some((entry) => entry.id !== id && entry.name === value)) {
    throw new ValidationError({ name: 'มีจุดเก็บชื่อนี้อยู่แล้ว' });
  }

  location.name = value;
  commit();
  return location;
}

/** พักใช้/เปิดใช้จุดเก็บ (R002 · แทนลบถาวรในจอ) — พักได้แม้มีของค้าง ของเดิม/ประวัติอยู่ครบ */
export function setLocationActive(id, active) {
  const location = state.locations.find((entry) => entry.id === id);
  if (!location) throw new Error('ไม่พบจุดเก็บนี้');
  location.isActive = active !== false;
  commit();
  return location;
}

/** ลบจุดเก็บ — ห้ามลบถ้ายังมีของอ้างอยู่ (US-004) · R002 ไม่เรียกจากจอ (คงไว้ให้เทสต์/ประวัติ) */
export function deleteLocation(id) {
  if (!state.locations.some((location) => location.id === id)) throw new Error('ไม่พบจุดเก็บนี้');
  const count = countLotsInLocation(id);
  if (count > 0) throw new ReferencedError('location', count);

  state.locations = state.locations.filter((location) => location.id !== id);
  commit();
  return true;
}

/* ------------------------------------------------------------- Categories */

/** หมวดหมู่ทั้งหมด หรือกรอง { activeOnly: true } = เฉพาะที่ใช้งาน */
export function listCategories(filter = {}) {
  if (filter?.activeOnly) return state.categories.filter((category) => category.isActive !== false);
  return state.categories.slice();
}

/** นับสินค้าที่อ้างหมวดหมู่นี้ */
export function countProductsInCategory(id) {
  return state.products.filter((product) => product.categoryId === id).length;
}

export function addCategory(name) {
  const result = validateName(name);
  if (!result.ok) throw new ValidationError(result.errors);
  const value = String(name).trim();
  if (state.categories.some((category) => category.name === value)) {
    throw new ValidationError({ name: 'มีหมวดหมู่นี้อยู่แล้ว' });
  }

  const category = { id: newId('cat'), name: value, isActive: true, createdAt: new Date().toISOString() };
  state.categories.push(category);
  commit();
  return category;
}

export function renameCategory(id, name) {
  const category = state.categories.find((entry) => entry.id === id);
  if (!category) throw new Error('ไม่พบหมวดหมู่นี้');

  const result = validateName(name);
  if (!result.ok) throw new ValidationError(result.errors);
  const value = String(name).trim();
  if (state.categories.some((entry) => entry.id !== id && entry.name === value)) {
    throw new ValidationError({ name: 'มีหมวดหมู่นี้อยู่แล้ว' });
  }

  category.name = value;
  commit();
  return category;
}

/** พักใช้/เปิดใช้หมวดหมู่ (R002 · แทนลบถาวรในจอ) */
export function setCategoryActive(id, active) {
  const category = state.categories.find((entry) => entry.id === id);
  if (!category) throw new Error('ไม่พบหมวดหมู่นี้');
  category.isActive = active !== false;
  commit();
  return category;
}

/** ลบหมวดหมู่ — ห้ามลบถ้ายังมีสินค้าอ้างอยู่ (US-004 ใช้กฎร่วมกับจุดเก็บ) · R002 ไม่เรียกจากจอ */
export function deleteCategory(id) {
  if (!state.categories.some((category) => category.id === id)) throw new Error('ไม่พบหมวดหมู่นี้');
  const count = countProductsInCategory(id);
  if (count > 0) throw new ReferencedError('category', count);

  state.categories = state.categories.filter((category) => category.id !== id);
  commit();
  return true;
}

/* ------------------------------------------------------------------ Units */

export function listUnits() {
  return state.units.slice();
}

function ensureUnitInternal(name) {
  const value = String(name ?? '').trim();
  if (!value) throw new ValidationError({ unit: 'เลือกหรือพิมพ์หน่วย' });
  if (!state.units.includes(value)) state.units.push(value);
  return value;
}

/** มีอยู่แล้วคืนเดิม · ใหม่ → เพิ่มเข้า list + commit */
export function ensureUnit(name) {
  const before = state.units.length;
  const value = ensureUnitInternal(name);
  if (state.units.length !== before) commit();
  return value;
}

/* --------------------------------------------------------------- Shopping */

export function listShopping() {
  return state.shopping.slice();
}

export function addShopping(text) {
  const value = String(text ?? '').trim();
  if (!value) throw new ValidationError({ text: 'พิมพ์รายการที่ต้องซื้อ' });

  const entry = { id: newId('shop'), text: value, createdAt: new Date().toISOString() };
  state.shopping.push(entry);
  commit();
  return entry;
}

/** ติ๊ก "ซื้อแล้ว" → ลบออกจากรายการ (US-008) */
export function toggleShopping(id) {
  return removeShopping(id);
}

export function removeShopping(id) {
  const index = state.shopping.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error('ไม่พบรายการที่ต้องซื้อนี้');
  const [removed] = state.shopping.splice(index, 1);
  commit();
  return removed;
}

/* ------------------------------------------- จำนวนเดิมของของที่ใช้หมดแล้ว (D10) */

/**
 * คำนวณยอด "จำนวนเดิม" ของล็อตใหม่จากประวัติ movement (D10 · คำตอบ ข.)
 * ทางออกเมื่อค่าที่เก็บไว้กับประวัติไม่ตรงกัน · ไม่แตะยอดคงเหลือของล็อตเลย
 * @param {{ lotId?: string }} [filter] ระบุ lotId = คำนวณเฉพาะล็อตนั้น
 * @returns {{ checked: number, fixed: number, skipped: number, changes: { lotId: string, before: number, after: number }[] }}
 */
export function recalculateUsedUpQuantities(filter = {}) {
  const { lotId } = filter;
  const lots = lotId ? [requireLot(lotId)] : state.lots;

  const historyByLot = new Map();
  for (const movement of state.movements) {
    if (lotId && movement.lotId !== lotId) continue;
    if (!historyByLot.has(movement.lotId)) historyByLot.set(movement.lotId, []);
    historyByLot.get(movement.lotId).push(movement);
  }

  const changes = [];
  let skipped = 0;
  for (const lot of lots) {
    const history = historyByLot.get(lot.id);
    if (!history || history.length === 0) {
      skipped += 1; // ไม่มีประวัติให้เทียบ → เก็บค่าที่จำไว้ไว้ก่อน ไม่ลบทิ้ง
      continue;
    }
    const before = Math.max(0, Number(lot.usedUpQuantity) || 0);
    const after = usedUpQuantityFromMovements(history);
    if (before === after) continue;
    lot.usedUpQuantity = after;
    changes.push({ lotId: lot.id, before, after });
  }

  if (changes.length) commit();
  return { checked: lots.length, fixed: changes.length, skipped, changes };
}

/* ------------------------------------------------- ย้อนกลับ 1 ขั้น (R005 · US-003) */

/**
 * คืน state ทั้งก้อนจากภาพจำ (สแนปช็อตที่ undo.js เก็บไว้ก่อนคำสั่งเปลี่ยนยอด)
 * ใช้ย้อนกลับขั้นเดียวอันล่าสุดเท่านั้น — เรียกแล้วภาพจำนั้นหมดอายุ (undo.js เป็นผู้ทิ้ง)
 */
export function restoreState(snapshot) {
  state = JSON.parse(JSON.stringify(snapshot));
  commit();
  return state;
}

/* ------------------------------------------------------- สำเนาข้อมูลเดิม (D8) */

/** ข้อมูลสำรองล่าสุดที่เก็บไว้ก่อนรีเซ็ต — null = ยังไม่มีสำเนา */
export function backupInfo() {
  return readBackupInfo();
}

/**
 * กู้คืนข้อมูลจากสำเนาที่เก็บไว้ก่อนรีเซ็ต (D8)
 * สำเนาเพี้ยน/เก่าเกินไป → ไม่แตะข้อมูลปัจจุบัน แล้วบอกเหตุผลกลับไป
 * @returns {{ ok: true, savedAt: string | null } | { ok: false, reason: 'missing' | 'broken' | 'unsupported' }}
 */
export function restoreBackup() {
  const result = restoreStorageBackup();
  if (!result.ok) return { ok: false, reason: result.reason };
  state = result.state;
  notify();
  return { ok: true, savedAt: result.savedAt };
}

/* ------------------------------------------------------------------ Reset */

/** คืนค่าข้อมูลตัวอย่างทั้งชุด (OQ-11) — สำรองข้อมูลเดิมไว้ก่อนเสมอ (D8) */
export function resetToSeed() {
  state = resetStorageToSeed('manual');
  notify();
  return state;
}
