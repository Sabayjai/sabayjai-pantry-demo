import { describe, expect, it } from 'vitest';
import {
  ReferencedError,
  ValidationError,
  validateName,
  validateProductInput,
  validateReceiveInput,
} from './validate.js';

const LOCATIONS = [{ id: 'loc-fridge', name: 'ตู้เย็น' }];
const CATEGORIES = [{ id: 'cat-ready', name: 'พร้อมกิน' }];

function productInput(overrides = {}) {
  return { name: 'นมสด', unit: 'กล่อง', categoryId: null, note: '', ...overrides };
}

function receiveInput(overrides = {}) {
  return { ...productInput(), quantity: 1, locationId: 'loc-fridge', expiryDate: null, ...overrides };
}

describe('validateProductInput', () => {
  it('ข้อมูลครบถ้วนผ่านการตรวจ', () => {
    expect(validateProductInput(productInput())).toEqual({ ok: true, errors: {} });
  });

  it('บังคับชื่อและหน่วย', () => {
    expect(validateProductInput({}).ok).toBe(false);
    expect(validateProductInput(productInput({ name: '   ' })).errors.name).toBe('กรอกชื่อของ');
    expect(validateProductInput(productInput({ unit: '' })).errors.unit).toBe('เลือกหรือพิมพ์หน่วย');
  });

  it('ตรวจหมวดหมู่เมื่อส่งรายการอ้างอิงเข้ามา', () => {
    expect(validateProductInput(productInput({ categoryId: 'cat-gone' }), { categories: CATEGORIES }).errors.categoryId).toBe('ไม่พบหมวดหมู่ที่เลือก');
    expect(validateProductInput(productInput({ categoryId: 'cat-ready' }), { categories: CATEGORIES }).ok).toBe(true);
  });

  it('หมายเหตุยาวเกิน 200 ตัวอักษรไม่ผ่าน', () => {
    expect(validateProductInput(productInput({ note: 'ก'.repeat(201) })).errors.note).toBeDefined();
    expect(validateProductInput(productInput({ note: 'ก'.repeat(200) })).ok).toBe(true);
  });
});

describe('validateReceiveInput', () => {
  it('ข้อมูลครบถ้วนผ่านการตรวจ', () => {
    expect(validateReceiveInput(receiveInput())).toEqual({ ok: true, errors: {} });
  });

  it('จำนวนต้องมากกว่า 0 และต้องเป็นตัวเลข', () => {
    expect(validateReceiveInput(receiveInput({ quantity: 0 })).errors.quantity).toBe('จำนวนต้องมากกว่า 0');
    expect(validateReceiveInput(receiveInput({ quantity: -1 })).errors.quantity).toBeDefined();
    expect(validateReceiveInput(receiveInput({ quantity: 'หนึ่ง' })).errors.quantity).toBeDefined();
    expect(validateReceiveInput(receiveInput({ quantity: '2' })).ok).toBe(true); // ตัวเลขในสตริงรับได้
  });

  it('บังคับจุดเก็บและตรวจว่ามีอยู่จริง', () => {
    expect(validateReceiveInput(receiveInput({ locationId: '' })).errors.locationId).toBe('เลือกจุดเก็บ');
    expect(validateReceiveInput(receiveInput({ locationId: 'loc-gone' }), { locations: LOCATIONS }).errors.locationId).toBe('ไม่พบจุดเก็บที่เลือก');
    expect(validateReceiveInput(receiveInput({ locationId: 'loc-fridge' }), { locations: LOCATIONS }).ok).toBe(true);
  });

  it('วันหมดอายุต้องเป็นรูปแบบ ปี-เดือน-วัน หรือเว้นว่าง', () => {
    expect(validateReceiveInput(receiveInput({ expiryDate: '2026-10-16' })).ok).toBe(true);
    expect(validateReceiveInput(receiveInput({ expiryDate: '' })).ok).toBe(true);
    expect(validateReceiveInput(receiveInput({ expiryDate: null })).ok).toBe(true);
    expect(validateReceiveInput(receiveInput({ expiryDate: '16/10/2026' })).errors.expiryDate).toBeDefined();
  });
});

describe('validateName', () => {
  it('ต้องไม่ว่างและไม่ยาวเกิน 60 ตัวอักษร', () => {
    expect(validateName('ตู้เย็น').ok).toBe(true);
    expect(validateName('  ').errors.name).toBe('กรอกชื่อ');
    expect(validateName('ก'.repeat(61)).errors.name).toBe('ชื่อยาวเกิน 60 ตัวอักษร');
    expect(validateName('', 'text').errors.text).toBe('กรอกชื่อ');
  });
});

describe('error ที่ใช้ร่วมกัน', () => {
  it('ValidationError พก errors และรวมข้อความเป็นข้อความเดียว', () => {
    const error = new ValidationError({ name: 'กรอกชื่อของ', unit: 'เลือกหรือพิมพ์หน่วย' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toEqual({ name: 'กรอกชื่อของ', unit: 'เลือกหรือพิมพ์หน่วย' });
    expect(error.message).toContain('กรอกชื่อของ');
  });

  it('ReferencedError บอกว่ายังมีของค้างอยู่กี่ชิ้น (US-004)', () => {
    expect(new ReferencedError('location', 3).message).toBe('ลบจุดเก็บไม่ได้ · ยังมีของค้างอยู่ 3 ชิ้น');
    expect(new ReferencedError('category', 2).message).toBe('ลบหมวดหมู่ไม่ได้ · ยังมีของค้างอยู่ 2 ชิ้น');
    expect(new ReferencedError('product', 1).message).toBe('ลบสินค้าไม่ได้ · ยังมีของค้างอยู่ 1 ชิ้น');
    expect(new ReferencedError('product', 1).kind).toBe('product');
  });
});
