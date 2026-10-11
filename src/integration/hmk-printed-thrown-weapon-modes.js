/** Original HârnMaster: Roleplaying in the World of Kèthîra, printed p.110.
 * The same physical item has a separate THROWING impact; its printed Melee
 * primary Strike Mode must not be replaced. Catalog-only, provenance-gated.
 */
const TABLE={
 'axes:p99':{'Shôrkána':{heft:10,baseRangeFt:40,pbZoneDie:8,impactModifier:2,aspect:'e'}},
 'polearms:p102':{
  'Javelin':{heft:11,baseRangeFt:60,pbZoneDie:6,impactModifier:2,aspect:'p'},
  'Spear':{heft:13,baseRangeFt:40,pbZoneDie:8,impactModifier:3,aspect:'p'}},
 'knives:p101':{'Tabûri':{heft:7,baseRangeFt:30,pbZoneDie:6,impactModifier:0,aspect:'p'}}
};
/** If and only if this comes from the exact printed category, append a
 * separately verified thrown mode. A user-created lookalike is NOT certified.
 */
export function annotatePrintedThrownWeapon(entry,printedCatalogKey){
 const row=TABLE[printedCatalogKey]?.[entry?.name];
 if(!row)return entry;
 const p=entry.properties??{};
 if(p.heft!==row.heft||p.baseRangeFt!==row.baseRangeFt||p.missileType!=null)
  throw Error('HMK p.110 thrown weapon catalog disagrees with printed Melee row');
 return {...entry,properties:{...p,missileType:'thrown',
  printedThrowingMode:{source:'HMK p.110 / Thrown Weapons',impactDie:'d8',
   impactModifier:row.impactModifier,aspect:row.aspect,pbZoneDie:row.pbZoneDie,
   volleyMaxMultiplier:2,baseRangeFt:row.baseRangeFt,heft:row.heft}}};
}
