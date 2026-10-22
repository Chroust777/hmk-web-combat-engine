/** HMK v1.2 pp.265–268. The initial canonical preparation stage.
 * Uses existing campaign journal, GM clock and Skill Workbench SV proof.
 * Deliberately NO duplicate inventory, magic effects, or timer authority.
 * CF / Dissolution reuse canonical Skill and Shock rules; no separate clock.
 */
import {workshopQuality} from '../rules/craft-workshop-p121.js';
import {secondaryModifier,secondaryRoll,indexOf,successLevel,SL} from '../rules/tests.js';
import {shockRollModifier,shockStateFromIndex} from '../rules/shock.js';
import {initialCombatState,validateCombatState,combatFatigueTotals,finalizeFatalState} from './persistent-combat-state.js';
import {STARTING_ELIXIR_NAMES} from './hmk-creation-starting-elixirs.js';
export const ALCHEMY_START_FORMAT='hmk-alchemy-preparation-start-v1';
export const ALCHEMY_FINISH_FORMAT='hmk-alchemy-preparation-finish-v1';
export const ALCHEMY_ABORT_FORMAT='hmk-alchemy-preparation-abort-v1';
const DAY=1440;
const ok=(condition,message)=>{if(!condition)throw Error(message);};
const whole=(value,low,high)=>Number.isSafeInteger(value)&&value>=low&&value<=high;
const validOrigin=x=>x==='manual'||x==='cryptographic-software-die';
// Each of the 35 canonical elixirs has the associated principle in print (pp.271–274).
const PRINCIPLES=['Metal','Air','Water','Light','Dimension','Artefact','Kelestia','Knowledge','Mineral','Dryness','Fire','Silence','Incantation','Smoke','Incorporeality','Life','Cold','Artifice','Growth','Mind','Substance','Emotion','Identity','Toxicity','Stasis','Darkness','Sound','Aura','Defence','Earth','Death','Illusion','Action','Heat','Decay'];
const CONVOCATIONS=['Jmorvi','Lyahvi','Odivshe','Lyahvi','Neutral','Neutral','Savorya','Savorya','Jmorvi','Peleahn','Peleahn','Odivshe','Neutral','Peleahn','Lyahvi','Fyvria','Odivshe','Jmorvi','Fyvria','Savorya','Jmorvi','Savorya','Neutral','Jmorvi','Odivshe','Odivshe','Lyahvi','Savorya','Neutral','Fyvria','Fyvria','Lyahvi','Peleahn','Peleahn','Fyvria'];
export const CANONICAL_ALCHEMY_ELIXIRS=Object.freeze(STARTING_ELIXIR_NAMES.map((name,i)=>Object.freeze({name,principle:PRINCIPLES[i],convocation:CONVOCATIONS[i]})));
const SUNSIGNS=['Ùlándus','Arálius','Fenéri','Áhnù','Angberélius','Nadái','Hîrin','Táræl','Tai','Skôrus','Masâra','Ládo'];
const SUNSIGN_MODIFIERS=[[15,5,-5,-15,-5,5],[10,10,0,-10,-10,0],[5,15,5,-5,-15,-5],[0,10,10,0,-10,-10],[-5,5,15,5,-5,-15],[-10,0,10,10,0,-10],[-15,-5,5,15,5,-5],[-10,-10,0,10,10,0],[-5,-15,-5,5,15,5],[0,-10,-10,0,10,10],[5,-5,-15,-5,5,15],[10,0,-10,-10,0,10]];
const ORDER=['Fyvria','Jmorvi','Peleahn','Lyahvi','Savorya','Odivshe'];
export function alchemySunsignModifier(sunsign,convocation){
 if(convocation==='Neutral')return 0;
 const i=ORDER.indexOf(convocation);ok(i>=0,'Neznámá konvokace elixíru');
 const signs=String(sunsign||'').split(' / ').map(x=>x.trim());
 ok(signs.length>=1&&signs.length<=2&&signs.every(x=>SUNSIGNS.includes(x)),'Postava nemá doložený Sunsign; nejprve dokončete identitu postavy');
 return Math.max(...signs.map(x=>SUNSIGN_MODIFIERS[SUNSIGNS.indexOf(x)][i]));
}
const campaignRows=(journal,campaignId)=>journal.filter(r=>r.calendarCampaignId===campaignId);
// HMK p.267–268: unique elixirs retain a single, GM-witnessed formula per
// campaign. Effect text is a *description* until a separate rule-backed
// implementation can apply it; never evaluate it as a spell or code.
const UNIQUE_NAME_LIMIT=100;
const uniqueStarts=(journal,campaignId,title)=>campaignRows(journal,campaignId).filter(r=>
 r.calendarAlchemyStart?.uniqueElixir?.title.toLocaleLowerCase()===title.toLocaleLowerCase());
const sameFormula=(a,b)=>['title','principle','use','duration','effect'].every(k=>a?.[k]===b?.[k]);
export function inventionSVPenalty({journal=[],campaignId,actorId,startId}={}){
 const start=journal.find(r=>r.id===startId&&r.calendarCampaignId===campaignId)?.calendarAlchemyStart;
 ok(start?.uniqueElixir,'Invent: nenalezen původní unikátní recept');
 const starts=uniqueStarts(journal,campaignId,start.uniqueElixir.title);
 ok(starts.length&&starts[0].calendarAlchemyStart.uniqueElixir.mode==='invent','Invent: chybí první vynálezce receptu');
 const inventor=starts[0].characterId;
 const successes=campaignRows(journal,campaignId).filter(r=>r.calendarAlchemyFinish?.result==='completed'&&
  r.calendarAlchemyFinish?.uniqueElixir?.title===start.uniqueElixir.title&&
  sameFormula(r.calendarAlchemyFinish.uniqueElixir,start.uniqueElixir));
 return successes.some(r=>r.characterId===actorId)?0:actorId===inventor?-3:-1;
}

export function pendingAlchemyPreparations(journal=[],campaignId){
 return campaignRows(journal,campaignId).filter(r=>r.calendarAlchemyStart&&!campaignRows(journal,campaignId).some(x=>x.calendarAlchemyFinish?.startId===r.id||x.calendarAlchemyAbort?.startId===r.id));
}
export function createAlchemyStart({journal=[],campaignId,minute,actorId,alchemyML,elixirName,sunsign,
 workshopSource='private',wealth=null,workshopStars=null,workshopConfirmed=false,
 timeD6=[],timeOrigins=[],uniqueElixir=null}={}){
 ok(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&whole(minute,0,1e9),'Alchemy: chybí kampaň, postava nebo platný čas GM');
 ok(whole(alchemyML,60,1000),'Alchemy Create vyžaduje ML 60+');
 let elixir=CANONICAL_ALCHEMY_ELIXIRS.find(x=>x.name===elixirName);
 let unique=null;
 if(uniqueElixir!==null){
  ok(uniqueElixir&&typeof uniqueElixir==='object'&&!Array.isArray(uniqueElixir),
   'Invent: neplatné parametry unikátního elixíru');
  const {mode,title,principle,use,duration,effect,knowledgeFinishId=null,gmConfirmed}=uniqueElixir;
  ok((mode==='invent'||mode==='known')&&typeof title==='string'&&title===title.trim()&&
   title.length>=3&&title.length<=UNIQUE_NAME_LIMIT&&title===elixirName&&
   !CANONICAL_ALCHEMY_ELIXIRS.some(x=>x.name.toLocaleLowerCase()===title.toLocaleLowerCase()),
   'Invent: unikátní název nesmí být kanonický nebo neplatný');
  const core=CANONICAL_ALCHEMY_ELIXIRS.find(x=>x.principle===principle);
  ok(core&&['imbibed','applied'].includes(use)&&['instantaneous','temporary'].includes(duration)&&
   typeof effect==='string'&&effect===effect.trim()&&effect.length>=3&&effect.length<=1000,
   'Invent: před výrobou musí být určen původní princip, způsob použití, trvání a efekt (HMK 268)');
  ok(gmConfirmed===true,'Invent: všechny parametry před výrobou musí potvrdit GM');
  const previous=uniqueStarts(journal,campaignId,title),first=previous[0];
  if(mode==='invent'){
   ok(whole(alchemyML,100,1000),'Invent vyžaduje Alchemy ML 100+ (HMK 267)');
   ok(knowledgeFinishId===null,'Invent: autor receptu nesmí předstírat převzatou znalost');
   ok(!first||first.characterId===actorId&&sameFormula(first.calendarAlchemyStart.uniqueElixir,
    {title,principle,use,duration,effect}),
    'Invent: tento recept již existuje; nesmí se změnit jeho autor ani parametry');
  }else{
   ok(first&&first.characterId!==actorId,'Invent: vlastní recept nelze vydávat za převzatý');
   ok(sameFormula(first.calendarAlchemyStart.uniqueElixir,{title,principle,use,duration,effect}),
    'Invent: parametry známého receptu musí přesně odpovídat originálu');
   const source=journal.find(r=>r.id===knowledgeFinishId&&r.calendarCampaignId===campaignId);
   const completed=source?.calendarAlchemyFinish;
   ok(completed?.result==='completed'&&completed.uniqueElixir&&
    sameFormula(completed.uniqueElixir,{title,principle,use,duration,effect})&&
    // Privy knowledge requires an actually invented original, not an unsuccessful attempt.
    campaignRows(journal,campaignId).some(r=>r.characterId===first.characterId&&
     r.calendarAlchemyFinish?.result==='completed'&&
     sameFormula(r.calendarAlchemyFinish.uniqueElixir,first.calendarAlchemyStart.uniqueElixir))&&
    source.campaignMinute<=minute,
    'Invent: jiný alchymista musí být obeznámen s prokazatelně úspěšně vynalezeným elixírem');
  }
  elixir={name:title,principle,convocation:core.convocation};
  unique={mode,title,principle,use,duration,effect,knowledgeFinishId:mode==='known'?knowledgeFinishId:null,
   gmConfirmed:true};
 }else ok(elixir,'Alchemy: neznámý kanonický elixír (HMK 271–274)');
 ok(workshopConfirmed===true,'GM musí doložit dostupnou alchymistickou dílnu, nikoli polní laboratoř');
 ok(workshopSource==='private'||workshopSource==='chantry','Neznámý druh dílny');
 let stars;
 if(workshopSource==='private'){
  ok(whole(wealth,10,1000),'Soukromá alchymistická dílna vyžaduje Wealth alespoň 10');
  stars=workshopQuality(wealth,{alchemy:true})?.quality;
 }else{
  ok(whole(workshopStars,1,5),'Kvalitu cechovní/chantry dílny musí potvrdit GM (1–5 ★)');
  stars=workshopStars;
 }
 // Printed workshop records expose quality numerically; never invent it from standard craft rules.
 ok(whole(stars,1,5),'Dílna musí mít skutečnou kvalitu 1–5 ★');
 ok(Array.isArray(timeD6)&&timeD6.length===3&&timeD6.every(x=>whole(x,1,6))&&
  Array.isArray(timeOrigins)&&timeOrigins.length===3&&timeOrigins.every(validOrigin),'Nutné přesné 3d6 a auditní původ každé kostky');
 ok(!pendingAlchemyPreparations(journal,campaignId).some(r=>r.characterId===actorId),'Postava již připravuje jiný nepřerušený elixír');
 const durationDays=10+timeD6.reduce((a,b)=>a+b,0),dueMinute=minute+durationDays*DAY;
 ok(whole(dueMinute,0,1e9),'Konec přípravy překračuje dostupnou časovou osu');
 return {format:ALCHEMY_START_FORMAT,campaignId,minute,actorId,alchemyML,elixirName,principle:elixir.principle,
  convocation:elixir.convocation,sunsign,sunsignModifier:alchemySunsignModifier(sunsign,elixir.convocation),
  workshopSource,wealth:workshopSource==='private'?wealth:null,workshopStars:stars,workshopConfirmed:true,
  timeD6:[...timeD6],timeOrigins:[...timeOrigins],durationDays,dueMinute,inventoryCreated:false,
  ...(unique?{uniqueElixir:unique}:{}),sourcePages:[265,266,267,268]};
}
export function requireAlchemyGMTimeMayAdvance({journal=[],campaignId,beforeMinute,afterMinute}={}){
 for(const row of pendingAlchemyPreparations(journal,campaignId)){
  const p=row.calendarAlchemyStart;
  if(beforeMinute<=p.dueMinute&&afterMinute>p.dueMinute)
   throw Error('Alchemy: čas GM nesmí přeskočit konec nepřerušené přípravy '+p.elixirName+'. Zastavte v minutě '+p.dueMinute+' a doložte Preparation Roll.');
 }
 return true;
}
const attendedAt=(j,c,actor,start,finish)=>j.some(r=>r.calendarCampaignId===c&&r.characterId===actor&&r.campaignMinute>start&&r.campaignMinute<finish&&
 (r.skillTestProof||r.combatProof||r.calendarActivityProof||r.calendarTrekProof||r.calendarHerbPotionStart||r.calendarHerbPotionComplete||r.calendarAlchemyStart));
/** HMK p.268: any interruption forces a restart. Original start remains immutable.
 * Aborting before the final Preparation Roll never requires an invented roll.
 */
export function createAlchemyAbort({journal=[],campaignId,minute,actorId,startId,reason,gmConfirmed=false}={}){
 const row=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarAlchemyStart),p=row?.calendarAlchemyStart;
 ok(gmConfirmed===true,'Přerušení dlouhé přípravy musí potvrdit GM');
 ok(p&&p.actorId===actorId&&whole(minute,p.minute,p.dueMinute-1),
  'Alchemy: přerušení lze doložit pouze před konečným Preparation Roll');
 ok(typeof reason==='string'&&reason.trim().length>=3&&reason.trim().length<=240,'Doložte důvod přerušení');
 ok(!journal.some(x=>x.calendarCampaignId===campaignId&&(x.calendarAlchemyFinish?.startId===startId||x.calendarAlchemyAbort?.startId===startId)),
  'Alchemy: příprava už byla uzavřena');
 return {format:ALCHEMY_ABORT_FORMAT,campaignId,minute,actorId,startId,reason:reason.trim(),
  gmConfirmed:true,result:'ruined-by-interruption',sourcePage:268};
}
export function createAlchemyFinish({journal=[],campaignId,minute,actorId,startId,skillId,gmContinuityConfirmed=false,augmentationD10=[],augmentationOrigins=[],
 cfWillML=null,cfWillD10=null,cfWillOrigin=null,dissolutionD100=null,dissolutionOrigin=null,
 crucialShockML=null,crucialShockFatigue=null,crucialShockD100=null,crucialShockOrigin=null,criticalFailure:storedCriticalFailure=null}={}){
 const src=journal.find(x=>x.id===startId&&x.calendarCampaignId===campaignId&&x.calendarAlchemyStart),start=src?.calendarAlchemyStart;
 ok(start&&start.actorId===actorId&&whole(minute,0,1e9)&&minute===start.dueMinute,'Alchemy: Preparation Roll je možný pouze přesně na konci doložené přípravy');
 ok(!campaignRows(journal,campaignId).some(x=>x.calendarAlchemyFinish?.startId===startId||x.calendarAlchemyAbort?.startId===startId),'Příprava už byla ukončena');
 ok(!attendedAt(journal,campaignId,actorId,start.minute,minute),'Alchemy: doložená jiná činnost přerušila přípravu (HMK 268)');
 ok(gmContinuityConfirmed===true,'GM musí potvrdit nepřerušenou přípravu a koncentraci v pracovních hodinách (HMK 268)');
 const row=journal.find(x=>x.id===skillId),p=row?.skillTestProof,r=p?.a||p?.result;
 ok(row&&row.calendarCampaignId===campaignId&&row.characterId===actorId&&row.campaignMinute===minute&&
  p?.type==='secondary-mastery-value-test'&&(p.skills?.[0]||p.skill)==='Alchemy'&&
  p.secondarySkills?.[0]==='Herblore'&&p.secondarySkills?.[1]==='Mineralogy'&&
  p.secondaryRollResult?.routineId==='alchemy-elixir'&&
  r&&whole(r.ml,60,1000)&&r.ml>=60&&whole(r.roll,1,100)&&whole(r.index,6,100)&&Number.isSafeInteger(r.sv),
  'Vyžadován nový originální Alchemy SV ve Skill Workbench s Herblore, Mineralogy a Mathematics SR (HMK 268)');
 ok(!journal.some(x=>x.calendarAlchemyFinish?.skillId===skillId),'Preparation Roll už byl použit');
 ok(r.ml>=60,'Alchemy Create ML pod 60');
 if(start.uniqueElixir?.mode==='invent')ok(r.ml>=100,'Invent: skutečný Preparation Roll vyžaduje Alchemy ML 100+');
 const sm=r.secondary||[];
 ok(sm.length===2&&sm.every(x=>Number.isSafeInteger(x.index)&&x.modifier===secondaryModifier(x.index*10)),
  'Alchemy: Herblore/Mineralogy Secondary Modifiers neodpovídají původnímu Skill Testu');
 const sr=p.secondaryRollResult;
 ok(sr.name==='Mathematics'&&typeof sr.success==='boolean'&&sr.sourcePage===268&&
  (sr.roll===null&&sr.success===false||whole(sr.roll,1,10)&&whole(sr.tn,0,100)&&sr.success===(sr.roll<=sr.tn)),
  'Mathematics SR nemá pravidlový originální důkaz');
 ok(r.secondarySVBonus===(sr.success&&['S','CS'].includes(r.level)?1:0)||
   (r.secondarySVBonus===undefined&&r.sv===r.index+({CF:-2,F:-1,S:0,CS:1}[r.level])+(sr.success&&['S','CS'].includes(r.level)?1:0)),
  'Mathematics SR se nesmí přičítat dvakrát nebo při F/CF');
 ok(!p.helpers?.length||p.helpers.length<=2&&p.helpers.every(h=>whole(h.ml,40,1000)&&h.ml*2>=r.ml),
  'Alchemy: nejvýše dva způsobilí pomocníci (ML40+, alespoň polovina ML výrobce)');
 // Sunsign is an explicit GM modifier in the existing Skill Workbench; fail closed
 // rather than secretly adding it after the roll (that would change critical SL).
 ok(p.gmModifiers?.[0]===start.sunsignModifier,
  'Alchemy: GM modifier ve Skill Workbench musí přesně zahrnout Sunsign '+start.sunsignModifier+' (ostatní okolnosti zatím samostatně neřešíme)');
 // Backwards-compatible replay: nested immutable CF evidence is used to
 // reconstruct the original calculation, not trusted as an outcome.
 if(storedCriticalFailure){
  cfWillML??=storedCriticalFailure.willML;
  cfWillD10??=storedCriticalFailure.willD10;
  cfWillOrigin??=storedCriticalFailure.willOrigin;
  dissolutionD100??=storedCriticalFailure.dissolutionD100;
  dissolutionOrigin??=storedCriticalFailure.dissolutionOrigin;
  crucialShockML??=storedCriticalFailure.shockRoll?.ml??null;
  crucialShockFatigue??=storedCriticalFailure.shockRoll?.fatigue??null;
  crucialShockD100??=storedCriticalFailure.shockRoll?.d100??null;
  crucialShockOrigin??=storedCriticalFailure.shockRoll?.origin??null;
 }
 let criticalFailure=null;
 if(r.level==='CF'){
  ok(whole(cfWillML,1,1000)&&whole(cfWillD10,1,10)&&validOrigin(cfWillOrigin),
   'Critical Failure: vyžaduje skutečný Will SR d10, aktuální Will ML a původ hodu');
  const willIndex=indexOf(cfWillML),willSuccess=secondaryRoll(cfWillD10,willIndex);
  if(willSuccess)ok(dissolutionD100===null&&dissolutionOrigin===null,
   'Při úspěšném Will SR nesmí vzniknout fiktivní Alchemical Dissolution');
  else {
   ok(whole(dissolutionD100,1,100)&&validOrigin(dissolutionOrigin),
    'Critical Failure: neúspěšný Will SR vyžaduje skutečný d100 Alchemical Dissolution');
   // p.267: every dissolution roll ending in 0/5 also triggers a Shock Roll
   // against base SHK8. Exactly one d100 Shock test is mandatory here.
   if(dissolutionD100%5===0){
    ok(whole(crucialShockML,1,1000)&&whole(crucialShockFatigue,0,99999)&&
      whole(crucialShockD100,1,100)&&validOrigin(crucialShockOrigin),
      'Crucial Dissolution: vyžaduje skutečné Shock ML, Fatigue a Shock d100 s původem hodu');
   }else ok(crucialShockML===null&&crucialShockFatigue===null&&crucialShockD100===null&&crucialShockOrigin===null,
    'Běžná Dissolution nesmí obsahovat fiktivní Crucial Shock Roll');
  }
  const auralShockAdded=willSuccess?0:dissolutionD100<=60?1:dissolutionD100<=90?3:5;
  const crucialDissolution=!willSuccess&&dissolutionD100%5===0;
  const shockSL=crucialDissolution?successLevel(crucialShockD100,crucialShockML-crucialShockFatigue):null;
  const shockIndex=crucialDissolution?8+shockRollModifier(shockSL):null;
  const shockStates={none:'NONE',stunned:'STN',incapacitated:'INC',unconscious:'UNC',killed:'KIA'};
  const shockRoll=crucialDissolution?{ml:crucialShockML,fatigue:crucialShockFatigue,
   rawEML:crucialShockML-crucialShockFatigue,d100:crucialShockD100,origin:crucialShockOrigin,
   sl:Object.keys(SL).find(k=>SL[k]===shockSL),baseSHK:8,index:shockIndex,state:shockStates[shockStateFromIndex(shockIndex)],sourcePage:169}:null;
  if(willSuccess)ok(crucialShockML===null&&crucialShockFatigue===null&&crucialShockD100===null&&crucialShockOrigin===null,
    'Úspěšný Will SR nesmí vést k Shock Roll');
  criticalFailure={willML:cfWillML,willIndex,willD10:cfWillD10,willOrigin:cfWillOrigin,
   willSuccess,dissolutionD100:willSuccess?null:dissolutionD100,
   dissolutionOrigin:willSuccess?null:dissolutionOrigin,auralShockAdded,
   weaknessAdded:5*auralShockAdded,crucialDissolution,
   ...(crucialDissolution?{shockRoll}:{}),sourcePages:[267,268,190,...(crucialDissolution?[169]:[])]};
 }else ok(storedCriticalFailure===null&&cfWillML===null&&cfWillD10===null&&cfWillOrigin===null&&dissolutionD100===null&&dissolutionOrigin===null&&
  crucialShockML===null&&crucialShockFatigue===null&&crucialShockD100===null&&crucialShockOrigin===null,
  'Will SR a Dissolution smějí následovat pouze po Alchemy CF');
 const inventModifier=start.uniqueElixir?inventionSVPenalty({journal,campaignId,actorId,startId}):0;
 const sv=r.sv+inventModifier,numberOfRolls=criticalFailure&&!criticalFailure.willSuccess?0:sv>=5?Math.min(5,sv-4):0;
 ok(Array.isArray(augmentationD10)&&augmentationD10.length===numberOfRolls&&augmentationD10.every(x=>whole(x,1,10))&&
   Array.isArray(augmentationOrigins)&&augmentationOrigins.length===numberOfRolls&&augmentationOrigins.every(validOrigin),
  'Alchemy: počet a původ Augmentation d10 musí odpovídat SV');
 const augmentationSuccesses=augmentationD10.filter(x=>x<=start.workshopStars).length;
 return {format:ALCHEMY_FINISH_FORMAT,campaignId,minute,actorId,startId,skillId,elixirName:start.elixirName,
  alchemyML:r.ml,gmContinuityConfirmed:true,primaryRoll:r.roll,primaryLevel:r.level,secondaryModifiers:sm.map(x=>x.modifier),
  mathRoll:sr.roll,mathTN:sr.tn,mathSuccess:sr.success,sunsignModifier:start.sunsignModifier,
  preparationSV:sv,...(start.uniqueElixir?{rawPreparationSV:r.sv,inventionSVModifier:inventModifier,
   uniqueElixir:structuredClone(start.uniqueElixir)}:{}),workshopStars:start.workshopStars,augmentationD10:[...augmentationD10],
  augmentationOrigins:[...augmentationOrigins],augmentationSuccesses,
  ...(criticalFailure?{criticalFailure}:{}),result:criticalFailure&&!criticalFailure.willSuccess?'ruined-by-dissolution':sv<=2?'ruined':'completed',
  baseAS:criticalFailure&&!criticalFailure.willSuccess||sv<=2?null:6+augmentationSuccesses,
  physicalOutput:'not-yet-bound-to-inventory',sourcePages:[267,268]};
}
export function validateAlchemyJournal(journal=[]){
 const prior=[];
 for(const row of journal){
  const a=row.calendarAlchemyStart,f=row.calendarAlchemyFinish,b=row.calendarAlchemyAbort,p=a||f||b;
  if(p){ok(p.campaignId===row.calendarCampaignId&&p.actorId===row.characterId&&p.minute===row.campaignMinute,'Alchemy: nesoulad kampaně/postavy/času');
   const recreated=a?createAlchemyStart({journal:prior,...a}):f?createAlchemyFinish({journal:prior,...f}):createAlchemyAbort({journal:prior,...b});
   ok(JSON.stringify(p)===JSON.stringify(recreated),'Alchemy: historický důkaz byl změněn');
  }prior.push(row);
 }
 return true;
}
export function assertAlchemyAppendOnly(before=[],after=[]){const byId=new Map(after.map(r=>[r.id,r]));
 for(const r of before)if(r.calendarAlchemyStart||r.calendarAlchemyFinish||r.calendarAlchemyAbort)
  ok(JSON.stringify(byId.get(r.id))===JSON.stringify(r),'Alchemy: nelze smazat ani přepsat historický důkaz');
 return true;
}

/** Apply p.267 ordinary and crucial dissolution to existing Combat/Aural
 * state. No invented encounter, clock tick or extra health subsystem.
 * All dice are already immutable in the linked Alchemy Finish proof.
 */
export function applyAlchemyDissolution({state=null,arcane=null,proof,eventId}={}){
 const cf=proof?.criticalFailure;
 ok(proof?.format===ALCHEMY_FINISH_FORMAT&&proof.result==='ruined-by-dissolution'&&
  cf&&!cf.willSuccess&&whole(cf.auralShockAdded,1,5)&&
  cf.weaknessAdded===cf.auralShockAdded*5&&
  typeof eventId==='string'&&eventId.length>=3,
  'Alchemy Dissolution: neexistuje ověřený CF důkaz');
 const s=structuredClone(state??initialCombatState()),a=structuredClone(arcane??{});
 validateCombatState(s);
 ok(s.shock!=='KIA'&&!s.events.some(e=>e.id===eventId),
  'Alchemy Dissolution: postava zemřela nebo má duplicitní historický důkaz');
 const before=a.auralShockLevels??0;
 ok(whole(before,0,99)&&before+cf.auralShockAdded<=99&&
  s.fatigue.otherWeakness+cf.weaknessAdded<=99999,
  'Alchemy Dissolution: Aural Shock / Weakness mimo limit');
 const fatigueBefore=combatFatigueTotals(s).total;
 if(cf.crucialDissolution){
  const shock=cf.shockRoll;
  ok(shock&&shock.baseSHK===8&&shock.fatigue===fatigueBefore+cf.weaknessAdded&&
   s.shock==='NONE'&&!s.shockFollowup&&!s.extendedShock&&!s.coma?.active&&!s.bloodShockPending,
   'Crucial Dissolution: Shock musí vycházet ze skutečného Fatigue po Aural Shock a z nekolizního Combat State');
  // Reuse the authoritative Shock index and the *same* existing state and
  // Recovery queue as other non-combat Shock sources (e.g. Cold Water).
  ok(['STN','INC','UNC','KIA'].includes(shock.state),'Crucial Dissolution: nedoložený výsledný Shock State');
  const technicalRound=Math.max(1,s.lastRound||1); // schema field, NOT an elapsed combat round
  s.shock=shock.state;
  s.shockOriginRound=technicalRound;
  if(['INC','UNC','KIA'].includes(s.shock))s.posture.prone=true;
  if(['STN','INC','UNC'].includes(s.shock)){
   const dueRound=technicalRound+(s.shock==='UNC'?120:1);
   ok(dueRound<=9999,'Crucial Dissolution: Recovery překračuje rozsah kola');
   s.shockFollowup={kind:s.shock,originRound:technicalRound,timelineId:null,dueRound,
    phase:s.shock==='UNC'?'after-ten-minutes':'end-next-turn'};
  }else finalizeFatalState(s); // same canonical cleanup as other terminal Shock sources
 }
 a.auralShockLevels=before+cf.auralShockAdded;
 s.fatigue.otherWeakness+=cf.weaknessAdded;
 // calendarMinute is authoritative; event.round is a mandatory legacy field,
 // not evidence of a combat encounter or of automatic passage of time.
 s.events.push({id:eventId,type:'hmk-alchemy-dissolution-aural',round:Math.max(1,s.lastRound||1),
  details:{sourceEventId:eventId,alchemyStartId:proof.startId,auralShock:cf.auralShockAdded,
   weaknessAdded:cf.weaknessAdded,calendarMinute:proof.minute,dissolutionD100:cf.dissolutionD100,
   ...(cf.crucialDissolution?{crucialShock:structuredClone(cf.shockRoll),nonCombat:true}:{}),
   auralBefore:before,auralAfter:a.auralShockLevels,sourcePage:267}});
 validateCombatState(s);
 return {state:s,arcane:a,auralShockAdded:cf.auralShockAdded,shockState:cf.shockRoll?.state??null};
}
/** Backward-compatible name: existing v93.415 callers / imports. */
export function applyAlchemyNoncrucialDissolution(args){return applyAlchemyDissolution(args)}
