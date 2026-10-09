/** HMK World of Kèthîra, printed pp.112,117-118,122,170.
 * Read-only, inventory-derived Armour ENC, Gear ENC, modified ENC, PF and
 * body-zone Bulk. Do not conflate an equipment load with accrued Fatigue.
 * Unknown masses, unsupported suit layering and unconfirmed GM Bulk are not zero.
 */
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {identifyWornPrintedSuit} from './printed-suit-combat.js';
import {resolveOwnedArmourArticle} from './live-combat-armour.js';
import {evaluateOrderedArmour} from './armour-layer-evaluation.js';
import {calculateGearLoad} from '../rules/gear-load.js';
import {modifiedEncumbrance,strengthEncumbranceModifier,encumbranceTestPenalty} from '../rules/encumbrance.js';
import {personalFatigue} from '../rules/fatigue.js';

const ZONES=['head','arms','torso','legs'];
const SUITS=new Map(PRINTED_ARMOUR_SUITS_P113_116.map(s=>[s.name,s]));
const ARMOUR=new Map(PRINTED_ARMOUR_ARTICLES_P118.map(a=>[a.id,a]));
const SLOTS=new Set(['underFar','underNear','base','overNear','overFar']);
const MASS_SLOTS=new Set(['carried','main_hand','off_hand']);
const finiteMass=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const fail=(issues,partial={})=>({ready:false,encReady:false,bulkReady:false,issues, ...partial});

/** Melee is impaired by all four zones under p.170; other tests must specify zones. */
export function bulkForTest(load,zones=ZONES){
 if(!load?.bulkReady)return {ready:false,reason:'Body-zone Bulk is unresolved'};
 if(!Array.isArray(zones)||zones.some(z=>!ZONES.includes(z))||new Set(zones).size!==zones.length)
  return {ready:false,reason:'Invalid or repeated impaired body zone'};
 const zonePenalties=Object.fromEntries(zones.map(z=>[z,load.bulkByZone[z]]));
 return {ready:true,zonePenalties,penalty:Object.values(zonePenalties).reduce((s,n)=>s+n,0)};
}

/**
 * @param {object} character User-stored record with hmk.attributes.str, not GM-supplied dummy STR.
 * @param {Array} inventory Actual owned inventory rows.
 * @param {object} options
 *  - bulkConfirmation: {assessed:true,violatingZones:[]} for exact printed suits
 *    where physical layer order is NOT source-verified. Not inferred from suit name.
 *  - layerOptions: GM-assessed p.117 custom Bulk exceptions and optional explicit columns.
 *  - mounted: confirmed mount context from GM; no mount state stored in character yet.
 */
export function resolveCombatantLoad({character,inventory,layerOptions={},bulkConfirmation=null,mounted=false}={}){
 const issues=[];
 if(!character||typeof character.id!=='string'||!character.id)return fail(['Character ID is required']);
 if(!Array.isArray(inventory))return fail(['Owned inventory is required']);
 if(typeof mounted!=='boolean')return fail(['Mounted state must be boolean']);
 const id=character.id;
 const owned=inventory.filter(x=>x?.characterId===id),seen=new Set();
 for(const x of owned){
  if(!x||typeof x.id!=='string'||!x.id.trim()||seen.has(x.id))issues.push('Invalid or duplicate inventory ID');
  else seen.add(x.id);
  if(!['worn','carried','main_hand','off_hand','none',undefined,null].includes(x.slot))issues.push(`Unknown equipment slot: ${x.id}`);
 }
 const worn=owned.filter(x=>x.slot==='worn');
 if(worn.some(x=>x.snapshot?.category!=='armor'))issues.push('Non-armour item in worn slot');
 const articles=[];
 for(const item of worn){
  const checked=resolveOwnedArmourArticle(item);
  if(!checked.ready){issues.push(`${item.snapshot?.name||item.id}: ${checked.reason}`);continue;}
  articles.push({item,article:checked.article});
 }
 let armourENC=null,extraEnc=null,conditionalArmENC=null,perceptionPenalty=null;
 let bulkReady=false,bulkByZone=null,bulkSource=null,armourSource=null,layering=null;
 const match=identifyWornPrintedSuit(inventory,id);
 if(worn.length===0){
  armourENC=0;extraEnc=0;conditionalArmENC=0;perceptionPenalty=0;
  bulkReady=true;bulkByZone=Object.fromEntries(ZONES.map(z=>[z,0]));bulkSource='unarmoured';armourSource='unarmoured';
 }else if(articles.length===worn.length&&match.ok){
  const suit=SUITS.get(match.name);
  if(!suit)issues.push('Printed suit missing in HMK catalogue');
  else {
   armourENC=suit.enc;extraEnc=null;conditionalArmENC=null;perceptionPenalty=-suit.per;
   armourSource=`printed-suit:${suit.name}`;
   // A printed suit has exact ENC, but its article order/Bulk is NOT independently
   // certified by the printed AV matrix. Explicit GM verification is mandatory.
   if(bulkConfirmation?.assessed===true){
    const zones=bulkConfirmation.violatingZones;
    if(!Array.isArray(zones)||zones.some(z=>!ZONES.includes(z))||new Set(zones).size!==zones.length)
     issues.push('Invalid confirmed Bulk body zones');
    else {
     bulkReady=true;bulkByZone=Object.fromEntries(ZONES.map(z=>[z,zones.includes(z)?-5:0]));
     bulkSource='explicit-GM-printed-suit-assessment';
    }
   }else if(bulkConfirmation!==null)issues.push('Printed suit Bulk assessment was not confirmed');
  }
 }else if(articles.length===worn.length){
  const ordered=[];
  for(const {item,article} of articles){
   if(!Number.isSafeInteger(item.layerOrder)||item.layerOrder<0){issues.push(`${item.id}: inner-to-outer layerOrder required`);continue;}
   if(item.layerSlot!==undefined&&item.layerSlot!==null&&item.layerSlot!==''&&!SLOTS.has(item.layerSlot)){
    issues.push(`${item.id}: invalid layer slot`);continue;
   }
   ordered.push({...article,layerOrder:item.layerOrder});
  }
  if(ordered.length===articles.length){
   const slots=Object.fromEntries(articles.filter(({item})=>item.layerSlot).map(({item,article})=>[article.id,item.layerSlot]));
   // Bulk exceptions are explicit GM decisions stored on the actual worn
   // inventory item. They are not inferred from an invalid material stack.
   const bulkExceptionByZone={};
   for(const {item,article} of articles){
    const nominated=item.bulkExceptionZones??[];
    if(!Array.isArray(nominated)||nominated.some(z=>!ZONES.includes(z))||new Set(nominated).size!==nominated.length){
     issues.push(`${item.id}: invalid Bulk exception zones`);continue;
    }
    for(const zone of nominated){
     if(bulkExceptionByZone[zone]!==undefined){issues.push(`More than one GM Bulk article nominated for ${zone}`);continue;}
     bulkExceptionByZone[zone]=article.id;
    }
   }
   if(layerOptions.bulkExceptionByZone&&Object.entries(layerOptions.bulkExceptionByZone).some(([z,id])=>bulkExceptionByZone[z]!==undefined&&bulkExceptionByZone[z]!==id))
    issues.push('Conflicting Bulk selection from the inventory and GM options');
   const merged={...layerOptions,bulkExceptionByZone:{...bulkExceptionByZone,...layerOptions.bulkExceptionByZone},slotByArticleId:{...slots,...layerOptions.slotByArticleId}};
   layering=evaluateOrderedArmour(ordered,merged);
   if(layering.status!=='compatible')issues.push(`Unresolved or forbidden armour layers: ${[...layering.errors,...layering.unresolved].join('; ')}`);
   else {
    extraEnc=layering.extraEnc;
    conditionalArmENC=articles.filter(({article})=>article.enc==='a').length>=3?5:0;
    const unknown=articles.filter(({article})=>!Number.isSafeInteger(article.enc)&&!['a','p'].includes(article.enc));
    if(unknown.length)issues.push(`Unknown printed article ENC: ${unknown.map(x=>x.article.id).join(', ')}`);
    else armourENC=articles.filter(({article})=>Number.isSafeInteger(article.enc)).reduce((s,{article})=>s+article.enc,0)+conditionalArmENC+extraEnc;
    perceptionPenalty=-articles.reduce((s,{article})=>s+(article.enc==='p'?(article.perceptionPenalty??0):0),0);
    bulkByZone=Object.fromEntries(ZONES.map(z=>[z,layering.zoneReports.find(r=>r.zone===z)?.bulkArticleId?-5:0]));
    bulkReady=true;bulkSource='validated-p117-ordered-layers';armourSource='audited-p118-articles';
   }
  }
 }
 // Any piece not worn but explicitly held/carried is gear. Never add worn armour twice.
 const gear=[];
 for(const item of owned.filter(x=>MASS_SLOTS.has(x.slot))){
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1){issues.push(`${item.id}: invalid carried quantity`);continue;}
  const p=item.snapshot?.properties;
  if(!finiteMass(p?.weightLb)){issues.push(`${item.id}: unknown physical weight; cannot calculate Gear ENC`);continue;}
  const stowage=item.gearStowage??'normal';
  if(!['normal','awkward','backpack'].includes(stowage)) {issues.push(`${item.id}: invalid gear stowage`);continue;}
  if(stowage==='backpack'&&item.slot!=='carried') {issues.push(`${item.id}: only carried gear can be packed in backpack`);continue;}
  gear.push({id:item.id,weightLb:p.weightLb,quantity:item.quantity,stowage});
 }
 const backpackPacked=gear.some(x=>x.stowage==='backpack');
 if(backpackPacked&&!owned.some(x=>MASS_SLOTS.has(x.slot)&&/\bbackpack\b/i.test(x.snapshot?.name||'')))
  issues.push('Backpack reduction claimed but no actual backpack is carried');
 let gearLoad=null;
 if(!issues.some(x=>/weight|stowage|quantity|backpack|duplicate inventory|equipment slot/.test(x.toLowerCase()))){
  try{gearLoad=calculateGearLoad(gear);}catch(e){issues.push(`Gear load: ${e.message}`);}
 }
 // STR values >21 are not covered by the printed p112 table; do not extrapolate.
 const str=character.hmk?.attributes?.str;
 if(!Number.isSafeInteger(str)||str<1||str>21)issues.push('Character STR 1–21 must be recorded; p112 modifier table not extrapolated');
 const encReady=Number.isSafeInteger(armourENC)&&gearLoad!==null&&Number.isSafeInteger(str)&&str>=1&&str<=21;
 const baseENC=encReady?armourENC+gearLoad.gearENC:null;
 const strengthModifier=encReady?strengthEncumbranceModifier(str,{mounted}):null;
 const modifiedENC=encReady?modifiedEncumbrance({armourENC,gearENC:gearLoad.gearENC,str,mounted}):null;
 const pf=encReady?personalFatigue(modifiedENC):null;
 const meleeBulk=bulkReady?ZONES.reduce((s,z)=>s+bulkByZone[z],0):null;
 const result={ready:encReady&&bulkReady&&issues.length===0,encReady,bulkReady,issues,
  characterId:id,mode:armourSource,printedSuit:match.ok?match.name:null,
  armourENC,baseENC,gearENC:gearLoad?.gearENC??null,gearLoad,
  extraEnc,conditionalArmENC,perceptionPenalty,str,mounted,strengthModifier,modifiedENC,
  personalFatiguePerPeriod:pf,agilityAndMeleePenalty:encReady?encumbranceTestPenalty({encumbrance:modifiedENC,skillBaseIncludesAgility:true}):null,
  bulkByZone,meleeBulkPenalty:meleeBulk,bulkSource,layeringStatus:layering?.status??null,
  source:'HMK World of Kèthîra pp.112,117–118,122,170',
  limitations:['Personal Fatigue is accrual per exertion, not current Fatigue','Printed suit Bulk requires explicit GM assessment','No carried mass or omitted armour ENC is silently treated as zero','No character state is modified']};
 return result;
}
