/**
 * data/storage.js — ด่านเดียวที่แตะ localStorage (ดีไซน์ข้อ 3.2)
 *
 * คีย์เดียว: 'sabayjai-pantry' + schemaVersion ในตัวข้อมูล
 * - loadState()  : อ่าน + parse + migrate; ถ้าว่าง/พัง → resetToSeed()
 * - saveState()  : เขียน JSON กลับ
 * - resetToSeed(): สำรองของเดิมไว้ก่อน (D8) แล้วเขียนทับด้วย seed ชุดใหม่ (OQ-11)
 * - migrate()    : อัปเกรดสคีมาเก่า → ปัจจุบัน (v1 = แถวเดียวต่อของ → v2 = สินค้า + ล็อต)
 * - normalizeState(): ตรวจรูปร่างข้อมูลรายฟิลด์ เก็บเฉพาะที่ถูกต้อง (D9)
 *
 * D8 · ข้อมูลพัง/ถูกรีเซ็ต ไม่ทิ้งของเดิมเงียบ ๆ อีกแล้ว — ย้ายไปคีย์สำรองให้กู้คืนได้
 */
import { createSeed, SCHEMA_VERSION } from './seed.js';
import { parseDateOnly, usedUpQuantityFromMovements } from './selectors.js';

export { SCHEMA_VERSION };

export const STORAGE_KEY = 'sabayjai-pantry';

/** สำเนาข้อมูลเดิมก่อนถูกรีเซ็ต/ก่อนพบว่าอ่านไม่ได้ (D8) — กู้คืนได้จาก #/settings */
export const BACKUP_KEY = 'sabayjai-pantry.backup';

/** ที่เก็บสำรองในหน่วยความจำ — ใช้เมื่อ localStorage ใช้ไม่ได้ (เบราว์เซอร์บล็อก/รันในเทสต์) */
const memoryStore = new Map();

function backend() {
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return ls;
  } catch {
    // เข้าถึง localStorage ไม่ได้ (เช่นปิดคุกกี้) → ตกลงมาใช้ที่เก็บสำรอง
  }
  return {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: (key, value) => memoryStore.set(key, String(value)),
    removeItem: (key) => memoryStore.delete(key),
  };
}

/** true = ข้อมูลจะอยู่รอดหลังปิดเบราว์เซอร์ (ใช้แสดงสถานะในหน้า #/settings) */
export function isPersistent() {
  try {
    return Boolean(globalThis.localStorage && typeof globalThis.localStorage.setItem === 'function');
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ สำเนาเดิม (D8) */

/**
 * ย้ายข้อมูลก้อนปัจจุบันไปคีย์สำรองก่อนถูกทับ — เก็บ "ข้อความดิบ" ไว้ทั้งก้อน
 * เพื่อให้กู้คืนได้แม้ของเดิมจะ parse ไม่ผ่าน
 * @returns {{ savedAt: string, reason: string } | null} null = ไม่มีอะไรให้สำรอง
 */
function backupCurrent(reason) {
  let raw = null;
  try {
    raw = backend().getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[sabayjai] อ่านข้อมูลเดิมเพื่อสำรองไม่สำเร็จ', error);
    return null;
  }
  if (raw === null || raw === undefined) return null;

  const savedAt = new Date().toISOString();
  try {
    backend().setItem(BACKUP_KEY, JSON.stringify({ savedAt, reason, raw }));
  } catch (error) {
    console.warn('[sabayjai] สำรองข้อมูลเดิมไม่สำเร็จ (ที่เก็บเต็ม?)', error);
    return null;
  }
  return { savedAt, reason };
}

/** เก็บสำเนาข้อมูลปัจจุบันก่อนคำสั่งล้างข้อมูลจาก db.js */
export function backupCurrentState(reason) {
  return backupCurrent(reason);
}

/** ข้อมูลสำรองล่าสุดที่เก็บไว้ (ไม่คืนเนื้อข้อมูล — ใช้แค่แสดง/ตัดสินใจในจอ) */
export function readBackupInfo() {
  let raw = null;
  try {
    raw = backend().getItem(BACKUP_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.raw !== 'string' || !entry.raw) return null;
    return {
      savedAt: typeof entry.savedAt === 'string' ? entry.savedAt : null,
      reason: typeof entry.reason === 'string' ? entry.reason : 'unknown',
      bytes: entry.raw.length,
    };
  } catch {
    return null;
  }
}

/**
 * กู้คืนข้อมูลจากสำเนา — ตรวจให้ผ่านก่อนจึงเขียนทับ (สำเนาเพี้ยน = ไม่แตะข้อมูลปัจจุบัน)
 * @returns {{ ok: true, savedAt: string | null, state: object } | { ok: false, reason: 'missing' | 'broken' | 'unsupported' }}
 */
export function restoreBackup() {
  let raw = null;
  try {
    raw = backend().getItem(BACKUP_KEY);
  } catch {
    return { ok: false, reason: 'missing' };
  }
  if (!raw) return { ok: false, reason: 'missing' };

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'broken' };
  }
  if (!entry || typeof entry.raw !== 'string') return { ok: false, reason: 'broken' };

  let parsed;
  try {
    parsed = JSON.parse(entry.raw);
  } catch {
    return { ok: false, reason: 'broken' };
  }

  let state;
  try {
    state = migrate(parsed);
  } catch {
    return { ok: false, reason: 'unsupported' };
  }

  saveState(state);
  return { ok: true, savedAt: typeof entry.savedAt === 'string' ? entry.savedAt : null, state };
}

/* ------------------------------------------------------------------- อ่าน/เขียน */

/** อ่าน state จากที่เก็บ · ที่ว่าง/พัง/เวอร์ชันเพี้ยน → คืน seed ใหม่ (สำรองของเดิมไว้ก่อน) */
export function loadState() {
  let raw = null;
  try {
    raw = backend().getItem(STORAGE_KEY);
  } catch {
    return resetToSeed('unreadable');
  }

  if (!raw) return resetToSeed('empty');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[sabayjai] ข้อมูลในที่เก็บอ่านไม่ได้ — คืนค่าข้อมูลตัวอย่าง (ของเดิมเก็บไว้ที่คีย์สำรอง)');
    return resetToSeed('broken');
  }

  try {
    return migrate(parsed);
  } catch (error) {
    console.warn('[sabayjai] ข้อมูลเวอร์ชันเก่า/ไม่รองรับ — คืนค่าข้อมูลตัวอย่าง (ของเดิมเก็บไว้ที่คีย์สำรอง)', error);
    return resetToSeed('unsupported');
  }
}

/** เขียน state กลับที่เก็บ (เรียกผ่าน commit() ของ db.js เท่านั้น) */
export function saveState(state) {
  backend().setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

/**
 * สำรองของเดิมไว้ที่คีย์สำรอง (ถ้ามี) แล้วเขียนทับด้วย seed ชุดใหม่
 * @param {string} reason เหตุผลที่รีเซ็ต ('manual' = กดปุ่มในหน้าตั้งค่า)
 */
export function resetToSeed(reason = 'manual') {
  backupCurrent(reason);
  const state = createSeed();
  saveState(state);
  return state;
}

/* ----------------------------------------------------------- normalize (D9) */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** เก็บรายการที่ซ่อม/ตัด เพื่อ log ครั้งเดียว (ข้อมูลเพี้ยนจะได้ไม่หายเงียบ ๆ) */
function createReporter() {
  const notes = [];
  return {
    drop(what, detail) {
      notes.push(`ตัด${what} (${detail})`);
    },
    fix(what, detail) {
      notes.push(`ซ่อม${what} (${detail})`);
    },
    flush() {
      if (notes.length) {
        console.warn(`[sabayjai] ซ่อมข้อมูลในที่เก็บ ${notes.length} จุด: ${notes.join(' · ')}`);
      }
      return notes;
    },
  };
}

function readId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readTimestamp(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/** ยอดคงเหลือ — ตัวเลขเท่านั้น · ติดลบถูก clamp เป็น 0 · คืน null เมื่อใช้ไม่ได้เลย */
function readQuantity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, number);
}

/** วันหมดอายุต้องเป็นวันที่ล้วนที่มีอยู่จริง · อย่างอื่น (รวมค่าว่าง) = ไม่ระบุวัน */
function readExpiryDate(value) {
  if (value === null || value === undefined || value === '') return null;
  return parseDateOnly(value) ? String(value).trim() : null;
}

/** จุดเก็บ/หมวดหมู่ — { id, name, isActive } · ข้อมูลเก่าที่ไม่มี isActive = ใช้งาน (true) · id ซ้ำถูกตัด */
function normalizeNamedList(raw, fallbackAt, report, label) {
  const seen = new Set();
  const list = [];
  for (const entry of asArray(raw)) {
    if (!isObject(entry)) {
      report.drop(label, 'รูปร่างไม่ใช่ object');
      continue;
    }
    const id = readId(entry.id);
    const name = readText(entry.name);
    if (!id || !name) {
      report.drop(label, 'ขาด id หรือ name');
      continue;
    }
    if (seen.has(id)) {
      report.drop(label, `id ซ้ำ (${id})`);
      continue;
    }
    seen.add(id);
    list.push({
      id,
      name,
      isActive: entry.isActive === false ? false : true,
      createdAt: readTimestamp(entry.createdAt, fallbackAt),
    });
  }
  return list;
}

/** หน่วย = ข้อความไม่ว่าง · ตัดตัวซ้ำและช่องว่างหัวท้าย */
function normalizeUnits(raw, report) {
  const seen = new Set();
  const units = [];
  for (const entry of asArray(raw)) {
    const value = readText(entry);
    if (!value) {
      report.drop('หน่วย', 'ไม่ใช่ข้อความที่ใช้ได้');
      continue;
    }
    if (seen.has(value)) {
      report.fix('หน่วย', `ตัดตัวซ้ำ (${value})`);
      continue;
    }
    seen.add(value);
    units.push(value);
  }
  return units;
}

function normalizeProducts(raw, categoryIds, fallbackAt, report) {
  const seen = new Set();
  const products = [];
  for (const entry of asArray(raw)) {
    if (!isObject(entry)) {
      report.drop('สินค้า', 'รูปร่างไม่ใช่ object');
      continue;
    }
    const id = readId(entry.id);
    const name = readText(entry.name);
    const unit = readText(entry.unit);
    if (!id || !name || !unit) {
      report.drop('สินค้า', 'ขาด id/name/unit');
      continue;
    }
    if (seen.has(id)) {
      report.drop('สินค้า', `id ซ้ำ (${id})`);
      continue;
    }
    seen.add(id);

    let categoryId = readId(entry.categoryId);
    if (categoryId && !categoryIds.has(categoryId)) {
      report.fix('สินค้า', `หมวดหมู่ ${categoryId} ไม่มีอยู่ → ตั้งเป็นไม่ระบุ`);
      categoryId = null;
    }

    products.push({
      id,
      name,
      unit,
      categoryId,
      note: typeof entry.note === 'string' ? entry.note : '',
      createdAt: readTimestamp(entry.createdAt, fallbackAt),
      updatedAt: readTimestamp(entry.updatedAt, fallbackAt),
    });
  }
  return products;
}

function normalizeLots(raw, productIds, locationIds, fallbackAt, report) {
  const seen = new Set();
  const lots = [];
  for (const entry of asArray(raw)) {
    if (!isObject(entry)) {
      report.drop('ล็อต', 'รูปร่างไม่ใช่ object');
      continue;
    }
    const id = readId(entry.id);
    const productId = readId(entry.productId);
    if (!id || !productId) {
      report.drop('ล็อต', 'ขาด id/productId');
      continue;
    }
    if (seen.has(id)) {
      report.drop('ล็อต', `id ซ้ำ (${id})`);
      continue;
    }
    if (!productIds.has(productId)) {
      report.drop('ล็อต', `ไม่พบสินค้า ${productId} (ข้อมูลกำพร้า)`);
      continue;
    }

    const quantity = readQuantity(entry.quantity);
    if (quantity === null) {
      report.drop('ล็อต', `ยอดไม่ใช่ตัวเลข (${JSON.stringify(entry.quantity)})`);
      continue;
    }
    seen.add(id);

    let locationId = readId(entry.locationId);
    if (locationId && !locationIds.has(locationId)) {
      report.fix('ล็อต', `จุดเก็บ ${locationId} ไม่มีอยู่ → ตั้งเป็นไม่ระบุ`);
      locationId = null;
    }

    if (entry.expiryDate && !parseDateOnly(entry.expiryDate)) {
      report.fix('ล็อต', `วันหมดอายุไม่ถูกรูปแบบ (${entry.expiryDate}) → ตั้งเป็นไม่ระบุ`);
    }

    // usedUpQuantity: ค่าที่ถูกต้องผ่านไป · ที่หาย/เพี้ยน = เติมจากประวัติในขั้นถัดไป (null = ยังไม่รู้)
    let usedUpQuantity = readQuantity(entry.usedUpQuantity);
    if (usedUpQuantity === null && entry.usedUpQuantity !== undefined) {
      report.fix('ล็อต', `จำนวนเดิมไม่ใช่ตัวเลข → คำนวณใหม่จากประวัติ (${id})`);
    }

    lots.push({
      id,
      productId,
      locationId,
      quantity,
      usedUpQuantity,
      expiryDate: readExpiryDate(entry.expiryDate),
      createdAt: readTimestamp(entry.createdAt, fallbackAt),
      updatedAt: readTimestamp(entry.updatedAt, fallbackAt),
    });
  }
  return lots;
}

const MOVEMENT_TYPES = new Set(['in', 'out', 'discard', 'adjust', 'restore']);

function normalizeMovements(raw, lotIds, fallbackAt, report) {
  const seen = new Set();
  const movements = [];
  let recovered = 0;

  for (const entry of asArray(raw)) {
    if (!isObject(entry)) {
      report.drop('การเคลื่อนไหว', 'รูปร่างไม่ใช่ object');
      continue;
    }
    const lotId = readId(entry.lotId);
    if (!lotId || !lotIds.has(lotId)) {
      report.drop('การเคลื่อนไหว', `ไม่พบล็อต ${JSON.stringify(entry.lotId)} (ประวัติกำพร้า)`);
      continue;
    }
    const delta = Number(entry.delta);
    if (!Number.isFinite(delta)) {
      report.drop('การเคลื่อนไหว', 'delta ไม่ใช่ตัวเลข');
      continue;
    }

    let id = readId(entry.id);
    if (!id || seen.has(id)) {
      id = `mv-recovered-${(recovered += 1)}`;
      report.fix('การเคลื่อนไหว', 'รหัสหาย/ซ้ำ → ออกรหัสใหม่');
    }
    seen.add(id);

    movements.push({
      id,
      lotId,
      type: MOVEMENT_TYPES.has(entry.type) ? entry.type : 'adjust',
      delta,
      balanceAfter: Number.isFinite(Number(entry.balanceAfter)) ? Number(entry.balanceAfter) : 0,
      at: readTimestamp(entry.at, fallbackAt),
      note: typeof entry.note === 'string' ? entry.note : null,
    });
  }
  return movements;
}

function normalizeShopping(raw, fallbackAt, report) {
  const seen = new Set();
  const shopping = [];
  for (const entry of asArray(raw)) {
    if (!isObject(entry)) {
      report.drop('รายการที่ต้องซื้อ', 'รูปร่างไม่ใช่ object');
      continue;
    }
    const id = readId(entry.id);
    const text = readText(entry.text);
    if (!id || !text) {
      report.drop('รายการที่ต้องซื้อ', 'ขาด id/text');
      continue;
    }
    if (seen.has(id)) {
      report.drop('รายการที่ต้องซื้อ', `id ซ้ำ (${id})`);
      continue;
    }
    seen.add(id);
    shopping.push({ id, text, createdAt: readTimestamp(entry.createdAt, fallbackAt) });
  }
  return shopping;
}

/**
 * เติมโครงที่ขาด + ตรวจรูปร่างรายฟิลด์ (D9)
 * เก็บเฉพาะรายการที่ถูกต้อง · ที่เพี้ยนถูกตัดหรือซ่อมเฉพาะจุด ไม่ทิ้งข้อมูลทั้งก้อน
 */
export function normalizeState(raw) {
  const source = isObject(raw) ? raw : {};
  const now = new Date().toISOString();
  const report = createReporter();
  const seededAt = readTimestamp(source.meta?.seededAt, now);

  const locations = normalizeNamedList(source.locations, seededAt, report, 'จุดเก็บ');
  const categories = normalizeNamedList(source.categories, seededAt, report, 'หมวดหมู่');
  const units = normalizeUnits(source.units, report);
  const products = normalizeProducts(source.products, new Set(categories.map((category) => category.id)), seededAt, report);
  const lots = normalizeLots(source.lots, new Set(products.map((product) => product.id)), new Set(locations.map((location) => location.id)), seededAt, report);
  const movements = normalizeMovements(source.movements, new Set(lots.map((lot) => lot.id)), seededAt, report);
  const shopping = normalizeShopping(source.shopping, seededAt, report);

  // ยอด "จำนวนเดิม" ของล็อต (D10 · ข.) — ฟิลด์หาย/เพี้ยน = เติมจากประวัติ · ค่าที่ถูกต้องอยู่แล้วไม่ถูกทับ
  const byLot = new Map();
  for (const movement of movements) {
    if (!byLot.has(movement.lotId)) byLot.set(movement.lotId, []);
    byLot.get(movement.lotId).push(movement);
  }
  for (const lot of lots) {
    if (Number.isFinite(lot.usedUpQuantity)) continue;
    const history = byLot.get(lot.id);
    lot.usedUpQuantity = history ? usedUpQuantityFromMovements(history) : 0;
    report.fix('ล็อต', `เติมจำนวนเดิมของ ${lot.id} = ${lot.usedUpQuantity} จากประวัติ`);
  }

  report.flush();

  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      seededAt,
      updatedAt: readTimestamp(source.meta?.updatedAt, now),
    },
    locations,
    categories,
    units,
    products,
    lots,
    movements,
    shopping,
  };
}

/* ---------------------------------------------------------------- migrate */

/**
 * แปลงข้อมูลสคีมา v1 (items หนึ่งแถว = ของหนึ่งอย่าง) → v2 (products + lots + movements)
 * - รวม item/usedUp ที่ชื่อ+หน่วยเดียวกันเป็น product เดียว (ไม่ให้สินค้าซ้ำ)
 * - item → lot ที่มียอดตามจำนวนเดิม
 * - usedUp → lot ยอด 0 พร้อม movement in + out ให้ย้อนดูได้
 *   (`usedUpQuantity` ไม่ต้องใส่ตรงนี้ — normalizeState เติมจากประวัติให้เอง)
 */
function migrateV1toV2(raw) {
  const now = new Date().toISOString();
  const products = [];
  const lots = [];
  const movements = [];
  const byNameUnit = new Map();
  let seq = 0;
  const nextId = (prefix) => `${prefix}-migrated-${(seq += 1)}`;

  const ensureProduct = (name, unit, categoryId, note, at) => {
    const cleanName = String(name ?? '').trim();
    const cleanUnit = String(unit ?? '').trim();
    const key = `${cleanName}||${cleanUnit}`;
    if (byNameUnit.has(key)) return byNameUnit.get(key);
    const product = {
      id: nextId('prod'),
      name: cleanName,
      unit: cleanUnit,
      categoryId: categoryId ?? null,
      note: String(note ?? ''),
      createdAt: at,
      updatedAt: at,
    };
    products.push(product);
    byNameUnit.set(key, product);
    return product;
  };

  for (const item of asArray(raw.items)) {
    const at = item.createdAt ?? now;
    const product = ensureProduct(item.name, item.unit, item.categoryId, item.note, at);
    const quantity = Number(item.quantity) || 0;
    const lot = {
      id: nextId('lot'),
      productId: product.id,
      locationId: item.locationId ?? null,
      quantity,
      expiryDate: item.expiryDate ?? null,
      createdAt: at,
      updatedAt: item.updatedAt ?? at,
    };
    lots.push(lot);
    movements.push({ id: nextId('mv'), lotId: lot.id, type: 'in', delta: quantity, balanceAfter: quantity, at, note: null });
  }

  for (const entry of asArray(raw.usedUp)) {
    const at = entry.usedUpAt ?? now;
    const product = ensureProduct(entry.name, entry.unit, entry.categoryId, entry.note, at);
    const quantity = Number(entry.quantity) || 0;
    const lot = {
      id: nextId('lot'),
      productId: product.id,
      locationId: entry.locationId ?? null,
      quantity: 0,
      expiryDate: entry.expiryDate ?? null,
      createdAt: at,
      updatedAt: at,
    };
    lots.push(lot);
    movements.push({ id: nextId('mv'), lotId: lot.id, type: 'in', delta: quantity, balanceAfter: quantity, at, note: null });
    movements.push({ id: nextId('mv'), lotId: lot.id, type: 'out', delta: -quantity, balanceAfter: 0, at, note: null });
  }

  return { ...raw, schemaVersion: SCHEMA_VERSION, products, lots, movements };
}

/** อัปเกรดสคีมาเก่า → ปัจจุบัน แล้วเติมส่วนที่ขาด + ตรวจรูปร่าง */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('ข้อมูลในที่เก็บไม่ใช่รูปแบบที่รองรับ');
  }
  const version = Number(raw.schemaVersion);
  if (!Number.isFinite(version)) throw new Error('ไม่พบ schemaVersion ในข้อมูลที่เก็บ');
  if (version > SCHEMA_VERSION) {
    throw new Error(`ข้อมูลมาจากแอปเวอร์ชันใหม่กว่า (schema ${version} > ${SCHEMA_VERSION})`);
  }
  const base = version >= 2 ? raw : migrateV1toV2(raw);
  return normalizeState(base);
}
