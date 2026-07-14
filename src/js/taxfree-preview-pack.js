/**
 * 免税州演示样例包（与 data/tf-preview.pack.json 一致）
 * 路径由 config.dataFiles.taxfreePreviewPack 决定（仅经 loadDataById，避免与 config 的导入边界问题）
 */
import { loadDataById } from './address-generator.js';
import { randomElement, generatePhoneNumber, generateUsPhoneForState } from './utils.js';

let memoryCache = null;

export async function loadTaxFreePreviewPack() {
  if (memoryCache) return memoryCache;
  memoryCache = await loadDataById('taxfreePreviewPack');
  return memoryCache;
}

export function clearTaxFreePreviewPackCache() {
  memoryCache = null;
}

/**
 * @param {string} stateCode 如 'AK'|'DE'|'MT'|'OR'
 * @returns {object|null} 单条 { street, city, county, stateCode, zip }
 */
export async function pickRandomTaxFreePreviewRow(stateCode) {
  const pack = await loadTaxFreePreviewPack();
  const list = pack.byState && pack.byState[stateCode];
  if (!list || !list.length) return null;
  return randomElement(list);
}

/**
 * 与 generateUSAddress 相同逻辑：`randomElement(state.area_codes)` + `generatePhoneNumber`。
 * 数据来自 config.dataFiles.usRegions（默认 `data/addr-regions-us.json`），结构与线站引擎一致；文件缺失时回退内置四州区号池。
 *
 * @param {string} stateCode 如 AK、DE
 */
export async function generateUsPhoneLikeEngine(stateCode) {
  const code = (stateCode || '').toUpperCase();
  try {
    const us = await loadDataById('usRegions');
    const st = us && us.states && us.states[code];
    const codes = st && st.area_codes;
    if (Array.isArray(codes) && codes.length > 0) {
      return generatePhoneNumber(String(randomElement(codes)));
    }
  } catch (_) {
    /* 未配置 usRegions 或 fetch 失败 */
  }
  return generateUsPhoneForState(code);
}

/**
 * 转为与 generateUSAddress 接近的展示用对象（含 fullAddress；始终含 phone，规则见 generateUsPhoneLikeEngine）
 * @param {object} row pickRandomTaxFreePreviewRow 的返回值
 * @param {string} stateNameEn 英文州全名，缺省用 stateCode
 */
export async function addressFromTaxFreePreviewRow(row, stateNameEn) {
  if (!row) return null;
  const street = row.street || '';
  const city = row.city || '';
  const county = row.county || '';
  const stateCode = row.stateCode || '';
  const zip = row.zip || '';
  const state = stateNameEn || stateCode;
  const fullAddress = `${street}, ${city}, ${state} ${zip}`.trim();
  const phone = await generateUsPhoneLikeEngine(stateCode);
  return {
    street,
    city,
    county,
    stateCode,
    zip,
    state,
    fullAddress,
    country: 'US',
    phone,
  };
}
