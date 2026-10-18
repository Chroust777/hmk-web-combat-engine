/** HMK: Roleplaying in the World of Kèthîra p172.
 * Free-action Riding Control, optional 1-turn Grope retry on failure.
 * The selected rider and mount are player choices; ML and EML come from
 * stored character data. All d100 are supplied by a real physical roll.
 * The output is staged and must be committed in one database transaction.
 */
import {controlEML} from '../rules/mounted.js';
import {successLevel,SL} from '../rules/tests.js';
import {readPhysicalDieValue} from './hmk-manual-dice-queue.js';
import {validateCombatState} from './persistent-combat-state.js';
import {applyConfirmedMountedControl} from './hmk-combat-aftereffects.js';
const assert=(c,m)=>{if(!c)throw Error(m)};
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const cpy=structuredClone;
const signature=x=>JSON.stringify(x);
const ml=(c,k)=>c?.hmk?.skills?.filter(s=>String(s.name||'').trim().toLowerCase()===k&&int(s.ml,0,200));
export function createGuidedMountedControl({id,timelineId,round,rider,mount,state,sourceSignature}={}){
 assert(typeof id==='string'&&id&&typeof timelineId==='string'&&timelineId&&
  typeof sourceSignature==='string'&&sourceSignature&&int(round,1,9999),'Chybí identita a kolo');
 assert(rider?.id&&mount?.id&&rider.id!==mount.id,'Vyberte skutečného jezdce a zvíře');
 assert(state&&typeof state==='object','Chybí bojový stav jezdce');validateCombatState(state);
 assert(state.shock==='NONE','Bezvládný nebo omráčený jezdec nemůže provést nový Control');
 const riding=ml(rider,'riding'),initiative=ml(mount,'initiative');
 assert(riding?.length===1&&initiative?.length===1,'Chybí ověřená Riding ML jezdce nebo Initiative ML zvířete');
 const eml=controlEML({ridingML:riding[0].ml,mountInitiativeML:initiative[0].ml});
 assert(int(eml,-100,300),'Neplatný výpočet Control EML');
 return {format:'hmk-guided-mounted-control-v1',id,timelineId,round,riderId:rider.id,mountId:mount.id,
  ridingML:riding[0].ml,mountInitiativeML:initiative[0].ml,eml,
  state:cpy(state),stateWitness:signature(state),sourceSignature,
  roll:null,retestRoll:null,retestChoice:null,phase:'roll',physicalDice:[]};
}
export function guidedMountedRequirement(s){
 assert(s?.format==='hmk-guided-mounted-control-v1','Neplatný Mounted Control');
 if(s.phase==='roll')return {kind:'die',id:'mountedControlD100',faces:100,
  label:`Riding Control EML ${s.eml} (HMK p172)`,actorId:s.riderId};
 if(s.phase==='retry-choice')return {kind:'choice',id:'mounted-retry',choices:[
  {value:'retest',label:'Věnovat 1-turn Grope opakovanému Control Roll'},
  {value:'accept',label:'Pokračovat bez ovládání zvířete'}]};
 if(s.phase==='retry-roll')return {kind:'die',id:'mountedRetestD100',faces:100,
  label:`Opakovaný Control EML ${s.eml} (1-turn Grope)`,actorId:s.riderId};
 return {kind:'complete',id:'mounted-control-ready'};
}
export function submitGuidedMountedDie(s,value){
 const req=guidedMountedRequirement(s);assert(req.kind==='die','Systém nečeká na žádný další d100');
 const n=readPhysicalDieValue(value,100);
 const dice=[...s.physicalDice,{id:req.id,faces:100,value:n,label:req.label,source:'GM-entered-physical-die'}];
 if(s.phase==='roll')return {...s,roll:n,physicalDice:dice,
  phase:successLevel(n,s.eml)>=SL.S?'ready':'retry-choice'};
 return {...s,retestRoll:n,physicalDice:dice,phase:'ready'};
}
export function chooseGuidedMounted(s,value){
 assert(s?.phase==='retry-choice'&&['accept','retest'].includes(value),
  'Další volba není dovolena před výsledkem Control');
 return {...s,retestChoice:value,phase:value==='retest'?'retry-roll':'ready'};
}
export function completeGuidedMounted({session,currentState,sourceSignature}={}){
 const s=session;assert(s?.format==='hmk-guided-mounted-control-v1'&&s.phase==='ready',
  'Jízda není dokončená: potřebný hod nebo volba chybí');
 assert(sourceSignature===s.sourceSignature&&signature(currentState)===s.stateWitness,
  'Bojový stav jezdce se od zahájení Control změnil');
 const r=applyConfirmedMountedControl({state:currentState,round:s.round,eventId:s.id,
  ridingML:s.ridingML,mountInitiativeML:s.mountInitiativeML,roll:s.roll,
  retestRoll:s.retestRoll,gmConfirmed:true});
 const log=r.state.events.at(-1);
 log.details.physicalDice={format:'hmk-manual-dice-proof-v1',source:'HMK p172',rolls:cpy(s.physicalDice)};
 log.details.mountId=s.mountId;log.details.retestChoice=s.retestChoice;
 return {state:r.state,result:r.result,physicalDice:cpy(s.physicalDice),riderId:s.riderId,
  mountId:s.mountId,round:s.round,source:'HMK World of Kèthîra p172'};
}
