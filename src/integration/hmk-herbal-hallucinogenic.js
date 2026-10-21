/** HMK v1.2 pp.75,291-292: Hallucinogenic and the printed Lucid Dream table.
 * Only the GM advances the shared clock. New rolls must be GM-attested;
 * Spirit actions, Will consequences, Dream Binding and Reembodiment remain separate.
 */
const check=(ok,message)=>{if(!ok)throw Error('Hallucinogenic: '+message)};
const integer=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
export const HALLUCINOGENIC_DREAM_FORMAT='hmk-hallucinogenic-lucid-dream-v1';
export const HALLUCINOGENIC_TRANCE_FORMAT='hmk-hallucinogenic-trance-veiling-v1';
const ORIGINS=['manual','cryptographic-software-die'];
import {successLevel} from '../rules/tests.js';
export const HALLUCINOGENIC_ASTRAL_FORMAT='hmk-hallucinogenic-astral-proof-v1';
// Printed column headers 1–9, 10–12, 13–14, 15, 16, 17, 18, 19, 20, 21+.
const column=aura=>aura<=9?0:aura<=12?1:aura<=14?2:aura<=20?aura-12:9;
// Inclusive d20 rows, transcribed verbatim from page 292. A zero is a dot.
const TABLE=Object.freeze([
 [0,0,0,0,0,0,0,0,0,0], // 1
 [0,0,0,0,0,0,0,0,0,1], // 2–5
 [0,0,0,0,0,0,0,0,1,2], // 6–10
 [0,0,0,0,0,0,0,1,2,3], // 11–12
 [0,0,0,0,0,0,1,2,3,4], // 13–14
 [0,0,0,0,0,1,2,3,4,5], // 15
 [0,0,0,0,1,2,3,4,5,6], // 16
 [0,0,0,1,2,3,4,5,6,7], // 17
 [0,0,1,2,3,4,5,6,7,8], // 18
 [0,1,2,3,4,5,6,7,8,9], // 19
 [1,2,3,4,5,6,7,8,9,10] // 20
]);
export function hallucinogenicLucidTable({aura,d20,willIndex}={}){
 check(integer(aura,1,100)&&integer(d20,1,20)&&integer(willIndex,0,100),'vyžaduje Aura, skutečný d20 a Will Index');
 const row=d20===1?0:d20<=5?1:d20<=10?2:d20<=12?3:d20<=14?4:d20-10;
 const tableRounds=TABLE[row][column(aura)];
 const dreamRounds=Math.min(tableRounds,willIndex);
 return {aura,d20,willIndex,tableRounds,dreamRounds,lucid:!!dreamRounds,
  savirisD20Required:!!dreamRounds,reembodimentRollRequired:!!dreamRounds,sourcePage:292};
}
function source(journal,campaignId,applicationId){
 const row=journal.find(x=>x.id===applicationId&&x.calendarCampaignId===campaignId&&x.calendarHerbPotionAdminister?.herbType==='hallucinogenic');
 check(row&&row.calendarHerbPotionAdminister.hallucinogenicTracked===true,'není doložené nové časované podání');
 return {row,application:row.calendarHerbPotionAdminister};
}
export function pendingHallucinogenicDreams(journal=[],campaignId=''){
 const done=new Set(journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbLucidDream).map(x=>x.calendarHerbLucidDream.applicationId));
 return journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbPotionAdminister?.herbType==='hallucinogenic'&&
  x.calendarHerbPotionAdminister.hallucinogenicTracked===true&&!done.has(x.id)).map(x=>({applicationId:x.id,targetId:x.calendarHerbPotionAdminister.targetId,
   dueMinute:x.campaignMinute+10,source:x}));
}
export function hallucinogenicTranceEligibility(journal=[],campaignId='',applicationId=''){
 const {row,application}=source(journal,campaignId,applicationId);
 const count=15-application.sv;
 return {applicationId,minute:row.campaignMinute,targetId:application.targetId,
  bonus:application.bonus,durationMinutes:count,canAutoSchedule:count>0};
}
export function pendingHallucinogenicTrances(journal=[],campaignId=''){
 const starts=journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicTranceStart);
 const completed=new Set(journal.filter(x=>x.calendarCampaignId===campaignId&&(x.calendarHerbHallucinogenicVeil||x.calendarHerbHallucinogenicTranceAbort)).map(x=>(x.calendarHerbHallucinogenicVeil||x.calendarHerbHallucinogenicTranceAbort).startId));
 return starts.filter(x=>!completed.has(x.id)).map(x=>({startId:x.id,targetId:x.calendarHerbHallucinogenicTranceStart.targetId,
  dueMinute:x.calendarHerbHallucinogenicTranceStart.dueMinute,source:x}));
}
export function createHallucinogenicLucidDream({journal=[],campaignId,applicationId,minute,targetId,aura,willIndex,d20,dieOrigin='manual',gmConfirmed=false,savirisTracked=false}={}){
 check(gmConfirmed===true&&ORIGINS.includes(dieOrigin)&&integer(minute,0,1e9),'chybí GM potvrzení, čas nebo původ d20');
 const {row,application}=source(journal,campaignId,applicationId);
 check(targetId===application.targetId&&minute===row.campaignMinute+10,'Lucid Dream d20 je splatné přesně po deseti minutách');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbLucidDream?.applicationId===applicationId),'Lucid Dream d20 již bylo použito');
 return {format:HALLUCINOGENIC_DREAM_FORMAT,campaignId,minute,applicationId,targetId,dieOrigin,
  ...hallucinogenicLucidTable({aura,willIndex,d20}),gmConfirmed:true,sourcePage:292,
  ...(savirisTracked===true?{savirisTracked:true}:{})};
}
export function createHallucinogenicTranceStart({journal=[],campaignId,applicationId,minute,targetId,
 tranceSkillML,consciousConfirmed=false,uninterruptedIntended=false,gmConfirmed=false}={}){
 check(gmConfirmed===true&&consciousConfirmed===true&&uninterruptedIntended===true&&integer(tranceSkillML,1,300),'nutný GM doložený Trance ML, vědomí a zahájení soustředění');
 const x=hallucinogenicTranceEligibility(journal,campaignId,applicationId);
 check(x.targetId===targetId&&x.minute===minute,'Trance musí skutečně probíhat při podání');
 check(x.canAutoSchedule,'15 − Herblore SV není kladný interval; rozhodne GM');
 check(!journal.some(y=>y.calendarCampaignId===campaignId&&y.calendarHerbHallucinogenicTranceStart?.applicationId===applicationId),'Trance byl již zahájen');
 return {format:HALLUCINOGENIC_TRANCE_FORMAT,campaignId,minute,applicationId,targetId,
  tranceSkillML,consciousConfirmed:true,uninterruptedIntended:true,gmConfirmed:true,
  dueMinute:minute+x.durationMinutes,transcendenceBonus:x.bonus,sourcePages:[75,291]};
}
export function createHallucinogenicVeil({journal=[],campaignId,startId,minute,targetId,
 concentrationUninterrupted=false,gmConfirmed=false,transcendenceTracked=false}={}){
 check(gmConfirmed===true&&concentrationUninterrupted===true&&integer(minute,0,1e9),'GM musí potvrdit nepřerušenou Trance');
 const row=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicTranceStart);
 check(row&&row.calendarHerbHallucinogenicTranceStart.targetId===targetId,'chybí původní Trance');
 const start=row.calendarHerbHallucinogenicTranceStart;
 check(start.dueMinute===minute,'povinný termín 15 − SV nebyl dodržen');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&(x.calendarHerbHallucinogenicVeil?.startId===startId||x.calendarHerbHallucinogenicTranceAbort?.startId===startId)),'Trance již vyhodnocena nebo přerušena');
 return {format:HALLUCINOGENIC_TRANCE_FORMAT,campaignId,minute,startId,applicationId:start.applicationId,targetId,
  transcendenceBonus:start.transcendenceBonus,concentrationUninterrupted:true,gmConfirmed:true,
  transcendenceRollResolved:false,astralJourneyResolved:false,sourcePages:[75,291],
  ...(transcendenceTracked===true?{transcendenceTracked:true}:{})};
}
export function createHallucinogenicTranceAbort({journal=[],campaignId,startId,minute,targetId,reason,gmConfirmed=false}={}){
 check(gmConfirmed===true&&integer(minute,0,1e9)&&typeof reason==='string'&&reason.trim().length>=3&&reason.length<=400,'přerušení vyžaduje důvod a potvrzení GM');
 const row=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicTranceStart);
 check(row&&row.calendarHerbHallucinogenicTranceStart.targetId===targetId,'chybí původní Trance');
 check(minute>=row.campaignMinute&&minute<=row.calendarHerbHallucinogenicTranceStart.dueMinute,'přerušení musí být doloženo před splatným dokončením');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&(x.calendarHerbHallucinogenicVeil?.startId===startId||x.calendarHerbHallucinogenicTranceAbort?.startId===startId)),'Trance už byla dokončena či přerušena');
 return {format:HALLUCINOGENIC_TRANCE_FORMAT,campaignId,minute,startId,targetId,reason:reason.trim(),
  interrupted:true,veilLifted:false,transcendenceBonusApplied:false,gmConfirmed:true,sourcePages:[75,291]};
}

/** A new, witnessed Lucid Dream may require a separate Sâvirìs d20.
 * Legacy Lucid Dream proofs are never retroactively scheduled.
 */
export function pendingHallucinogenicSaviris(journal=[],campaignId=''){
 const done=new Set(journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbSaviris).map(x=>x.calendarHerbSaviris.dreamId));
 return journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbLucidDream?.savirisTracked===true&&
   x.calendarHerbLucidDream.dreamRounds>0&&!done.has(x.id)).map(x=>({dreamId:x.id,targetId:x.calendarHerbLucidDream.targetId,
    dueMinute:x.campaignMinute,dreamRounds:x.calendarHerbLucidDream.dreamRounds}));
}
export function createHallucinogenicSaviris({journal=[],campaignId,dreamId,targetId,minute,d20,dieOrigin='manual',gmConfirmed=false}={}){
 check(gmConfirmed===true&&ORIGINS.includes(dieOrigin)&&integer(d20,1,20),'Sâvirìs vyžaduje skutečný d20 a GM potvrzení');
 const row=journal.find(x=>x.id===dreamId&&x.calendarCampaignId===campaignId&&x.calendarHerbLucidDream?.savirisTracked===true);
 check(row&&row.calendarHerbLucidDream.targetId===targetId&&row.calendarHerbLucidDream.dreamRounds>0,'chybí doložený Lucid Dream');
 check(minute===row.campaignMinute,'Sâvirìs d20 musí být vyhodnocen před prvním kolem snu, v minutě Lucid Dream');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbSaviris?.dreamId===dreamId),'Sâvirìs d20 již bylo použito');
 return {format:HALLUCINOGENIC_ASTRAL_FORMAT,campaignId,minute,dreamId,targetId,
  dreamRounds:row.calendarHerbLucidDream.dreamRounds,d20,dieOrigin,bound:d20<=row.calendarHerbLucidDream.dreamRounds,
  gmConfirmed:true,bindingRequiresSeparateResolution:d20<=row.calendarHerbLucidDream.dreamRounds,sourcePages:[292,362]};
}
export function pendingHallucinogenicTranscendence(journal=[],campaignId=''){
 const done=new Set(journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbTranscendence).map(x=>x.calendarHerbTranscendence.veilId));
 return journal.filter(x=>x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicVeil?.transcendenceTracked===true&&
  !done.has(x.id)).map(x=>({veilId:x.id,targetId:x.calendarHerbHallucinogenicVeil.targetId,
   dueMinute:x.campaignMinute,bonus:x.calendarHerbHallucinogenicVeil.transcendenceBonus}));
}
/** Trance d100 uses the original Trance ML, confirmed fatigue and the attested
 * herbal bonus. A success only establishes eligibility for an astral journey;
 * the Spirit actions, reembodiment and any aural consequence remain separate.
 */
export function createHallucinogenicTranscendence({journal=[],campaignId,veilId,minute,targetId,
 tranceML,fatiguePenalty,d100,bonusD3=null,dieOrigin='manual',bonusDieOrigin=null,gmConfirmed=false}={}){
 check(gmConfirmed===true&&ORIGINS.includes(dieOrigin)&&integer(d100,1,100),'Transcendence vyžaduje skutečný d100 a potvrzení GM');
 const veil=journal.find(x=>x.id===veilId&&x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicVeil?.transcendenceTracked===true);
 check(veil&&veil.calendarHerbHallucinogenicVeil.targetId===targetId,'chybí nové doložené Lift the Veil');
 check(minute===veil.campaignMinute,'Transcendence musí následovat v přesné minutě dokončené Trance');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbTranscendence?.veilId===veilId),'Transcendence již vyhodnoceno');
 const start=journal.find(x=>x.id===veil.calendarHerbHallucinogenicVeil.startId&&x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicTranceStart);
 check(start&&start.calendarHerbHallucinogenicTranceStart.targetId===targetId&&
  tranceML===start.calendarHerbHallucinogenicTranceStart.tranceSkillML,'Trance ML nesouhlasí s původním podkladem');
 check(integer(fatiguePenalty,0,300),'GM musí doložit aktuální postih Fatigue');
 const bonus=veil.calendarHerbHallucinogenicVeil.transcendenceBonus,rawEML=tranceML-fatiguePenalty+bonus;
 const sl=['CF','F','S','CS'][successLevel(d100,rawEML)];
 if(sl==='CS')check(integer(bonusD3,1,3)&&ORIGINS.includes(bonusDieOrigin),'Critical Success vyžaduje skutečný d3');
 else check(bonusD3===null&&bonusDieOrigin===null,'d3 jen při Critical Success');
 return {format:HALLUCINOGENIC_ASTRAL_FORMAT,campaignId,minute,veilId,startId:start.id,
  applicationId:start.calendarHerbHallucinogenicTranceStart.applicationId,targetId,tranceML,fatiguePenalty,
  herbalBonus:bonus,rawEML,d100,dieOrigin,sl,bonusD3,bonusDieOrigin,
  bonusSpiritRounds:sl==='CS'?bonusD3:0,astralJourneyEligible:sl==='S'||sl==='CS',
  requiresWillTest:sl==='CF',repeatTranceGMDecision:sl==='F',gmConfirmed:true,sourcePages:[75,291,294]};
}
export function requireHallucinogenicGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const dream=pendingHallucinogenicDreams(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!dream,'nelze přeskočit Lucid Dream d20 v minutě '+dream?.dueMinute);
 const saviris=pendingHallucinogenicSaviris(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!saviris,'nelze přeskočit Sâvirìs d20 v minutě '+saviris?.dueMinute);
 const transcendence=pendingHallucinogenicTranscendence(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!transcendence,'nelze přeskočit Transcendence d100 v minutě '+transcendence?.dueMinute);
 const trance=pendingHallucinogenicTrances(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!trance,'nelze přeskočit dokončení Trance v minutě '+trance?.dueMinute);
 return true;
}
export function validateHallucinogenicJournal(journal=[]){
 const earlier=[];
 for(const row of journal){
  const dream=row.calendarHerbLucidDream,start=row.calendarHerbHallucinogenicTranceStart,veil=row.calendarHerbHallucinogenicVeil,abort=row.calendarHerbHallucinogenicTranceAbort,
   saviris=row.calendarHerbSaviris,transcendence=row.calendarHerbTranscendence;
  if(dream||start||veil||abort||saviris||transcendence){
   const p=dream||start||veil||abort||saviris||transcendence;
   check(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.gmConfirmed===true&&p.targetId===row.characterId,
    'čas, postava nebo kampaň nesouhlasí s auditním důkazem');
   const expected=dream?createHallucinogenicLucidDream({journal:earlier,...dream}):start?createHallucinogenicTranceStart({journal:earlier,...start}):veil?createHallucinogenicVeil({journal:earlier,...veil}):abort?createHallucinogenicTranceAbort({journal:earlier,...abort}):saviris?createHallucinogenicSaviris({journal:earlier,...saviris}):createHallucinogenicTranscendence({journal:earlier,...transcendence});
   check(JSON.stringify(p)===JSON.stringify(expected),'důkaz nesouhlasí s původním skutečným hodem nebo časem');
  }
  earlier.push(row);
 }
 return true;
}
export function assertHallucinogenicAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarHerbLucidDream||row.calendarHerbHallucinogenicTranceStart||row.calendarHerbHallucinogenicVeil||row.calendarHerbHallucinogenicTranceAbort||row.calendarHerbSaviris||row.calendarHerbTranscendence)
  check(map.has(row.id)&&JSON.stringify(map.get(row.id))===JSON.stringify(row),'historický důkaz nelze upravit nebo smazat');
 return true;
}
