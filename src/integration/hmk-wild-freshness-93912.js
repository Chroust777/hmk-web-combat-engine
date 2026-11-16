/** HMK v1.2 p.85: once each day each fresh-food-day is checked, 1 spoils.
 * Optional whole-day salt curing changes frequency to 1 + 3*stars days.
 * GM, rather than this module, supplies real dice/Skill Workbench proof and
 * confirms the weather category and curing conditions. NO clock mutation.
 * v2 lots only: legacy GM-expiration receipts remain untouched.
 */
export const WILD_FRESH_CARRY_93912='hmk-wild-catch-carry-93912-v2';
export const SPOIL_93912='hmk-wild-catch-spoil-93912-v1';
export const SALT_START_93912='hmk-wild-catch-salt-start-93912-v1';
export const SALT_FINISH_93912='hmk-wild-catch-salt-finish-93912-v1';
export const SALT_DAY_MINUTES=1440;
const dice=Object.freeze({hot:2,warm:4,cool:8,cold:12});
const validMinute=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const qty=n=>Number.isSafeInteger(n*2)&&n>=0;
const need=(test,msg)=>{if(!test)throw Error('HMK 85 · čerstvost: '+msg);};
const round=n=>Math.round(n*2)/2;
const isV2=x=>x?.format===WILD_FRESH_CARRY_93912;
function source(journal,campaignId,carryId){
 const row=journal.find(j=>j.id===carryId&&j.calendarCampaignId===campaignId&&isV2(j.calendarForagingCarry));
 return row||null;
}
/** Read-only status. Spoiled material stays in the person's ENC until discarded. */
export function wildFreshState93912(journal=[],campaignId,carryId,minute=1e9){
 const row=source(journal,campaignId,carryId);if(!row)return null;
 let physical=row.calendarForagingCarry.quantity,spoiled=0;
 let nextDue=row.campaignMinute+1439,intervalDays=1;
 let saltStartId=null,saltFinished=false;
 for(const j of journal){
  if(j.calendarCampaignId!==campaignId||j.campaignMinute>minute||j.campaignMinute<row.campaignMinute)continue;
  const e=j.calendarForagingCarryEat,d=j.calendarForagingCarryDiscard;
  if(e?.carryId===carryId){physical=round(physical-e.quantity);}
  if(d?.carryId===carryId){const spoiledUsed=Math.min(spoiled,d.quantity);spoiled=round(spoiled-spoiledUsed);physical=round(physical-d.quantity);}
  const s=j.calendarCatchSpoilage93912;
  if(s?.carryId===carryId){spoiled=round(spoiled+s.spoiledFoodDays);nextDue+=intervalDays*1440;}
  const st=j.calendarCatchSaltStart93912;
  if(st?.carryId===carryId)saltStartId=j.id;
  const finish=j.calendarCatchSaltFinish93912;
  if(finish?.carryId===carryId){saltStartId=null;saltFinished=true;intervalDays=finish.intervalDays;nextDue=j.campaignMinute+intervalDays*1440-1;}
 }
 const edible=round(Math.max(0,physical-spoiled));
 return {carryId,actorId:row.characterId,sourceMinute:row.campaignMinute,
  physicalRemaining:physical,spoiledRemaining:spoiled,edibleRemaining:edible,
  nextDueMinute:edible>0?nextDue:null,intervalDays,saltStartId,saltFinished,
  freshnessDue:edible>0&&nextDue<=minute,weightLb:row.calendarForagingCarry.totalWeightLb};
}
export function wildSpoilage93912({journal=[],campaignId,carryId,actorId,minute,
 temperature,rolls,gmConfirmed=false}={}){
 need(validMinute(minute)&&campaignId&&carryId&&actorId&&gmConfirmed===true,'GM musí potvrdit kampaň, čas a jednotlivé skutečné hody.');
 const state=wildFreshState93912(journal,campaignId,carryId,minute);
 need(state&&state.actorId===actorId&&state.edibleRemaining>0,'neexistuje poživatelné maso/ryby této postavy.');
 need(state.nextDueMinute<=minute,'denní kontrola ještě není splatná.');
 need(Object.hasOwn(dice,temperature),'teplotní pásmo musí určit GM z počasí (Hot/Warm/Cool/Cold).');
 const sides=dice[temperature],count=Math.ceil(state.edibleRemaining);
 need(Array.isArray(rolls)&&rolls.length===count&&rolls.every(x=>Number.isSafeInteger(x)&&x>=1&&x<=sides),
  'doložte jeden skutečný hod příslušnou kostkou na každý poživatelý food-day (i neúplný poslední podíl).');
 const portions=rolls.map((r,i)=>Math.min(1,state.edibleRemaining-i));
 const spoiledFoodDays=round(portions.reduce((n,q,i)=>n+(rolls[i]===1?q:0),0));
 return {format:SPOIL_93912,campaignId,actorId,carryId,dueMinute:state.nextDueMinute,
  minute,temperature,dieSides:sides,rolls:[...rolls],spoiledFoodDays,
  retainedFoodDays:round(state.edibleRemaining-spoiledFoodDays),sourcePage:85,gmConfirmed:true};
}
export function wildSaltStart93912({journal=[],campaignId,carryId,actorId,minute,
 saltConfirmed=false,gmConfirmed=false}={}){
 need(validMinute(minute)&&campaignId&&carryId&&actorId&&saltConfirmed===true&&gmConfirmed===true,
  'konzervace vyžaduje potvrzenou sůl, skutečné maso a GM.');
 const state=wildFreshState93912(journal,campaignId,carryId,minute);
 need(state&&state.actorId===actorId&&state.edibleRemaining>0&&!state.freshnessDue&&
  !state.saltStartId&&!state.saltFinished,'balík je zkažený, po splatnosti, již se konzervuje nebo již byl konzervován.');
 return {format:SALT_START_93912,campaignId,carryId,actorId,minute,readyMinute:minute+1440,
  saltConfirmed:true,gmConfirmed:true,sourcePage:85};
}
export function wildSaltFinish93912({journal=[],campaignId,carryId,actorId,minute,
 startId,skillId,gmConfirmed=false}={}){
 need(validMinute(minute)&&campaignId&&carryId&&actorId&&startId&&skillId&&gmConfirmed===true,
  'doložte dokončení jednodenní konzervace i původní Survival/Cookery SV.');
 const start=journal.find(j=>j.id===startId&&j.calendarCampaignId===campaignId&&
  j.characterId===actorId&&j.calendarCatchSaltStart93912?.carryId===carryId);
 need(start&&start.calendarCatchSaltStart93912.readyMinute<=minute,'celý kalendářní den konzervace dosud neuplynul.');
 const state=wildFreshState93912(journal,campaignId,carryId,minute);
 need(state&&state.actorId===actorId&&state.saltStartId===startId&&state.edibleRemaining>0&&!state.freshnessDue,
  'konzervace již skončila nebo před dokončením chybí splatná kontrola zkázy.');
 const row=journal.find(j=>j.id===skillId&&j.calendarCampaignId===campaignId&&
  j.characterId===actorId&&j.campaignMinute===minute);
 const p=row?.skillTestProof,skill=p?.skills?.[0]||p?.skill;
 const sv=p?.a?.sv??p?.result?.sv;
 need(p?.type==='secondary-mastery-value-test'&&['Survival','Cookery'].includes(skill)&&
  Number.isSafeInteger(sv),'vyberte skutečný Survival nebo Cookery Success Value z této minuty.');
 need(!journal.some(j=>j.calendarCampaignId===campaignId&&j.calendarCatchSaltFinish93912?.skillId===skillId),
  'původní Skill Test již posloužil jiné konzervaci.');
 const stars=Math.max(0,Math.min(5,sv-4)),intervalDays=1+3*stars;
 return {format:SALT_FINISH_93912,campaignId,carryId,actorId,startId,skillId,
  minute,sv,stars,intervalDays,nextDueMinute:minute+intervalDays*1440-1,
  gmConfirmed:true,sourcePage:85};
}
/** Replay every versioned receipt using ONLY its earlier immutable evidence. */
export function validateWildFreshness93912(journal=[]){
 const prior=[];
 for(const row of journal){
  for(const [field,make,args] of [
   ['calendarCatchSpoilage93912',wildSpoilage93912,p=>({temperature:p.temperature,rolls:p.rolls})],
   ['calendarCatchSaltStart93912',wildSaltStart93912,p=>({saltConfirmed:p.saltConfirmed})],
   ['calendarCatchSaltFinish93912',wildSaltFinish93912,p=>({startId:p.startId,skillId:p.skillId})]]){
   const p=row[field];if(!p)continue;
   const expected=make({journal:prior,campaignId:row.calendarCampaignId,actorId:row.characterId,
    carryId:p.carryId,minute:row.campaignMinute,gmConfirmed:p.gmConfirmed,...args(p)});
   need(JSON.stringify(expected)===JSON.stringify(p),'neplatný, změněný nebo duplicitní archivní doklad '+field+'.');
  }
  prior.push(row);
 }
 return true;
}
/** Prevent advancing PAST a due check without a real die. Arriving at due is allowed. */
export function assertWildDueBeforeAdvance93912(journal=[],campaignId,fromMinute,toMinute){
 if(!validMinute(fromMinute)||!validMinute(toMinute)||toMinute<=fromMinute)return true;
 for(const row of journal){
  if(row.calendarCampaignId!==campaignId||!isV2(row.calendarForagingCarry)||row.campaignMinute>fromMinute)continue;
  const state=wildFreshState93912(journal,campaignId,row.id,fromMinute);
  if(state?.nextDueMinute!==null&&state?.nextDueMinute<toMinute)
   throw Error('HMK 85: před dalším posunem Kalendáře je nutný doložený denní hod kažení úlovku '+row.id+' v minutě '+state.nextDueMinute+'.');
 }
 return true;
}
