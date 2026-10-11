/** The twelve named Armour Suits, transcribed from printed HMK pp.113–116.
 * Names are a reference index only: no unverified components or protection values.
 */
export const HMK_ARMOUR_SUIT_NAMES = Object.freeze([
 'Clothing','Heavy Clothing','Quilted Coat','Kûrbúl Cuirass',
 'Scale Byrnie','Mail Byrnie','Gambeson','Scale Habergeon',
 'Mail Habergeon','Mail Hauberk','Kûrbúl & Mail','Plate & Mail'
]);
export function auditSuitDefinitions(items){
 if(!Array.isArray(items)) throw new TypeError('items must be array');
 const definitions=items.filter(x=>x?.category==='armor'&&(x.properties?.equipmentKind==='suit'||x.properties?.suit===true));
 const normalized=s=>String(s??'').normalize('NFKC').trim().toLocaleLowerCase('en');
 const missing=HMK_ARMOUR_SUIT_NAMES.filter(name=>!definitions.some(x=>normalized(x.name)===normalized(name)));
 const incomplete=definitions.filter(x=>!Array.isArray(x.properties?.components)||!x.properties.components.length||!x.properties.components.every(c=>typeof c==='object'&&typeof c.articleId==='string'&&c.articleId.length>0&&Number.isInteger(c.quantity)&&c.quantity>0));
 return {expected:HMK_ARMOUR_SUIT_NAMES.length,defined:definitions.length,missing,incomplete:incomplete.map(x=>x.name),complete:missing.length===0&&incomplete.length===0};
}
