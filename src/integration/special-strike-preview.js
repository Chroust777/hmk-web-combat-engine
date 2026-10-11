import {specialStrikeMode} from '../rules/weapon-modes.js';

/** Strict adapter: never infer weapon family or impact data from its display name. */
export function specialStrikeFromSnapshot(snapshot, mode, {gauntlets=false}={}) {
  if (!snapshot || snapshot.category!=='weapon') return {ok:false,reason:'not-a-weapon'};
  const p=snapshot.properties||{};
  const group=String(p.weaponGroup||p.group||'').toLowerCase();
  if (!['axe','club','flail','knife','sword','polearm'].includes(group)) return {ok:false,reason:'missing-verified-weapon-group'};
  const length=Number(p.length);
  const zd=Number(p.zoneDie??p.zd);
  if (!Number.isFinite(length)||length<=0||!Number.isFinite(zd)) return {ok:false,reason:'missing-length-or-zone-die'};
  const primary=Array.isArray(p.verifiedModes)?p.verifiedModes[0]:null;
  if (!primary || !/^d(?:4|6|8|10|12|20)$/.test(String(primary.impactDie)) || !Number.isSafeInteger(primary.impactModifier)) return {ok:false,reason:'missing-verified-primary-mode'};
  const weapon={name:snapshot.name,group,length,zd,impact:{die:Number(String(primary.impactDie).slice(1)),modifier:primary.impactModifier},traits:p.traits||{},twoHanded:p.twoHanded===true};
  const result=specialStrikeMode(weapon,mode,{gauntlets});
  return result.allowed?{ok:true,...result,source:'equipped-inventory-snapshot',previewOnly:true}:{ok:false,reason:result.reason};
}
