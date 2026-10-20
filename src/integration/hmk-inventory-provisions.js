/** Printed HMK p.120 physical ration recognition. Read-only; do not create
 * synthetic food, assume a waterskin is filled, or debit any inventory item.
 * Each exactly printed 3 lb ration is one day's standard food (p.186).
 */
const RATIONS=Object.freeze({
 'hmk:gear:hmk-p120-026':'Rations, iron',
 'hmk:gear:hmk-p120-027':'Rations, standard'
});
export function provenCarriedRations(inventory=[],actorId){
 return inventory.filter(x=>x.characterId===actorId&&x.slot!=='chest'&&
  RATIONS[x.sourceItemId]===x.snapshot?.name&&x.snapshot?.id===x.sourceItemId&&
  x.snapshot?.category==='other'&&x.snapshot?.properties?.weightLb===3&&
  Number.isSafeInteger(x.quantity*2)&&x.quantity>0)
  .map(x=>({itemId:x.id,actorId,sourceItemId:x.sourceItemId,
   name:x.snapshot.name,foodDays:x.quantity,weightLb:3*x.quantity,sourcePages:[120,186]}));
}
/** Foraging-only is a STRONG GM claim that no other supplies are available.
 * Physical ration inventory contradicts that claim. Refuse to generate a
 * medically actionable shortage rather than silently declare starvation.
 */
export function assertExclusiveForagingProven({inventory=[],actorId}={}){
 const present=provenCarriedRations(inventory,actorId);
 if(present.length)throw Error('Postava '+actorId+' nese '+present.reduce((n,p)=>n+p.foodDays,0)+
  ' doložených potravinových dávek v inventáři (HMK 120). Výhradní Foraging není prokázán. '+
  'Před automatickým zdravotním vyhodnocením je třeba doložit skutečný výdej či jiný režim zásob.');
 return true;
}
