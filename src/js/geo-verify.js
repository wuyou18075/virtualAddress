/**
 * 地址验证与地理编码模块。
 * - Geoapify：地址验证（button-triggered），返回确认/部分/无效。
 * - OpenCage：地理编码（默认替代 Nominatim），需用户配置 API Key。
 * API Key 以 localStorage 存储，不强制配置——无 Key 时回退到 OSM Nominatim。
 */

const KEYS_KEY = "address_api_keys";
const OPENCAGE_BASE = "https://api.opencagedata.com/geocode/v1/json";
const GEOAPIFY_BASE = "https://api.geoapify.com/v1/geocode";

// ---- API Key 管理 ----

/** @returns {{ opencage?: string, geoapify?: string }} */
export function getApiKeys() {
  try {
    const raw = localStorage.getItem(KEYS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/**
 * 保存 API Key。
 * @param {{ opencage?: string, geoapify?: string }} keys
 */
export function setApiKeys(keys) {
  const existing = getApiKeys();
  const merged = { ...existing, ...keys };
  // 空值清理
  for (const k of Object.keys(merged)) {
    if (!merged[k]) delete merged[k];
  }
  localStorage.setItem(KEYS_KEY, JSON.stringify(merged));
}

export function hasOpenCageKey() {
  return !!getApiKeys().opencage;
}

export function hasGeoapifyKey() {
  return !!getApiKeys().geoapify;
}

// ---- OpenCage 地理编码 ----

/**
 * OpenCage 正向地理编码（替代 Nominatim search）。
 * @param {string} query 地址文本
 * @param {object} [options] { limit, language }
 * @returns {Promise<{success: boolean, source: string, data?: object, error?: string}>}
 */
export async function geocodeWithOpenCage(query, options = {}) {
  const key = getApiKeys().opencage;
  if (!key) return { success: false, source: "opencage", error: "未配置 OpenCage API Key" };

  const params = new URLSearchParams({
    q: query,
    key,
    limit: String(options.limit || 1),
    language: options.language || "en",
    pretty: "0",
    no_annotations: "1",
  });
  try {
    const res = await fetch(`${OPENCAGE_BASE}?${params}`);
    if (!res.ok) return { success: false, source: "opencage", error: `OpenCage HTTP ${res.status}` };
    const j = await res.json();
    if (!j.results || j.results.length === 0) {
      return { success: false, source: "opencage", error: "无结果" };
    }
    const r = j.results[0];
    return {
      success: true,
      source: "opencage",
      data: {
        lat: +r.geometry.lat,
        lng: +r.geometry.lng,
        confidence: r.confidence,
        formatted: r.formatted,
        display_name: r.formatted,
        address: r.components || {},
      },
    };
  } catch (e) {
    return { success: false, source: "opencage", error: e.message };
  }
}

/**
 * OpenCage 反向地理编码（替代 Nominatim reverse）。
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{success: boolean, source: string, data?: object, error?: string}>}
 */
export async function reverseWithOpenCage(lat, lng) {
  const key = getApiKeys().opencage;
  if (!key) return { success: false, source: "opencage", error: "未配置 OpenCage API Key" };

  const params = new URLSearchParams({
    q: `${lat}+${lng}`,
    key,
    limit: "1",
    language: "en",
    pretty: "0",
    no_annotations: "1",
  });
  try {
    const res = await fetch(`${OPENCAGE_BASE}?${params}`);
    if (!res.ok) return { success: false, source: "opencage", error: `OpenCage HTTP ${res.status}` };
    const j = await res.json();
    if (!j.results || j.results.length === 0) {
      return { success: false, source: "opencage", error: "无结果" };
    }
    const r = j.results[0];
    return {
      success: true,
      source: "opencage",
      data: {
        lat: +r.geometry.lat,
        lng: +r.geometry.lng,
        confidence: r.confidence,
        formatted: r.formatted,
        display_name: r.formatted,
        address: r.components || {},
      },
    };
  } catch (e) {
    return { success: false, source: "opencage", error: e.message };
  }
}

/**
 * OSM Nominatim 正向地理编码（内置回退，无需 Key）。
 * @param {string} query
 * @returns {Promise<{success: boolean, source: string, data?: object, error?: string}>}
 */
export async function geocodeWithNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=1&accept-language=en`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return { success: false, source: "nominatim", error: `Nominatim HTTP ${res.status}` };
    const arr = await res.json();
    if (!arr || arr.length === 0) return { success: false, source: "nominatim", error: "无结果" };
    const r = arr[0];
    return {
      success: true,
      source: "nominatim",
      data: {
        lat: +r.lat,
        lng: +r.lon,
        confidence: null,
        formatted: r.display_name,
        display_name: r.display_name,
        address: r.address || {},
        rawClass: r.class,
        rawType: r.type,
      },
    };
  } catch (e) {
    return { success: false, source: "nominatim", error: e.message };
  }
}

/**
 * OSM Nominatim 反向地理编码（内置回退，无需 Key）。
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{success: boolean, source: string, data?: object, error?: string}>}
 */
export async function reverseWithNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&accept-language=en`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return { success: false, source: "nominatim", error: `Nominatim HTTP ${res.status}` };
    const obj = await res.json();
    if (obj && obj.error) return { success: false, source: "nominatim", error: obj.error };
    if (!obj) return { success: false, source: "nominatim", error: "无结果" };
    return {
      success: true,
      source: "nominatim",
      data: {
        lat: +obj.lat,
        lng: +obj.lon,
        confidence: null,
        formatted: obj.display_name,
        display_name: obj.display_name,
        address: obj.address || {},
        rawClass: obj.class,
        rawType: obj.type,
      },
    };
  } catch (e) {
    return { success: false, source: "nominatim", error: e.message };
  }
}

// ---- 智能地理编码（OpenCage 优先，无 Key 回退 Nominatim）----

/**
 * 正向地理编码：OpenCage（已配 Key）→ Nominatim（回退）。
 * @param {string} query
 * @param {object} [options]
 * @returns {Promise<{success: boolean, source: string, data?: object, error?: string}>}
 */
export async function smartGeocode(query, options) {
  const key = getApiKeys().opencage;
  if (key) {
    const r = await geocodeWithOpenCage(query, options);
    if (r.success) return r;
    // OpenCage 失败时静默回退
  }
  return geocodeWithNominatim(query);
}

/**
 * 反向地理编码：OpenCage（已配 Key）→ Nominatim（回退）。
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{success: boolean, source: string, data?: object, error?: string}>}
 */
export async function smartReverse(lat, lng) {
  const key = getApiKeys().opencage;
  if (key) {
    const r = await reverseWithOpenCage(lat, lng);
    if (r.success) return r;
  }
  return reverseWithNominatim(lat, lng);
}

// ---- Geoapify 地址验证 ----

/**
 * Geoapify 地址验证（确认/部分/无效）。
 * @param {string} address 完整地址文本
 * @param {object} [options] { lat, lng } 可选坐标提示
 * @returns {Promise<{success: boolean, data?: { matchType: string, resultType: string, confidence: number, formatted: string, lat: number, lng: number, label: string }, error?: string}>}
 */
export async function verifyWithGeoapify(address, options = {}) {
  const key = getApiKeys().geoapify;
  if (!key) return { success: false, error: "未配置 Geoapify API Key" };

  const params = new URLSearchParams({ text: address, apiKey: key, format: "json", limit: "1" });
  if (options.lat != null && options.lng != null) {
    params.set("bias", `proximity:${options.lng},${options.lat}`);
  }
  try {
    const res = await fetch(`${GEOAPIFY_BASE}/search?${params}`);
    if (!res.ok) return { success: false, error: `Geoapify HTTP ${res.status}` };
    const j = await res.json();
    if (!j.features || j.features.length === 0) {
      return { success: true, data: { matchType: "none", resultType: "", confidence: 0, formatted: address, lat: null, lng: null, label: "未找到" } };
    }
    const f = j.features[0];
    const p = f.properties || {};
    return {
      success: true,
      data: {
        matchType: p.match_type || "fallback",
        resultType: p.result_type || "",
        confidence: p.rank?.confidence ?? (p.match_type === "exact" ? 1 : 0.5),
        formatted: p.formatted || address,
        lat: f.geometry?.coordinates?.[1] ?? null,
        lng: f.geometry?.coordinates?.[0] ?? null,
        label: formatMatchLabel(p.match_type),
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 将 Geoapify match_type 转为中文标签。
 * @param {string} mt
 * @returns {string}
 */
function formatMatchLabel(mt) {
  switch (mt) {
    case "exact": return "✅ 确认存在";
    case "ambiguous": return "⚠️ 部分匹配";
    case "fallback": return "⚠️ 近似匹配";
    case "none": return "❌ 未找到";
    default: return "❓ 未知";
  }
}

/**
 * 获取 Geoapify 匹配类型对应的 CSS 类名。
 * @param {string} mt
 * @returns {string}
 */
export function matchTypeClass(mt) {
  switch (mt) {
    case "exact": return "verify-ok";
    case "ambiguous": case "fallback": return "verify-warn";
    default: return "verify-fail";
  }
}