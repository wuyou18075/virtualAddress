// TW address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadDataById, loadRealPool, pickRealRow, ensureNameArray } from '../data-loader.js';

export async function generateTWAddress(selectedCounty = 'RANDOM') {
  try {
    const namesData = await loadData(getDataFilePath('names'));
    
    // Try to load Taiwan data
    let twData = null;
    let selectedCountyData = null;
    try {
      twData = await loadData(getDataFilePath('twRegions'));
      if (twData && twData.counties) {
        // Filter counties based on selected county
        let availableCounties = {};
        if (selectedCounty === 'RANDOM') {
          // Use all counties
          availableCounties = twData.counties;
        } else if (twData.counties[selectedCounty]) {
          // Use only the selected county
          availableCounties[selectedCounty] = twData.counties[selectedCounty];
        } else {
          // Fallback to all counties if invalid selection
          availableCounties = twData.counties;
        }
        
        // Select random county from filtered counties
        const counties = Object.keys(availableCounties);
        if (counties.length > 0) {
          const countyKey = randomElement(counties);
          selectedCountyData = availableCounties[countyKey];
        }
      }
    } catch (e) {
      // If data file doesn't exist, use fallback
      console.warn('Taiwan data file not found, using fallback');
    }
    
    // Generate name (Chinese) - decide gender first, then select name
    const nameGroup = namesData.nameGroups.chinese;
    const gender = Math.random() > 0.5 ? '男' : '女'; // 中文：男/女
    const firstName = randomElement(gender === '男' ? nameGroup.first.male : nameGroup.first.female);
    const lastName = randomElement(nameGroup.last);
    
    // Generate phone (Taiwan format: 09XX-XXX-XXX) - use county-specific area codes if available
    let phoneAreaCode;
    if (selectedCountyData && selectedCountyData.phone_area_codes && selectedCountyData.phone_area_codes.length > 0) {
      // Use phone area codes from the county's list
      phoneAreaCode = randomElement(selectedCountyData.phone_area_codes);
    } else {
      // Fallback: use random area code (should not happen if data is complete)
      phoneAreaCode = randomInt(2, 9);
    }
    const phone = `09${phoneAreaCode}${randomInt(10, 99)}-${randomInt(100, 999)}-${randomInt(100, 999)}`;
    
    // Generate email - use English names for email to avoid Chinese characters
    const englishNameGroup = namesData.nameGroups.western || namesData.nameGroups.asian;
    let emailFirstName, emailLastName;
    if (englishNameGroup && englishNameGroup.first && englishNameGroup.last) {
      const firstList = ensureNameArray(englishNameGroup.first);
      const lastList = ensureNameArray(englishNameGroup.last);
      emailFirstName = randomElement(firstList);
      emailLastName = randomElement(lastList);
    } else {
      // Fallback: generate random English username
      const randomNames = ['john', 'mary', 'david', 'sarah', 'michael', 'emily', 'james', 'lisa', 'robert', 'anna'];
      emailFirstName = randomElement(randomNames);
      emailLastName = randomElement(randomNames);
    }
    const email = generateEmail(emailFirstName, emailLastName);
    
    // Generate address
    // Use county data if available, otherwise use fallback cities
    let city, district;
    if (selectedCountyData && selectedCountyData.name) {
      city = selectedCountyData.name.zh;
      // Use common districts for the selected city
      district = randomElement(['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區']);
    } else {
      // Fallback cities
      const cities = ['台北市', '新北市', '台中市', '台南市', '高雄市', '桃園市'];
      city = randomElement(cities);
      district = randomElement(['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區']);
    }
    
    const street = randomElement([
      '中山路', '中正路', '民生路', '民權路', '民族路',
      '建國路', '復興路', '和平路', '自由路', '成功路',
      '忠孝路', '仁愛路', '信義路', '和平路', '光復路',
      '中華路', '文化路', '大學路', '公園路', '車站路',
      '中央路', '大同路', '大安路', '大業路', '大興路',
      '新生路', '新興路', '新市路', '新莊路', '新店路'
    ]);
    const streetNumber = randomInt(1, 999);
    const address = `${city}${district}${street}${streetNumber}號`;
    
    // Taiwan postal code (5 digits) - use county-specific postcode range if available
    let postcode;
    if (selectedCountyData && selectedCountyData.postcode_range && selectedCountyData.postcode_range.min && selectedCountyData.postcode_range.max) {
      // Use postcode range from the county's postcode_range
      postcode = randomInt(selectedCountyData.postcode_range.min, selectedCountyData.postcode_range.max).toString();
    } else {
      // Fallback: use random 5-digit postcode (should not happen if data is complete)
      postcode = randomInt(10000, 99999).toString();
    }
    
    const fullAddress = `${address}, 郵遞區號: ${postcode}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: address,
      city,
      district,
      postcode,
      fullAddress,
      country: 'TW'
    };
  } catch (error) {
    console.error('Error generating TW address:', error);
    throw error;
  }
}

