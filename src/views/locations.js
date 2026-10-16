/** views/locations.js — จอ #/locations · สร้างจริงใน R002 (US-004) · แบบจออยู่ S3 */
import { el } from '../ui/dom.js';

export function renderLocations() {
  return el(
    'section',
    { class: 'view view-locations' },
    el('h2', {}, 'จุดเก็บ'),
    el(
      'p',
      { class: 'view-note' },
      'S2 ทำเฉพาะโครงเส้นทางนี้ · เพิ่ม/แก้/ลบจุดเก็บจริงสร้างใน R002 (US-004)',
    ),
  );
}
