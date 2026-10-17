/** HMK World of Kèthîra pp.111, 113–119, 133.
 * Read-only Area AV from the *currently worn and audited* suit/articles.
 * This module does not establish a legitimate Area attack or authorize a write.
 */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {HMK_BODY_LOCATIONS} from './armour-coverage-readiness.js';
import {resolveLiveCombatArmour,resolveOwnedArmourArticle} from './live-combat-armour.js';
import {identifyWornPrintedSuit} from './printed-suit-combat.js';

const assert=(x,m)=>{if(!x)throw Error(m)};
// HMK p.133 coverage factors, in the exact anatomical order used by this engine.
const COVERAGE=Object.freeze({sk:.04,fa:.03,nk:.02,sh:.03,ua:.06,el:.02,
 fo:.05,ha:.05,tx:.12,ab:.12,pv:.10,th:.14,kn:.03,ca:.12,ft:.07});
const EPS=1e-8;
assert(Math.abs(Object.values(COVERAGE).reduce((s,n)=>s+n,0)-1)<EPS,'Area coverage is not normalized');
assert(HMK_BODY_LOCATIONS.every(x=>Object.hasOwn(COVERAGE,x))&&HMK_BODY_LOCATIONS.length===15,
 'Area coverage does not match HMK anatomical locations');
const blocked=(reason)=>({ready:false,reason,requiresGMResolution:true});
const snapshot=x=>JSON.stringify(x);
export function resolveVerifiedAreaProtection({inventory,targetId,method='weighted',layerOptions={},armourOptions={}}={}){
 if(!Array.isArray(inventory)||typeof targetId!=='string'||!targetId)return blocked('Chybí živý inventář nebo cíl');
 if(!['weighted','quick'].includes(method))return blocked('Neznámá metoda Area AV');
 const worn=inventory.filter(x=>x.characterId===targetId&&x.slot==='worn');
 if(worn.some(x=>x.snapshot?.category!=='armor'||x.quantity!==1||x.destroyed===true||
  x.aq!=null&&x.aq!==0||typeof x.condition==='string'&&x.condition.trim()!==''))
  return blocked('Neověřená, poškozená nebo stavově nejednoznačná nasazená zbroj');
 const witness=snapshot(worn);
 if(worn.length===0)return {ready:true,areaAV:0,method:'no-armour',source:'HMK p133',targetId,inventoryWitness:witness,locations:[]};
 const match=identifyWornPrintedSuit(inventory,targetId);
 // The printed suite itself has an authoritative, published Area AV.
 if(match.ok&&method==='weighted'){
  for(const item of worn){const checked=resolveOwnedArmourArticle(item);if(!checked.ready)return blocked(checked.reason);}
  const suit=PRINTED_ARMOUR_SUITS_P113_116.find(s=>s.name===match.name);
  if(!suit||!/^f\d+$/.test(suit.area))return blocked('Tištěná Area AV není doložena');
  return {ready:true,areaAV:Number(suit.area.slice(1)),method:'printed-suit',source:`HMK p${suit.page}`,
   targetId,suitName:suit.name,inventoryWitness:witness,locations:[]};
 }
 const rows=[];
 // Fire/Frost envelops the victim from all sides. Direction-dependent layering
 // is NOT silently resolved by pretending that every strike comes from front.
 for(const location of HMK_BODY_LOCATIONS){
  const values=[];
  for(const direction of ['front','side','rear']){
   const r=resolveLiveCombatArmour({inventory,targetId,location,aspect:'f',direction,
    mode:'auto',rigidStatus:'unknown',layerOptions,armourOptions});
   if(!r.ready)return blocked(`${location}/${direction}: ${r.reason}`);
   values.push(r.armourValue);
  }
  if(new Set(values).size!==1)return blocked(`${location}: ochrana má různé směry; nelze odhadnout Area AV`);
  rows.push({location,coverage:COVERAGE[location],fireFrostAV:values[0]});
 }
 if(method==='quick'){
  const thorax=rows.find(x=>x.location==='tx')?.fireFrostAV;
  if(!Number.isSafeInteger(thorax)||thorax<1)return blocked('Volitelná Quick Area AV vyžaduje kladnou Thorax f-AV');
  return {ready:true,areaAV:thorax-1,method:'quick-thorax-minus-1',source:'HMK p133 option',
   targetId,inventoryWitness:witness,locations:rows};
 }
 const sum=rows.reduce((s,r)=>s+r.fireFrostAV*r.coverage,0);
 return {ready:true,areaAV:Math.round(sum),unroundedAreaAV:sum,method:'weighted-coverage',
  source:'HMK p133',targetId,inventoryWitness:witness,locations:rows};
}
export function assertAreaProtectionUnchanged(proof,{inventory,targetId}={}){
 assert(proof?.ready&&proof.targetId===targetId,'Chybí ověřená Area ochrana cíle');
 const live=inventory.filter(x=>x.characterId===targetId&&x.slot==='worn');
 assert(snapshot(live)===proof.inventoryWitness,'Area zbroj se od hodnocení změnila');
 return true;
}
