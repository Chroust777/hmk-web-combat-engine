/** Optional deterministic animal fatigue *interpretation*, not a literal HMK rate.
 * HMK v1.2 pp.145-146,150,176: rates and END rolls for travellers and
 * drovers, but no specific mandatory trekking rate/END SR for beasts.
 * This opt-in analogy applies the WALKING period base (5/watch) and
 * Double Time foot-traveller period base (10/hour) to walking beasts,
 * with accrual only at completed periods. It does NOT assert animal END
 * rolls or invent fractional accrual. Existing GM-authored policies remain
 * exactly backward compatible. No state is stored outside Combat State.
 */
const check=(x,m)=>{if(!x)throw Error(m)};
const whole=(n)=>Number.isSafeInteger(n)&&n>=0&&n<=100;
export const ANIMAL_TREK_ANALOGY='hmk-animal-trek-walking-analogy-v1';
const analogyPolicy=(actorId,kind)=>({format:ANIMAL_TREK_ANALOGY,actorId,
 period:kind.startsWith('double-')?'hour':'watch',rate:kind.startsWith('double-')?10:5,
 gmConfirmed:false,reason:'Odvození z Walking / Double Time; sazba zvířat není v HMK výslovná',
 sourcePages:[145,146,150,176]});
export function prepareAnimalWeariness(animals=[],decisions=[],kind='walk'){
 check(Array.isArray(decisions),'Zvířecí únavu musí doložit režim zvířete');
 check(['walk','ride','drive','double-walk','double-drover'].includes(kind),'Neznámý pohybový režim');
 const seen=new Set(), hourly=kind.startsWith('double-');
 return decisions.map(d=>{
  check(d&&typeof d.actorId==='string'&&!seen.has(d.actorId)&&
   animals.some(a=>a.id===d.actorId&&a.health),
   'Únava zvířete vyžaduje jedinečnou registrovanou identitu a zdravotní doklad.');
  seen.add(d.actorId);
  if(d.mode==='walking-analogy'||d.format===ANIMAL_TREK_ANALOGY){
   const derived=analogyPolicy(d.actorId,kind);
   if(d.format===ANIMAL_TREK_ANALOGY)
    check(JSON.stringify(d)===JSON.stringify(derived),'Změněný výpočet analogické únavy zvířete.');
   else check(Object.keys(d).every(k=>['actorId','mode'].includes(k)),
    'Odvozená únava zvířat nepřijímá ruční sazbu ani podvržený výsledek.');
   return derived;
  }
  check(whole(d.rate)&&d.rate%5===0&&d.gmConfirmed===true&&
   typeof d.reason==='string'&&d.reason.trim().length>=3&&d.reason.trim().length<=300,
   'Volitelná únava zvířete vyžaduje rozhodnutí GM, zdůvodnění a násobky 5 Weariness.');
  return {format:'hmk-animal-trek-gm-rate-v1',actorId:d.actorId,period:hourly?'hour':'watch',
   rate:d.rate,reason:d.reason.trim(),gmConfirmed:true,sourcePages:[145,150,176]};
 });
}
export function validateAnimalWeariness(animals,policies,kind){
 const normalized=prepareAnimalWeariness(animals,policies,kind);
 check(JSON.stringify(policies)===JSON.stringify(normalized),'Změněný doklad únavy zvířat.');
 return true;
}
export function actualAnimalWeariness(policy,elapsedMinutes,partialDecision=null){
 check([ANIMAL_TREK_ANALOGY,'hmk-animal-trek-gm-rate-v1'].includes(policy?.format)&&
  Number.isSafeInteger(elapsedMinutes)&&elapsedMinutes>=0&&elapsedMinutes<=240,
  'Neplatná doba nebo zdravotní rozhodnutí pro zvíře.');
 if(policy.format===ANIMAL_TREK_ANALOGY){
  // Completed-time only. 90min Double Time -> 1 hour; 120min normal ->
  // no completed watch. No GM prompt or invented fractional-hour fatigue.
  const computed=policy.period==='hour'?Math.floor(elapsedMinutes/60)*policy.rate:
   Math.floor(elapsedMinutes/240)*policy.rate;
  check(partialDecision===null||partialDecision===computed,
   'Změněný nebo ručně přepsaný automatický přírůstek zvířecí únavy.');
  return computed;
 }
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
