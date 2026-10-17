/** HMK v1.2 p.39 and pp.55, 315,323–341: WEST VENÂRIAN only.
 * Non-West religions have no invented orthodoxy or Doctrine catalog. */
export const VERIFIED_WEST_DOCTRINES=Object.freeze({"Ágrik": {"range": [3, 13], "low": ["Shock"], "mid": ["Melee", "Morale Roll"], "high": ["Command", "Initiative"], "sourcePage": 323}, "Haléa": {"range": [5, 16], "low": ["Dancing", "Drawing", "Musician", "Singing", "Theatrics", "Charm", "Mercantilism"], "mid": [], "high": ["Guile", "Intrigue", "Physician"], "sourcePage": 325}, "Ilvîr": {"range": [5, 16], "low": ["Animalcraft", "Ceramics", "Drawing", "Fletching", "Glassworking", "Hideworking", "Jewelcraft", "Lockcraft", "Masonry", "Metalcraft", "Milling", "Musician", "Textilecraft", "Weaponcraft", "Woodworking", "Survival"], "mid": [], "high": ["Language (Ivashi)", "Physician"], "sourcePage": 327}, "Laráni": {"range": [8, 18], "low": ["Initiative", "Riding"], "mid": [], "high": ["Command", "Melee", "Shock"], "sourcePage": 329}, "Môrgath": {"range": [3, 7], "low": ["Command", "Hideworking", "Psyche Recovery Roll"], "mid": [], "high": ["Embalming", "Shadow Recovery Roll"], "sourcePage": 331}, "Navéh": {"range": [3, 10], "low": ["Guile", "Legerdemain", "Stealth"], "mid": [], "high": ["Awareness", "Melee"], "sourcePage": 333}, "Peóni": {"range": [8, 18], "low": ["Agriculture", "Animalcraft", "Physical Recovery Rolls"], "mid": [], "high": ["Herblore", "Physician"], "sourcePage": 335}, "Sárajìn": {"range": [5, 16], "low": ["Courage (Initiative and Fear Rolls)", "Seamanship"], "mid": [], "high": ["Command", "Melee"], "sourcePage": 337}, "Sávè-K’nôr": {"range": [8, 18], "low": ["Folklore", "Languages", "Scripts"], "mid": [], "high": ["Discourse (Hyn-Aelori)", "Theatrics (Rydequelyn)", "Intrigue (Shea-Al-Aecor)", "Creativity (Idea roll)", "Law", "Mathematics"], "sourcePage": 339}, "Siém": {"range": [11, 22], "low": ["Awareness", "Survival", "Stealth"], "mid": [], "high": ["Herblore", "Tracking"], "sourcePage": 341}});
/** HMK v1.2 pp.343–344: common Covenant subjects and church status.
 * A one-sided orthodox interval (8+ / 11+) is not a finite upper bound. */
export const VERIFIED_COVENANT_DOCTRINES=Object.freeze({
 'Beóna':{range:[8,null],low:['Physical Recovery Roll'],high:['Herblore']},
 'Edâryr':{range:[8,null],low:['Seamanship'],high:['Piloting']},
 'Elarána':{range:[8,null],low:['Tracking'],high:['Archery']},
 'Gáranik':{range:[5,12],low:['Shock'],high:['Melee']},
 'Môrdar':{range:[5,10],low:['Psyche Recovery Roll'],high:['Shadow Recovery Roll']},
 'Úlana':{range:[8,null],low:['Theatrics'],high:['Charm']},
 'Vanáer':{range:[5,10],low:['Stealth'],high:['Spirit']},
 'Ylvýr':{range:[8,null],low:['Survival'],high:['Timbercraft']},
 'Zârenor':{range:[8,null],low:['Guile'],high:['Lakíse Script']},
 'Ziém':{range:[11,null],low:['Fate Roll'],high:['Command']}
});
export function verifiedDoctrineReligion(religion){return Object.hasOwn(VERIFIED_WEST_DOCTRINES,religion)||Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,religion);}
export function moralityOrthodoxyPenalty(religion,morality){
 const spec=VERIFIED_WEST_DOCTRINES[religion]??VERIFIED_COVENANT_DOCTRINES[religion];
 if(!spec)throw Error('Pro toto náboženství příručka zde nedává ověřenou West Venârian / Covenant Doctrine tabulku');
 if(!Number.isInteger(morality)||morality<1||morality>40)throw Error('Morality musí být doložená celá hodnota v rozsahu 1–40; HMK p.39 dovoluje zvolit skóre');
 const [lo,hi]=spec.range;return Math.max(0,lo-morality,hi===null?0:morality-hi);
}
export function doctrineChoices(religion,ceremony){
 const spec=VERIFIED_WEST_DOCTRINES[religion]??VERIFIED_COVENANT_DOCTRINES[religion];if(!spec)return [];
 if(!['Low','Mid','High'].includes(ceremony))throw Error('Ceremony musí být Low/Mid/High');
 if(VERIFIED_COVENANT_DOCTRINES[religion])return ['Awareness',...spec.low,...(ceremony==='Low'?[]:['Initiative']),...(ceremony==='High'?['Folklore',...spec.high]:[])];
 return [...spec.low,...(ceremony==='Low'?[]:spec.mid),...(ceremony==='High'?spec.high:[])];
}
export function validateStartingReligion({religion,morality,ritualML,occupation='',clergy=false,fightingOrder=false,meleeML=0,initiativeML=0,subjects=[]}={}){
 const covenant=Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,religion);
 const penalty=moralityOrthodoxyPenalty(religion,morality);
 if(covenant){
  if(!Number.isInteger(ritualML)||ritualML<1||ritualML>200)throw Error('Covenant Ritual ML chybí');
  if(clergy&&fightingOrder)throw Error('Covenant Clergy a Fighting Order se vylučují');
  const circle=ritualML>=60?3:ritualML>=30?2:1;
  if(clergy!==(circle===3)||fightingOrder!==(circle===2))throw Error('Covenant p.343: Laity 1–29, Fighting Order 30–59, Clergy 60+; status plyne automaticky z Ritual ML');
  const ceremony=circle===3?'High':circle===2?'Mid':'Low';
  const maxPiety=Math.max(0,circle+1-penalty),blessingBonus=Math.floor(ritualML/10)+1;
  const available=doctrineChoices(religion,ceremony);
  if(!Array.isArray(subjects)||subjects.length!==maxPiety||new Set(subjects).size!==subjects.length||subjects.some(x=>!available.includes(x)))throw Error(`Covenant p.344: vyberte právě ${maxPiety} různých Doctrine Subjects (${ceremony})`);
  return {religion,morality,orthodoxyPenalty:penalty,ritualML,clergy,fightingOrder,circle,ceremony,maxPiety,blessingBonus,subjects:[...subjects],sourcePages:[343,344]};
 }
 if(!Number.isInteger(ritualML)||ritualML<1||ritualML>200)throw Error('Ritual ML chybí');
 if(clergy&&!(/^(Priest|Invoker|Shaman)( \(|$)/.test(occupation)||occupation==='Gentry: Priest'))throw Error('HMK p.55: Clergy je pro Priest, Invoker nebo Shaman s Ritual ML20');
 if(clergy&&ritualML<20)throw Error('HMK p.55: Clergy vyžaduje Ritual ML20');
 if(fightingOrder&&(ritualML<20||meleeML<50||initiativeML<50))throw Error('HMK p.55: Fighting Order vyžaduje Ritual ML20, Melee a Initiative ML50');
 if(fightingOrder&&clergy)throw Error('Clergy a Fighting Order jsou vzájemně výlučné tabulkové statusy');
 const circle=clergy?ritualML>=60?3:ritualML>=30?2:1:fightingOrder?ritualML>=40?2:1:0;
 const ceremony=clergy&&circle>=3?'High':fightingOrder?'Mid':clergy&&circle===2?'Mid':'Low';
 const maxPiety=Math.max(0,circle+1-penalty),bonus=Math.floor(ritualML/10)+1;
 const available=doctrineChoices(religion,ceremony);
 if(!Array.isArray(subjects)||subjects.length!==maxPiety||new Set(subjects).size!==subjects.length||subjects.some(x=>!available.includes(x)))throw Error(`HMK p.55: vyberte právě ${maxPiety} různých Doctrine Subjects v rozsahu ${ceremony} Ceremony`);
 return {religion,morality,orthodoxyPenalty:penalty,ritualML,clergy,fightingOrder,circle,ceremony,maxPiety,blessingBonus:bonus,subjects:[...subjects],sourcePages:[55,VERIFIED_WEST_DOCTRINES[religion].sourcePage]};
}
