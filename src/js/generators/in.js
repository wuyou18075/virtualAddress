// IN address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from "../utils.js";
import { getDataFilePath } from "../config.js";
import { loadData, loadRealRow, ensureNameArray } from "../data-loader.js";

/**
 * Generate an Indian address. Prefers sharded PIN pool (data/in-pin/{STATE}.json).
 * @param {string} selectedState - state code or 'RANDOM'
 */
export async function generateINAddress(selectedState = "RANDOM") {
  try {
    const inData = await loadData(getDataFilePath("inRegions"));
    const namesData = await loadData(getDataFilePath("names"));

    let availableStates = {};
    if (selectedState === "RANDOM") {
      availableStates = inData.states;
    } else if (inData.states[selectedState]) {
      availableStates[selectedState] = inData.states[selectedState];
    } else {
      availableStates = inData.states;
    }

    const states = Object.keys(availableStates);
    if (states.length === 0) {
      throw new Error("No states available for selected state");
    }

    const stateKey = randomElement(states);
    const state = availableStates[stateKey];

    const nameGroup = namesData.nameGroups.indian;
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    let firstName;
    if (nameGroup.first.male && nameGroup.first.female) {
      firstName = randomElement(
        gender === "Male" ? nameGroup.first.male : nameGroup.first.female,
      );
    } else {
      firstName = randomElement(nameGroup.first);
    }
    const lastName = randomElement(nameGroup.last);

    let phoneNumber;
    if (state.area_codes && state.area_codes.length > 0) {
      const mobilePrefix = randomElement([6, 7, 8, 9]);
      const remainingDigits = randomInt(10000000, 99999999);
      phoneNumber = `${mobilePrefix}${remainingDigits}`;
    } else {
      phoneNumber = randomInt(6000000000, 9999999999).toString();
    }
    const phone = `+91 ${phoneNumber}`;
    const email = generateEmail(firstName, lastName);

    const stateNameEn = state.name.en || state.name.zh || stateKey;

    // 按邦代码分片加载真实 PIN 区域
    const realRow = await loadRealRow("inPinAreas", stateKey);

    let street;
    let city;
    let pin;
    let fullAddress;
    let district = "";

    if (realRow) {
      // row: office, district, state, pincode, fullAddress, ...
      street = realRow.office || realRow.street || "";
      city = realRow.district || realRow.city || "";
      district = realRow.district || "";
      pin = String(realRow.pincode || realRow.pin || "");
      fullAddress = realRow.fullAddress
        || `${street}, ${city}, ${stateNameEn} ${pin}`.replace(/^, |, $/g, "");
    }

    if (!street) {
      const streetNumber = randomInt(1, 999);
      const streetName = randomElement([
        "Main Road", "Gandhi Street", "Nehru Road", "Park Street", "Market Road",
        "Church Street", "Temple Street", "School Road", "Hospital Road",
        "MG Road", "Station Road", "Airport Road", "Highway Road", "Ring Road",
        "First Street", "Second Street", "Third Street", "Fourth Street",
        "Gandhi Nagar", "Nehru Nagar", "Rajiv Nagar", "Indira Nagar",
        "College Road", "University Road", "Library Road", "Museum Road",
      ]);
      street = `${streetNumber}, ${streetName}`;
    }

    if (!city) {
      if (state.cities && state.cities.length > 0) {
        city = randomElement(state.cities);
      } else {
        city = randomElement([
          "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
          "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
        ]);
      }
    }

    if (!pin) {
      if (state.pin_range && state.pin_range.min && state.pin_range.max) {
        pin = randomInt(state.pin_range.min, state.pin_range.max).toString();
      } else {
        pin = randomInt(100000, 999999).toString();
      }
    }

    if (!fullAddress) {
      fullAddress = `${street}, ${city}, ${stateNameEn} ${pin}`;
    }

    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street,
      city,
      district,
      state: stateNameEn,
      stateCode: stateKey,
      pin,
      fullAddress,
      country: "IN",
    };
  } catch (error) {
    console.error("Error generating IN address:", error);
    throw error;
  }
}
