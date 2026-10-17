/** Source-aware completeness map, not a substitute for transcribing HMK tables. */
export const HMK_EQUIPMENT_SECTIONS=Object.freeze([
 {id:'weapons',label:'Zbraně',category:'weapon',pages:'99–105',minimum:null},
 {id:'shields',label:'Štíty',category:'shield',pages:'104',minimum:null},
 {id:'suits',label:'Hotové komplety zbroje',category:'armor',pages:'113–116',minimum:12},
 {id:'articles',label:'Jednotlivé části zbroje a oděvu',category:'armor',pages:'118',minimum:null},
 {id:'layering',label:'Pravidla vrstvení',category:null,pages:'117, 119',minimum:null},
 {id:'gear',label:'Ostatní výbava',category:'other',pages:'120 a dále',minimum:null},
]);
export function catalogCoverage(items=[]){
 if(!Array.isArray(items))throw new TypeError('items must be array');
 const counts={weapon:0,shield:0,armor:0,other:0};
 for(const item of items){if(item&&Object.hasOwn(counts,item.category))counts[item.category]++;}
 return {format:'hmk-catalog-coverage-v1',counts,sections:HMK_EQUIPMENT_SECTIONS.map(s=>{
  const matching=items.filter(x=>x&&x.category===s.category);
  const suits= s.id==='suits'?matching.filter(x=>x.properties?.equipmentKind==='suit' || x.properties?.suit===true):[];
  const articles=s.id==='articles'?matching.filter(x=>x.properties?.equipmentKind==='article'):[];
  const count=s.id==='suits'?suits.length:s.id==='articles'?articles.length:s.category?matching.length:null;
  return {...s,count,complete:s.id==='suits'?count>=12:false,reason:s.id==='suits'&&count<12?'Chybí ověřené strukturované definice kompletů.':'Úplnost nelze prokázat pouze počtem položek.'};
 })};
}
