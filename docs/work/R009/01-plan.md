# Work Plan · R009 — Deploy & ตรวจรับรวม

- **Release:** R009 (ระดับ Release) · อ้างอิง `docs/work/ROADMAP.md`
- **ผู้รับผิดชอบ:** AI (เตรียมของ + ตรวจ) / เจ้าของโปรเจกต์ (กด deploy + ตรวจรับ)
- **วันที่:** 2026-10-17
- **อ้างอิง (Evidence):**
  - `docs/requirements/sabayjai-pantry.md` — ข้อ 4.5 (PWA ต้อง HTTPS) · DoD โปรเจกต์
  - คำตัดสิน R001 (OQ-R2): **Cloudflare Pages** · hash routing (ไม่ต้องมี `_redirects`) · `.nvmrc` ล็อก Node 22

---

## 1. เป้าหมายของ Release (Goal)

แอปขึ้น URL จริงด้วย HTTPS → PWA ติดตั้งได้เต็มรูป → ตรวจ end-to-end ปิดโปรเจกต์

## 2. ขอบเขต (Scope)

- **ทำ:**
  - S1 · Deploy — ตรวจบิลด์สะอาดจากต้นทาง (`npm test` + `npm run build` บน working tree ที่ commit แล้ว · Node 22 ตรง `.nvmrc`) · ตั้งค่า Pages (build `npm run build` · output `dist` · Node 22) · เจ้าของโปรเจกต์กดเชื่อม repo/deploy · AI ตรวจบน URL จริง
  - S2 · ตรวจรับ end-to-end — ติ๊ก DoD ทั้ง requirement บน URL จริง (8 จอ · 3 ขนาดจอ · ไทย/สี · 1 วิ · seed/รีเซ็ต · PWA ติดตั้ง+ออฟไลน์) · เขียน `02-result.md` · ติ๊ก ROADMAP ปิดโปรเจกต์
- **ไม่ทำ:** เปลี่ยนโค้ด/ฟีเจอร์ (ฟรีซแล้ว — เจอจุดแตกให้จดเป็นงานรอบใหม่ ไม่แก้ใน R009) · โดเมนเอง (ใช้ `*.pages.dev` ก่อน) · Backend/บัญชี (Out of Scope เดิม)
- **ของที่มีอยู่แล้ว:** `dist/` มี manifest + sw + icons ครบ · SW ลงเฉพาะบิลด์จริงผ่าน http(s) · `base: './'` วางใต้ path ใดก็ได้

## 3. Sprint & Task

### Sprint S1 · Deploy

- [x] **Task 1 · บิลด์สะอาด** — `npm test` 84/84 · `npm run build` ผ่านจาก working tree ที่ commit แล้ว
- [x] **Task 2 · เจ้าของโปรเจกต์กด deploy** — Pages (Connect to Git · `Sabayjai/sabayjai-pantry-demo`) → URL https://sabayjai-pantry-demo.pages.dev
- [x] **Task 3 · AI ตรวจบน URL จริง** — เปิดครบ 8 จอ · manifest/sw/icons 200 · SW active + ออฟไลน์ได้ · console ไม่มี error

### Sprint S2 · ตรวจรับ end-to-end

- [x] **Task 1 · ติ๊ก DoD** — เจ้าของโปรเจกต์ยืนยันว่าตรวจรับ US-001…US-008 · NFR 4.1–4.5 (รวมติดตั้งลงโฮมจากไอคอนบนมือถือจริง) · seed/รีเซ็ต ผ่านครบ เมื่อ 2026-10-17
- [x] **Task 2 · ปิดโปรเจกต์** — บันทึก `02-result.md` · ติ๊ก ROADMAP DoD · ปิด R009 เมื่อ 2026-10-17

## 4. เกณฑ์การตรวจรับ (เจ้าของโปรเจกต์ติ๊ก)

- [x] เปิด URL จริงด้วย HTTPS ได้
- [x] ติดตั้งลงโฮมมือถือได้ · เปิดจากไอคอนเต็มจอ · ปิดเน็ตยังใช้ได้ — เจ้าของโปรเจกต์ยืนยันผ่าน
- [x] DoD ระดับโปรเจกต์ติ๊กครบทุกข้อ — เจ้าของโปรเจกต์ยืนยันผ่าน

## 5. คำถามที่ต้องตัดสินใจ (Open Questions)

- ไม่มี — เหลือแค่เจ้าของโปรเจกต์กด deploy แล้วส่ง URL กลับมาให้ AI ตรวจ
