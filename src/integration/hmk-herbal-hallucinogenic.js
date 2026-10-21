/** HMK v1.2 pp.75,291-292: Hallucinogenic and the printed Lucid Dream table.
 * Only the GM advances the shared clock. Does not grant astral success or make
 * Transcendence, Saviris or Reembodiment rolls on behalf of the player.
 */
const check=(ok,message)=>{if(!ok)throw Error('Hallucinogenic: '+message)};
const integer=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
export const HALLUCINOGENIC_DREAM_FORMAT='hmk-hallucinogenic-lucid-dream-v1';
export const HALLUCINOGENIC_TRANCE_FORMAT='hmk-hallucinogenic-trance-veiling-v1';
const ORIGINS=['manual','cryptographic-software-die'];
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
export function createHallucinogenicLucidDream({journal=[],campaignId,applicationId,minute,targetId,aura,willIndex,d20,dieOrigin='manual',gmConfirmed=false}={}){
 check(gmConfirmed===true&&ORIGINS.includes(dieOrigin)&&integer(minute,0,1e9),'chybí GM potvrzení, čas nebo původ d20');
 const {row,application}=source(journal,campaignId,applicationId);
 check(targetId===application.targetId&&minute===row.campaignMinute+10,'Lucid Dream d20 je splatné přesně po deseti minutách');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&x.calendarHerbLucidDream?.applicationId===applicationId),'Lucid Dream d20 již bylo použito');
 return {format:HALLUCINOGENIC_DREAM_FORMAT,campaignId,minute,applicationId,targetId,dieOrigin,
  ...hallucinogenicLucidTable({aura,willIndex,d20}),gmConfirmed:true,sourcePage:292};
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
 concentrationUninterrupted=false,gmConfirmed=false}={}){
 check(gmConfirmed===true&&concentrationUninterrupted===true&&integer(minute,0,1e9),'GM musí potvrdit nepřerušenou Trance');
 const row=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarHerbHallucinogenicTranceStart);
 check(row&&row.calendarHerbHallucinogenicTranceStart.targetId===targetId,'chybí původní Trance');
 const start=row.calendarHerbHallucinogenicTranceStart;
 check(start.dueMinute===minute,'povinný termín 15 − SV nebyl dodržen');
 check(!journal.some(x=>x.calendarCampaignId===campaignId&&(x.calendarHerbHallucinogenicVeil?.startId===startId||x.calendarHerbHallucinogenicTranceAbort?.startId===startId)),'Trance již vyhodnocena nebo přerušena');
 return {format:HALLUCINOGENIC_TRANCE_FORMAT,campaignId,minute,startId,applicationId:start.applicationId,targetId,
  transcendenceBonus:start.transcendenceBonus,concentrationUninterrupted:true,gmConfirmed:true,
  transcendenceRollResolved:false,astralJourneyResolved:false,sourcePages:[75,291]};
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
export function requireHallucinogenicGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 if(afterMinute<=beforeMinute)return true;
 const dream=pendingHallucinogenicDreams(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!dream,'nelze přeskočit Lucid Dream d20 v minutě '+dream?.dueMinute);
 const trance=pendingHallucinogenicTrances(journal,campaignId).find(x=>x.dueMinute<afterMinute);
 check(!trance,'nelze přeskočit dokončení Trance v minutě '+trance?.dueMinute);
 return true;
}
export function validateHallucinogenicJournal(journal=[]){
 const earlier=[];
 for(const row of journal){
  const dream=row.calendarHerbLucidDream,start=row.calendarHerbHallucinogenicTranceStart,veil=row.calendarHerbHallucinogenicVeil,abort=row.calendarHerbHallucinogenicTranceAbort;
  if(dream||start||veil||abort){
   const p=dream||start||veil||abort;
   check(p.campaignId===row.calendarCampaignId&&p.minute===row.campaignMinute&&p.gmConfirmed===true&&p.targetId===row.characterId,
    'čas, postava nebo kampaň nesouhlasí s auditním důkazem');
   const expected=dream?createHallucinogenicLucidDream({journal:earlier,...dream}):start?createHallucinogenicTranceStart({journal:earlier,...start}):veil?createHallucinogenicVeil({journal:earlier,...veil}):createHallucinogenicTranceAbort({journal:earlier,...abort});
   check(JSON.stringify(p)===JSON.stringify(expected),'důkaz nesouhlasí s původním skutečným hodem nebo časem');
  }
  earlier.push(row);
 }
 return true;
}
export function assertHallucinogenicAppendOnly(before=[],after=[]){
 const map=new Map(after.map(x=>[x.id,x]));
 for(const row of before)if(row.calendarHerbLucidDream||row.calendarHerbHallucinogenicTranceStart||row.calendarHerbHallucinogenicVeil||row.calendarHerbHallucinogenicTranceAbort)
  check(map.has(row.id)&&JSON.stringify(map.get(row.id))===JSON.stringify(row),'historický důkaz nelze upravit nebo smazat');
 return true;
}
