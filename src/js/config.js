/**
 * MockAddress Core 配置模块
 * 数据文件路径仅通过 dataFiles 映射解析，默认使用中性文件名（不暴露生产环境命名）。
 */

/** 默认数据文件相对路径（可全部被 configure({ dataFiles: { ... } }) 覆盖） */
const defaultDataFiles = {
  usRegions: 'data/usData.json',
  names: 'data/names-pool.json',
  hkRegions: 'data/hkData.json',
  ukRegions: 'data/ukData.json',
  caRegions: 'data/caData.json',
  jpRegions: 'data/jpData.json',
  jpNames: 'data/jpNamesData.json',
  jpRealAreas: 'data/jpRealAreas.json',
  inRegions: 'data/inData.json',
  inPinAreas: 'data/inPinAreas.json',
  twRegions: 'data/twData.json',
  sgRegions: 'data/sgData.json',
  deRegions: 'data/deData.json',
  usRealAddresses: 'data/usRealAddresses.json',
  taxfreePack: 'data/us_taxfree.min.json',
  taxfreePreviewPack: 'data/tf-preview.pack.json',
  macOui: 'data/macOuiData.json',
};

const defaultConfig = {
  dataBasePath: null,
  autoDetectPaths: true,
  customDataLoader: null,
  dataFiles: { ...defaultDataFiles },
};

let userConfig = {};

/**
 * @param {string} id - dataFiles 键，如 'usRegions'、'names'
 * @returns {string} 传给 loadData / fetch 的相对路径
 */
export function getDataFilePath(id) {
  const map = {
    ...defaultDataFiles,
    ...(userConfig.dataFiles || {}),
  };
  const p = map[id];
  if (!p || typeof p !== 'string') {
    throw new Error(`Unknown dataFiles key: "${id}"`);
  }
  return p;
}

/**
 * @param {Object} config - 用户配置对象
 * @example
 * configure({
 *   dataBasePath: 'my-data/',
 *   autoDetectPaths: false,
 *   dataFiles: { usRegions: 'internal/secret-name.json' }
 * });
 */
export function configure(config = {}) {
  const { dataFiles, ...rest } = config;
  userConfig = { ...userConfig, ...rest };
  if (dataFiles && typeof dataFiles === 'object') {
    userConfig.dataFiles = {
      ...(userConfig.dataFiles || {}),
      ...dataFiles,
    };
  }
}

export function getConfig() {
  return {
    ...defaultConfig,
    ...userConfig,
    dataFiles: {
      ...defaultDataFiles,
      ...(userConfig.dataFiles || {}),
    },
  };
}

export function resetConfig() {
  userConfig = {};
}
