/**
 * test-setup.js — เตรียมสภาพแวดล้อมให้เทสต์ (OQ-R8 · Vitest)
 *
 * Node ไม่มี localStorage ในตัว จึงติดตั้งตัวจำลองในหน่วยความจำให้ทุกไฟล์เทสต์
 * (ตัวแอปจริงใช้ localStorage ของเบราว์เซอร์ — see src/data/storage.js)
 */
import { beforeEach } from 'vitest';

export function createMemoryLocalStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: (key) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    },
  };
}

globalThis.localStorage = createMemoryLocalStorage();

beforeEach(() => {
  globalThis.localStorage.clear();
});
