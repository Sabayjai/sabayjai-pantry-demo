import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date(2026, 9, 16, 12, 0, 0);

async function freshModules() {
  vi.resetModules();
  globalThis.localStorage.clear();
  const storage = await import('./storage.js');
  const seed = await import('./seed.js');
  return { storage, seed };
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('storage · ค่าคงที่', () => {
  it('ใช้คีย์เดียวและ schemaVersion ปัจจุบัน (v2)', async () => {
    const { storage } = await freshModules();
    expect(storage.STORAGE_KEY).toBe('sabayjai-pantry');
    expect(storage.SCHEMA_VERSION).toBe(2);
  });
});

describe('storage · loadState', () => {
  it('ที่เก็บว่าง → เขียน seed ลงไปแล้วคืน seed (เปิดแอปครั้งแรกมีข้อมูลพร้อมใช้)', async () => {
    const { storage } = await freshModules();
    const state = storage.loadState();

    expect(state.products).toHaveLength(10);
    expect(state.lots).toHaveLength(10);
    expect(state.shopping).toHaveLength(2);
    expect(globalThis.localStorage.getItem(storage.STORAGE_KEY)).not.toBeNull();
  });

  it('ข้อมูล JSON พัง → คืน seed แทนที่จะพังทั้งแอป', async () => {
    const { storage } = await freshModules();
    globalThis.localStorage.setItem(storage.STORAGE_KEY, '{ไม่ใช่ json');
    expect(storage.loadState().lots).toHaveLength(10);
  });

  it('ข้อมูลจากแอปเวอร์ชันใหม่กว่า / ไม่มี schemaVersion → คืน seed', async () => {
    const { storage } = await freshModules();
    globalThis.localStorage.setItem(storage.STORAGE_KEY, JSON.stringify({ schemaVersion: 99, products: [] }));
    expect(storage.loadState().products).toHaveLength(10);

    globalThis.localStorage.setItem(storage.STORAGE_KEY, JSON.stringify({ products: [] }));
    expect(storage.loadState().products).toHaveLength(10);
  });
});

describe('storage · saveState / resetToSeed', () => {
  it('saveState + loadState ไป-กลับได้ข้อมูลเดิมครบถ้วน', async () => {
    const { storage, seed } = await freshModules();
    const state = seed.createSeed(NOW);
    state.products[0].note = 'ทดสอบบันทึก';

    storage.saveState(state);
    const loaded = storage.loadState();

    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.products).toHaveLength(10);
    expect(loaded.products[0].note).toBe('ทดสอบบันทึก');
    expect(loaded.lots).toHaveLength(10);
    expect(loaded.locations).toHaveLength(5);
    expect(loaded.units).toContain('ถ้วย');
    expect(loaded.meta.seededAt).toBe(state.meta.seededAt);
  });

  it('resetToSeed เขียนทับข้อมูลที่แก้ไปแล้วด้วย seed ชุดใหม่', async () => {
    const { storage, seed } = await freshModules();
    const edited = seed.createSeed(NOW);
    edited.products = edited.products.slice(0, 2);
    storage.saveState(edited);
    expect(storage.loadState().products).toHaveLength(2);

    const fresh = storage.resetToSeed();
    expect(fresh.products).toHaveLength(10);
    expect(storage.loadState().products).toHaveLength(10);
  });
});

describe('storage · migrate / normalizeState', () => {
  it('ข้อมูลที่ไม่ใช่ object หรือมีเวอร์ชันใหม่กว่า = ใช้ไม่ได้', async () => {
    const { storage } = await freshModules();
    expect(() => storage.migrate(null)).toThrow();
    expect(() => storage.migrate('ข้อความ')).toThrow();
    expect(() => storage.migrate([])).toThrow();
    expect(() => storage.migrate({})).toThrow();
    expect(() => storage.migrate({ schemaVersion: 99 })).toThrow();
  });

  it('สคีมา v1 (items/usedUp) → v2: รวมสินค้าซ้ำ สร้างล็อต + movement', async () => {
    const { storage } = await freshModules();
    const v1 = {
      schemaVersion: 1,
      meta: { seededAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      locations: [{ id: 'loc-fridge', name: 'ตู้เย็น', createdAt: '2026-01-01T00:00:00.000Z' }],
      categories: [],
      units: ['กล่อง'],
      items: [
        { id: 'i1', name: 'นมสด', unit: 'กล่อง', quantity: 2, locationId: 'loc-fridge', categoryId: null, expiryDate: '2026-10-20', note: '', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'i2', name: 'นมสด', unit: 'กล่อง', quantity: 1, locationId: 'loc-fridge', categoryId: null, expiryDate: '2026-10-25', note: '' },
      ],
      usedUp: [
        { id: 'u1', name: 'เนยจืด', unit: 'ก้อน', quantity: 1, locationId: 'loc-fridge', categoryId: null, expiryDate: null, usedUpAt: '2026-01-02T00:00:00.000Z' },
      ],
      shopping: [],
    };

    const migrated = storage.migrate(v1);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.items).toBeUndefined();
    expect(migrated.usedUp).toBeUndefined();
    expect(migrated.products).toHaveLength(2); // นมสด (รวม 2 แถวเป็นสินค้าเดียว) + เนยจืด
    expect(migrated.lots).toHaveLength(3);
    expect(migrated.movements).toHaveLength(4); // in 2 + (in 1 + out 1)

    const milk = migrated.products.find((product) => product.name === 'นมสด');
    expect(migrated.lots.filter((lot) => lot.productId === milk.id)).toHaveLength(2);

    const butterLot = migrated.lots.find((lot) => lot.productId !== milk.id);
    expect(butterLot.quantity).toBe(0); // ของที่ใช้หมดแล้ว → ยอด 0
    expect(butterLot.usedUpQuantity).toBe(1); // ยอดเดิมเติมจากประวัติ (D10 · ข.)
    expect(migrated.meta.seededAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('สคีมา v2 ที่ขาดคอลเลกชัน → เติมให้ครบโครง', async () => {
    const { storage } = await freshModules();
    const migrated = storage.migrate({ schemaVersion: 2 });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.products).toEqual([]);
    expect(migrated.lots).toEqual([]);
    expect(migrated.movements).toEqual([]);
    expect(migrated.locations).toEqual([]);
    expect(migrated.categories).toEqual([]);
    expect(migrated.units).toEqual([]);
    expect(migrated.shopping).toEqual([]);
    expect(typeof migrated.meta.seededAt).toBe('string');
  });
});

describe('storage · ข้อมูลพังไม่ถูกทิ้งเงียบ ๆ (D8)', () => {
  it('ข้อมูล JSON พัง → เก็บข้อความเดิมไว้ที่คีย์สำรอง (กู้คืนไม่ได้ แต่ไม่หาย)', async () => {
    const { storage } = await freshModules();
    globalThis.localStorage.setItem(storage.STORAGE_KEY, '{ไม่ใช่ json');

    expect(storage.loadState().products).toHaveLength(10); // คืน seed
    expect(storage.readBackupInfo()).toMatchObject({ reason: 'broken' });
    expect(storage.restoreBackup()).toEqual({ ok: false, reason: 'broken' });
    expect(storage.loadState().products).toHaveLength(10);
  });

  it('ย้ายของเดิมไปคีย์สำรองก่อนรีเซ็ต แล้วกู้คืนกลับมาได้ทั้งก้อน', async () => {
    const { storage, seed } = await freshModules();
    const edited = seed.createSeed(NOW);
    edited.products[0].note = 'ของเดิมของฉัน';
    edited.shopping = [];
    storage.saveState(edited);

    storage.resetToSeed('manual');
    expect(storage.loadState().products[0].note).toBe(''); // ได้ seed ใหม่
    expect(storage.readBackupInfo()).toMatchObject({ reason: 'manual' });

    const restored = storage.restoreBackup();
    expect(restored.ok).toBe(true);
    const back = storage.loadState();
    expect(back.products[0].note).toBe('ของเดิมของฉัน');
    expect(back.shopping).toHaveLength(0);
  });

  it('ที่เก็บว่างครั้งแรก → ไม่มีอะไรให้สำรอง · ยังไม่มีสำเนา → กู้คืนไม่สำเร็จ', async () => {
    const { storage } = await freshModules();
    storage.loadState();
    expect(storage.readBackupInfo()).toBeNull();
    expect(storage.restoreBackup()).toEqual({ ok: false, reason: 'missing' });
  });

  it('สำเนาที่มาจากแอปเวอร์ชันใหม่กว่า → กู้คืนไม่ได้ และไม่เขียนทับข้อมูลปัจจุบัน', async () => {
    const { storage } = await freshModules();
    globalThis.localStorage.setItem(
      storage.BACKUP_KEY,
      JSON.stringify({ savedAt: '2026-10-16T00:00:00.000Z', reason: 'manual', raw: JSON.stringify({ schemaVersion: 99 }) }),
    );

    expect(storage.restoreBackup()).toEqual({ ok: false, reason: 'unsupported' });
    expect(globalThis.localStorage.getItem(storage.STORAGE_KEY)).toBeNull();
  });
});

describe('storage · ตรวจรูปร่างข้อมูลรายฟิลด์ (D9)', () => {
  const broken = {
    schemaVersion: 2,
    meta: { seededAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' },
    locations: [{ id: 'loc-fridge', name: 'ตู้เย็น' }, { id: 'loc-fridge', name: 'id ซ้ำ' }, { name: 'ไม่มี id' }, 'ข้อความ'],
    categories: [{ id: 'cat-ready', name: 'พร้อมกิน' }],
    units: ['กล่อง', 'กล่อง', '   ', 42],
    products: [
      { id: 'prod-milk', name: 'นมสด', unit: 'กล่อง', categoryId: 'cat-ที่ไม่มีอยู่', note: 7 },
      { id: 'prod-no-unit', name: 'ไม่รู้หน่วย' },
    ],
    lots: [
      { id: 'lot-1', productId: 'prod-milk', locationId: 'loc-ที่ไม่มีอยู่', quantity: '3', expiryDate: '2026-02-30' },
      { id: 'lot-2', productId: 'prod-ที่ไม่มีอยู่', quantity: 1 },
      { id: 'lot-3', productId: 'prod-milk', quantity: 'ไม่ใช่ตัวเลข' },
    ],
    movements: [
      { id: 'mv-1', lotId: 'lot-1', type: 'in', delta: 3, balanceAfter: 3, at: '2026-10-01T00:00:00.000Z' },
      { lotId: 'lot-1', type: 'ไม่รู้จัก', delta: 1, at: '2026-10-02T00:00:00.000Z' },
      { id: 'mv-3', lotId: 'lot-ที่ไม่มีอยู่', type: 'in', delta: 1 },
    ],
    shopping: [{ id: 'shop-1', text: 'น้ำตาล' }, { text: 'ไม่มี id' }],
  };

  it('ตัด/ซ่อมเฉพาะรายการที่เพี้ยน · เก็บของที่ถูกต้องไว้', async () => {
    const { storage } = await freshModules();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const state = storage.normalizeState(broken);

    expect(state.locations.map((location) => location.id)).toEqual(['loc-fridge']);
    expect(state.units).toEqual(['กล่อง']);
    expect(state.products.map((product) => product.id)).toEqual(['prod-milk']);
    expect(state.products[0].categoryId).toBeNull(); // หมวดหมู่ที่ไม่มีอยู่ → ไม่ระบุ
    expect(state.products[0].note).toBe(''); // note ที่ไม่ใช่ข้อความ → ''

    expect(state.lots.map((lot) => lot.id)).toEqual(['lot-1']);
    expect(state.lots[0].quantity).toBe(3); // '3' → 3
    expect(state.lots[0].expiryDate).toBeNull(); // 2026-02-30 ไม่มีจริง → ไม่ระบุวัน
    expect(state.lots[0].locationId).toBeNull(); // จุดเก็บที่ไม่มีอยู่ → ไม่ระบุ

    expect(state.movements).toHaveLength(2); // ประวัติกำพร้าถูกตัด
    expect(state.movements[1].type).toBe('adjust'); // type ที่ไม่รู้จัก → adjust
    expect(state.movements[1].id).toMatch(/^mv-recovered-/); // รหัสหาย → ออกใหม่

    expect(state.shopping.map((entry) => entry.id)).toEqual(['shop-1']);
    expect(warn).toHaveBeenCalled(); // บอกให้รู้ว่าซ่อมอะไรไป ไม่เงียบ
  });

  it('ล็อตยอด 0 ที่ขาด usedUpQuantity → เติมจากประวัติ · ค่าที่ถูกต้องอยู่แล้วไม่ถูกทับ (D10)', async () => {
    const { storage } = await freshModules();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const state = storage.normalizeState({
      schemaVersion: 2,
      locations: [{ id: 'loc-fridge', name: 'ตู้เย็น' }],
      categories: [],
      units: [],
      products: [{ id: 'prod-butter', name: 'เนยจืด', unit: 'ก้อน' }],
      lots: [
        { id: 'lot-filled', productId: 'prod-butter', quantity: 0 },
        { id: 'lot-kept', productId: 'prod-butter', quantity: 0, usedUpQuantity: 9 },
      ],
      movements: [
        { id: 'mv-in', lotId: 'lot-filled', type: 'in', delta: 2, balanceAfter: 2, at: '2026-10-01T00:00:00.000Z' },
        { id: 'mv-out', lotId: 'lot-filled', type: 'out', delta: -2, balanceAfter: 0, at: '2026-10-02T00:00:00.000Z' },
      ],
      shopping: [],
    });

    expect(state.lots.find((lot) => lot.id === 'lot-filled').usedUpQuantity).toBe(2);
    expect(state.lots.find((lot) => lot.id === 'lot-kept').usedUpQuantity).toBe(9);
  });
});
