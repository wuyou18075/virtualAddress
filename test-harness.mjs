import {
  pickRandomTaxFreePreviewRow,
  addressFromTaxFreePreviewRow,
} from './src/js/taxfree-preview-pack.js';
import { generateUSAddress } from './src/js/address-generator.js';
import { copyToClipboard, showToast } from './src/js/utils.js';

const STATE_NAMES = {
  AK: 'Alaska',
  DE: 'Delaware',
  MT: 'Montana',
  OR: 'Oregon',
};

const LABELS = {
  lastName: '姓 / Last Name',
  firstName: '名 / First Name',
  gender: '性别 / Gender',
  phone: '电话 / Phone',
  email: '电子邮件 / Email',
  fullAddress: '完整地址 📋 / Full Address',
  street: '街道地址 / Street Address',
  city: '城市 / City',
  county: '区县 / County',
  state: '州 / State',
  zip: '邮编 / Zip Code',
};

const COPY_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400" aria-hidden="true">
  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>
  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 6h2V5a2 2 0 00-2-2v8z"/>
</svg>`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function attrEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function card(field, label, value) {
  if (value === undefined || value === null || String(value) === '') return '';
  const disp = escapeHtml(String(value));
  const attr = attrEscape(String(value));
  return `
        <div class="address-card" data-field="${field}" data-copy="${attr}">
          <div class="flex items-center justify-between">
            <div class="flex-shrink-0 min-w-0 mr-4">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">${label}</label>
            </div>
            <div class="flex-1 min-w-0 text-right">
              <div class="text-base font-semibold text-gray-800 dark:text-gray-200 break-words">${disp}</div>
            </div>
            <div class="copy-status ml-3 flex-shrink-0">${COPY_SVG}</div>
          </div>
        </div>`;
}

function showResultError(message) {
  const el = document.getElementById('address-result');
  if (!el) return;
  el.classList.remove('empty');
  el.innerHTML = `<div class="text-center" style="color: var(--red-400); padding: 1rem;">${escapeHtml(message)}</div>`;
}

/** 与 999 主站中文美国页 results 区相同的卡片布局（字段缺省时自动省略） */
function renderAddressResult(address) {
  const el = document.getElementById('address-result');
  if (!el) return;
  if (!address || typeof address !== 'object') {
    showResultError('无可用地址数据（可能未加载到 tf-preview.pack 或所选州无条目）。');
    return;
  }

  const lastName = address.lastName || '';
  const firstName = address.firstName || '';
  const gender = address.gender || '';
  const phone = address.phone || '';
  const email = address.email || '';
  const fullAddress = address.fullAddress || '';
  const street = address.street || '';
  const city = address.city || '';
  const county = address.county || address.district || address.area || '';
  const state = address.state || address.region || address.province || '';
  const stateCode = address.stateCode || '';
  const zip = address.zip || address.postcode || address.pin || '';

  let html = '<div class="address-list">';

  if (lastName || firstName) {
    html += '<div class="address-row">';
    html += card('lastName', LABELS.lastName, lastName);
    html += card('firstName', LABELS.firstName, firstName);
    html += '</div>';
  }

  if (gender || phone) {
    html += '<div class="address-row">';
    html += card('gender', LABELS.gender, gender);
    html += card('phone', LABELS.phone, phone);
    html += '</div>';
  }

  if (zip) {
    html += '<div class="address-row address-row-full">';
    html += card('zip', LABELS.zip, zip);
    html += '</div>';
  }

  if (street) {
    html += '<div class="address-row address-row-full">';
    html += card('street', LABELS.street, street);
    html += '</div>';
  }

  if (city || county) {
    const rowClass = city && county ? 'address-row' : 'address-row address-row-full';
    html += `<div class="${rowClass}">`;
    html += card('city', LABELS.city, city);
    html += card('county', LABELS.county, county);
    html += '</div>';
  }

  if (state) {
    const stateDisplay = stateCode ? `${state} (${stateCode})` : state;
    html += '<div class="address-row address-row-full">';
    html += card('state', LABELS.state, stateDisplay);
    html += '</div>';
  }

  if (email) {
    html += '<div class="address-row address-row-full">';
    html += card('email', LABELS.email, email);
    html += '</div>';
  }

  const stateDisplayForFull = stateCode ? `${state} (${stateCode})` : state;
  const fullAddressFallback = [street, city, county, stateDisplayForFull, zip].filter(Boolean).join(', ');
  const fullAddressForCopy = fullAddress || fullAddressFallback;
  if (fullAddressForCopy) {
    html += '<div class="address-row address-row-full">';
    html += card('fullAddress', LABELS.fullAddress, fullAddressForCopy);
    html += '</div>';
  }

  html += '</div>';
  el.classList.remove('empty');
  el.innerHTML = html;
}

function bindCopyDelegation() {
  const root = document.getElementById('address-result');
  if (!root || root.dataset.copyBound) return;
  root.dataset.copyBound = '1';
  root.addEventListener('click', async (e) => {
    const cardEl = e.target.closest('.address-card');
    if (!cardEl || !cardEl.hasAttribute('data-copy')) return;
    const text = cardEl.getAttribute('data-copy');
    if (!text) return;
    const ok = await copyToClipboard(text);
    showToast(ok ? '已复制' : '复制失败', ok ? 'success' : 'error');
  });
}

function initKyHarness() {
  bindCopyDelegation();

  const btnTf = document.getElementById('btnTf');
  if (btnTf) {
    btnTf.addEventListener('click', async () => {
      const code = document.getElementById('tfState')?.value;
      if (!code) return;
      try {
        const row = await pickRandomTaxFreePreviewRow(code);
        if (!row) {
          showResultError('该州在演示包中无数据或未正确加载 tf-preview.pack.json。');
          return;
        }
        const addr = await addressFromTaxFreePreviewRow(row, STATE_NAMES[code]);
        renderAddressResult(addr);
      } catch (e) {
        showResultError(e.message || String(e));
      }
    });
  }

  const btnUs = document.getElementById('btnUs');
  if (btnUs) {
    btnUs.addEventListener('click', async () => {
      try {
        const addr = await generateUSAddress('DE');
        renderAddressResult(addr);
      } catch (e) {
        showResultError(
          (e.message || String(e)) +
            '\n请确认已在 data/ 下放置引擎合成美国地址所需的完整 JSON 集；仅含演示 .pack 时此项不可用属正常。'
        );
      }
    });
  }

  const copyAllBtn = document.getElementById('copy-all-btn');
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', async () => {
      const root = document.getElementById('address-result');
      if (!root || root.classList.contains('empty')) {
        showToast('请先生成', 'error');
        return;
      }
      const cards = root.querySelectorAll('.address-card[data-copy]');
      const parts = [];
      cards.forEach((c) => {
        const label = c.querySelector('label');
        const val = c.getAttribute('data-copy');
        if (label && val) parts.push(`${label.textContent.trim()}\t${val}`);
      });
      const text = parts.length ? parts.join('\n') : root.innerText;
      const ok = await copyToClipboard(text);
      showToast(ok ? '已复制全部字段' : '复制失败', ok ? 'success' : 'error');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKyHarness);
} else {
  initKyHarness();
}
