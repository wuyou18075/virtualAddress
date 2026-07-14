/**
 * Shared site header / mobile nav.
 * Usage: place <div id="site-header"></div> then import { mountShell } from ".../shell.js"
 * and call mountShell({ base: ".." | "." | "" }).
 */

const NAV_ITEMS = [
  { id: "home", label: "首页", href: "index" },
  { id: "cn", label: "国内地址", href: "cn" },
  { id: "hk", label: "香港", href: "hk" },
  { id: "taxfree", label: "美国免税", href: "taxfree" },
  { id: "usa", label: "美国", href: "usa" },
  { id: "uk", label: "英国", href: "uk" },
  { id: "ca", label: "加拿大", href: "ca" },
  { id: "jp", label: "日本", href: "jp" },
  { id: "tw", label: "台湾", href: "tw" },
  { id: "de", label: "德国", href: "de" },
  { id: "sg", label: "新加坡", href: "sg" },
  { id: "mac", label: "MAC 地址", href: "mac" },
];

/**
 * Resolve href for a nav item.
 * @param {"index"|"cn"|string} id
 * @param {"root"|"address"} location
 */
function resolveHref(id, location) {
  if (location === "root") {
    if (id === "index") return "./";
    return `address/${id}.html`;
  }
  // pages under /address/
  if (id === "index") return "../";
  return `${id}.html`;
}

/**
 * Detect whether current page is under /address/ or site root.
 * @returns {"root"|"address"}
 */
export function detectLocation() {
  const path = window.location.pathname || "";
  if (path.includes("/address/") || /\/address$/.test(path)) {
    return "address";
  }
  // file:// or local: if path ends with address/*.html
  if (/\/[a-z]+\.html$/i.test(path) && path.includes("address")) {
    return "address";
  }
  return "root";
}

/**
 * @param {{ location?: "root"|"address", mountId?: string }} [options]
 */
export function mountShell(options = {}) {
  const location = options.location || detectLocation();
  const mountId = options.mountId || "site-header";
  const el = document.getElementById(mountId);
  if (!el) {
    console.warn(`[shell] #${mountId} not found`);
    return;
  }

  const links = NAV_ITEMS.map((item) => {
    const href = resolveHref(item.href === "index" ? "index" : item.href, location);
    return { ...item, href };
  });

  const homeHref = resolveHref("index", location);
  const navHtml = links
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join("\n        ");

  el.outerHTML = `
  <header>
    <div class="header-container">
      <a href="${homeHref}" class="logo"><span>本地版</span></a>
      <nav class="hidden md:flex">
        ${navHtml}
      </nav>
      <div class="header-actions">
        <button id="mobile-menu-button" class="mobile-menu-btn" aria-expanded="false" aria-label="更多">
          <span>更多</span>
        </button>
      </div>
    </div>
    <div id="mobile-menu" class="mobile-menu">
        ${navHtml}
    </div>
  </header>`;

  initMobileMenu();
}

function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  if (!menuBtn || !mobileMenu) return;
  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    menuBtn.setAttribute(
      "aria-expanded",
      mobileMenu.classList.contains("active") ? "true" : "false",
    );
  });
}

export { NAV_ITEMS };
