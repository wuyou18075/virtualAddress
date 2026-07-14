// DE address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadDataById, loadRealPool, pickRealRow, ensureNameArray } from '../data-loader.js';

export async function generateDEAddress(selectedState = 'RANDOM') {
  try {
    const deData = await loadData(getDataFilePath('deRegions'));
    const namesData = await loadData(getDataFilePath('names'));
    
    // Filter states based on selected state
    let availableStates = {};
    if (selectedState === 'RANDOM') {
      // Use all states
      availableStates = deData.states;
    } else if (deData.states[selectedState]) {
      // Use only the selected state
      availableStates[selectedState] = deData.states[selectedState];
    } else {
      // Fallback to all states if invalid selection
      availableStates = deData.states;
    }
    
    // Select random state from filtered states
    const states = Object.keys(availableStates);
    if (states.length === 0) {
      throw new Error('No states available for selected state');
    }
    
    const stateKey = randomElement(states);
    const state = availableStates[stateKey];
    
    // Generate name - decide gender first, then select name
    const nameGroup = namesData.nameGroups.western;
    const genderRaw = Math.random() > 0.5 ? 'Male' : 'Female';
    // Select name based on gender - use gender-specific name lists if available
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      // Use gender-specific name lists
      firstName = randomElement(genderRaw === 'Male' ? nameGroup.first.male : nameGroup.first.female);
    } else {
      // Fallback: use all names if gender classification not available
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);
    
    // Convert gender to German format for display: Männlich (男) / Weiblich (女)
    const gender = genderRaw === 'Male' ? 'Männlich (男)' : 'Weiblich (女)';
    
    // Generate phone - German mobile format: +49 1xx xxxxxxx
    // Mobile prefixes: 151, 160, 170, 171, 175 (Telekom); 152, 162, 172, 173, 174 (Vodafone); 157, 163, 176, 177, 178 (O2)
    const mobilePrefixes = ['151', '160', '170', '171', '175', '152', '162', '172', '173', '174', '157', '163', '176', '177', '178'];
    const prefix = randomElement(mobilePrefixes);
    const subscriberNumber = randomInt(1000000, 9999999);
    const phone = `+49 ${prefix} ${subscriberNumber}`;
    
    // Generate email - use generateEmail function (ensures no dot before @)
    const email = generateEmail(firstName, lastName);
    
    // Generate address - select random city from state
    // IMPORTANT: Ensure city is selected from the correct state to avoid cross-state mismatches
    const cities = Object.keys(state.cities);
    if (cities.length === 0) {
      throw new Error(`No cities available for state ${stateKey}`);
    }
    
    const cityName = randomElement(cities);
    const cityData = state.cities[cityName];
    
    // Validate city data structure
    if (!cityData || !cityData.zip || !cityData.streets) {
      throw new Error(`Invalid city data structure for ${cityName} in state ${stateKey}`);
    }
    
    // Get zip code from city data (ensures zip matches the city)
    if (cityData.zip.length === 0) {
      throw new Error(`No zip codes available for city ${cityName} in state ${stateKey}`);
    }
    const zip = randomElement(cityData.zip);
    
    // Get street name from city data (ensures street matches the city)
    if (cityData.streets.length === 0) {
      throw new Error(`No streets available for city ${cityName} in state ${stateKey}`);
    }
    const streetName = randomElement(cityData.streets);
    
    // Generate house number (1-150, occasionally with letter suffix like 12a)
    const houseNumber = randomInt(1, 150);
    const suffix = Math.random() < 0.2 ? String.fromCharCode(97 + randomInt(0, 2)) : '';
    const street = `${streetName} ${houseNumber}${suffix}`;
    
    // Use English state name for full address and state field
    const stateNameEn = state.name.en || state.name.zh;
    const fullAddress = `${street}, ${zip} ${cityName}, ${stateNameEn}, Germany`;
    
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
      country: 'DE'
    };
  } catch (error) {
    console.error('Error generating DE address:', error);
    throw error;
  }
}
