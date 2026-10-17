/** HârnMaster: Roleplaying in the World of Kèthîra, printed pp.108, 110.
 * Built-in stock ammunition definitions. Twelve shaft/head combinations are
 * exactly the printed two shaft weights × three heads × arrow/bolt.
 * Price is printed PER DOZEN, not price per individual missile.
 * Head mass and finished arrow/bolt total mass are NOT specified on p.108;
 * deliberately do not invent weightLb, nor assume crossbow bolts weigh exactly
 * the same as arrows (the book says 'comparable mass').
 * Inventory quantities remain individual physical missiles, not twelve-packs.
 */
const SOURCE_108='HârnMaster: Roleplaying in the World of Kèthîra, printed p.108, Projectiles';
const SOURCE_110='HârnMaster: Roleplaying in the World of Kèthîra, printed p.110, Slings';
const SHAFTS=Object.freeze([
 Object.freeze({key:'heavy',title:'Heavy',impactDie:'d12',volleyBow:3,volleyCrossbow:2,pricePerDozenPence:15,approxShaftOunces:3.5}),
 Object.freeze({key:'light',title:'Light',impactDie:'d8',volleyBow:4,volleyCrossbow:3,pricePerDozenPence:12,approxShaftOunces:2})
]);
const HEADS=Object.freeze([
 Object.freeze({key:'bodkin',title:'Bodkin'}),
 Object.freeze({key:'blunt',title:'Blunt'}),
 Object.freeze({key:'broad',title:'Broad'})
]);
export const PRINTED_PROJECTILES_P108_110=Object.freeze([
 ...['arrow','bolt'].flatMap(kind=>SHAFTS.flatMap(shaft=>HEADS.map(head=>Object.freeze({
  id:`hmk:projectile:p108:${kind}:${shaft.key}:${head.key}`,
  name:`${shaft.title} ${head.title} ${kind==='arrow'?'Arrow':'Bolt'}`,
  category:'other',
  description:`Printed HMK projectile: ${shaft.title.toLowerCase()} shaft and ${head.title.toLowerCase()} head. Price ${shaft.pricePerDozenPence}d per twelve. Finished projectile mass is not specified.`,
  source:SOURCE_108,
  properties:Object.freeze({
   projectileKind:kind,shaftWeight:shaft.key,headType:head.key,
   impactDie:shaft.impactDie,volleyBowMultiplier:shaft.volleyBow,
   volleyCrossbowMultiplier:shaft.volleyCrossbow,
   headEffect:head.key==='bodkin'?'AR 4p; Impact TA 3':head.key==='blunt'?'Half final Strike Impact':'Bleeding +5 virtual Effective Impact',
   pricePerDozenPence:shaft.pricePerDozenPence,pricedQuantity:12,
   ...(kind==='arrow'?{approxShaftWeightOz:shaft.approxShaftOunces}:{}),
   totalProjectileWeightLbKnown:false
  })
 })))),
 Object.freeze({
  id:'hmk:projectile:p110:sling-lead-bullet',name:'Sling Lead Bullet',category:'other',
  description:'Crafted lead ovoid sling bullet, not an improvised rock. Twelve weigh 2 lb and cost 9d.',
  source:SOURCE_110,
  properties:Object.freeze({projectileKind:'stone',projectileType:'stone',
   slingProjectileForm:'crafted-lead-ovoid',weightLb:2/12,pricePerDozenPence:9,pricedQuantity:12})
 }),
 Object.freeze({
  id:'hmk:projectile:p110:improvised-sling-rock',name:'Improvised Sling Rock',category:'other',
  description:'HMK p.110 improvised rock: Sling −10 EML and BR −30 ft. Actual mass varies and must be recorded; not invented.',
  source:SOURCE_110,
  properties:Object.freeze({projectileKind:'stone',projectileType:'stone',slingProjectileForm:'improvised-rock',totalProjectileWeightLbKnown:false})
 })
]);
