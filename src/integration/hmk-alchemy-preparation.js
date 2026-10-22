/** HMK v1.2 pp.265–268. The initial canonical preparation stage.
 * Uses existing campaign journal, GM clock and Skill Workbench SV proof.
 * Deliberately NO duplicate inventory, magic effects, or timer authority.
 * CF / dissolution are withheld pending their actual Will/Shock witnesses.
 */
import {workshopQuality} from '../rules/craft-workshop-p121.js';
import {secondaryModifier} from '../rules/tests.js';
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
export function pendingAlchemyPreparations(journal=[],campaignId){
 return campaignRows(journal,campaignId).filter(r=>r.calendarAlchemyStart&&!campaignRows(journal,campaignId).some(x=>x.calendarAlchemyFinish?.startId===r.id||x.calendarAlchemyAbort?.startId===r.id));
}
export function createAlchemyStart({journal=[],campaignId,minute,actorId,alchemyML,elixirName,sunsign,
 workshopSource='private',wealth=null,workshopStars=null,workshopConfirmed=false,
 timeD6=[],timeOrigins=[]}={}){
 ok(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&whole(minute,0,1e9),'Alchemy: chybí kampaň, postava nebo platný čas GM');
 ok(whole(alchemyML,60,1000),'Alchemy Create vyžaduje ML 60+');
 const elixir=CANONICAL_ALCHEMY_ELIXIRS.find(x=>x.name===elixirName);
 ok(elixir,'Alchemy: neznámý kanonický elixír (HMK 271–274)');
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
  timeD6:[...timeD6],timeOrigins:[...timeOrigins],durationDays,dueMinute,inventoryCreated:false,sourcePages:[265,266,267,268]};
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
export function createAlchemyFinish({journal=[],campaignId,minute,actorId,startId,skillId,gmContinuityConfirmed=false,augmentationD10=[],augmentationOrigins=[]}={}){
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
 ok(['S','CS','F'].includes(r.level),'Critical Failure vyžaduje Will SR a možnou Alchemical Dissolution; v této etapě nelze CF falešně dokončit');
 const sv=r.sv,numberOfRolls=sv>=5?Math.min(5,sv-4):0;
 ok(Array.isArray(augmentationD10)&&augmentationD10.length===numberOfRolls&&augmentationD10.every(x=>whole(x,1,10))&&
   Array.isArray(augmentationOrigins)&&augmentationOrigins.length===numberOfRolls&&augmentationOrigins.every(validOrigin),
  'Alchemy: počet a původ Augmentation d10 musí odpovídat SV');
 const augmentationSuccesses=augmentationD10.filter(x=>x<=start.workshopStars).length;
 return {format:ALCHEMY_FINISH_FORMAT,campaignId,minute,actorId,startId,skillId,elixirName:start.elixirName,
  alchemyML:r.ml,gmContinuityConfirmed:true,primaryRoll:r.roll,primaryLevel:r.level,secondaryModifiers:sm.map(x=>x.modifier),
  mathRoll:sr.roll,mathTN:sr.tn,mathSuccess:sr.success,sunsignModifier:start.sunsignModifier,
  preparationSV:sv,workshopStars:start.workshopStars,augmentationD10:[...augmentationD10],
  augmentationOrigins:[...augmentationOrigins],augmentationSuccesses,
  result:sv<=2?'ruined':'completed',baseAS:sv<=2?null:6+augmentationSuccesses,
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
