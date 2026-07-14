// US address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadRealRow, ensureNameArray } from '../data-loader.js';

export async function generateUSAddress(selectedState = 'RANDOM') {
  try {
    const usData = await loadData(getDataFilePath('usRegions'));
    const namesData = await loadData(getDataFilePath('names'));

    // Select state
    let stateCode = selectedState;
    if (selectedState === 'RANDOM') {
      const states = Object.keys(usData.states);
      stateCode = randomElement(states);
    }

    const state = usData.states[stateCode];
    if (!state) {
      throw new Error(`State ${stateCode} not found`);
    }

    // Generate name - decide gender first, then select name
    const nameGroup = namesData.nameGroups.western;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female'; // English: Male/Female
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(gender === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);

    // Generate phone
    const areaCode = randomElement(state.area_codes);
    const phone = generatePhoneNumber(areaCode);

    // Generate email
    const email = generateEmail(firstName, lastName);

    // 按州分片加载真实地址（data/us-real/{STATE}.json），失败则走下方合成逻辑
    const realRow = await loadRealRow('usRealAddresses', stateCode);

    let street;
    let city;
    let county;
    let zip;

    if (realRow) {
      // 真实门牌：{ street, city, county, stateCode, zip }
      street = realRow.street;
      city = realRow.city || '';
      county = realRow.county || '';
      zip = String(realRow.zip || '');
    }

    if (!street) {
      // Synthetic fallback: 使用常见美国街道名 + 随机门牌号（池不可用/缺该州时）
      const streetNumber = randomInt(100, 9999);
      const streetNames = [
        'Main Street', 'Oak Avenue', 'Park Road', 'Maple Drive', 'Elm Street',
        'Washington Avenue', 'Lincoln Street', 'Jefferson Drive', 'Madison Road',
        'Franklin Avenue', 'Church Street', 'Market Street', 'Broadway',
        'First Street', 'Second Street', 'Third Avenue', 'Fourth Street',
        'Fifth Street', 'Sixth Street', 'Seventh Street', 'Eighth Street',
        'Ninth Street', 'Tenth Street', 'Pine Street', 'Cedar Avenue',
        'Spring Street', 'Summer Street', 'Winter Street', 'Lake Avenue',
        'River Road', 'Hill Street', 'Valley Drive', 'Forest Avenue',
        'Garden Street', 'Rose Avenue', 'Sunset Boulevard', 'Sunrise Drive',
        'College Avenue', 'University Drive', 'School Street', 'Library Lane',
      ];
      street = `${streetNumber} ${randomElement(streetNames)}`;
    }

    if (!city) {
      // Generate city - use state-specific cities if available, otherwise use fallback
      if (state.cities && state.cities.length > 0) {
        city = randomElement(state.cities);
      } else {
        const fallbackCities = [
          'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
          'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
          'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
          'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington',
        ];
        city = randomElement(fallbackCities);
      }
    }

    if (!zip) {
      // Generate zip - use state-specific zip range if available, otherwise use fallback
      if (state.zip_range && state.zip_range.min && state.zip_range.max) {
        zip = randomInt(state.zip_range.min, state.zip_range.max).toString();
      } else {
        zip = randomInt(10000, 99999).toString();
      }
    }

    // Full address should be in English only
    const stateNameEn = state.name.en || state.name.zh;
    const fullAddress = `${street}, ${city}, ${stateNameEn} ${zip}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      county, // 真实池提供的县名（合成回退时为空）
      state: stateNameEn, // 显示英文州名
      stateCode,
      zip,
      fullAddress,
      country: 'US'
    };
  } catch (error) {
    console.error('Error generating US address:', error);
    throw error;
  }
}

// Generate Hong Kong address
// selectedRegion: 'RANDOM' | 'HK' | 'KL' | 'NT'
// isEnglish: true -> 生成英文姓名和英文地址；false -> 保持中文

export async function generateTaxFreeAddress(selectedState = 'DE') {
  const manualTaxFreeStates = ['AK', 'DE', 'MT', 'NH', 'OR'];
  const randomTaxFreeStates = ['AK', 'DE', 'MT', 'OR'];

  if (!manualTaxFreeStates.includes(selectedState)) {
    selectedState = randomElement(randomTaxFreeStates);
  }

  // 姓名/电话/邮箱等身份字段仍由通用美国生成器提供
  const base = await generateUSAddress(selectedState);

  // 按州分片加载免税真实池 data/us-taxfree/{STATE}.json
  const row = await loadRealRow('taxfreePack', selectedState);
  if (row) {
    const county = row.county && row.county !== 'N/A' ? row.county : '';
    const stateNameEn = row.state || base.state;
    const zip = String(row.zip || base.zip);
    return {
      ...base,
      street: row.street || base.street,
      city: row.city || base.city,
      county,
      state: stateNameEn,
      stateCode: row.stateCode || selectedState,
      zip,
      fullAddress: row.fullAddress || `${row.street}, ${row.city}, ${row.stateCode} ${zip}`,
    };
  }

  return base;
}

