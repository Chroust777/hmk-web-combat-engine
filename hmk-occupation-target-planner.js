/** Rule-constrained, explicit-intent planning for rare occupations.
 * HMK v1.2 p.18 permits selection/reroll according to GM agreement.
 * A witness selects *allowed birthplace*, never invents attributes or a roll.
 * Parent social class is still rolled with a real software d20 and all
 * rejected preliminary candidate rolls are counted and separately recorded.
 */
import {TARGET_WITNESSES} from './hmk-targeted-witnesses.js';
import {OCCUPATIONS,classFromRoll,VERIFIED_REGIONS,regionAllowedForFolk,realmFromRegionSelection,realmFromRegionRoll} from './hmk-creation-tables.js';
import {eligibleOccupations} from './hmk-creation-eligibility.js';
import {TALENT_NAMES} from './hmk-arcane-talent.js';
function acceptableName(actual,request){return actual===request||actual.startsWith(request+' (')||actual.startsWith(request+':');}
export function chooseOccupationTarget(request,preferredFolk=''){
 const desired=String(request??'').trim();if(!desired)return null;
 const keys=Object.hasOwn(OCCUPATIONS,desired)?[desired]:Object.keys(OCCUPATIONS).filter(n=>acceptableName(n,desired));
 if(!keys.length)throw Error('Požadované povolání nemá katalogový profil: '+desired);
 const options=[];
 for(const name of keys)for(const w of TARGET_WITNESSES[name]??[]){
  if(preferredFolk&&preferredFolk!==w.folk)continue;
  if(!regionAllowedForFolk(w.region,w.folk)||!VERIFIED_REGIONS[w.region])continue;
  // Revalidate the *selected* realm against current rules; reject stale witness.
  let realm, tribeRolls=[],regionRolls=[],regionCommunityChoice='';
  if(w.region==='Áltôr'&&/Álti lands/.test(w.realm)){
   for(let t=1;t<=100;t++){try{const r=realmFromRegionSelection(w.region,w.realm,null,null,null,null,null,null,null,t);
    if(r.society===w.society&&r.subsistence===w.subsistence){tribeRolls.push(t);realm=r;}}
    catch{/* unverified trial cannot be planned */}}
   if(!tribeRolls.length)continue;
  }else try{
    if(w.region==='Hârn'&&w.realm==='Orbáal Kingdom'){
     regionCommunityChoice='Ivínian rulers';
     for(let roll=1;roll<=100;roll++){try{const r=realmFromRegionRoll(w.region,roll);
      if(r.realm===w.realm&&r.society===w.society&&r.harnOrbaal===regionCommunityChoice){regionRolls.push(roll);realm=r;}}
      catch{/* not this printed row */}}
     if(!regionRolls.length)continue;
    }else realm=realmFromRegionSelection(w.region,w.realm,null,null,null,null,null,null,null,null);
   }catch{continue;}
  if(realm.society!==w.society||realm.pantheon!==undefined&&realm.pantheon!==w.pantheon&&w.pantheon)continue;
  const d20=Array.from({length:20},(_,i)=>i+1).filter(n=>classFromRoll(w.society,n,20)===w.socialClass);
  if(!d20.length)continue;
  const fake={hmk:{folk:w.folk,society:w.society,socialClass:w.socialClass,birthRegion:w.region,
    familyOccupation:w.family||'',pantheon:realm.pantheon,creation:{values:{classDie:20,classRoll:d20[0],regionProof:{subsistence:w.subsistence||realm.subsistence},arcaneTalentProof:{generated:TALENT_NAMES}}}}};
  if(!eligibleOccupations(fake).includes(name))continue;
  options.push({...w,name,regionProof:realm,classD20:d20,tribeRolls,regionRolls,regionCommunityChoice});
 }
 if(!options.length)throw Error('Požadované povolání nemá doložený přípustný plán pro zvolený Folk: '+desired);
 // Prefer ordinary human/feudal contexts to exotic/ambiguous subtable cases,
 // and contexts not locked to a family occupation (Dalkesh).
 options.sort((a,b)=> (a.region==='Dalkésh'?1:0)-(b.region==='Dalkésh'?1:0)
   || (a.folk==='Human'?-1:0)-(b.folk==='Human'?-1:0)
   || b.classD20.length-a.classD20.length);
 const selected=options[0];
 return {occupation:selected.name,folk:selected.folk,region:selected.region,realm:selected.realm,
  society:selected.society,socialClass:selected.socialClass,family:selected.family||'',
  classD20:selected.classD20,tribeRolls:selected.tribeRolls,regionRolls:selected.regionRolls,regionCommunityChoice:selected.regionCommunityChoice,subsistence:selected.subsistence||selected.regionProof.subsistence||'',
  rejectedClassRolls:[],rejectedParentRolls:[],rejectedRegionRolls:[],rejectedTalentTrials:0,selectionMode:'chosen-region-realm / d20-rejection-sampling'};
}
export function matchingPreliminaryClassRoll(plan,die){
 if(!plan)return die(20);
 // Software d20 genuinely rolled. Preliminary rejected candidate rolls are
 // retained as attempts, NEVER labelled as physical rolls for this character.
 for(let i=0;i<500;i++){
  const r=die(20);if(plan.classD20.includes(r))return r;
  plan.rejectedClassRolls.push(r);
 }
 throw Error('Nelze dosáhnout doložené rodičovské třídy po 500 skutečných předběžných hodech d20');
}

export function chooseMatchingTrial(die,sides,allowed,rejected,max=1000){
 if(!allowed?.length)throw Error('Chybí dovolený výsledek cíleného dílčího hodu');
 for(let i=0;i<max;i++){const r=die(sides);if(allowed.includes(r))return r;rejected.push(r);}
 throw Error('Nelze v plánovacím limitu získat požadovaný dílčí hod');
}
