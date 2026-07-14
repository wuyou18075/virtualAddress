// UK address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadDataById, loadRealPool, pickRealRow, ensureNameArray } from '../data-loader.js';

export async function generateUKAddress(selectedRegion = 'RANDOM') {
  try {
    const ukData = await loadData(getDataFilePath('ukRegions'));
    const namesData = await loadData(getDataFilePath('names'));
    
    // Filter regions based on selected region
    let availableRegions = {};
    if (selectedRegion === 'RANDOM') {
      // Use all regions
      availableRegions = ukData.regions;
    } else if (ukData.regions[selectedRegion]) {
      // Use only the selected region
      availableRegions[selectedRegion] = ukData.regions[selectedRegion];
    } else {
      // Fallback to all regions if invalid selection
      availableRegions = ukData.regions;
    }
    
    // Select random region from filtered regions
    const regions = Object.keys(availableRegions);
    if (regions.length === 0) {
      throw new Error('No regions available for selected region');
    }
    
    const regionKey = randomElement(regions);
    const region = availableRegions[regionKey];
    
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
    const phoneCode = randomElement(region.phone_codes);
    const phone = `0${phoneCode} ${randomInt(1000, 9999)} ${randomInt(100000, 999999)}`;
    
    // Generate email
    const email = generateEmail(firstName, lastName);
    
    // Generate address
    const streetNumbers = [randomInt(1, 999), randomInt(1, 999)];
    const streetName = randomElement([
      'High Street', 'Church Road', 'Park Avenue', 'Main Road', 'London Road',
      'Victoria Street', 'King Street', 'Queen Street', 'Market Street',
      'Station Road', 'Mill Lane', 'Bridge Street', 'New Street', 'Old Street',
      'Castle Street', 'Church Street', 'School Lane', 'Garden Street', 'Hill Road',
      'Oak Avenue', 'Elm Street', 'Maple Drive', 'Cedar Road', 'Pine Street',
      'Rose Lane', 'Lily Street', 'Orchard Road', 'Meadow Way', 'River Street'
    ]);
    const street = `${streetNumbers[0]}${streetNumbers[1] > 0 ? '-' + streetNumbers[1] : ''} ${streetName}`;
    
    // Generate city - use region-specific cities if available, otherwise use fallback
    let city;
    if (region.cities && region.cities.length > 0) {
      // Use cities from the region's city list
      city = randomElement(region.cities);
    } else {
      // Fallback: use common UK city names (should not happen if data is complete)
      const fallbackCities = [
        'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds',
        'Glasgow', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast'
      ];
      city = randomElement(fallbackCities);
    }
    
    // UK postcode: 优先使用真实池（region.addresses）中的真实邮编——地图可验证的核心字段。
    // 英国真实池仅提供 postcode + 行政代码（无街道/城市），故街道/城市保持合成。
    let postcode;
    if (Array.isArray(region.addresses) && region.addresses.length > 0) {
      const realEntry = randomElement(region.addresses);
      postcode = realEntry && realEntry.postcode ? realEntry.postcode : null;
    }

    if (!postcode) {
      // Synthetic fallback: 池不可用（如 NIR 无数据）时按 region 邮编前缀合成
      let postcodeArea;
      if (region.postcode_areas && region.postcode_areas.length > 0) {
        postcodeArea = randomElement(region.postcode_areas);
      } else {
        postcodeArea = randomElement(['SW', 'NW', 'SE', 'NE', 'W', 'E', 'N', 'S']);
      }
      postcode = `${postcodeArea}${randomInt(1, 9)}${randomElement(['A', 'B', 'C'])} ${randomInt(1, 9)}${randomElement(['A', 'B', 'C'])}${randomElement(['A', 'B', 'C'])}`;
    }

    // Use English region name for full address and region field
    const regionNameEn = region.name.en || region.name.zh;
    const fullAddress = `${street}, ${city}, ${postcode}, ${regionNameEn}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      postcode,
      region: regionNameEn, // 显示英文地区名
      fullAddress,
      country: 'UK'
    };
  } catch (error) {
    console.error('Error generating UK address:', error);
    throw error;
  }
}

// Generate Canada address
