/**
 * Shared logic for index.html and address/cn.html geo tools.
 * Call initGeoPage() after mountShell().
 */
import { initGeoSave, setCurrentGeo } from "./geo-save.js";
import { showToast } from "./utils.js";
import { initApiSettings } from "./api-settings.js";
import {
  smartGeocode,
  smartReverse,
  hasOpenCageKey,
  verifyWithGeoapify,
  hasGeoapifyKey,
  matchTypeClass,
} from "./geo-verify.js";

/**
 * Boot the geo conversion / IP residential UI on the current document.
 */
export function initGeoPage() {
      const $ = (id) => document.getElementById(id);
      const setStatus = (t) => { $("status").textContent = t || ""; };

      // ---- GCJ-02 <-> WGS-84 火星坐标纠偏（中国境内浏览器定位多为 GCJ-02）----
      const PI = Math.PI, A = 6378245.0, EE = 0.00669342162296594323;
      function outOfChina(lng, lat) {
        return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
      }
      function transformLat(x, y) {
        let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
        ret += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
        ret += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
        return ret;
      }
      function transformLng(x, y) {
        let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
        ret += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
        ret += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
        return ret;
      }
      /**
       * GCJ-02 坐标转 WGS-84（供 OSM/Nominatim 使用）。
       * @param {number} lng GCJ-02 经度
       * @param {number} lat GCJ-02 纬度
       * @returns {{lng:number, lat:number}} WGS-84 坐标
       */
      function gcj02ToWgs84(lng, lat) {
        if (outOfChina(lng, lat)) return { lng, lat };
        let dLat = transformLat(lng - 105.0, lat - 35.0);
        let dLng = transformLng(lng - 105.0, lat - 35.0);
        const radLat = lat / 180.0 * PI;
        let magic = Math.sin(radLat);
        magic = 1 - EE * magic * magic;
        const sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
        dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
        return { lng: lng - dLng, lat: lat - dLat };
      }

      /**
       * 构造 Google 地图搜索跳转链接（不依赖任何 API，中英文均可）。
       * @param {string} query 地址文本
       * @returns {string} URL
       */
      function googleMapsLink(query) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      }

      /**
       * 将 smartGeocode/smartReverse 结果归一化为 render 所需的 Nominatim 格式。
       */
      function toNominatimShape(r) {
        if (!r || !r.success) return null;
        const d = r.data;
        return {
          address: d.address || {},
          lat: String(d.lat),
          lon: String(d.lng),
          display_name: d.display_name || d.formatted || "",
          class: d.rawClass || null,
          type: d.rawType || null,
          _source: r.source,
          _confidence: d.confidence,
        };
      }

      /**
       * 正向地理编码：OpenCage（已配 Key）→ Nominatim（回退）。
       * @param {string} q 中文地址
       * @returns {Promise<?Object>} 归一化的结果对象，无结果返回 null
       */
      async function geocode(q) {
        const r = await smartGeocode(q, { limit: 1, language: "en" });
        return toNominatimShape(r);
      }

      /**
       * 反向地理编码：OpenCage（已配 Key）→ Nominatim（回退）。
       * @param {number} lat
       * @param {number} lng
       * @returns {Promise<?Object>}
       */
      async function reverse(lat, lng) {
        const r = await smartReverse(lat, lng);
        return toNominatimShape(r);
      }

      /**
       * 由 Nominatim address 明细拼装“门牌+街道+区+市+省+国家”英文地址。
       * @param {Object} a address 明细对象
       * @returns {string}
       */
      function formatEnAddress(a) {
        if (!a) return "";
        const parts = [
          [a.house_number, a.road].filter(Boolean).join(" "),
          a.neighbourhood || a.suburb,
          a.city_district || a.district,
          a.city || a.town || a.county,
          a.state,
          a.postcode,
          a.country,
        ].filter(Boolean);
        return parts.join(", ");
      }

      // 复制图标 SVG（与其他地址页保持一致）
      const COPY_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
      </svg>`;

      /** HTML 转义，避免地址中的引号/尖括号破坏结构。 */
      function esc(s) {
        return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }

      /**
       * 生成一张与其他地址页同款的信息卡片（点击整卡复制 data-copy）。
       * @param {string} field 字段键
       * @param {string} label 标签(中/英)
       * @param {string} value 显示值
       * @param {{copy?:string, valueClass?:string}} [opt]
       * @returns {string} 卡片 HTML
       */
      function card(field, label, value, opt = {}) {
        const copy = opt.copy != null ? opt.copy : value;
        const valueClass = opt.valueClass || "";
        return `
          <div class="address-card" data-field="${field}" data-copy="${esc(copy)}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${label}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words ${valueClass}">${esc(value)}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">${COPY_SVG}</div>
            </div>
          </div>`;
      }

      let lastEn = "";
      /**
       * 渲染结果卡片（结构与其他地址页统一：address-list / address-row / address-card）。
       * @param {Object} p { cnQuery, result }
       */
      function render({ cnQuery, result }) {
        const box = $("cn-result");
        box.classList.remove("empty");
        const gLinkAddr = googleMapsLink(cnQuery || (result && result.display_name) || "");

        if (!result) {
          lastEn = "";
          let html = '<div class="address-list">';
          html += `<div class="address-row">${card("original", "原始地址 / Input", cnQuery || "-")}</div>`;
          html += `<div class="address-row">${card("enAddress", "英文地址 / English", "OSM 未收录该地址的门牌级数据，无法罗马化", { copy: cnQuery || "", valueClass: "warn" })}</div>`;
          html += `<div class="address-row address-row-full">
            <div class="address-card" data-field="fullAddress" data-copy="${esc(cnQuery || "")}">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0 min-w-0 mr-4">
                  <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Google 地图 📋 / Maps</label>
                </div>
                <div class="flex-1 min-w-0 text-right">
                  <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">用原地址查询</div>
                </div>
              </div>
              <div class="address-actions-bottom">
                <div class="copy-status ml-3 flex-shrink-0">${COPY_SVG}</div>
                <a class="btn-verify-map" href="${gLinkAddr}" target="_blank" rel="noopener" title="在谷歌地图中打开">📍 在谷歌地图打开</a>
              </div>
            </div>
          </div>`;
          html += "</div>";
          html += `<div class="hint">可尝试补充或简化地址（如只填“市+区+知名地标”），或改用高德/百度查询。</div>`;
          box.innerHTML = html;
          bindCards(box);
          setCurrentGeo(null); // 无门牌级结果，不可保存
          return;
        }

        const a = result.address || {};
        const en = formatEnAddress(a) || result.display_name || "";
        lastEn = en;
        const lat = result.lat, lon = result.lon;
        const gLinkCoord = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

        // 拆分各级字段（与国外页同粒度）：省 / 市 / 区县 / 街道 / 门牌 / 邮编
        const province = a.state || a.region || "";
        const city = a.city || a.town || a.municipality || a.county || "";
        const district = a.city_district || a.district || a.suburb || a.county || "";
        const road = a.road || a.pedestrian || a.neighbourhood || "";
        const houseNumber = a.house_number || "";
        const postcode = a.postcode || "";
        const country = a.country || "";
        // 详细地址：门牌 + 街道（英文语序）
        const detail = [houseNumber, road].filter(Boolean).join(" ");

        /** 无值时统一显示占位并标黄，复制内容为空。 */
        const opt = (v, extra = {}) => v
          ? { valueClass: extra.valueClass || "", copy: v }
          : { copy: "", valueClass: "warn" };

        // 住宅判定徽章：是=绿色，否=黄色，并附判定原因
        const cls = classifyResidential(result);
        const badge = `<div class="resi-badge ${cls.residential ? "resi-yes" : "resi-no"}">
          <span>${cls.residential ? "✅ 居民住宅地址：是" : "⚠️ 居民住宅地址：否"}</span>
          <span class="resi-reason">判定依据：${esc(cls.reason)}</span>
        </div>`;

        // 数据来源标记
        const sourceBadge = result._source === "opencage"
          ? '<div class="resi-badge resi-yes" style="margin-top:-0.3rem;"><span>🔑 已通过 OpenCage 验证</span></div>'
          : '<div class="resi-badge resi-yes" style="margin-top:-0.3rem;background:rgba(59,130,246,0.12);color:#60a5fa;border-color:rgba(59,130,246,0.4);"><span>🌐 OpenStreetMap 数据</span></div>';

        let html = badge + sourceBadge + '<div class="address-list">';
        // 第 1 行：省 / 直辖市 + 城市
        html += '<div class="address-row">';
        html += card("province", "省 / State / Province", province || "—", opt(province));
        html += card("city", "城市 / City", city || "—", opt(city));
        html += "</div>";
        // 第 2 行：区县 + 街道
        html += '<div class="address-row">';
        html += card("district", "区 / District", district || "—", opt(district));
        html += card("road", "街道 / Street", road || "—", opt(road));
        html += "</div>";
        // 第 3 行：详细地址(门牌+街道) + 邮编
        html += '<div class="address-row">';
        html += card("detail", "详细地址 / Street Address", detail || "—", { ...opt(detail), valueClass: detail ? "en-addr" : "warn" });
        html += card("postcode", "邮编 / Postcode", postcode || "OSM 无邮编数据", opt(postcode));
        html += "</div>";
        // 第 4 行：国家 + 坐标
        html += '<div class="address-row">';
        html += card("country", "国家 / Country", country || "—", opt(country));
        html += card("coord", "坐标 / Coord (WGS84)", `${lat}, ${lon}`);
        html += "</div>";
        // 完整地址卡（附验证按钮），与其他页同款
        html += `<div class="address-row address-row-full">
          <div class="address-card" data-field="fullAddress" data-copy="${esc(en)}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">完整英文地址 📋 / Full Address</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words en-addr">${esc(en)}</div>
              </div>
            </div>
            <div class="address-actions-bottom">
              <div class="copy-status ml-3 flex-shrink-0">${COPY_SVG}</div>
              <a class="btn-verify-map" href="${gLinkCoord}" target="_blank" rel="noopener" title="按坐标在谷歌地图验证">📍 按坐标验证</a>
              <a class="btn-verify-map" href="${gLinkAddr}" target="_blank" rel="noopener" title="按地址在谷歌地图验证">📍 按地址验证</a>
            </div>
          </div>
        </div>`;
        html += "</div>";
        box.innerHTML = html;
        bindCards(box);
        // 记录当前结果供“保存”按钮使用
        setCurrentGeo({
          province, city, district, road, houseNumber, postcode, country,
          lat, lon, fullAddress: en, residential: cls.residential,
        });
        // Geoapify 验证按钮
        appendGeoapifyVerify(box, en);
      }

      /**
       * 为结果区所有卡片绑定“点击复制”，并显示复制成功反馈。
       * @param {HTMLElement} box
       */
      function bindCards(box) {
        box.querySelectorAll(".address-card").forEach((cardEl) => {
          cardEl.addEventListener("click", async (e) => {
            // 点击验证按钮/链接时不触发复制
            if (e.target.closest(".btn-verify-map")) return;
            const text = cardEl.getAttribute("data-copy") || "";
            if (!text) return;
            try {
              await navigator.clipboard?.writeText(text);
              cardEl.classList.add("copied");
              setStatus("已复制：" + text);
              setTimeout(() => cardEl.classList.remove("copied"), 1200);
            } catch (err) {
              setStatus("复制失败，请手动选择文本。");
            }
          });
        });
      }

      async function handleConvert() {
        const q = $("addr-input").value.trim();
        if (!q) { setStatus("请先输入中文地址。"); return; }
        setStatus("查询中…（首次可能较慢）");
        try {
          const result = await geocode(q);
          render({ cnQuery: q, result });
          setStatus(result ? "完成。" : "未找到门牌级结果，已降级为 Google 链接。");
        } catch (e) {
          setStatus("查询失败：" + e.message + "（可能网络无法访问 openstreetmap.org）");
          render({ cnQuery: q, result: null });
        }
      }

      function handleLocate() {
        if (!navigator.geolocation) { setStatus("当前浏览器不支持定位。"); return; }
        setStatus("正在获取定位…请在弹窗中允许。");
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const rawLng = pos.coords.longitude, rawLat = pos.coords.latitude;
          // 中国境内浏览器定位通常为 GCJ-02，转回 WGS-84 供 OSM 使用
          const { lng, lat } = gcj02ToWgs84(rawLng, rawLat);
          setStatus(`定位成功（${lat.toFixed(5)}, ${lng.toFixed(5)}），反查地址中…`);
          try {
            const result = await reverse(lat, lng);
            render({ cnQuery: result ? result.display_name : `${lat},${lng}`, result });
            setStatus(result ? "完成。" : "该坐标附近 OSM 无门牌级数据。");
          } catch (e) {
            setStatus("反查失败：" + e.message);
          }
        }, (err) => {
          setStatus("定位失败：" + err.message);
        }, { enableHighAccuracy: true, timeout: 10000 });
      }

      /**
       * 免 Key 获取当前出口 IP 的大致坐标、城市与国家（多服务回退，均支持 HTTPS + CORS）。
       * 逐个尝试，任一成功即返回；全部失败抛出汇总错误。
       * @returns {Promise<{lat:number, lng:number, city:string, country:string, source:string}>}
       */
      async function ipLocate() {
        // 每个服务：url + 从返回 JSON 提取 {lat,lng,city,country} 的解析器
        const providers = [
          {
            name: "ipwho.is",
            url: "https://ipwho.is/",
            parse: (j) => (j && j.success !== false && j.latitude)
              ? { lat: +j.latitude, lng: +j.longitude, city: j.city || "", country: j.country || "" } : null,
          },
          {
            name: "geojs",
            url: "https://get.geojs.io/v1/ip/geo.json",
            parse: (j) => (j && j.latitude)
              ? { lat: +j.latitude, lng: +j.longitude, city: j.city || "", country: j.country || "" } : null,
          },
          {
            name: "freeipapi",
            url: "https://freeipapi.com/api/json",
            parse: (j) => (j && j.latitude != null)
              ? { lat: +j.latitude, lng: +j.longitude, city: j.cityName || "", country: j.countryName || "" } : null,
          },
          {
            name: "ipapi.co",
            url: "https://ipapi.co/json/",
            parse: (j) => (j && j.latitude)
              ? { lat: +j.latitude, lng: +j.longitude, city: j.city || "", country: j.country_name || "" } : null,
          },
        ];
        const errors = [];
        for (const p of providers) {
          try {
            const res = await fetch(p.url, { headers: { "Accept": "application/json" } });
            if (!res.ok) { errors.push(`${p.name}:${res.status}`); continue; }
            const j = await res.json();
            const loc = p.parse(j);
            if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) return { ...loc, source: p.name };
            errors.push(`${p.name}:无坐标`);
          } catch (e) {
            errors.push(`${p.name}:${e.message}`);
          }
        }
        throw new Error("全部 IP 定位服务不可用（" + errors.join(" / ") + "）");
      }

      /**
       * 在中心坐标附近随机偏移一个点。
       * @param {number} lat 中心纬度
       * @param {number} lng 中心经度
       * @param {number} radiusKm 最大半径(公里)
       * @returns {{lat:number, lng:number}}
       */
      function jitter(lat, lng, radiusKm) {
        const r = radiusKm / 111; // 约 111km / 度
        const u = Math.random(), v = Math.random();
        const w = r * Math.sqrt(u), t = 2 * Math.PI * v;
        const dLat = w * Math.cos(t);
        const dLng = (w * Math.sin(t)) / Math.cos(lat * Math.PI / 180);
        return { lat: lat + dLat, lng: lng + dLng };
      }

      // 非住宅类别黑名单：命中则判为地标/公共设施，剔除（如白宫、景点、政府楼、学校、商场等）。
      const NON_RESIDENTIAL_CLASSES = new Set([
        "tourism", "historic", "leisure", "office", "shop", "amenity",
        "military", "aeroway", "railway", "natural", "man_made", "waterway",
        "aerialway", "boundary", "government", "club", "craft", "healthcare",
        "emergency", "power", "public_transport",
      ]);
      // address 明细里若出现这些键，同样说明是设施而非住宅。
      const NON_RESIDENTIAL_ADDR_KEYS = [
        "tourism", "historic", "office", "shop", "amenity", "leisure",
        "military", "aeroway", "railway", "man_made", "government", "club",
        "healthcare", "emergency",
      ];
      // 明确视为住宅的建筑类型（当 class=building 时进一步确认）。
      const RESIDENTIAL_BUILDING = new Set([
        "residential", "house", "apartments", "detached", "semidetached_house",
        "terrace", "dormitory", "bungalow", "yes",
      ]);

      /**
       * 判定反查结果是否为“居民住宅/普通门牌”，并给出判定原因（用于状态栏与徽章）。
       * @param {Object} result Nominatim 反查结果
       * @returns {{residential:boolean, reason:string}}
       */
      function classifyResidential(result) {
        if (!result) return { residential: false, reason: "无结果" };
        const a = result.address || {};
        const cls = result.class || result.category || "";
        // 1) 顶层类别命中黑名单 -> 非住宅
        if (NON_RESIDENTIAL_CLASSES.has(cls)) {
          return { residential: false, reason: `设施类别 ${cls}${result.type ? "/" + result.type : ""}` };
        }
        // 2) address 明细里带设施键 -> 非住宅
        for (const k of NON_RESIDENTIAL_ADDR_KEYS) {
          if (a[k]) return { residential: false, reason: `设施标记 ${k}=${a[k]}` };
        }
        // 3) 是建筑：仅接受住宅类建筑类型
        if (cls === "building" && result.type && !RESIDENTIAL_BUILDING.has(result.type)) {
          return { residential: false, reason: `非住宅建筑 building/${result.type}` };
        }
        // 4) 必须落到具体街道/门牌级
        if (!(a.house_number || a.road)) {
          return { residential: false, reason: "仅到区级，无街道/门牌" };
        }
        return { residential: true, reason: cls ? `${cls}${result.type ? "/" + result.type : ""}` : "住宅门牌" };
      }

      /**
       * 判断反查结果是否为“居民住宅/普通门牌”而非知名地标或公共设施。
       * @param {Object} result Nominatim 反查结果
       * @returns {boolean}
       */
      function isResidential(result) {
        return classifyResidential(result).residential;
      }

      /**
       * 按 IP 定位所在城市，随机偏移反查，直到拿到“居民住宅/普通门牌”的具体地址。
       * 剔除白宫、景点、政府/商业等地标；结果用坐标链接验证。
       */
      async function handleIp() {
        setStatus("正在按 IP 定位所在城市…");
        let center;
        try {
          center = await ipLocate();
        } catch (e) {
          setStatus("IP 定位失败：" + e.message);
          return;
        }
        // 组合"国家 · 城市"用于状态提示，便于确认是否走了代理/VPN 出口 IP
        const place = [center.country, center.city].filter(Boolean).join(" · ");
        const cityTip = place ? `（${place}）` : "";
        setStatus(`IP 定位：${place || "未知"}${center.source ? "，来源 " + center.source : ""}，正在附近随机取住宅地址…`);

        // 由近及远多轮尝试，每轮多次随机；只接受“住宅/普通门牌”，剔除地标与公共设施
        const rounds = [1.5, 4, 8, 15];
        let best = null;      // 兜底：含街道门牌但非住宅（宁可要它也别只到区级）
        let coarse = null;    // 更次兜底：仅到区级
        for (const radiusKm of rounds) {
          for (let i = 0; i < 5; i++) {
            const p = jitter(center.lat, center.lng, radiusKm);
            let result;
            try {
              result = await reverse(p.lat, p.lng);
            } catch (e) {
              setStatus("反查失败：" + e.message);
              return;
            }
            if (!result) continue;
            const a = result.address || {};
            if (isResidential(result)) {
              // 命中居民住宅/普通门牌
              render({ cnQuery: result.display_name, result });
              setStatus(`已生成${cityTip}附近的居民住宅地址（谷歌地图可按坐标验证）。`);
              return;
            }
            if ((a.road || a.house_number) && !best) best = result; // 有门牌但是设施
            if (!coarse) coarse = result;                            // 仅区级
          }
        }
        // 多轮仍无住宅级：优先用“有门牌的设施”，再退到区级，并如实提示（含判定原因，便于调试）
        const fb = best || coarse;
        if (fb) {
          render({ cnQuery: fb.display_name, result: fb });
          const why = classifyResidential(fb).reason;
          setStatus(`附近住宅门牌数据较少，已放宽给出最接近的地址（非住宅：${why}），结果已标黄，可按坐标在谷歌地图验证。`);
        } else {
          setStatus("附近 OSM 无可用地址数据，请重试或改用手动输入。");
        }
      }

      /**
       * 在结果容器中追加 Geoapify 验证按钮（触发式，不自动调用）。
       * @param {HTMLElement} box 结果容器
       * @param {string} fullAddress 完整地址文本
       */
      function appendGeoapifyVerify(box, fullAddress) {
        if (!box || box.querySelector('.geoapify-verify-section')) return;
        const sec = document.createElement('div');
        sec.className = 'geoapify-verify-section';
        sec.style.cssText = 'margin-top:0.75rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'padding:0.35rem 0.7rem;font-size:0.8rem;border-radius:6px;border:1px solid #6366f1;background:transparent;color:#818cf8;cursor:pointer;transition:all .15s;';
        btn.textContent = '🔍 Geoapify 验证';
        btn.title = '调用 Geoapify 验证此地址是否真实存在（需配置 API Key）';

        const resultEl = document.createElement('span');
        resultEl.className = 'geoapify-result';
        resultEl.style.cssText = 'font-size:0.82rem;color:#9ca3af;';

        sec.appendChild(btn);
        sec.appendChild(resultEl);
        box.appendChild(sec);

        btn.addEventListener('click', async () => {
          if (!hasGeoapifyKey()) {
            resultEl.textContent = '⚠️ 请先配置 Geoapify API Key（右上角齿轮）';
            resultEl.style.color = '#fbbf24';
            return;
          }
          const addr = fullAddress || box.querySelector('[data-copy]')?.getAttribute('data-copy') || '';
          if (!addr) { resultEl.textContent = '⚠️ 无地址可验证'; return; }

          btn.disabled = true;
          btn.textContent = '验证中…';
          resultEl.textContent = '';

          const r = await verifyWithGeoapify(addr);
          btn.disabled = false;
          btn.textContent = '🔍 Geoapify 验证';

          if (!r.success) {
            resultEl.textContent = '❌ ' + (r.error || '验证失败');
            resultEl.style.color = '#ef4444';
            return;
          }
          const d = r.data;
          const cls = matchTypeClass(d.matchType);
          const color = cls === 'verify-ok' ? '#34d399' : cls === 'verify-warn' ? '#fbbf24' : '#ef4444';
          resultEl.style.color = color;
          resultEl.innerHTML = d.label + (d.confidence > 0 ? `（置信度 ${Math.round(d.confidence * 100)}%）` : '');
        });
      }

      $("ip-btn").addEventListener("click", handleIp);
      $("convert-btn").addEventListener("click", handleConvert);
      $("locate-btn").addEventListener("click", handleLocate);
      $("addr-input").addEventListener("keydown", (e) => { if (e.key === "Enter") handleConvert(); });
      $("copy-en-btn").addEventListener("click", () => { if (lastEn) navigator.clipboard?.writeText(lastEn); });
      $("mobile-menu-button")?.addEventListener("click", () => $("mobile-menu").classList.toggle("open"));

      // 导出下拉菜单开合
      const geoExportBtn = $("geo-export-btn");
      const geoExportMenu = $("geo-export-menu");
      if (geoExportBtn && geoExportMenu) {
        geoExportBtn.addEventListener("click", (e) => { e.stopPropagation(); geoExportMenu.classList.toggle("active"); });
        document.addEventListener("click", (e) => {
          if (!geoExportMenu.contains(e.target) && e.target !== geoExportBtn) geoExportMenu.classList.remove("active");
        });
      }
      // API 设置齿轮按钮
      initApiSettings();

      // 初始化保存/导出/导入并渲染已保存列表
      initGeoSave(showToast);
}
