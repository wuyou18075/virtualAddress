// CA address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadDataById, loadRealPool, pickRealRow, ensureNameArray } from '../data-loader.js';

export async function generateCAAddress(selectedProvince = 'RANDOM') {
  try {
    const caData = await loadData(getDataFilePath('caRegions'));
    const namesData = await loadData(getDataFilePath('names'));
    
    // Filter provinces based on selected province
    let availableProvinces = {};
    if (selectedProvince === 'RANDOM') {
      // Use all provinces
      availableProvinces = caData.provinces;
    } else if (caData.provinces[selectedProvince]) {
      // Use only the selected province
      availableProvinces[selectedProvince] = caData.provinces[selectedProvince];
    } else {
      // Fallback to all provinces if invalid selection
      availableProvinces = caData.provinces;
    }
    
    // Select random province from filtered provinces
    const provinces = Object.keys(availableProvinces);
    if (provinces.length === 0) {
      throw new Error('No provinces available for selected province');
    }
    
    const provinceKey = randomElement(provinces);
    const province = availableProvinces[provinceKey];
    
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
    const areaCode = randomElement(province.area_codes);
    const phone = `(${areaCode}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
    
    // Generate email
    const email = generateEmail(firstName, lastName);
    
    // Generate address
    const streetNumber = randomInt(100, 9999);
    const streetName = randomElement([
      'Main Street', 'Oak Avenue', 'Park Road', 'Maple Drive', 'Elm Street',
      'King Street', 'Queen Street', 'Church Street', 'Market Street',
      'First Street', 'Second Street', 'Third Avenue', 'Fourth Street',
      'Bay Street', 'Yonge Street', 'University Avenue', 'College Street',
      'Dundas Street', 'Bloor Street', 'Queen Street', 'King Street',
      'River Road', 'Lake Avenue', 'Hill Street', 'Valley Drive',
      'Forest Avenue', 'Garden Street', 'Rose Lane', 'Pine Street'
    ]);
    const street = `${streetNumber} ${streetName}`;
    
    // Generate city - use province-specific cities if available, otherwise use fallback
    let city;
    if (province.cities && province.cities.length > 0) {
      // Use cities from the province's city list
      city = randomElement(province.cities);
    } else {
      // Fallback: use common Canadian city names (should not happen if data is complete)
      const fallbackCities = [
        'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa',
        'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Halifax'
      ];
      city = randomElement(fallbackCities);
    }
    
    // Canadian postal code format: A1A 1A1 - use province-specific prefixes if available
    let postcodePrefix;
    if (province.postcode_prefixes && province.postcode_prefixes.length > 0) {
      // Use postcode prefixes from the province's list
      postcodePrefix = randomElement(province.postcode_prefixes);
    } else {
      // Fallback: use common Canadian postal code prefixes (should not happen if data is complete)
      postcodePrefix = randomElement(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Y']);
    }
    const postcode = `${postcodePrefix}${randomInt(0, 9)}${randomElement(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'])} ${randomInt(0, 9)}${randomElement(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'])}${randomInt(0, 9)}`;
    
    // Use English province name for full address and province field
    const provinceNameEn = province.name.en || province.name.zh;
    const fullAddress = `${street}, ${city}, ${provinceNameEn} ${postcode}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      postcode,
      province: provinceNameEn, // 显示英文省份名
      fullAddress,
      country: 'CA'
    };
  } catch (error) {
    console.error('Error generating CA address:', error);
    throw error;
  }
}

// Generate Japan address
