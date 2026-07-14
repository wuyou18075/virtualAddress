// JP address generator
import { randomElement, randomInt, generatePhoneNumber, generateEmail } from '../utils.js';
import { getDataFilePath } from '../config.js';
import { loadData, loadRealRow, ensureNameArray } from '../data-loader.js';

export async function generateJPAddress(selectedPrefecture = 'RANDOM') {
  try {
    const jpData = await loadData(getDataFilePath('jpRegions'));
    const jpNamesData = await loadData(getDataFilePath('jpNames'));
    const namesData = await loadData(getDataFilePath('names'));

    // Filter prefectures based on selected prefecture
    let availablePrefectures = {};
    if (selectedPrefecture === 'RANDOM') {
      // Use all prefectures
      availablePrefectures = jpData.prefectures || {};
    } else if (jpData.prefectures && jpData.prefectures[selectedPrefecture]) {
      // Use only the selected prefecture
      availablePrefectures[selectedPrefecture] = jpData.prefectures[selectedPrefecture];
    } else {
      // Fallback to all prefectures if invalid selection
      availablePrefectures = jpData.prefectures || {};
    }

    // Select random prefecture from filtered prefectures
    const prefectures = Object.keys(availablePrefectures);
    if (prefectures.length === 0) {
      throw new Error('No prefectures available for selected prefecture');
    }

    const prefectureKey = randomElement(prefectures);
    const prefecture = availablePrefectures[prefectureKey];

    // Generate name using Japanese names database (kanji, hiragana, katakana)
    // Japanese surnames (姓) are almost always in kanji, rarely in hiragana/katakana
    const surnameScriptTypes = ['kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'kanji', 'hiragana']; // 90% kanji, 10% hiragana
    const surnameScriptType = randomElement(surnameScriptTypes);
    const lastNames = jpNamesData.surnames[surnameScriptType] || jpNamesData.surnames.kanji;
    const lastName = randomElement(lastNames);

    // Japanese first names (名) can be in kanji, hiragana, or katakana
    const firstNameScriptTypes = ['kanji', 'kanji', 'kanji', 'hiragana', 'katakana']; // 60% kanji, 20% hiragana, 20% katakana
    const firstNameScriptType = randomElement(firstNameScriptTypes);

    const isMale = Math.random() > 0.5;

    // Get first name based on gender and script type
    let firstName;
    if (isMale) {
      const maleNames = jpNamesData.firstNames.male[firstNameScriptType] || jpNamesData.firstNames.male.kanji;
      firstName = randomElement(maleNames);
    } else {
      const femaleNames = jpNamesData.firstNames.female[firstNameScriptType] || jpNamesData.firstNames.female.kanji;
      firstName = randomElement(femaleNames);
    }

    // Gender in Japanese
    const gender = isMale ? '男性' : '女性';

    // Generate phone (Japan format: 0X-XXXX-XXXX) - use prefecture-specific phone codes if available
    let phoneCode;
    if (prefecture && prefecture.phone_codes && prefecture.phone_codes.length > 0) {
      // Use phone codes from the prefecture's list
      const selectedCode = randomElement(prefecture.phone_codes);
      // Remove leading 0 if present and format
      phoneCode = selectedCode.toString().replace(/^0+/, '');
    } else {
      // Fallback: use random phone code (should not happen if data is complete)
      phoneCode = randomInt(3, 9).toString();
    }
    const phone = `0${phoneCode}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;

    // Generate email - use English names for email to avoid non-ASCII characters
    const englishNameGroup = namesData.nameGroups.western || namesData.nameGroups.asian;
    let emailFirstName, emailLastName;
    if (englishNameGroup && englishNameGroup.first && englishNameGroup.last) {
      const firstList = ensureNameArray(englishNameGroup.first);
      const lastList = ensureNameArray(englishNameGroup.last);
      // Use Japanese-style names from asian group if available
      const japaneseRomajiNames = firstList.filter(n =>
        ['Hiroshi', 'Takeshi', 'Akira', 'Satoshi', 'Kenji', 'Taro', 'Jiro', 'Ichiro', 'Yuki', 'Ai', 'Emi', 'Yui', 'Rina', 'Miki', 'Saki', 'Nana', 'Kana', 'Mana', 'Hanako', 'Misaki', 'Sakura', 'Aya', 'Rei', 'Mai', 'Eri', 'Yuka'].includes(n)
      );
      const japaneseRomajiLastNames = lastList.filter(n =>
        ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Ishikawa', 'Maeda', 'Fujita', 'Ogawa', 'Goto', 'Okada'].includes(n)
      );

      if (japaneseRomajiNames.length > 0 && japaneseRomajiLastNames.length > 0) {
        emailFirstName = randomElement(japaneseRomajiNames);
        emailLastName = randomElement(japaneseRomajiLastNames);
      } else {
        emailFirstName = randomElement(firstList);
        emailLastName = randomElement(lastList);
      }
    } else {
      // Fallback: generate random English username
      const randomNames = ['john', 'mary', 'david', 'sarah', 'michael', 'emily', 'james', 'lisa', 'robert', 'anna'];
      emailFirstName = randomElement(randomNames);
      emailLastName = randomElement(randomNames);
    }
    const email = generateEmail(emailFirstName, emailLastName);

    // 日文都道府县名（与 data/jp-real 分片文件名一致）
    const prefectureName = prefecture
      ? (prefecture.name.ja || prefecture.name.zh || prefectureKey)
      : "東京都";

    // 按都道府县分片加载真实町域地址
    const realRow = await loadRealRow("jpRealAreas", prefectureName);

    let city;
    let address;
    let postcode;
    let fullAddress;

    if (realRow) {
      city = realRow.city || "";
      // town 作为街道/番地展示；部分条目已是完整街区
      address = realRow.town || realRow.street || "";
      const rawPc = String(realRow.postcode || "").replace(/\D/g, "");
      if (rawPc.length === 7) {
        postcode = `${rawPc.slice(0, 3)}-${rawPc.slice(3)}`;
      } else if (rawPc) {
        postcode = rawPc;
      } else {
        postcode = null;
      }
      fullAddress = realRow.fullAddress
        || (postcode
          ? `〒${postcode} ${prefectureName}${city}${address}`
          : `${prefectureName}${city}${address}`);
    }

    if (!address) {
      // 合成回退
      const addressData = jpData.address_data || {};
      if (prefecture && prefecture.cities && prefecture.cities.length > 0) {
        city = randomElement(prefecture.cities);
      } else {
        const fallbackCities = addressData.cities?.kanji || [
          "東京", "大阪", "京都", "横浜", "名古屋", "札幌", "福岡", "神戸", "仙台", "広島",
        ];
        city = randomElement(fallbackCities);
      }
      const wards = addressData.wards?.kanji || [
        "1丁目", "2丁目", "3丁目", "4丁目", "5丁目",
      ];
      const ward = randomElement(wards);
      const streets = addressData.streets?.kanji || [
        "中央", "本町", "新町", "大通", "駅前", "公園",
      ];
      const streetName = randomElement(streets);
      const streetNumber = randomInt(1, 50);
      const buildingNumber = randomInt(1, 20);
      address = `${streetName}${ward}${streetNumber}番${buildingNumber}号`;
    }

    if (!postcode) {
      let postcodePrefix = "100";
      if (prefecture && prefecture.postal_prefix && prefecture.postal_prefix.length > 0) {
        postcodePrefix = randomElement(prefecture.postal_prefix);
      }
      postcode = `${postcodePrefix}-${randomInt(1000, 9999)}`;
    }

    if (!fullAddress) {
      fullAddress = `〒${postcode} ${prefectureName}${city}${address}`;
    }

    return {
      firstName,
      lastName,
      gender,
      phone,
      email,
      street: address,
      city,
      prefecture: prefectureName,
      postcode,
      fullAddress,
      country: "JP",
    };
  } catch (error) {
    console.error("Error generating JP address:", error);
    throw error;
  }
}
