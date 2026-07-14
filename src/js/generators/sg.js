// SG address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadDataById, loadRealPool, pickRealRow, ensureNameArray } from '../data-loader.js';

export async function generateSGAddress(selectedState = 'RANDOM') {
  try {
    const sgData = await loadData(getDataFilePath('sgRegions'));
    const namesData = await loadData(getDataFilePath('names'));
    
    let availableStates = {};
    if (selectedState === 'RANDOM') {
      availableStates = sgData.states;
    } else if (sgData.states[selectedState]) {
      availableStates[selectedState] = sgData.states[selectedState];
    } else {
      availableStates = sgData.states;
    }
    
    const states = Object.keys(availableStates);
    if (states.length === 0) throw new Error('No regions available');
    
    const stateKey = randomElement(states);
    const state = availableStates[stateKey];
    
    const nameGroup = namesData.nameGroups.western;
    const genderRaw = Math.random() > 0.5 ? 'Male' : 'Female';
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      firstName = randomElement(genderRaw === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    const gender = genderRaw === 'Male' ? 'Male' : 'Female';
    
    const mobilePrefix = randomElement(['8', '9']);
    const subscriberNumber = randomInt(1000000, 9999999);
    const phone = `+65 ${mobilePrefix}${subscriberNumber}`;
    
    const email = generateEmail(firstName, lastName);
    
    const cities = Object.keys(state.cities);
    if (cities.length === 0) throw new Error(`No cities for region ${stateKey}`);
    
    const cityName = randomElement(cities);
    const cityData = state.cities[cityName];
    
    if (!cityData || !cityData.zip || !cityData.streets) {
      throw new Error(`Invalid city data for ${cityName}`);
    }
    
    const zip = randomElement(cityData.zip);
    const streetName = randomElement(cityData.streets);
    
    const useBlockFormat = Math.random() > 0.3;
    let street;
    if (useBlockFormat) {
      const blockNum = randomInt(1, 999);
      const floor = randomInt(1, 25);
      const unit = randomInt(1, 12);
      street = `Block ${blockNum}, ${streetName}, #${floor.toString().padStart(2, '0')}-${unit.toString().padStart(2, '0')}`;
    } else {
      const unitNum = randomInt(1, 200);
      const floor = randomInt(1, 30);
      const unit = randomInt(1, 8);
      street = `${unitNum} ${streetName}, #${floor}-${unit}`;
    }
    
    const stateNameEn = state.name.en || state.name.zh;
    const fullAddress = `${street}, Singapore ${zip}`;
    
    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city: cityName,
      zip,
      postcode: zip,
      state: stateNameEn,
      stateCode: stateKey,
      fullAddress,
      country: 'SG'
    };
  } catch (error) {
    console.error('Error generating SG address:', error);
    throw error;
  }
}

// Generate Germany address
