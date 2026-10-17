/** HMK Kethira v1.2, p204: six-round Pèleáhn Hyper Burst evidence ledger.
 * This is deliberately an evidence validator, NOT an actor scheduler or a
 * substitute for a committed Total Release. No dice are generated or saved.
 * A caller must not treat a successful ledger check as permission to bypass
 * normal Initiative, second-action processing or native persistence.
 */
import {successLevel,SL} from '../rules/tests.js';
const assert=(x,m)=>{if(!x)throw Error(m)};
const whole=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const cp=structuredClone;
const labels=['CF','F','S','CS'];
const weariness={CF:20,F:10,S:5,CS:0};
const radius=15;
/** HMK v1.2 p.204: Raw Pèleáhn Hyper Burst lasts the causal spell CL.
 * Backward-compatible six-round Doom Flame source has no explicit spell/CL.
 * New sources MUST bind the duration to the known printed spell CL.
 */
export function pelahnBurstDuration(burst){
 assert(burst?.format==='hmk-pelahn-burst-source-v1','Neplatný zdroj Hyper Burstu');
 if(burst.spell==='Pyre'){
  assert(burst.complexity===3&&burst.durationRounds===3&&
   burst.endRound===burst.startRound+2,'Pyre III musí mít přesně tříkolový Hyper Burst');
  return 3;
 }
 assert((burst.spell===undefined||burst.spell==='Doom Flame')&&
  (burst.complexity===undefined||burst.complexity===6)&&
  (burst.durationRounds===undefined||burst.durationRounds===6)&&
  burst.endRound===burst.startRound+5,'Doom Flame VI musí mít šestikolový Hyper Burst');
 return 6;
}
/** Read-only requirements for one actor's turn. Recorded movement must be the
 * actual post-regular-action position. If total fatigue >= Move, no extra
 * action is allowed, but the END test is still mandatory (p204). */
export function previewPelahnHyperBurstTurn({burst,round,actorId,actorPosition,
 afterRegularAction,regularAction,extraAction=null,incantUsed=false,
 fatigueBefore,move,END,ENDD100=null,gmConfirmed=false}={}){
 assert(gmConfirmed===true&&burst?.format==='hmk-pelahn-burst-source-v1'&&
  typeof burst.casterId==='string'&&burst.casterId&&
  whole(burst.startRound,1,9997)&&pelahnBurstDuration(burst)>0&&
  whole(round,burst.startRound,burst.endRound)&&
  burst.center&&Number.isFinite(burst.center.x)&&Number.isFinite(burst.center.y),
  'Chybí GM doložený šestikolový zdroj Pèleáhn Hyper Burst');
 assert(typeof actorId==='string'&&actorId&&actorPosition&&
  Number.isFinite(actorPosition.x)&&Number.isFinite(actorPosition.y),
  'Chybí aktuální potvrzená prostorová pozice aktéra');
 assert(afterRegularAction===true&&typeof regularAction==='string'&&regularAction,
  'Bonusová akce následuje až po skutečně dokončené běžné akci');
 const inside=Math.hypot(actorPosition.x-burst.center.x,actorPosition.y-burst.center.y)<=radius+1e-7;
 if(!inside){assert(extraAction===null&&ENDD100===null,'Mimo Hyper Burst nesmí vzniknout bonusová akce ani END hod');
  return {affected:false,round,actorId,extraAllowed:false,needsEND:false};}
 assert(whole(fatigueBefore,0,100000)&&whole(move,0,100000)&&whole(END,1,40),
  'Záznam vyžaduje skutečnou Fatigue, Move a END živé postavy');
 const extraAllowed=fatigueBefore<move;
 if(extraAllowed){
  assert(['pass','attack','charge','evade','grope','move','ready','incant','other'].includes(extraAction),
   'Povinná bonusová akce musí být skutečně dokončená, případně Pass');
  assert(!(incantUsed===true&&extraAction==='incant')&&!(regularAction==='incant'&&extraAction==='incant'),
   'HMK p204: Incant lze během jednoho tahu zvolit jen jednou');
 }else assert(extraAction===null,'Při Fatigue >= Move není další akce dovolena, END se přesto hází');
 assert(whole(ENDD100,1,100),'HMK p204: po druhé akci nebo při únavě >= Move je nutný fyzický END d100');
 // p160 fatigue applies to EML. An actual character's END test is 5 × END
 // with the current fatigue penalty, not an invented Endurance skill score.
 const eml=END*5-fatigueBefore;
 const sl=labels[successLevel(ENDD100,eml)];
 return {affected:true,round,actorId,extraAllowed,extraAction,regularAction,
  eml,ENDD100,ENDSL:sl,wearinessAdded:weariness[sl],needsEND:true,
  physicalDice:[{faces:100,value:ENDD100,source:'GM-entered-physical-die'}],
  evidenceOnly:true};
}
/** Check the complete six-round span, no invented rounds, participants, or
 * skipped physical END tests. Membership is resolved separately on every
 * actor turn, not frozen to the moment the spell misfired. */
export function verifyPelahnHyperBurstSixRounds({burst,turns,actors,gmConfirmed=false}={}){
 assert(gmConfirmed===true&&burst?.format==='hmk-pelahn-burst-source-v1'&&
  whole(burst.startRound,1,9997)&&pelahnBurstDuration(burst)>0&&
  Array.isArray(turns)&&Array.isArray(actors)&&actors.length>0&&
  actors.every(x=>typeof x==='string'&&x)&&new Set(actors).size===actors.length,
  'Chybí ověřený šestikolový rozpis postav');
 const duration=pelahnBurstDuration(burst);
 assert(turns.length===duration*actors.length,'Hyper Burst nesmí přeskočit žádný IR účastníka');
 const seen=new Set(),results=[];
 for(const item of turns){
  assert(actors.includes(item.actorId),'V rozpisu je neznámá postava');
  const key=`${item.round}:${item.actorId}`;
  assert(!seen.has(key),'Duplicitní END/bonusová akce Hyper Burst');seen.add(key);
  results.push(previewPelahnHyperBurstTurn({...item,burst,gmConfirmed:true}));
 }
 for(let round=burst.startRound;round<=burst.endRound;round++)for(const actorId of actors)
  assert(seen.has(`${round}:${actorId}`),'Chybí kolo nebo účastník Hyper Burstu');
 return {format:'hmk-pelahn-six-round-evidence-v1',sourceId:burst.id,durationRounds:pelahnBurstDuration(burst),
  startRound:burst.startRound,endRound:burst.endRound,results:cp(results),
  totalWeariness:results.filter(x=>x.affected).reduce((s,x)=>s+x.wearinessAdded,0),
  evidenceOnly:true,authorizesPersistence:false};
}
