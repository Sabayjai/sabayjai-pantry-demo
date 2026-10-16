/** views/categories.js — จอ #/categories · สร้างจริงใน R002 (ข้อ 2.1) · แบบจออยู่ S3 */
import { el } from '../ui/dom.js';

export function renderCategories() {
  return el(
    'section',
    { class: 'view view-categories' },
    el('h2', {}, 'หมวดหมู่'),
    el(
      'p',
      { class: 'view-note' },
      'S2 ทำเฉพาะโครงเส้นทางนี้ · เพิ่ม/แก้/ลบหมวดหมู่จริงสร้างใน R002 (requirement ข้อ 2.1)',
    ),
  );
}
