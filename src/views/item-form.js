/** views/item-form.js — จอ #/add · สร้างจริงใน R003 (US-001) · แบบจออยู่ S3 */
import { el } from '../ui/dom.js';

export function renderItemForm() {
  return el(
    'section',
    { class: 'view view-add' },
    el('h2', {}, 'เพิ่มของ'),
    el(
      'p',
      { class: 'view-note' },
      'S2 ทำเฉพาะโครงเส้นทางนี้ · ฟอร์มเพิ่มของจริงสร้างใน R003 (US-001) ตามแบบร่าง docs/design/sabayjai-pantry-ux-ui.md',
    ),
  );
}
