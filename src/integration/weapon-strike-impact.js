import {specialStrikeFromSnapshot} from './special-strike-preview.js';

/** Verified weapon mode + supplied die face. No attack/defence success is inferred. */
export function resolveWeaponStrikeImpact(snapshot,mode,roll,{gauntlets=false,additionalModifier=0}={}){
 if(!snapshot||snapshot.category!=='weapon')return {ok:false,reason:'not-a-weapon'};
 if(!Number.isSafeInteger(roll)||!Number.isSafeInteger(additionalModifier))return {ok:false,reason:'non-integer-roll-or-modifier'};
 let strike;
 if(mode==='primary'){
  const p=snapshot.properties||{};const m=p.verifiedModes?.[0];
  if(!m||!/^d(?:4|6|8|10|12|20)$/.test(String(m.impactDie))||!Number.isSafeInteger(m.impactModifier)||!['b','e','p','f'].includes(m.aspect))return {ok:false,reason:'unverified-primary-mode'};
  strike={die:Number(m.impactDie.slice(1)),modifier:m.impactModifier,aspect:m.aspect,length:m.length??p.length,zd:m.zoneDie??p.zoneDie};
 }else{
  const r=specialStrikeFromSnapshot(snapshot,mode,{gauntlets});
  if(!r.ok)return r;
  const aspect={blunt:'b',edge:'e',point:'p',fire:'f'}[r.aspect]||r.aspect;
  strike={die:r.impact?.die,modifier:r.impact?.modifier,aspect,length:r.length,zd:r.zd,cfGripInjury:r.cfGripInjury};
 }
 if(!Number.isSafeInteger(strike.die)||!Number.isSafeInteger(strike.modifier)||!['b','e','p','f'].includes(strike.aspect))return {ok:false,reason:'incomplete-strike-mode'};
 if(roll<1||roll>strike.die)return {ok:false,reason:'roll-outside-impact-die'};
 if(Math.abs(additionalModifier)>10000)return {ok:false,reason:'modifier-out-of-range'};
 return {ok:true,mode,roll,die:strike.die,weaponModifier:strike.modifier,additionalModifier,impact:Math.max(0,roll+strike.modifier+additionalModifier),aspect:strike.aspect,length:strike.length,zd:strike.zd,cfGripInjury:strike.cfGripInjury||null,source:'equipped-weapon',attackDefenceResolved:false};
}
