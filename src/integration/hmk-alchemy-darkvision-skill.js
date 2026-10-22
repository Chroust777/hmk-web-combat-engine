/** HMK v1.2 pp.269–271. Read-only Darkvision/CF light sensitivity in the
 * existing Skill Workbench. No new test, state, calendar, inventory or roll.
 * The GM must say whether this particular action USES sight and describe light;
 * skill names alone cannot establish those facts.
 */
import {activeDarkvision} from './hmk-alchemy-imbibing.js';
import {darkvisionHealingState} from './hmk-alchemy-darkvision-healing.js';

const requireTrue=(v,message)=>{if(!v)throw Error(message)};
export function darkvisionSkillContext({journal=[],campaignId,minute,actorId,visionUse='',light='',distanceFeet=null}={}){
 requireTrue(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9,'Darkvision: neplatný kontext kampaně či času');
 const active=activeDarkvision(journal,campaignId,actorId,minute);
 // Each source independently grants its own range; choose the greatest usable
 // range, NEVER sum strengths or invent an additional EML bonus.
 const ill=journal.filter(j=>j.calendarCampaignId===campaignId&&j.campaignMinute<=minute&&
  ((j.calendarAlchemyImbibing?.elixirName==='Darkvision'&&j.calendarAlchemyImbibing?.targetId===actorId&&
    j.calendarAlchemyImbibing?.illEffect?.kind==='vision-light-penalty'&&j.calendarAlchemyImbibing.finalAS>0)||
   (j.calendarAlchemyDarkvisionProfusionIll?.targetId===actorId&&j.calendarAlchemyDarkvisionProfusionIll?.illEffect?.kind==='vision-light-penalty')))
  .map(j=>darkvisionHealingState(journal,campaignId,j.id,minute))
  .filter(s=>!s.recovered);
 const a=active.reduce((best,x)=>!best||x.state.currentAS>best.state.currentAS?x:best,null),rangeFeet=a?a.state.currentAS*5:0;
 const sourceIds=[...active.map(x=>x.useId),...ill.map(s=>s.useId)].filter((id,i,arr)=>arr.indexOf(id)===i);
 if(!sourceIds.length)return {applies:false,modifier:0,sourceIds:[],rangeFeet:0};
 requireTrue(['sight','non-sight'].includes(visionUse),
  'Darkvision: GM musí určit, zda je konkrétní test založen na zraku, nebo jiném smyslu.');
 if(visionUse==='non-sight')return {applies:true,visionUse,light:null,modifier:0,rangeFeet,
  sourceIds,lightPenalty:0,reason:'GM potvrdil činnost bez využití zraku',sourcePages:[269,270,271]};
 requireTrue(['pitch-black','dim-shadow','bright'].includes(light),
  'Darkvision: GM musí doložit úplnou tmu, stín/šero nebo jasné/přímé světlo.');
 let checkedFeet=null;
 if(light==='pitch-black'&&!a)throw Error(
  'Darkvision: elixír již neposkytuje vidění ve tmě; čistě zrakový test v úplné tmě vyžaduje jiný doložený zdroj vidění.');
 if(light==='pitch-black'&&a){
  requireTrue(distanceFeet!==null&&Number.isSafeInteger(distanceFeet)&&distanceFeet>=0&&distanceFeet<=100000,
   'Darkvision: ve tmě je třeba doložit vzdálenost cíle ve stopách.');
  checkedFeet=distanceFeet;
  requireTrue(distanceFeet<=rangeFeet,
   'Darkvision: cíl je mimo účinný dosah '+rangeFeet+' ft v úplné tmě; zrakový test nelze tímto elixírem doložit.');
 }
 const penalty=light==='bright'?ill.reduce((sum,x)=>sum+x.activePenalty,0):0;
 return {applies:true,visionUse,light,checkedFeet,modifier:penalty?-penalty:0,lightPenalty:penalty,rangeFeet,
  sourceIds,illEffectIds:ill.map(x=>x.useId),activeUseId:a?.useId??null,activeUseIds:active.map(x=>x.useId),
  reason:penalty?'CF citlivost na světlo – postih jen při jasném/přímém světle':
   light==='pitch-black'&&a?'Vidění ve tmě v doloženém dosahu; žádný bonus k EML':
   'Bez zrakového postihu v doložených světelných podmínkách',sourcePages:[269,270,271]};
}
