/** HMK v1.2 pp.209,250–251,254,263,269–270,271–274.
 * Read-only source dossier for the existing arcane systems. This module
 * DOES NOT cast Detect, Reveal or Dispel, invoke Negation, issue a die,
 * alter AS, or write combat / calendar / inventory evidence.
 * A catalogue entry is not proof of an active magical effect.
 */
import {alchemyElixirStrength} from './hmk-alchemy-decay.js';
import {alchemyVialState} from './hmk-alchemy-vial-ledger.js';
import {canonicalProfusionProfile} from './hmk-alchemy-profusion.js';
import {CANONICAL_ALCHEMY_ELIXIRS} from './hmk-alchemy-preparation.js';

const assert=(value,message)=>{if(!value)throw Error('Alchemy Arcane: '+message)};
const minuteOK=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e9;
const knownActive=new Set(['Darkvision','Erudition','Footpad','Egosight']);
const principles=new Map(CANONICAL_ALCHEMY_ELIXIRS.map(x=>[x.name,x]));

/** Validated, immutable projection of a specific finished dose AT the current
 * GM minute. For storage, require the original still-full physical inventory
 * vial; for in-use Temporary only accept lifecycles reconstructed by the
 * existing four imbibing writers. No unverified instant-effect persistence.
 */
export function alchemyArcaneTargetDossier({journal=[],inventory=[],campaignId,minute,finishId}={}){
 assert(typeof campaignId==='string'&&campaignId.length>0&&minuteOK(minute)&&
  typeof finishId==='string'&&finishId.length>0&&Array.isArray(journal)&&Array.isArray(inventory),
  'chybí kampaň, čas, původní dokončená dávka nebo zdroje');
 const state=alchemyElixirStrength(journal,campaignId,finishId,minute);
 assert(state.completedMinute<=minute,'dávka ještě nebyla dokončena');
 const printed=canonicalProfusionProfile(state.elixirName);
 const principle=principles.get(state.elixirName);
 assert(principle,'unikátní neověřená receptura není kanonický magický cíl');
 const vial=alchemyVialState(journal,campaignId,finishId,minute);
 const inventoryItem=vial?.full?inventory.find(x=>x.id===vial.vialId&&
  x.characterId===vial.ownerId&&x.slot===vial.slot&&x.quantity===1):null;
 let phase='unavailable',sourceId=null,targetId=null,vialId=null,reason='';
 if(state.currentAS<=0){phase='ended';reason='Enchantment skončil při AS 0';}
 else if(vial?.full){
  assert(inventoryItem,'fyzická plná lahvička chybí v původním inventáři');
  phase='stored';vialId=vial.vialId;sourceId=vial.bindingId;targetId=vial.ownerId;
 }else if(state.activeTemporary&&state.imbibingId){
  assert(printed.use==='Imbibed'&&printed.duration==='Temporary',
   'nesoulad aktivního účinku s kanonickým trváním');
  assert(knownActive.has(state.elixirName),
   'životní cyklus dosud neimplementovaného aktivního elixíru není pro Arcane ověřen');
  const use=journal.find(x=>x.id===state.imbibingId&&x.calendarCampaignId===campaignId&&
   x.campaignMinute<=minute&&x.calendarAlchemyImbibing?.finishId===finishId);
  assert(use?.calendarAlchemyImbibing?.temporary===true&&
   use.calendarAlchemyImbibing.elixirName===state.elixirName&&
   typeof use.calendarAlchemyImbibing.targetId==='string'&&use.calendarAlchemyImbibing.targetId,
   'chybí původní dohledatelné požití a příjemce');
  phase='active';sourceId=use.id;targetId=use.calendarAlchemyImbibing.targetId;
 }else if(state.imbibingId||state.dispersed){
  phase='used-instant-or-ended';reason='Instantaneous po použití již není cílem těchto incantations (HMK 270)';
 }else{reason='Dávka nemá prokazatelnou fyzickou lahvičku ani účinný Temporary stav';}
 if(['stored','active'].includes(phase)){
  assert(state.nextDueMinute===null||minute<state.nextDueMinute,
   'chybí povinný měsíční d10 Decay; aktuální AS není ověřena');
 }
 const targetable=['stored','active'].includes(phase);
 const currentAS=targetable?state.currentAS:null;
 return Object.freeze({finishId,campaignId,minute,elixirName:state.elixirName,
  use:printed.use,duration:printed.duration,principle:principle.principle,
  convocation:principle.convocation,phase,targetable,sourceId,targetId,vialId,
  currentAS,dispelEMLPenalty:targetable?-currentAS*5:null,
  detectCategory:targetable?'Elixir':null,
  applicable:targetable?Object.freeze(['Detect','Reveal','Dispel','Negation']):Object.freeze([]),
  requirements:Object.freeze({
   detect:'Skutečné seslání Detect; rozsah SI × 5 ft (p.251)',
   reveal:'Úspěšný Detect stejného zdroje; skutečné seslání Reveal; případné Ward (p.254)',
   dispel:'Úspěšné Detect + Reveal stejného zdroje; Ward odstraněn; LOS; EML postih −AS×5 (p.251)',
   negation:'Skutečně vyvolaná Negation a původní prostorová oblast; neautomatické odstranění (p.263)'}),
  ...(reason?{reason}:{}),sourcePages:Object.freeze([209,251,254,263,270])});
}

/** Read-only count for the campaign UI; a broken, unknown or overdue source
 * is reported explicitly, never silently omitted from the target register.
 */
export function alchemyArcaneTargetRegister({journal=[],inventory=[],campaignId,minute}={}){
 assert(Array.isArray(journal)&&Array.isArray(inventory)&&typeof campaignId==='string'&&campaignId&&minuteOK(minute),
  'neplatný kontext přehledu');
 return journal.filter(r=>r.calendarCampaignId===campaignId&&r.campaignMinute<=minute&&
  r.calendarAlchemyFinish?.result==='completed').map(row=>{
  try{return {finishId:row.id,dossier:alchemyArcaneTargetDossier({journal,inventory,campaignId,minute,finishId:row.id}),error:null};}
  catch(error){return {finishId:row.id,dossier:null,error:String(error.message||error)};}
 });
}
