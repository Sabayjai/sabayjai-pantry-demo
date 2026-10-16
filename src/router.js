/**
 * router.js — hash routing 8 เส้นทาง (ดีไซน์ข้อ 3.7) · path ว่าง → /items
 *
 * ทำไม hash: ไม่ต้องตั้ง _redirects และไม่ชน SPA fallback ของ Cloudflare Pages (ดีไซน์ข้อ 5.2)
 */
import { subscribe } from './store.js';
import { markActiveNav } from './ui/shell.js';
import { renderItems } from './views/items.js';
import { renderItemForm } from './views/item-form.js';
import { renderLocations } from './views/locations.js';
import { renderCategories } from './views/categories.js';
import { renderExpiring } from './views/expiring.js';
import { renderUsedUp } from './views/used-up.js';
import { renderShopping } from './views/shopping.js';
import { renderSettings } from './views/settings.js';

export const DEFAULT_PATH = '/items';

export const routes = {
  '/items': renderItems,
  '/add': renderItemForm,
  '/locations': renderLocations,
  '/categories': renderCategories,
  '/expiring': renderExpiring,
  '/used-up': renderUsedUp,
  '/shopping': renderShopping,
  '/settings': renderSettings,
};

/** เส้นทางปัจจุบันจาก hash (ไม่รู้จัก → /items) */
export function currentPath(hash = globalThis.location?.hash ?? '') {
  const path = hash.replace(/^#/, '').split('?')[0];
  return routes[path] ? path : DEFAULT_PATH;
}

/** เปลี่ยนเส้นทาง (ตั้ง location.hash แล้วปล่อยให้ hashchange เรนเดอร์) */
export function navigate(path) {
  globalThis.location.hash = path.startsWith('/') ? `#${path}` : `#/${path}`;
}

/**
 * เริ่ม router: ผูก hashchange + เรนเดอร์ครั้งแรก + re-render เมื่อ state เปลี่ยน
 * @returns {() => void} ฟังก์ชันสั่งเรนเดอร์ซ้ำ
 */
export function startRouter(mountEl) {
  const render = () => {
    const path = currentPath();
    mountEl.replaceChildren(routes[path]());
    markActiveNav(path, mountEl.ownerDocument ?? document);
    return path;
  };

  globalThis.addEventListener('hashchange', render);
  subscribe(render);

  if (!globalThis.location.hash) globalThis.location.hash = `#${DEFAULT_PATH}`;
  render();

  return render;
}
