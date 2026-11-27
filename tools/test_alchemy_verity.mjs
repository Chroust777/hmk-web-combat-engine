import assert from 'node:assert/strict';
import {createAlchemyVerityImbibing,applyAlchemyVerityAural,activeVerity,validateAlchemyImbibingJournal,
 createVerityProfusionIll,applyVerityProfusionAural,validateVerityProfusionJournal} from '../src/integration/hmk-alchemy-imbibing.js';
import {createAlchemyVialBinding,createAlchemyVialEmpty} from '../src/integration/hmk-alchemy-vial-ledger.js';
import {createAlchemyDecay} from '../src/integration/hmk-alchemy-decay.js';
import {createVerityReveal,verityStatus,validateVerityRevealJournal,assertVerityRevealAppendOnly}
 from '../src/integration/hmk-alchemy-verity.js';
import {availableSpellAuralRecoveries,persistSpellAuralRecovery} from '../src/integration/hmk-spell-aural-recovery.js';
import {PRINTED_VIAL} from '../src/integration/hmk-herbal-vial-ledger.js';

const campaignId='test',actorId='imbiber',minute=100;
const row=(id,field,proof,time=minute)=>({id,characterId:actorId,calendarCampaignId:campaignId,campaignMinute:time,
 [field]:proof});
function consume(tag,d100,baseAS=6,prior=[]){
 const finishId=tag+'-finish',emptyId=tag+'-empty',vialId=tag+'-vial';
 const inventory=[{id:vialId,characterId:actorId,sourceItemId:PRINTED_VIAL,slot:'carried',
  quantity:1,snapshot:{properties:{weightLb:0.25}}}];
 const dose={campaignId,actorId,minute,result:'completed',elixirName:'Verity',baseAS};
 const filled=[...prior,baseAS>=6?row(finishId,'calendarAlchemyFinish',dose):
  row(finishId,'calendarAlchemyStartingDose',{...dose,selection:{index:6}})];
 const context={campaignId,minute,actorId,finishId,inventory};
 const bound=createAlchemyVialBinding({...context,journal:filled,vialId,confirmedByGM:true,
  storageAtCompletionConfirmed:true,liquidConfirmed:true,material:'glass',corkConfirmed:true});
 const journal=[...filled,row(tag+'-bound','calendarAlchemyVialBinding',bound)];
 const proof=createAlchemyVerityImbibing({...context,journal,targetId:actorId,testSkill:'Aura',ml:75,
  d100,origin:'manual',emptyId,gmConfirmed:true});
 const empty=createAlchemyVialEmpty({...context,journal,reason:'Verity consumed',confirmedByGM:true});
 return {proof,journal:[...journal,row(emptyId,'calendarAlchemyVialEmpty',empty),row(tag,'calendarAlchemyImbibing',proof)]};
}
const first=consume('verity-one',11);
assert.equal(first.proof.finalAS,6);
assert.equal(validateAlchemyImbibingJournal(first.journal),true);
const context={campaignId,minute,actorId,journal:first.journal,auralShockLevels:0,
 illusionReference:'Obraz brány',mode:'visual',distanceFeet:60,gmConfirmed:true};
const visual=createVerityReveal(context);
assert.deepEqual(visual.sources,[{useId:'verity-one',as:6}]);
assert.throws(()=>createVerityReveal({...context,distanceFeet:60.01}),/60 ft/);
assert.throws(()=>createVerityReveal({...context,distanceFeet:null}),/60 ft/);
assert.throws(()=>createVerityReveal({...context,auralShockLevels:1}),/Aural Shock/);
assert.throws(()=>createVerityReveal({...context,gmConfirmed:false}),/GM/);
const direct=createVerityReveal({...context,mode:'direct',distanceFeet:null,illusionReference:'Hlas působící na příjemce'});
const sightings=[...first.journal,row('seeing','calendarAlchemyVerityReveal',visual),
 row('direct','calendarAlchemyVerityReveal',direct)];
assert.doesNotThrow(()=>validateVerityRevealJournal(sightings));
assert.throws(()=>assertVerityRevealAppendOnly(sightings,sightings.slice(0,-1)),/nelze/);
assert.throws(()=>createVerityReveal({...context,journal:sightings}),/už byla/);
assert.equal(activeVerity(sightings,campaignId,actorId,minute)[0].state.currentAS,6);

const second=consume('verity-two',83,6,sightings);
assert.equal(second.proof.sl,'CF');
assert.equal(second.proof.profusionCF,true);
const secondary=createVerityProfusionIll({journal:second.journal,campaignId,minute,triggerUseId:'verity-two',
 sourceUseId:'verity-one',targetId:actorId});
const own=applyAlchemyVerityAural({proof:second.proof,eventId:'verity-two'});
assert.equal(availableSpellAuralRecoveries({characters:[{id:actorId,hmk:{arcane:own.arcane,healthState:own.state,
 attributes:{wil:15}}}]}).length,1);
const mixed=applyVerityProfusionAural({...own,journal:second.journal,proof:secondary,eventId:'secondary-verity'});
assert.equal(mixed.arcane.auralShockLevels,2);
assert.equal(mixed.state.fatigue.otherWeakness,10);
const committed=[...second.journal,row('secondary-verity','calendarAlchemyVerityProfusionIll',secondary)];
assert.equal(validateVerityProfusionJournal(committed),true);
assert.throws(()=>validateVerityProfusionJournal(second.journal),/chybí důkaz/);
const document={characters:[{id:actorId,hmk:{arcane:mixed.arcane,healthState:mixed.state,attributes:{wil:15}}}],
 journal:committed};
const store=new Map([['ledger',JSON.stringify(document)]]);
const storage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
assert.equal(verityStatus({...context,journal:committed,auralShockLevels:2}).active,false);
const recovered=persistSpellAuralRecovery({document,characterId:actorId,eventId:'recovered',gameDay:2,d100:5,
 gmConfirmed:true,gmConfirmedDayElapsed:true,storage,key:'ledger',baseline:storage.getItem('ledger')});
assert.equal(recovered.ok,true);
const shock=recovered.document.characters[0].hmk.arcane.auralShockLevels;
assert.equal(shock,0);
assert.equal(verityStatus({...context,journal:recovered.document.journal,auralShockLevels:shock}).active,true);

const weak=consume('faint-verity',11,1);
const due=activeVerity(weak.journal,campaignId,actorId,minute)[0].state.nextDueMinute;
assert.throws(()=>createVerityReveal({...context,journal:weak.journal,minute:due}),/Decay/);
const decay=createAlchemyDecay({journal:weak.journal,campaignId,actorId,finishId:'faint-verity-finish',minute:due,
 d10:1,origin:'manual',gmConfirmed:true});
assert.equal(activeVerity([...weak.journal,row('decay','calendarAlchemyDecay',decay,due)],campaignId,actorId,due).length,0);
const nullDose=consume('zero-verity',95,2);
assert.equal(nullDose.proof.finalAS,0);
assert.equal(nullDose.proof.illEffect,null);
assert.deepEqual(activeVerity(nullDose.journal,campaignId,actorId,minute),[]);
console.log('PASS Verity: direct and visual range, Aural suspension and recovery, Profusion, Decay, immutable history, zero AS');
