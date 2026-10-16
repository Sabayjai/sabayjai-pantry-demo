# Design · SabayJai Pantry

> **สถานะ:** ✅ **Accepted** — ตรวจรับพร้อมการปิด Release R001 เมื่อ 2026-10-16
> **วันที่:** 2026-10-15 · **อัปเดตล่าสุด:** 2026-10-16 (สคีมา v2 · ปิด D5/D7/D10/D11 · สัญญา D8/D9/D10 ที่ลงมือจริง · **ปิดคำถามฝั่ง UX/UI ครบ: OQ-R11 เมนูซ้าย/บน · OQ-R12 ชื่อแอป · OQ-R13 ลำดับการ์ด · OQ-R14 ☰ จอโทรศัพท์**)
> **Release / Sprint:** R001 · S1 · Design (Task 1–4)
> **อ้างอิง (Evidence):** `docs/requirements/sabayjai-pantry.md` v2.1 (Accepted 2026-10-14) · `docs/work/R001/01-plan.md`
> **ผู้จัดทำ:** AI (ผู้ลงมือ) · **ผู้ตัดสินใจ/ผู้ตรวจรับ:** เจ้าของโปรเจกต์ (มนุษย์)

---

## 0. บันทึกการตัดสินใจ (Decision Log)

ปิด Open Questions ของแผน R001 เมื่อ 2026-10-15 โดยเจ้าของโปรเจกต์:

| รหัส | คำถาม | ข้อสรุป | วันที่ |
|:--:|---|---|:--:|
| ขอบเขต | R001 SP01 ทำถึงไหน | ทำเฉพาะ **S1 · Design** (เอกสารออกแบบ) แล้วหยุดรอการตรวจรับ | 2026-10-15 |
| OQ-R1 | สแต็ก | **Vite + Vanilla JS (ไม่ใช้เฟรมเวิร์ก)** — โค้ดยังเป็น DOM ล้วน ไม่ใช้ React/Vue | 2026-10-15 |
| OQ-R2 | ปลายทาง Deploy | **Cloudflare Pages** (ยืนยันซ้ำตอน deploy จริงใน R009) | 2026-10-15 |
| OQ-R3 | โครงหน้าจอ | **หน้าเดียว + hash routing** (`#/items`, `#/expiring`, …) | 2026-10-15 |
| OQ-R8 | กรอบเทสต์ของชั้นข้อมูล | **Vitest** (รันใน Vite toolchain เดียวกัน · สคริปต์ `npm test`) | 2026-10-16 |
| OQ-R9 | seed มุม "ใช้หมดแล้ว" / "รายการที่ต้องซื้อ" | **ใส่ทั้งสองมุม มุมละ 1–2 รายการ** เพื่อให้ทุกมุมของเดโมมีข้อมูลตั้งแต่วินาทีแรก | 2026-10-16 |
| OQ-R10 | `undo.js` ใน S2 หรือ R005 | **เลื่อนไป R005 (US-003)** — S2 ทำเฉพาะชั้นข้อมูลที่ใช้งานได้จริง ตัวจับเวลา+toast จะทำพร้อม UI ที่ R005 (รายละเอียด 3.6) | 2026-10-16 |
| OQ-R11 | ลายเมนูหลักของ shell | **✅ ปิด 2026-10-16** — เจ้าของโปรเจกต์ตอบ (ไม่ใช่ A/B/C ในข้อเสนอเดิม แต่เป็นแบบปรับตามขนาดจอ): **"จอใหญ่ให้ใช้เมนูทางซ้าย · จอเล็กให้ใช้ด้านบน"** ⇒ **≥1024 px = แถบเมนูด้านซ้าย (แนวตั้ง) · <1024 px = แถบเมนูด้านบน (แนวนอน)** โดยใช้ `NAV_ITEMS` ชุดเดิมและ `aria-current="page"` เหมือนกันทั้งสองแบบ · จุดตัด 1024 เป็นค่าเริ่มต้นของ AI (ยังปรับได้) · แทนข้อเสนอ "หัวเรื่อง + แถบเมนูเลื่อนแนวนอนทุวจอ" ของรอบก่อน | 2026-10-16 |
| OQ-R12 | ชื่อแอปบนหัวจอ | **✅ ปิด 2026-10-16 — ตอบ A** ⇒ ใช้ `สบายใจ Pantry` (ตรงกับ `<title>` · prototype · `APP_TITLE` ใน `shell.js` เดิม ไม่ต้องแก้อะไร) | 2026-10-16 |
| OQ-R13 | ลำดับการ์ดใน `#/items` | **✅ ปิด 2026-10-16 — ตอบ A** ⇒ เรียง **แดง → เหลือง → ที่เหลือ (ชื่อ ก-ฮ)** · ขัดแย้งกับของที่เพิ่งบันทึก (ที่ขึ้นบนสุดชั่วครู่) ⇒ จะใช้ toast "เพิ่ม "…" แล้ว" เป็นตัวบอกว่าบันทึกสำเร็จแทน | 2026-10-16 |
| OQ-R15 | เมนู "เพิ่ม" ซ้ำกับปุ่ม "＋ เพิ่มของ" | **✅ ปิด 2026-10-16 — ตอบ A** ⇒ **ตัด "เพิ่ม" ออกจากเมนู เหลือ 7 รายการ** และคงปุ่ม `＋ เพิ่มของ` ที่หัวจอเป็นทางเดียว (ตามหลัก "ปุ่มหลัก 1 ปุ่มต่อจอ" ข้อ 4.3) · `#/add` ยังเป็นเส้นทางจริงใน `router.js` — แค่ไม่มีเมนูไฮไลต์ (หัวจอบอกอยู่แล้ว) · ลงมือทั้งแอปและแบบร่าง | 2026-10-16 |
| OQ-R16 | ย้ายของระหว่างจุดเก็บ (ไม่มีใน requirement เดิม) | **✅ ปิด 2026-10-16 — ตอบ A** ⇒ **เพิ่มเป็น US-009 และทำใน R005** · เหตุผล: ข้อความ US-004 "ย้ายของออกก่อนจึงจะลบได้" เป็นทางตัน (สั่งให้ย้าย แต่ย้ายไม่ได้) และ R005 แตะการ์ดของ/ล็อตอยู่แล้ว · **สัญญาที่ต้องเพิ่มตอนนั้น:** `moveLot(lotId, locationId)` (ย้ายทั้งล็อต ยอดไม่เปลี่ยน ⇒ ไม่เขียน movement) · ร่างถ้อยคำ US-009 อยู่ที่ `docs/requirements/sabayjai-pantry.md` | 2026-10-16 |
| OQ-R14 | ลายเมนูจอโทรศัพท์ (แก้มติ OQ-R11 เฉพาะจอเล็ก) | **✅ ปิด 2026-10-16 — เจ้าของโปรเจกต์เสนอเอง** ⇒ **☰ + dropdown เฉพาะจอ <768 px** · วัฏจริงที่ 375 px: เมนู 8 รายการ (ตอนนั้น — หลัง OQ-R15 เหลือ 7) ต้องใช้ 645 px แต่มีให้ 358 ⇒ ซ่อนอยู่ 287 px (เห็นครบเพียง 4 รายการ) · 768 px ขึ้นไปยังพาดเป็นแถวได้ (ตอนนั้นทั้ง 8 · ตอนนี้ทั้ง 7) จึงคงเดิม · ☰ เป็นไอคอนล้วน 44×44 + `aria-label` (ไม่ใช่ไฟล์ภาพ) เพราะใส่คำว่า "เมนู" ด้วยจะทำให้ชื่อแอปตัดเป็น 2 บรรทัด · **จุดตัด 768 px = ค่าเริ่มต้นของ AI ยังรอการยืนยัน** | 2026-10-16 |
| D1 | รูปร่างของ "หน่วย" (`unit` เป็นข้อความอิสระ หรืออ้างด้วย id) | **คงเป็นข้อความอิสระ** + `units` เป็นลิสต์ช่วยเลือก ตามข้อ 5.2 "พิมพ์หน่วยใหม่เองได้" · ยอมรับข้อจำกัด: เปลี่ยนชื่อ/ลบหน่วยไม่ได้ และลิสต์ยาวขึ้นเรื่อย ๆ | 2026-10-16 |
| D6 | ห้ามตั้งชื่อจุดเก็บ/หมวดหมู่ซ้ำ (เดิมไม่มีใน requirement) | **คงการปฏิเสธชื่อซ้ำ** — เดโมมี 5 จุดเก็บ/4 หมวดหมู่ ชื่อซ้ำทำให้ผู้ใช้เลือกผิดจุดเก็บและจอแยกไม่ออก | 2026-10-16 |
| D8 | ข้อมูลในที่เก็บอ่านไม่ได้ → ทิ้งแล้วคืน seed เงียบ ๆ | **เพิ่มการสำรอง** — ย้ายของเดิมไปคีย์ `sabayjai-pantry.backup` ก่อนรีเซ็ต แล้วกู้คืนได้จาก `#/settings` | 2026-10-16 |
| D9 | `normalizeState()` ไม่ตรวจรูปร่างข้อมูลรายฟิลด์ | **เพิ่มการตรวจรายฟิลด์** — ทิ้งเฉพาะรายการที่เพี้ยน เก็บรายการที่ถูกต้องไว้ (ปิด F6) | 2026-10-16 |
| D5 | วันที่ใน seed ย้อนหลัง (shopping 1/3 วัน · ล็อตที่ใช้หมดแล้ว 2/5 วัน) | **คงไว้** — เดโมดูมีชีวิตชีวา และเขียนเหตุผลไว้ในเอกสารนี้ (วันที่ยังเลื่อนตามวันกดรีเซ็ตอยู่แล้ว) | 2026-10-16 |
| D7 | เพดานความยาว ชื่อ 60 / หมายเหตุ 200 ตัวอักษร (เดิม AI ตั้งเอง ไม่มีใน requirement) | **คงไว้ 60 / 200** — ตรงกับ `validateName()` และ `NOTE_MAX_LENGTH` ที่ใช้จริง | 2026-10-16 |
| D10 | ยอด "จำนวนเดิม" ของของที่ใช้หมดแล้ว อ่านจากไหน | **เก็บไว้ที่ล็อต (`usedUpQuantity`)** — เจ้าของโปรเจกต์เลือก ข. เพราะมีทั้งยอดรวมและยอดล็อตอยู่แล้ว การมีฟิลด์ยอดเดิมจึงไม่แปลก และ "การอัปเดตเป็นหน้าที่ของโค้ด" · กันค่ามั่วด้วยคำสั่ง `recalculateUsedUpQuantities()` ที่คำนวณใหม่จาก `movements` | 2026-10-16 |
| D11 | ล็อตยอด 0 / movement ลบไม่ได้ (มุมใช้หมดแล้วโตขึ้นเรื่อย ๆ) | **ยอมรับไว้ในเดโม** — ข้อมูลเล็ก ไม่เจ็บ · ปุ่ม "ลบถาวร" เลื่อนไปพิจารณาที่ R007 | 2026-10-16 |
| โครงข้อมูลสต็อก | Item แถวเดียวควรแยกเป็น สินค้า + ล็อต ไหม | **เลือกสคีมา v2 = สินค้า (Product) + ล็อต (Lot) + การเคลื่อนไหว (Movement)** — คุม Batch ได้จริง (วันหมดอายุเป็นของคุณสมบัติของล็อต) · สินค้าไม่ซ้ำหลายแถวบนจอ · หักของแบบ FEFO · `migrate()` แปลง v1 → v2 อัตโนมัติ · ทําให้คำถามเดิม **D2 · D3 · D4 ปิดไปเอง** (ฟิลด์ที่ถามถึงไม่มีอยู่แล้ว) | 2026-10-16 |

> **รอบตรวจโครงข้อมูล (2026-10-16 · ปิดครบทั้ง 11 ข้อ):** เจ้าของโปรเจกต์ตรวจ "DB structure" จากหลักฐานจริงที่ `docs/work/R001/data-model-review.md` (ดึงจาก `localStorage` ของแอปที่รัน) · ปิดชุดที่ 1 = **D1 · D6 · D8 · D9** · **D2 · D3 · D4 ปิดไปเองพร้อมสคีมา v2** · ปิดชุดที่ 3 (ตอบในแชท 2026-10-16) = **D5 ก. · D7 ก. · D10 ข. · D11 ก.** → **ไม่เหลือคำถามฝั่งข้อมูลค้าง** · งานโค้ดที่ได้จากชุดนี้ (D8 สำเนา+กู้คืน · D9 ตรวจรูปร่างข้อมูล · D10 ฟิลด์ `usedUpQuantity` + คำสั่งคำนวณใหม่) **ลงมือที่ชั้นข้อมูลแล้วพร้อมเทสต์** — หลักฐานอยู่ที่ `docs/work/R001/02-result.md` ข้อ ⓪.3

> **โน้ตจากงานสร้างจริงใน S2 (2026-10-16) — ไม่ใช่คำถามค้าง:** สัญญาของ `selectors` ถูกปรับให้เป็นฟังก์ชันบริสุทธิ์ (รับข้อมูลเป็นพารามิเตอร์ ไม่อ่าน state เอง) · รายการปรับอื่น ๆ (คลาส `ValidationError` · `bindState()` ใน store · ที่เก็บสำรองในหน่วยความจำ · id ของ seed) สรุปไว้ใน `docs/work/R001/02-result.md` ข้อ 4
>
> **ⓘ ปรับปรุงครั้งใหญ่ (2026-10-16): สคีมา v1 → v2 · เพิ่ม Batch (ล็อต)** — เจ้าของโปรเจกต์เลือกโมเดล **สินค้า (Product) + ล็อต (Lot)** เพราะต้องการคุม Batch ให้ได้จริง (วันหมดอายุเป็นคุณสมบัติของ "ล็อตที่รับเข้า" ไม่ใช่ของชื่อสินค้า) และไม่ให้สินค้าซ้ำหลายแถวบนจอ · ทุกอย่างยังคืนค่าเป็น v2 อัตโนมัติด้วย `migrate()`. รายละเอียดในหัวข้อ 2 และ 3 ด้านล่าง (แทนที่ฉบับ Item แถวเดียว)

---

## 1. ภาพรวมการออกแบบ (Architecture Overview)

### 1.1 รูปแบบระบบ

- **Static Single-Page App (SPA) แบบ Frontend Only** — ไม่มี Backend ไม่มีบัญชีผู้ใช้ ไม่มีฐานข้อมูลบนคลาวด์
- เสิร์ฟเป็นไฟล์ static ล้วนขึ้น **Cloudflare Pages** (เว้น build command ว่างไม่ได้เพราะมีขั้นตอน build — ตั้ง `npm run build` → `dist`)
- **การนำทาง:** hash routing ภายใน HTML เดียว — URL เปลี่ยนเฉพาะส่วนหลัง `#` จึงไม่วิ่งไปเซิร์ฟเวอร์ (ไม่ต้องตั้ง `_redirects` และไม่กระทบพฤติกรรม SPA fallback ของ Pages)
- **ข้อมูล:** เก็บใน `localStorage` ของเบราว์เซอร์เครื่องนั้นเท่านั้น ไม่มีข้อมูลออกนอกเครื่อง

### 1.2 เทคโนโลยีที่เลือกใช้และเหตุผล

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Build tool / dev server | **Vite** (เลือกเวอร์ชัน stable ล่าสุดตอนตั้งโปรเจกต์ใน S2) | dev server + HMR เร็ว · build เป็นไฟล์ static ใน `dist/` ให้ Cloudflare Pages deploy ต่อทันที · ยังไม่ผูกกับเฟรมเวิร์ก |
| ภาษา | **Vanilla JavaScript (ES Modules)** — ไม่ใช้ TypeScript ในรอบนี้ | คงความโปร่งใส/อ่านง่ายของโค้ด DOM ล้วน ลดความซับซ้อน; เปิดทางเพิ่ม TS ทีหลังได้โดยไม่รื้อโครง |
| เฟรมเวิร์ก UI | **ไม่ใช้** | สโคปเดโมเล็ก (~8 US) เขียน DOM ตรง ๆ คุมได้ ไม่เพิ่ม dependency |
| สไตล์ | **CSS ธรรมดา + CSS Variables** | ไม่มี dependency · คุมธีมและสถานะสี (เหลือง/แดง) ได้ง่าย |
| เก็บข้อมูล | **localStorage (JSON)** | ตาม requirement ข้อ 4.4 — ข้อมูลอยู่ที่เครื่อง ใช้งานออฟไลน์ได้ |
| PWA (manifest + service worker) | **เลื่อนไป R008** | S1/S2 ยังไม่ต้องทำ · เตรียมที่วางไฟล์ใน `public/` ไว้ล่วงหน้า |

### 1.3 ชั้นของระบบ (Layers)

```text
UI (views/, ui/)
        ↕  อ่าน state / เรียกคำสั่ง
Store (store.js)   ← pub/sub แจ้ง re-render
        ↕
Data layer (data/: storage.js · db.js · selectors.js · validate.js · seed.js · [undo.js → R005])
        ↕
localStorage  (คีย์เดียว 'sabayjai-pantry' + schemaVersion)
```

- ทิศทางข้อมูลทางเดียว: **action → แก้ state → persist → notify → re-render view ปัจจุบัน**
- View **ไม่แตะ localStorage โดยตรง** — ต้องผ่าน data layer เท่านั้น
- `selectors.js` เป็นฟังก์ชันบริสุทธิ์ (คำนวณ ไม่แก้ข้อมูล) จึงเทสต์ได้ง่าย

### 1.4 แนวคิดการเรนเดอร์

- แต่ละ view เป็นโมดูลที่คืน DOM จริง (ไม่ใช้ virtual DOM)
- helper `el()` / `clear()` / `on()` ใน `ui/dom.js` สำหรับสร้างและผูก event
- ใช้ **event delegation** ที่ mount point เดียว ลดการผูก listener ซ้ำ
- เมื่อ state เปลี่ยน → re-render เฉพาะ view ปัจจุบัน (สโคปเล็ก เพียงพอและเรียบง่าย)

---

## 2. โครงสร้างข้อมูล (Data Model)

### 2.1 เอนทิตี

> หนึ่งแถวที่ผู้ใช้เห็นบนจอ = **หนึ่งสินค้า (Product)** ไม่ใช่หนึ่งล็อต · ล็อตเป็นรายละเอียดอยู่ข้างใน

**Product (สินค้า)** — ชื่อ + หน่วย เป็นตัวตนของสินค้า (ไม่ให้สินค้าซ้ำ)

| ฟิลด์ | ชนิด | บังคับ | หมายเหตุ |
|---|---|:--:|---|
| `id` | string | ✅ | `crypto.randomUUID()` (มี fallback) |
| `name` | string | ✅ | ชื่อของ |
| `unit` | string | ✅ | อ้างชื่อหน่วยใน `units` (ชื่อ+หน่วยเดียวกัน = สินค้าเดียวกัน) |
| `categoryId` | string \| null | – | FK → Category (หมวดหมู่อยู่ที่สินค้า ไม่ใช่ที่ล็อต) |
| `note` | string | – | ข้อความสั้น (ค้นหาครอบถึง) |
| `createdAt` | string | ✅ | ISO 8601 (อัตโนมัติ) |
| `updatedAt` | string | ✅ | ISO 8601 (อัตโนมัติ) |

**Lot (ล็อต/batch)** — ของกลุ่มที่รับเข้าพร้อมกัน (สินค้า + จุดเก็บ + วันหมดอายุเดียวกัน) · หักได้ทีละส่วน

| ฟิลด์ | ชนิด | บังคับ | หมายเหตุ |
|---|---|:--:|---|
| `id` | string | ✅ | |
| `productId` | string | ✅ | FK → Product |
| `locationId` | string | ✅ | FK → Location (ต้องมีอยู่จริง) |
| `quantity` | number | ✅ | ≥ 0 · `0` = ใช้หมดแล้ว |
| `usedUpQuantity` | number | – | ≥ 0 · **ยอดก่อนที่ล็อตนี้จะหมด** (D10 · คำตอบ ข. 2026-10-16) — ล็อตที่ยังมีของเก็บ `0` · โค้ดอัปเดตอัตโนมัติทุกครั้งที่ยอดเปลี่ยน (`consumeProduct` · `setLotQuantity` · `restoreLot` · `receiveStock`) · เติม/ซ่อมจากประวัติได้ด้วย `recalculateUsedUpQuantities()` |
| `expiryDate` | string \| null | – | `'YYYY-MM-DD'` — วันหมดอายุ **ของล็อตนี้** |
| `createdAt` | string | ✅ | ISO 8601 — วันที่รับล็อตเข้า |
| `updatedAt` | string | ✅ | ISO 8601 |

**Movement (บันทึกการเคลื่อนไหว)** — เขียนได้อย่างเดียว ห้ามแก้/ลบ

| ฟิลด์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | string | |
| `lotId` | string | FK → Lot |
| `type` | string | `in` · `out` · `discard` · `adjust` · `restore` |
| `delta` | number | `+` เข้า / `−` ออก |
| `balanceAfter` | number | ยอดคงเหลือหลังรายการนี้ (ใช้กระทบยอดกันข้อมูลเพี้ยน) |
| `at` | string | ISO 8601 |
| `note` | string \| null | |

- **Location (จุดเก็บ)** — `{ id, name, createdAt }` · ห้ามลบถ้ามีล็อตที่ยังมีของอยู่
- **Category (หมวดหมู่)** — `{ id, name, createdAt }` · ห้ามลบถ้ามี Product อ้างอยู่
- **Unit (หน่วย)** — เก็บเป็น `string[]` ของชื่อหน่วย · เลือกจากชุดสำเร็จรูป หรือพิมพ์ใหม่แล้วเพิ่มเข้า list อัตโนมัติ (`ensureUnit`)
- **"ใช้หมดแล้ว"** — **ไม่มีตารางแยก** คำนวณสดจากล็อตที่ `quantity = 0` · วันที่ใช้หมด = เวลาของ movement ล่าสุดของล็อตนั้น · จำนวนเดิม = `usedUpQuantity` ของล็อต (D10 · คำตอบ ข.)
- **ShoppingItem (รายการที่ต้องซื้อ)** — `{ id, text, createdAt }` · ข้อความช่องเดียว (OQ-13) · ไม่ผูกกับ Product (OQ-15)
- **AppMeta** — `{ schemaVersion, seededAt, updatedAt }`

### 2.2 ความสัมพันธ์

```text
Product 1 ──< Lot >── 1 Location          สินค้า 1 ตัวมีหลายล็อตได้ · ล็อตอ้างจุดเก็บ 1 จุด
Product 1 ─── 0..1 Category               หมวดหมู่อยู่ที่สินค้า (ไม่ใช่ที่ล็อต)
Lot 1 ──< Movement                        ทุกการรับเข้า/ทยอยใช้/ทิ้ง/ปรับ/นำกลับ มีบันทึก
Product ◁╌╌ ไม่เชื่อม ╌╌▷ ShoppingItem    OQ-15: ยังไม่ทำในรอบแรก
```

### 2.3 รูปแบบที่เก็บใน localStorage

คีย์เดียว: **`sabayjai-pantry`**

```json
{
  "schemaVersion": 2,
  "meta": { "seededAt": "2026-10-15T00:00:00.000Z", "updatedAt": "2026-10-15T00:00:00.000Z" },
  "locations": [{ "id": "loc-fridge", "name": "ตู้เย็น", "createdAt": "..." }],
  "categories": [{ "id": "cat-ready", "name": "พร้อมกิน", "createdAt": "..." }],
  "units": ["ชิ้น", "กล่อง", "ขวด", "ถุง", "แพ็ก", "ฟอง", "หัว", "กรัม", "กิโลกรัม", "ลิตร", "มล."],
  "products": [
    { "id": "prod-milk", "name": "นมสด 1 ลิตร", "unit": "กล่อง", "categoryId": "cat-ready", "note": "", "createdAt": "...", "updatedAt": "..." }
  ],
  "lots": [
    { "id": "lot-milk-1", "productId": "prod-milk", "locationId": "loc-fridge", "quantity": 1, "usedUpQuantity": 0, "expiryDate": "2026-10-18", "createdAt": "...", "updatedAt": "..." }
  ],
  "movements": [
    { "id": "mv-...", "lotId": "lot-milk-1", "type": "in", "delta": 1, "balanceAfter": 1, "at": "...", "note": null }
  ],
  "shopping": []
}
```

- **เวอร์ชันสคีมา:** `schemaVersion` ใช้ตัดสินใจ migration (`migrate(raw)` ใน `storage.js`) — **`migrate()` แปลง v1 → v2 ให้อัตโนมัติ**: `items` หนึ่งแถวเดิมกลายเป็นล็อต (รวมสินค้าที่ชื่อ+หน่วยเดียวกันให้เป็น Product เดียว) และ `usedUp` เดิมกลายเป็นล็อตยอด 0 พร้อม movement `in` + `out` → **ข้อมูลเดิมในเครื่องไม่หาย**
- **คีย์สำรอง:** ก่อนเขียนทับด้วย seed ระบบจะย้ายข้อมูลเดิมทั้งก้อนไปคีย์ **`sabayjai-pantry.backup`** เสมอ (D8 · พร้อมวันที่และเหตุผล) → กู้คืนได้จาก `#/settings` แม้ข้อมูลเดิมจะ `JSON.parse` ไม่ผ่าน
- **รีเซ็ต:** `resetToSeed('manual')` สำรองของเดิมก่อน แล้วเขียนทับด้วย seed ชุดใหม่ (ตาม OQ-11)
- **ตรวจรูปร่างข้อมูล:** ทุกครั้งที่โหลด ข้อมูลจะผ่าน `normalizeState()` ที่ตรวจรายฟิลด์ (D9) — รายการที่เพี้ยนถูกตัด/ซ่อมเฉพาะจุด ไม่ทิ้งทั้งก้อนและไม่ตกไปคืน seed โดยไม่จำเป็น
- **ที่เก็บไม่ใช่แหล่งจริง:** โหลดเข้า memory ครั้งเดียวตอนบูต แล้วเขียนกลับเฉพาะเมื่อมีการแก้ (ผ่าน `commit()`)

### 2.4 ค่าคงที่และกฎของโดเมน

| ค่าคงที่ | ค่า | ที่มา |
|---|---|---|
| `EXPIRING_THRESHOLD_DAYS` | `3` | US-005 (เหลือ ≤ 3 วัน = เหลือง) |
| จุดเก็บเริ่มต้น | 5: ตู้เย็น · ช่องแช่แข็ง · ตู้กับข้าว · ชั้นวางของ · ตะกร้าผัก-ผลไม้ | ข้อ 5.2 |
| หมวดหมู่เริ่มต้น | 4: พร้อมกิน · วัตถุดิบ · เครื่องปรุง · ของใช้ในครัว | ข้อ 5.2 |
| หน่วยสำเร็จรูป | 11: ชิ้น · กล่อง · ขวด · ถุง · แพ็ก · ฟอง · หัว · กรัม · กิโลกรัม · ลิตร · มล. | ข้อ 5.2 |
| หน้าต่าง undo | `5` วินาที | US-003 |
| ประเภท movement | `in` (รับเข้า) · `out` (หยิบใช้) · `discard` (ทิ้ง) · `adjust` (นับสต็อกจริง) · `restore` (นำกลับจากใช้หมดแล้ว) | ดีไซน์ v2 |
| กติกาหักล็อต | **FEFO** — ล็อตวันหมดอายุใกล้สุดถูกหักก่อน (ของไม่ระบุวันไปท้าย) | ดีไซน์ v2 |
| กติกาการรวมล็อต | รับเข้าซ้ำ ถ้า สินค้า+จุดเก็บ+วันหมดอายุ ตรงกัน → บวกเข้าล็อตเดิม; ต่างแม้แต่ตัวเดียว → ล็อตใหม่ | ดีไซน์ v2 |

**สถานะหมดอายุ คำนวณสด** (ไม่เก็บในข้อมูล) จาก `expiryDate` ของ **ล็อต** เทียบ "วันนี้" แบบวันที่ล้วน (ตัดเวลาเป็นเที่ยงคืนท้องถิ่น):

| เงื่อนไข | สถานะ | สี |
|---|---|---|
| ไม่มี `expiryDate` | `none` | ไม่มีป้าย (ไม่นับว่าใกล้หมดอายุ ตาม US-005) |
| `daysLeft < 0` | `expired` | แดง |
| `0 ≤ daysLeft ≤ 3` | `expiring` | เหลือง |
| `daysLeft > 3` | `fresh` | ปกติ |

### 2.5 ข้อมูลตัวอย่าง (Seed) — 8 สินค้าในสต็อก + 2 สินค้าที่ใช้หมดแล้ว

- ข้อมูล 5 จุดเก็บ · 4 หมวดหมู่ ตามข้อ 5.2 · **หน่วย** = 11 ตัวสำเร็จรูปตามข้อ 5.2 **+ 3 ตัวที่ seed เพิ่มเอง** (ถ้วย · ก้อน · ลูก) = **14** · รวมทั้งก้อนเป็น **10 สินค้า · 10 ล็อต · 12 การเคลื่อนไหว (in 10 · out 2)** (วัดสดจาก `createSeed()`)
- 8 สินค้าแรกเป็นตาราง requirement ข้อ 5.3 เดิม เป๊ะ — แต่ละสินค้ามี **1 ล็อต** (ชื่อ/จำนวน+หน่วย/จุดเก็บ/วันหมดอายุ ตรงกับตารางเดิม)
- **วันหมดอายุคำนวณจาก "วันที่ seed"** (ไม่ใช่ค่าคงที่): #1 นมสด = วันนี้ +2 · #2 โยเกิร์ต = วันนี้ +3 · #3 ผักกาดขาว = วันนี้ −1 · #5 อกไก่แช่แข็ง = วันนี้ +30 → **เดโมเห็นสถานะเหลืองและแดงทันทีทุกครั้งที่รีเซ็ต** โดยไม่ต้องแก้ข้อมูล
- หมายเหตุ: seed ใช้หน่วย **"ถ้วย"** (โยเกิร์ต 4 ถ้วย) ซึ่งไม่อยู่ใน 11 หน่วยสำเร็จรูป → สาธิตเส้นทาง "พิมพ์หน่วยใหม่เองได้" ผ่าน `ensureUnit()`
- **✅ ปิดคำถามแล้ว (OQ-R9 · 2026-10-16):** ใส่ seed ให้มุม **"ใช้หมดแล้ว"** และ **"รายการที่ต้องซื้อ"** ด้วย **มุมละ 1–2 รายการ** (ล็อตยอด 0 จำนวน 2 · `shopping` 2) เพื่อให้ทุกมุมของเดโมมีข้อมูลตั้งแต่วินาทีแรก · 8 สินค้าในสต็อกยังคงตาม requirement ข้อ 5.3 ไม่เปลี่ยน
  - "ใช้หมดแล้ว" = **สินค้า 2 ตัวที่ล็อตยอด 0** + movement `in`/`out` คู่กัน: 1) เนยจืด 1 ก้อน (จากตู้เย็น) 2) มะนาว 3 ลูก (จากตะกร้าผัก-ผลไม้) — ไม่ใช่ตาราง `usedUp` แยก แต่คำนวณสดจากล็อตยอด 0 · ล็อตทั้งสองเก็บ `usedUpQuantity` ไว้ด้วย (1 · 3) เพื่อให้มุมใช้หมดแล้วมีเลข "จำนวนเดิม" ตั้งแต่วินาทีแรก
  - `shopping`: 1) น้ำตาลทราย 2) ผงซักฟอก
  - ทั้งสองชุดเป็นข้อมูลตัวอย่างเท่านั้น ไม่ผูกกัน (ตาม OQ-15)

---

## 3. สัญญาระบบ (Contracts & APIs)

### 3.1 ภาพรวมโมดูล

| ไฟล์ | หน้าที่ | ผลข้างเคียง |
|---|---|---|
| `src/data/storage.js` | อ่าน/เขียน/รีเซ็ต localStorage + คุมเวอร์ชัน | เขียน localStorage |
| `src/data/db.js` | คำสั่ง CRUD ทุกเอนทิตี + คุม state ในหน่วยความจำ | แก้ state → `commit()` (persist + notify) |
| `src/data/selectors.js` | ฟังก์ชันอนุพัทธ์ (คำนวณ) | ไม่มี |
| `src/data/validate.js` | ตรวจอินพุตก่อนบันทึก | ไม่มี |
| `src/data/seed.js` | ชุดข้อมูลตัวอย่าง + ตัวสร้าง seed สด | ไม่มี |
| ~~`src/data/undo.js`~~ | หน้าต่าง undo 5 วินาทีของ "ย้ายใช้หมดแล้ว" — **เลื่อนไป R005 (OQ-R10)** | ตัวจับเวลา |
| `src/store.js` | pub/sub ให้ view subscribe | ไม่มี |
| `src/router.js` | hash router + ตาราง route | เปลี่ยน view |

> **เทสต์ (สร้างจริงใน S2 · OQ-R8):** `src/data/selectors.test.js` · `validate.test.js` · `db.test.js` · `storage.test.js` รันด้วย **Vitest** (`npm test`) · `src/test-setup.js` ติดตั้ง localStorage จำลองสำหรับรันใน Node

### 3.2 storage.js

```js
export const STORAGE_KEY = 'sabayjai-pantry';
export const BACKUP_KEY = 'sabayjai-pantry.backup';   // สำเนาก่อนรีเซ็ต (D8)
export const SCHEMA_VERSION = 2;

export function loadState(): PantryState   // อ่าน + parse + migrate; ถ้าว่าง/พัง → resetToSeed('<เหตุผล>')
export function saveState(state): void     // เขียน JSON กลับ localStorage
export function resetToSeed(reason?): PantryState // สำรองของเดิม (D8) แล้วเขียนทับด้วย seed
export function migrate(raw): PantryState  // อัปเกรดสคีมาเก่า → ปัจจุบัน (v1 → v2: items/usedUp → products/lots/movements)
export function normalizeState(raw): PantryState  // ตรวจ/ซ่อมรูปร่างข้อมูลรายฟิลด์ (D9) + เติม usedUpQuantity ที่ขาดจาก movements
export function readBackupInfo(): { savedAt, reason, bytes } | null   // ข้อมูลสำเนาล่าสุด (ไม่คืนเนื้อข้อมูล)
export function restoreBackup(): { ok: true, savedAt, state } | { ok: false, reason: 'missing' | 'broken' | 'unsupported' }
```

### 3.3 db.js — คำสั่ง (commands)

ทุกคำสั่งที่แก้ข้อมูลต้องเรียก `commit()` = `saveState(state)` แล้ว `notify()`

```js
// Products (สินค้า)
listProducts(): Product[]
getProduct(id): Product | null
findProductByNameUnit(name, unit): Product | null
ensureProduct(input: ProductInput): Product     // หา (ชื่อ+หน่วย) เดิมมาใช้ ไม่สร้างซ้ำ
updateProduct(id, patch: Partial<ProductInput>): Product
deleteProduct(id): void                         // throw ReferencedError ถ้ายังมีล็อตที่ยังมีของ

// Lots (ล็อต/batch)
listLots(filter?: { productId?, locationId?, activeOnly? }): Lot[]
getLot(id): Lot | null
receiveStock(input: StockInput): { product, lot }   // หา/สร้างสินค้า + หา/สร้างล็อต (สินค้า+จุดเก็บ+วันหมดอายุ) + บวกยอด + movement in
consumeProduct(productId, quantity, opts?): Movement[]   // หักแบบ FEFO (ทยอยใช้) + movement out
discardProduct(productId, quantity, opts?): Movement[]   // เหมือน consume แต่บันทึกเป็น discard (ทิ้ง)
setLotQuantity(lotId, quantity): Lot            // clamp ≥ 0 · 0 = ใช้หมดแล้ว + movement adjust
restoreLot(lotId, quantity): Lot                // นำล็อตยอด 0 กลับมา + movement restore
listUsedUpLots(): (Lot & { product, usedUpAt })[]   // "ใช้หมดแล้ว" = ล็อตยอด 0 (ไม่มีตารางแยก) · พร้อม usedUpQuantity
listMovements(filter?: { lotId?, productId? }): Movement[]
recalculateUsedUpQuantities(filter?: { lotId? }): { checked, fixed, skipped, changes }
                          // คำนวณ "จำนวนเดิม" ใหม่จาก movement (D10) — ทางแก้เมื่อค่าที่เก็บไว้ไม่ตรงกับประวัติ

// Locations
listLocations(): Location[]
addLocation(name): Location
renameLocation(id, name): Location
deleteLocation(id): void                        // throw ReferencedError ถ้ามีล็อตที่ยังมีของ
countLotsInLocation(id): number

// Categories
listCategories(): Category[]
addCategory(name): Category
renameCategory(id, name): Category
deleteCategory(id): void                        // throw ReferencedError ถ้ามี Product อ้าง
countProductsInCategory(id): number

// Units
listUnits(): string[]
ensureUnit(name): string                        // มีอยู่แล้วคืนเดิม; ใหม่ → เพิ่มเข้า list + commit

// Shopping
listShopping(): ShoppingItem[]
addShopping(text): ShoppingItem
toggleShopping(id): void                        // ติ๊ก "ซื้อแล้ว" → ลบออกจากรายการ
removeShopping(id): void

// สำเนา + กู้คืน (D8)  ← ตัวสั่งรีเซ็ตเองอยู่ใน storage.js (ข้อ 3.2)
backupInfo(): { savedAt, reason, bytes } | null
restoreBackup(): { ok: true, savedAt } | { ok: false, reason: 'missing' | 'broken' | 'unsupported' }
```

> **การคุม `usedUpQuantity` (D10 · คำตอบ ข. 2026-10-16):** คำสั่งที่แตะยอดล็อตทุกตัวจบด้วย `syncUsedUpQuantity(lot, ยอดก่อนแก้)` — ยังมีของ → `0` · เพิ่งหมด → จำยอดก่อนหัก · ยอด 0 และไม่เปลี่ยน → คงค่าเดิม (ไม่ลบความจำทิ้ง)

**อินพุตของ `ProductInput` และ `StockInput`**

```ts
type ProductInput = {               // สินค้า
  name: string;                     // บังคับ, ไม่ว่าง
  unit: string;                     // บังคับ, ไม่ว่าง (ผ่าน ensureUnit)
  categoryId?: string | null;
  note?: string;
};

type StockInput = ProductInput & {  // รับของเข้า (สินค้า + ล็อตใหม่)
  quantity: number;                 // บังคับ, > 0
  locationId: string;               // บังคับ, ต้องมีอยู่จริง
  expiryDate?: string | null;       // 'YYYY-MM-DD'
};
```

### 3.4 selectors.js — ฟังก์ชันอนุพัทธ์

```js
export const EXPIRING_THRESHOLD_DAYS = 3;      // US-005

// ---- ผู้ช่วยวันที่ล้วน (ใช้ร่วมกับ seed.js ด้วย) ----
toDateOnly(value): string | null               // Date → 'YYYY-MM-DD' ตามเวลาเครื่อง
todayDateOnly(now?): string
parseDateOnly(value): Date | null              // ตรวจช่วงวันด้วย (2026-02-30 → null)
addDaysToDateOnly(dateOnly, days): string | null

// ---- สถานะหมดอายุ (ทุกตัวรับ `now` เพื่อให้เทสต์ได้) ----
daysLeft(lot, now?): number | null             // รับ "ล็อต" (หรือออบเจกต์ที่มี expiryDate); null ถ้าไม่ระบุวัน
expiryStatus(lot, now?): 'expired' | 'expiring' | 'fresh' | 'none'
expiryLabel(lot, now?): string                 // ข้อความไทย + จำนวนวันที่เหลือ (คู่กับสีเสมอ ตาม 4.2) · 'none' → ''

// ---- ล็อต: ยอด + FEFO (ทยอยใช้) ----
totalQuantity(lots): number                    // ยอดรวมเฉพาะที่ > 0
activeLots(lots): Lot[]                         // ล็อตที่ยังมีของ
emptyLots(lots): Lot[]                          // ล็อตที่ยอด 0
sortLotsByFEFO(lots): Lot[]                     // เรียงหมดอายุใกล้สุดก่อน (ไม่ระบุวันไปท้าย)
pickLotsForConsumption(lots, quantity): { lot, take }[]   // เลือกล็อตที่จะหักแบบ FEFO
nearestExpiryLot(lots): Lot | null
usedUpQuantityFromMovements(movements): number   // ยอดก่อนที่ล็อตจะหมด (D10) — ไล่ตาม `at` · ล็อตยังมีของ → 0

// ---- ค้นหา/กรอง/สรุป — ฟังก์ชันบริสุทธิ์ (รับข้อมูลเป็นพารามิเตอร์) ----
groupByProduct(products, lots): { product, lots, activeLots, total }[]   // 1 แถว/สินค้า (ไม่ซ้ำ)
filterStockRows(rows, { query, locationId, categoryId }): Row[]          // ค้นชื่อ + หมายเหตุ (US-002)
expiringLots(lots, now?): Lot[]                                          // expired + expiring
expiringSummary(lots, now?): { expired, expiring, total }                // สรุปตอนเปิดแอป (US-005)
```

### 3.5 store.js (pub/sub)

```js
getState(): PantryState
subscribe(listener: (state) => void): () => void   // คืน unsubscribe
notify(): void                                      // เรียกหลัง commit ทุกครั้ง
```

### 3.6 undo.js — ⏭️ เลื่อนไป R005 (OQ-R10 · ปิด 2026-10-16)

สัญญาที่ตกลงไว้ยังใช้เหมือนเดิม แต่ **S2 ยังไม่สร้างไฟล์นี้** เพราะตัวจับเวลา 5 วินาทีจะมีความหมายก็ต่อเมื่อมี toast ให้กด (US-003 อยู่ที่ R005) — การทำล่วงหน้าจะได้โค้ดที่ไม่มีคนเรียกใช้ และเสี่ยงต้องรื้อตอนได้แบบจอจาก S3

```js
beginUndo(entry: { lotId: string; quantity: number }, onUndo: () => void): void  // เปิดหน้าต่าง 5 วินาที + toast → R005
undoLastUsedUp(): boolean                                // คืน true ถ้าย้อนกลับสำเร็จ            → R005
```

> **หมายเหตุสคีมา v2 (2026-10-16):** เดิมสัญญานี้รับ `UsedUpEntry` (แถวในตาราง `usedUp`) — **ตอนนี้ไม่มีตารางนั้นแล้ว** จึงเปลี่ยนเป็นคู่ `{ lotId, quantity }` ของล็อตที่เพิ่งหักจนหมด
>
> สิ่งที่ S2 เตรียมไว้ให้แล้ว: ล็อตยอด 0 โผล่ใน `listUsedUpLots()` พร้อม `usedUpAt` → R005 แค่จำล็อตที่เพิ่งหักจนหมดแล้วเรียก `db.restoreLot(lotId, quantity)` เพื่อย้อนกลับ + แสดง toast 5 วินาที
>
> **เพิ่มจาก D10 (2026-10-16):** ยอดก่อนหักที่ต้องใช้ตอน undo อยู่ในล็อตแล้ว (`usedUpQuantity`) → R005 อ่านได้ตรง ๆ ไม่ต้องคำนวณจาก movement เอง

### 3.7 router.js

```js
export const routes = {
  '/items':      renderItems,       // US-002 (ค่าเริ่มต้น)
  '/add':        renderAddItem,     // US-001
  '/locations':  renderLocations,   // US-004
  '/categories': renderCategories,  // ข้อ 2.1 ข้อ 4
  '/expiring':   renderExpiring,    // US-005
  '/used-up':    renderUsedUp,      // US-007
  '/shopping':   renderShopping,    // US-008
  '/settings':   renderSettings,    // รีเซ็ต seed (OQ-11)
};
startRouter(mountEl): void   // ผูก hashchange + เรนเดอร์ครั้งแรก (path ว่าง → /items)
navigate(path): void         // ตั้ง location.hash
```

### 3.8 validate.js และข้อผิดพลาด

```js
validateProductInput(input): { ok, errors }      // ชื่อ/หน่วย/หมวดหมู่/หมายเหตุ
validateReceiveInput(input): { ok, errors }      // สินค้า + จำนวน/จุดเก็บ/วันหมดอายุ
validateName(name): { ok, errors }
class ValidationError extends Error  { errors: Record<string, string> }
class ReferencedError extends Error  { kind: 'location' | 'category' | 'product'; count: number }
```

- ลบจุดเก็บ/หมวดหมู่/สินค้าที่มีของ → throw `ReferencedError` → UI ขึ้นข้อความ "ยังมีของค้างอยู่ N ชิ้น" (US-004)
- `setLotQuantity` ไม่รับค่าติดลบ (clamp) และเมื่อถึง 0 ล็อตนั้นจะเข้า "ใช้หมดแล้ว" อัตโนมัติ (US-003)

---

## 4. โครงสร้างไฟล์และการนำทาง

### 4.1 โครงไฟล์เป้าหมาย (สร้างจริงใน S2)

```text
sabayjai-pantry/
├── index.html                 # shell + <div id="app"> + สคริปต์โมดูล
├── package.json               # scripts: dev / build / preview
├── vite.config.js
├── .nvmrc                     # ล็อก Node (Cloudflare Pages อ่านค่านี้)
├── public/                    # ของ static (ที่วาง manifest/ไอคอนสำหรับ R008)
└── src/
    ├── main.js                # bootstrap: loadState → startRouter
    ├── router.js
    ├── store.js
    ├── styles/main.css        # ธีม + CSS variables (สีเหลือง/แดง)
    ├── data/
    │   ├── storage.js
    │   ├── db.js
    │   ├── selectors.js
    │   ├── validate.js
    │   └── seed.js
    │   # undo.js → สร้างตอน R005 (OQ-R10)
    ├── ui/
    │   ├── dom.js             # el(), clear(), on()
    │   ├── shell.js           # เมนูหลัก + โครงหน้า
    │   └── components.js      # การ์ด, ป้ายสถานะ, ปุ่ม, toast, modal
    └── views/
        ├── items.js
        ├── item-form.js
        ├── locations.js
        ├── categories.js
        ├── expiring.js
        ├── used-up.js
        ├── shopping.js
        └── settings.js
```

### 4.2 ตาราง route → หน้าจอ

| Route | หน้าจอ | รับผิดชอบ |
|---|---|---|
| `#/items` | รายการทั้งหมด (+กรอง/ค้นหา) | US-002 |
| `#/add` | ฟอร์มเพิ่มของ | US-001 |
| `#/locations` | จุดเก็บ | US-004 |
| `#/categories` | หมวดหมู่ | ข้อ 2.1 ข้อ 4 |
| `#/expiring` | มุมใกล้หมดอายุ/หมดอายุ | US-005 |
| `#/used-up` | ใช้หมดแล้ว + นำกลับ | US-007 |
| `#/shopping` | รายการที่ต้องซื้อ | US-008 |
| `#/settings` | ตั้งค่า + รีเซ็ต seed | OQ-11 |

> **แบบร่างหน้าจอของแต่ละเส้นทาง** (โทเคน · องค์ประกอบ · ถ้อยคำไทย · prototype คลิกได้): `docs/design/sabayjai-pantry-ux-ui.md` — ร่างเสร็จ 2026-10-16 (R001 · S3) · ต้องผ่านการตรวจรับก่อนเริ่มสร้างจอจริงใน R002 เป็นต้นไป

---

## 5. ข้อแลกเปลี่ยนและข้อจำกัด (Trade-offs & Notes)

1. **มี build step (Vite) แลกกับ tooling** — ได้ HMR, การจัดการ ES module/asset และต่อ PWA plugin ง่ายใน R008; แลกกับต้องรัน `npm install`/`npm run build` ก่อน และมี `node_modules` · ฝั่ง Cloudflare Pages ตั้ง `Build command = npm run build`, `Build output directory = dist`, ล็อก Node ด้วย `.nvmrc`
2. **Hash routing แทน History API** — ไม่ต้องตั้ง `_redirects` และไม่ต้องระวังพฤติกรรม SPA fallback/`404.html` ของ Pages; แลกกับ URL มี `#` และ SEO (ไม่สำคัญกับเดโมนี้)
3. **คีย์เดียว + `schemaVersion`** — รีเซ็ต/migration ง่าย; แลกกับการเขียนใหม่ทั้งก้อนทุกครั้ง (ข้อมูลเล็กมาก ไม่เป็นปัญหา)
4. **Re-render ทั้ง view** — โค้ดเรียบง่าย ไม่ต้องทำ diff; เพียงพอที่สโคปนี้ (รายการหลักสิบรายการ)
5. **ไม่ใช้ TypeScript รอบนี้** — ลดความซับซ้อนสำหรับผู้เริ่มต้น; เพิ่มทีหลังได้โดยไม่รื้อโครง (Vite รองรับทันที)
6. **localStorage ≈ 5 MB และไม่มีรูป** — พอสำหรับข้อมูลข้อความ; ตรงกับที่ requirement ตัดการเก็บรูปออก
7. **PWA ยังไม่ทำ** — เลื่อนไป R008 (`vite-plugin-pwa` + `public/manifest.webmanifest` + ไอคอน); S1/S2 แค่เว้นที่วางไว้
8. **ความเร็ว (OQ-14: 1 วินาที)** — ไฟล์ static + ข้อมูลในเครื่อง ไม่มีเวลาเครือข่าย; เป้าคือ JS/CSS รวมเล็กและไม่มี render-blocking
9. **ปิดแล้ว (2026-10-16):** seed มีข้อมูลในมุมใช้หมดแล้ว/shopping มุมละ 2 รายการ (OQ-R9 · ดูข้อ 2.5) — ทำให้ทุกมุมของเดโมสาธิตได้ทันทีโดยไม่ต้องกรอกเอง
10. **สคีมา v2 (สินค้า + ล็อต): แลกความเรียบง่ายของ "แถวเดียวจบ" กับความถูกต้องของ Batch** — ได้วันหมดอายุที่จริงต่อล็อต, หักล็อตแบบ FEFO อัตโนมัติ, และประวัติการเคลื่อนไหวครบ; แลกกับชั้นข้อมูลที่ซับซ้อนขึ้น (3 คอลเลกชัน: products/lots/movements) และต้องมี `migrate()` v1→v2 · เลือกแบบนี้เพราะ requirement ต้องการคุมวันหมดอายุจริง (Batch) และเจ้าของโปรเจกต์ไม่ต้องการให้สินค้าซ้ำหลายแถวบนจอ
11. **`usedUpQuantity` เป็นข้อมูลซ้ำ (denormalized) โดยตั้งใจ (D10 · คำตอบ ข. 2026-10-16)** — ยอด "จำนวนเดิม" หาได้จาก `movements` อยู่แล้ว แต่เก็บซ้ำไว้ที่ล็อตเพื่อให้อ่านตรง ๆ ไม่ต้องไล่ประวัติทุกครั้งที่วาดมุมใช้หมดแล้ว · ข้อแลกคือมีสองที่จะไม่ตรงกันได้ → แก้ด้วย (ก) โค้ดอัปเดตทุกเส้นทางที่แตะยอด (ข) `recalculateUsedUpQuantities()` ที่คำนวณใหม่จากประวัติ พร้อมปุ่มใน `#/settings` · *ถ้าจะเปลี่ยนไปอ่านจาก movement อย่างเดียวภายหลัง ก็ไม่มีอะไรเสีย เพราะประวัติยังครบ*

---

## 6. การเชื่อมโยงกับ Requirement (Traceability)

| Requirement | ที่อยู่ในดีไซน์ |
|---|---|
| US-001 บันทึกของ | `views/item-form.js` · `db.receiveStock` · `validate.validateReceiveInput` · `ensureUnit` · autocomplete ชื่อจาก `listProducts` |
| US-002 ดู/ค้นหา/กรอง | `views/items.js` · `selectors.groupByProduct` · `selectors.filterStockRows` |
| US-003 ปรับจำนวน + ใช้หมด | `db.consumeProduct` (FEFO) · `db.setLotQuantity` · `db.restoreLot` · `undo.js` (R005) |
| US-004 จุดเก็บ | `views/locations.js` · `db.deleteLocation`/`countLotsInLocation` + `ReferencedError` |
| US-005 ใกล้หมดอายุ | `selectors.expiryStatus` (จากล็อต) · `views/expiring.js` · `expiringSummary` |
| US-007 ใช้หมดแล้ว | `views/used-up.js` · `db.listUsedUpLots` · `db.restoreLot` |
| US-008 รายการที่ต้องซื้อ | `views/shopping.js` · `db.addShopping`/`toggleShopping`/`removeShopping` |
| NFR 4.1 Responsive | `styles/main.css` (mobile-first, ไม่มี scroll แนวนอน) — ขัดเกลาเต็มที่ใน R008 |
| NFR 4.2 ภาษา/สถานะสี | `components.js` ป้าย = สี + ข้อความกำกับคู่กัน |
| NFR 4.4 ข้อมูล/รีเซ็ต | `storage.js` · `seed.js` · `views/settings.js` |
| OQ-11 รีเซ็ต seed | `resetToSeed()` + ปุ่มใน `#/settings` |

---

## 7. ขอบเขตของ S2 · Foundation & Data layer (งานต่อจากดีไซน์นี้)

1. **โครงโปรเจกต์** — ตั้ง Vite + โครงไฟล์ตามข้อ 4.1 + shell/เมนูแบบโครงล้วน (ยังไม่ตกแต่ง)
2. **ชั้นข้อมูล** — `storage.js` · `db.js` · `selectors.js` · `validate.js` · `seed.js` · `store.js` + เทสต์พื้นฐานด้วย **Vitest** (`undo.js` เลื่อนไป R005 ตาม OQ-R10)
3. **Seed + รีเซ็ต** — `seed.js` (วันหมดอายุสัมพัทธ์) + ปุ่มใน `#/settings`
4. **เรนเดอร์ seed** — `#/items` แสดง **ลิสต์เรียบ** จาก seed (ยังไม่มีฟอร์ม/ค้นหา/ตกแต่ง) เพื่อยืนยันว่าชั้นข้อมูลต่อกับจอได้จริง
5. **เกณฑ์ความเร็ว** — ยืนยันเปิดแอปแล้วเห็นรายการภายใน 1 วินาที (วัดครั้งแรก) แล้วยืนยันซ้ำที่ S3 หลังใส่แบบ

> **หน้าตาของจอทั้งหมดอยู่ใน S3 · UX/UI Draft:** `docs/design/sabayjai-pantry-ux-ui.md` (โทเคน · องค์ประกอบ · 8 จอ · prototype คลิกได้) — ชั้นข้อมูลใน S2 ไม่ต้องรอแบบจอ เพราะไม่แตะ DOM (ดู OQ-R4 ใน `docs/work/R001/01-plan.md`)
>
> **เพิ่มเข้าสโคป S2 ระหว่างทาง (2026-10-16 หลังตรวจโครงข้อมูล):** D8 สำเนาก่อนรีเซ็ต + กู้คืน (คีย์ `sabayjai-pantry.backup` + ปุ่มใน `#/settings`) · D9 ตรวจรูปร่างข้อมูลรายฟิลด์ · D10 ฟิลด์ `usedUpQuantity` + คำสั่งคำนวณใหม่ — ทั้งสามปิดในรอบเดียวกันพร้อมเทสต์ (ไม่เลื่อนไป Release ถัดไป เพราะเป็นความถูกต้องของข้อมูลที่ใช้อยู่ตอนนี้)
