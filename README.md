# sabayjai-pantry-demo
A hands-on demo project for the SabayJai Pantry series, exploring AI-assisted software development using the SADF approach.

ตามแนวทาง **SADF (SabayJai Approach & Development Framework)** แบบเรียบง่าย ใช้งานได้จริง 

## วัตถุประสงค์
1. ให้ผู้เริ่มต้นหรือคนทั่วไปสามารถนำโครงสร้างนี้ไปเริ่มต้นโปรเจกต์ที่ทำงานร่วมกับ AI ได้ทันที
2. รักษาแก่นสำคัญของ SADF: **Structure · Align · Delivery · Flow** เพื่อให้ทำงานได้อย่างเป็นระบบ
3. มีความยืดหยุ่นสูง ไม่ผูกมัดด้วยกฎ Audit หรือ Template หลายชั้นที่ซับซ้อนเกินจำเป็น

## โครงสร้างในชุดนี้
```text
public-bootstrap/
├── docs/
│   ├── sadf/
│   │   └── README.md          # สรุปหลักคิด SADF ฉบับสาธารณะ (ไม่รวมกลไกเชิงลึก)
│   ├── requirements/          # สำหรับเก็บโจทย์และข้อกำหนด (User Stories)
│   ├── design/                # สำหรับเก็บผลงานการออกแบบสถาปัตยกรรมและโครงข้อมูล
│   └── work/                  # การติดตามงานแบบบาง ๆ สบาย ๆ
│       ├── README.md          # คำอธิบายการใช้ work log แบบเรียบง่าย
│       └── templates/
│           ├── plan.md        # แผนงานแบบสั้น (1 หน้าจบ)
│           └── result.md      # บันทึกผลลัพธ์และหลักฐานการตรวจรับ (1 หน้าจบ)
├── .claude/
│   └── agents/                # โฟลเดอร์ว่างสำหรับสร้างหรือเก็บ Agent เฉพาะงาน
└── README.md                  # คำแนะนำสำหรับโปรเจกต์
```