/** OPTIONAL GM judgement; NOT a prescribed animal Trekking Fatigue rate.
 * HMK v1.2 pp.145,150,176 explicitly address travellers and drovers, not a
 * standalone animal-watch/animal-hour rate. Rates are GM-authored, evidenced
 * once for each registered animal; only the posting/timing is automatic.
 */
const check=(x,m)=>{if(!x)throw Error(m)};
const whole=(n)=>Number.isSafeInteger(n)&&n>=0&&n<=100;
export function prepareAnimalWeariness(animals=[],decisions=[],kind='walk'){
 check(Array.isArray(decisions),'Zvířecí únavu musí doložit rozhodnutí GM');
 const seen=new Set(), hourly=kind.startsWith('double-');
 return decisions.map(d=>{
  check(d&&typeof d.actorId==='string'&&!seen.has(d.actorId)&&
   animals.some(a=>a.id===d.actorId&&a.health)&&whole(d.rate)&&d.rate%5===0&&
   d.gmConfirmed===true&&typeof d.reason==='string'&&d.reason.trim().length>=3&&d.reason.trim().length<=300,
   'Volitelná únava zvířete vyžaduje ověřené zvíře, rozhodnutí GM, zdůvodnění a násobky 5 Weariness.');
  seen.add(d.actorId);
  return {format:'hmk-animal-trek-gm-rate-v1',actorId:d.actorId,period:hourly?'hour':'watch',
   rate:d.rate,reason:d.reason.trim(),gmConfirmed:true,sourcePages:[145,150,176]};
 });
}
export function validateAnimalWeariness(animals,policies,kind){
 const normalized=prepareAnimalWeariness(animals,policies.map(d=>({...d,gmConfirmed:d.gmConfirmed})),kind);
 check(JSON.stringify(policies)===JSON.stringify(normalized),'Změněné rozhodnutí GM o únavě zvířat.');
 return true;
}
export function actualAnimalWeariness(policy,elapsedMinutes,partialDecision=null){
 check(policy?.format==='hmk-animal-trek-gm-rate-v1'&&Number.isSafeInteger(elapsedMinutes)&&elapsedMinutes>=0&&elapsedMinutes<=240,
  'Neplatná doba nebo zdravotní rozhodnutí pro zvíře.');
 if(elapsedMinutes===240)return policy.period==='hour'?4*policy.rate:policy.rate;
 if(elapsedMinutes===0)return 0;
 const finished=policy.period==='hour'?Math.floor(elapsedMinutes/60)*policy.rate:0;
 const exact=policy.period==='hour'&&elapsedMinutes%60===0;
 if(exact)return finished;
 check(whole(partialDecision)&&partialDecision%5===0&&partialDecision>=finished&&
  partialDecision<=(policy.period==='hour'?4*policy.rate:policy.rate),
  'Přerušená zvířecí cesta: GM musí stanovit celkovou dílčí Weariness (násobky 5) včetně úplných hodin.');
 return partialDecision;
}
