// Shared data loading for address generators
import { randomElement } from "./utils.js";
import { getConfig, getDataFilePath } from "./config.js";

export function ensureNameArray(maybeList) {
  if (Array.isArray(maybeList)) return maybeList;
  if (!maybeList) return [];
  if (typeof maybeList === "object") {
    const out = [];
    if (Array.isArray(maybeList.male)) out.push(...maybeList.male);
    if (Array.isArray(maybeList.female)) out.push(...maybeList.female);
    return out;
  }
  return [];
}

const dataCache = new Map();
const pendingLoads = new Map();
const CACHE_PREFIX = "address_data_cache_";
const CACHE_VERSION = "v4";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const LOCALSTORAGE_MAX_BYTES = 80 * 1024;

function toDataRelative(filePath) {
  let p = String(filePath || "").replace(/^\/+/, "");
  if (p.startsWith("data/")) p = p.slice(5);
  return p;
}

function buildDataPaths(filePath, config) {
  const rel = toDataRelative(filePath);
  const paths = [];
  if (config.dataBasePath) {
    const basePath = config.dataBasePath.endsWith("/")
      ? config.dataBasePath
      : config.dataBasePath + "/";
    paths.push(basePath + rel);
  }

  if (config.autoDetectPaths !== false) {
    const pathParts = (window.location.pathname || "")
      .split("/")
      .filter((p) => p && p !== "index.html" && !p.endsWith(".html"));
    const depth = pathParts.length;
    const relPrefix = depth > 0 ? "../".repeat(depth) : "";

    paths.push(
      `/data/${rel}`,
      `${relPrefix}data/${rel}`,
      `../../data/${rel}`,
      `../data/${rel}`,
      `data/${rel}`,
      filePath,
    );
  } else if (!config.dataBasePath) {
    paths.push(filePath, `/data/${rel}`);
  }

  return [...new Set(paths)];
}

function purgeStaleDataCaches() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || "null");
        if (!parsed || parsed.version !== CACHE_VERSION) {
          localStorage.removeItem(k);
        }
      } catch {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}

let didPurge = false;

export async function loadData(filePath) {
  if (dataCache.has(filePath)) {
    return dataCache.get(filePath);
  }

  const inflight = pendingLoads.get(filePath);
  if (inflight) return inflight;

  const attempt = (async () => {
    try {
      if (!didPurge) {
        didPurge = true;
        purgeStaleDataCaches();
      }

      const cacheKey = CACHE_PREFIX + filePath;
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (
            parsed
            && parsed.version === CACHE_VERSION
            && parsed.timestamp
            && (Date.now() - parsed.timestamp) < CACHE_EXPIRY
          ) {
            dataCache.set(filePath, parsed.data);
            return parsed.data;
          }
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        console.warn("localStorage cache read failed:", e);
      }

      const config = getConfig();
      const paths = buildDataPaths(filePath, config);

      let lastError = null;
      for (const path of paths) {
        try {
          const response = await fetch(path, { cache: "default" });
          if (response.ok) {
            const data = await response.json();
            dataCache.set(filePath, data);

            try {
              const cacheData = {
                data,
                timestamp: Date.now(),
                version: CACHE_VERSION,
              };
              const serialized = JSON.stringify(cacheData);
              if (serialized.length <= LOCALSTORAGE_MAX_BYTES) {
                localStorage.setItem(cacheKey, serialized);
              }
            } catch (e) {
              console.warn("localStorage cache write failed:", e);
            }

            return data;
          }
          lastError = `HTTP ${response.status} for ${path}`;
        } catch (e) {
          lastError = e.message;
          continue;
        }
      }

      console.error(`Failed to load ${filePath}. Tried paths:`, paths);
      console.error("Last error:", lastError);
      throw new Error(`Failed to load ${filePath} from any path`);
    } catch (error) {
      console.error(`Error loading data from ${filePath}:`, error);
      throw error;
    }
  })();

  pendingLoads.set(filePath, attempt);
  try {
    return await attempt;
  } finally {
    pendingLoads.delete(filePath);
  }
}

export async function loadDataById(dataFileId) {
  return loadData(getDataFilePath(dataFileId));
}

const SHARD_META = {
  usRealAddresses: {
    shardDir: "data/us-real",
    needsIndex: false,
    fileForRegion: (code) => `${code}.json`,
  },
  taxfreePack: {
    shardDir: "data/us-taxfree",
    needsIndex: false,
    fileForRegion: (code) => `${code}.json`,
  },
  jpRealAreas: {
    shardDir: "data/jp-real",
    needsIndex: true,
    fileForRegion: (code, index) => {
      const map = (index && index.slugByPrefecture) || {};
      const slug = map[code] || String(code);
      return `${slug}.json`;
    },
  },
  inPinAreas: {
    shardDir: "data/in-pin",
    needsIndex: false,
    fileForRegion: (code) => `${code}.json`,
  },
};

export async function loadRealPool(dataFileId) {
  try {
    return await loadDataById(dataFileId);
  } catch (e) {
    console.warn(
      `Real address pool "${dataFileId}" unavailable, falling back to synthetic:`,
      e && e.message,
    );
    return null;
  }
}

export async function loadRealRow(dataFileId, regionCode) {
  if (!regionCode) return null;
  const meta = SHARD_META[dataFileId];

  try {
    if (meta) {
      let index = null;
      if (meta.needsIndex) {
        try {
          index = await loadData(`${meta.shardDir}/index.json`);
        } catch {
          /* optional */
        }
      }
      const file = meta.fileForRegion(regionCode, index);
      const rows = await loadData(`${meta.shardDir}/${file}`);
      if (Array.isArray(rows) && rows.length > 0) {
        return randomElement(rows);
      }
      return null;
    }

    const pool = await loadRealPool(dataFileId);
    return pickRealRow(pool, regionCode);
  } catch (e) {
    console.warn(`Real row ${dataFileId}/${regionCode} unavailable:`, e && e.message);
    return null;
  }
}

export function pickRealRow(pool, regionCode) {
  if (!pool || !pool.data) return null;
  const rows = pool.data[regionCode];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return randomElement(rows);
}
