import { describe, expect, it } from 'vitest';
import {
  EXPIRING_THRESHOLD_DAYS,
  activeLots,
  addDaysToDateOnly,
  daysLeft,
  emptyLots,
  expiringLots,
  expiringSummary,
  expiryLabel,
  expiryStatus,
  filterStockRows,
  groupByProduct,
  nearestExpiryLot,
  parseDateOnly,
  pickLotsForConsumption,
  sortLotsByFEFO,
  toDateOnly,
  totalQuantity,
  usedUpQuantityFromMovements,
} from './selectors.js';
import { createSeed } from './seed.js';

/** เวลาอ้างอิงคงที่: 16 ต.ค. 2026 (เลือก 15:30 เพื่อยืนยันว่าเวลาในวันไม่ทำให้ผลเปลี่ยน) */
const NOW = new Date(2026, 9, 16, 15, 30, 0);

function makeLot(overrides = {}) {
  return {
    id: 'lot-test',
    productId: 'prod-test',
    locationId: 'loc-fridge',
    quantity: 1,
    expiryDate: null,
    createdAt: '2026-10-16T00:00:00.000Z',
    ...overrides,
  };
}

function makeProduct(overrides = {}) {
  return {
    id: 'prod-test',
    name: 'ของทดสอบ',
    unit: 'ชิ้น',
    categoryId: null,
    note: '',
    createdAt: '2026-10-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('selectors · วันที่', () => {
  it('toDateOnly ใช้เวลาท้องถิ่น ไม่เพี้ยนข้ามโซน', () => {
    expect(toDateOnly(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
    expect(toDateOnly(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
    expect(toDateOnly(new Date('ไม่ใช่วันที่'))).toBeNull();
  });

  it('parseDateOnly รับเฉพาะรูปแบบ ปี-เดือน-วัน และค่าวันที่จริง', () => {
    expect(parseDateOnly('2026-10-16')).toBeInstanceOf(Date);
    expect(parseDateOnly('2026-02-30')).toBeNull(); // วันที่ไม่มีจริง
    expect(parseDateOnly('2026-13-01')).toBeNull(); // เดือนเกิน
    expect(parseDateOnly('16/10/2026')).toBeNull();
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
  });

  it('addDaysToDateOnly บวก/ลบวันข้ามเดือนได้', () => {
    expect(addDaysToDateOnly('2026-10-16', 2)).toBe('2026-10-18');
    expect(addDaysToDateOnly('2026-10-16', -1)).toBe('2026-10-15');
    expect(addDaysToDateOnly('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToDateOnly('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToDateOnly('ไม่ใช่วันที่', 1)).toBeNull();
  });
});

describe('selectors · สถานะหมดอายุของล็อต (US-005)', () => {
  it('เกณฑ์ใกล้หมดอายุคือ 3 วัน', () => {
    expect(EXPIRING_THRESHOLD_DAYS).toBe(3);
  });

  it('daysLeft คืนจำนวนวันที่เหลือ · null เมื่อไม่ระบุวันหมดอายุ', () => {
    expect(daysLeft(makeLot({ expiryDate: null }), NOW)).toBeNull();
    expect(daysLeft(makeLot({ expiryDate: '2026-10-16' }), NOW)).toBe(0);
    expect(daysLeft(makeLot({ expiryDate: '2026-10-18' }), NOW)).toBe(2);
    expect(daysLeft(makeLot({ expiryDate: '2026-10-15' }), NOW)).toBe(-1);
  });

  it('expiryStatus แยก expired / expiring / fresh / none ตามขอบเกณฑ์', () => {
    expect(expiryStatus(makeLot({ expiryDate: null }), NOW)).toBe('none');
    expect(expiryStatus(makeLot({ expiryDate: '2026-10-15' }), NOW)).toBe('expired');
    expect(expiryStatus(makeLot({ expiryDate: '2026-10-16' }), NOW)).toBe('expiring');
    expect(expiryStatus(makeLot({ expiryDate: '2026-10-19' }), NOW)).toBe('expiring'); // 3 วัน = ขอบบน
    expect(expiryStatus(makeLot({ expiryDate: '2026-10-20' }), NOW)).toBe('fresh'); // 4 วัน = หลุดเกณฑ์
  });

  it('expiryLabel เขียนข้อความไทยคู่กับสี (ข้อ 4.2) ตามถ้อยคำในแบบร่าง', () => {
    expect(expiryLabel(makeLot({ expiryDate: '2026-10-15' }), NOW)).toBe('หมดอายุแล้ว · เลย 1 วัน');
    expect(expiryLabel(makeLot({ expiryDate: '2026-10-16' }), NOW)).toBe('ใกล้หมดอายุ · ครบกำหนดวันนี้');
    expect(expiryLabel(makeLot({ expiryDate: '2026-10-17' }), NOW)).toBe('ใกล้หมดอายุ · เหลือ 1 วัน');
    expect(expiryLabel(makeLot({ expiryDate: '2026-11-15' }), NOW)).toBe('อีก 30 วัน');
    expect(expiryLabel(makeLot({ expiryDate: null }), NOW)).toBe('');
  });

  it('expiringLots รวมของหมดอายุ + ใกล้หมดอายุ แต่ข้ามล็อตที่ยอด 0', () => {
    const lots = [
      makeLot({ id: 'a', quantity: 2, expiryDate: '2026-10-15' }),
      makeLot({ id: 'b', quantity: 1, expiryDate: '2026-10-18' }),
      makeLot({ id: 'c', quantity: 0, expiryDate: '2026-10-15' }), // ใช้หมดแล้ว → ไม่นับ
      makeLot({ id: 'd', quantity: 5, expiryDate: null }),
    ];
    expect(expiringLots(lots, NOW).map((lot) => lot.id)).toEqual(['a', 'b']);
    expect(expiringSummary(lots, NOW)).toEqual({ expired: 1, expiring: 1, total: 2 });
  });
});

describe('selectors · ยอดล็อตและ FEFO (ทยอยใช้)', () => {
  it('totalQuantity นับเฉพาะยอดบวก · active/empty แยกถูก', () => {
    const lots = [makeLot({ id: 'a', quantity: 3 }), makeLot({ id: 'b', quantity: 0 }), makeLot({ id: 'c', quantity: -1 })];
    expect(totalQuantity(lots)).toBe(3);
    expect(activeLots(lots).map((lot) => lot.id)).toEqual(['a']);
    expect(emptyLots(lots).map((lot) => lot.id)).toEqual(['b', 'c']);
  });

  it('sortLotsByFEFO เรียงหมดอายุใกล้สุดก่อน และของไม่ระบุวันไปท้ายสุด', () => {
    const lots = [
      makeLot({ id: 'noexpiry', expiryDate: null }),
      makeLot({ id: 'late', expiryDate: '2026-12-01' }),
      makeLot({ id: 'soon', expiryDate: '2026-10-17' }),
      makeLot({ id: 'mid', expiryDate: '2026-10-25' }),
    ];
    expect(sortLotsByFEFO(lots).map((lot) => lot.id)).toEqual(['soon', 'mid', 'late', 'noexpiry']);
  });

  it('pickLotsForConsumption หักล็อตหมดอายุใกล้สุดก่อน และแยกข้ามล็อตเมื่อยอดไม่พอ', () => {
    const lots = [
      makeLot({ id: 'late', quantity: 5, expiryDate: '2026-12-01' }),
      makeLot({ id: 'soon', quantity: 2, expiryDate: '2026-10-17' }),
    ];
    const picks = pickLotsForConsumption(lots, 4);
    expect(picks.map((pick) => [pick.lot.id, pick.take])).toEqual([
      ['soon', 2],
      ['late', 2],
    ]);
    expect(pickLotsForConsumption(lots, 0)).toEqual([]);
  });

  it('nearestExpiryLot เลือกล็อตหมดอายุใกล้สุด (ไม่รวมของที่ไม่ระบุวัน)', () => {
    const lots = [makeLot({ id: 'none', expiryDate: null }), makeLot({ id: 'soon', expiryDate: '2026-10-17' })];
    expect(nearestExpiryLot(lots)?.id).toBe('soon');
    expect(nearestExpiryLot([makeLot({ id: 'none', expiryDate: null })])).toBeNull();
  });
});

describe('selectors · ยอด "จำนวนเดิม" ของล็อตที่หมด (D10 · คำตอบ ข.)', () => {
  const mv = (type, delta, at) => ({ id: `mv-${type}-${at}`, lotId: 'lot-test', type, delta, balanceAfter: 0, at, note: null });

  it('ไม่มีประวัติ หรือล็อตยังมีของเหลือ → 0', () => {
    expect(usedUpQuantityFromMovements([])).toBe(0);
    expect(usedUpQuantityFromMovements(null)).toBe(0);
    expect(
      usedUpQuantityFromMovements([mv('in', 4, '2026-10-01T00:00:00.000Z'), mv('out', -1, '2026-10-05T00:00:00.000Z')]),
    ).toBe(0);
  });

  it('รับเข้าครั้งเดียวแล้วใช้หมด → ยอดเดิม = ยอดที่รับเข้า', () => {
    const history = [mv('in', 3, '2026-10-01T00:00:00.000Z'), mv('out', -3, '2026-10-02T00:00:00.000Z')];
    expect(usedUpQuantityFromMovements(history)).toBe(3);
  });

  it('ทยอยใช้แล้วหมด → ยอดตอนก่อนหักครั้งสุดท้าย (ตรงกับค่าที่ code จำตอนหัก และที่ R005 ใช้ undo)', () => {
    const history = [
      mv('in', 3, '2026-10-01T00:00:00.000Z'),
      mv('out', -1, '2026-10-02T00:00:00.000Z'), // เหลือ 2
      mv('out', -2, '2026-10-03T00:00:00.000Z'), // หักจนหมด → จำ 2
    ];
    expect(usedUpQuantityFromMovements(history)).toBe(2);
  });

  it('หักจากล็อตเดียวจนหมดในครั้งเดียว → ยอดเดิมคือยอดที่รับเข้ามาทั้งก้อน', () => {
    const history = [mv('in', 1, '2026-10-01T00:00:00.000Z'), mv('out', -1, '2026-10-02T00:00:00.000Z')];
    expect(usedUpQuantityFromMovements(history)).toBe(1);
  });

  it('ไม่ยึดลำดับในอาร์เรย์ — ใช้เวลา `at` เป็นหลัก', () => {
    const history = [mv('out', -2, '2026-10-03T00:00:00.000Z'), mv('in', 2, '2026-10-01T00:00:00.000Z')];
    expect(usedUpQuantityFromMovements(history)).toBe(2);
  });

  it('นำกลับเข้าจนมียอดอีกครั้ง → ล้างยอดเดิม แล้วนับรอบใหม่', () => {
    const history = [
      mv('in', 2, '2026-10-01T00:00:00.000Z'),
      mv('out', -2, '2026-10-02T00:00:00.000Z'),
      mv('restore', 1, '2026-10-03T00:00:00.000Z'),
      mv('out', -1, '2026-10-04T00:00:00.000Z'),
    ];
    expect(usedUpQuantityFromMovements(history)).toBe(1);
  });

  it('ข้ามประวัติที่ delta เพี้ยน ไม่ให้ทั้งชุดพัง', () => {
    const history = [
      mv('in', 5, '2026-10-01T00:00:00.000Z'),
      { id: 'mv-broken', lotId: 'lot-test', type: 'out', delta: 'ไม่ใช่ตัวเลข', at: '2026-10-02T00:00:00.000Z' },
      mv('out', -5, '2026-10-03T00:00:00.000Z'),
    ];
    expect(usedUpQuantityFromMovements(history)).toBe(5);
  });
});

describe('selectors · จัดกลุ่มเป็นสินค้า (US-002)', () => {
  const milk = makeProduct({ id: 'prod-milk', name: 'นมสด 1 ลิตร', unit: 'กล่อง', categoryId: 'cat-ready' });
  const rice = makeProduct({ id: 'prod-rice', name: 'ข้าวสาร', unit: 'ถุง', categoryId: 'cat-ingredient', note: 'ซื้อจากตลาดของยาย' });
  const lots = [
    makeLot({ id: 'm1', productId: 'prod-milk', quantity: 1, locationId: 'loc-fridge', expiryDate: '2026-10-18' }),
    makeLot({ id: 'm2', productId: 'prod-milk', quantity: 2, locationId: 'loc-fridge', expiryDate: '2026-10-25' }),
    makeLot({ id: 'r1', productId: 'prod-rice', quantity: 2, locationId: 'loc-pantry' }),
  ];

  it('groupByProduct รวมล็อตของสินค้าเดียวเป็นแถวเดียว (ไม่ให้ของซ้ำ)', () => {
    const rows = groupByProduct([milk, rice], lots);
    expect(rows.map((row) => row.product.id)).toEqual(['prod-milk', 'prod-rice']);
    const milkRow = rows[0];
    expect(milkRow.total).toBe(3); // 1 + 2
    expect(milkRow.activeLots).toHaveLength(2);
  });

  it('filterStockRows ค้นชื่อ/หมายเหตุ และกรองจุดเก็บ/หมวดหมู่พร้อมกันได้', () => {
    const rows = groupByProduct([milk, rice], lots);
    expect(filterStockRows(rows, { query: 'นมสด' }).map((row) => row.product.id)).toEqual(['prod-milk']);
    expect(filterStockRows(rows, { query: 'ของยาย' }).map((row) => row.product.id)).toEqual(['prod-rice']);
    expect(filterStockRows(rows, { locationId: 'loc-pantry' }).map((row) => row.product.id)).toEqual(['prod-rice']);
    expect(filterStockRows(rows, { categoryId: 'cat-ready' }).map((row) => row.product.id)).toEqual(['prod-milk']);
    expect(filterStockRows(rows, { query: 'นมสด', locationId: 'loc-pantry' })).toEqual([]);
    expect(filterStockRows(rows)).toHaveLength(2);
  });
});

describe('selectors · ข้อมูล seed (requirement ข้อ 5.3)', () => {
  it('seed ใส่ usedUpQuantity ของล็อตที่ใช้หมดแล้ว (D10 · คำตอบ ข.)', () => {
    const state = createSeed(NOW);
    const byLot = new Map(state.lots.map((lot) => [lot.id, lot.usedUpQuantity]));
    expect(byLot.get('lot-butter-1')).toBe(1); // เนยจืด — เดิมมี 1 ก้อน
    expect(byLot.get('lot-lime-1')).toBe(3); // มะนาว — เดิมมี 3 ลูก
    expect(byLot.get('lot-rice-1')).toBe(0); // ยังมีของ → ยังไม่เคยหมด
  });

  it('seed ให้สถานะเหลือง 2 และแดง 1 ทันทีที่สร้าง (นับจากล็อตที่มีของ)', () => {
    const state = createSeed(NOW);
    expect(state.products).toHaveLength(10); // 8 ของในสต็อก + 2 ของที่ใช้หมดแล้ว
    expect(activeLots(state.lots)).toHaveLength(8);

    const summary = expiringSummary(state.lots, NOW);
    expect(summary).toEqual({ expired: 1, expiring: 2, total: 3 });

    const expired = activeLots(state.lots).filter((lot) => expiryStatus(lot, NOW) === 'expired');
    const productNames = expired.map((lot) => state.products.find((p) => p.id === lot.productId)?.name);
    expect(productNames).toEqual(['ผักกาดขาว']);
  });
});
