import { CombatState } from './src/domain/contracts.js';
const state=CombatState({id:'pages-smoke'});
document.querySelector('#module-status').textContent = state.schemaVersion===1 ? 'ES module check: OK' : 'ES module check: failed';
