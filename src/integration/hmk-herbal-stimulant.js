/** HârnMaster v1.2 p.75 – the SAME ingested Stimulant grants a bonus to
 * Initiative and Awareness. Great → Strong → Mild → none, one hour/stage.
 * Read-only projections never spend inventory, modify GM time or roll dice.
 */
import {herbPotionEffectAt,validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const need=(ok,msg)=>{if(!ok)throw Error('Stimulant: '+msg)};
const minuteOK=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
export function stimulantEvidence({journal=[],campaignId,minute,targetId}={}){
 need(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&minuteOK(minute)&&
  typeof targetId==='string'&&targetId,'chybí doložená kampaň, čas nebo postava');
 const all=journal.filter(j=>j.calendarCampaignId===campaignId&&j.campaignMinute<=minute&&
  j.calendarHerbPotionAdminister?.herbType==='stimulant'&&
  j.calendarHerbPotionAdminister.targetId===targetId);
 const empty={bonus:0,stage:0,sourceIds:[],completeIds:[],sourcePage:75};
 if(!all.length)return empty;
 validateHerbAdministrationJournal(journal);
 const active=[];
 for(const row of all){
  const p=row.calendarHerbPotionAdminister;
  need(p.campaignId===campaignId&&p.minute===row.campaignMinute&&p.method==='ingested',
   'nesoulad původu podání');
  const made=journal.find(j=>j.id===p.completeId&&j.calendarCampaignId===campaignId&&
   j.calendarHerbPotionComplete&&j.campaignMinute<=p.minute);
  need(made?.calendarHerbPotionComplete?.usable===true&&
   p.minute<made.calendarHerbPotionComplete.expiryMinute,'nedoložená účinná výroba');
  const effect=herbPotionEffectAt(p,minute);
  if(effect.status==='active')active.push({bonus:effect.bonus,stage:effect.stage,sourceId:row.id,completeId:made.id});
 }
 need(active.length<=1,'více současně aktivních dávek nelze bez pravidla sčítat – rozhodne GM');
 if(!active.length)return empty;
 const a=active[0];
 return {bonus:a.bonus,stage:a.stage,sourceIds:[a.sourceId],completeIds:[a.completeId],sourcePage:75};
}
/** Check that a new encounter uses BASIC (unmedicated) GM-verified values.
 * Never pretend that a potion permanently increased the character's ML. */
export function stimulantInitiativeValues({baseInitiativeML,baseAwarenessEML,evidence}={}){
 need(Number.isSafeInteger(baseInitiativeML)&&baseInitiativeML>=0&&baseInitiativeML<=200&&
  Number.isSafeInteger(baseAwarenessEML)&&baseAwarenessEML>=0&&baseAwarenessEML<=200&&
  evidence&&Number.isSafeInteger(evidence.bonus)&&evidence.bonus>=0&&
  Array.isArray(evidence.sourceIds),'chybí ověřené základní Initiative ML, Awareness EML nebo původ');
 const initiativeML=baseInitiativeML+evidence.bonus,awarenessEML=baseAwarenessEML+evidence.bonus;
 need(initiativeML<=200&&awarenessEML<=200,'Initiative/Awareness přesahuje limit ověřeného bojového pořadí; rozhodne GM');
 return {baseInitiativeML,baseAwarenessEML,initiativeML,awarenessEML,bonus:evidence.bonus,
  sourceIds:[...evidence.sourceIds],completeIds:[...evidence.completeIds],stage:evidence.stage,sourcePage:75};
}
/** Fail closed if a saved encounter's stimulant snapshot no longer reflects
 * the currently authenticated GM calendar minute. Past turn order is immutable. */
export function verifyStimulantInitiativeSnapshot({journal=[],campaignId,minute,proofs=[]}={}){
 need(Array.isArray(proofs),'chybí snapshot počátečního pořadí');
 for(const p of proofs){
  need(p&&typeof p.targetId==='string','neplatný účastník původního IR');
  const now=stimulantEvidence({journal,campaignId,minute,targetId:p.targetId});
  const v=stimulantInitiativeValues({baseInitiativeML:p.baseInitiativeML,
   baseAwarenessEML:p.baseAwarenessEML,evidence:now});
  need(v.initiativeML===p.initiativeML&&v.awarenessEML===p.awarenessEML&&
   JSON.stringify(v.sourceIds)===JSON.stringify(p.sourceIds),
   'účinek při GM posunu zeslábl; pořadí stávající Initiative nelze tiše používat jako aktuální');
 }
 return true;
}
/** Replay the authoritative potion/application chain instead of trusting
 * cached adjusted initiative numbers. Old combats without this proof remain valid. */
export function validateStimulantInitiativeJournal(journal=[]){
 need(Array.isArray(journal),'poškozená historie');
 const prior=[];
 for(const row of journal){
  const p=row?.calendarHerbStimulantInitiative;
  if(p){
   need(row.characterId===p.targetId&&row.calendarCampaignId===p.campaignId&&
    row.campaignMinute===p.minute&&typeof p.timelineId==='string'&&p.timelineId,
    'nesoulad časové osy a postavy');
   const e=stimulantEvidence({journal:prior,campaignId:p.campaignId,minute:p.minute,targetId:p.targetId});
   const v=stimulantInitiativeValues({baseInitiativeML:p.baseInitiativeML,
    baseAwarenessEML:p.baseAwarenessEML,evidence:e});
   need(v.bonus>0&&v.bonus===p.bonus&&v.initiativeML===p.initiativeML&&
    v.awarenessEML===p.awarenessEML&&v.stage===p.stage&&p.sourcePage===75&&
    JSON.stringify(v.sourceIds)===JSON.stringify(p.sourceIds)&&
    JSON.stringify(v.completeIds)===JSON.stringify(p.completeIds),
    'historický bonus Initiative/Awareness neodpovídá skutečnému lektvaru');
  }
  prior.push(row);
 }
 return true;
}
export function assertStimulantInitiativeAppendOnly(before=[],after=[]){
 const map=new Map(after.map(r=>[r.id,r]));
 for(const row of before)if(row.calendarHerbStimulantInitiative){
  need(map.has(row.id)&&JSON.stringify(map.get(row.id))===JSON.stringify(row),
   'potvrzený časovaný doklad Initiative nelze měnit ani mazat');
 }
 return true;
}
/** Import/replay guard: the active encounter roster MUST correspond to its
 * saved physical potion and a committed, same-transaction journal proof.
 * Historical turns are never recalculated with a future calendar minute. */
export function validateStimulantEncounterCheckpoint({sequence,journal=[]}={}){
 if(!sequence?.stimulantInitiativeSnapshot)return true;
 const s=sequence.stimulantInitiativeSnapshot;
 need(typeof s.campaignId==='string'&&s.campaignId&&minuteOK(s.minute)&&
  typeof sequence.timelineId==='string'&&sequence.timelineId&&
  Array.isArray(s.proofs)&&s.proofs.length>0&&s.proofs.length<=100&&
  Array.isArray(sequence.roster),'poškozený kontrolní bod Initiative');
 const seen=new Set();
 for(const p of s.proofs){
  need(typeof p.targetId==='string'&&p.targetId&&!seen.has(p.targetId),
   'duplicitní nebo neplatný účastník');
  seen.add(p.targetId);
  const e=stimulantEvidence({journal,campaignId:s.campaignId,minute:s.minute,targetId:p.targetId});
  const v=stimulantInitiativeValues({baseInitiativeML:p.baseInitiativeML,baseAwarenessEML:p.baseAwarenessEML,evidence:e});
  need(v.bonus>0&&v.bonus===p.bonus&&v.initiativeML===p.initiativeML&&
   v.awarenessEML===p.awarenessEML&&v.stage===p.stage&&
   JSON.stringify(v.sourceIds)===JSON.stringify(p.sourceIds),
   'časový snapshot není podložen skutečným Stimulant');
  const fighter=sequence.roster.find(r=>r.id===p.targetId);
  need(fighter&&fighter.rank===v.initiativeML&&fighter.awarenessEML===v.awarenessEML&&
   fighter.baseInitiativeML===v.baseInitiativeML,
   'ověřené IR/Awareness se liší od uloženého bojového pořadí');
  need(journal.some(r=>r.characterId===p.targetId&&r.calendarCampaignId===s.campaignId&&
   r.campaignMinute===s.minute&&r.calendarHerbStimulantInitiative?.timelineId===sequence.timelineId&&
   JSON.stringify(r.calendarHerbStimulantInitiative?.sourceIds)===JSON.stringify(v.sourceIds)&&
   r.calendarHerbStimulantInitiative?.initiativeML===v.initiativeML&&
   r.calendarHerbStimulantInitiative?.awarenessEML===v.awarenessEML),
   'bojové pořadí nemá shodný neměnný zápis v deníku');
 }
 return true;
}
