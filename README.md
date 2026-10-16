# sabayjai-pantry-demo
A hands-on demo project for the SabayJai Pantry series, exploring AI-assisted software development using the SADF approach.

ตามแนวทาง **SADF (SabayJai Approach & Development Framework)** แบบเรียบง่าย ใช้งานได้จริง 

## วัตถุประสงค์
1. ให้ผู้เริ่มต้นหรือคนทั่วไปสามารถนำโครงสร้างนี้ไปเริ่มต้นโปรเจกต์ที่ทำงานร่วมกับ AI ได้ทันที
2. รักษาแก่นสำคัญของ SADF: **Structure · Align · Delivery · Flow** เพื่อให้ทำงานได้อย่างเป็นระบบ
3. มีความยืดหยุ่นสูง ไม่ผูกมัดด้วยกฎ Audit หรือ Template หลายชั้นที่ซับซ้อนเกินจำเป็น

## เริ่มใช้งาน (เดโมแอป SabayJai Pantry)

ต้องมี Node 22 (ดู `.nvmrc`) แล้วรัน:

```bash
npm install     # ติดตั้ง Vite + Vitest
npm run dev     # เปิดแอปที่ http://127.0.0.1:5173/
npm test        # เทสต์ชั้นข้อมูล (Vitest)
npm run build   # บิลด์ไฟล์ static ลง dist/ (ใช้ตอน deploy)
```

ข้อมูลของเดโมเก็บใน `localStorage` ของเบราว์เซอร์เครื่องนั้นเท่านั้น (คีย์ `sabayjai-pantry`)
มีปุ่ม “รีเซ็ตข้อมูลตัวอย่าง” ที่เมนู **ตั้งค่า** · ยังไม่มี Backend และไม่มีบัญชีผู้ใช้

## โครงสร้างในชุดนี้
```text
public-bootstrap/
├── index.html · vite.config.js · package.json   # โครงแอป (Vite + Vanilla JS)
├── src/
│   ├── main.js · router.js · store.js           # bootstrap · hash routing · pub/sub
│   ├── data/                                     # storage · db · selectors · validate · seed (+ เทสต์)
│   ├── ui/                                       # dom · shell
│   ├── views/                                    # 8 จอตามเส้นทาง (S2 ทำจริง: #/items · #/settings)
│   └── styles/main.css                           # โครงสไตล์ (ดีไซน์โทเคนจะมาใน S3)
├── docs/
│   ├── sadf/
│   │   └── README.md          # สรุปหลักคิด SADF ฉบับสาธารณะ (ไม่รวมกลไกเชิงลึก)
│   ├── requirements/          # สำหรับเก็บโจทย์และข้อกำหนด (User Stories)
│   ├── design/                # สำหรับเก็บผลงานการออกแบบสถาปัตยกรรมและโครงข้อมูล
│   └── work/                  # การติดตามงานแบบบาง ๆ สบาย ๆ
│       ├── R001/              # แผน + ผลส่งมอบของ Release แรก (01-plan.md · 02-result.md)
│       ├── README.md          # คำอธิบายการใช้ work log แบบเรียบง่าย
│       └── templates/
│           ├── plan.md        # แผนงานแบบสั้น (1 หน้าจบ)
│           └── result.md      # บันทึกผลลัพธ์และหลักฐานการตรวจรับ (1 หน้าจบ)
├── .claude/
│   └── agents/                # Agent เฉพาะงาน (requirement · design)
└── README.md                  # คำแนะนำสำหรับโปรเจกต์
```