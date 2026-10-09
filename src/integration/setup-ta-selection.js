/** Parse a comma-separated set of Setup TA credit identifiers, max three per test. */
export function parseSetupTASelection(raw){
 if(typeof raw!=='string')throw new TypeError('Setup TA selection must be text');
 if(!raw.trim())return [];
 const ids=raw.split(',').map(s=>s.trim());
 if(ids.some(id=>!id)||ids.length>3||new Set(ids).size!==ids.length)throw new Error('Choose 1–3 distinct Setup TA credits');
 return ids;
}
