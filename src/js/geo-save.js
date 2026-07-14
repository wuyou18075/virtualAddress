// 地理地址（省/市/区/街道/邮编/坐标/完整地址）的保存、列表、导出、导入模块。
// 用独立 localStorage 键，与身份地址（saved_addresses）分开，避免结构混淆。
// 供“首页(按 IP 找住宅地址)”与“国内地址转换”两个内联脚本页复用。

const GEO_STORAGE_KEY = "saved_geo_addresses";

/**
 * 读取已保存的地理地址列表。
 * @returns {Array<Object>}
 */
export function getSavedGeo() {
  try {
    const data = localStorage.getItem(GEO_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("读取已保存地理地址失败:", e);
    return [];
  }
}

/** 提取去重用的核心字段（排除 id/savedAt）。 */
function geoCore(item) {
  const { id, savedAt, ...core } = item;
  return JSON.stringify(core);
}

/**
 * 保存一条地理地址（按核心字段去重）。
 * @param {Object} geo { province, city, district, road, houseNumber, postcode, country, lat, lon, fullAddress, residential, mapCoordUrl, mapAddrUrl }
 * @returns {{success: boolean, message: string}}
 */
export function saveGeo(geo) {
  try {
    if (!geo || (!geo.fullAddress && !geo.lat)) {
      return { success: false, message: "没有可保存的地址" };
    }
    const list = getSavedGeo();
    const core = geoCore(geo);
    if (list.some((it) => geoCore(it) === core)) {
      return { success: false, message: "该地址已保存，请勿重复添加" };
    }
    list.push({ ...geo, id: Date.now().toString(), savedAt: new Date().toISOString() });
    localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(list));
    return { success: true, message: "地址已保存" };
  } catch (e) {
    console.error("保存地理地址失败:", e);
    return { success: false, message: "保存地址时出错" };
  }
}

/**
 * 按 id 删除。
 * @param {string} id
 * @returns {{success: boolean, message: string}}
 */
export function deleteGeo(id) {
  try {
    const list = getSavedGeo().filter((it) => it.id !== id);
    localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(list));
    return { success: true, message: "删除成功" };
  } catch (e) {
    return { success: false, message: "删除失败" };
  }
}

/**
 * 清空全部。
 * @returns {{success: boolean, message: string}}
 */
export function clearGeo() {
  try {
    localStorage.removeItem(GEO_STORAGE_KEY);
    return { success: true, message: "已清空所有地址" };
  } catch (e) {
    return { success: false, message: "清空失败" };
  }
}

/** 触发浏览器下载。 */
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** CSV 字段转义。 */
function csvCell(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/**
 * 导出为 CSV。
 * @returns {{success: boolean, message: string}}
 */
export function exportGeoCSV() {
  const list = getSavedGeo();
  if (list.length === 0) return { success: false, message: "没有保存的地址" };
  const headers = ["省/State", "城市/City", "区/District", "街道/Street", "门牌", "邮编/Postcode", "国家/Country", "坐标/Coord", "完整地址/Full", "是否住宅"];
  const rows = list.map((it) => [
    it.province, it.city, it.district, it.road, it.houseNumber,
    it.postcode, it.country,
    it.lat != null ? `${it.lat}, ${it.lon}` : "",
    it.fullAddress, it.residential ? "是" : "否",
  ].map(csvCell).join(","));
  const csv = [headers.map(csvCell).join(","), ...rows].join("\n");
  download(`geo-${new Date().toISOString().split("T")[0]}.csv`, "﻿" + csv, "text/csv;charset=utf-8;");
  return { success: true, message: "CSV 文件已下载" };
}

/**
 * 导出为 JSON。
 * @returns {{success: boolean, message: string}}
 */
export function exportGeoJSON() {
  const list = getSavedGeo();
  if (list.length === 0) return { success: false, message: "没有保存的地址" };
  download(`geo-${new Date().toISOString().split("T")[0]}.json`, JSON.stringify(list, null, 2), "application/json");
  return { success: true, message: "JSON 文件已下载" };
}

/**
 * 从 JSON 文本导入（合并去重）。
 * @param {string} jsonText
 * @returns {{success: boolean, message: string, imported?: number, skipped?: number}}
 */
export function importGeoJSON(jsonText) {
  try {
    const parsed = JSON.parse(jsonText);
    const incoming = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.addresses) ? parsed.addresses : null;
    if (!incoming) return { success: false, message: "文件格式不正确：应为地址数组" };
    const list = getSavedGeo();
    const seen = new Set(list.map(geoCore));
    let imported = 0, skipped = 0;
    for (const item of incoming) {
      if (!item || typeof item !== "object") { skipped += 1; continue; }
      const core = geoCore(item);
      if (seen.has(core)) { skipped += 1; continue; }
      seen.add(core);
      list.push({ ...item, id: item.id || `${Date.now()}-${imported}`, savedAt: item.savedAt || new Date().toISOString() });
      imported += 1;
    }
    localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(list));
    return { success: true, message: `导入完成：新增 ${imported} 条，跳过重复 ${skipped} 条`, imported, skipped };
  } catch (e) {
    return { success: false, message: "导入失败：文件不是有效的 JSON" };
  }
}

/** HTML 转义。 */
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 渲染已保存列表到 #geo-saved 容器。
 * @param {(msg: string, type?: string) => void} toast 状态提示函数
 */
export function renderGeoList(toast) {
  const box = document.getElementById("geo-saved");
  if (!box) return;
  const list = getSavedGeo();
  if (list.length === 0) {
    box.innerHTML = '<div class="empty-state"><p>暂无保存的地址</p></div>';
    return;
  }
  box.innerHTML = list.map((it) => {
    const loc = [it.city, it.district].filter(Boolean).join(" · ");
    const coord = it.lat != null ? `${it.lat}, ${it.lon}` : "";
    const badge = it.residential
      ? '<span style="color:#34d399;">住宅</span>'
      : '<span style="color:#fbbf24;">非住宅</span>';
    return `
      <div class="table-row">
        <div class="table-cell" style="width: 18%;">${esc(loc || "—")}</div>
        <div class="table-cell" style="width: 40%;">${esc(it.fullAddress || "—")}</div>
        <div class="table-cell" style="width: 18%;">${esc(coord)}</div>
        <div class="table-cell" style="width: 12%;">${badge}</div>
        <div class="table-actions" style="width: 80px;">
          <button class="geo-verify" data-coord="${esc(coord)}" data-full="${esc(it.fullAddress || "")}" title="谷歌地图验证">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
          </button>
          <button class="geo-delete" data-id="${it.id}" title="删除">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4A1 1 0 009 4v3M4 7h16"/></svg>
          </button>
        </div>
      </div>`;
  }).join("");

  box.querySelectorAll(".geo-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = deleteGeo(btn.getAttribute("data-id"));
      toast && toast(r.message, r.success ? "success" : "error");
      renderGeoList(toast);
    });
  });
  box.querySelectorAll(".geo-verify").forEach((btn) => {
    btn.addEventListener("click", () => {
      const coord = btn.getAttribute("data-coord");
      const full = btn.getAttribute("data-full");
      const q = coord || full;
      if (q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, "_blank", "noopener");
    });
  });
}

// 当前待保存的地理结果（由页面 render 成功时通过 setCurrentGeo 写入）
let currentGeo = null;

/**
 * 设置当前结果，供“保存”按钮使用。
 * @param {?Object} geo 结构见 saveGeo；传 null 表示清空
 */
export function setCurrentGeo(geo) {
  currentGeo = geo;
}

/**
 * 绑定保存区所有按钮（保存/清空/导出/导入），并首次渲染列表。
 * @param {(msg: string, type?: string) => void} toast 状态提示函数
 */
export function initGeoSave(toast) {
  const saveBtn = document.getElementById("geo-save-btn");
  const clearBtn = document.getElementById("geo-clear-btn");
  const csvBtn = document.getElementById("geo-export-csv");
  const jsonBtn = document.getElementById("geo-export-json");
  const importBtn = document.getElementById("geo-import-btn");
  const importInput = document.getElementById("geo-import-input");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!currentGeo) { toast && toast("请先生成或转换一个地址", "error"); return; }
      const r = saveGeo(currentGeo);
      toast && toast(r.message, r.success ? "success" : "error");
      if (r.success) renderGeoList(toast);
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const list = getSavedGeo();
      if (list.length === 0) { toast && toast("没有可清空的地址", "error"); return; }
      if (confirm(`确定要删除全部 ${list.length} 条已保存地址吗？此操作不可恢复。`)) {
        const r = clearGeo();
        toast && toast(r.message, r.success ? "success" : "error");
        renderGeoList(toast);
      }
    });
  }
  if (csvBtn) {
    csvBtn.addEventListener("click", () => {
      const r = exportGeoCSV();
      toast && toast(r.message, r.success ? "success" : "error");
    });
  }
  if (jsonBtn) {
    jsonBtn.addEventListener("click", () => {
      const r = exportGeoJSON();
      toast && toast(r.message, r.success ? "success" : "error");
    });
  }
  if (importBtn && importInput) {
    importBtn.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const r = importGeoJSON(String(reader.result || ""));
        toast && toast(r.message, r.success ? "success" : "error");
        if (r.success) renderGeoList(toast);
      };
      reader.onerror = () => toast && toast("读取文件失败", "error");
      reader.readAsText(file);
      importInput.value = "";
    });
  }

  renderGeoList(toast);
}
