/** HMK Kèthîra v1.2 pp.203–204, 255: one READ-ONLY Neutral Chaos Storm
 * (Vortex) adjudication. No new spell/health/inventory state is created.
 *
 * Its inputs are GM-attested LIVE spatial/census snapshots, NOT assertions
 * reconstructed from campaign history. In particular a complete Source Census
 * and random selection are external mandatory evidence; missing proof fails
 * closed. No code using this module may treat mayCommit:false as authorisation
 * to persist a spellfire, a turn, or a Vortex effect.
 */
import {successLevel} from '../rules/tests.js';
const levels=['CF','F','S','CS'];
const whole=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const check=(p,msg)=>{if(!p)throw Error('Neutral Vortex: '+msg)};
const categories=['Active spell','Active talent','Artefact enchantment','Elixir','Raw Principle','Rune object'];
const at=(o)=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/** HMK p.255 special source ML. Round computed fractions normally, p.7. */
export function neutralVortexSpecialML(source){
 check(source&&categories.includes(source.category),'neověřená kategorie magické energie');
 const v=(n)=>whole(n,0,1000);
 switch(source.category){
  case 'Active spell': {
   const cl=source.spell==='Ward'?source.wardLevel:source.complexityLevel;
   check(v(cl)&&(source.spell!=='Ward'||whole(cl,1,100))&&
    ['Instantaneous','Temporary','Indefinite','Permanent'].includes(source.duration),
    'Active spell potřebuje CL/WL a doložené trvání');
   check(source.spell!=='Ward'||source.duration==='Indefinite',
    'Ward je Indefinite active spell');
   return cl*(['Indefinite','Permanent'].includes(source.duration)?10:5);
  }
  case 'Active talent':
   check(v(source.talentIndex)&&['Temporary','Indefinite'].includes(source.duration),
    'Active talent vyžaduje původní Talent Index a trvání');
   return Math.round(source.talentIndex*(source.duration==='Indefinite'?10:5)/2);
  case 'Artefact enchantment':
   if(source.activeLatent===true){
    check(v(source.complexityLevel)&&['Instantaneous','Temporary','Indefinite','Permanent'].includes(source.duration),
     'aktivovaný latentní enchantment vyžaduje původní CL a trvání');
    return source.complexityLevel*(['Indefinite','Permanent'].includes(source.duration)?10:5);
   }
   check(v(source.complexityLevel),'artefaktový enchantment vyžaduje CL');
   return source.complexityLevel*10;
  case 'Elixir':
   check(whole(source.currentAS,1,100),'elixír vyžaduje platnou aktuální AS');
   return source.currentAS*5;
  case 'Raw Principle':
   return 60;
  case 'Rune object':
   check(v(source.runecraftSI),'Rune object vyžaduje Runecraft SI');
   return source.runecraftSI*5;
 }
}
/** Adjudicate one selected Vortex centre, every affected source, ward FIRST,
 * F/CF physical d20 duration, and radius increase. The caller supplies
 * a witnessed random choice; this function does NOT randomly choose for GM.
 * A previously suppressed source must be removed from the live census by
 * the original time- and history-aware engine (not implemented here).
 */
export function neutralVortexRoundPreflight({spellCL,roundOffset,origin,
 radiusFeet=2.5,sources,gmCompleteCensusConfirmed=false,
 selectedSourceId=null,gmRandomSelectionConfirmed=false,selectionProof=null,
 rolls=[]}={}){
 check(whole(spellCL,1,6)&&whole(roundOffset,0,spellCL-1),
  'neplatný spell CL nebo fáze trvání Chaos Storm');
 check(at(origin)&&Number.isFinite(radiusFeet)&&radiusFeet>=2.5&&
  radiusFeet<=spellCL*10&&radiusFeet<=2.5+5*roundOffset&&
  (Number.isInteger((radiusFeet-2.5)/5)||radiusFeet===spellCL*10),
  'chybí původní geometrie nebo byla překročena možná expanze poloměru');
 check(Array.isArray(sources)&&gmCompleteCensusConfirmed===true,
  'vyžaduje úplný GM potvrzený soupis všech aktivních zdrojů');
 check(Array.isArray(rolls),'chybí původní d100/d20 hody');
 const ids=new Set();
 for(const s of sources){
  check(typeof s?.id==='string'&&s.id.length>0&&!ids.has(s.id)&&at(s)&&s.verified===true,
   'neunikátní zdroj bez ověřené polohy nebo původu');
  ids.add(s.id);
  neutralVortexSpecialML(s);
 }
 const byId=new Map(sources.map(s=>[s.id,s]));
 for(const s of sources){
  if(s.protectedByWardId!=null){
   const ward=byId.get(s.protectedByWardId);
   check(s.id!==s.protectedByWardId&&ward?.category==='Active spell'&&ward.spell==='Ward'&&
    ward.protectsSourceId===s.id&&dist(ward,s)<1e-7,
    'ochranný Ward musí být samostatný původní zdroj na totožném místě');
  }
  if(s.category==='Active spell'&&s.spell==='Ward'){
   check(typeof s.protectsSourceId==='string'&&
    byId.get(s.protectsSourceId)?.protectedByWardId===s.id,
    'Ward bez původního doloženého chráněného zdroje');
  }
 }
 const roamingFeet=spellCL*10;
 const eligible=sources.filter(s=>dist(s,origin)+radiusFeet<=roamingFeet+1e-8);
 let centre=origin;
 if(eligible.length){
  if(eligible.length===1){
   check(selectedSourceId===eligible[0].id,
    'jediný dostupný zdroj musí být vybrán bez náhodného výběru');
  }else{
   check(gmRandomSelectionConfirmed===true&&typeof selectionProof==='string'&&
    selectionProof.trim().length>=3&&eligible.some(s=>s.id===selectedSourceId),
    'náhodný cíl musí být doložen mezi všemi dostupnými zdroji');
  }
  centre=byId.get(selectedSourceId);
 }else{
  check(selectedSourceId===null&&selectionProof===null&&rolls.length===0,
   'bez dosažitelného magického zdroje se Vortex nepřemisťuje');
 }
 const inside=sources.filter(s=>dist(s,centre)<=radiusFeet+1e-8);
 const insideIds=new Set(inside.map(s=>s.id)),processed=new Set(),suppressedWards=new Set();
 const outcomes=[],blocked=[];
 for(const r of rolls){
  check(r&&typeof r.sourceId==='string'&&insideIds.has(r.sourceId)&&!processed.has(r.sourceId),
   'hod musí odpovídat právě jednomu skutečně zasaženému zdroji');
  const src=byId.get(r.sourceId);
  if(src.protectedByWardId&&!suppressedWards.has(src.protectedByWardId)){
   check(false,'nejprve se musí vyhodnotit ochranný Ward');
  }
  check(whole(r.d100,1,100),'každý zdroj vyžaduje skutečný fyzický d100');
  const targetML=neutralVortexSpecialML(src),sl=levels[successLevel(r.d100,targetML)];
  const affected=['F','CF'].includes(sl);
  check(affected?whole(r.d20,1,20):r.d20==null,
   'selhání vyžaduje fyzický d20 trvání, úspěch jej nesmí obsahovat');
  processed.add(src.id);
  if(src.spell==='Ward'&&affected)suppressedWards.add(src.id);
  outcomes.push(Object.freeze({sourceId:src.id,category:src.category,targetML,
   physicalD100:r.d100,successLevel:sl,
   suppressed:affected,duration:affected?r.d20:null,
   unit:sl==='CF'?'hours':sl==='F'?'rounds':null,
   immuneForThisRound:!affected,casterPsycheStress:sl==='CS'?1:0,
   permanentASLoss:0}));
 }
 for(const src of inside){
  if(processed.has(src.id))continue;
  if(src.protectedByWardId&&insideIds.has(src.protectedByWardId)&&
   processed.has(src.protectedByWardId)&&!suppressedWards.has(src.protectedByWardId)){
   blocked.push(src.id);continue;
  }
  check(false,'chybí povinný fyzický d100 pro všechny zasažené zdroje');
 }
 const grew=outcomes.some(r=>r.suppressed);
 return Object.freeze({format:'hmk-neutral-vortex-round-preflight-v1',sourcePages:[203,204,255],
  spellCL,roundOffset,origin:Object.freeze({x:origin.x,y:origin.y}),
  centre:Object.freeze({x:centre.x,y:centre.y}),selectedSourceId,
  selectionProof,roamingFeet,radiusBeforeFeet:radiusFeet,
  radiusNextFeet:grew?Math.min(roamingFeet,radiusFeet+5):radiusFeet,
  inRadiusSourceIds:Object.freeze(inside.map(s=>s.id)),
  outcomes:Object.freeze(outcomes),wardBlockedSourceIds:Object.freeze(blocked),
  casterPsycheStress:outcomes.reduce((sum,r)=>sum+r.casterPsycheStress,0),
  mayCommit:false,
  requiredForCommit:['authoritative spellfire and Spirit history','source census replay',
   'GM-random target proof','live combat positions each turn','suppression expiry and Ward lifecycle',
   'original Initiative and Combat State writer']});
}
