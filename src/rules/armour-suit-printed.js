/** Verbatim suit article names and printed summary values, HMK p.113.
 * Reference-only: not inventory items; no derived protection or ENC calculations.
 */
export const PRINTED_ARMOUR_SUITS_P113=Object.freeze([
 {name:'Clothing',page:113,price:100,enc:0,per:0,area:'f1',weightLb:5,articles:['Cloth Vest','Cloth Tunic','Cloth Breeches','Cloth Swaddle']},
 {name:'Heavy Clothing',page:113,price:240,enc:0,per:0,area:'f3',weightLb:10,articles:['Leather Cap','Padded Shirt','Cloth Sleeved Tunic','Cloth Surcoat','Cloth Breeches','Cloth Swaddle','Leather Shoes']},
 {name:'Quilted Coat',page:113,price:400,enc:5,per:0,area:'f4',weightLb:20,articles:['Kurbul Helm','Padded Cap','Quilted Coat','Cloth Tunic','Cloth Breeches','Cloth Leggings','Leather Shoes']}
]);
/** Printed HMK p.114; reference only. */
export const PRINTED_ARMOUR_SUITS_P114=Object.freeze([
 {name:'Kûrbúl Cuirass',page:114,price:500,enc:5,per:0,area:'f4',weightLb:20,articles:['Plate Helm','Padded Cap','Kurbul Spaulders','Kurbul Rerebraces','Kurbul Cuirass','Padded Slvd. Tunic','Cloth Trousers','Cloth Swaddle','Leather Boots']},
 {name:'Scale Byrnie',page:114,price:700,enc:10,per:0,area:'f5',weightLb:30,articles:['Plate Helm','Padded Cap','Scale Byrnie','Padded Coat','Cloth Trousers','Cloth Swaddle','Leather Boots']},
 {name:'Mail Byrnie',page:114,price:800,enc:5,per:0,area:'f4',weightLb:20,articles:['Plate Helm','Padded Cap','Mail Byrnie','Padded Tunic','Cloth Trousers','Cloth Swaddle','Leather Boots']}
]);
export const PRINTED_ARMOUR_SUITS_P113_114=Object.freeze([...PRINTED_ARMOUR_SUITS_P113,...PRINTED_ARMOUR_SUITS_P114]);
/** Printed HMK p.115; reference only, no inferred item protection. */
export const PRINTED_ARMOUR_SUITS_P115=Object.freeze([
 {name:'Gambeson',page:115,price:800,enc:10,per:0,area:'f6',weightLb:30,articles:['Plate Helm','Padded Cap','Gambeson Coat','Cloth Vest','Kurbul Kneecops','Padded Cuisses','Cloth Breeches','Cloth Swaddle','Leather Boots']},
 {name:'Scale Habergeon',page:115,price:950,enc:15,per:5,area:'f6',weightLb:40,articles:['Plate ¾-Helm','Padded Cap','Kurbul Spaulders','Kurbul Coudes','Leather Gauntlets','Scale Habergeon','Padded Coat','Cloth Breeches','Kurbul Kneecops','Padded Leggings','Leather Boots']},
 {name:'Mail Habergeon',page:115,price:1100,enc:10,per:0,area:'f5',weightLb:30,articles:['Plate Helm','Padded Cap','Mail Habergeon','Padded Coat','Cloth Breeches','Kurbul Kneecops','Padded Leggings','Leather Boots']}
]);
export const PRINTED_ARMOUR_SUITS_P113_115=Object.freeze([...PRINTED_ARMOUR_SUITS_P113,...PRINTED_ARMOUR_SUITS_P114,...PRINTED_ARMOUR_SUITS_P115]);

/** Printed HMK p.116; reference-only, not wearable inventory presets. */
export const PRINTED_ARMOUR_SUITS_P116=Object.freeze([
 {name:'Mail Hauberk',page:116,price:2000,enc:25,per:10,area:'f6',weightLb:60,articles:['Mail Cowl','Padded Cowl','Plate Coudes','Mail Mittens','Padded Mittens','Mail Hauberk','Padded Coat','Cloth Breeches','Plate Kneecops','Mail Leggings','Padded Leggings']},
 {name:'Kûrbúl & Mail',page:116,price:2500,enc:40,per:15,area:'f8',weightLb:80,articles:['Plate ¾-Helm','Mail Cowl','Padded Cowl','Kurbul Spaulders','Kurbul Rerebraces','Kurbul Coudes','Mail Mittens','Padded Mittens','Kurbul Cuirass','Mail Hauberk','Padded Coat','Cloth Breeches','Kurbul Kneecops','Plate Greaves','Mail Leggings','Padded Leggings']},
 {name:'Plate & Mail',page:116,price:3200,enc:40,per:20,area:'f9',weightLb:90,articles:['Great Helm','Mail Cowl','Padded Cowl','Plate Spaulders','Plate Rerebraces','Plate Coudes','Plate Vambraces','Mail Mittens','Padded Mittens','Plate Cuirass','Mail Hauberk','Padded Coat','Cloth Breeches','Plate Kneecops','Plate Greaves','Mail Leggings','Padded Leggings']}
]);
export const PRINTED_ARMOUR_SUITS_P113_116=Object.freeze([...PRINTED_ARMOUR_SUITS_P113_115,...PRINTED_ARMOUR_SUITS_P116]);

export function auditPrintedSuits(suits=PRINTED_ARMOUR_SUITS_P113){
 const names=new Set();const errors=[];
 for(const s of suits){
  if(names.has(s.name))errors.push(`Duplicate suit: ${s.name}`);names.add(s.name);
  if(!Number.isInteger(s.price)||s.price<0||!Number.isInteger(s.enc)||s.enc<0||!Number.isInteger(s.per)||s.per<0||!Number.isFinite(s.weightLb)||s.weightLb<0||!/^f\d+$/.test(s.area)||!Array.isArray(s.articles)||!s.articles.length||s.articles.some(a=>typeof a!=='string'||!a.trim()))errors.push(`Invalid suit: ${s.name}`);
 }
 return {count:suits.length,errors,valid:errors.length===0};
}
