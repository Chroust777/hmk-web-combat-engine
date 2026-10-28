/** Persistent bestiary animal function warnings after confirmed amputation.
 * HMK 1.2 pp.168,178 and species anatomy pp.355,357. The book does NOT
 * specify a universal new Move score for a beast missing one leg. That case
 * requires GM; do not silently keep the printed healthy Move.
 */
const paired=new Set(['flg','hlg','leg','wng']);
export function animalLossCapabilities572(health){
 const losses=(health?.wounds||[]).filter(w=>w.amputation?.severed).map(w=>({
  woundId:w.id,part:w.location,site:w.amputation.site||w.location,
  side:w.amputation.side||null,kind:w.amputation.kind||null,viaTreatment:w.amputation.viaTreatment===true}));
 const has=part=>losses.some(x=>x.part===part);
 const legs=losses.filter(x=>['flg','hlg','leg'].includes(x.part));
 const facialLoss=losses.some(x=>x.kind==='facial-feature'||x.part==='ear');
 return {losses,legs,requiresMobilityRuling:legs.length>0,
  flightProhibited:has('wng'),tailActionProhibited:has('tl'),
  wingActionNeedsRuling:has('wng'),facialSenseOrBiteNeedsRuling:facialLoss,
  reasons:[...(legs.length?['Chybí končetina: tištěné Move nelze bez rozhodnutí GM považovat za nezměněné.']:[]),
   ...(has('wng')?['Chybí křídlo: nelze automaticky předpokládat let ani běžný Wing Strike.']:[]),
   ...(has('tl')?['Chybí ocas: Tail Strike nelze provést.']:[]),
   ...(facialLoss?['Ztracena část obličeje nebo ucho: dopad na smysly, Bite a komunikaci musí určit GM.']:[])],
  sourcePages:[168,178,355,357]};
}
/** Guard only capabilities that have a clear physical dependency; do not
 * invent a numerical modifier for limp, impaired flight or attacks. */
export function assertAnimalAttackCapability572({health,weaponName,weaponSpecial='',gmRemainingLimbConfirmed=false}={}){
 const c=animalLossCapabilities572(health),n=String(weaponName||'').toLowerCase(),special=String(weaponSpecial||'').toLowerCase();
 if(!c.losses.length)return true;
 if(/tail/.test(n)&&c.tailActionProhibited)throw Error('Tail Strike nelze provést po ztrátě ocasu.');
 if(c.flightProhibited&&/dive|flying|wing.pounce/.test(special))
  throw Error('Doložený střemhlavý/letový útok není možný s amputovaným křídlem.');
 if(c.facialSenseOrBiteNeedsRuling&&/bite/.test(n)&&!gmRemainingLimbConfirmed)
  throw Error('Bite po ztrátě části obličeje vyžaduje GM potvrzení použitelnosti čelistí.');
 if(/wing/.test(n)&&c.losses.filter(x=>x.part==='wng').some(x=>x.side==='left')&&c.losses.filter(x=>x.part==='wng').some(x=>x.side==='right'))
  throw Error('Obě křídla jsou amputovaná: Wing Strike nelze provést.');
 if(/kick|hoof|trample/.test(n)&&['hlg','leg'].some(p=>c.legs.some(x=>x.part===p&&x.side==='left')&&c.legs.some(x=>x.part===p&&x.side==='right')))
  throw Error('Obě příslušné zadní končetiny jsou amputované: Kick/Hoof/Trample není možný.');
 if(/wing/.test(n)&&c.wingActionNeedsRuling&&!gmRemainingLimbConfirmed)
  throw Error('Wing Strike po ztrátě křídla vyžaduje GM potvrzení použitelného zbývajícího křídla.');
 if(/kick|hoof|trample/.test(n)&&c.legs.length&&!gmRemainingLimbConfirmed)
  throw Error('Kick/Hoof/Trample po amputaci končetiny vyžaduje GM rozhodnutí a potvrzení použitelného pohybu.');
 if(/claw|grab|pounce/.test(n)&&c.legs.length&&!gmRemainingLimbConfirmed)
  throw Error('Claw/Grab/Pounce po ztrátě končetiny vyžaduje GM potvrzení použitelné zbývající končetiny.');
 return true;
}
