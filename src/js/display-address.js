/**
 * Address result rendering (display cards, Geoapify verify, maps links).
 */
import { copyToClipboard, showToast, escapeHtml, attrEscape } from './utils.js';
import { verifyWithGeoapify, hasGeoapifyKey, matchTypeClass } from './geo-verify.js';

export function openGoogleMapsByAddress(fullAddress) {
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
export function maybeAddGeoapifyVerify(container) {
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
export function displayAddress(address) {
  const resultContainer = document.getElementById('address-result');
  if (!resultContainer) return;
  
  resultContainer.classList.remove('empty');
  
  // 检测是否是日本地址页面（通过 country 字段或 URL 路径）
  const isJapanPage = (address.country && (address.country.includes('日本') || address.country === 'JP')) ||
                      /\/jp(?:-address)?(?:\.html)?\/?$/.test(window.location.pathname) ||
                      window.location.pathname.includes('/jp-address') ||
                      window.location.pathname.endsWith('/jp.html');
  
  // 检测是否是德国地址页面（通过 country 字段或 URL 路径）
  const isGermanPage = (address.country && (address.country.includes('德国') || address.country.includes('Germany') || address.country === 'DE')) ||
                       window.location.pathname.includes('/de-address') ||
                       window.location.pathname.endsWith('/de.html');
  
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
  path.includes('/hk-address') || path.endsWith('/hk.html');
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

  // XSS: escape all user/data fields before any innerHTML interpolation
  const s = {
    lastName: escapeHtml(lastName),
    firstName: escapeHtml(firstName),
    gender: escapeHtml(gender),
    phone: escapeHtml(phone),
    email: escapeHtml(email),
    fullAddress: escapeHtml(fullAddress),
    street: escapeHtml(street),
    city: escapeHtml(city),
    county: escapeHtml(county),
    state: escapeHtml(state),
    stateCode: escapeHtml(stateCode),
    zip: escapeHtml(zip),
    dob: escapeHtml(address.identity && address.identity.dateOfBirth),
    occupation: escapeHtml(address.identity && address.identity.occupation),
    ssn: escapeHtml(address.identity && address.identity.ssn),
    cardType: escapeHtml(address.creditCard && address.creditCard.type),
    cardNumber: escapeHtml(address.creditCard && address.creditCard.number),
    cardRaw: escapeHtml(
      address.creditCard
        ? (address.creditCard.rawNumber || String(address.creditCard.number || '').replace(/\s/g, ''))
        : ''
    ),
    cvv: escapeHtml(address.creditCard && address.creditCard.cvv),
    expiryDate: escapeHtml(address.creditCard && address.creditCard.expiryDate),
  };
  const a = {
    lastName: attrEscape(lastName),
    firstName: attrEscape(firstName),
    gender: attrEscape(gender),
    phone: attrEscape(phone),
    email: attrEscape(email),
    fullAddress: attrEscape(fullAddress),
    street: attrEscape(street),
    city: attrEscape(city),
    county: attrEscape(county),
    state: attrEscape(state),
    stateCode: attrEscape(stateCode),
    zip: attrEscape(zip),
    dob: attrEscape(address.identity && address.identity.dateOfBirth),
    occupation: attrEscape(address.identity && address.identity.occupation),
    ssn: attrEscape(address.identity && address.identity.ssn),
    cardType: attrEscape(address.creditCard && address.creditCard.type),
    cardNumber: attrEscape(address.creditCard && address.creditCard.number),
    cardRaw: attrEscape(
      address.creditCard
        ? (address.creditCard.rawNumber || String(address.creditCard.number || '').replace(/\s/g, ''))
        : ''
    ),
    cvv: attrEscape(address.creditCard && address.creditCard.cvv),
    expiryDate: attrEscape(address.creditCard && address.creditCard.expiryDate),
  };
  
  // 如果是中文站（所有中文生成页面），使用统一布局（姓名 / 性别+电话 / 邮编+临时短信 / 街道 / 城市+州 / 邮箱）
  if (isChineseSite) {
    let html = '<div class="address-list">';
    
    // 第 1 行：姓名
    html += '<div class="address-row">';
    if (lastName) {
      html += `
        <div class="address-card" data-field="lastName" data-copy="${a.lastName}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.lastName}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.lastName}</div>
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
        <div class="address-card" data-field="firstName" data-copy="${a.firstName}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.firstName}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.firstName}</div>
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
        <div class="address-card" data-field="gender" data-copy="${a.gender}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.gender}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.gender}</div>
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
        <div class="address-card" data-field="phone" data-copy="${a.phone}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.phone}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.phone}</div>
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
        <div class="address-card zip-card" data-field="zip" data-copy="${a.zip}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.zip}</div>
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
          <div class="address-card" data-field="street" data-copy="${a.street}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.street}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.street}</div>
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
          <div class="address-card" data-field="city" data-copy="${a.city}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.city}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.city}</div>
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
          <div class="address-card" data-field="county" data-copy="${a.county}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.county}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.county}</div>
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
      const stateDisplay = s.stateCode ? `${s.state} (${s.stateCode})` : s.state;
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="state" data-copy="${a.state}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.state}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.state}</div>
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
          <div class="address-card" data-field="email" data-copy="${a.email}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.email}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.email}</div>
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
    const stateDisplayForFull = s.stateCode ? `${s.state} (${s.stateCode})` : s.state;
    const fullAddressFallback = [street, city, county, stateDisplayForFull, zip]
      .filter(Boolean)
      .join(', ');
    const fullAddressForCopy = fullAddress || fullAddressFallback;
    if (fullAddressForCopy) {
      html += `
        <div class="address-row address-row-full">
          <div class="address-card" data-field="fullAddress" data-copy="${a.fullAddress}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">完整地址 📋 / Full Address</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.fullAddress}</div>
              </div>
            </div>
            <div class="address-actions-bottom">
              <div class="copy-status ml-3 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
                </svg>
              </div>
              <button type="button" class="btn-verify-map" data-action="verify-map" data-address="${attrEscape(s.fullAddress)}" title="在谷歌地图中验证此地址" aria-label="在谷歌地图验证地址">
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
            <div class="address-card" data-field="dateOfBirth" data-copy="${a.dob}">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0 min-w-0 mr-4">
                  <label class="text-sm font-medium text-gray-500 dark:text-gray-400">生日 / Date of Birth</label>
                </div>
                <div class="flex-1 min-w-0 text-right">
                  <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.dob}</div>
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
          <div class="address-card" data-field="occupation" data-copy="${a.occupation}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">职业 / Occupation</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.occupation}</div>
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
          <div class="address-card" data-field="ssn" data-copy="${a.ssn}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${idLabel}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.ssn}</div>
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
          <div class="address-card" data-field="cardType" data-copy="${a.cardType}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">类型 / Card Type</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.cardType}</div>
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
          <div class="address-card" data-field="cardNumber" data-copy="${a.cardRaw}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">卡号 / Card Number</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.cardNumber}</div>
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
          <div class="address-card" data-field="cvv" data-copy="${a.cvv}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">CVV</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.cvv}</div>
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
          <div class="address-card" data-field="expiryDate" data-copy="${a.expiryDate}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">过期日期 / Expiration Date</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.expiryDate}</div>
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
      <div class="address-card" data-field="lastName" data-copy="${a.lastName}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.lastName}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.lastName}</div>
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
      <div class="address-card" data-field="firstName" data-copy="${a.firstName}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.firstName}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.firstName}</div>
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
      <div class="address-card" data-field="gender" data-copy="${a.gender}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.gender}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.gender}</div>
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
      <div class="address-card" data-field="phone" data-copy="${a.phone}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.phone}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.phone}</div>
            
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
      <div class="address-card zip-card" data-field="zip" data-copy="${a.zip}">
        <div class="flex items-center justify-between">
          <div class="flex-shrink-0 min-w-0 mr-4">
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
          </div>
          <div class="flex-1 min-w-0 text-right">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.zip}</div>
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
        <div class="address-card" data-field="email" data-copy="${a.email}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.email}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.email}</div>
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
        <div class="address-card" data-field="fullAddress" data-copy="${a.fullAddress}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.fullAddress}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.fullAddress}</div>
            </div>
          </div>
          <div class="address-actions-bottom">
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
            <button type="button" class="btn-verify-map" data-action="verify-map" data-address="${attrEscape(fullAddress)}" title="在谷歌地图中验证此地址" aria-label="在谷歌地图验证地址">
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
          <div class="address-card" data-field="street" data-copy="${a.street}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.street}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.street}</div>
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
          <div class="address-card" data-field="city" data-copy="${a.city}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.city}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.city}</div>
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
          <div class="address-card" data-field="county" data-copy="${a.county}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.county}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.county}</div>
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
        const stateDisplay = s.stateCode ? `${s.state} (${s.stateCode})` : s.state;
        html += `
          <div class="address-card" data-field="state" data-copy="${a.state}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.state}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.state}</div>
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
          <div class="address-card" data-field="zip" data-copy="${a.zip}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.zip}</div>
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
        <div class="address-card" data-field="fullAddress" data-copy="${a.fullAddress}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.fullAddress}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.fullAddress}</div>
            </div>
          </div>
          <div class="address-actions-bottom">
            <div class="copy-status ml-3 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
              </svg>
            </div>
            <button type="button" class="btn-verify-map" data-action="verify-map" data-address="${attrEscape(fullAddress)}" title="在谷歌地图中验证此地址" aria-label="在谷歌地图验证地址">
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
          <div class="address-card" data-field="street" data-copy="${a.street}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.street}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.street}</div>
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
          <div class="address-card" data-field="city" data-copy="${a.city}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.city}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.city}</div>
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
        const stateDisplay = s.stateCode ? `${s.state} (${s.stateCode})` : s.state;
        html += `
          <div class="address-card" data-field="state" data-copy="${a.state}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.state}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.state}</div>
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
          <div class="address-card" data-field="zip" data-copy="${a.zip}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${labels.zip}</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.zip}</div>
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
          <div class="address-card" data-field="dateOfBirth" data-copy="${a.dob}">
            <div class="flex items-center justify-between">
              <div class="flex-shrink-0 min-w-0 mr-4">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">生日 / Date of Birth</label>
              </div>
              <div class="flex-1 min-w-0 text-right">
                <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.dob}</div>
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
        <div class="address-card" data-field="occupation" data-copy="${a.occupation}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">职业 / Occupation</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.occupation}</div>
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
        <div class="address-card" data-field="ssn" data-copy="${a.ssn}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${idLabel}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.ssn}</div>
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
        <div class="address-card" data-field="cardType" data-copy="${a.cardType}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">类型 / Card Type</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.cardType}</div>
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
        <div class="address-card" data-field="cardNumber" data-copy="${a.cardRaw}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">卡号 / Card Number</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.cardNumber}</div>
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
        <div class="address-card" data-field="cvv" data-copy="${a.cvv}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">CVV</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.cvv}</div>
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
        <div class="address-card" data-field="expiryDate" data-copy="${a.expiryDate}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">过期日期 / Expiration Date</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${s.expiryDate}</div>
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
