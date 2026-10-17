/**
 * G04-012/013 — all alternative special-branch writes share this boundary.
 * This is a route policy, not an alternative rule resolver. It never rolls dice
 * and cannot transform a GM checkbox into a witnessed Melee d100 sequence.
 * HMK World of Kèthîra v1.2, printed p.106.
 */
const UNVERIFIED=new Set(['hmk-maneuver-form','hmk-grab-retest-form',
 'hmk-wq-form','hmk-area-form','hmk-mount-control-form','hmk-mount-charge-form']);
const ALLOWED=new Set([
 'hmk-maneuver-consequence-form','hmk-grab-take-form'
]);
export function assertAlternateManeuverWriteAllowed({formId,initiativeActive=false,guidedInProgress=false}={}){
 if(UNVERIFIED.has(formId)){
  const reason={
   'hmk-maneuver-form':'Ruční potvrzení Melee vítězství bez fyzických d100 není pravidlový důkaz. Pro Press/Trip/Grab použijte řízený Combat průvodce.',
   'hmk-grab-retest-form':'Ruční Hold retest s volitelnými STR není ověřený. Použijte automatický Hold retest, který čte aktuální STR postav.',
   'hmk-wq-form':'Weapon Damage vyžaduje ověřený shodný Block, tiebreak, připravené zbraně a fyzický Impact hod. Použijte řízený Melee průvodce.',
   'hmk-area-form':'Area vyžaduje doložený útok, skutečnou plošnou ochranu, Evade a následky pro všechny cíle. Tento volný zápis není bezpečný.',
   'hmk-mount-control-form':'Riding a Initiative ML nelze volně zadat. Použijte řízený Mounted Control s ověřenými postavami.',
   'hmk-mount-charge-form':'Rider Impact vyžaduje doloženou dráhu skutečného zvířete a jeho vlastnosti; samotné GM číslo není průkazné.'
  };
  throw Error(reason[formId]);
 }
 if(!ALLOWED.has(formId))throw Error('Neznámá či nepovolená alternativní cesta bojového zápisu');
 if(initiativeActive)throw Error('Při aktivní Initiative smí stav měnit pouze jednotný Combat průvodce');
 if(guidedInProgress)throw Error('Nejdříve dokončete rozpracovaný bojový průvodce; nelze zapisovat konkurenční změnu stavu');
 return true;
}
