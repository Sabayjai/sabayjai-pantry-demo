/**
 * data/validate.js — ตรวจอินพุตก่อนบันทึก (ดีไซน์ข้อ 3.8)
 *
 * - ข้อความ error เป็นภาษาไทย ใช้แสดงใต้ช่องกรอกใน R003 ได้ตรง ๆ
 * - สคีมา v2 แยกการตรวจเป็น "สินค้า" (ชื่อ/หน่วย/หมวดหมู่/หมายเหตุ) และ "การรับเข้า" (บวกจำนวน/จุดเก็บ/วันหมดอายุ)
 */
import { parseDateOnly } from './selectors.js';

export const NOTE_MAX_LENGTH = 200;

/** ข้อมูลไม่ผ่านการตรวจ — พก errors เป็น { ชื่อฟิลด์: ข้อความไทย } */
export class ValidationError extends Error {
  constructor(errors = {}) {
    const messages = Object.values(errors);
    super(messages.length ? messages.join(' · ') : 'ข้อมูลไม่ถูกต้อง');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/** ลบไม่ได้เพราะยังมีของอ้างอิงอยู่ (US-004) — kind: 'location' | 'category' | 'product' */
export class ReferencedError extends Error {
  constructor(kind, count) {
    const what = kind === 'location' ? 'จุดเก็บ' : kind === 'category' ? 'หมวดหมู่' : 'สินค้า';
    super(`ลบ${what}ไม่ได้ · ยังมีของค้างอยู่ ${count} ชิ้น`);
    this.name = 'ReferencedError';
    this.kind = kind;
    this.count = count;
  }
}

/**
 * ตรวจข้อมูล "สินค้า" (Product)
 * @param {object} input { name, unit, categoryId?, note? }
 * @param {object} ctx   { categories? } ส่งมาเมื่อต้องการตรวจว่าอ้างอิงมีอยู่จริง
 */
export function validateProductInput(input = {}, ctx = {}) {
  const errors = {};

  if (!String(input.name ?? '').trim()) errors.name = 'กรอกชื่อของ';
  if (!String(input.unit ?? '').trim()) errors.unit = 'เลือกหรือพิมพ์หน่วย';

  const categoryId = input.categoryId ?? null;
  if (categoryId) {
    if (Array.isArray(ctx.categories) && !ctx.categories.some((category) => category.id === categoryId)) {
      errors.categoryId = 'ไม่พบหมวดหมู่ที่เลือก';
    }
  }

  const note = input.note ?? '';
  if (String(note).length > NOTE_MAX_LENGTH) {
    errors.note = `หมายเหตุยาวเกิน ${NOTE_MAX_LENGTH} ตัวอักษร`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * ตรวจข้อมูล "รับของเข้า" = สินค้า + ล็อตใหม่ (US-001 · 5.1)
 * @param {object} input { name, unit, quantity, locationId, categoryId?, expiryDate?, note? }
 * @param {object} ctx   { locations?, categories? }
 */
export function validateReceiveInput(input = {}, ctx = {}) {
  const base = validateProductInput(input, ctx);
  const errors = { ...base.errors };

  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = 'จำนวนต้องมากกว่า 0';

  const locationId = String(input.locationId ?? '').trim();
  if (!locationId) errors.locationId = 'เลือกจุดเก็บ';
  else if (Array.isArray(ctx.locations) && !ctx.locations.some((location) => location.id === locationId)) {
    errors.locationId = 'ไม่พบจุดเก็บที่เลือก';
  }

  const expiryDate = input.expiryDate ?? null;
  if (expiryDate !== null && expiryDate !== '' && parseDateOnly(expiryDate) === null) {
    errors.expiryDate = 'วันหมดอายุต้องเป็นรูปแบบ ปี-เดือน-วัน';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** ตรวจชื่อจุดเก็บ/หมวดหมู่ (ใช้ตอนเพิ่ม-แก้ชื่อ) */
export function validateName(name, field = 'name') {
  const value = String(name ?? '').trim();
  if (!value) return { ok: false, errors: { [field]: 'กรอกชื่อ' } };
  if (value.length > 60) return { ok: false, errors: { [field]: 'ชื่อยาวเกิน 60 ตัวอักษร' } };
  return { ok: true, errors: {} };
}
