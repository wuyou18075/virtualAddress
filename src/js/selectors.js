/**
 * Region dropdown initializers (US state, JP prefecture, CA province, etc.).
 */
import { loadDataById } from "./data-loader.js";

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
  const isIndiaPage = currentPath.includes('/in-address') || currentPath.endsWith('/in.html');
  
  if (isIndiaPage) {
    // Load India data for India page
    try {
      const inData = await loadDataById('inRegions');
      
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
    const usData = await loadDataById('usRegions');
    
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

// Initialize prefecture select dropdown for Japan
export async function initPrefectureSelect() {
  const prefectureSelect = document.getElementById('prefecture-select');
  if (!prefectureSelect) {
    console.warn('Prefecture select element not found');
    return;
  }
  
  // Load Japan data to get prefecture names
  try {
    const jpData = await loadDataById('jpRegions');
    
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

// Initialize province select dropdown for Canada
export async function initProvinceSelect() {
  const provinceSelect = document.getElementById('province-select');
  if (!provinceSelect) {
    console.warn('Province select element not found');
    return;
  }
  
  // Load Canada data to get province names
  try {
    const caData = await loadDataById('caRegions');
    
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
    const deData = await loadDataById('deRegions');
    
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
    const twData = await loadDataById('twRegions');
    
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

// Initialize region select dropdown for Singapore
export async function initSGStateSelect() {
  const stateSelect = document.getElementById('state-select');
  if (!stateSelect) return;
  try {
    const sgData = await loadDataById('sgRegions');
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
