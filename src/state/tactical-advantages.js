export function TacticalAdvantageLedger(){ return {actionUsesByActor:{},actionUsedOnTurn:{},setups:[]}; }

export function canUseActionTA({ledger,actorId,round,turnToken,action='other',hand=null,offHandLength=0}={}){
  if(ledger.actionUsedOnTurn[turnToken]) return {allowed:false,reason:'action-ta-already-used-on-this-character-turn'};
  const uses=(ledger.actionUsesByActor[actorId]||[]).filter(x=>x.round===round);
  if(uses.length===0) return {allowed:true};
  const twoWeaponEligible=action==='melee-attack' && offHandLength>=2 && uses.length===1 && uses[0].action==='melee-attack' && new Set([uses[0].hand,hand]).size===2 && [uses[0].hand,hand].every(x=>x==='primary'||x==='off');
  return twoWeaponEligible?{allowed:true,twoWeaponException:true}:{allowed:false,reason:'actor-action-ta-round-limit'};
}
export function recordActionTA({ledger,actorId,round,turnToken,action='other',hand=null}){
  ledger.actionUsesByActor[actorId]??=[];
  ledger.actionUsesByActor[actorId].push({round,turnToken,action,hand});
  ledger.actionUsedOnTurn[turnToken]={actorId,round,action,hand};
  return ledger;
}
export function earnSetupTA({ledger,actorId,round,ir,count=1}){
  for(let i=0;i<count;i++) ledger.setups.push({actorId,earnedRound:round,earnedIR:ir,used:false});
  return ledger;
}
export function setupAvailable(setup,{round,ir}){
  if(setup.used) return false;
  if(round===setup.earnedRound) return true;
  if(round===setup.earnedRound+1) return ir>=setup.earnedIR;
  return false;
}
export function availableSetups({ledger,actorId,round,ir}){ return ledger.setups.filter(s=>s.actorId===actorId && setupAvailable(s,{round,ir})); }
export function spendSetupTA({ledger,actorId,round,ir,count=1}){
  const available=availableSetups({ledger,actorId,round,ir});
  if(available.length<count) return {spent:0,successLevelBonus:0};
  available.slice(0,count).forEach(s=>{s.used=true;});
  return {spent:count,successLevelBonus:count};
}
export function expireSetups({ledger,round,ir}){
  for(const s of ledger.setups){ if(!s.used && !setupAvailable(s,{round,ir})) s.expired=true; }
  return ledger;
}
