// MAC Address Generator

import { randomElement } from './utils.js';
import { getConfig, getDataFilePath } from './config.js';

// Data cache to reduce server requests
const dataCache = new Map();
const CACHE_PREFIX = 'mac_data_cache_';
const CACHE_VERSION = 'v1';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Load OUI data from JSON file with caching (memory + localStorage)
async function loadOuiData() {
  const filePath = getDataFilePath('macOui');
  
  try {
    // Check memory cache first
    if (dataCache.has(filePath)) {
      return dataCache.get(filePath);
    }
    
    // Check localStorage cache
    const cacheKey = CACHE_PREFIX + filePath;
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_EXPIRY) {
          dataCache.set(filePath, parsed.data);
          return parsed.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn('localStorage cache read failed:', e);
    }
    
    // Get user configuration
    const config = getConfig();
    const fileName = filePath.split('/').pop();
    
    // Build paths array based on configuration
    const paths = [];
    
    // If user has configured a custom dataBasePath, use it first
    if (config.dataBasePath) {
      // Ensure trailing slash
      const basePath = config.dataBasePath.endsWith('/') ? config.dataBasePath : config.dataBasePath + '/';
      paths.push(basePath + fileName);
    }
    
    // If autoDetectPaths is enabled (default), add automatic path detection
    // This preserves the original behavior for mockaddress.com
    if (config.autoDetectPaths !== false) {
      const currentPath = window.location.pathname;
      
      // Try multiple possible paths
      // Priority: relative path (../data/) first, then absolute paths
      paths.push(
        `../data/${fileName}`,          // Relative: go up one level, then into data (works for all language versions)
        `/data/${fileName}`,            // Absolute path from root (for Chinese version)
        `data/${fileName}`,             // Relative to current directory (fallback)
        filePath                        // Original path (fallback)
      );
      
      // Add language-specific absolute paths if we're in a language subdirectory
      const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html' && p !== '');
      if (pathParts.length >= 1 && ['en', 'ru', 'es', 'pt'].includes(pathParts[0])) {
        // We're in a language subdirectory, add language-specific absolute path
        const lang = pathParts[0];
        paths.splice(paths.length - 2, 0, `/${lang}/data/${fileName}`); // Insert before fallback paths
      }
    }
    
    let lastError = null;
    for (const path of paths) {
      try {
        const response = await fetch(path, {
          // Add cache control to help browser cache
          cache: 'default'
        });
        if (response.ok) {
          const data = await response.json();
          dataCache.set(filePath, data);
          
          // Store in localStorage
          try {
            const cacheData = {
              data: data,
              timestamp: Date.now(),
              version: CACHE_VERSION
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          } catch (e) {
            console.warn('localStorage cache write failed:', e);
          }
          
          return data;
        } else {
          lastError = `HTTP ${response.status} for ${path}`;
        }
      } catch (e) {
        // Record error but continue trying other paths
        lastError = e.message || e.toString();
        continue;
      }
    }
    
    console.error(`Failed to load ${filePath}. Tried paths:`, paths, 'Last error:', lastError);
    throw new Error(`Failed to load ${filePath}: ${lastError || 'All paths failed'}`);
  } catch (error) {
    console.error(`Error loading OUI data:`, error);
    throw error;
  }
}

// Generate random byte using crypto.getRandomValues
function randomByte() {
  return crypto.getRandomValues(new Uint8Array(1))[0];
}

// Convert OUI string (e.g., "00:03:93") to bytes
function ouiStringToBytes(ouiString) {
  const parts = ouiString.split(':');
  return new Uint8Array([
    parseInt(parts[0], 16),
    parseInt(parts[1], 16),
    parseInt(parts[2], 16)
  ]);
}

// Generate MAC address
function generateMACAddress(options = {}) {
  const {
    vendor = 'random',
    format = 'colon',
    unicast = true,
    laa = false
  } = options;
  
  let bytes = new Uint8Array(6);
  
  // Generate first 3 bytes (OUI)
  if (vendor !== 'random' && options.ouiDb) {
    // Search in full OUI database for matching vendor
    const matchingOuis = Object.keys(options.ouiDb).filter(oui => {
      const vendorName = options.ouiDb[oui];
      // Check if vendor name contains the search term or vice versa
      return vendorName.toLowerCase().includes(vendor.toLowerCase()) ||
             vendor.toLowerCase().includes(vendorName.toLowerCase().split(',')[0]);
    });
    
    if (matchingOuis.length > 0) {
      // Use random OUI from matching vendors
      const selectedOui = randomElement(matchingOuis);
      const ouiBytes = ouiStringToBytes(selectedOui);
      bytes[0] = ouiBytes[0];
      bytes[1] = ouiBytes[1];
      bytes[2] = ouiBytes[2];
    } else {
      // Vendor not found, generate random
      crypto.getRandomValues(bytes.subarray(0, 3));
    }
  } else {
    // Completely random
    crypto.getRandomValues(bytes.subarray(0, 3));
  }
  
  // Generate last 3 bytes (device identifier)
  crypto.getRandomValues(bytes.subarray(3));
  
  // Apply unicast bit (LSB of first byte = 0 for unicast, 1 for multicast)
  if (unicast) {
    bytes[0] &= 0xFE; // Clear bit 0
  } else {
    bytes[0] |= 0x01; // Set bit 0
  }
  
  // Apply LAA bit (bit 1 of first byte = 1 for locally administered, 0 for globally unique)
  if (laa) {
    bytes[0] |= 0x02; // Set bit 1
  } else {
    bytes[0] &= 0xFD; // Clear bit 1
  }
  
  return bytes;
}

// Format MAC address
function formatMACAddress(bytes, format = 'colon') {
  const hex = Array.from(bytes).map(b => 
    b.toString(16).padStart(2, '0').toUpperCase()
  );
  
  switch (format) {
    case 'colon':
      return hex.join(':');
    case 'hyphen':
      return hex.join('-');
    case 'dot':
      return `${hex[0]}${hex[1]}.${hex[2]}${hex[3]}.${hex[4]}${hex[5]}`;
    case 'none':
      return hex.join('');
    case 'space':
      return hex.join(' ');
    default:
      return hex.join(':');
  }
}

// Convert MAC to IPv6 Link-Local (EUI-64)
function macToIPv6(bytes) {
  const b = [...bytes];
  // Flip U/L bit (bit 7 of first byte)
  b[0] ^= 0x02;
  
  // Insert FFFE in the middle
  const eui64 = [b[0], b[1], b[2], 0xFF, 0xFE, b[3], b[4], b[5]];
  
  // Convert to IPv6 format
  const groups = [];
  for (let i = 0; i < 8; i += 2) {
    const group = ((eui64[i] << 8) | eui64[i + 1]).toString(16);
    groups.push(group);
  }
  
  return 'fe80::' + groups.join(':');
}

// Identify vendor from MAC address
function identifyVendor(bytes, ouiDb) {
  if (!ouiDb) return null;
  
  const ouiString = Array.from(bytes.slice(0, 3))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
  
  return ouiDb[ouiString] || null;
}

// Generate MAC address with all options
export async function generateMAC(options = {}) {
  try {
    const {
      count = 1,
      vendor = 'random',
      format = 'colon',
      unicast = true,
      laa = false,
      showIPv6 = false
    } = options;
    
    // 限制最大生成数量为888
    const actualCount = Math.min(888, Math.max(1, count));
    
    // Load OUI data
    const ouiDb = await loadOuiData();
    
    const results = [];
    
    for (let i = 0; i < actualCount; i++) {
      const bytes = generateMACAddress({
        vendor,
        format,
        unicast,
        laa,
        ouiDb
      });
      
      const mac = formatMACAddress(bytes, format);
      const vendorName = identifyVendor(bytes, ouiDb);
      const ipv6 = showIPv6 ? macToIPv6(bytes) : null;
      
      results.push({
        mac,
        vendor: vendorName,
        ipv6,
        bytes: Array.from(bytes),
        format,
        unicast,
        laa
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error generating MAC address:', error);
    throw error;
  }
}

// Get available vendors from OUI database
export async function getAvailableVendors() {
  try {
    const ouiDb = await loadOuiData();
    const vendors = [...new Set(Object.values(ouiDb))].sort();
    return vendors;
  } catch (error) {
    console.error('Error getting vendors:', error);
    return [];
  }
}
