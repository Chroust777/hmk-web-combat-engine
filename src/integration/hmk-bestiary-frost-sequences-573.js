/** HMK 1.2 pp. 149, 167-169, 185, 244 & 261.
 * Animal Frost from (1) all confirmed exposed sites of one freezing-air watch,
 * (2) physical Area Frost from Odívshè Breath (option 8), and
 * (3) Cold Elemental Bolt (one hit location). No copied book images.
 * Dice are supplied as actual results. Unrecorded spellfire/GM targeting is
 * always certified, never fabricated; no unprinted movement formula is used.
 */
import {animalAnatomyTable566,animalLocation566} from './hmk-bestiary-anatomy-566.js';
import {frostAmputationSite571} from './hmk-bestiary-frost-571.js';
import {resolveBeastFrostbite572} from './hmk-bestiary-frostbite-572.js';
import {evaluateTrekkingWeatherRoll} from './hmk-trekking-weather-roll.js';
import {successLevel,SL} from '../rules/tests.js';
import {calculateShockState,applyShockState} from '../rules/shock.js';
import {injuryFromEffectiveImpact} from '../rules/injury.js';
const requireProof=(ok,msg)=>{if(!ok)throw Error(msg)};
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const label=Object.fromEntries(Object.entries(SL).map(([a,b])=>[b,a]));
const PAIRS=new Set(['flg','hlg','leg','wng','ear']);
export const FROST_SEQUENCE_573='hmk-animal-frost-sequence-573-v1';

function locFor(profile,locationId,side='none'){
 const anatomy=animalAnatomyTable566(profile?.combat?.bodyTable);
 requireProof(anatomy,'Druh nemá doloženou zvířecí anatomii a–m.');
 const row=anatomy.rows.find(x=>x.id===locationId);
 requireProof(row,'Tato lokace není v tištěné anatomii daného druhu.');
 requireProof(PAIRS.has(locationId)?['left','right'].includes(side):side==='none',
  'U párové lokality je nutné označit levou/pravou stranu; u nepárové ne.');
 return {table:anatomy.id,sourcePage:anatomy.sourcePage,id:row.id,name:row.name,
  locationShock:row.shock,zoneId:'exposure',side,area:false};
}
const siteKey=x=>x.location.id+'|'+x.side;
function buildSites({profile,previous,sites,minute,eventId,injuryFor,areaAttack=false,boltLocationShock=null}){
 requireProof(Array.isArray(sites)&&sites.length>=1&&sites.length<=32,'Zadej kompletní přehled skutečně vystavených míst (max. 32).');
 const seen=new Set(),out=[];let after=previous.shock;
 const ml=profile.combat?.shock;
 requireProof(int(ml,1,300),'Chybí druhová Shock ML.');
 for(let ix=0;ix<sites.length;ix++){
  const input=sites[ix];const loc=locFor(profile,input.locationId,input.side||'none');
  if(areaAttack){loc.locationShock=6;loc.area=true;loc.zoneId='area';}
  if(boltLocationShock!==null){
   requireProof(int(boltLocationShock,1,20),'Cold Bolt postrádá tištěnou Shock hodnotu lokality.');
   loc.locationShock=boltLocationShock;loc.area=false;loc.zoneId='bolt';
  }
  const key=siteKey({location:loc,side:loc.side});
  requireProof(!seen.has(key),'Duplicitní stejná strana anatomické lokality.');seen.add(key);
  const injury=injuryFor(input),level=injury.level;
  requireProof(int(level,0,5),'Frost IL není doložena nebo přesahuje G5.');
  requireProof(!previous.wounds.some(w=>!w.healed&&w.location===loc.id&&(!PAIRS.has(loc.id)||!w.siteSide||w.siteSide===loc.side)),
   'V některé lokalitě už je aktivní rána: Compound Area Injury potřebuje samostatné ověření.');
  let shock=null;
  if(level>0){
   requireProof(int(input.shockRoll,1,100)&&int(input.fatigue,0,300)&&input.fatigue%5===0,
    'Každá zraněná lokace vyžaduje skutečný Shock d100 a doloženou Fatigue.');
   const eml=ml-input.fatigue,sl=successLevel(input.shockRoll,eml);
   const idx=calculateShockState({locationShock:loc.locationShock,injuryShock:level,shockSL:sl});
   after=applyShockState(after,idx.state);
   shock={ml,eml,fatigue:input.fatigue,roll:input.shockRoll,sl:label[sl],
    index:idx.index,incoming:idx.state,after};
  }else requireProof(input.shockRoll===null&&input.fatigue===null,
   'Bez Frost Injury se nehází Shock na danou lokaci.');
  const frostSite=frostAmputationSite571({location:loc});
  if(PAIRS.has(loc.id))frostSite.side=loc.side;
  out.push({woundId:eventId+':'+ix,location:loc,side:loc.side,
   level,site:frostSite,shock,proof:injury.proof||null,grimDueMinute:level>=4?minute+1440:null});
 }
 requireProof(out.some(x=>x.level>0),'Nevzniká žádná Frost rána; nevytvářej umělý zdravotní zápis.');
 return {sites:out,shockAfter:after};
}
function weatherSource({source,profile,ownerAnimalId,campaignId,minute,hazard}){
 requireProof(source?.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1'&&
  source.calendarCampaignId===campaignId&&source.campaignMinute<=minute&&
  minute<=source.campaignMinute+240&&
  source.calendarTrekProof.weatherWatch?.hazard==='cold'&&
  source.calendarTrekProof.weatherWatch.requiresWeatherHazardRoll===true&&
  typeof ownerAnimalId==='string'&&ownerAnimalId.length>0&&
  source.calendarTrekProof.partyModes?.animals?.some(x=>x.id===ownerAnimalId),
  'Zvolená Cold hlídka neobsahuje konkrétní vlastněné zvíře a doložený Cold Hazard.');
 requireProof(int(hazard?.endEML,1,300)&&int(hazard?.endD100,1,100),
  'Vyžaduje doložené Endurance (Survival) EML a skutečný d100.');
 const w=source.calendarTrekProof.weatherWatch;
 const base=evaluateTrekkingWeatherRoll({kind:'cold',areaAV:Math.max(0,profile.combat.av.f),
  gearAV:hazard.gearAV,shelterAV:hazard.shelterAV,fireFS:hazard.fireFS,
  continuousSleet:w.precipitation==='sleet'&&w.continuous===true,
  roll:hazard.roll,origin:'manual'});
 requireProof(base.exposed&&label[successLevel(hazard.endD100,hazard.endEML)]==='CF',
  'Frostbite HMK 185 navazuje na skutečně exponovaný Cold Hazard s kritickým neúspěchem Endurance.');
 return {watchSourceId:source.id,watchMinute:source.campaignMinute,hazard:base,
  endEML:hazard.endEML,endD100:hazard.endD100,endSL:'CF',ownerAnimalId};
}
function common({profile,previous,campaignId,minute,eventId,gmConfirmed}){
 requireProof(profile?.combat&&previous?.shock==='none'&&!previous.extendedShock?.active&&!previous.coma?.active&&
  !previous.wounds.some(x=>x.bleeding),'Nejdříve uzavři existující Shock, Coma a Bleeding.');
 requireProof(gmConfirmed===true&&typeof eventId==='string'&&eventId.length>=4&&
  typeof campaignId==='string'&&campaignId&&int(minute,0,1e10),'Vyžadováno GM potvrzení, čas kampaně a ID události.');
}
export function prepareAnimalFrostSequence573({profile,previous,campaignId,minute,eventId,
 origin,sites,windD20=null,durationD20=null,watchSource=null,ownerAnimalId=null,hazard=null,
 magic=null,allExposedConfirmed=false,gmConfirmed=false}={}){
 common({profile,previous,campaignId,minute,eventId,gmConfirmed});
 requireProof(['weather-watch','breath','cold-bolt'].includes(origin),'Neplatný zdroj Frost.');
 const innateAV=profile.combat.av.f;
 requireProof(int(innateAV,-100,100),'Chybí tištěná ochrana Frost.');
 let source=null,impact=null,boltLocationShock=null;
 if(origin==='weather-watch'){
  requireProof(allExposedConfirmed===true,'GM musí potvrdit, že soupis obsahuje VŠECHNY exponované lokality včetně stran.');
  source=weatherSource({source:watchSource,profile,ownerAnimalId,campaignId,minute,hazard});
 }else{
  requireProof(magic?.spellfireConfirmed===true&&magic?.targetAffectedConfirmed===true,
   'GM musí doložit úspěšné spellfire/talent a skutečný zasažený cíl.');
  requireProof(int(magic.d4,1,4)&&int(magic.index,1,30)&&typeof magic.cs==='boolean',
   'Cold Bolt / Breath vyžaduje skutečný d4, potvrzený Index a CS.');
  if(origin==='breath'){
   requireProof(magic.physicalOption8===true&&['front','back'].includes(magic.position)&&
    allExposedConfirmed===true,'Breath p.244: vyžaduje doloženou fyzickou variantu 8 a přední/zadní polovinu kužele.');
   impact=magic.d4+(magic.position==='front'?magic.index:Math.floor(magic.index/2));
  }else{
   requireProof(sites?.length===1,'Cold Elemental Bolt p.261 zasahuje jednu, nikoli všechny lokality.');
   requireProof(int(magic.zoneNumber,1,animalAnatomyTable566(profile.combat.bodyTable)?.maxZN||0)&&
    int(magic.locationD10,1,10),'Cold Bolt p.261: volená ZN a skutečný Location d10.');
   const hit=animalLocation566({table:profile.combat.bodyTable,zoneNumber:magic.zoneNumber,locationD10:magic.locationD10});
   requireProof(sites[0].locationId===hit.id,'Cold Bolt musí odpovídat skutečně zasažené lokaci.');
   requireProof(PAIRS.has(hit.id)?sites[0].side===(hit.ld%2?'left':'right'):
    (sites[0].side||'none')==='none',
    'Cold Bolt musí zachovat stranu zásahu podle skutečného Location d10.');
   boltLocationShock=hit.locationShock;
   impact=magic.d4+magic.index+(magic.cs?5:0);
  }
  requireProof(int(magic.areaAV,Math.max(0,innateAV),100),'Frost Area AV / lokalizovaná ochrana nesmí být nižší než tištěná přirozená ochrana.');
  source={magic:{spell:origin==='breath'?'Odívshè Breath VIII':'Elemental Cold Bolt',
   d4:magic.d4,index:magic.index,cs:magic.cs,impact,areaAV:magic.areaAV,
   ...(origin==='breath'?{position:magic.position,physicalOption8:true}:{zoneNumber:magic.zoneNumber,locationD10:magic.locationD10}),
   spellfireConfirmed:true,targetAffectedConfirmed:true},sourcePage:origin==='breath'?244:261};
 }
 const perSite=(input)=>{
  if(origin==='weather-watch'){
   requireProof(int(input.av,Math.max(0,innateAV),100),'AV každé exponované lokality musí zahrnovat tištěnou Frost ochranu.');
   const r=resolveBeastFrostbite572({windD20,durationD20,locationAV:input.av,innateAV,
    freezingAirConfirmed:true,siteExposedConfirmed:true});
   return {level:r.injuryLevel,proof:{av:input.av,period:r.periodMinutes,duration:r.durationMinutes}};
  }
  requireProof(int(input.av,Math.max(0,innateAV),100)&&
   (origin==='breath'||input.av===magic.areaAV),
   'Magický Frost vyžaduje ověřené skutečné AV konkrétní lokality (Bolt: právě jedinou AV).');
  const result=injuryFromEffectiveImpact({effectiveImpact:impact-input.av,aspect:'f',rigidArmour:false});
  return {level:result.injury?.level||0,proof:{strikeImpact:impact,armourValue:input.av,effectiveImpact:impact-input.av}};
 };
 const computed=buildSites({profile,previous,sites,minute,eventId,injuryFor:perSite,areaAttack:origin==='breath',boltLocationShock});
 return {format:'hmk-bestiary-trauma-567-v1',kind:'frost-sequence-573',targetId:profile.id,
  campaignId,minute,origin,source,
  ...(origin==='weather-watch'?{windD20,durationD20,allExposedConfirmed:true}:{}),
  ...(origin==='breath'?{allExposedConfirmed:true}:{}),
  sites:computed.sites,shockAfter:computed.shockAfter,
  sourcePages:origin==='weather-watch'?[149,168,169,185]:origin==='breath'?[167,168,169,244]:[167,168,169,261]};
}
/** Stable animal movement rulings are GM values, NOT an HMK-derived speed
 * penalty. Ties the ruling to the exact set of permanently lost body parts;
 * any later amputation invalidates it without rewriting older evidence. */
export function lossFingerprint573(health){
 return (health?.wounds||[]).filter(w=>w.amputation?.severed)
  .map(w=>w.id+'@'+w.location+'@'+(w.amputation.side||'none')).sort().join('|');
}
export function prepareAnimalMobilityRuling573({profile,previous,campaignId,minute,eventId,
 travelAllowed=false,adjustedMove=0,attackIndices=[],gmConfirmed=false,reason=''}={}){
 const losses=lossFingerprint573(previous);requireProof(losses.length,'Bez amputace není potřeba výjimka GM.');
 requireProof(previous.shock!=='killed','Mrtvé zvíře nelze rozhodnutím GM vrátit k pohybu.');
 requireProof(gmConfirmed===true&&int(minute,0,1e10)&&typeof eventId==='string'&&eventId.length>=4,
  'Chybí potvrzený GM záznam a jeho identita.');
 const natural=profile?.move??profile?.combat?.move??profile?.attributes?.move;
 requireProof(int(natural,0,200),'Tištěná Move není doložená; postup vyžaduje samostatné rozhodnutí GM.');
 requireProof(typeof travelAllowed==='boolean'&&int(adjustedMove,0,natural)&&(!travelAllowed||adjustedMove>=1),
  'GM musí určit fyzicky možný Move v mezích 0 až původní Move; 0 znamená nemožnost cestovat.');
 requireProof(Array.isArray(attackIndices)&&attackIndices.length<=20&&attackIndices.every((n,i)=>
  int(n,0,(profile?.weapons?.length||0)-1)&&(i===0||attackIndices[i-1]<n)),
  'Povolené přirozené útoky musí být unikátní platné vzestupné indexy z profilu.');
 requireProof(typeof reason==='string'&&reason.trim().length>=8&&reason.trim().length<=300,
  'Uveď zdůvodnění GM (8–300 znaků).');
 const wingLost=(previous.wounds||[]).some(w=>w.amputation?.severed&&w.location==='wng');
 return {format:'hmk-bestiary-trauma-567-v1',kind:'mobility-ruling-573',targetId:profile.id,
  campaignId,minute,lossFingerprint:losses,printedMove:natural,travelAllowed,
  adjustedMove,flightProhibited:wingLost,groundOnly:wingLost,
  attackIndices:[...attackIndices],reason:reason.trim(),sourcePages:[168,170,178,355,357]};
}
export function latestMobilityRuling573(health){
 const fingerprint=lossFingerprint573(health);
 if(!fingerprint)return null;
 return (health?.records||[]).map(x=>x.bestiaryTrauma)
  .filter(x=>x?.kind==='mobility-ruling-573'&&x.lossFingerprint===fingerprint).at(-1)||null;
}
