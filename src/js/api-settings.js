/**
 * API Key 配置面板模块。
 * 提供全局设置入口，将 Key 存入 localStorage。
 * 使用方式：在页面加载时调用 initApiSettings()，自动在导航栏右侧添加"API 设置"按钮。
 * 点击后弹出模态框，可配置 OpenCage 和 Geoapify 的 API Key。
 */

import { getApiKeys, setApiKeys, hasOpenCageKey, hasGeoapifyKey } from "./geo-verify.js";

const CONFIG = {
  opencage: {
    name: "OpenCage",
    url: "https://opencagedata.com/pricing",
    desc: "地理编码引擎（2,500 次/天免费）。配置后自动替代 OSM Nominatim，结果标记「已通过 OpenCage 验证」。",
  },
  geoapify: {
    name: "Geoapify",
    url: "https://www.geoapify.com/address-verification-api",
    desc: "地址验证服务（3,000 次/天免费）。配置后各页面「验证」按钮可用，返回地址确认状态。",
  },
};

/**
 * 初始化 API 设置入口。
 * 在导航栏右侧添加齿轮图标按钮，点击弹出设置面板。
 * @param {string} [position] CSS 选择器，按钮挂载位置，默认在 .header-actions 内
 */
export function initApiSettings(position) {
  // 等 DOM 就绪
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setup(position));
  } else {
    setup(position);
  }
}

function setup(position) {
  const container = position
    ? document.querySelector(position)
    : document.querySelector(".header-actions") || document.querySelector("header .header-container");
  if (!container) return;

  // 避免重复添加
  if (document.getElementById("api-settings-btn")) return;

  const btn = document.createElement("button");
  btn.id = "api-settings-btn";
  btn.className = "api-settings-btn";
  btn.setAttribute("aria-label", "API 设置");
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>`;

  // 状态指示点
  const dot = document.createElement("span");
  dot.className = "api-key-dot";
  dot.style.cssText = "display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:4px;";
  updateDot(dot);
  btn.appendChild(dot);

  btn.addEventListener("click", () => showModal(dot));
  container.appendChild(btn);

  // 添加面板样式
  injectStyles();
}

function updateDot(dot) {
  const hasAny = hasOpenCageKey() || hasGeoapifyKey();
  dot.style.backgroundColor = hasAny ? "#34d399" : "#6b7280";
}

function showModal(dot) {
  const keys = getApiKeys();
  const overlay = document.createElement("div");
  overlay.className = "api-settings-overlay";
  overlay.innerHTML = `
    <div class="api-settings-modal">
      <div class="api-settings-header">
        <h3>API 设置</h3>
        <button class="api-settings-close" aria-label="关闭">&times;</button>
      </div>
      <div class="api-settings-body">
        <p class="api-settings-hint">配置 API Key 后，本工具将使用付费/更稳定的服务替代默认的免费服务。
        Key 仅保存在浏览器本地，不会上传到任何服务器。</p>
        ${Object.entries(CONFIG).map(([id, c]) => `
          <div class="api-key-field">
            <label for="key-${id}">
              <strong>${c.name}</strong>
              <a href="${c.url}" target="_blank" rel="noopener" class="api-key-link">获取免费 Key →</a>
            </label>
            <p class="api-key-desc">${c.desc}</p>
            <input id="key-${id}" type="text" class="api-key-input" placeholder="输入 ${c.name} API Key" value="${keys[id] || ""}" spellcheck="false" autocomplete="off">
          </div>
        `).join("")}
      </div>
      <div class="api-settings-footer">
        <span id="api-settings-status" class="api-settings-status"></span>
        <button id="api-settings-save" class="btn btn-primary">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  // 动画
  requestAnimationFrame(() => overlay.classList.add("active"));

  const close = () => {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector(".api-settings-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  document.getElementById("api-settings-save").addEventListener("click", () => {
    const newKeys = {};
    for (const id of Object.keys(CONFIG)) {
      const val = document.getElementById(`key-${id}`).value.trim();
      if (val) newKeys[id] = val;
    }
    setApiKeys(newKeys);
    updateDot(dot);
    const status = document.getElementById("api-settings-status");
    status.textContent = "已保存";
    status.className = "api-settings-status ok";
    setTimeout(close, 600);
  });

  // ESC 关闭
  const escHandler = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", escHandler); } };
  document.addEventListener("keydown", escHandler);
}

function injectStyles() {
  if (document.getElementById("api-settings-style")) return;
  const style = document.createElement("style");
  style.id = "api-settings-style";
  style.textContent = `
    .api-settings-btn {
      display:inline-flex;align-items:center;justify-content:center;
      background:none;border:1px solid rgba(255,255,255,0.15);border-radius:6px;
      color:#d1d5db;padding:6px 8px;cursor:pointer;transition:all .15s;
    }
    .api-settings-btn:hover { background:rgba(255,255,255,0.08);color:#fff;border-color:#6366f1; }

    .api-settings-overlay {
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity .2s;
    }
    .api-settings-overlay.active { opacity:1; }

    .api-settings-modal {
      background:#1f2937;border:1px solid #374151;border-radius:12px;
      width:90%;max-width:520px;max-height:90vh;overflow-y:auto;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
      transform:scale(0.95);transition:transform .2s;
    }
    .api-settings-overlay.active .api-settings-modal { transform:scale(1); }

    .api-settings-header {
      display:flex;align-items:center;justify-content:space-between;
      padding:1rem 1.25rem;border-bottom:1px solid #374151;
    }
    .api-settings-header h3 { margin:0;color:#f3f4f6;font-size:1.05rem; }

    .api-settings-close {
      background:none;border:none;color:#9ca3af;font-size:1.5rem;
      cursor:pointer;padding:0 4px;line-height:1;
    }
    .api-settings-close:hover { color:#f3f4f6; }

    .api-settings-body { padding:1.25rem; }

    .api-settings-hint {
      color:#9ca3af;font-size:0.82rem;margin:0 0 1.25rem;line-height:1.5;
    }

    .api-key-field { margin-bottom:1.25rem; }
    .api-key-field:last-child { margin-bottom:0; }
    .api-key-field label {
      display:flex;align-items:center;justify-content:space-between;
      color:#e5e7eb;font-size:0.9rem;margin-bottom:4px;
    }
    .api-key-link {
      font-size:0.78rem;color:#818cf8;text-decoration:none;font-weight:400;
    }
    .api-key-link:hover { text-decoration:underline; }
    .api-key-desc { color:#6b7280;font-size:0.78rem;margin:0 0 8px;line-height:1.4; }

    .api-key-input {
      width:100%;box-sizing:border-box;
      background:#111827;border:1px solid #374151;border-radius:6px;
      color:#e5e7eb;padding:8px 10px;font-size:0.85rem;font-family:monospace;
      outline:none;transition:border-color .15s;
    }
    .api-key-input:focus { border-color:#6366f1; }

    .api-settings-footer {
      display:flex;align-items:center;justify-content:flex-end;gap:8px;
      padding:0.75rem 1.25rem;border-top:1px solid #374151;
    }
    .api-settings-status { font-size:0.82rem; }
    .api-settings-status.ok { color:#34d399; }
  `;
  document.head.appendChild(style);
}