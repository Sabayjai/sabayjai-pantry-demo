/**
 * ui/dom.js — helper สร้าง DOM ขนาดเล็ก (ดีไซน์ข้อ 1.4)
 * ไม่มี dependency · ไม่ผูกกับ state · view ทุกจอใช้ชุดนี้
 */

const PROP_KEYS = new Set(['value', 'checked', 'disabled', 'selected']);

function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) continue;
    if (Array.isArray(child)) {
      appendChildren(node, child);
      continue;
    }
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * สร้าง element
 *   el('div', { class: 'x', dataset: { id: 1 } }, 'ข้อความ', el('span', {}, 'ลูก'))
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class' || key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (PROP_KEYS.has(key)) node[key] = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  appendChildren(node, children);
  return node;
}

/** ลบลูกทั้งหมดของ node แล้วคืน node เดิม */
export function clear(node) {
  node.replaceChildren();
  return node;
}

/** ผูก event แล้วคืนฟังก์ชันถอดผูก (unsubscribe) */
export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}
