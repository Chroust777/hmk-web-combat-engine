import {specialStrikeFromSnapshot} from './special-strike-preview.js';

/** HMK p.159: RCH = strike-mode LNG + Creature Size reach modifier (p.401).
 * Explicitly selected inventory item and strike mode; no name-based inference.
 */
export function reachFromEquippedSnapshot(snapshot,{mode='primary',sizeReachModifier,grip='one'}={}){
 if(!snapshot||snapshot.category!=='weapon')return {ok:false,reason:'not-an-equipped-weapon'};
 if(!['one','two'].includes(grip))return {ok:false,reason:'invalid-weapon-grip'};
 if(!Number.isSafeInteger(sizeReachModifier))return {ok:false,reason:'missing-verified-creature-size-reach-modifier'};
 const p=snapshot.properties||{};
 let length;
 if(mode==='primary'){
  if(!Array.isArray(p.verifiedModes)||p.verifiedModes.length!==1)return {ok:false,reason:'ambiguous-or-missing-strike-mode'};
  length=p.verifiedModes[0]?.length??p.length;
 }else if(['half-sword','handle','shaft'].includes(mode)){
  const special=specialStrikeFromSnapshot(snapshot,mode);
  if(!special.ok)return {ok:false,reason:special.reason};
  length=special.length;
 }else return {ok:false,reason:'unsupported-strike-mode'};
 // Printed LNG is sometimes 7t (thrust) or 6|5 (Bastard Sword:
 // one-handed | two-handed). The currently persisted grip disambiguates it.
 if(typeof length==='string'){
  if(/^\d\|\d$/.test(length))length=length.split('|')[grip==='two'?1:0];
  const m=/^([0-9])(t?)$/.exec(length);
  if(m)length=Number(m[1]);
 }
 if(!Number.isSafeInteger(length)||length<0||length>9)return {ok:false,reason:'missing-or-invalid-weapon-length'};
 const rch=length+sizeReachModifier;
 if(rch<0)return {ok:false,reason:'negative-reach-cannot-strike'};
 return {ok:true,rch,length,sizeReachModifier,source:'equipped-inventory-snapshot',mode};
}

/** Reject wrong ownership, unready items and ambiguous selection. */
export function reachFromSelectedEquipment(inventory,characterId,inventoryId,options={}){
 if(!Array.isArray(inventory)||!characterId||!inventoryId)return {ok:false,reason:'missing-selected-equipment'};
 const matching=inventory.filter(x=>x.id===inventoryId);
 if(matching.length!==1||matching[0].characterId!==characterId||!['main_hand','off_hand'].includes(matching[0].slot))return {ok:false,reason:'weapon-not-equipped-by-character'};
 return reachFromEquippedSnapshot(matching[0].snapshot,{...options,grip:options.grip??(matching[0].grip==='two'||matching[0].snapshot?.properties?.twoHanded===true||matching[0].snapshot?.properties?.verifiedModes?.[0]?.twoHanded===true?'two':'one')});
}
