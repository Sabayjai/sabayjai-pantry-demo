/**
 * sw.js — service worker ของ SabayJai Pantry (R008 · NFR 4.4/4.5)
 *
 * งานมีอย่างเดียว: ทำให้ "เปิดซ้ำแบบออฟไลน์ได้" — ข้อมูลอยู่ใน localStorage
 * อยู่แล้ว ที่ต้องแคชคือตัวแอป (app shell) เท่านั้น
 *
 * กลยุทธ์:
 * - ติดตั้ง: เก็บไฟล์หลัก (./ · index.html · manifest · ไอคอน) ล่วงหน้า
 * - หน้า (navigation): network-first → ล้มแล้วใช้ index.html จากแคช
 *   (hash routing อ่านเส้นทางจาก # เอง จึงเสิร์ฟหน้าเดียวได้ทุกเส้นทาง)
 * - ไฟล์อื่นของแอป (JS/CSS/ไอคอน): cache-first + เติมแคชตอนผ่านมา
 *   (ชื่อไฟล์ asset ของ Vite มี hash ติดมาด้วย จึงไม่ต้องกลัวของเก่าค้าง)
 * - นอกเหนือจากนี้ (POST · ข้าม origin · chrome-extension): ปล่อยผ่าน ไม่แตะ
 */
const CACHE = 'sabayjai-pantry-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // ไฟล์ไหนโหลดไม่ผ่าน (เช่น เปิด dev ที่ยังไม่มีไฟล์นั้น) ข้ามไป ไม่ล้มทั้งรอบ
        Promise.allSettled(CORE.map((url) => cache.add(new Request(url, { cache: 'reload' })))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // เปลี่ยนหน้า/รีเฟรช: ขอของสดก่อน ออฟไลน์ค่อยใช้หน้าที่เก็บไว้
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })),
    );
    return;
  }

  // asset ของแอป: มีในแคชใช้อันนั้น ไม่มีค่อยโหลดแล้วเก็บไว้รอบหน้า
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
