// Main JavaScript File

import { copyToClipboard, showToast } from './utils.js';
import { getSavedAddresses, saveAddress, deleteAddress, clearAllAddresses, getSavedCount, exportToCSV, exportToJSON, importFromJSON, checkGenerationRateLimit, recordGeneration, canSaveWithoutRecording } from './storage.js';
import * as AddressGenerator from './address-generator.js';
import { initApiSettings } from './api-settings.js';
import { verifyWithGeoapify, hasGeoapifyKey, matchTypeClass } from './geo-verify.js';

// Force dark mode - theme toggle removed for better mobile UX
function initDarkMode() {
  // Always use dark mode
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
}

// Mobile menu toggle
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      const isExpanded = mobileMenu.classList.contains('active');
      menuBtn.setAttribute('aria-expanded', isExpanded);
    });
  }
}

// Update saved count
function updateSavedCount() {
  const count = getSavedCount();
  const countElements = document.querySelectorAll('#saved-addresses-count, #saved-addresses-count-mobile');
  countElements.forEach(el => {
    if (el) el.textContent = count;
  });
}

function openGoogleMapsByAddress(fullAddress) {
  if (!fullAddress) return;
  const query = String(fullAddress).trim();
  if (!query) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * 在结果容器中追加 Geoapify 验证按钮（如果尚未添加）。
 * 按钮触发式调用，返回地址确认/部分/无效状态。
 * @param {HTMLElement} container
 */
function maybeAddGeoapifyVerify(container) {
  if (!container || container.querySelector('.geoapify-section')) return;
  const firstCard = container.querySelector('.address-card[data-copy]');
  if (!firstCard) return;

  const section = document.createElement('div');
  section.className = 'geoapify-section';
  section.style.cssText = 'margin-top:1rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.08);';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'padding:0.4rem 0.75rem;font-size:0.82rem;border-radius:6px;border:1px solid #6366f1;background:transparent;color:#818cf8;cursor:pointer;transition:all .15s;white-space:nowrap;';
  btn.textContent = '🔍 Geoapify 验证';
  btn.title = '调用 Geoapify 验证此地址是否真实存在（需配置 API Key）';

  const resultEl = document.createElement('span');
  resultEl.className = 'geoapify-result';
  resultEl.style.cssText = 'font-size:0.82rem;color:#9ca3af;';

  row.appendChild(btn);
  row.appendChild(resultEl);
  section.appendChild(row);

  // 找 fullAddress 卡片的 data-copy
  const fullCard = container.querySelector('[data-field="fullAddress"]');
  const getAddress = () => {
    if (fullCard) return fullCard.getAttribute('data-copy') || '';
    return firstCard.getAttribute('data-copy') || '';
  };

  btn.addEventListener('click', async () => {
    if (!hasGeoapifyKey()) {
      resultEl.textContent = '⚠️ 请先点击右上角齿轮配置 Geoapify API Key';
      resultEl.style.color = '#fbbf24';
      return;
    }
    const addr = getAddress();
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

  container.appendChild(section);
}

// Display address result
function displayAddress(address) {
  const resultContainer = document.getElementById('address-result');
  if (!resultContainer) return;
  
  resultContainer.classList.remove('empty');
  
  // 检测是否是日本地址页面（通过 country 字段或 URL 路径）
  const isJapanPage = (address.country && (address.country.includes('日本') || address.country === 'JP')) || 
                      window.location.pathname.includes('/jp-address/') ||
                      window.location.pathname.includes('/jp-address');
  
  // 检测是否是德国地址页面（通过 country 字段或 URL 路径）
  const isGermanPage = (address.country && (address.country.includes('德国') || address.country.includes('Germany') || address.country === 'DE')) ||
                       window.location.pathname.includes('/de-address/') ||
                       window.location.pathname.includes('/de-address');
  
  // 根据页面类型选择标签格式（日本页面：中文/日文，德国页面：中文/德文，其他页面：中文/英文）
  const labels = isJapanPage ? {
    lastName: '姓 / 苗字',
    firstName: '名 / 名前',
    gender: '性别 / 性別',
    phone: '电话 / 電話',
    email: '电子邮件 / メール',
    fullAddress: '完整地址 / 住所',
    street: '街道地址 / 番地',
    city: '城市 / 都市',
    county: '区县 / 区',
    state: '州 / 都道府県',
    zip: '邮编 / 郵便番号'
  } : isGermanPage ? {
    lastName: '姓 / Nachname',
    firstName: '名 / Vorname',
    gender: '性别 / Geschlecht',
    phone: '电话 / Telefon',
    email: '电子邮件 / E-Mail',
    fullAddress: '完整地址 / Vollständige Adresse',
    street: '街道地址 / Straßenadresse',
    city: '城市 / Stadt',
    county: '区县 / Landkreis',
    state: '州 / Bundesland',
    zip: '邮编 / Postleitzahl'
  } : {
    lastName: '姓 / Last Name',
    firstName: '名 / First Name',
    gender: '性别 / Gender',
    phone: '电话 / Phone',
    email: '电子邮件 / Email',
    fullAddress: '完整地址 / Full Address',
    street: '街道地址 / Street Address',
    city: '城市 / City',
    county: '区县 / County',
    state: '州 / State',
    zip: '邮编 / Zip Code'
  };
  // 语言与路径，用于区分中文站和各语言站、香港等特殊页面
  const htmlLang = (document.documentElement.lang || '').toLowerCase();
  const path = window.location.pathname || '';
  // 同时兼容 <html lang=".."> 和路径前缀（本地 file:// 打开 & 线上 /en/... 都能识别）
  const isEnglishSite = htmlLang.startsWith('en') || path.startsWith('/en/');
  const isSpanishSite = htmlLang.startsWith('es') || path.startsWith('/es/');
  const isRussianSite = htmlLang.startsWith('ru') || path.startsWith('/ru/');
  const isHKPage =
  (address.country && (address.country.includes('Hong Kong') || address.country.includes('香港') || address.country === 'HK')) ||
  path.includes('/hk-address/');
  // 是否为中文站页面（根目录中文站，不含 en / es / ru 前缀）
  const isChineseSite =
    htmlLang.startsWith('zh') &&
    !path.startsWith('/en/') &&
    !path.startsWith('/es/') &&
    !path.startsWith('/ru/');
  
  // Define field groups for layout
  const firstName = address.firstName || '';
  const lastName = address.lastName || '';
  const gender = address.gender || '';
  const phone = address.phone || '';
  const email = address.email || '';
  const fullAddress = address.fullAddress || '';
  
  // 统一处理不同国家的字段名
  const street = address.street || '';
  const city = address.city || '';
  const county = address.county || address.district || address.area || '';
  // 不同国家可能用不同的字段名：state, region, province, prefecture
  const state = address.state || address.region || address.province || address.prefecture || '';
  const stateCode = address.stateCode || '';
  // 不同国家可能用不同的字段名：zip, postcode, pin
  const zip = address.zip || address.postcode || address.pin || '';
  
  // 如果是中文站（所有中文生成页面），使用统一布局（姓名 / 性别+电话 / 邮编+临时短信 / 街道 / 城市+州 / 邮箱）
  if (isChineseSite) {
    let html = '<div class="address-list">';
    
    // 第 1 行：姓名
    html += '<div class="address-row">';
    if (lastName) {
      html += `
        <div class="address-card" data-field="lastName" data-copy="${lastName}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.lastName}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${lastName}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    if (firstName) {
      html += `
        <div class="address-card" data-field="firstName" data-copy="${firstName}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.firstName}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${firstName}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    
    // 第 2 行：性别 + 电话（不放临时短信）
    html += '<div class="address-row">';
    if (gender) {
      html += `
        <div class="address-card" data-field="gender" data-copy="${gender}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.gender}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${gender}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    if (phone) {
      html += `
        <div class="address-card" data-field="phone" data-copy="${phone}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.phone}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${phone}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    
    // 第 3 行：邮编 + 临时短信（桌面端左右两半；移动端通过 CSS 调整为电话下“临时短信 → 邮编”顺序）
    if (zip) {
      html += '<div class="address-row address-row-zip-sms">';
      // 左半：邮编
      html += `
        <div class="address-card zip-card" data-field="zip" data-copy="${zip}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${zip}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
      // 右半：临时短信按钮（不显示具体网址，只显示“💡 在线测试”）
      html += `
        <div class="address-card sms-card" data-action="sms-tool">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">临时短信</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-sky-400 break-words">
                💡 在线测试
              </div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-sky-400">
                <path d="M12.293 2.293a1 1 0 011.414 0l4 4A1 1 0 0117 8h-3v5a1 1 0 11-2 0V8H9a1 1 0 01-.707-1.707l4-4z"/>
                <path d="M5 10a1 1 0 011 1v5h8v-1a1 1 0 112 0v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-5a1 1 0 011-1z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
      html += '</div>';
    }
    
    // 第 4 行：街道地址（整行）
    if (street) {
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="street" data-copy="${street}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.street}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${street}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // 第 6 行：城市 + 区县
    const hasCityOrCounty = city || county;
    if (hasCityOrCounty) {
      const rowClass = (city && county) ? 'address-row' : 'address-row address-row-full';
      html += `<div class="${rowClass}">`;
      if (city) {
        html += `
          <div class="address-card" data-field="city" data-copy="${city}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.city}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${city}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (county) {
        html += `
          <div class="address-card" data-field="county" data-copy="${county}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.county}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${county}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    // 第 6.5 行：州（整行）
    if (state) {
      const stateDisplay = stateCode ? `${state} (${stateCode})` : state;
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="state" data-copy="${stateDisplay}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.state}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${stateDisplay}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // 第 7 行：电子邮件（底部整行）
    if (email) {
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="email" data-copy="${email}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.email}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${email}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 第 8 行：完整地址（底部整行，可直接点击复制）
    const stateDisplayForFull = stateCode ? `${state} (${stateCode})` : state;
    const fullAddressFallback = [street, city, county, stateDisplayForFull, zip]
      .filter(Boolean)
      .join(', ');
    const fullAddressForCopy = fullAddress || fullAddressFallback;
    if (fullAddressForCopy) {
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="fullAddress" data-copy="${fullAddressForCopy}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">完整地址 📋 / Full Address</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${fullAddressForCopy}</div>
              </div>
            </div>
            <div class="address-actions-bottom">
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
              <button type="button" class="btn-verify-map" data-action="verify-map" data-address="${fullAddressForCopy}" title="在谷歌地图中验证此地址" aria-label="在谷歌地图验证地址">
                📍 验证地址
              </button>
            </div>
          </div>
        </div>
      `;
    }
    
    // ===== 中文首页下方：身份信息 & 信用卡信息（沿用通用布局）=====
    if (address.identity) {
      html += '<div class="address-row address-row-full" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">';
      html += '<div style="width: 100%;"><h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">身份信息</h4></div>';
      html += '</div>';
      
      // 生日
      if (address.identity.dateOfBirth) {
        html += `
          <div class="address-row">
            <div class="address-card" data-field="dateOfBirth" data-copy="${address.identity.dateOfBirth}">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0 min-w-0 mr-4">
                  <label class="text-sm font-medium text-gray-500 dark:text-gray-400">生日 / Date of Birth</label>
                </div>
                <div class="flex-1 min-w-0 text-right">
                  <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.identity.dateOfBirth}</div>
                </div>
                <div class="copy-status ml-3 flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      // 职业和身份证号（并排显示）
      html += '<div class="address-row">';
      if (address.identity.occupation) {
        html += `
          <div class="address-card" data-field="occupation" data-copy="${address.identity.occupation}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">职业 / Occupation</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.identity.occupation}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (address.identity.ssn) {
        // 根据国家显示不同的身份证号标签
        let idLabel = 'SSN(社会安全号)'; // 默认
        const country = address.country || '';
        
        if (country.includes('美国') || country === 'US') {
          idLabel = 'SSN(社会安全号)';
        } else if (country.includes('英国') || country === 'UK') {
          idLabel = 'NINO(国民保险号)';
        } else if (country.includes('加拿大') || country === 'CA') {
          idLabel = 'SIN(社会保险号)';
        } else if (country.includes('日本') || country === 'JP') {
          idLabel = 'My Number(个人编号)';
        } else if (country.includes('印度') || country === 'IN') {
          idLabel = 'Aadhaar(阿达哈尔号)';
        } else if (country.includes('德國') || country.includes('德国') || country.includes('Germany') || country === 'DE') {
          idLabel = 'Steuer-ID(税号) / Steuer-ID';
        } else if (country.includes('台灣') || country.includes('台湾') || country === 'TW') {
          idLabel = '身份证号 / 國民身分證統一編號';
        } else if (country.includes('香港') || country === 'HK') {
          idLabel = '身份证号 / 香港身份證號碼 (HKID)';
        } else if (country.includes('新加坡') || country.includes('Singapore') || country === 'SG') {
          idLabel = 'NRIC(新加坡身份证号)';
        }
        
        html += `
          <div class="address-card" data-field="ssn" data-copy="${address.identity.ssn}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${idLabel}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.identity.ssn}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
    
    if (address.creditCard) {
      html += '<div class="address-row address-row-full" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">';
      html += '<div style="width: 100%;"><h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">信用卡信息</h4></div>';
      html += '</div>';
      
      // 卡类型和卡号（并排）
      html += '<div class="address-row">';
      if (address.creditCard.type) {
        html += `
          <div class="address-card" data-field="cardType" data-copy="${address.creditCard.type}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">类型 / Card Type</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.type}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (address.creditCard.number) {
        html += `
          <div class="address-card" data-field="cardNumber" data-copy="${address.creditCard.rawNumber || address.creditCard.number.replace(/\s/g, '')}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">卡号 / Card Number</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.number}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
      
      // CVV 和 过期日期
      html += '<div class="address-row">';
      if (address.creditCard.cvv) {
        html += `
          <div class="address-card" data-field="cvv" data-copy="${address.creditCard.cvv}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">CVV</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.cvv}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (address.creditCard.expiryDate) {
        html += `
          <div class="address-card" data-field="expiryDate" data-copy="${address.creditCard.expiryDate}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">过期日期 / Expiration Date</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.expiryDate}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
    
    html += '</div>';
    resultContainer.innerHTML = html;

    // Append Geoapify verify button if not already present
    maybeAddGeoapifyVerify(resultContainer);

    // 为所有卡片绑定点击事件（含临时短信）
    resultContainer.querySelectorAll('.address-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', async (e) => {
        const verifyBtn = e.target.closest('.btn-verify-map');
        if (verifyBtn) {
          e.preventDefault();
          e.stopPropagation();
          const fullAddressText = verifyBtn.getAttribute('data-address') || card.getAttribute('data-copy') || '';
          openGoogleMapsByAddress(fullAddressText);
          return;
        }
        const action = card.getAttribute('data-action');
        if (action === 'sms-tool') {
          window.open('https://hero-sms.com/?ref=379713', '_blank', 'noopener,noreferrer');
          return;
        }
        const text = card.getAttribute('data-copy');
        const success = await copyToClipboard(text);
        if (success) {
          showToast('文本已复制到剪贴板', 'success');
          const copyIcon = card.querySelector('.copy-status svg');
          if (copyIcon) {
            copyIcon.classList.add('text-green-500');
            setTimeout(() => {
              copyIcon.classList.remove('text-green-500');
            }, 1000);
          }
        } else {
          showToast('复制失败，请重试', 'error');
        }
      });
    });
    
    window.currentAddress = address;
    return;
  }
  
  // ===== 默认布局（非中文首页）=====
  // Build HTML with specific layout
  let html = '<div class="address-list">';
  
  // Row 1: Last Name and First Name (side by side)
  html += '<div class="address-row">';
  if (lastName) {
    html += `
      <div class="address-card" data-field="lastName" data-copy="${lastName}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.lastName}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${lastName}</div>
          </div>
          <div class="copy-status ml-3 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  if (firstName) {
    html += `
      <div class="address-card" data-field="firstName" data-copy="${firstName}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.firstName}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${firstName}</div>
          </div>
          <div class="copy-status ml-3 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  html += '</div>';
  
  // Row 2: Gender and Phone (side by side)
  html += '<div class="address-row">';
  if (gender) {
    html += `
      <div class="address-card" data-field="gender" data-copy="${gender}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.gender}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${gender}</div>
          </div>
          <div class="copy-status ml-3 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  if (phone) {
    html += `
      <div class="address-card" data-field="phone" data-copy="${phone}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.phone}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${phone}</div>
            
          </div>
          <div class="copy-status ml-3 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  html += '</div>';

  // 特例：非中文站的香港页面，在性别/电话之后插入「邮编 + 临时短信」一行
  // 中文站已经在上面的 isChineseSite 分支中单独处理，这里主要针对 EN / ES / RU 的香港页
  if (!isChineseSite && isHKPage && zip) {
    // 根据站点语言选择文案
    let smsTitle = '临时短信';
    let smsSubtitle = '在线测试';
    if (isEnglishSite) {
      smsTitle = 'Temporary SMS';
      smsSubtitle = 'Online Test';
    } else if (isSpanishSite) {
      smsTitle = 'SMS virtual';
      smsSubtitle = 'Prueba en línea';
    } else if (isRussianSite) {
      smsTitle = 'Виртуальное SMS';
      smsSubtitle = 'Тестирование онлайн';
    }

    html += '<div class="address-row address-row-zip-sms">';
    // 左半：邮编
    html += `
      <div class="address-card zip-card" data-field="zip" data-copy="${zip}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${zip}</div>
          </div>
          <div class="copy-status ml-3 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
            </svg>
          </div>
        </div>
      </div>
    `;
    // 右半：临时短信按钮（多语言文案）
    html += `
      <div class="address-card sms-card" data-action="sms-tool">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${smsTitle}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-sky-400 break-words">
              ${smsSubtitle}
            </div>
          </div>
          <div class="copy-status ml-3 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-sky-400">
              <path d="M12.293 2.293a1 1 0 011.414 0l4 4A1 1 0 0117 8h-3v5a1 1 0 11-2 0V8H9a1 1 0 01-.707-1.707l4-4z"/>
              <path d="M5 10a1 1 0 011 1v5h8v-1a1 1 0 112 0v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-5a1 1 0 011-1z"/>
            </svg>
          </div>
        </div>
      </div>
    `;
    html += '</div>';
  }
  
  // Row 3: Email (full width)
  if (email) {
    html += `
      <div class="address-row address-row-full">
        <div class="address-card" data-field="email" data-copy="${email}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.email}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${email}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Row 4: Address fields (Street, City, County, State, Zip)
  // 优先显示完整地址（如果存在），否则显示单独字段
  // 判断是否有足够的单独字段（至少要有 street 和 city）
  // 香港页面的 zip 已在专用行展示，这里不再重复使用 zip
  const zipForAddressLayout = isHKPage ? '' : zip;
  const hasEnoughFields = street && city && (state || county || zipForAddressLayout);
  
  if (fullAddress && !hasEnoughFields) {
    // 字段不完整时，优先显示完整地址
    html += `
      <div class="address-row address-row-full">
        <div class="address-card" data-field="fullAddress" data-copy="${fullAddress}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.fullAddress}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${fullAddress}</div>
            </div>
          </div>
          <div class="address-actions-bottom">
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
            <button type="button" class="btn-verify-map" data-action="verify-map" data-address="${fullAddress}" title="在谷歌地图中验证此地址" aria-label="在谷歌地图验证地址">
              📍 验证地址
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (hasEnoughFields) {
    // 有完整字段时，显示单独字段
    // Street Address (full width)
    if (street) {
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="street" data-copy="${street}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.street}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${street}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    
    // City and County (side by side if both exist, otherwise full width)
    const cityAndCountyCount = (city ? 1 : 0) + (county ? 1 : 0);
    if (cityAndCountyCount > 0) {
      const rowClass = cityAndCountyCount === 1 ? 'address-row address-row-full' : 'address-row';
      html += `<div class="${rowClass}">`;
      if (city) {
        html += `
          <div class="address-card" data-field="city" data-copy="${city}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.city}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${city}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (county) {
        html += `
          <div class="address-card" data-field="county" data-copy="${county}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.county}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${county}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
    
    // State and Zip (side by side if both exist, otherwise full width)
    const stateAndZipCount = (state ? 1 : 0) + (zipForAddressLayout ? 1 : 0);
    if (stateAndZipCount > 0) {
      const rowClass = stateAndZipCount === 1 ? 'address-row address-row-full' : 'address-row';
      html += `<div class="${rowClass}">`;
      if (state) {
        const stateDisplay = stateCode ? `${state} (${stateCode})` : state;
        html += `
          <div class="address-card" data-field="state" data-copy="${stateDisplay}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.state}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${stateDisplay}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (zipForAddressLayout) {
        html += `
          <div class="address-card" data-field="zip" data-copy="${zipForAddressLayout}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${zipForAddressLayout}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
  } else if (fullAddress) {
    // 字段不完整时，显示完整地址作为备用
    html += `
      <div class="address-row address-row-full">
        <div class="address-card" data-field="fullAddress" data-copy="${fullAddress}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.fullAddress}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${fullAddress}</div>
            </div>
          </div>
          <div class="address-actions-bottom">
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
            <button type="button" class="btn-verify-map" data-action="verify-map" data-address="${fullAddress}" title="在谷歌地图中验证此地址" aria-label="在谷歌地图验证地址">
              📍 验证地址
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (street || city || state || zipForAddressLayout) {
    // 如果只有部分字段，也显示出来（避免完全空白）
    if (street) {
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="street" data-copy="${street}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.street}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${street}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    if (city || state || zipForAddressLayout) {
      const fieldsCount = (city ? 1 : 0) + (state ? 1 : 0) + (zipForAddressLayout ? 1 : 0);
      const rowClass = fieldsCount === 1 ? 'address-row address-row-full' : 'address-row';
      html += `<div class="${rowClass}">`;
      if (city) {
        html += `
          <div class="address-card" data-field="city" data-copy="${city}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.city}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${city}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (state) {
        const stateDisplay = stateCode ? `${state} (${stateCode})` : state;
        html += `
          <div class="address-card" data-field="state" data-copy="${stateDisplay}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.state}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${stateDisplay}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      if (zipForAddressLayout) {
        html += `
          <div class="address-card" data-field="zip" data-copy="${zipForAddressLayout}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${zipForAddressLayout}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
  }
  
  // 身份信息部分（如果存在）
  if (address.identity) {
    html += '<div class="address-row address-row-full" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">';
    html += '<div style="width: 100%;"><h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">身份信息</h4></div>';
    html += '</div>';
    
    // 生日
    if (address.identity.dateOfBirth) {
      html += `
        <div class="address-row">
          <div class="address-card" data-field="dateOfBirth" data-copy="${address.identity.dateOfBirth}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">生日 / Date of Birth</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.identity.dateOfBirth}</div>
              </div>
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // 职业和SSN（并排显示）
    html += '<div class="address-row">';
    if (address.identity.occupation) {
      html += `
        <div class="address-card" data-field="occupation" data-copy="${address.identity.occupation}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">职业 / Occupation</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.identity.occupation}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    if (address.identity.ssn) {
      // 根据国家显示不同的身份证号标签
      let idLabel = 'SSN(社会安全号)'; // 默认
      const country = address.country || '';
      
      if (country.includes('美国') || country === 'US') {
        idLabel = 'SSN(社会安全号)';
      } else if (country.includes('英国') || country === 'UK') {
        idLabel = 'NINO(国民保险号)';
      } else if (country.includes('加拿大') || country === 'CA') {
        idLabel = 'SIN(社会保险号)';
      } else if (country.includes('日本') || country === 'JP') {
        idLabel = 'My Number(个人编号)';
      } else if (country.includes('印度') || country === 'IN') {
        idLabel = 'Aadhaar(阿达哈尔号)';
      } else if (country.includes('德國') || country.includes('德国') || country.includes('Germany') || country === 'DE') {
        idLabel = 'Steuer-ID(税号) / Steuer-ID';
      } else if (country.includes('台灣') || country.includes('台湾') || country === 'TW') {
        idLabel = '身份证号 / 國民身分證統一編號';
      } else if (country.includes('香港') || country === 'HK') {
        // 香港页面统一使用中英对照，方便英文地址模式下查看
        idLabel = '身份证号 / 香港身份證號碼 (HKID)';
      }
      
      html += `
        <div class="address-card" data-field="ssn" data-copy="${address.identity.ssn}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${idLabel}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.identity.ssn}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
  }
  
  // 信用卡信息部分（如果存在）
  if (address.creditCard) {
    html += '<div class="address-row address-row-full" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">';
    html += '<div style="width: 100%;"><h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">信用卡信息</h4></div>';
    html += '</div>';
    
    // 卡类型和卡号（并排显示）
    html += '<div class="address-row">';
    if (address.creditCard.type) {
      html += `
        <div class="address-card" data-field="cardType" data-copy="${address.creditCard.type}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">类型 / Card Type</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.type}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    if (address.creditCard.number) {
      html += `
        <div class="address-card" data-field="cardNumber" data-copy="${address.creditCard.rawNumber || address.creditCard.number.replace(/\s/g, '')}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">卡号 / Card Number</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.number}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    
    // CVV和过期日期（并排显示）
    html += '<div class="address-row">';
    if (address.creditCard.cvv) {
      html += `
        <div class="address-card" data-field="cvv" data-copy="${address.creditCard.cvv}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">CVV</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.cvv}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    if (address.creditCard.expiryDate) {
      html += `
        <div class="address-card" data-field="expiryDate" data-copy="${address.creditCard.expiryDate}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">过期日期 / Expiration Date</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${address.creditCard.expiryDate}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
  }
  
  html += '</div>';
  resultContainer.innerHTML = html;

  // Append Geoapify verify button if not already present
  maybeAddGeoapifyVerify(resultContainer);

  // Add copy functionality（含默认布局下的临时短信按钮）
  resultContainer.querySelectorAll('.address-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const verifyBtn = e.target.closest('.btn-verify-map');
      if (verifyBtn) {
        e.preventDefault();
        e.stopPropagation();
        const fullAddressText = verifyBtn.getAttribute('data-address') || card.getAttribute('data-copy') || '';
        openGoogleMapsByAddress(fullAddressText);
        return;
      }
      const action = card.getAttribute('data-action');
      if (action === 'sms-tool') {
        window.open('https://hero-sms.com/?ref=379713', '_blank', 'noopener,noreferrer');
        return;
      }
      const text = card.getAttribute('data-copy');
      const success = await copyToClipboard(text);
      if (success) {
        showToast('文本已复制到剪贴板', 'success');
        // Visual feedback
        const copyIcon = card.querySelector('.copy-status svg');
        if (copyIcon) {
          copyIcon.classList.add('text-green-500');
          setTimeout(() => {
            copyIcon.classList.remove('text-green-500');
          }, 1000);
        }
      } else {
        showToast('复制失败，请重试', 'error');
      }
    });
    card.style.cursor = 'pointer';
  });
  
  // Store current address for save/share
  window.currentAddress = address;
}

// Generate address handler
async function handleGenerateAddress(generatorFn, param = null, generateIdentity = false, generateCreditCard = false) {
  const generateBtn = document.getElementById('generate-address-btn');
  const resultContainer = document.getElementById('address-result');
  
  if (!generateBtn || !resultContainer) return;
  
  // Check rate limit before generating
  const rateLimitCheck = checkGenerationRateLimit();
  if (!rateLimitCheck.allowed) {
    showToast(rateLimitCheck.message, 'error');
    return;
  }
  
  generateBtn.disabled = true;
  generateBtn.textContent = '正在生成地址...';
  
  try {
    // 生成基础地址
    const address = param ? await generatorFn(param) : await generatorFn();
    
    // 如果需要生成身份信息
    if (generateIdentity) {
      address.identity = await AddressGenerator.generateIdentityInfo(address);
    }
    
    // 如果需要生成信用卡信息
    if (generateCreditCard) {
      address.creditCard = await AddressGenerator.generateCreditCardInfo();
    }
    
    displayAddress(address);
    
    // Record generation after successful generation
    const recordResult = recordGeneration();
    if (recordResult.remainingInHour > 0) {
      showToast(`地址生成成功（本小时还可生成 ${recordResult.remainingInHour} 次）`, 'success');
    } else {
      showToast('地址生成成功（本小时已达到上限）', 'success');
    }
  } catch (error) {
    console.error('Error generating address:', error);
    resultContainer.innerHTML = `<div class="empty text-center"><p>生成地址时出错: ${error.message}</p><p style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">请查看控制台获取详细信息</p></div>`;
    showToast('生成地址时出错: ' + error.message, 'error');
  } finally {
    generateBtn.disabled = false;
    const originalText = generateBtn.getAttribute('data-original-text') || '生成地址';
    generateBtn.textContent = originalText;
  }
}

// Save address handler
function handleSaveAddress() {
  const saveBtn = document.getElementById('save-to-list-btn');
  if (!saveBtn) return;
  
  saveBtn.addEventListener('click', () => {
    if (!window.currentAddress) {
      showToast('请先生成一个地址', 'error');
      return;
    }
    
    // Check if this save is part of a recent generation (within 8 seconds)
    // If yes, allow save without recording (already counted)
    // If no, check rate limit and record as new operation
    const isRecentGeneration = canSaveWithoutRecording();
    
    if (!isRecentGeneration) {
      // This is a save of an old address, need to check rate limit
      const rateLimitCheck = checkGenerationRateLimit();
      if (!rateLimitCheck.allowed) {
        showToast(rateLimitCheck.message, 'error');
        return;
      }
    }
    
    const result = saveAddress(window.currentAddress);
    if (result.success) {
      // Only record if this is not part of a recent generation
      if (!isRecentGeneration) {
        recordGeneration();
      }
      showToast(result.message, 'success');
      updateSavedCount();
      displaySavedAddresses();
    } else {
      showToast(result.message, 'error');
    }
  });
}

// Build full info text for copy（复制按钮使用：结构化字段，便于填表）
function buildFullInfoText(address) {
  if (!address) return '';
  const lines = [];

  // 基本信息
  const fullName = `${address.firstName || ''} ${address.lastName || ''}`.trim();
  if (fullName) lines.push(`姓名：${fullName}`);
  if (address.gender) lines.push(`性别：${address.gender}`);
  if (address.phone) lines.push(`电话：${address.phone}`);
  if (address.email) lines.push(`邮箱：${address.email}`);

  // 地址拆分字段：国家 / 城市 / 州 / 街道 / 邮编
  const country = address.country || '';
  const street = address.street || '';
  const city = address.city || '';
  const county = address.county || address.district || address.area || '';
  const state = address.state || address.region || address.province || address.prefecture || '';
  const stateCode = address.stateCode || '';
  const zip = address.zip || address.postcode || address.pin || '';

  if (country) lines.push(`国家：${country}`);
  if (state || stateCode) {
    const stateDisplay = stateCode ? `${state} (${stateCode})` : state;
    lines.push(`州/省：${stateDisplay}`);
  }
  if (city) lines.push(`城市：${city}`);
  if (county) lines.push(`区/县：${county}`);
  if (street) lines.push(`街道：${street}`);
  if (zip) lines.push(`邮编：${zip}`);

  // 完整地址单独一行，便于一键粘贴
  if (address.fullAddress) {
    lines.push(`完整地址：${address.fullAddress}`);
  }

  if (address.identity) {
    const id = address.identity;
    if (id.dateOfBirth) lines.push(`生日：${id.dateOfBirth}`);
    if (id.occupation) lines.push(`职业：${id.occupation}`);
    if (id.ssn) lines.push(`证件号：${id.ssn}`);
  }

  if (address.creditCard) {
    const card = address.creditCard;
    if (card.type) lines.push(`卡类型：${card.type}`);
    if (card.number) lines.push(`卡号：${card.number}`);
    if (card.expiryDate) lines.push(`有效期：${card.expiryDate}`);
    if (card.cvv) lines.push(`CVV：${card.cvv}`);
  }

  return lines.join('\n');
}

// Copy full info button handler (复制整条信息)
function handleCopyFullInfo() {
  const copyBtn = document.getElementById('copy-full-info');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', async () => {
    if (!window.currentAddress) {
      showToast('请先生成一个地址', 'error');
      return;
    }

    const text = buildFullInfoText(window.currentAddress);
    const success = await copyToClipboard(text);
    if (success) {
      showToast('生成内容已复制到剪切板', 'success');
    }
  });
}

// 根据当前中文页面路径返回分享国家/地区标签
function getChineseShareCountryLabel() {
  const path = window.location.pathname || '';

  if (path.includes('/usa-address/')) return '美国';
  if (path.includes('/hk-address/')) return '香港';
  if (path.includes('/uk-address/')) return '英国';
  if (path.includes('/de-address/')) return '德国';
  if (path.includes('/sg-address/')) return '新加坡';
  if (path.includes('/jp-address/')) return '日本';
  if (path.includes('/ca-address/')) return '加拿大';
  if (path.includes('/in-address/')) return '印度';
  if (path.includes('/tw-address/')) return '台湾';
  return '美国免税州';
}

function buildChineseShareText(countryLabel) {
  return `我在用 MockAddress 生成${countryLabel}地址。
免费，不用注册，还能直接在 Google Maps 验证。
👉 你也试试 🥰（点开就能用）`;
}

function buildChineseSharePayload() {
  const shareUrl = window.location.href.split('#')[0].split('?')[0];
  const countryLabel = getChineseShareCountryLabel();
  const shareText = buildChineseShareText(countryLabel);
  return {
    shareUrl,
    shareText,
    previewText: `${shareText}\n\n${shareUrl}`
  };
}

function openShareModal(sharePayload) {
  const modal = document.getElementById('share-modal');
  const overlay = document.getElementById('share-modal-overlay');
  const preview = document.getElementById('share-preview');
  const linkInput = document.getElementById('share-link');

  if (!modal || !overlay || !preview || !linkInput) return;
  preview.textContent = sharePayload.previewText;
  linkInput.value = sharePayload.shareUrl;
  modal.classList.add('active');
  overlay.classList.add('active');
}

// Share site handler（“分享”按钮：分享网站本身，而不是具体某条地址）
function handleShareAddress() {
  const shareBtn = document.getElementById('share-current');
  if (!shareBtn) return;
  
  shareBtn.addEventListener('click', async () => {
    const sharePayload = buildChineseSharePayload();
    const copied = await copyToClipboard(sharePayload.previewText);
    if (copied) {
      showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
    }
    openShareModal(sharePayload);
  });
}

// Close share modal
function initShareModal() {
  const modal = document.getElementById('share-modal');
  const overlay = document.getElementById('share-modal-overlay');
  const modalContent = modal ? modal.querySelector('.modal-content') : null;
  const closeBtn = document.getElementById('share-modal-close');
  const copyTextBtn = document.getElementById('copy-share-text');
  const copyLinkBtn = document.getElementById('copy-share-link');
  const fbBtn = document.getElementById('share-fb');
  const xBtn = document.getElementById('share-x');
  const tgBtn = document.getElementById('share-tg');
  const waBtn = document.getElementById('share-wa');
  
  function closeModal() {
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }
  
  // Close when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      // Only close if clicking directly on overlay, not on modal content
      if (e.target === overlay) {
        closeModal();
      }
    });
  }
  
  // Prevent modal content clicks from closing the modal
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Close when clicking close button
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });
  }
  
  // Close when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });
  
  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      if (preview) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
    });
  }
  
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const linkInput = document.getElementById('share-link');
      if (linkInput) {
        const success = await copyToClipboard(linkInput.value);
        if (success) {
          showToast('链接已复制', 'success');
        }
      }
    });
  }

  // Share to Facebook
  if (fbBtn) {
    fbBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      if (preview && preview.textContent) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
      const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent(url);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Share to X (Twitter)
  if (xBtn) {
    xBtn.addEventListener('click', () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      let text = preview ? (preview.textContent || '') : '';
      // 如果预览里已经包含了链接，则去掉那一部分，避免 X 中出现重复链接
      if (url && text.includes(url)) {
        text = text.replace(url, '').trim();
      }
      const shareUrl = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(text) +
        '&url=' + encodeURIComponent(url);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Share to Telegram
  if (tgBtn) {
    tgBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      let text = preview ? (preview.textContent || '') : '';
      if (url && text.includes(url)) {
        text = text.replace(url, '').trim();
      }
      if (preview && preview.textContent) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
      const shareUrl = 'https://t.me/share/url?url=' +
        encodeURIComponent(url) +
        '&text=' + encodeURIComponent(text);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Share to WhatsApp
  if (waBtn) {
    waBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      let text = preview ? (preview.textContent || '') : '';
      if (url && text.includes(url)) {
        text = text.replace(url, '').trim();
      }
      if (preview && preview.textContent) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
      const shareUrl = 'https://api.whatsapp.com/send?text=' +
        encodeURIComponent(`${text}\n\n${url}`);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }
}

// Initialize clear all button
function initClearAllButton() {
  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const count = getSavedCount();
      if (count === 0) {
        showToast('没有保存的地址', 'info');
        return;
      }
      
      if (confirm(`确定要删除所有 ${count} 个保存的地址吗？此操作不可恢复。`)) {
        const result = clearAllAddresses();
        showToast(result.message, result.success ? 'success' : 'error');
        displaySavedAddresses();
        updateSavedCount();
      }
    });
  }
}

// Export handlers
function initExportMenu() {
  const exportBtn = document.getElementById('export-menu-btn');
  const exportMenu = document.getElementById('export-menu');
  const csvBtn = document.getElementById('export-csv-item');
  const jsonBtn = document.getElementById('export-json-item');
  
  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
      if (!exportMenu.contains(e.target) && e.target !== exportBtn) {
        exportMenu.classList.remove('active');
      }
    });
  }
  
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const result = exportToCSV();
      showToast(result.message, result.success ? 'success' : 'error');
      if (exportMenu) exportMenu.classList.remove('active');
    });
  }
  
  if (jsonBtn) {
    jsonBtn.addEventListener('click', () => {
      const result = exportToJSON();
      showToast(result.message, result.success ? 'success' : 'error');
      if (exportMenu) exportMenu.classList.remove('active');
    });
  }

  initImportButton();
}

/**
 * 动态注入“导入”按钮与隐藏的文件选择框（读取 JSON 合并进本地存储）。
 * 放在导出菜单旁，所有调用 initExportMenu 的页面都会自动获得导入能力。
 */
function initImportButton() {
  const wrapper = document.querySelector('.export-menu-wrapper');
  if (!wrapper || document.getElementById('import-json-btn')) return;

  const importBtn = document.createElement('button');
  importBtn.id = 'import-json-btn';
  importBtn.className = 'btn btn-primary';
  importBtn.textContent = '导入';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'import-json-input';
  fileInput.accept = 'application/json,.json';
  fileInput.style.display = 'none';

  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importFromJSON(String(reader.result || ''));
      showToast(result.message, result.success ? 'success' : 'error');
      if (result.success) {
        displaySavedAddresses();
        updateSavedCount();
      }
    };
    reader.onerror = () => showToast('读取文件失败', 'error');
    reader.readAsText(file);
    fileInput.value = ''; // 允许重复导入同一文件
  });

  // 放在导出菜单容器之后
  wrapper.insertAdjacentElement('afterend', importBtn);
  importBtn.insertAdjacentElement('afterend', fileInput);
}

// Initialize state select dropdown with bilingual options
export async function initStateSelect() {
  const stateSelect = document.getElementById('state-select');
  if (!stateSelect) return;
  
  // Check if it's the tax-free page (has only 5 tax-free states)
  const taxFreeStates = ['AK', 'DE', 'MT', 'NH', 'OR'];
  const hasAllTaxFree = taxFreeStates.every(code => stateSelect.querySelector(`option[value="${code}"]`));
  const hasRandom = stateSelect.querySelector('option[value="RANDOM"]');
  
  // If it's tax-free page (5 states + maybe random = 5 or 6 options), skip
  if (hasAllTaxFree && !hasRandom && stateSelect.options.length === 5) {
    // Tax-free page, update format but keep it simple
    return;
  }
  
  // Check if it's India page by checking URL path
  const currentPath = window.location.pathname;
  const isIndiaPage = currentPath.includes('/in-address/');
  
  if (isIndiaPage) {
    // Load India data for India page
    try {
      const inData = await loadINData();
      
      if (!inData || !inData.states) return;
      
      // Get current selected value
      const currentValue = stateSelect.value;
      
      // Clear existing options except "RANDOM" if it exists
      const randomOption = stateSelect.querySelector('option[value="RANDOM"]');
      const randomText = randomOption ? randomOption.textContent : null;
      stateSelect.innerHTML = '';
      
      // Add random option back if it existed
      if (randomOption) {
        const newRandomOption = document.createElement('option');
        newRandomOption.value = 'RANDOM';
        newRandomOption.textContent = randomText || '随机邦 Random';
        stateSelect.appendChild(newRandomOption);
      }
      
      // Add all states with bilingual format
      const states = Object.keys(inData.states).sort();
      states.forEach(stateCode => {
        const state = inData.states[stateCode];
        if (state && state.name) {
          const option = document.createElement('option');
          option.value = stateCode;
          option.textContent = `${state.name.zh} (${stateCode})`;
          stateSelect.appendChild(option);
        }
      });
      
      // Restore selected value
      if (currentValue) {
        stateSelect.value = currentValue;
      }
    } catch (error) {
      console.error('Error loading India state data for dropdown:', error);
    }
    return;
  }
  
  // Load US data to get state names (for US pages)
  try {
    const usData = await loadUSData();
    
    if (!usData || !usData.states) return;
    
    // Get current selected value
    const currentValue = stateSelect.value;
    
    // Clear existing options except "RANDOM" if it exists
    const randomOption = stateSelect.querySelector('option[value="RANDOM"]');
    const randomText = randomOption ? randomOption.textContent : null;
    stateSelect.innerHTML = '';
    
    // Add random option back if it existed
    if (randomOption) {
      const newRandomOption = document.createElement('option');
      newRandomOption.value = 'RANDOM';
      newRandomOption.textContent = randomText || '随机 Random';
      stateSelect.appendChild(newRandomOption);
    }
    
    // Add all states with bilingual format
    const states = Object.keys(usData.states).sort();
    states.forEach(stateCode => {
      const state = usData.states[stateCode];
      if (state && state.name) {
        const option = document.createElement('option');
        option.value = stateCode;
        option.textContent = `${state.name.zh} (${state.name.en})`;
        stateSelect.appendChild(option);
      }
    });
    
    // Restore selected value
    if (currentValue) {
      stateSelect.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading state data for dropdown:', error);
  }
}

// Helper function to load India data
async function loadINData() {
  try {
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html');
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    
    // Try multiple paths (prioritize absolute path for reliability)
    const paths = [
      `/data/inData.json`,           // Absolute path from root (most reliable)
      `${prefix}data/inData.json`,   // Relative path from current location
      `data/inData.json`             // Relative to current directory
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Failed to load India data');
  } catch (error) {
    console.error('Error loading India data:', error);
    return null;
  }
}

// Helper function to load US data
async function loadUSData() {
  try {
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    
    // Try multiple paths (prioritize absolute path for reliability)
    const paths = [
      `/data/usData.json`,           // Absolute path from root (most reliable)
      `${prefix}data/usData.json`,   // Relative path from current location
      `../data/usData.json`,         // One level up
      `../../data/usData.json`       // Two levels up
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Failed to load US data');
  } catch (error) {
    console.error('Error loading US data:', error);
    return null;
  }
}

// Initialize prefecture select dropdown for Japan
export async function initPrefectureSelect() {
  const prefectureSelect = document.getElementById('prefecture-select');
  if (!prefectureSelect) {
    console.warn('Prefecture select element not found');
    return;
  }
  
  // Load Japan data to get prefecture names
  try {
    const jpData = await loadJPData();
    
    if (!jpData || !jpData.prefectures) {
      console.warn('Japan data or prefectures not found');
      return;
    }
    
    // Get current selected value
    const currentValue = prefectureSelect.value;
    
    // Clear existing options except "RANDOM" if it exists
    const randomOption = prefectureSelect.querySelector('option[value="RANDOM"]');
    const randomText = randomOption ? randomOption.textContent : null;
    prefectureSelect.innerHTML = '';
    
    // Add random option back if it existed
    if (randomOption) {
      const newRandomOption = document.createElement('option');
      newRandomOption.value = 'RANDOM';
      newRandomOption.textContent = randomText || '随机都道府县 Random';
      prefectureSelect.appendChild(newRandomOption);
    }
    
    // Add all prefectures with bilingual format
    const prefectures = Object.keys(jpData.prefectures).sort();
    prefectures.forEach(prefectureKey => {
      const prefecture = jpData.prefectures[prefectureKey];
      if (prefecture && prefecture.name) {
        const option = document.createElement('option');
        option.value = prefectureKey;
        option.textContent = `${prefecture.name.zh} (${prefecture.name.en})`;
        prefectureSelect.appendChild(option);
      }
    });
    
    // Restore selected value
    if (currentValue) {
      prefectureSelect.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading prefecture data for dropdown:', error);
  }
}

// Helper function to load Japan data
async function loadJPData() {
  try {
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
    
    // Calculate depth: if path is /jp-address/, depth is 1; if /en/jp-address/, depth is 2
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    
    // Try multiple paths (prioritize relative paths for local development)
    const paths = [
      `${prefix}data/jpData.json`,   // Relative path from current location (most reliable for local)
      `../data/jpData.json`,         // One level up (for jp-address/)
      `../../data/jpData.json`,      // Two levels up (for en/jp-address/)
      `/data/jpData.json`            // Absolute path from root (for production)
    ];
    
    let lastError = null;
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const data = await response.json();
          return data;
        } else {
          lastError = `HTTP ${response.status} for ${path}`;
        }
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }
    
    console.error('Failed to load jpData.json. Tried paths:', paths);
    console.error('Last error:', lastError);
    console.error('Current path:', currentPath);
    console.error('Calculated depth:', depth, 'prefix:', prefix);
    throw new Error('Failed to load Japan data');
  } catch (error) {
    console.error('Error loading Japan data:', error);
    return null;
  }
}

// Initialize province select dropdown for Canada
export async function initProvinceSelect() {
  const provinceSelect = document.getElementById('province-select');
  if (!provinceSelect) {
    console.warn('Province select element not found');
    return;
  }
  
  // Load Canada data to get province names
  try {
    const caData = await loadCAData();
    
    if (!caData || !caData.provinces) {
      console.warn('Canada data or provinces not found');
      return;
    }
    
    // Get current selected value
    const currentValue = provinceSelect.value;
    
    // Clear existing options except "RANDOM" if it exists
    const randomOption = provinceSelect.querySelector('option[value="RANDOM"]');
    const randomText = randomOption ? randomOption.textContent : null;
    provinceSelect.innerHTML = '';
    
    // Add random option back if it existed
    if (randomOption) {
      const newRandomOption = document.createElement('option');
      newRandomOption.value = 'RANDOM';
      newRandomOption.textContent = randomText || '随机 Random';
      provinceSelect.appendChild(newRandomOption);
    }
    
    // Add all provinces with bilingual format
    const provinces = Object.keys(caData.provinces).sort();
    provinces.forEach(provinceKey => {
      const province = caData.provinces[provinceKey];
      if (province && province.name) {
        const option = document.createElement('option');
        option.value = provinceKey;
        option.textContent = `${province.name.zh} (${provinceKey})`;
        provinceSelect.appendChild(option);
      }
    });
    
    // Restore selected value
    if (currentValue) {
      provinceSelect.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading province data for dropdown:', error);
  }
}

// Initialize state select dropdown for Germany
export async function initDEStateSelect() {
  const stateSelect = document.getElementById('state-select');
  if (!stateSelect) {
    console.warn('State select element not found');
    return;
  }
  
  // Load Germany data to get state names
  try {
    const deData = await loadDEData();
    
    if (!deData || !deData.states) {
      console.warn('Germany data or states not found');
      return;
    }
    
    // Get current selected value
    const currentValue = stateSelect.value;
    
    // Clear existing options except "RANDOM" if it exists
    const randomOption = stateSelect.querySelector('option[value="RANDOM"]');
    const randomText = randomOption ? randomOption.textContent : null;
    stateSelect.innerHTML = '';
    
    // Add random option back if it existed
    if (randomOption) {
      const newRandomOption = document.createElement('option');
      newRandomOption.value = 'RANDOM';
      newRandomOption.textContent = randomText || '随机 Random';
      stateSelect.appendChild(newRandomOption);
    }
    
    // Add all states with bilingual format
    const states = Object.keys(deData.states).sort();
    states.forEach(stateKey => {
      const state = deData.states[stateKey];
      if (state && state.name) {
        const option = document.createElement('option');
        option.value = stateKey;
        option.textContent = `${state.name.zh} (${stateKey})`;
        stateSelect.appendChild(option);
      }
    });
    
    // Restore selected value
    if (currentValue) {
      stateSelect.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading state data for dropdown:', error);
  }
}

// Initialize county select dropdown for Taiwan
export async function initCountySelect() {
  const countySelect = document.getElementById('county-select');
  if (!countySelect) {
    console.warn('County select element not found');
    return;
  }
  
  // Load Taiwan data to get county names
  try {
    const twData = await loadTWData();
    
    if (!twData || !twData.counties) {
      console.warn('Taiwan data or counties not found');
      return;
    }
    
    // Get current selected value
    const currentValue = countySelect.value;
    
    // Clear existing options except "RANDOM" if it exists
    const randomOption = countySelect.querySelector('option[value="RANDOM"]');
    const randomText = randomOption ? randomOption.textContent : null;
    countySelect.innerHTML = '';
    
    // Add random option back if it existed
    if (randomOption) {
      const newRandomOption = document.createElement('option');
      newRandomOption.value = 'RANDOM';
      newRandomOption.textContent = randomText || '随机县市 Random';
      countySelect.appendChild(newRandomOption);
    }
    
    // Add all counties with bilingual format
    const counties = Object.keys(twData.counties).sort();
    counties.forEach(countyKey => {
      const county = twData.counties[countyKey];
      if (county && county.name) {
        const option = document.createElement('option');
        option.value = countyKey;
        option.textContent = `${county.name.zh} (${countyKey})`;
        countySelect.appendChild(option);
      }
    });
    
    // Restore selected value
    if (currentValue) {
      countySelect.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading county data for dropdown:', error);
  }
}

// Helper function to load Taiwan data
async function loadTWData() {
  try {
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    
    // Try multiple paths (prioritize absolute path for reliability)
    const paths = [
      `/data/twData.json`,           // Absolute path from root (most reliable)
      `${prefix}data/twData.json`,   // Relative path from current location
      `../data/twData.json`,         // One level up
      `../../data/twData.json`       // Two levels up
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Failed to load Taiwan data');
  } catch (error) {
    console.error('Error loading Taiwan data:', error);
    return null;
  }
}

// Helper function to load Canada data
async function loadCAData() {
  try {
    // Determine the correct path based on current page location
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    
    // Try multiple paths (prioritize absolute path for reliability)
    const paths = [
      `/data/caData.json`,           // Absolute path from root (most reliable)
      `${prefix}data/caData.json`,   // Relative path from current location
      `../data/caData.json`,         // One level up
      `../../data/caData.json`       // Two levels up
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Failed to load Canada data');
  } catch (error) {
    console.error('Error loading Canada data:', error);
    return null;
  }
}

// Helper function to load Germany data
async function loadDEData() {
  try {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const paths = [`/data/deData.json`, `${prefix}data/deData.json`, `../data/deData.json`, `../../data/deData.json`];
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) return await response.json();
      } catch (e) { continue; }
    }
    throw new Error('Failed to load Germany data');
  } catch (error) {
    console.error('Error loading Germany data:', error);
    return null;
  }
}

// Helper function to load Singapore data
async function loadSGData() {
  try {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
    const depth = pathParts.length;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const paths = [`/data/sgData.json`, `${prefix}data/sgData.json`, `../data/sgData.json`, `../../data/sgData.json`];
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) return await response.json();
      } catch (e) { continue; }
    }
    throw new Error('Failed to load Singapore data');
  } catch (error) {
    console.error('Error loading Singapore data:', error);
    return null;
  }
}

// Initialize region select dropdown for Singapore
export async function initSGStateSelect() {
  const stateSelect = document.getElementById('state-select');
  if (!stateSelect) return;
  try {
    const sgData = await loadSGData();
    if (!sgData || !sgData.states) return;
    const currentValue = stateSelect.value;
    const randomOption = stateSelect.querySelector('option[value="RANDOM"]');
    const randomText = randomOption ? randomOption.textContent : null;
    stateSelect.innerHTML = '';
    if (randomOption) {
      const newRandomOption = document.createElement('option');
      newRandomOption.value = 'RANDOM';
      newRandomOption.textContent = randomText || '随机 Random';
      stateSelect.appendChild(newRandomOption);
    }
    Object.keys(sgData.states).sort().forEach(stateKey => {
      const state = sgData.states[stateKey];
      if (state && state.name) {
        const option = document.createElement('option');
        option.value = stateKey;
        option.textContent = `${state.name.zh} (${stateKey})`;
        stateSelect.appendChild(option);
      }
    });
    if (currentValue) stateSelect.value = currentValue;
  } catch (error) {
    console.error('Error loading Singapore data for dropdown:', error);
  }
}

// Display saved addresses
export function displaySavedAddresses() {
  const container = document.getElementById('saved-addresses');
  if (!container) return;
  
  const addresses = getSavedAddresses();
  
  if (addresses.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>暂无保存的地址</p></div>';
    return;
  }
  
  container.innerHTML = addresses.map((addr, index) => {
    const name = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
    const fullAddress = addr.fullAddress || `${addr.street || ''}, ${addr.city || ''}, ${addr.state || addr.province || ''} ${addr.zip || addr.postcode || ''}`;
    
    return `
      <div class="table-row">
        <div class="table-cell" style="width: 25%;">${name}</div>
        <div class="table-cell" style="width: 16.67%;">${addr.gender || ''}</div>
        <div class="table-cell" style="width: 25%;">${addr.phone || ''}</div>
        <div class="table-cell" style="width: 33.33%;">${fullAddress}</div>
        <div class="table-actions" style="width: 80px;">
          <button class="share" data-index="${index}" title="分享">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px;">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>
          <button class="delete" data-id="${addr.id}" title="删除">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4A1 1 0 009 4v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add delete handlers
  container.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const result = deleteAddress(id);
      showToast(result.message, result.success ? 'success' : 'error');
      displaySavedAddresses();
      updateSavedCount();
    });
  });
}

// Initialize page
// Initialize API settings gear button in nav
initApiSettings();

export function initPage(config) {
  // Initialize dark mode
  initDarkMode();
  
  // Initialize mobile menu
  initMobileMenu();
  
  // Update saved count
  updateSavedCount();
  
  // Initialize address generation
  if (config.generateHandler) {
    const generateBtn = document.getElementById('generate-address-btn');
    if (generateBtn) {
      generateBtn.setAttribute('data-original-text', generateBtn.textContent);
      generateBtn.addEventListener('click', config.generateHandler);
    }
  }
  
  // Initialize save button
  handleSaveAddress();

  // Initialize "copy full info" button
  handleCopyFullInfo();
  
  // Initialize share button
  handleShareAddress();
  
  // Initialize share modal
  initShareModal();
  
  // Initialize clear all button
  initClearAllButton();
  
  // Initialize export menu
  initExportMenu();
  
  // Display saved addresses if on saved addresses page
  if (config.showSavedAddresses) {
    displaySavedAddresses();
  }
  
  // Handle share URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const shareData = urlParams.get('share');
  if (shareData) {
    try {
      const address = JSON.parse(decodeURIComponent(shareData));
      displayAddress(address);
    } catch (e) {
      console.error('Error parsing share data:', e);
    }
  }
}

// Export for use in pages
export { AddressGenerator, displayAddress, handleGenerateAddress };
// Note: initPrefectureSelect, initProvinceSelect, and initCountySelect are already exported above as 'export async function'

