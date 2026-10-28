/** HMK 1.2, pp. 355/357. Exact printed baseline animals, not random inventions.
 * Temporary encounter entries do NOT become PC/NPC, Combat State, or health actors.
 */
export const BESTIARY_ANIMALS_563=Object.freeze([
  {"id":"bovine","name":"Bovine (Oxen)","group":"domestic","page":355,"size":"b","weightLb":1500,"attributes":{"str":32,"end":18,"agl":8,"per":14,"aur":3,"wil":10,"rea":3,"cre":2},"move":80,"skills":{"awareness":60,"scent":3,"stealth":33,"spirit":18,"initiative":21},"weapons":[{"name":"kick","attack":45,"defence":45,"impact":"d6+6b","special":"low aim, trample"}],"combat":{"dodge":33,"press":36,"tar":2,"shock":51,"av":{"b":6,"e":5,"p":3,"f":5},"bodyTable":"c"}},
  {"id":"camel","name":"Camel (Dromedary)","group":"domestic","page":355,"size":"b","weightLb":1100,"attributes":{"str":28,"end":14,"agl":8,"per":18,"aur":4,"wil":14,"rea":5,"cre":6},"move":120,"skills":{"awareness":80,"scent":5,"stealth":52,"spirit":27,"initiative":30},"weapons":[{"name":"kick","attack":55,"defence":70,"impact":"d6+6b","special":"low aim, trample"},{"name":"bite","attack":44,"defence":70,"impact":"d4+4p","special":""}],"combat":{"dodge":39,"press":44,"tar":2,"shock":42,"av":{"b":5,"e":4,"p":2,"f":4},"bodyTable":"c"},"moveModifierPrinted":3},
  {"id":"cat","name":"Cat","group":"domestic","page":355,"size":"t","weightLb":10,"attributes":{"str":3,"end":8,"agl":18,"per":16,"aur":4,"wil":18,"rea":5,"cre":5},"move":70,"skills":{"awareness":85,"scent":3,"stealth":85,"spirit":33,"initiative":36},"weapons":[{"name":"claw","attack":72,"defence":72,"impact":"d8−7e","special":""},{"name":"bite","attack":54,"defence":54,"impact":"d6−5p","special":""}],"combat":{"dodge":68,"press":72,"tar":1,"shock":15,"av":{"b":-3,"e":-4,"p":-5,"f":-3},"bodyTable":"d"}},
  {"id":"ratter","name":"Dog (Ratter)","group":"domestic","page":355,"size":"t","weightLb":20,"attributes":{"str":4,"end":7,"agl":13,"per":18,"aur":4,"wil":13,"rea":6,"cre":7},"move":90,"skills":{"awareness":80,"scent":5,"stealth":60,"spirit":24,"initiative":50},"weapons":[{"name":"bite","attack":60,"defence":60,"impact":"d6−4p","special":"clench"}],"combat":{"dodge":60,"press":52,"tar":1,"shock":25,"av":{"b":-1,"e":-2,"p":-3,"f":-1},"bodyTable":"d"}},
  {"id":"hunter","name":"Dog (Hunter)","group":"domestic","page":355,"size":"s","weightLb":60,"attributes":{"str":8,"end":9,"agl":13,"per":20,"aur":4,"wil":12,"rea":6,"cre":7},"move":110,"skills":{"awareness":80,"scent":6,"stealth":64,"spirit":24,"initiative":45},"weapons":[{"name":"bite","attack":65,"defence":65,"impact":"d6−1p","special":"clench"}],"combat":{"dodge":64,"press":52,"tar":1,"shock":40,"av":{"b":2,"e":1,"p":0,"f":2},"bodyTable":"e"}},
  {"id":"guard","name":"Dog (Guard)","group":"domestic","page":355,"size":"s","weightLb":110,"attributes":{"str":11,"end":10,"agl":13,"per":17,"aur":4,"wil":14,"rea":6,"cre":7},"move":120,"skills":{"awareness":80,"scent":5,"stealth":60,"spirit":27,"initiative":50},"weapons":[{"name":"bite","attack":65,"defence":65,"impact":"d6+0p","special":"clench"}],"combat":{"dodge":60,"press":52,"tar":1,"shock":55,"av":{"b":3,"e":2,"p":1,"f":3},"bodyTable":"e"}},
  {"id":"donkey","name":"Horse (Donkey)","group":"domestic","page":355,"size":"l","weightLb":600,"attributes":{"str":24,"end":13,"agl":12,"per":18,"aur":4,"wil":12,"rea":4,"cre":5},"move":110,"skills":{"awareness":75,"scent":3,"stealth":60,"spirit":24,"initiative":24},"weapons":[{"name":"kick","attack":60,"defence":60,"impact":"d6+4b","special":"low aim, trample"},{"name":"bite","attack":48,"defence":48,"impact":"d4+3p","special":""}],"combat":{"dodge":60,"press":48,"tar":2,"shock":39,"av":{"b":4,"e":3,"p":1,"f":3},"bodyTable":"b"},"moveModifierPrinted":2},
  {"id":"pony","name":"Horse (Pony)","group":"domestic","page":355,"size":"l","weightLb":700,"attributes":{"str":24,"end":10,"agl":12,"per":17,"aur":4,"wil":11,"rea":4,"cre":4},"move":130,"skills":{"awareness":70,"scent":3,"stealth":56,"spirit":21,"initiative":24},"weapons":[{"name":"kick","attack":60,"defence":60,"impact":"d6+4b","special":"low aim, trample"},{"name":"bite","attack":48,"defence":48,"impact":"d4+3p","special":""}],"combat":{"dodge":56,"press":48,"tar":2,"shock":36,"av":{"b":4,"e":3,"p":1,"f":3},"bodyTable":"b"},"moveModifierPrinted":3},
  {"id":"mule","name":"Horse (Mule)","group":"domestic","page":355,"size":"b","weightLb":900,"attributes":{"str":25,"end":12,"agl":12,"per":17,"aur":4,"wil":12,"rea":5,"cre":6},"move":120,"skills":{"awareness":75,"scent":3,"stealth":56,"spirit":24,"initiative":27},"weapons":[{"name":"kick","attack":60,"defence":60,"impact":"d6+4b","special":"low aim, trample"},{"name":"bite","attack":48,"defence":48,"impact":"d4+3p","special":""}],"combat":{"dodge":62,"press":48,"tar":2,"shock":39,"av":{"b":4,"e":3,"p":1,"f":3},"bodyTable":"c"},"moveModifierPrinted":3},
  {"id":"palfrey","name":"Horse (Palfrey)","group":"domestic","page":355,"size":"b","weightLb":1000,"attributes":{"str":26,"end":10,"agl":11,"per":17,"aur":4,"wil":10,"rea":4,"cre":4},"move":130,"skills":{"awareness":70,"scent":4,"stealth":56,"spirit":21,"initiative":21},"weapons":[{"name":"kick","attack":55,"defence":55,"impact":"d6+5b","special":"low aim, trample"},{"name":"bite","attack":44,"defence":44,"impact":"d4+4p","special":""}],"combat":{"dodge":56,"press":44,"tar":2,"shock":36,"av":{"b":5,"e":4,"p":2,"f":4},"bodyTable":"c"},"moveModifierPrinted":4},
  {"id":"courser","name":"Horse (Courser)","group":"domestic","page":355,"size":"b","weightLb":1100,"attributes":{"str":27,"end":10,"agl":12,"per":17,"aur":4,"wil":11,"rea":4,"cre":4},"move":150,"skills":{"awareness":70,"scent":4,"stealth":56,"spirit":21,"initiative":32},"weapons":[{"name":"kick","attack":60,"defence":60,"impact":"d6+5b","special":"low aim, trample"},{"name":"bite","attack":48,"defence":48,"impact":"d4+4p","special":""}],"combat":{"dodge":60,"press":48,"tar":2,"shock":52,"av":{"b":5,"e":4,"p":2,"f":4},"bodyTable":"c"},"moveModifierPrinted":5},
  {"id":"charger","name":"Horse (Charger)","group":"domestic","page":355,"size":"b","weightLb":1200,"attributes":{"str":28,"end":11,"agl":11,"per":17,"aur":4,"wil":11,"rea":4,"cre":4},"move":140,"skills":{"awareness":70,"scent":4,"stealth":56,"spirit":21,"initiative":40},"weapons":[{"name":"kick","attack":62,"defence":62,"impact":"d6+6b","special":"low aim, trample"},{"name":"bite","attack":55,"defence":55,"impact":"d4+4p","special":""}],"combat":{"dodge":56,"press":55,"tar":2,"shock":65,"av":{"b":5,"e":4,"p":2,"f":4},"bodyTable":"c"},"moveModifierPrinted":5},
  {"id":"destrier","name":"Horse (Destrier)","group":"domestic","page":355,"size":"b","weightLb":1400,"attributes":{"str":30,"end":12,"agl":10,"per":17,"aur":4,"wil":12,"rea":5,"cre":5},"move":120,"skills":{"awareness":70,"scent":4,"stealth":52,"spirit":24,"initiative":53},"weapons":[{"name":"kick","attack":68,"defence":68,"impact":"d6+7b","special":"low aim, trample"},{"name":"bite","attack":62,"defence":62,"impact":"d4+5p","special":""}],"combat":{"dodge":59,"press":62,"tar":2,"shock":75,"av":{"b":6,"e":5,"p":3,"f":5},"bodyTable":"c"},"moveModifierPrinted":6},
  {"id":"ram","name":"Ram","group":"domestic","page":355,"size":"m","weightLb":300,"attributes":{"str":16,"end":14,"agl":14,"per":17,"aur":3,"wil":15,"rea":3,"cre":3},"move":120,"skills":{"awareness":80,"scent":4,"stealth":60,"spirit":27,"initiative":27},"weapons":[{"name":"gore","attack":70,"defence":70,"impact":"d6+5b","special":""},{"name":"kick","attack":56,"defence":56,"impact":"d6+1b","special":"low aim, trample"}],"combat":{"dodge":60,"press":70,"tar":1,"shock":45,"av":{"b":3,"e":2,"p":1,"f":3},"bodyTable":"a"}},
  {"id":"bear-grey","name":"Bear (Grey / Black)","group":"wild","page":357,"size":"m","weightLb":300,"attributes":{"str":16,"end":12,"agl":13,"per":14,"aur":4,"wil":12,"rea":5,"cre":5},"move":100,"skills":{"awareness":65,"scent":6,"stealth":65,"spirit":24,"initiative":36},"weapons":[{"name":"bite","attack":65,"defence":65,"impact":"d6+3p","special":""},{"name":"claw","attack":52,"defence":52,"impact":"d8+2e","special":""}],"combat":{"dodge":52,"press":71,"tar":1,"shock":56,"av":{"b":4,"e":3,"p":2,"f":4},"bodyTable":"f"}},
  {"id":"bear-lythian","name":"Bear (Lýthian)","group":"wild","page":357,"size":"l","weightLb":700,"attributes":{"str":24,"end":18,"agl":12,"per":14,"aur":5,"wil":13,"rea":4,"cre":4},"move":120,"skills":{"awareness":70,"scent":6,"stealth":65,"spirit":27,"initiative":36},"weapons":[{"name":"bite","attack":60,"defence":60,"impact":"d6+7p","special":""},{"name":"claw","attack":48,"defence":48,"impact":"d8+6e","special":""}],"combat":{"dodge":52,"press":66,"tar":2,"shock":76,"av":{"b":8,"e":7,"p":6,"f":8},"bodyTable":"g"}},
  {"id":"bear-kyani","name":"Bear (Kyáni)","group":"wild","page":357,"size":"b","weightLb":1000,"attributes":{"str":28,"end":21,"agl":10,"per":14,"aur":5,"wil":15,"rea":5,"cre":5},"move":90,"skills":{"awareness":70,"scent":7,"stealth":60,"spirit":30,"initiative":40},"weapons":[{"name":"bite","attack":60,"defence":60,"impact":"d6+9p","special":""},{"name":"claw","attack":48,"defence":48,"impact":"d8+8e","special":""}],"combat":{"dodge":48,"press":66,"tar":2,"shock":84,"av":{"b":10,"e":9,"p":8,"f":10},"bodyTable":"h"}},
  {"id":"boar","name":"Boar","group":"wild","page":357,"size":"m","weightLb":200,"attributes":{"str":14,"end":16,"agl":9,"per":10,"aur":4,"wil":15,"rea":6,"cre":7},"move":110,"skills":{"awareness":60,"scent":4,"stealth":45,"spirit":27,"initiative":55},"weapons":[{"name":"tusk","attack":60,"defence":60,"impact":"d6+2p","special":"gore"},{"name":"kick","attack":48,"defence":48,"impact":"d6−1b","special":"low aim"}],"combat":{"dodge":36,"press":66,"tar":1,"shock":75,"av":{"b":3,"e":2,"p":1,"f":3},"bodyTable":"f"}},
  {"id":"crow","name":"Crow","group":"wild","page":357,"size":"t","weightLb":3,"attributes":{"str":2,"end":8,"agl":10,"per":22,"aur":6,"wil":10,"rea":8,"cre":10},"move":200,"skills":{"awareness":80,"scent":3,"stealth":64,"spirit":32,"initiative":27},"weapons":[{"name":"talon","attack":40,"defence":40,"impact":"d8−9e","special":""},{"name":"beak","attack":44,"defence":44,"impact":"d6−8p","special":""}],"combat":{"dodge":64,"press":40,"tar":1,"shock":15,"av":{"b":-6,"e":-7,"p":-8,"f":-6},"bodyTable":"i"},"printedMovementNote":"FLY (takto vytištěno v tabulce, str. 357)"},
  {"id":"eagle","name":"Eagle","group":"wild","page":357,"size":"s","weightLb":20,"attributes":{"str":4,"end":10,"agl":10,"per":26,"aur":5,"wil":10,"rea":8,"cre":8},"move":300,"skills":{"awareness":90,"scent":3,"stealth":72,"spirit":21,"initiative":36},"weapons":[{"name":"talon","attack":50,"defence":50,"impact":"d10−5e","special":"dive"},{"name":"beak","attack":40,"defence":40,"impact":"d6−4p","special":""}],"combat":{"dodge":72,"press":50,"tar":1,"shock":28,"av":{"b":-2,"e":-3,"p":-4,"f":-2},"bodyTable":"k"},"printedMovementNote":"FLY (takto vytištěno v tabulce, str. 357)"},
  {"id":"elephant","name":"Elephant","group":"wild","page":357,"size":"h","weightLb":10000,"attributes":{"str":56,"end":48,"agl":7,"per":18,"aur":6,"wil":16,"rea":8,"cre":8},"move":90,"skills":{"awareness":85,"scent":7,"stealth":48,"spirit":33,"initiative":48},"weapons":[{"name":"tusk","attack":55,"defence":60,"impact":"d6+23p","special":"gore"},{"name":"kick","attack":44,"defence":48,"impact":"d6+20b","special":"trample"}],"combat":{"dodge":36,"press":62,"tar":4,"shock":90,"av":{"b":18,"e":17,"p":15,"f":17},"bodyTable":"j"}},
  {"id":"fox","name":"Fox","group":"wild","page":357,"size":"t","weightLb":15,"attributes":{"str":3,"end":10,"agl":15,"per":16,"aur":4,"wil":14,"rea":7,"cre":8},"move":100,"skills":{"awareness":75,"scent":4,"stealth":60,"spirit":27,"initiative":44},"weapons":[{"name":"bite","attack":75,"defence":75,"impact":"d6−6p","special":""},{"name":"claw","attack":60,"defence":60,"impact":"d8−7e","special":""}],"combat":{"dodge":60,"press":60,"tar":1,"shock":24,"av":{"b":-3,"e":-4,"p":-5,"f":-3},"bodyTable":"d"},"printedMovementNote":"FLY (takto vytištěno v tabulce, str. 357)"},
  {"id":"hawk","name":"Hawk / Falcon","group":"wild","page":357,"size":"t","weightLb":2,"attributes":{"str":2,"end":8,"agl":13,"per":24,"aur":4,"wil":8,"rea":7,"cre":7},"move":400,"skills":{"awareness":80,"scent":3,"stealth":72,"spirit":18,"initiative":32},"weapons":[{"name":"talon","attack":55,"defence":55,"impact":"d10−9e","special":"dive"},{"name":"beak","attack":44,"defence":44,"impact":"d6−8p","special":""}],"combat":{"dodge":72,"press":55,"tar":1,"shock":20,"av":{"b":-6,"e":-7,"p":-8,"f":-6},"bodyTable":"i"},"printedMovementNote":"FLY (takto vytištěno v tabulce, str. 357)"},
  {"id":"lion","name":"Lion","group":"wild","page":357,"size":"m","weightLb":130,"attributes":{"str":12,"end":13,"agl":18,"per":16,"aur":5,"wil":16,"rea":5,"cre":5},"move":160,"skills":{"awareness":85,"scent":4,"stealth":90,"spirit":30,"initiative":44},"weapons":[{"name":"claw","attack":85,"defence":85,"impact":"d8+0e","special":""},{"name":"bite","attack":68,"defence":68,"impact":"d6+1p","special":""}],"combat":{"dodge":72,"press":68,"tar":1,"shock":60,"av":{"b":3,"e":2,"p":1,"f":3},"bodyTable":"f"}},
  {"id":"snake-venom","name":"Snake (Poisonous)","group":"wild","page":357,"size":"t","weightLb":10,"attributes":{"str":4,"end":10,"agl":14,"per":10,"aur":2,"wil":8,"rea":2,"cre":2},"move":40,"skills":{"awareness":45,"scent":4,"stealth":48,"spirit":15,"initiative":20},"weapons":[{"name":"bite","attack":62,"defence":62,"impact":"d8−2p","special":"poison"}],"combat":{"dodge":44,"press":27,"tar":1,"shock":28,"av":{"b":-2,"e":0,"p":-1,"f":-2},"bodyTable":"l"}},
  {"id":"snake-constrictor","name":"Snake (Constrictor)","group":"wild","page":357,"size":"m","weightLb":150,"attributes":{"str":14,"end":12,"agl":9,"per":13,"aur":2,"wil":8,"rea":2,"cre":2},"move":30,"skills":{"awareness":55,"scent":3,"stealth":44,"spirit":15,"initiative":20},"weapons":[{"name":"bite","attack":53,"defence":53,"impact":"d8+2p","special":"clench"},{"name":"grab","attack":73,"defence":73,"impact":"d6+14 STR","special":"constrict"}],"combat":{"dodge":48,"press":33,"tar":1,"shock":52,"av":{"b":4,"e":6,"p":5,"f":4},"bodyTable":"m"}},
  {"id":"stag","name":"Stag","group":"wild","page":357,"size":"m","weightLb":400,"attributes":{"str":18,"end":13,"agl":10,"per":18,"aur":5,"wil":12,"rea":5,"cre":5},"move":140,"skills":{"awareness":75,"scent":3,"stealth":56,"spirit":24,"initiative":27},"weapons":[{"name":"gore","attack":60,"defence":60,"impact":"d6+4p","special":"gore +4p"}],"combat":{"dodge":56,"press":55,"tar":1,"shock":48,"av":{"b":3,"e":2,"p":1,"f":3},"bodyTable":"a"}},
  {"id":"wolf","name":"Wolf","group":"wild","page":357,"size":"m","weightLb":80,"attributes":{"str":10,"end":10,"agl":14,"per":17,"aur":4,"wil":13,"rea":5,"cre":5},"move":130,"skills":{"awareness":75,"scent":5,"stealth":60,"spirit":24,"initiative":36},"weapons":[{"name":"bite","attack":70,"defence":70,"impact":"d6+0p","special":"clench"}],"combat":{"dodge":60,"press":56,"tar":1,"shock":40,"av":{"b":3,"e":2,"p":1,"f":3},"bodyTable":"e"}},
]);
export const BESTIARY_SECTIONS_563=Object.freeze([
 {name:'Animals – domácí a divoká',pages:'354–357',status:'28 profilů s atributy a přirozenými útoky'},
 {name:'Elementals',pages:'358–362',status:'speciální bytosti – kompletní profily zatím nezapojeny'},
 {name:'Folk',pages:'363–368',status:'příklady tvorů a postav – kompletní profily zatím nezapojeny'},
 {name:'Gârgún',pages:'369–371',status:'speciální pravidla – kompletní profily zatím nezapojeny'},
 {name:'Ívashù',pages:'372–376',status:'speciální pravidla – kompletní profily zatím nezapojeny'},
 {name:'Môrvrin',pages:'377–384',status:'speciální pravidla – kompletní profily zatím nezapojeny'},
 {name:'Mythic Creatures',pages:'385–392',status:'draci a další – kompletní profily zatím nezapojeny'},
 {name:'Spirits',pages:'393–400',status:'astrální entity – kompletní profily zatím nezapojeny'}
]);
export const BESTIARY_SPECIAL_INDEX_563=Object.freeze([
  {"group":"Elementals","name":"Àhvisían · Air Elemental","page":360,"status":"reference-only"},
  {"group":"Elementals","name":"Ívrihn · Earth Elemental","page":361,"status":"reference-only"},
  {"group":"Elementals","name":"Sâvirìs · Aura Elemental","page":362,"status":"reference-only"},
  {"group":"Folk","name":"Human, rural examples","page":364,"status":"reference-only"},
  {"group":"Folk","name":"Human, urban examples","page":365,"status":"reference-only"},
  {"group":"Folk","name":"Sinái Forester","page":366,"status":"reference-only"},
  {"group":"Folk","name":"Kúzha Mercantyler","page":367,"status":"reference-only"},
  {"group":"Folk","name":"Kúzha Mercenary","page":367,"status":"reference-only"},
  {"group":"Folk","name":"Malák","page":368,"status":"reference-only"},
  {"group":"Gârgún","name":"Gargú-Arák · Small Orc","page":370,"status":"reference-only"},
  {"group":"Gârgún","name":"Gargú-Khánu · Great Orc","page":370,"status":"reference-only"},
  {"group":"Gârgún","name":"Gargú-Kyáni · White Orc","page":370,"status":"reference-only"},
  {"group":"Ívashù","name":"Áklash","page":373,"status":"reference-only"},
  {"group":"Ívashù","name":"Hrú","page":374,"status":"reference-only"},
  {"group":"Ívashù","name":"Umbáth","page":375,"status":"reference-only"},
  {"group":"Môrvrin","name":"Amôrvrin · Free Undead","page":379,"status":"reference-only"},
  {"group":"Môrvrin","name":"Dalmôrvrin · Lesser Undead","page":381,"status":"reference-only"},
  {"group":"Môrvrin","name":"Gùlmôrvrin · Unfree Undead","page":382,"status":"reference-only"},
  {"group":"Môrvrin","name":"Amôrvrus · example","page":383,"status":"reference-only"},
  {"group":"Môrvrin","name":"Gùlmôra · example","page":384,"status":"reference-only"},
  {"group":"Mythic Creatures","name":"Young Dragon","page":388,"status":"reference-only"},
  {"group":"Mythic Creatures","name":"Mature Dragon","page":388,"status":"reference-only"},
  {"group":"Mythic Creatures","name":"Old Dragon","page":388,"status":"reference-only"},
  {"group":"Mythic Creatures","name":"Gryphon / Griffin · Mârenu","page":390,"status":"reference-only"},
  {"group":"Mythic Creatures","name":"Unicorn · Êrmael","page":391,"status":"reference-only"},
  {"group":"Mythic Creatures","name":"Wýrè · Wyvern","page":392,"status":"reference-only"},
  {"group":"Spirits","name":"Asîr · Air Sprite","page":394,"status":"reference-only"},
  {"group":"Spirits","name":"Dâ Ânchen · Eldest Ones","page":395,"status":"reference-only"},
  {"group":"Spirits","name":"Ghost / Shade","page":396,"status":"reference-only"},
  {"group":"Spirits","name":"Gytévsha (Greater / Lesser)","page":397,"status":"reference-only"},
  {"group":"Spirits","name":"V’hîr · Agrikan Demons","page":399,"status":"reference-only"},
]);
const valid=(x,m)=>{if(!x)throw Error(m)};
export const bestiaryProfile=id=>BESTIARY_ANIMALS_563.find(x=>x.id===id)||null;
export function bestiaryForLivestock(offer){
 if(!offer)return null;
 const keys={bovine:'bovine',camel:'camel',donkey:'donkey',pony:'pony',mule:'mule',palfrey:'palfrey',courser:'courser',charger:'charger',destrier:'destrier'};
 const breed=keys[offer.breed];if(breed)return bestiaryProfile(breed);
 if(offer.name==='Dog, guard')return bestiaryProfile('guard');
 if(offer.name==='Dog, hunter')return bestiaryProfile('hunter');
 if(offer.name==='Dog, ratter')return bestiaryProfile('ratter');
 if(offer.name==='Elephant')return bestiaryProfile('elephant');
 if(offer.name==='Hawk • Falcon')return bestiaryProfile('hawk');
 return null;
}
export function newEncounterBeastProof({id,templateId,name,campaignId,campaignMinute,ownerAnimalId=null,ownerId=null}={}){
 const profile=bestiaryProfile(templateId);
 valid(profile,'Neznámý nebo nedoložený profil bestiáře.');
 valid(typeof id==='string'&&id.length>0&&id.length<=128,'Chybí identita dočasného tvora.');
 valid(typeof name==='string'&&name.trim().length>=2&&name.trim().length<=90,'Zadejte jméno tvora.');
 valid(typeof campaignId==='string'&&campaignId&&Number.isSafeInteger(campaignMinute)&&campaignMinute>=0,'Chybí herní čas střetnutí.');
 valid(ownerAnimalId===null||typeof ownerAnimalId==='string'&&ownerAnimalId.length>0,'Neplatný odkaz do stáje.');
 return {format:'hmk-bestiary-encounter-563-v1',id,templateId,name:name.trim(),campaignId,campaignMinute,ownerAnimalId,ownerId:ownerAnimalId?ownerId:null,profile:JSON.parse(JSON.stringify(profile)),kind:'encounter-creature',combatStateCreated:false,healthCreated:false,trainingAssumed:false,automaticDice:false};
}
export function encounterBeastHistory(data,campaignId){
 const out=new Map();
 for(const row of data?.journal||[]){const p=row.bestiaryEncounter;if(!p||p.campaignId!==campaignId)continue;
  if(p.action==='create')out.set(p.id,{...p,sourceJournalId:row.id,active:true});
  else if(p.action==='dismiss'&&out.has(p.id))out.get(p.id).active=false;
 }
 return [...out.values()];
}
export function validateBestiaryJournal(data){
 const seen=new Map(),dismissed=new Set(),stable=new Map();
 for(const owner of [...(data?.characters||[]),...(data?.trash||[])])for(const a of owner.hmk?.livestock||[])stable.set(a.id,{...a,ownerId:owner.id});
 for(const row of data?.journal||[]){const p=row.bestiaryEncounter;if(!p)continue;
  valid(p.format==='hmk-bestiary-encounter-563-v1'&&['create','dismiss'].includes(p.action)&&typeof p.id==='string','Neplatná událost bestiáře.');
  if(p.action==='create'){valid(!seen.has(p.id),'Duplicitní identita tvora bestiáře.');
   const expected=newEncounterBeastProof({id:p.id,templateId:p.templateId,name:p.name,campaignId:p.campaignId,campaignMinute:p.campaignMinute,ownerAnimalId:p.ownerAnimalId,ownerId:p.ownerId});
   valid(JSON.stringify(p)===JSON.stringify({...expected,action:'create'}),'Pozměněný profil tvora oproti referenčním tabulkám HMK.');
   if(p.ownerAnimalId){const animal=stable.get(p.ownerAnimalId);valid(animal&&animal.ownerId===p.ownerId&&animal.campaignId===p.campaignId,'Chybí doložené zakoupené zvíře.');
    const offer=livestockMatcher(animal.beastId);valid(offer&&offer===p.templateId,'Záznam stáje se neshoduje s druhem v bestiáři.');}
   valid(row.calendarCampaignId===p.campaignId&&row.campaignMinute===p.campaignMinute&&row.title==='Bestiář · příchod do encounteru: '+p.name,'Dočasný tvor nemá správný herní čas nebo jednoznačný titul dokladu.');
   seen.set(p.id,p);
  }else{const orig=seen.get(p.id);valid(orig&&orig.campaignId===p.campaignId&&!dismissed.has(p.id)&&Object.keys(p).length===4,'Neplatné ukončení dočasného tvora.');dismissed.add(p.id);}
 }return true;
}
// Only stable identity/source matching; no health/skill claims. Original beast offer identifiers from HMK p.122.
const livestockIds={
 'hmk-p122-beast-01':'bovine','hmk-p122-beast-02':'camel','hmk-p122-beast-03':'guard','hmk-p122-beast-04':'hunter','hmk-p122-beast-05':'ratter',
 'hmk-p122-beast-06':'donkey','hmk-p122-beast-07':'elephant','hmk-p122-beast-08':'hawk','hmk-p122-beast-09':'mule',
 'hmk-p122-beast-10':'palfrey','hmk-p122-beast-11':'palfrey','hmk-p122-beast-12':'palfrey','hmk-p122-beast-13':'courser',
 'hmk-p122-beast-14':'charger','hmk-p122-beast-15':'destrier','hmk-p122-beast-16':'pony'
};
export const livestockMatcher=id=>livestockIds[id]||null;
export function validateLivestockTrainingRefs(data){
 const owned=new Map();
 for(const c of [...(data?.characters||[]),...(data?.trash||[])])for(const a of c.hmk?.livestock||[])owned.set(a.id,{...a,ownerId:c.id});
 for(const row of data?.journal||[]){const x=row.livestockTraining;if(!x)continue;
  const a=owned.get(x.animalId),source=livestockMatcher(a?.beastId),template=bestiaryProfile(source),p=row.skillTestProof;
  valid(a&&template&&row.calendarCampaignId===a.campaignId&&
   x.ownerId===a.ownerId&&x.beastId===a.beastId&&x.name===a.name&&
   x.reasoning===template.attributes.rea&&x.creativity===template.attributes.cre&&
   p?.type==='animal-training'&&p.animalName===a.name&&p.reasoning===x.reasoning&&p.creativity===x.creativity&&
   row.characterId===p.actorId&&Number.isSafeInteger(row.campaignMinute)&&row.campaignMinute>=a.minute&&
   Object.keys(x).sort().join(',')==='animalId,beastId,creativity,name,ownerId,reasoning',
   'Animalcraft: výcvik nemá ověřenou identitu zakoupeného zvířete nebo se neshodují atributy.');
 }
 return true;
}
export function assertBestiaryAppendOnly(before,after){
 const prev=(before.journal||[]).filter(x=>x.bestiaryEncounter).map(x=>JSON.stringify(x));
 const now=(after.journal||[]).filter(x=>x.bestiaryEncounter).map(x=>JSON.stringify(x));
 valid(prev.length<=now.length&&prev.every((x,i)=>x===now[i]),'Historii dočasných tvorů nelze změnit ani smazat.');
 return true;
}
