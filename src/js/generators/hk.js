// HK address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadDataById, loadRealPool, pickRealRow, ensureNameArray } from '../data-loader.js';

export async function generateHKAddress(selectedRegion = 'RANDOM', isEnglish = false) {
  try {
    const hkData = await loadData(getDataFilePath('hkRegions'));
    const namesData = await loadData(getDataFilePath('names'));
    
    // Filter districts based on selected region
    let availableDistricts = {};
    if (selectedRegion === 'RANDOM') {
      // Use all districts
      availableDistricts = hkData.districts;
    } else if (hkData.districts[selectedRegion]) {
      // Use only the selected region
      availableDistricts[selectedRegion] = hkData.districts[selectedRegion];
    } else {
      // Fallback to all districts if invalid selection
      availableDistricts = hkData.districts;
    }
    
    // Select random district and area from filtered districts
    const districts = Object.keys(availableDistricts);
    if (districts.length === 0) {
      throw new Error('No districts available for selected region');
    }
    
    const districtKey = randomElement(districts);
    const district = availableDistricts[districtKey];
    const area = randomElement(district.areas);
    
    // Generate name
    let firstName;
    let lastName;
    let gender;

    if (isEnglish && hkData.names && hkData.names.en) {
      // 英文模式：使用 hkData 内置的英文化姓名（香港拼音格式）
      // 为了符合Apple ID等注册要求，名字组合成2-3个字（更符合香港人传统姓名习惯）
      const nameGroupEn = hkData.names.en;
      const isMale = Math.random() > 0.5;
      gender = isMale ? 'Male' : 'Female'; // 修复：性别逻辑正确对应
      const firstPool = isMale ? nameGroupEn.first.male : nameGroupEn.first.female;
      
      // 组合2-3个字的名字（70%概率双字，30%概率三字）
      if (firstPool && firstPool.length > 0) {
        const nameCount = Math.random() < 0.7 ? 2 : 3; // 70%双字，30%三字
        const selectedNames = [];
        const availableNames = [...firstPool]; // 复制数组避免修改原数组
        
        for (let i = 0; i < nameCount && availableNames.length > 0; i++) {
          const selected = randomElement(availableNames);
          selectedNames.push(selected);
          // 移除已选的名字，避免重复
          const index = availableNames.indexOf(selected);
          if (index > -1) availableNames.splice(index, 1);
        }
        
        firstName = selectedNames.join(' '); // 用空格连接，如 "Wing Man" 或 "Wing Man Kai"
      } else {
        firstName = randomElement(firstPool || []);
      }
      
      lastName = randomElement(nameGroupEn.last || []);
      
      // 如果数据异常，兜底
      if (!firstName || !lastName) {
        const fallback = namesData.nameGroups.western;
        gender = Math.random() > 0.5 ? 'Male' : 'Female';
        firstName = randomElement(
          gender === 'Male' ? fallback.first.male : fallback.first.female
        );
        lastName = randomElement(fallback.last);
      }
    } else {
      // 中文模式：沿用原有中文姓名逻辑
      const nameGroup = namesData.nameGroups.chinese;
      gender = Math.random() > 0.5 ? '男' : '女'; // 中文：男/女
      firstName = randomElement(gender === '男' ? nameGroup.first.male : nameGroup.first.female);
      lastName = randomElement(nameGroup.last);
    }

    // Generate phone (Hong Kong format: +852 XXXX XXXX)
    const phone = `+852 ${randomInt(2000, 9999)} ${randomInt(1000, 9999)}`;
    
    // Hong Kong has no official postal code; use fixed placeholder for forms
    const zip = '000000';
    
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
    const floor = randomInt(1, 50);
    const unit = randomInt(1, 20);

    let street;
    let building;
    let address;
    let city;
    let districtName;
    let fullAddress;

    if (isEnglish) {
      street = randomElement(area.streets.en);
      building = randomElement(area.buildings.en);
      // 英文地址格式：Flat 12, 32/F, Building Name, Street Name
      address = `Flat ${unit}, ${floor}/F, ${building}, ${street}`;
      city = area.name_en;
      districtName = district.name.en;
      fullAddress = `${address}, ${city}, ${districtName}, Hong Kong`;
      // 英文模式下，性别字段统一英文化
      gender = gender === '男' ? 'Male' : gender === '女' ? 'Female' : gender;
    } else {
      street = randomElement(area.streets.zh);
      building = randomElement(area.buildings.zh);
      address = `${street} ${building} ${floor}樓 ${unit}室`;
      city = area.name_zh;
      districtName = district.name.zh;
      fullAddress = `${address}, ${city}, ${districtName}`;
    }
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: address,
      city, // 区域作为城市（中英文根据模式切换）
      county: districtName, // 区作为区县
      district: districtName, // 保留原字段以兼容
      area: city, // 保留原字段以兼容
      fullAddress,
      zip,
      country: 'HK'
    };
  } catch (error) {
    console.error('Error generating HK address:', error);
    throw error;
  }
}

// Generate UK address
