// Address generators — re-exports for compatibility.
// Prefer importing from ./generators/<country>.js for smaller page loads.

export { loadData, loadDataById, loadRealRow, loadRealPool, pickRealRow } from './data-loader.js';
export { generateUSAddress, generateTaxFreeAddress } from './generators/us.js';
export { generateHKAddress } from './generators/hk.js';
export { generateUKAddress } from './generators/uk.js';
export { generateCAAddress } from './generators/ca.js';
export { generateJPAddress } from './generators/jp.js';
export { generateINAddress } from './generators/in.js';
export { generateTWAddress } from './generators/tw.js';
export { generateSGAddress } from './generators/sg.js';
export { generateDEAddress } from './generators/de.js';
export { generateIdentityInfo, generateCreditCardInfo } from './generators/identity.js';
