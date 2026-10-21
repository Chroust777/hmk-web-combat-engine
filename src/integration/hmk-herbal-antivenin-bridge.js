/** HMK v1.2 p.75 + pp.184,186. Evidence-backed Antivenin -> ORIGINAL
 * Poison/Toxin Course only. No invented poison episode, dice or clock changes.
 * Mild begins at +10 min, Strong at +1 min, Great at +1 combat round.
 * Great in its application minute requires an attested combat-round witness.
 * Historical unlinked administrations cannot be attached retroactively.
 */
import {herbPotionStageBonus,validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const ensure=(ok,msg)=>{if(!ok)throw Error('Antivenin: '+msg)};
const minuteOk=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
export function antiveninPoisonEvidence({journal=[],campaignId,minute,targetId,sourceId,
 poisonOriginMinute,combatRound=null,timelineId=null}={}){
 ensure(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&minuteOk(minute)&&
  typeof targetId==='string'&&targetId&&typeof sourceId==='string'&&sourceId&&minuteOk(poisonOriginMinute)&&
  poisonOriginMinute<=minute,'chybí doložený pacient, toxin, kampaň nebo čas');
 const relevant=journal.filter(row=>row.calendarCampaignId===campaignId&&row.campaignMinute<=minute&&
  row.calendarHerbPotionAdminister?.herbType==='antivenin'&&
  row.calendarHerbPotionAdminister.targetId===targetId&&
  row.calendarHerbPotionAdminister.poisonSourceId===sourceId);
 if(!relevant.length)return {bonus:0,sourceIds:[],completeIds:[],sourcePage:75};
 validateHerbAdministrationJournal(journal);
 const active=[];
 for(const row of relevant){
  const p=row.calendarHerbPotionAdminister;
  ensure(p.campaignId===campaignId&&p.minute===row.campaignMinute&&row.characterId===p.actorId&&
   p.targetId===targetId&&p.poisonSourceId===sourceId&&p.method==='ingested'&&
   p.minute>=poisonOriginMinute,'podání neodpovídá skutečné expozici nebo časové větvi');
  const complete=journal.find(x=>x.id===p.completeId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionComplete);
  ensure(complete&&complete.calendarHerbPotionComplete.usable===true&&
   complete.campaignMinute<=p.minute&&p.minute<complete.calendarHerbPotionComplete.expiryMinute,
   'nenalezen původní platný a dokončený lektvar');
  const expected=herbPotionStageBonus(complete.calendarHerbPotionComplete.sv,complete.calendarHerbPotionComplete.potency);
  ensure(p.bonus===expected&&p.potency===complete.calendarHerbPotionComplete.potency&&
   p.sv===complete.calendarHerbPotionComplete.sv,'bonus neodpovídá původní výrobě');
  let effective=false;
  if(p.potency===1)effective=minute>=p.minute+10;
  else if(p.potency===2)effective=minute>=p.minute+1;
  else if(minute>p.minute)effective=true;
  else {
   const a=p.combatAnchor;
   // Neither an integer campaign minute nor an arbitrary combat round proves
   // that the five seconds of one round elapsed in the application minute.
   ensure(a&&a.confirmedByGM===true&&a.campaignMinute===p.minute&&
    Number.isSafeInteger(a.round)&&a.round>=1&&typeof a.timelineId==='string'&&a.timelineId&&
    Number.isSafeInteger(combatRound)&&combatRound>=a.round&&timelineId===a.timelineId,
    'Great onset po jednom kole nelze v minutě podání doložit bez stejné GM potvrzené bojové osy');
   effective=combatRound>=a.round+1;
  }
  if(effective)active.push({bonus:expected,sourceId:row.id,completeId:complete.id});
 }
 ensure(active.length<=1,'více současně účinných podání pro jeden toxin nemá doložené sčítání; rozhodne GM');
 if(!active.length)return {bonus:0,sourceIds:[],completeIds:[],sourcePage:75};
 return {bonus:active[0].bonus,sourceIds:[active[0].sourceId],completeIds:[active[0].completeId],
  poisonSourceId:sourceId,sourcePage:75};
}
