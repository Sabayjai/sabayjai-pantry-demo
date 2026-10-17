import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from './storage.js';

/**
 * โหลดโมดูลชุดใหม่ต่อเทสต์ เพื่อให้ state ในหน่วยความจำเริ่มจาก seed เสมอ
 * ต้องดึง error class มาจากชุดโมดูลเดียวกัน (หลัง resetModules) ไม่ใช่ import ด้านบน
 * ไม่งั้นเทียบ instanceof ข้ามชุดโมดูลจะไม่ตรง
 */
async function freshModules() {
  vi.resetModules();
  globalThis.localStorage.clear();
  const db = await import('./db.js');
  const store = await import('../store.js');
  const { ReferencedError, ValidationError } = await import('./validate.js');
  return { db, store, ReferencedError, ValidationError };
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('db · สถานะตั้งต้นจาก seed (สคีมา v2)', () => {
  it('มี 10 สินค้า · ล็อตที่มีของ 8 · ใช้หมดแล้ว 2 · 5 จุดเก็บ · 4 หมวดหมู่ · 2 รายการต้องซื้อ', async () => {
    const { db } = await freshModules();
    expect(db.listProducts()).toHaveLength(10);
    expect(db.listLots({ activeOnly: true })).toHaveLength(8);
    expect(db.listUsedUpLots()).toHaveLength(2);
    expect(db.listLocations()).toHaveLength(5);
    expect(db.listCategories()).toHaveLength(4);
    expect(db.listShopping()).toHaveLength(2);
    expect(db.listUnits()).toContain('ถ้วย'); // หน่วยจาก seed ที่ไม่อยู่ใน 11 ตัวสำเร็จรูป
  });
});

describe('db · สินค้า (Product)', () => {
  it('ensureProduct หา (ชื่อ+หน่วย) เดิมมาใช้ ไม่สร้างซ้ำ', async () => {
    const { db } = await freshModules();
    const first = db.ensureProduct({ name: 'ปลากระป๋อง', unit: 'กระป๋อง', categoryId: 'cat-ingredient' });
    const second = db.ensureProduct({ name: 'ปลากระป๋อง', unit: 'กระป๋อง' });
    expect(second.id).toBe(first.id);
    expect(db.listProducts()).toHaveLength(11);
    expect(db.listUnits()).toContain('กระป๋อง');

    // ชื่อเดิมแต่หน่วยต่าง = คนละสินค้า
    const otherUnit = db.ensureProduct({ name: 'ปลากระป๋อง', unit: 'แพ็ก' });
    expect(otherUnit.id).not.toBe(first.id);
  });

  it('ensureProduct ปฏิเสธข้อมูลที่ไม่ผ่านการตรวจ (ValidationError)', async () => {
    const { db, ValidationError } = await freshModules();
    expect(() => db.ensureProduct({ name: '', unit: '' })).toThrow(ValidationError);
    expect(() => db.ensureProduct({ name: 'ของ', unit: 'ชิ้น', categoryId: 'cat-ไม่มีอยู่' })).toThrow(ValidationError);
  });

  it('updateProduct แก้ชื่อ/หน่วยได้ และกันชื่อ+หน่วยซ้ำ', async () => {
    const { db, ValidationError } = await freshModules();
    const updated = db.updateProduct('prod-rice', { note: 'ของยาย' });
    expect(updated.note).toBe('ของยาย');
    expect(() => db.updateProduct('prod-rice', { name: 'นมสด 1 ลิตร', unit: 'กล่อง' })).toThrow(ValidationError);
    expect(() => db.updateProduct('prod-ไม่มีอยู่', { name: 'x' })).toThrow('ไม่พบสินค้านี้');
  });

  it('deleteProduct ลบได้เฉพาะเมื่อไม่มีของค้าง (และลบล็อต+ประวัติไปด้วย)', async () => {
    const { db, ReferencedError } = await freshModules();
    expect(() => db.deleteProduct('prod-milk')).toThrow(ReferencedError); // ยังมีของ

    db.deleteProduct('prod-butter'); // ล็อตยอด 0 → ลบได้
    expect(db.getProduct('prod-butter')).toBeNull();
    expect(db.listLots({ productId: 'prod-butter' })).toHaveLength(0);
    expect(db.listMovements({ productId: 'prod-butter' })).toHaveLength(0);
  });
});

describe('db · รับของเข้าและล็อต (US-001)', () => {
  it('receiveStock สร้างสินค้า + ล็อตใหม่ และบันทึก movement in', async () => {
    const { db } = await freshModules();
    const { product, lot } = db.receiveStock({ name: 'ปลากระป๋อง', quantity: 3, unit: 'กระป๋อง', locationId: 'loc-pantry' });

    expect(product.name).toBe('ปลากระป๋อง');
    expect(lot.quantity).toBe(3);
    expect(lot.expiryDate).toBeNull();
    const movements = db.listMovements({ productId: product.id });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: 'in', delta: 3, balanceAfter: 3 });
  });

  it('รับของเดิม จุดเก็บ+วันหมดอายุเดิม → รวมเข้าล็อตเดิม (ไม่สร้างล็อตซ้ำ)', async () => {
    const { db } = await freshModules();
    const first = db.receiveStock({ name: 'ปลากระป๋อง', quantity: 3, unit: 'กระป๋อง', locationId: 'loc-pantry' });
    const again = db.receiveStock({ name: 'ปลากระป๋อง', quantity: 2, unit: 'กระป๋อง', locationId: 'loc-pantry' });

    expect(again.lot.id).toBe(first.lot.id);
    expect(again.lot.quantity).toBe(5);
    expect(again.product.id).toBe(first.product.id);
    expect(db.listProducts()).toHaveLength(11);
    // 2 ครั้ง = 2 movement บนล็อตเดียว
    expect(db.listMovements({ lotId: first.lot.id })).toHaveLength(2);
  });

  it('วันหมดอายุต่าง → แยกเป็นคนละล็อต (คุม batch ได้)', async () => {
    const { db } = await freshModules();
    const a = db.receiveStock({ name: 'นมสด 1 ลิตร', quantity: 1, unit: 'กล่อง', locationId: 'loc-fridge', expiryDate: '2999-12-31' });
    const b = db.receiveStock({ name: 'นมสด 1 ลิตร', quantity: 2, unit: 'กล่อง', locationId: 'loc-fridge', expiryDate: '2999-06-30' });

    expect(b.product.id).toBe(a.product.id); // สินค้าเดียวกัน
    expect(b.lot.id).not.toBe(a.lot.id); // คนละล็อต
    expect(db.listLots({ productId: a.product.id })).toHaveLength(3); // lot-milk-1 + 2 ล็อตใหม่
  });
});

describe('db · ทยอยใช้แบบ FEFO (US-003)', () => {
  it('consumeProduct หักล็อตหมดอายุใกล้สุดก่อน และหักข้ามล็อตเมื่อยอดไม่พอ', async () => {
    const { db } = await freshModules();
    db.receiveStock({ name: 'นมสด 1 ลิตร', quantity: 3, unit: 'กล่อง', locationId: 'loc-fridge', expiryDate: '2999-12-31' });

    const movements = db.consumeProduct('prod-milk', 2); // lot-milk-1 (ใกล้หมดอายุ) มี 1 → หักหมด แล้วไปล็อตใหม่ 1
    expect(movements).toHaveLength(2);
    expect(db.getLot('lot-milk-1').quantity).toBe(0);
    const laterLot = db.listLots({ productId: 'prod-milk' }).find((lot) => lot.expiryDate === '2999-12-31');
    expect(laterLot.quantity).toBe(2);
    expect(movements[0]).toMatchObject({ type: 'out', delta: -1, balanceAfter: 0 });
  });

  it('จำนวนติดลบ/ศูนย์/เกินที่มี → ValidationError', async () => {
    const { db, ValidationError } = await freshModules();
    expect(() => db.consumeProduct('prod-rice', 0)).toThrow(ValidationError);
    expect(() => db.consumeProduct('prod-rice', -1)).toThrow(ValidationError);
    expect(() => db.consumeProduct('prod-rice', 99)).toThrow(ValidationError);
  });

  it('discardProduct แยกประวัติว่า "ทิ้ง" ไม่ใช่ "ใช้"', async () => {
    const { db } = await freshModules();
    const movements = db.discardProduct('prod-rice', 1);
    expect(movements[0].type).toBe('discard');
    expect(db.getLot('lot-rice-1').quantity).toBe(1);
  });

  it('setLotQuantity ตั้งยอดตรง ๆ (clamp ≥ 0) และถึง 0 แล้วเข้า "ใช้หมดแล้ว" อัตโนมัติ', async () => {
    const { db } = await freshModules();
    const emptied = db.setLotQuantity('lot-rice-1', 0);
    expect(emptied.quantity).toBe(0);
    expect(db.listUsedUpLots().map((entry) => entry.id)).toContain('lot-rice-1');

    expect(db.setLotQuantity('lot-rice-1', -5).quantity).toBe(0); // ติดลบ → 0
    expect(db.setLotQuantity('lot-rice-1', 3).quantity).toBe(3);
    expect(db.listUsedUpLots().map((entry) => entry.id)).not.toContain('lot-rice-1');
  });
});

describe('db · นำกลับจากใช้หมดแล้ว (US-007)', () => {
  it('restoreLot นำล็อตที่ยอด 0 กลับมามีของ พร้อมจำนวนใหม่', async () => {
    const { db } = await freshModules();
    const restored = db.restoreLot('lot-butter-1', 2);
    expect(restored.quantity).toBe(2);
    expect(db.listUsedUpLots().map((entry) => entry.id)).not.toContain('lot-butter-1');

    const movements = db.listMovements({ lotId: 'lot-butter-1' });
    expect(movements.at(-1)).toMatchObject({ type: 'restore', delta: 2, balanceAfter: 2 });
  });

  it('restoreLot ปฏิเสธจำนวนที่ไม่ถูกต้อง และล็อตที่จุดเก็บถูกลบไปแล้ว', async () => {
    const { db, ValidationError } = await freshModules();
    expect(() => db.restoreLot('lot-butter-1', 0)).toThrow(ValidationError);

    // loc-freezer มีอกไก่ชิ้นเดียว → ทำเป็นใช้หมดแล้ว แล้วลบจุดเก็บ (ว่าง) ได้
    db.setLotQuantity('lot-chicken-1', 0);
    db.deleteLocation('loc-freezer');
    expect(() => db.restoreLot('lot-chicken-1', 1)).toThrow(ValidationError);
    expect(() => db.restoreLot('lot-ไม่มีอยู่', 1)).toThrow('ไม่พบล็อตนี้');
  });
});

describe('db · "จำนวนเดิม" ของของที่ใช้หมดแล้ว (D10 · คำตอบ ข.)', () => {
  it('seed: ล็อตที่ใช้หมดแล้วจำยอดก่อนหมดไว้ · ล็อตที่ยังมีของเป็น 0', async () => {
    const { db } = await freshModules();
    expect(db.listUsedUpLots().map((entry) => [entry.id, entry.usedUpQuantity])).toEqual([
      ['lot-butter-1', 1],
      ['lot-lime-1', 3],
    ]);
    expect(db.getLot('lot-rice-1').usedUpQuantity).toBe(0);
  });

  it('หักจนหมด → จำยอดก่อนหัก · นำกลับเข้า → ล้างเป็น 0 · หักหมดอีกครั้ง → จำยอดใหม่', async () => {
    const { db } = await freshModules();
    db.setLotQuantity('lot-rice-1', 0); // ข้าวสาร เดิม 2 ถุง
    expect(db.getLot('lot-rice-1').usedUpQuantity).toBe(2);
    expect(db.listUsedUpLots().find((entry) => entry.id === 'lot-rice-1').usedUpQuantity).toBe(2);

    db.restoreLot('lot-rice-1', 5);
    expect(db.getLot('lot-rice-1').usedUpQuantity).toBe(0); // กลับมามีของ = ยอดเดิมถูกล้าง

    db.consumeProduct('prod-rice', 5); // ทยอยใช้จนหมดรอบใหม่
    expect(db.getLot('lot-rice-1').usedUpQuantity).toBe(5);
  });

  it('recalculateUsedUpQuantities ดึงค่าที่เพี้ยนกลับมาตรงกับประวัติ', async () => {
    const { db } = await freshModules();
    db.setLotQuantity('lot-rice-1', 0);
    db.getLot('lot-rice-1').usedUpQuantity = 99; // ทำให้เพี้ยน

    const result = db.recalculateUsedUpQuantities({ lotId: 'lot-rice-1' });
    expect(result).toMatchObject({ checked: 1, fixed: 1, skipped: 0 });
    expect(result.changes[0]).toMatchObject({ lotId: 'lot-rice-1', before: 99, after: 2 });
    expect(db.getLot('lot-rice-1').usedUpQuantity).toBe(2);
  });

  it('คำนวณทั้งชุดบน seed → ไม่มีอะไรต้องแก้ (ค่าที่ code คุมไว้ตรงกับประวัติอยู่แล้ว)', async () => {
    const { db } = await freshModules();
    expect(db.recalculateUsedUpQuantities()).toMatchObject({ checked: 10, fixed: 0 });
  });
});

describe('db · Locations & Categories (US-004)', () => {
  it('ลบจุดเก็บที่มีของอยู่ไม่ได้ และบอกจำนวนล็อตที่ค้าง', async () => {
    const { db, ReferencedError } = await freshModules();
    expect(db.countLotsInLocation('loc-fridge')).toBe(3); // นมสด · โยเกิร์ต · ไข่ไก่ (เนยจืดยอด 0 ไม่นับ)

    let caught;
    try {
      db.deleteLocation('loc-fridge');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ReferencedError);
    expect(caught.kind).toBe('location');
    expect(caught.count).toBe(3);
    expect(caught.message).toContain('3');
    expect(db.listLocations()).toHaveLength(5);
  });

  it('ลบจุดเก็บที่ว่างได้ และลบหมวดหมู่ที่มีสินค้าอ้างไม่ได้', async () => {
    const { db, ReferencedError } = await freshModules();
    const empty = db.addLocation('ระเบียง');
    expect(db.countLotsInLocation(empty.id)).toBe(0);
    expect(db.deleteLocation(empty.id)).toBe(true);
    expect(db.listLocations()).toHaveLength(5);

    expect(db.countProductsInCategory('cat-ready')).toBe(2);
    expect(() => db.deleteCategory('cat-ready')).toThrow(ReferencedError);
  });

  it('R002 · พักใช้ได้แม้มีของ · ของเดิมอยู่ครบ · รับของใหม่เข้าที่พักใช้ไม่ได้', async () => {
    const { db, ValidationError } = await freshModules();
    expect(db.listLocations().every((entry) => entry.isActive === true)).toBe(true);
    expect(db.listLocations({ activeOnly: true })).toHaveLength(5);

    db.setLocationActive('loc-fridge', false);
    expect(db.listLocations()).toHaveLength(5);
    expect(db.listLocations({ activeOnly: true })).toHaveLength(4);
    expect(db.countLotsInLocation('loc-fridge')).toBe(3);
    expect(() =>
      db.receiveStock({ name: 'ของใหม่', quantity: 1, unit: 'ชิ้น', locationId: 'loc-fridge' }),
    ).toThrow(ValidationError);

    db.setLocationActive('loc-fridge', true);
    expect(db.listLocations({ activeOnly: true })).toHaveLength(5);

    db.setCategoryActive('cat-ready', false);
    expect(db.listCategories({ activeOnly: true })).toHaveLength(3);
    expect(() =>
      db.receiveStock({ name: 'ขนมใหม่', quantity: 1, unit: 'ชิ้น', locationId: 'loc-shelf', categoryId: 'cat-ready' }),
    ).toThrow(ValidationError);
    db.setCategoryActive('cat-ready', true);
    expect(() => db.setLocationActive('loc-ไม่มีอยู่', false)).toThrow('ไม่พบจุดเก็บนี้');
  });

  it('เพิ่ม/แก้ชื่อซ้ำไม่ได้ และชื่อว่างไม่ผ่าน', async () => {
    const { db, ValidationError } = await freshModules();
    expect(() => db.addLocation('ตู้เย็น')).toThrow(ValidationError);
    expect(() => db.addLocation('   ')).toThrow(ValidationError);
    expect(() => db.renameLocation('loc-shelf', 'ตู้เย็น')).toThrow(ValidationError);
    expect(db.renameLocation('loc-shelf', 'ชั้นวาง').name).toBe('ชั้นวาง');
    expect(() => db.addCategory('พร้อมกิน')).toThrow(ValidationError);
    expect(() => db.deleteCategory('cat-ไม่มีอยู่')).toThrow('ไม่พบหมวดหมู่นี้');
  });
});

describe('db · ย้ายของระหว่างจุดเก็บ (US-009)', () => {
  it('ย้ายทั้งล็อต: ยอดไม่เปลี่ยน + ไม่เขียน movement', async () => {
    const { db } = await freshModules();
    const before = db.listMovements({ lotId: 'lot-rice-1' }).length;
    const moved = db.moveLot('lot-rice-1', 'loc-shelf');
    expect(moved.locationId).toBe('loc-shelf');
    expect(moved.quantity).toBe(2);
    expect(db.listMovements({ lotId: 'lot-rice-1' })).toHaveLength(before);
    expect(db.countLotsInLocation('loc-pantry')).toBe(0);
  });

  it('ย้ายบางส่วน: ล็อตเดิมลด + ล็อตปลายทางเพิ่ม + มี movement คู่', async () => {
    const { db } = await freshModules();
    const target = db.moveLot('lot-rice-1', 'loc-shelf', 1);
    expect(db.getLot('lot-rice-1').quantity).toBe(1);
    expect(target.quantity).toBe(1);
    expect(target.expiryDate).toBeNull();
    expect(db.listMovements({ lotId: 'lot-rice-1' }).at(-1)).toMatchObject({ type: 'out', delta: -1 });
    expect(db.listMovements({ lotId: target.id }).at(-1)).toMatchObject({ type: 'in', delta: 1 });
  });

  it('ย้ายบางส่วนไปจุดที่มี batch เดียวกันอยู่แล้ว → รวมเข้าล็อตเดิม', async () => {
    const { db } = await freshModules();
    db.receiveStock({ name: 'ข้าวสาร', quantity: 5, unit: 'ถุง', locationId: 'loc-shelf' });
    const shelfLot = db.listLots({ locationId: 'loc-shelf' }).find((lot) => lot.productId === 'prod-rice');
    const merged = db.moveLot('lot-rice-1', 'loc-shelf', 1);
    expect(merged.id).toBe(shelfLot.id);
    expect(merged.quantity).toBe(6);
    expect(db.getLot('lot-rice-1').quantity).toBe(1);
  });

  it('ปลายทางไม่มี/พักใช้/จำนวนเกิน → ValidationError · ย้ายเข้าที่เดิม = ไม่ทำอะไร', async () => {
    const { db, ValidationError } = await freshModules();
    expect(() => db.moveLot('lot-rice-1', 'loc-ไม่มีอยู่')).toThrow(ValidationError);
    expect(() => db.moveLot('lot-ไม่มีอยู่', 'loc-shelf')).toThrow('ไม่พบล็อตนี้');
    db.setLocationActive('loc-shelf', false);
    expect(() => db.moveLot('lot-rice-1', 'loc-shelf')).toThrow(ValidationError);
    expect(() => db.moveLot('lot-rice-1', 'loc-freezer', 99)).toThrow(ValidationError);
    expect(() => db.moveLot('lot-rice-1', 'loc-freezer', 0)).toThrow(ValidationError);
    expect(db.moveLot('lot-rice-1', 'loc-pantry').quantity).toBe(2);
  });
});

describe('db · Units & Shopping', () => {
  it('ensureUnit คืนค่าเดิมถ้ามีอยู่แล้ว และเพิ่มใหม่ครั้งเดียว', async () => {
    const { db, ValidationError } = await freshModules();
    expect(db.ensureUnit('ถ้วย')).toBe('ถ้วย');
    expect(db.ensureUnit('กระสอบ')).toBe('กระสอบ');
    expect(db.ensureUnit('กระสอบ')).toBe('กระสอบ');
    expect(db.listUnits().filter((unit) => unit === 'กระสอบ')).toHaveLength(1);
    expect(() => db.ensureUnit('  ')).toThrow(ValidationError);
  });

  it('เพิ่ม · ติ๊กซื้อแล้ว (ลบ) · ลบรายการที่ต้องซื้อ (US-008)', async () => {
    const { db, ValidationError } = await freshModules();
    const added = db.addShopping('ไข่ไก่เพิ่ม');
    expect(db.listShopping()).toHaveLength(3);

    db.toggleShopping(added.id);
    expect(db.listShopping()).toHaveLength(2);
    expect(db.listShopping().map((entry) => entry.id)).not.toContain(added.id);

    db.removeShopping('seed-shop-1');
    expect(db.listShopping()).toHaveLength(1);

    expect(() => db.addShopping('   ')).toThrow(ValidationError);
    expect(() => db.removeShopping('shop-ไม่มีอยู่')).toThrow('ไม่พบรายการที่ต้องซื้อนี้');
  });
});

describe('db · ความคงอยู่ของข้อมูลและรีเซ็ต', () => {
  it('บันทึกลง localStorage และอยู่ต่อหลังโหลดใหม่ (4.4)', async () => {
    const { db } = await freshModules();
    db.receiveStock({ name: 'ขนมปัง', quantity: 1, unit: 'แพ็ก', locationId: 'loc-pantry' });

    const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    expect(saved.products).toHaveLength(11);
    expect(saved.schemaVersion).toBe(2);

    vi.resetModules();
    const reloaded = await import('./db.js');
    expect(reloaded.listProducts()).toHaveLength(11);
    expect(reloaded.listProducts().map((product) => product.name)).toContain('ขนมปัง');
  });

  it('resetToSeed คืนค่าข้อมูลตัวอย่างทั้งชุด (OQ-11)', async () => {
    const { db } = await freshModules();
    db.receiveStock({ name: 'ของเพิ่ม', quantity: 1, unit: 'ชิ้น', locationId: 'loc-shelf' });
    db.addShopping('ของเพิ่ม');
    expect(db.listProducts()).toHaveLength(11);

    db.resetToSeed();
    expect(db.listProducts()).toHaveLength(10);
    expect(db.listLots({ activeOnly: true })).toHaveLength(8);
    expect(db.listShopping()).toHaveLength(2);
    expect(db.listProducts().map((product) => product.id)).toContain('prod-milk');
  });

  it('resetToSeed เก็บสำเนาข้อมูลเดิมไว้ แล้วกู้คืนกลับมาได้ทั้งชุด (D8)', async () => {
    const { db, store } = await freshModules();
    db.receiveStock({ name: 'ขนมปัง', quantity: 1, unit: 'แพ็ก', locationId: 'loc-pantry' });
    expect(db.listProducts()).toHaveLength(11);

    db.resetToSeed();
    expect(db.listProducts()).toHaveLength(10);
    expect(db.backupInfo()).toMatchObject({ reason: 'manual' });

    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });
    const restored = db.restoreBackup();
    unsubscribe();

    expect(restored.ok).toBe(true);
    expect(notified).toBe(1); // จอวาดใหม่หลังกู้คืน
    expect(db.listProducts()).toHaveLength(11);
    expect(db.listProducts().map((product) => product.name)).toContain('ขนมปัง');
  });

  it('ยังไม่มีสำเนา → กู้คืนไม่สำเร็จ และข้อมูลปัจจุบันยังอยู่ครบ', async () => {
    const { db } = await freshModules();
    expect(db.backupInfo()).toBeNull();
    expect(db.restoreBackup()).toEqual({ ok: false, reason: 'missing' });
    expect(db.listProducts()).toHaveLength(10);
    expect(db.listLots({ activeOnly: true })).toHaveLength(8);
  });

  it('store แจ้ง subscriber ทุกครั้งที่ commit และเลิกแจ้งเมื่อ unsubscribe', async () => {
    const { db, store } = await freshModules();
    const seen = [];
    const unsubscribe = store.subscribe((state) => seen.push(state.products.length));

    db.receiveStock({ name: 'ของใหม่', quantity: 1, unit: 'ชิ้น', locationId: 'loc-shelf' });
    expect(seen).toEqual([11]);
    expect(store.getState().products).toHaveLength(11);

    unsubscribe();
    db.receiveStock({ name: 'ของใหม่ 2', quantity: 1, unit: 'ชิ้น', locationId: 'loc-shelf' });
    expect(seen).toEqual([11]);
  });
});
