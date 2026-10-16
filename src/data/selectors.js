/**
 * data/selectors.js — ฟังก์ชันอนุพัทธ์ (คำนวณล้วน) ตามดีไซน์ข้อ 3.4
 *
 * กฎเหล็ก: ฟังก์ชันในไฟล์นี้ "ไม่แก้ข้อมูล" และ "ไม่แตะ localStorage"
 * จึงเทสต์ได้ตรง ๆ โดยไม่ต้องมี state (OQ-R8 · Vitest)
 *
 * สคีมา v2: หน่วยที่ถือวันหมดอายุ/จำนวน คือ "ล็อต (Lot)"
 * แต่ helper กลุ่มวันหมดอายุใช้กับอะไรก็ได้ที่มี `expiryDate` (ล็อต หรือ รายการ ที่มีรูปเดียวกัน)
 */

/** เกณฑ์ "ใกล้หมดอายุ" — US-005: เหลือ ≤ 3 วัน = เหลือง */
export const EXPIRING_THRESHOLD_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

/** Date → 'YYYY-MM-DD' ตามเวลาเครื่อง (ไม่ใช้ toISOString เพราะวันที่จะเพี้ยนข้ามโซน) */
export function toDateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayDateOnly(now = new Date()) {
  return toDateOnly(now);
}

/** 'YYYY-MM-DD' → Date ที่เที่ยงคืนท้องถิ่น (คืน null ถ้ารูปแบบ/ค่าช่วงไม่ถูกต้อง เช่น 2026-02-30) */
export function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const matched = DATE_ONLY_RE.exec(value.trim());
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const date = new Date(year, month - 1, day);

  const isValid =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? date : null;
}

/** บวก/ลบวันบนวันที่ล้วน แล้วคืน 'YYYY-MM-DD' (ใช้ตอนสร้าง seed) */
export function addDaysToDateOnly(dateOnly, days) {
  const date = parseDateOnly(dateOnly);
  if (!date) return null;
  date.setDate(date.getDate() + Number(days));
  return toDateOnly(date);
}

/** จำนวนวันที่เหลือ (ติดลบ = เลยวันมาแล้ว) · null = ไม่ได้กรอกวันหมดอายุ */
export function daysLeft(item, now = new Date()) {
  const expiry = parseDateOnly(item && item.expiryDate);
  if (!expiry) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry.getTime() - today.getTime()) / MS_PER_DAY);
}

/** 'expired' | 'expiring' | 'fresh' | 'none' — คำนวณสด ไม่เก็บในข้อมูล (ดีไซน์ข้อ 2.4) */
export function expiryStatus(item, now = new Date()) {
  const days = daysLeft(item, now);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= EXPIRING_THRESHOLD_DAYS) return 'expiring';
  return 'fresh';
}

/**
 * ข้อความไทยที่ใช้ "คู่กับสีเสมอ" (ข้อ 4.2) — ถ้อยคำยึดตามแบบร่าง UX/UI ข้อ 3
 * 'none' ไม่มีป้าย จึงคืนสตริงว่าง
 */
export function expiryLabel(item, now = new Date()) {
  const days = daysLeft(item, now);
  if (days === null) return '';
  if (days < 0) return `หมดอายุแล้ว · เลย ${Math.abs(days)} วัน`;
  if (days === 0) return 'ใกล้หมดอายุ · ครบกำหนดวันนี้';
  if (days <= EXPIRING_THRESHOLD_DAYS) return `ใกล้หมดอายุ · เหลือ ${days} วัน`;
  return `อีก ${days} วัน`;
}

/* ---------------------------------------------------------------- ล็อต (Lot) */

/** ยอดรวมของล็อตชุดหนึ่ง (นับเฉพาะที่ > 0) */
export function totalQuantity(lots) {
  return (lots || []).reduce((sum, lot) => {
    const value = Number(lot?.quantity);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

/** ล็อตที่ยังมียอดคงเหลือ */
export function activeLots(lots) {
  return (lots || []).filter((lot) => Number(lot?.quantity) > 0);
}

/** ล็อตที่ยอดเป็น 0 (ของที่ใช้หมดแล้ว) */
export function emptyLots(lots) {
  return (lots || []).filter((lot) => Number(lot?.quantity) <= 0);
}

/**
 * ยอด "จำนวนเดิม" ของล็อต = ยอดก่อนที่ล็อตนั้นจะกลายเป็น 0 (D10 · คำตอบ ข.)
 *
 * ไล่ Movement ของล็อตเดียวตามลำดับเวลา (เทียบ `at` แล้วตามลำดับในอาร์เรย์)
 * แล้วจำยอดก่อนตัวที่ทำให้ยอดเป็น 0 · ถ้ามีการรับของกลับเข้า (`in`/`restore`) จนมียอดอีกครั้ง = ยอดเดิมถูกล้างเป็น 0
 * ใช้สองที่: เติมฟิลด์ที่ขาดตอน normalize และตอนกด "คำนวณใหม่จากประวัติ" ในหน้าตั้งค่า
 */
export function usedUpQuantityFromMovements(movements) {
  const ordered = (movements || [])
    .map((movement, index) => ({ movement, index }))
    .filter(({ movement }) => Number.isFinite(Number(movement?.delta)))
    .sort((a, b) => {
      const atA = String(a.movement?.at ?? '');
      const atB = String(b.movement?.at ?? '');
      if (atA !== atB) return atA.localeCompare(atB);
      return a.index - b.index;
    });

  let balance = 0;
  let usedUpQuantity = 0;
  for (const { movement } of ordered) {
    const before = balance;
    balance += Number(movement.delta);
    usedUpQuantity = balance > 0 ? 0 : Math.max(0, before);
  }
  return balance > 0 ? 0 : usedUpQuantity;
}

/**
 * เรียงล็อตแบบ FEFO (หมดอายุใกล้สุดก่อน) — ของที่ไม่ระบุวันหมดอายุไปท้ายสุด
 * แล้วตัดด้วย createdAt/id เพื่อให้ผลคงที่ (เทสต์ซ้ำได้)
 */
export function sortLotsByFEFO(lots) {
  return (lots || [])
    .slice()
    .sort((a, b) => {
      const ea = parseDateOnly(a && a.expiryDate);
      const eb = parseDateOnly(b && b.expiryDate);
      if (ea && eb && ea.getTime() !== eb.getTime()) return ea.getTime() - eb.getTime();
      if (ea && !eb) return -1;
      if (!ea && eb) return 1;
      const ca = String((a && a.createdAt) || '');
      const cb = String((b && b.createdAt) || '');
      if (ca !== cb) return ca.localeCompare(cb);
      return String((a && a.id) || '').localeCompare(String((b && b.id) || ''));
    });
}

/**
 * เลือกล็อตที่จะหักแบบ FEFO — คืน [{ lot, take }]
 * ใช้ตอน "ทยอยใช้": ของที่หมดอายุใกล้สุดถูกหักก่อนเสมอ
 */
export function pickLotsForConsumption(lots, quantity) {
  const picks = [];
  let remaining = Number(quantity) || 0;
  if (remaining <= 0) return picks;

  for (const lot of sortLotsByFEFO(activeLots(lots))) {
    if (remaining <= 0) break;
    const take = Math.min(Number(lot.quantity) || 0, remaining);
    if (take <= 0) continue;
    picks.push({ lot, take });
    remaining -= take;
  }
  return picks;
}

/** ล็อตที่หมดอายุใกล้สุดในกลุ่ม (อิงวันหมดอายุเท่านั้น) */
export function nearestExpiryLot(lots) {
  const withExpiry = sortLotsByFEFO(lots).filter((lot) => parseDateOnly(lot && lot.expiryDate));
  return withExpiry[0] ?? null;
}

/** รวมของหมดอายุ + ใกล้หมดอายุ (เฉพาะล็อตที่ยังมีของ) — US-005 */
export function expiringLots(lots, now = new Date()) {
  return activeLots(lots).filter((lot) => {
    const status = expiryStatus(lot, now);
    return status === 'expired' || status === 'expiring';
  });
}

/** สรุปสั้น ๆ ตอนเปิดแอป (US-005) — ใช้กับแถบสรุปใน R006 */
export function expiringSummary(lots, now = new Date()) {
  let expired = 0;
  let expiring = 0;
  for (const lot of activeLots(lots)) {
    const status = expiryStatus(lot, now);
    if (status === 'expired') expired += 1;
    else if (status === 'expiring') expiring += 1;
  }
  return { expired, expiring, total: expired + expiring };
}

/* --------------------------------------------- จัดกลุ่มเป็น "สินค้า" เพื่อแสดงจอ */

/**
 * จัดล็อตเข้าสินค้า → หนึ่งแถวต่อหนึ่งสินค้า (ไม่ให้ของซ้ำหลายแถว)
 * @returns {{ product, lots, activeLots, total }[]}
 */
export function groupByProduct(products, lots) {
  const all = lots || [];
  return (products || []).map((product) => {
    const productLots = all.filter((lot) => lot.productId === product.id);
    const active = activeLots(productLots);
    return { product, lots: productLots, activeLots: active, total: totalQuantity(active) };
  });
}

/**
 * ค้นหา/กรองแถวที่ได้จาก groupByProduct (US-002)
 * - query: ค้นชื่อสินค้า + หมายเหตุ
 * - locationId: ต้องมีล็อตที่ยังมีของอยู่ในจุดเก็บนั้น
 * - categoryId: หมวดหมู่ของสินค้า
 */
export function filterStockRows(rows, filters = {}) {
  const { query = '', locationId = '', categoryId = '' } = filters;
  const needle = String(query).trim().toLowerCase();
  return (rows || []).filter((row) => {
    const { product, activeLots: active } = row;
    if (categoryId && product.categoryId !== categoryId) return false;
    if (locationId && !active.some((lot) => lot.locationId === locationId)) return false;
    if (!needle) return true;
    const name = String(product.name || '').toLowerCase();
    const note = String(product.note || '').toLowerCase();
    return name.includes(needle) || note.includes(needle);
  });
}
