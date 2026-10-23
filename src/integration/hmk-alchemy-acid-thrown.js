/** HârnMaster v1.2 pp.110, 163–164, 269–271.
 * An actual 4 oz Glass Vial thrown object is a HEFT 6, BR60, VM×2,
 * PB ZD d6, −10 Throwing attack; it is NOT a weapon with impact on shatter.
 * A splash covers a 6-inch DIAMETER circle, at most one human body location.
 * This resolver stages throw + impact location without faking dice, damage,
 * initiative-turn consumption, or separate inventory/health ownership.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {resolveHMKMissileAttack} from './hmk-missile-combat.js';
import {calculateMissileEML,missileRange,grenadeDeviation as canonicalGrenadeDeviation} from '../rules/missile.js';
import {successLevel,SL} from '../rules/tests.js';
import {humanLocation} from './hmk-mounted-fall-injury-join.js';
export const ACID_THROW_FORMAT='hmk-acid-thrown-vial-v1';
const ok=(yes,msg)=>{if(!yes)throw Error('Acid Thrown: '+msg);};
const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const origin=o=>['manual','cryptographic-software-die'].includes(o);
const ranges=[[5,0,0,0],[15,1,0,0],[30,2,1,0],[60,3,2,1],[90,4,3,2],[120,6,4,3]];
const slName=['CF','F','S','CS'];
const splashedTargetKind=['ground','flesh','armour','weapon','object'];
function grenadeDeviation(distance,sl,die){
 const band=ranges.find(x=>distance<=x[0]);ok(band,'cíl granátu je mimo 120ft dostřel');
 if(sl===SL.CF)return {distanceUnits:null,dieSides:null,deviationD8:null};
 const spec=band[sl===SL.F?1:sl===SL.S?2:3];
 if(spec===0){ok(die===null,'nulová odchylka: další hod není dovolen');return {distanceUnits:0,dieSides:null};}
 if(spec===1){ok(die===null,'pevná odchylka jedné jednotky: d2 se nehází');return {distanceUnits:1,dieSides:null};}
 ok(int(die,1,spec),'povinný skutečný hod d'+spec+' pro odchylku');
 return {distanceUnits:die,dieSides:spec};
}
export function createAcidThrownVial({journal=[],inventory=[],campaignId,minute,actorId,finishId,
 aimType='direct',distanceFt,throwingML,d100,rollOrigin='manual',targetMovement='still',
 aimedPreviousRound=false,windforce=0,crosswind=false,traumaPenalty=0,effectiveDodgeIndex=0,
 ceilingFeet=null,spoiledDisposition=null,spoiledD100=null,chargingThrow=false,str=null,
 nearbyTargetCount=0,nearbyD20=null,nearbyImpactD10=null,nearbyTargetConfirmed=false,
 grenadeD=null,grenadeOrigin=null,deviationD8=null,deviationOrigin=null,
 zoneAim=1,zoneD=null,zoneOrigin=null,locationD10=null,locationOrigin=null,
 targetKind='ground',targetId=null,targetItemId=null,targetLocation=null,targetSide=null,
 splashDistanceInches=null,impactSurfaceFirmConfirmed=false,geometryConfirmed=false,
 humanConfirmed=false,gmConfirmed=false}={}){
 ok(gmConfirmed&&['direct','grenade'].includes(aimType)&&int(minute,0,1e9)&&
 typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
 int(distanceFt,1,120)&&int(throwingML,0,200)&&int(str,1,200)&&int(d100,1,100)&&origin(rollOrigin),
 'GM, kampaň, fyzické Throwing ML/d100 a vzdálenost 1–120 ft jsou povinné');
 ok(splashedTargetKind.includes(targetKind),'neznámý druh cíle');
 const dose=alchemyElixirStrength(journal,campaignId,finishId,minute);
 ok(dose.elixirName==='Acid'&&dose.currentAS>0&&!dose.dispersed&&!dose.imbibingId&&
  (!dose.nextDueMinute||dose.nextDueMinute>minute),'chybí účinný Acid bez zmeškaného Decay');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 ok(vial?.full&&vial.ownerId===actorId&&['none','carried'].includes(vial.slot)&&
  inventory.some(x=>x.id===vial.vialId&&x.characterId===actorId&&x.quantity===1),
  'chybí originální fyzická plná 4 oz lahvička');
 ok(aimType==='direct'||chargingThrow===false,
 'při vrhu na bod se nenahrazuje Grenade tabulka Charging Throw bonusem');
 ok(['still','moving','evading'].includes(targetMovement)&&int(windforce,0,4)&&
  int(traumaPenalty,-200,0)&&int(effectiveDodgeIndex,0,30),'neověřené okolnosti hodu');
 const args={weaponType:'thrown',baseRange:60,thrownPbZD:6,hft:6,thrownObject:true,oblong:false,
 distance:distanceFt,ml:throwingML,roll:d100,targetMovement,aimedPreviousRound,windforce,
 crosswind,traumaPenalty,effectiveDodgeIndex,ceilingFeet,chargingThrow,str,
 spoiledDisposition,spoiledD100,nearbyTargetCount,nearbyD20,nearbyImpactD10};
 let result,range,eml,sl,hit,discharged,deviation=null;
 if(aimType==='direct'){
  result=resolveHMKMissileAttack(args);
  ok(result.complete||result.pending?.type==='weapon-impact-die',
   'Missile Sequence ještě vyžaduje rozhodnutí nebo hod; nelze automaticky potvrdit zásah');
  range=result.range;eml=result.eml;sl=result.sl;
  ok(range.type==='direct','přímý hod musí být v přímé vzdálenosti; pro vrh na bod použijte Grenade');
  hit=result.hit===true&&targetKind!=='ground';
  discharged=result.spoiled?result.sl==='F':result.sl!=='CF';
  if((result.nearbyCheck||result.nearby||result.chosenTargetIndex!=null)&&nearbyTargetCount>0){
   ok(int(nearbyTargetCount,1,20)&&int(nearbyD20,1,20)&&
    (nearbyD20>nearbyTargetCount||(int(nearbyImpactD10,1,10)&&nearbyTargetConfirmed)),
    'při minutém Direct útoku mezi sousední cíle je povinný fyzický d20 a při zásahu také d10 a potvrzení GM');
  }else ok(nearbyD20===null&&nearbyImpactD10===null&&nearbyTargetConfirmed===false,
   'bez Nearby Missile Strike se nehází d20/d10');
  if(result.chosenTargetIndex!=null)ok(nearbyTargetConfirmed&&nearbyD20===result.chosenTargetIndex,
   'sousední zásah musí být potvrzen pro skutečný vybraný cíl');
  // A shattering vial inflicts no blunt weapon impact (p110), so the usual
  // weapon-impact-die pending state is the final contact confirmation.
  ok(!hit||result.pending?.type==='weapon-impact-die',
   'vržená skleněná láhev nesmí použít větev weapon impact');
  ok(grenadeD===null&&deviationD8===null,'pro přímý hod se nehází granátové kostky');
 }else{
  ok(nearbyTargetCount===0&&nearbyD20===null&&nearbyImpactD10===null,'Nearby strike nepatří do granátové tabulky');
  range=missileRange({distance:distanceFt,baseRange:60,thrownPbZD:6,volleyMaxMultiplier:2});
  ok(!range.outOfRange,'vrh mimo dostřel');
  ok(ceilingFeet===null||ceilingFeet>=10||range.type==='direct',
   'volley je pod stropem 10 ft zakázáno');
  const calc=calculateMissileEML({ml:throwingML,rangeModifier:range.rangeModifier,
   targetMovement,weaponType:'thrown',hft:6,str,thrownObject:true,
   windforce,crosswind,traumaPenalty,aimedPreviousRound,attackType:range.type});
  ok(!calc.spoiled,'spoiled grenade vyžaduje samostatné rozhodnutí Missile Sequence');
  eml=calc.raw;sl=slName[successLevel(d100,eml)];
  discharged=sl!=='CF';
  deviation=grenadeDeviation(distanceFt,SL[sl],grenadeD);
  ok(deviation.distanceUnits>0?int(deviationD8,1,8)&&origin(deviationOrigin):deviationD8===null&&deviationOrigin===null,
   'd8 směru se hází jen při nenulové odchylce');
  if(deviation.dieSides!==null)ok(origin(grenadeOrigin),'chybí původ skutečného hodu odchylky');
  else ok(grenadeOrigin===null,'nepotřebný hod odchylky není dovolen');
  const canonical=canonicalGrenadeDeviation({distance:distanceFt,sl:SL[sl],dieRoll:grenadeD,directionD8:deviationD8,criticalRoll:d100});
  ok(!canonical.outOfRange&&canonical.deviationFt===(deviation.distanceUnits===null?null:deviation.distanceUnits*5),
   'granátová odchylka neodpovídá společné tabulce HMK');
  deviation={...deviation,unitsFeet:5,distanceFeet:deviation.distanceUnits===null?null:deviation.distanceUnits*5,
   directionD8:deviation.distanceUnits>0?deviationD8:null};
  // The GM certifies the six-inch distance relative to the ACTUAL landing
  // point, not the desired aiming point (including any deviation).
  hit=discharged&&targetKind!=='ground'&&
   geometryConfirmed===true&&Number.isFinite(splashDistanceInches)&&splashDistanceInches>=0&&splashDistanceInches<=3;
 }
 if(!discharged){
  ok(splashDistanceInches===null&&zoneD===null&&locationD10===null,
   'CF: vrh se neuskutečnil; nelze vytvořit kontakt nebo spotřebu lahvičky');
 }else{
  ok(geometryConfirmed===true,
   'GM musí potvrdit skutečný bod dopadu a geometrii splash; Acid vial se dle p271 při vrhu rozbije');
 }
 if(aimType==='direct'){
  ok(splashDistanceInches===null,'přímý zásah nevyžaduje vzdálenost od bodu dopadu');
  if(hit&&targetKind==='flesh'){
   ok(humanConfirmed&&int(zoneAim,1,10)&&int(zoneD,1,result?.chosenTargetIndex!=null?10:range.zd)&&int(locationD10,1,10)&&
    origin(zoneOrigin)&&origin(locationOrigin),'přímý zásah člověka vyžaduje skutečný ZD a LD');
   const zn=zoneAim+zoneD-1;
   ok(zn<=10,'ZD míří mimo desetizónovou anatomii');
   const anatomical=humanLocation(zn,locationD10);
   ok(targetLocation===anatomical.location&&targetSide===anatomical.side,
    'GM lokace neodpovídá fyzickým Zone/Location dice');
  }else ok(zoneD===null&&locationD10===null&&zoneOrigin===null&&locationOrigin===null,
   'Zone/Location dice nejsou dovoleny bez přímého zásahu živého cíle');
 }else ok(zoneD===null&&locationD10===null&&zoneOrigin===null&&locationOrigin===null,
  'granátový kruh určuje GM podle místa dopadu, nikoli podle Direct ZD');
 if(hit){
  if(targetKind==='flesh')ok(humanConfirmed&&typeof targetId==='string'&&targetId&&
   typeof targetLocation==='string'&&targetLocation,'nezbytná potvrzená jedna lidská lokace');
  else ok(typeof targetItemId==='string'&&targetItemId&&inventory.some(x=>x.id===targetItemId&&x.quantity===1&&x.slot!=='chest'),
   'není doložen skutečný jediný zasažený inventární kus');
 }else ok(targetKind==='ground'||aimType==='direct'||splashDistanceInches===null||splashDistanceInches>3,
  'kontakt mimo šestipalcový kruh není dovoleno vyhlásit');
 return {format:ACID_THROW_FORMAT,campaignId,minute,actorId,finishId,vialId:vial.vialId,bindingId:vial.bindingId,
  asAtImpact:dose.currentAS,aimType,distanceFt,throwingML,d100,rollOrigin,targetMovement,
  aimedPreviousRound,windforce,crosswind,traumaPenalty,effectiveDodgeIndex,ceilingFeet,
  chargingThrow,str,spoiledDisposition,spoiledD100,nearbyTargetCount,nearbyD20,nearbyImpactD10,nearbyTargetConfirmed,
  rangeBand:range?.band??null,eml,sl,discharged,hit,impactSurfaceFirmConfirmed:discharged,
  geometryConfirmed:discharged,grenadeD,grenadeOrigin,deviationD8,deviationOrigin,deviation,
  zoneAim:hit&&aimType==='direct'&&targetKind==='flesh'?zoneAim:null,zoneD,zoneOrigin,locationD10,locationOrigin,
  targetKind:hit?targetKind:'ground',targetId:hit?targetId:null,targetItemId:hit?targetItemId:null,
  targetLocation:hit?targetLocation:null,targetSide:hit?targetSide:null,
  humanConfirmed:hit&&targetKind==='flesh',splashDistanceInches,
  splashDiameterInches:6,glassVialBroken:discharged,gmConfirmed:true,sourcePages:[110,163,164,269,271]};
}
export function validateAcidThrownJournal(journal=[]){
 const earlier=[];
 for(const row of journal){
  const t=row.calendarAlchemyAcidThrown;if(!t){earlier.push(row);continue;}
  ok(t.format===ACID_THROW_FORMAT&&row.characterId===t.actorId&&row.calendarCampaignId===t.campaignId&&
   row.campaignMinute===t.minute&&t.splashDiameterInches===6&&t.gmConfirmed===true,
   'neplatný historický důkaz vrhu');
  ok(t.discharged?row.calendarAlchemyVialEmpty?.finishId===t.finishId&&
   row.calendarAlchemyVialEmpty?.vialId===t.vialId&&
   row.calendarAlchemyVialEmpty?.emptyVialRetained===false&&
   row.calendarAlchemyVialEmpty?.vialShattered===true:
   !row.calendarAlchemyVialEmpty,'CF nesmí spotřebovat, skutečný vrh musí rozbít původní lahvičku');
  const fake=[{id:t.vialId,characterId:t.actorId,slot:'carried',quantity:1}];
  if(t.hit&&t.targetKind!=='flesh')fake.push({id:t.targetItemId,characterId:'other',slot:'carried',quantity:1});
  const rebuilt=createAcidThrownVial({journal:earlier,inventory:fake,campaignId:t.campaignId,minute:t.minute,
   actorId:t.actorId,finishId:t.finishId,aimType:t.aimType,distanceFt:t.distanceFt,
   throwingML:t.throwingML,d100:t.d100,rollOrigin:t.rollOrigin,targetMovement:t.targetMovement,
   aimedPreviousRound:t.aimedPreviousRound,windforce:t.windforce,crosswind:t.crosswind,
   traumaPenalty:t.traumaPenalty,effectiveDodgeIndex:t.effectiveDodgeIndex,ceilingFeet:t.ceilingFeet,
   spoiledDisposition:t.spoiledDisposition,spoiledD100:t.spoiledD100,
   chargingThrow:t.chargingThrow,str:t.str,nearbyTargetCount:t.nearbyTargetCount,
   nearbyD20:t.nearbyD20,nearbyImpactD10:t.nearbyImpactD10,nearbyTargetConfirmed:t.nearbyTargetConfirmed,
   grenadeD:t.grenadeD,grenadeOrigin:t.grenadeOrigin,
   deviationD8:t.deviationD8,deviationOrigin:t.deviationOrigin,
   zoneAim:t.zoneAim??1,zoneD:t.zoneD,zoneOrigin:t.zoneOrigin,
   locationD10:t.locationD10,locationOrigin:t.locationOrigin,
   targetKind:t.targetKind,targetId:t.targetId,targetItemId:t.targetItemId,
   targetLocation:t.targetLocation,targetSide:t.targetSide,splashDistanceInches:t.splashDistanceInches,
   impactSurfaceFirmConfirmed:t.impactSurfaceFirmConfirmed,geometryConfirmed:t.geometryConfirmed,
   humanConfirmed:t.humanConfirmed,gmConfirmed:true});
  ok(JSON.stringify(rebuilt)===JSON.stringify(t),'změněné fyzické hody, odchylka nebo místo zásahu');
  if(t.hit){
   ok(!!(row.calendarAlchemyAcidFleshApply||row.calendarAlchemyAcidArmourApply||
    row.calendarAlchemyAcidWeaponApply||row.calendarAlchemyAcidApply),
    'zasáhl-li Acid cíl, chybí skutečná připojená aplikace');
   ok(journal.some(r=>r.calendarCampaignId===t.campaignId&&r.calendarAlchemyAcidFleshRound?.applicationId===row.id||
    r.calendarCampaignId===t.campaignId&&r.calendarAlchemyAcidArmourRound?.applicationId===row.id||
    r.calendarCampaignId===t.campaignId&&r.calendarAlchemyAcidWeaponRound?.applicationId===row.id||
    r.calendarCampaignId===t.campaignId&&r.calendarAlchemyAcidRound?.applicationId===row.id),
    'dopad nemá povinné první kontaktní d10 a případné zdravotní následky');
  }
  earlier.push(row);
 }
 return true;
}
export function assertAcidThrownAppendOnly(before=[],after=[]){
 const index=new Map(after.map(r=>[r.id,r]));
 for(const row of before)if(row.calendarAlchemyAcidThrown)ok(JSON.stringify(index.get(row.id))===JSON.stringify(row),
  'původní hod či dopad nesmí být přepsán');
 return true;
}
export function validateAcidThrownInventory(database){
 for(const r of database.journal){const t=r.calendarAlchemyAcidThrown;if(!t||!t.discharged)continue;
  ok(!database.inventory.some(i=>i.id===t.vialId),'rozbitá lahvička zůstala fyzicky v inventáři');
 }
 return true;
}
