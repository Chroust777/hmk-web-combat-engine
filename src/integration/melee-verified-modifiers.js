import {weaponTestModifier,slowPenalty,impactTABonus} from '../rules/weapon-traits.js';

/** Only explicitly verified structured mode traits may affect EML. Never parse prose. */
export function verifiedMeleeModifiers(snapshot,{role='attack',defence='block',threateningFoeCount=0,twoHanded=false}={}){
 const m=snapshot?.properties?.verifiedModes?.[0];
 if(!m||typeof m!=='object')return {ok:false,reason:'unverified-weapon-mode'};
 const t=m.traits;
 if(!t||typeof t!=='object'||Array.isArray(t))return {ok:false,reason:'unverified-weapon-traits'};
 for(const k of ['melee','block','defence'])if(t[k]!==undefined&&(!Number.isSafeInteger(t[k])||Math.abs(t[k])>100))return {ok:false,reason:'invalid-trait-'+k};
 if(!Number.isSafeInteger(threateningFoeCount)||threateningFoeCount<0||threateningFoeCount>100)return {ok:false,reason:'invalid-foe-count'};
 if(typeof twoHanded!=='boolean'||(t.slow!==undefined&&typeof t.slow!=='boolean')||(t.slowOneHanded!==undefined&&typeof t.slowOneHanded!=='boolean'))return {ok:false,reason:'invalid-trait-flags'};
 const mode=role==='attack'?'strike':defence;
 if(!['strike','block','counterstrike'].includes(mode))return {ok:false,reason:'unsupported-defence'};
 const base=weaponTestModifier({melee:t.melee??0,block:t.block??0,defence:t.defence??0,mode});
 const slow=role==='defence'?slowPenalty({slow:t.slow??false,slowOneHanded:t.slowOneHanded??false,twoHanded,threateningFoeCount,defence}):0;
 return {ok:true,modifiers:[{label:'Ověřené vlastnosti zbraně',value:base},{label:'Slow (více protivníků)',value:slow}],total:base+slow,source:'verifiedModes[0].traits'};
}

/** Aspect-specific Impact TA, optionally replaced by a verified weapon override. */
export function verifiedImpactTA({aspect,count=0,override=null}={}){
 if(!Number.isSafeInteger(count)||count<0||count>3)return {ok:false,reason:'invalid-TA-count'};
 if(!['b','e','p','f'].includes(aspect))return {ok:false,reason:'invalid-impact-aspect'};
 let perAspect=null;
 if(override!==null){
  if(Number.isSafeInteger(override))perAspect=override;
  else if(override&&typeof override==='object'&&!Array.isArray(override)){
   if(Object.keys(override).some(key=>!['b','e','p','f'].includes(key)))return {ok:false,reason:'invalid-TA-override-keys'};
   perAspect=override[aspect]??null;
  }else return {ok:false,reason:'invalid-TA-override'};
  if(perAspect!==null&&(!Number.isSafeInteger(perAspect)||perAspect<0||perAspect>20))return {ok:false,reason:'invalid-TA-override'};
 }
 return {ok:true,bonus:impactTABonus({aspect,count,override:perAspect===null?null:{[aspect]:perAspect}})};
}
