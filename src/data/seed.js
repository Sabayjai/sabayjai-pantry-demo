/**
 * data/seed.js — ข้อมูลตัวอย่างและค่าตั้งต้น (requirement ข้อ 5.2 · 5.3) · **สคีมา v2**
 *
 * v2 แยก "สินค้า (Product)" ออกจาก "ล็อต (Lot)" เพื่อคุม Batch ได้จริง:
 * - Product  = ชื่อ + หน่วย + หมวดหมู่ + หมายเหตุ  (ไม่มีจำนวน · ไม่ซ้ำชื่อ+หน่วย)
 * - Lot      = ล็อตของสินค้าหนึ่ง ที่จุดเก็บหนึ่ง วันหมดอายุหนึ่ง (มียอดที่ทยอยหักได้ทีละส่วน)
 *              + `usedUpQuantity` = ยอดก่อนที่ล็อตจะหมด (D10 · คำตอบ ข. · ล็อตที่ยังมีของเก็บ 0)
 * - Movement = บันทึกการเคลื่อนไหวของล็อต (in · out · discard · adjust · restore)
 *
 * จุดสำคัญ: วันหมดอายุของ seed คำนวณ "จากวันที่สร้าง seed" ไม่ใช่ค่าคงที่
 * → กดรีเซ็ตเมื่อไรก็เห็นสถานะเหลือง/แดงทันที (US-005 · OQ-11)
 */
import { addDaysToDateOnly, todayDateOnly } from './selectors.js';

export const SCHEMA_VERSION = 2;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 11 หน่วยสำเร็จรูปตาม requirement ข้อ 5.2 (ผู้ใช้พิมพ์หน่วยใหม่เพิ่มเองได้) */
export const DEFAULT_UNITS = [
  'ชิ้น',
  'กล่อง',
  'ขวด',
  'ถุง',
  'แพ็ก',
  'ฟอง',
  'หัว',
  'กรัม',
  'กิโลกรัม',
  'ลิตร',
  'มล.',
];

/** 5 จุดเก็บเริ่มต้น (requirement ข้อ 5.2) */
export const DEFAULT_LOCATIONS = [
  { id: 'loc-fridge', name: 'ตู้เย็น' },
  { id: 'loc-freezer', name: 'ช่องแช่แข็ง' },
  { id: 'loc-pantry', name: 'ตู้กับข้าว' },
  { id: 'loc-shelf', name: 'ชั้นวางของ' },
  { id: 'loc-basket', name: 'ตะกร้าผัก-ผลไม้' },
];

/** 4 หมวดหมู่เริ่มต้น (requirement ข้อ 5.2) */
export const DEFAULT_CATEGORIES = [
  { id: 'cat-ready', name: 'พร้อมกิน' },
  { id: 'cat-ingredient', name: 'วัตถุดิบ' },
  { id: 'cat-seasoning', name: 'เครื่องปรุง' },
  { id: 'cat-household', name: 'ของใช้ในครัว' },
];

/**
 * 8 สินค้าตามตาราง requirement ข้อ 5.3 — แต่ละสินค้ามี 1 ล็อตใน seed
 * expiryOffset = จำนวนวันนับจากวันนี้ (บวก = ยังไม่หมดอายุ · ลบ = เลยวัน · null = ไม่ระบุ)
 */
const SEED_STOCK = [
  { id: 'prod-milk', name: 'นมสด 1 ลิตร', unit: 'กล่อง', categoryId: 'cat-ready', note: '', lots: [{ id: 'lot-milk-1', locationId: 'loc-fridge', quantity: 1, expiryOffset: 2 }] },
  { id: 'prod-yogurt', name: 'โยเกิร์ต', unit: 'ถ้วย', categoryId: 'cat-ready', note: '', lots: [{ id: 'lot-yogurt-1', locationId: 'loc-fridge', quantity: 4, expiryOffset: 3 }] },
  { id: 'prod-cabbage', name: 'ผักกาดขาว', unit: 'หัว', categoryId: 'cat-ingredient', note: '', lots: [{ id: 'lot-cabbage-1', locationId: 'loc-basket', quantity: 1, expiryOffset: -1 }] },
  { id: 'prod-egg', name: 'ไข่ไก่', unit: 'ฟอง', categoryId: 'cat-ingredient', note: '', lots: [{ id: 'lot-egg-1', locationId: 'loc-fridge', quantity: 6, expiryOffset: null }] },
  { id: 'prod-chicken', name: 'อกไก่แช่แข็ง', unit: 'แพ็ก', categoryId: 'cat-ingredient', note: '', lots: [{ id: 'lot-chicken-1', locationId: 'loc-freezer', quantity: 1, expiryOffset: 30 }] },
  { id: 'prod-rice', name: 'ข้าวสาร', unit: 'ถุง', categoryId: 'cat-ingredient', note: '', lots: [{ id: 'lot-rice-1', locationId: 'loc-pantry', quantity: 2, expiryOffset: null }] },
  { id: 'prod-fishsauce', name: 'น้ำปลา', unit: 'ขวด', categoryId: 'cat-seasoning', note: '', lots: [{ id: 'lot-fishsauce-1', locationId: 'loc-shelf', quantity: 1, expiryOffset: null }] },
  { id: 'prod-tissue', name: 'กระดาษทิชชู่', unit: 'แพ็ก', categoryId: 'cat-household', note: '', lots: [{ id: 'lot-tissue-1', locationId: 'loc-shelf', quantity: 1, expiryOffset: null }] },
];

/**
 * 2 สินค้าในมุม "ใช้หมดแล้ว" (ล็อตยอด 0) ให้ทุกมุมของเดโมมีข้อมูล (OQ-R9 · 2026-10-16)
 * quantity = ยอดเดิมตอนรับเข้า → ใช้สร้าง movement in แล้วตามด้วย out ให้ยอดเป็น 0
 */
const SEED_USED_UP = [
  { id: 'prod-butter', name: 'เนยจืด', unit: 'ก้อน', categoryId: 'cat-ingredient', note: '', lot: { id: 'lot-butter-1', locationId: 'loc-fridge', quantity: 1 }, usedUpDaysAgo: 2 },
  { id: 'prod-lime', name: 'มะนาว', unit: 'ลูก', categoryId: 'cat-ingredient', note: '', lot: { id: 'lot-lime-1', locationId: 'loc-basket', quantity: 3 }, usedUpDaysAgo: 5 },
];

/** 2 รายการในมุม "รายการที่ต้องซื้อ" (OQ-R9) */
const SEED_SHOPPING = [
  { id: 'seed-shop-1', text: 'น้ำตาลทราย', createdDaysAgo: 1 },
  { id: 'seed-shop-2', text: 'ผงซักฟอก', createdDaysAgo: 3 },
];

/**
 * สร้าง state ชุดใหม่พร้อมข้อมูลตัวอย่าง
 * @param {Date} now วันที่อ้างอิง (ใส่ได้เพื่อเทสต์ — ค่าเริ่มต้นคือเวลาปัจจุบัน)
 */
export function createSeed(now = new Date()) {
  const createdAt = now.toISOString();
  const today = todayDateOnly(now);

  const locations = DEFAULT_LOCATIONS.map((location) => ({ ...location, createdAt }));
  const categories = DEFAULT_CATEGORIES.map((category) => ({ ...category, createdAt }));

  const products = [];
  const lots = [];
  const movements = [];

  const pushProduct = (seed) => {
    products.push({
      id: seed.id,
      name: seed.name,
      unit: seed.unit,
      categoryId: seed.categoryId ?? null,
      note: seed.note ?? '',
      createdAt,
      updatedAt: createdAt,
    });
  };

  for (const seed of SEED_STOCK) {
    pushProduct(seed);
    for (const lot of seed.lots) {
      const expiryDate = lot.expiryOffset === null ? null : addDaysToDateOnly(today, lot.expiryOffset);
      lots.push({
        id: lot.id,
        productId: seed.id,
        locationId: lot.locationId,
        quantity: lot.quantity,
        usedUpQuantity: 0, // ล็อตที่ยังมีของ = ยังไม่เคยหมด
        expiryDate,
        createdAt,
        updatedAt: createdAt,
      });
      movements.push({
        id: `mv-${lot.id}-in`,
        lotId: lot.id,
        type: 'in',
        delta: lot.quantity,
        balanceAfter: lot.quantity,
        at: createdAt,
        note: null,
      });
    }
  }

  for (const seed of SEED_USED_UP) {
    pushProduct(seed);
    const usedUpAt = new Date(now.getTime() - seed.usedUpDaysAgo * MS_PER_DAY).toISOString();
    const { lot } = seed;
    lots.push({
      id: lot.id,
      productId: seed.id,
      locationId: lot.locationId,
      quantity: 0,
      usedUpQuantity: lot.quantity, // ยอดเดิมตอนรับเข้า — ใช้โชว์ในมุม "ใช้หมดแล้ว" (R005)
      expiryDate: null,
      createdAt: usedUpAt,
      updatedAt: usedUpAt,
    });
    movements.push({ id: `mv-${lot.id}-in`, lotId: lot.id, type: 'in', delta: lot.quantity, balanceAfter: lot.quantity, at: usedUpAt, note: null });
    movements.push({ id: `mv-${lot.id}-out`, lotId: lot.id, type: 'out', delta: -lot.quantity, balanceAfter: 0, at: usedUpAt, note: null });
  }

  const shopping = SEED_SHOPPING.map((seed) => ({
    id: seed.id,
    text: seed.text,
    createdAt: new Date(now.getTime() - seed.createdDaysAgo * MS_PER_DAY).toISOString(),
  }));

  // หน่วย = 11 ตัวสำเร็จรูป + หน่วยที่ seed ใช้แต่ไม่มีในชุดสำเร็จรูป (เช่น "ถ้วย" ของโยเกิร์ต)
  // → สาธิตเส้นทาง "พิมพ์หน่วยใหม่เองได้" ผ่าน ensureUnit() ให้เห็นในเดโม
  const units = [...DEFAULT_UNITS];
  for (const product of products) {
    if (!units.includes(product.unit)) units.push(product.unit);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { seededAt: createdAt, updatedAt: createdAt },
    locations,
    categories,
    units,
    products,
    lots,
    movements,
    shopping,
  };
}
