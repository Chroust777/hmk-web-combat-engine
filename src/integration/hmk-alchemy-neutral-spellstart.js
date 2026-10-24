/** HMK v1.2 pp.160–162,182,200–203,251,254: ordinary Neutral
 * SPELLSTART, including bounded Ward (Neutral II, 60 rounds, touch) and
 * verified replacement of a weaker historical Ward only. Uses the existing multi-round Initiative commitment and
 * the existing single-record CAS. An authoritative spellfire will be a
 * separate operation after the whole required concentration interval.
 * Never calls this a successful casting or changes target AS.
 */
import {alchemyArcaneTargetDossier} from './hmk-alchemy-arcane-targets.js';
import {activeAlchemyWard} from './hmk-neutral-ward-lifecycle.js';
import {alchemyArcaneCasterDossier,neutralSpellMastery,neutralCastingTimeRounds} from './hmk-alchemy-arcane-casting-readiness.js';
import {validateEncounterSequence,currentEncounterActor,finishEncounterTurn,concentrationInterruptionReason} from './encounter-turn-sequence.js';
import {validateCombatState} from './persistent-combat-state.js';
import {persistVerifiedCombatSnapshot} from './verified-combat-storage.js';
const cp=structuredClone,js=JSON.stringify;
const ok=(v,m)=>{if(!v)throw Error('Neutral Spellstart: '+m)};
export function prepareNeutralAlchemySpellstart({document,id,casterId,finishId,spell,
 distanceFeet,targetKind='Elixir',gmWardTargetConfirmed=false,gmSupersedeWardConfirmed=false,createdAt=new Date().toISOString(),gmCantGestureConfirmed=false,gmOrdinaryConditionsConfirmed=false,
 gmWardAbsentConfirmed=false,gmTouchConfirmed=false,gmConfirmed=false}={}){
 ok(gmConfirmed===true&&gmCantGestureConfirmed===true&&gmOrdinaryConditionsConfirmed===true,
  'GM musí potvrdit skutečný Incant, spoken cant, normal gesture a obyčejné podmínky');
 ok(typeof id==='string'&&id.length>=3&&id.length<=120&&
  typeof casterId==='string'&&casterId&&typeof finishId==='string'&&finishId,
  'chybí unikátní ID, postava či alchymistický zdroj');
 ok(typeof createdAt==='string'&&!Number.isNaN(Date.parse(createdAt)),
  'chybí platné datum neměnného deníkového důkazu');
 ok(['Detect','Reveal','Dispel','Ward'].includes(spell),'jen podporovaná Neutral kouzla');
 ok(document&&Array.isArray(document.characters)&&Array.isArray(document.journal)&&
  Array.isArray(document.inventory),'chybí původní kampaň');
 ok(!document.journal.some(x=>x.id==='neutral-spellstart:'+id||x.combatProof?.sourceEventId===id),
  'opakované ID důkazu');
 const seq=validateEncounterSequence(document.combatRuntime?.sequence),states={};
 document.characters.forEach(c=>{if(c.hmk?.combatState)states[c.id]=validateCombatState(c.hmk.combatState)});
 ok(seq.order.every(who=>states[who]),'chybí trvalý Combat State účastníka');
 ok(seq.active===true&&currentEncounterActor(seq)===casterId&&!seq.interruptActiveId&&
  !seq.pendingEndTurnAction,'spellstart smí začít jen na vlastním aktivním IR');
 ok(!seq.commitments?.[casterId]||['completed','abandoned'].includes(seq.commitments[casterId].status),
  'nelze zahájit druhé kouzlo během koncentrace');
 const caster=document.characters.find(x=>x.id===casterId),proof=alchemyArcaneCasterDossier(caster);
 ok(proof.verified&&proof.known.includes('Neutral::'+spell),'chybí skutečně naučené kouzlo');
 ok(!caster.hmk.arcane?.auralShockLevels&&!caster.hmk.arcane?.activeMisfireWarp&&
  !(caster.hmk.arcane?.misfireLostSpells??[]).includes('Neutral::'+spell),
  'aktivní Aural/Misfire následky zabraňují sesílání');
 ok(!concentrationInterruptionReason(states[casterId])&&states[casterId].shock==='NONE',
  'živý Combat State znemožňuje koncentraci');
 ok(states[casterId].wounds.length===0&&states[casterId].fatigue&&
  caster.hmk.arcane?.verifiedGestureEncumbrance===0,
  'odlišná gestikulace, zbroj či zranění potřebují doložený casting modifier');
 const campaignId=document.campaignClock?.campaignId??document.campaignClock?.id;
 ok(typeof campaignId==='string'&&campaignId,'chybí ověřené ID kampaně');
 const minute=document.campaignClock?.minute;
 ok(Number.isSafeInteger(minute)&&minute>=0,'chybí původní GM minuta');
 const target=alchemyArcaneTargetDossier({journal:document.journal,inventory:document.inventory,
  campaignId,minute,finishId});
 ok(target.targetable&&target.currentAS>=1,'cílový enchantment není aktivní');
 const rules=neutralSpellMastery(proof.neutralML,spell),durationRounds=neutralCastingTimeRounds(spell);
 ok(['Elixir','Ward'].includes(targetKind),'neověřený druh magického zdroje');
 ok(rules.spellML>=1&&Number.isFinite(distanceFeet)&&distanceFeet>=0&&
  distanceFeet<=rules.rangeFeet,'cíl mimo ověřený dosah');
 const existingWard=activeAlchemyWard({journal:document.journal,campaignId,finishId,sourceId:target.sourceId});
 const sourceId=targetKind==='Ward'?existingWard?.wardProofId:target.sourceId;
 if(targetKind==='Ward'){
  ok(spell!=='Ward'&&existingWard&&gmWardTargetConfirmed===true,
   'cílení Wardu vyžaduje aktivní původní Ward a GM potvrzení');
 }else if(spell==='Ward'){
  ok(gmTouchConfirmed===true&&distanceFeet===0,'Ward vyžaduje doložený dotyk cíle');
  if(existingWard){
   ok(gmSupersedeWardConfirmed===true,
    'překrytí (přebití) dřívějšího Wardu vyžaduje výslovné potvrzení GM');
   // Bounded safety: even ordinary S must be stronger; a CS-only
   // supersession needs its own adjudication before beginning 60 rounds.
   ok(Math.round(rules.spellSI/2)>existingWard.wardLevel,
    'nový Ward nepřebije předchozí WL při obvyklém S; tuto variantu nelze bezpečně zahájit');
  }else ok(gmSupersedeWardConfirmed!==true,'neexistující Ward nelze přebít');
 }else{
  ok(gmWardAbsentConfirmed===true&&!existingWard,'zdroj chrání aktivní Ward nebo chybí GM potvrzení');
 }
 // Reveal and Dispel must only be started after the *same caster* has completed
 // the appropriate prior spells targeting the same unchanged source.
 if(['Reveal','Dispel'].includes(spell)){
  const history=document.journal.filter(j=>j.calendarCampaignId===campaignId&&
   j.calendarAlchemyNeutralCast?.casterId===casterId&&
   j.calendarAlchemyNeutralCast?.finishId===finishId&&
   j.calendarAlchemyNeutralCast?.sourceId===sourceId&&
   j.calendarAlchemyNeutralCast?.castingSL&&['S','CS'].includes(j.calendarAlchemyNeutralCast.castingSL));
  ok(history.some(h=>h.calendarAlchemyNeutralCast.spell==='Detect'),
   'Reveal/Dispel vyžaduje původní úspěšný Detect stejného zdroje');
  if(spell==='Dispel')ok(history.some(h=>h.calendarAlchemyNeutralCast.spell==='Reveal'),
   'Dispel vyžaduje původní úspěšný Reveal stejného zdroje');
 }
 const out=cp(document),original=js(document),q=validateEncounterSequence(cp(seq));
 q.log.push({type:'neutral-incant-spellstart',eventId:id,actorId:casterId,
  spell,finishId,sourceId,round:q.round,
  durationRounds,gmConfirmed:true});
 const committed=finishEncounterTurn(q,states,{action:'concentrate-start',durationRounds,gmConfirmed:true});
 ok(!committed.pendingEndTurnAction,'splatný Shock/Morale blokuje spellstart');
 out.combatRuntime.sequence=committed;
 out.combatRuntime.clock={round:committed.round,actorId:currentEncounterActor(committed)||''};
 out.journal.push({id:'neutral-spellstart:'+id,characterId:casterId,createdAt,
  calendarCampaignId:campaignId,campaignMinute:minute,
  title:'Neutral '+spell+' – Spellstart, kolo '+seq.round,
  body:'GM potvrzený začátek Incant; kouzlo ještě není sesláno.',
  combatProof:{actionKind:'neutral-spellstart',sourceEventId:id,spell,casterId,
   finishId,sourceId,castingTimeRounds:durationRounds,
   startRound:seq.round,timelineId:seq.timelineId,spellML:rules.spellML,
   gmConfirmed:true,...(spell==='Ward'?{touchConfirmed:true,...(existingWard?{priorWardProofId:existingWard.wardProofId,priorWardLevel:existingWard.wardLevel}:{})}:{}),
   ...(targetKind==='Ward'?{targetKind:'Ward',targetWardProofId:sourceId}:{})}});
 ok(js(document)===original,'předvýpočet nesmí změnit původní kampaň');
 return {format:'hmk-neutral-spellstart-plan-v1',id,casterId,finishId,spell,
  distanceFeet,targetKind,gmWardTargetConfirmed:targetKind==='Ward',gmSupersedeWardConfirmed:spell==='Ward'&&Boolean(existingWard),
  createdAt,gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,
  gmWardAbsentConfirmed:spell==='Ward'||targetKind==='Ward'?false:true,gmTouchConfirmed:spell==='Ward',
  gmConfirmed:true,sequenceWitness:js(seq),
  documentWitness:original,readyForSpellfire:false,
  nextDocument:out};
}
export function persistNeutralAlchemySpellstart({stage,document,storage,key,baseline}={}){
 ok(stage?.format==='hmk-neutral-spellstart-plan-v1'&&js(document)===stage.documentWitness,
  'neúplný, starý nebo změněný spellstart');
 const {nextDocument,documentWitness,sequenceWitness,...recheck}=stage;
 const fresh=prepareNeutralAlchemySpellstart({document,id:stage.id,casterId:stage.casterId,
  finishId:stage.finishId,spell:stage.spell,distanceFeet:stage.distanceFeet,
  targetKind:stage.targetKind??'Elixir',gmWardTargetConfirmed:stage.targetKind==='Ward',
  gmSupersedeWardConfirmed:stage.gmSupersedeWardConfirmed===true,createdAt:stage.createdAt,
  gmCantGestureConfirmed:true,gmOrdinaryConditionsConfirmed:true,
  gmWardAbsentConfirmed:stage.spell!=='Ward'&&stage.targetKind!=='Ward',
  gmTouchConfirmed:stage.spell==='Ward',gmConfirmed:true});
 ok(js(fresh)===js(stage),'podvržený nebo neaktuální spellstart');
 const serialized=js(fresh.nextDocument);
 const saved=persistVerifiedCombatSnapshot({storage,key,baseline,serialized});
 return {...saved,document:saved.ok?fresh.nextDocument:null,serialized:saved.ok?serialized:null};
}
