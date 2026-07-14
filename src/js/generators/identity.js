// Identity & test credit card generation
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, ensureNameArray } from '../data-loader.js';

export async function generateIdentityInfo(address) {
  try {
    // Load names data - use the same loadData function which handles paths correctly
    const namesData = await loadData(getDataFilePath('names'));
    if (!namesData || !namesData.nameGroups) {
      throw new Error('Names data not available');
    }
    
    // Use the same name group as the address based on country
    const c = address.country || '';
    let nameGroup;
    if (c === '香港' || c === '台灣' || c === 'HK' || c === 'TW') {
      nameGroup = namesData.nameGroups.chinese;
    } else if (c === '印度' || c === 'IN') {
      nameGroup = namesData.nameGroups.indian;
    } else if (c === '日本' || c === 'JP') {
      nameGroup = namesData.nameGroups.asian || namesData.nameGroups.western;
    } else {
      // Default to western names for US, UK, Canada, etc.
      nameGroup = namesData.nameGroups.western || namesData.nameGroups.asian;
    }
    if (!nameGroup) {
      throw new Error('Name group not found');
    }
    
    // Resolve gender for identity (name selection + Taiwan ID gender digit)
    let isMaleForIdentity;
    if (address.gender) {
      const g = address.gender;
      const isMale = g === 'Male' || g === 'male' || g === 'm' || g === '男' || g === '男性' ||
        (typeof g === 'string' && (g.includes('Männlich') || g.includes('男')));
      const isFemale = g === 'Female' || g === 'female' || g === 'f' || g === '女' || g === '女性' ||
        (typeof g === 'string' && (g.includes('Weiblich') || g.includes('女')));
      isMaleForIdentity = isMale ? true : (isFemale ? false : Math.random() > 0.5);
    } else {
      isMaleForIdentity = Math.random() > 0.5;
    }
    
    // Generate name based on address gender if available
    let firstName, lastName;
    if (address.gender) {
      const genderKey = address.gender.toLowerCase();
      const isMale = genderKey === 'male' || genderKey === 'm' || address.gender === '男' || address.gender === '男性' ||
        address.gender.includes('Männlich') || address.gender.includes('男');
      const isFemale = genderKey === 'female' || genderKey === 'f' || address.gender === '女' || address.gender === '女性' ||
        address.gender.includes('Weiblich') || address.gender.includes('女');
      
      // Use gender-specific name lists if available
      if (nameGroup.first.male && nameGroup.first.female) {
        if (isMale) {
          firstName = randomElement(nameGroup.first.male);
        } else if (isFemale) {
          firstName = randomElement(nameGroup.first.female);
        } else {
          // Fallback: randomly choose from either gender
          firstName = randomElement(Math.random() > 0.5 ? nameGroup.first.male : nameGroup.first.female);
        }
      } else {
        // Fallback: use all names if gender classification not available
        firstName = randomElement(Array.isArray(nameGroup.first) ? nameGroup.first : []);
      }
    } else {
      // If no gender specified, randomly choose gender and corresponding name
      const randomGender = Math.random() > 0.5;
      if (nameGroup.first.male && nameGroup.first.female) {
        firstName = randomElement(randomGender ? nameGroup.first.male : nameGroup.first.female);
      } else {
        firstName = randomElement(Array.isArray(nameGroup.first) ? nameGroup.first : []);
      }
    }
    lastName = randomElement(nameGroup.last);
    
    // Generate date of birth (age between 20 and 50)
    const age = randomInt(20, 50);
    const birthYear = new Date().getFullYear() - age;
    const birthMonth = randomInt(1, 12);
    const daysInMonth = new Date(birthYear, birthMonth, 0).getDate();
    const birthDay = randomInt(1, daysInMonth);
    const dateOfBirth = `${birthMonth.toString().padStart(2, '0')}/${birthDay.toString().padStart(2, '0')}/${birthYear}`;
    
    // Generate identity ID based on country
    let ssn;
    const country = address.country || '';
    
    if (country.includes('德国') || country.includes('Germany') || country === 'DE') {
      // Generate German Steuer-ID (Tax ID): 11 digits, format: XX XXX XXX XXX
      const part1 = randomInt(10, 99);
      const part2 = randomInt(100, 999);
      const part3 = randomInt(100, 999);
      const part4 = randomInt(100, 999);
      ssn = `${part1} ${part2} ${part3} ${part4}`;
    } else if (country.includes('英国') || country.includes('UK') || country.includes('United Kingdom') || country === 'UK') {
      // Generate UK NINO: Format: AA 12 34 56 A
      const letters1 = 'ABCDEFGHJKLMNOPRSTUVWXYZ';
      const letters2 = 'ABCDEFGHJKLMNOPRSTUVWXYZ';
      const letter1 = randomElement(letters1.split(''));
      const letter2 = randomElement(letters2.split(''));
      const digits = randomInt(100000, 999999);
      const letter3 = randomElement(letters2.split(''));
      ssn = `${letter1}${letter2} ${digits.toString().slice(0, 2)} ${digits.toString().slice(2, 4)} ${digits.toString().slice(4, 6)} ${letter3}`;
    } else if (country.includes('加拿大') || country.includes('Canada') || country === 'CA') {
      // Generate Canadian SIN: Format: XXX XXX XXX
      const sin1 = randomInt(100, 999);
      const sin2 = randomInt(100, 999);
      const sin3 = randomInt(100, 999);
      ssn = `${sin1} ${sin2} ${sin3}`;
    } else if (country.includes('日本') || country.includes('Japan') || country === 'JP') {
      // Generate Japanese My Number: Format: XXXX-XXXX-XXXX
      const myNum1 = randomInt(1000, 9999);
      const myNum2 = randomInt(1000, 9999);
      const myNum3 = randomInt(1000, 9999);
      ssn = `${myNum1}-${myNum2}-${myNum3}`;
    } else if (country.includes('印度') || country.includes('India') || country === 'IN') {
      // Generate Indian Aadhaar: Format: XXXX XXXX XXXX
      const aadhaar1 = randomInt(1000, 9999);
      const aadhaar2 = randomInt(1000, 9999);
      const aadhaar3 = randomInt(1000, 9999);
      ssn = `${aadhaar1} ${aadhaar2} ${aadhaar3}`;
    } else if (country.includes('香港') || country.includes('Hong Kong') || country === 'HK') {
      // Generate Hong Kong ID Card: Format: A123456(7) or AB123456(7)
      // 70%概率单字母，30%概率双字母
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const isDoubleLetter = Math.random() < 0.3;
      let prefix;
      if (isDoubleLetter) {
        const letter1 = randomElement(letters.split(''));
        const letter2 = randomElement(letters.split(''));
        prefix = `${letter1}${letter2}`;
      } else {
        prefix = randomElement(letters.split(''));
      }
      const digits = randomInt(100000, 999999).toString();
      const checkDigit = randomInt(0, 9);
      ssn = `${prefix}${digits}(${checkDigit})`;
    } else if (country.includes('台灣') || country.includes('台湾') || country.includes('Taiwan') || country === 'TW') {
      // Generate Taiwan ID Card: Format: A123456789
      // 1st: letter (birthplace), 2nd: gender (1=Male, 2=Female), 3rd-9th: sequence
      const letters = 'ABCDEFGHJKLMNPQRSTUVXY';
      const firstLetter = randomElement(letters.split(''));
      const genderDigit = isMaleForIdentity ? '1' : '2'; // 1=男, 2=女
      const sequenceDigits = randomInt(10000000, 99999999).toString();
      ssn = `${firstLetter}${genderDigit}${sequenceDigits}`;
    } else if (country.includes('新加坡') || country.includes('Singapore') || country === 'SG') {
      // Generate Singapore NRIC: Format: S1234567D (prefix + 7 digits + check letter)
      // S=citizen pre-2000, T=citizen 2000+, G/F=PR. Prefix should match birth year
      let prefix;
      if (birthYear < 2000) {
        prefix = 'S'; // Born before 2000
      } else {
        prefix = 'T'; // Born in 2000 or later
      }
      // Small chance to be PR (G prefix) regardless of year
      if (Math.random() < 0.1) {
        prefix = 'G'; // Permanent Resident
      }
      const digits = randomInt(1000000, 9999999).toString();
      const checkLetters = 'ABCDEFGHIZJ';
      const checkLetter = randomElement(checkLetters.split(''));
      ssn = `${prefix}${digits}${checkLetter}`;
    } else {
      // Default: US SSN format (XXX-XX-XXXX)
      // SSN Area Number (first 3 digits) should match the state if available
      let ssnAreaNumber;
      if (address.stateCode && (address.country === '美国' || address.country === 'US')) {
        try {
          const usData = await loadData(getDataFilePath('usRegions'));
          const state = usData.states[address.stateCode];
          if (state && state.ssn_area_range && state.ssn_area_range.min && state.ssn_area_range.max) {
            // Use state-specific SSN area number range
            ssnAreaNumber = randomInt(state.ssn_area_range.min, state.ssn_area_range.max);
          } else {
            // Fallback: use random area number (avoid 000, 666, and 900-999)
            do {
              ssnAreaNumber = randomInt(1, 899);
            } while (ssnAreaNumber === 666 || ssnAreaNumber < 1);
          }
        } catch (e) {
          // If loading fails, use fallback
          do {
            ssnAreaNumber = randomInt(1, 899);
          } while (ssnAreaNumber === 666 || ssnAreaNumber < 1);
        }
      } else {
        // For non-US addresses or if stateCode is not available, use random area number
        do {
          ssnAreaNumber = randomInt(1, 899);
        } while (ssnAreaNumber === 666 || ssnAreaNumber < 1);
      }
      
      // Generate Group Number (middle 2 digits, cannot be 00)
      const groupNumber = randomInt(1, 99);
      
      // Generate Serial Number (last 4 digits, cannot be 0000)
      const serialNumber = randomInt(1, 9999);
      
      // Format SSN: XXX-XX-XXXX
      ssn = `${ssnAreaNumber.toString().padStart(3, '0')}-${groupNumber.toString().padStart(2, '0')}-${serialNumber.toString().padStart(4, '0')}`;
    }
    
    // Generate occupation (random job title)
    const occupations = [
      'Software Engineer', 'Teacher', 'Doctor', 'Nurse', 'Engineer',
      'Accountant', 'Lawyer', 'Manager', 'Sales Representative', 'Designer',
      'Marketing Specialist', 'Consultant', 'Analyst', 'Administrator', 'Director',
      'Developer', 'Architect', 'Coordinator', 'Supervisor', 'Assistant'
    ];
    const occupation = randomElement(occupations);
    
    return {
      firstName,
      lastName,
      dateOfBirth,
      age,
      ssn,
      occupation
    };
  } catch (error) {
    console.error('Error generating identity info:', error);
    throw error;
  }
}


export async function generateCreditCardInfo() {
  // Card types with their prefixes
  const cardTypes = [
    { name: 'Visa', prefixes: ['4'] },
    { name: 'MasterCard', prefixes: ['51', '52', '53', '54', '55'] },
    { name: 'American Express', prefixes: ['34', '37'] },
    { name: 'Discover', prefixes: ['6011'] }
  ];
  
  // Select random card type
  const selectedCardType = randomElement(cardTypes);
  const prefix = randomElement(selectedCardType.prefixes);
  
  // Generate random credit card number (16 digits, Luhn algorithm)
  function generateLuhnNumber(prefix, length = 16) {
    let cardNumber = prefix;
    // Generate remaining digits (excluding prefix and check digit)
    const remainingDigits = length - prefix.length - 1;
    for (let i = 0; i < remainingDigits; i++) {
      cardNumber += randomInt(0, 9).toString();
    }
    
    // Luhn: payload is validated as if check digit is not doubled (rightmost of full number).
    // So when computing the check digit, start with double=true on the last payload digit.
    let sum = 0;
    let double = true;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      double = !double;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    cardNumber += checkDigit.toString();
    
    return cardNumber;
  }
  
  // Generate card number (16 digits for most cards, 15 for Amex)
  const cardLength = selectedCardType.name === 'American Express' ? 15 : 16;
  const cardNumber = generateLuhnNumber(prefix, cardLength);
  
  // Format as XXXX XXXX XXXX XXXX (or XXXX XXXXXX XXXXX for Amex)
  const formattedCardNumber = cardNumber.match(/.{1,4}/g).join(' ');
  
  // Generate expiration date (future date, 1-5 years from now)
  const currentYear = new Date().getFullYear();
  const expYear = currentYear + randomInt(1, 5);
  const expMonth = randomInt(1, 12);
  const expirationDate = `${expMonth.toString().padStart(2, '0')}/${expYear.toString().slice(-2)}`;
  
  // Generate CVV (3 digits for most cards, 4 for Amex)
  const cvvLength = selectedCardType.name === 'American Express' ? 4 : 3;
  const cvv = randomInt(Math.pow(10, cvvLength - 1), Math.pow(10, cvvLength) - 1).toString();
  
  // Generate cardholder name (random Western name)
  const names = ['John', 'Mary', 'David', 'Sarah', 'Michael', 'Emily', 'James', 'Lisa', 'Robert', 'Anna'];
  const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const cardholderName = `${randomElement(names)} ${randomElement(surnames)}`;
  
  return {
    type: selectedCardType.name,
    number: formattedCardNumber,
    rawNumber: cardNumber,
    expiryDate: expirationDate,
    expirationDate: expirationDate,
    cvv,
    cardholderName
  };
}

