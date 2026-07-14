// Utility Functions

// Copy text to clipboard
export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => {
      return true;
    }).catch(() => {
      return false;
    });
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve(true);
    } catch (err) {
      document.body.removeChild(textarea);
      return Promise.resolve(false);
    }
  }
}

// Generate random number between min and max (inclusive)
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get random element from array
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate random phone number
export function generatePhoneNumber(areaCode) {
  const exchange = randomInt(200, 999);
  const number = randomInt(1000, 9999);
  return `${areaCode}-${exchange}-${number}`;
}

/**
 * 仅作兜底：未提供 usRegions（addr-regions-us.json）时，generateUsPhoneLikeEngine 用此小池。
 * 与 generateUSAddress 一致时应从数据的 states[].area_codes 抽取。
 */
export const US_TAXFREE_STATE_AREA_CODES = {
  AK: ['907'],
  DE: ['302'],
  MT: ['406'],
  OR: ['503', '541', '458', '971'],
};

/**
 * 生成与美国州码粗对齐的 10 位拨号格式号码（XXX-XXX-XXXX），不依赖 usData.json
 * @param {string} stateCode 如 AK、DE、MT、OR
 */
export function generateUsPhoneForState(stateCode) {
  const key = (stateCode || '').toUpperCase();
  const pool = US_TAXFREE_STATE_AREA_CODES[key];
  const ac = pool && pool.length ? randomElement(pool) : String(randomInt(201, 989));
  return generatePhoneNumber(ac);
}

// Generate random email
export function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const domain = randomElement(domains);
  const randomNum = randomInt(100, 999);
  
  // Clean and validate names - remove spaces, dots, and ensure non-empty
  const cleanFirstName = (firstName || '').toString().trim().toLowerCase().replace(/[.\s]/g, '') || 'user';
  const cleanLastName = (lastName || '').toString().trim().toLowerCase().replace(/[.\s]/g, '') || 'name';
  
  // Ensure names are not empty
  const firstPart = cleanFirstName || 'user';
  const lastPart = cleanLastName || 'name';
  
  // Build email: firstnamelastname123@domain.com (no dot between names)
  return `${firstPart}${lastPart}${randomNum}@${domain}`;
}

// Format address for display
export function formatAddress(address) {
  if (typeof address === 'string') {
    return address;
  }
  if (address.street && address.city && address.state && address.zip) {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  }
  return JSON.stringify(address);
}

// Show toast notification
export function showToast(message, type = 'success') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Add CSS animation if not exists
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

