// Main JavaScript File

import { copyToClipboard, showToast, escapeHtml, attrEscape } from './utils.js';
import { getSavedAddresses, saveAddress, deleteAddress, clearAllAddresses, getSavedCount, exportToCSV, exportToJSON, importFromJSON, checkGenerationRateLimit, recordGeneration, canSaveWithoutRecording } from './storage.js';
import { initApiSettings } from './api-settings.js';
import { displayAddress } from './display-address.js';
import { handleShareAddress, initShareModal } from './share.js';
import {
  initStateSelect,
  initPrefectureSelect,
  initProvinceSelect,
  initDEStateSelect,
  initCountySelect,
  initSGStateSelect,
} from './selectors.js';

// Force dark mode - theme toggle removed for better mobile UX
function initDarkMode() {
  // Always use dark mode
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
}

// Update saved count
function updateSavedCount() {
  const count = getSavedCount();
  const countElements = document.querySelectorAll('#saved-addresses-count, #saved-addresses-count-mobile');
  countElements.forEach(el => {
    if (el) el.textContent = count;
  });
}

// 统一刷新保存列表与计数，确保保存/删除/清空/导入后 UI 状态一致
function refreshSavedAddressesUI() {
  displaySavedAddresses();
  updateSavedCount();
}

let savedAddressesDelegated = false;
// 保存列表删除改为容器事件委托，避免每次重渲染逐个绑定监听器
function bindSavedAddressesDelegation() {
  if (savedAddressesDelegated) return;
  const container = document.getElementById('saved-addresses');
  if (!container) return;
  savedAddressesDelegated = true;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const result = deleteAddress(id);
    showToast(result.message, result.success ? 'success' : 'error');
    refreshSavedAddressesUI();
  });
}

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
    
    // 身份 / 测试卡按需加载，避免国家页首屏拉全量 generator
    if (generateIdentity || generateCreditCard) {
      const { generateIdentityInfo, generateCreditCardInfo } = await import('./generators/identity.js');
      if (generateIdentity) {
        address.identity = await generateIdentityInfo(address);
      }
      if (generateCreditCard) {
        address.creditCard = await generateCreditCardInfo();
      }
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
      refreshSavedAddressesUI();
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
        refreshSavedAddressesUI();
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
        refreshSavedAddressesUI();
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
export function displaySavedAddresses() {
  const container = document.getElementById('saved-addresses');
  if (!container) return;
  
  const addresses = getSavedAddresses();
  
  if (addresses.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>暂无保存的地址</p></div>';
    return;
  }
  
  container.innerHTML = addresses.map((addr, index) => {
    const name = `${addr.firstName || ""} ${addr.lastName || ""}`.trim();
    const fullAddress = addr.fullAddress || `${addr.street || ""}, ${addr.city || ""}, ${addr.state || addr.province || ""} ${addr.zip || addr.postcode || ""}`;

    return `
      <div class="table-row">
        <div class="table-cell" style="width: 25%;">${escapeHtml(name)}</div>
        <div class="table-cell" style="width: 16.67%;">${escapeHtml(addr.gender || "")}</div>
        <div class="table-cell" style="width: 25%;">${escapeHtml(addr.phone || "")}</div>
        <div class="table-cell" style="width: 33.33%;">${escapeHtml(fullAddress)}</div>
        <div class="table-actions" style="width: 80px;">
          <button class="share" data-index="${index}" title="分享">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px;">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>
          <button class="delete" data-id="${attrEscape(addr.id)}" title="删除">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4A1 1 0 009 4v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join("");

  // 删除按钮通过容器事件委托处理（见 bindSavedAddressesDelegation）
  bindSavedAddressesDelegation();
}

// Initialize page
// Initialize API settings gear button in nav
initApiSettings();

export function initPage(config) {
  // Initialize dark mode
  initDarkMode();
  
  // Mobile menu is handled by shell.js mountShell()
  
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

  // 预先绑定保存列表事件委托（即便未展示保存区，也无副作用）
  bindSavedAddressesDelegation();

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
export { displayAddress, handleGenerateAddress };
export {
  initStateSelect,
  initPrefectureSelect,
  initProvinceSelect,
  initDEStateSelect,
  initCountySelect,
  initSGStateSelect,
};
