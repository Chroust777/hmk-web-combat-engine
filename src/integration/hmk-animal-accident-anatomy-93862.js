/** v93.862 · HMK pp.148, 166–170, 352, 355, 357.
 * Source-derived accident localisation for every Stable animal. The p148
 * unexpected falling accident retains the existing d10 ZD / d10 LD; a zone
 * outside the creature's chart is a genuine miss, never a reroll. This is a
 * pure preview only; no rolls, clock changes, wounds, or history are created.
 */
import {bestiaryProfile} from './hmk-bestiary-563.js';
import {animalAnatomyTable566,animalLocation566} from './hmk-bestiary-anatomy-566.js';
import {injuryFromEffectiveImpact,compoundCompatible} from '../rules/injury.js';
const isD=(n,max)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
const need=(v,t)=>{if(!v)throw Error(t)};
const paired=new Set(['flg','hlg','wng','leg','ear']);
export function previewStableAnimalAccident93862({actor,state,impactDie,zoneD10,locationD10,agilitySL='F'}={}){
 const breed=actor?.hmk?.verifiedMountedBreed,profile=bestiaryProfile(breed);
 const anatomy=animalAnatomyTable566(profile?.combat?.bodyTable);
 need(profile&&anatomy&&Number.isSafeInteger(profile.combat?.av?.b)&&Number.isSafeInteger(profile.combat?.shock),
  'Zvíře nemá ověřenou tištěnou anatomii / přirozené Blunt AV / Shock ML HMK 355–357');
 need(isD(impactDie,6)&&isD(zoneD10,10)&&isD(locationD10,10)&&['F','CF'].includes(agilitySL),
  'Accident vyžaduje původní fyzické hody Impact d6, ZD d10, LD d10 a Agility F/CF');
 need(state?.format==='hmk-character-health-v1','Chybí živý zdravotní stav zvířete ze Stáje');
 const strikeImpact=impactDie+4+(agilitySL==='CF'?5:0),av=profile.combat.av.b,
  effectiveImpact=strikeImpact-av,base=injuryFromEffectiveImpact({effectiveImpact,aspect:'blunt',rigidArmour:false});
 const details={format:'hmk-stable-animal-accident-preview-93862',breed,bodyTable:anatomy.id.toUpperCase(),
  sourcePage:anatomy.sourcePage,maxZN:anatomy.maxZN,zoneDieFaces:10,zoneD10,locationD10,
  strikeImpact,naturalBluntAV:av,effectiveImpact,printedShockML:profile.combat.shock,agilitySL};
 if(zoneD10>anatomy.maxZN)return {...details,miss:true,location:null,side:null,requiresShock:false,
  requiresCompound:false,injury:null,reason:'Fyzický ZD d10 minul malé zvíře; bez opakování hodu a bez zranění'};
 const loc=animalLocation566({table:anatomy.id,zoneNumber:zoneD10,locationD10}),
  side=paired.has(loc.id)?(locationD10%2?'left':'right'):null;
 const older=(state.wounds||[]).filter(w=>!w.healed&&w.location===loc.id);
 need(!base.injury||side===null||older.every(w=>w.side==='left'||w.side==='right'),
  'Existující rána párové zvířecí lokace nemá doloženou stranu; potvrzení GM je nutné');
 const compatible=base.injury?older.filter(w=>(side===null||w.side===side)&&compoundCompatible(w,
  {location:loc.id,aspect:'blunt',area:false})):[];
 return {...details,miss:false,location:loc.id,locationShock:loc.locationShock,side,
  injury:base.injury,requiresShock:effectiveImpact>0,
  requiresCompound:!!base.injury&&compatible.length>0,compatibleExistingWoundIds:compatible.map(x=>x.id)};
}
