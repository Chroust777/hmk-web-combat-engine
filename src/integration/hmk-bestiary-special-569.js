/** Explicitly bounded, source-verified special-attack preflights.
 * HMK v1.2 pp.354, 390–392, 399. These do not fabricate dice or apply
 * irreversible combat effects; they expose verified conditional modifiers. */
const RULES=Object.freeze({
 boar:[{key:'gore',title:'Gore · náraz klů',page:354,description:'Úspěšný Tusk Strike jako součást Charge: +4 k Impactu.'}],
 eagle:[{key:'dive',title:'Dive · střemhlavý nálet',page:354,description:'Úspěšný Talon Strike při letícím Charge: +5 k Impactu.'}],
 hawk:[{key:'dive',title:'Dive · střemhlavý nálet',page:354,description:'Úspěšný Talon Strike při letícím Charge: +5 k Impactu.'}],
 'unicorn-ermael-391':[{key:'unicorn-gore',title:'Gore · roh jednorožce',page:391,description:'Úspěšný zásah rohem po Charge: +5 k Impactu.'}],
 'gryphon-griffin-marenu-390':[{key:'griffin-pounce',title:'Wing-pounce',page:390,description:'Po úspěšném Beak/Talon Strike: d10 proti TN 7; úspěch poskytuje Action TA pro Claw Strike, proti níž lze jen Dodge.'}],
 'wyre-wyvern-392':[{key:'wyvern-pounce',title:'Wing-pounce',page:392,description:'Po úspěšném Bite Strike: d10 proti TN 5; úspěch poskytuje Action TA pro Talon Strike, proti níž lze jen Dodge.'}],
 'snake-venom':[{key:'snake-dry',title:'Suché kousnutí',page:356,description:'Při kousnutí s lichou jednotkovou číslicí melee d100 nedojde k vypuštění jedu; konkrétní druh může mít jinou pravděpodobnost.'}],
 'vayera-7th-order-400':[{key:'vhir-daylight',title:'Denní světlo · 7. řád',page:399,description:'Široké denní světlo: −20 k Initiative/Morale; zataženo nebo soumrak: −10.'}],
 'vii-8th-order-400':[{key:'vhir-daylight',title:'Denní světlo · 8. řád',page:399,description:'Široké denní světlo: −20 k Initiative/Morale; zataženo nebo soumrak: −10.'}]
});
export function creatureSpecialRules569(entry){return RULES[entry?.id]||[];}
const integer=(n,min,max,label)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`${label}: zadej skutečné celé číslo ${min}–${max}.`);return n;};
export function previewCreatureSpecial569({templateId,key,confirmed=false,roll=null,light='none'}={}){
 const item=(RULES[templateId]||[]).find(p=>p.key===key);
 if(!item)throw Error('Druh nemá doložené vybrané zvláštní pravidlo.');
 if(!confirmed)throw Error('GM musí potvrdit, že nastaly tištěné podmínky zvláštního pravidla.');
 let result={},hint='';
 if(key==='gore')result={impactBonus:4};
 else if(key==='dive'||key==='unicorn-gore')result={impactBonus:5};
 else if(key==='griffin-pounce'||key==='wyvern-pounce'){
  const d10=integer(roll,1,10,'d10'),tn=key==='griffin-pounce'?7:5;
  result={roll:d10,tn,success:d10<=tn,actionTA:d10<=tn,defence:'Dodge only'};
 }else if(key==='snake-dry'){
  const d100=integer(roll,1,100,'Melee d100');
  result={roll:d100,dryBite:d100%2===1,venomReleased:d100%2===0};
  hint='Rozhodnutí o vypuštění jedu není testem odolnosti proti jedu.';
 }else if(key==='vhir-daylight'){
  if(!['daylight','cloudy','night'].includes(light))throw Error('Zvol ověřené světelné podmínky.');
  const modifier=light==='daylight'?-20:light==='cloudy'?-10:0;
  result={initiativeModifier:modifier,moraleModifier:modifier,light};
 }
 return {format:'hmk-bestiary-special-569-preview',templateId,key,page:item.page,
  result,description:item.description,hint,readOnly:true,requiresCombatSequence:true,
  persisted:false,automaticDice:false};
}
