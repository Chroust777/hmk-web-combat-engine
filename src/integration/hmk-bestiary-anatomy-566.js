/** HMK 1.2, pp. 352, 355, 357. Transcribed ZN/LN location grids a–m.
 * Anatomical shock numbers are not Injury levels. Bleeding/amputation symbols
 * require separate verification: this module never invents them.
 * All results are previews; no wounds, time or game state are mutated.
 */
import {injuryFromEffectiveImpact} from '../rules/injury.js';

const S = (zones,locations)=>({zones,locations});
// Row: [ZN first, ZN last, LN first, LN last, printed location, SHK]
const GRIDS = {
 a:[[1,2,1,4,'hd',5],[1,2,5,10,'nk',5],[3,3,1,10,'flg',2],[4,7,1,6,'flk',4],[4,7,7,10,'ab',4],[8,10,1,5,'qtr',3],[8,10,6,9,'hlg',2],[8,10,10,10,'tl',1]],
 b:[[1,3,1,4,'hd',5],[1,3,5,10,'nk',5],[4,5,1,10,'flg',2],[6,12,1,6,'flk',4],[6,12,7,10,'ab',4],[13,16,1,5,'qtr',3],[13,16,6,9,'hlg',2],[13,16,10,10,'tl',1]],
 c:[[1,4,1,4,'hd',5],[1,4,5,10,'nk',5],[5,6,1,10,'flg',2],[7,14,1,6,'flk',4],[7,14,7,10,'ab',4],[15,20,1,5,'qtr',3],[15,20,6,9,'hlg',2],[15,20,10,10,'tl',1]],
 d:[[1,1,1,3,'hd',5],[1,1,4,5,'nk',5],[1,1,6,10,'flg',2],[2,2,1,5,'tx',4],[2,2,6,8,'ab',4],[2,2,9,10,'pv',4],[3,3,1,5,'hlg',2],[3,3,6,10,'tl',1]],
 e:[[1,2,1,3,'hd',5],[1,2,4,5,'nk',5],[1,2,6,10,'flg',2],[3,4,1,5,'tx',4],[3,4,6,8,'ab',4],[3,4,9,10,'pv',4],[5,6,1,5,'hlg',2],[5,6,6,10,'tl',1]],
 f:[[1,2,1,6,'hd',5],[1,2,7,10,'nk',5],[3,4,1,10,'flg',2],[5,8,1,5,'tx',4],[5,8,6,8,'ab',4],[5,8,9,10,'pv',4],[9,10,1,9,'hlg',2],[9,10,10,10,'tl',1]],
 g:[[1,3,1,6,'hd',5],[1,3,7,10,'nk',5],[4,6,1,10,'flg',2],[7,12,1,5,'tx',4],[7,12,6,8,'ab',4],[7,12,9,10,'pv',4],[13,16,1,9,'hlg',2],[13,16,10,10,'tl',1]],
 h:[[1,4,1,6,'hd',5],[1,4,7,10,'nk',5],[5,8,1,10,'flg',2],[9,16,1,5,'tx',4],[9,16,6,8,'ab',4],[9,16,9,10,'pv',4],[17,20,1,9,'hlg',2],[17,20,10,10,'tl',1]],
 i:[[1,1,1,3,'hd',5],[1,1,4,5,'nk',5],[1,1,6,10,'wng',1],[2,2,1,6,'tx',4],[2,2,7,10,'ab',4],[3,3,1,5,'wng',1],[3,3,6,8,'leg',2],[3,3,9,10,'tl',1]],
 j:[[1,7,1,6,'hd',5],[1,7,7,8,'ear',1],[1,7,9,10,'nk',5],[8,10,1,10,'trn',2],[11,16,1,10,'flg',2],[17,34,1,6,'tx',4],[17,34,7,8,'ab',4],[17,34,9,10,'pv',4],[35,40,1,5,'qtr',3],[35,40,6,9,'hlg',2],[35,40,10,10,'tl',1]],
 k:[[1,1,1,4,'hd',5],[1,1,5,10,'nk',5],[2,2,1,10,'wng',1],[3,4,1,6,'tx',4],[3,4,7,10,'ab',4],[5,5,1,10,'wng',1],[6,6,1,5,'leg',2],[6,6,6,10,'tl',1]],
 l:[[1,1,1,4,'hd',5],[1,1,5,10,'nk',5],[2,4,1,10,'tx',4],[5,6,1,6,'ab',4],[5,6,7,10,'tl',1]],
 m:[[1,3,1,4,'hd',5],[1,3,5,10,'nk',5],[4,14,1,10,'tx',4],[15,20,1,6,'ab',4],[15,20,7,10,'tl',1]]
};
const names={hd:'Head',nk:'Neck',flg:'Foreleg',flk:'Flank',ab:'Abdomen',qtr:'Quarter',hlg:'Hind Leg',tl:'Tail',tx:'Thorax',pv:'Pelvis',wng:'Wing',leg:'Leg',trn:'Trunk',ear:'Ear'};
export const ANIMAL_ANATOMIES_566 = Object.freeze(Object.fromEntries(Object.entries(GRIDS).map(([id,rows])=>{
 const maxZN=Math.max(...rows.map(r=>r[1]));
 const table=rows.map(([znMin,znMax,lnMin,lnMax,id,shock])=>Object.freeze({znMin,znMax,lnMin,lnMax,id,name:names[id],shock}));
 return [id,Object.freeze({id,sourcePage:'abcdefghijklm'.indexOf(id)<5?355:357,maxZN,rows:Object.freeze(table)})];
})));
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(`${label}: nutné celé číslo ${min}–${max}`);return value;}
export function animalAnatomyTable566(letter){return ANIMAL_ANATOMIES_566[String(letter||'').toLowerCase()]||null;}
export function animalLocation566({table,zoneNumber,locationD10}={}){
 const anatomy=animalAnatomyTable566(table);if(!anatomy)throw Error('Druh nemá ověřenou zásahovou anatomii a–m.');
 integer(zoneNumber,1,anatomy.maxZN,'Zone Number');integer(locationD10,1,10,'Location d10');
 const matches=anatomy.rows.filter(r=>zoneNumber>=r.znMin&&zoneNumber<=r.znMax&&locationD10>=r.lnMin&&locationD10<=r.lnMax);
 if(matches.length!==1)throw Error('Nekonzistentní přepis tabulky zásahu.');
 const row=matches[0];return {table:anatomy.id,sourcePage:anatomy.sourcePage,zn:zoneNumber,ld:locationD10,
  id:row.id,name:row.name,locationShock:row.shock,zoneId:row.znMin+'–'+row.znMax,
  side:'L/R u párových částí určí sudost skutečného Location Die nebo GM dle HMK str. 352',
  specialEffects:'Krvácení, amputační značky a zvláštní anatomické efekty vyžadují samostatné ověření.'};
}
// Exactly printed first/second natural weapon RCH and Zone Die, HMK pp.355,357.
// d1/d6 means special printed notation and is NOT treated as an ordinary one-face die.
const weaponDie={
 bovine:[['d8','2']],camel:[['d8','3T'],['d4','2']],cat:[['1','0'],['1/d6','0']],
 ratter:[['1/d6','0']],hunter:[['1','1']],guard:[['1','1']],
 donkey:[['d6','3T'],['d3','2']],pony:[['d6','3T'],['d3','2']],mule:[['d8','3T'],['d4','2']],
 palfrey:[['d8','3T'],['d4','2']],courser:[['d8','3T'],['d4','2']],charger:[['d8','3T'],['d4','2']],destrier:[['d8','3T'],['d4','2']],
 ram:[['d2','0'],['d4','2']],
 'bear-grey':[['d2','1'],['d4','2']],'bear-lythian':[['d3','2'],['d6','3']],'bear-kyani':[['d4','3'],['d8','4']],
 boar:[['d4','0'],['d6','1']],crow:[['1','0'],['1/d6','0']],eagle:[['d2','0'],['1','0']],
 elephant:[['d12','6'],['d24','5']],fox:[['1/d6','0'],['1','0']],hawk:[['1','0'],['1/d6','0']],
 lion:[['d2','0'],['1','1']],'snake-venom':[['1/d6','1']],'snake-constrictor':[['d2','3'],['d6','0']],
 stag:[['d4','1']],wolf:[['1','0']]
};
export const ANIMAL_WEAPON_DICE_566=Object.freeze(Object.fromEntries(Object.entries(weaponDie).map(([id,items])=>[id,items.map(([zd,rch])=>Object.freeze({zd,rch}))])));
export function creatureAnatomyReadiness566(profile){
 const table=animalAnatomyTable566(profile?.combat?.bodyTable);
 return {ready:!!table,table:table?.id??null,maxZN:table?.maxZN??null,sourcePage:table?.sourcePage??null,reason:table?'Zónová tabulka ZN/LN a SHK ověřena.': 'Druhová anatomie zatím není strojově zpracována.'};
}
const attackExpr=/^d(4|6|8|10|12|20|24)([+\-−])(\d+)([bepf])$/i;
export function parsePrintedNaturalImpact566(impact){
 const t=String(impact||'').replace(/\s+/g,'').match(attackExpr);
 if(!t)return null;return {sides:Number(t[1]),modifier:(t[2]==='+'?1:-1)*Number(t[3]),aspect:t[4].toLowerCase()};
}
/** Preview a confirmed contact's effect on an anatomically resolved animal.
 * Does NOT assume Aim legality, dice rolled, Impact TA assignment, rigid armour,
 * Bleeding, Amputation, Compound Injuries, or a Shock outcome.
 */
export function previewAnimalContact566({attackerProfile,defenderProfile,weaponIndex=0,aimZN,zdRoll,locationD10,impactDieRoll,extraImpact=0,aimConfirmed=false}={}){
 if(!aimConfirmed)throw Error('Nejdříve GM ověří legální Aim/Reach, typ akce a skutečný zásah.');
 const attackerId=attackerProfile?.id,attacks=attackerProfile?.weapons||[];
 integer(weaponIndex,0,Math.max(0,attacks.length-1),'Zbraň');
 const weapon=attacks[weaponIndex],zd=ANIMAL_WEAPON_DICE_566[attackerId]?.[weaponIndex];
 if(!weapon||!zd)throw Error('Útočník nemá ověřenou přirozenou zbraň s určeným ZD.');
 const printed=parsePrintedNaturalImpact566(weapon.impact);
 if(!printed)throw Error('Impact této akce není jednoznačný typ dX±Y b/e/p/f; speciální STR útok vyžaduje vlastní postup.');
 const anatomy=creatureAnatomyReadiness566(defenderProfile);
 if(!anatomy.ready)throw Error('Zvolený obránce nemá strojově doloženou zásahovou anatomii.');
 integer(impactDieRoll,1,printed.sides,'Impact Die');integer(extraImpact,-200,200,'Doložený přídavný Impact');
 integer(aimZN,1,anatomy.maxZN,'Aim ZN');
 if(zd.zd==='1/d6')throw Error('Druh má zvláštní Zone Die 1/d6; vyžaduje samostatné druhové pravidlo.');
 const maxZone=zd.zd==='1'?1:Number(zd.zd.slice(1));
 integer(zdRoll,1,maxZone,'Zone Die');
 const actualZN=aimZN+zdRoll-1;
 if(actualZN>anatomy.maxZN)return {format:'hmk-animal-contact-566',miss:true,aimZN,zdRoll,actualZN,maxZN:anatomy.maxZN,defender: defenderProfile.name||null};
 const loc=animalLocation566({table:anatomy.table,zoneNumber:actualZN,locationD10});
 const av=defenderProfile.combat?.av?.[printed.aspect];
 if(!Number.isSafeInteger(av))throw Error('Obránce nemá doloženou ochranu pro daný druh zásahu.');
 const strikeImpact=impactDieRoll+printed.modifier+extraImpact,effectiveImpact=strikeImpact-av;
 const basic=injuryFromEffectiveImpact({effectiveImpact,aspect:printed.aspect,rigidArmour:false});
 return {format:'hmk-animal-contact-566',miss:false,attacker:attackerProfile.name,defender:defenderProfile.name,
  weapon:weapon.name,printedImpact:weapon.impact,zoneDie:zd.zd,reach:zd.rch,
  impactDieRoll,extraImpact,impactModifier:printed.modifier,aspect:printed.aspect,aimZN,zdRoll,actualZN,
  locationD10,location:loc,armourValue:av,strikeImpact,effectiveImpact,
  preliminaryInjury:basic.injury?{...basic.injury}:null,preliminaryShock:basic.injuryShock,
  unresolved:['Kryt, TA/varianty Impact, tvrdost a specifická ochrana','Compound/Bleeding/Amputation podle symbolů lokality','Skutečný Shock test, zvláštní efekty a výsledný zdravotní stav'],
  readOnly:true,persisted:false};
}
