/**
 * HârnMaster: Roleplaying in the World of Kèthîra, printed pp.109–110.
 * Every row represents a complete, specific printed weapon variant. The
 * projectile's actual shaft controls the Impact Die (p.108); the light-shaft
 * d8 recorded on a bow's mode is ONLY an adapter fallback and is replaced by
 * the verified loaded projectile before an attack can start. For slings, the
 * printed d10 Impact Die is a property of the weapon itself.
 * The short-range default d6 Zone Die is p.163 Direct PB; the attack resolver
 * replaces it with the actual range-dependent Zone Die.
 */
const SOURCE='HârnMaster: Roleplaying in the World of Kèthîra, printed p.109';
const rows={
 compositeBow:[
  [11,40,150,1,2,72],[11,60,180,2,2,78],[11,80,210,3,3,84],
  [12,100,240,4,3,90],[12,120,270,5,4,96],[12,140,300,6,4,102]],
 longbow:[
  [10,50,150,1,2,36],[10,75,180,2,2,45],[10,100,210,3,3,54],
  [11,125,240,4,3,63],[11,150,270,5,4,72],[11,175,300,6,4,81]],
 compositeCrossbow:[[11,200,270,4,7,144],[12,300,300,6,9,204]],
 woodenCrossbow:[[10,80,180,1,3,60],[10,120,210,2,4,84],[10,160,240,3,5,96]],
 kuzhanSteelbow:[[14,500,360,10,12,288]]
};
const names={compositeBow:'Composite Bow',longbow:'Longbow',compositeCrossbow:'Composite Crossbow',woodenCrossbow:'Wooden Crossbow',kuzhanSteelbow:'Kúzhan Steelbow'};
export const PRINTED_MISSILE_WEAPONS_P109_110=Object.freeze([
 ...Object.entries(rows).flatMap(([type,entries])=>entries.map(([wq,draw,range,impact,lb,price],index)=>{
  const crossbow=type.toLowerCase().includes('crossbow')||type==='kuzhanSteelbow';
  const missileType=crossbow?'crossbow':'bow';
  return Object.freeze({
   id:`hmk:missile:p109:${type}:${String(index+1).padStart(2,'0')}`,
   name:`${names[type]} (Draw ${draw})`,category:'weapon',source:SOURCE,
   description:`Original p.109 row: ${names[type]}, WQ ${wq}, Draw ${draw}, BR ${range} ft, +${impact}p impact, ${lb} lb, price ${price}d. Projectile shaft determines actual die.`,
   properties:Object.freeze({quality:wq,draw,baseRangeFt:range,weightLb:lb,pricePence:price,
    missileType,
    verifiedModes:Object.freeze([Object.freeze({name:'Projectile strike',missileType,
     // Light-shaft fallback only. The actual loaded projectile replaces it.
     impactDie:'d8',impactModifier:impact,aspect:'p',zoneDie:'d6'})])})
  });
 })),
 ...[
  {id:'hand',name:'Hand Sling',quality:9,range:180,volley:4,lb:0.2,price:6},
  {id:'staff',name:'Staff Sling',quality:9,range:240,volley:3,lb:3,price:18}
 ].map(s=>Object.freeze({
  id:`hmk:missile:p110:${s.id}-sling`,name:s.name,category:'weapon',
  source:'HârnMaster: Roleplaying in the World of Kèthîra, printed p.110',
  description:`Original p.110: WQ ${s.quality}, BR ${s.range} ft, VM×${s.volley}, d10+Strength Impact (b), ${s.lb} lb, ${s.price}d.${s.id==='staff'?' No +10 Point Blank bonus at ≤60 ft.':''}`,
  properties:Object.freeze({quality:s.quality,baseRangeFt:s.range,weightLb:s.lb,pricePence:s.price,
   missileType:'sling',slingType:s.id,volleyMaxMultiplier:s.volley,
   verifiedModes:Object.freeze([Object.freeze({name:'Sling stone',missileType:'sling',
    impactDie:'d10',impactModifier:0,aspect:'b',zoneDie:'d6'})])})
 }))
]);
