/** HMK World of Kethira pp.117-119. Fail-closed custom armour loadout.
 * Explicit inside-to-outside layerOrder; directional impact is supplied by GM.
 * No inventory mutation; no guessed physical order, suit ENC, or combat decisions.
 */
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {evaluateOrderedArmour} from './armour-layer-evaluation.js';
import {validateArmourCoverage,HMK_BODY_LOCATIONS} from './armour-coverage-readiness.js';
import {locationArmourValue} from '../rules/armour-options.js';
import {resolveMeleeStrikeHit} from '../rules/melee.js';

const catalog=new Map(PRINTED_ARMOUR_ARTICLES_P118.map(a=>[a.id,a]));
const aspects=new Set(['b','e','p','f']);
const directions=new Set(['front','rear','side']);
const materialMetal=new Set(['scale','mail','plate']);

export function resolveCustomArmour({pieces,location,aspect,direction,layerOptions={},armourOptions={},directionalContext={}}={}){
 const fail=(reason,detail=null)=>({ready:false,reason,detail,armourValue:null,rigidArmour:null,metalArmour:null});
 if(!Array.isArray(pieces)||pieces.some(p=>!p||typeof p!=='object'||Array.isArray(p)))return fail('Pieces must be an array of catalogue references');
 if(!HMK_BODY_LOCATIONS.includes(location)||!aspects.has(aspect))return fail('Unknown anatomical location or aspect');
 if(!directions.has(direction))return fail('Impact direction must be explicit');
 const ids=new Set(),articles=[];
 for(const piece of pieces){
  if(typeof piece.id!=='string'||ids.has(piece.id))return fail('Missing or duplicate article ID');
  ids.add(piece.id);
  const source=catalog.get(piece.id);
  if(!source)return fail(`Unknown HMK p.118 article: ${piece.id}`);
  const coverage=validateArmourCoverage(source);
  if(!coverage.ready)return fail(`Unverified article: ${piece.id}`,coverage.issues);
  if(!Number.isSafeInteger(piece.layerOrder)||piece.layerOrder<0)return fail(`Explicit inner-to-outer layerOrder required: ${piece.id}`);
  articles.push({...source,layerOrder:piece.layerOrder});
 }
 const layering=evaluateOrderedArmour(articles,layerOptions);
 if(layering.status!=='compatible')return fail(`Layering ${layering.status}`,{errors:layering.errors,unresolved:layering.unresolved});
 // p.118: against multiple foes, rear-only protection succeeds on d10 TN5
 // and front-only on d10 TN7. Do not quietly assume one opponent when
 // the GM supplies a multiple-foe situation.
 const candidates=articles.filter(a=>a.coveredLocations.includes(location));
 const directional=candidates.filter(a=>['front-only','rear-only'].includes(a.coverageMarkers[location]));
 // The p.118 single-foe direction check and multiple-foe TN5/TN7 tests
 // cannot be chosen without an observed number of threatening foes.
 // A non-directional article needs no such external information.
 const suppliedOpponents=directionalContext.opponents;
 if(directional.length && !Number.isSafeInteger(suppliedOpponents))
  return fail('HMK p118: number of threatening foes is required for directional armour');
 const opponents=suppliedOpponents??1;
 const d10=directionalContext.d10??null;
 if(!Number.isSafeInteger(opponents)||opponents<1||opponents>999)return fail('Invalid count of threatening foes');
 if(opponents>1&&directional.length&&(!Number.isSafeInteger(d10)||d10<1||d10>10))return fail('HMK p118 directional d10 (1–10) required against multiple foes');
 const covered=candidates.filter(a=>{
  const marker=a.coverageMarkers[location];
  if(opponents>1){
   if(marker==='rear-only')return d10<=5;
   if(marker==='front-only')return d10<=7;
  }
  return (marker!=='front-only'||direction==='front')&&(marker!=='rear-only'||direction==='rear');
 });
 const layers=covered.map(a=>({material:a.material,rigid:a.coverageMarkers[location]==='rigid'||(a.rigid&&['front-only','rear-only'].includes(a.coverageMarkers[location])),aq:0}));
 const value=locationArmourValue({layers,zone:location,aspect,options:armourOptions});
 return {ready:true,source:'HMK World of Kethira pp.117-119',location,aspect,direction,armourValue:value.av,rigidArmour:value.rigid,metalArmour:covered.some(a=>materialMetal.has(a.material)),articleIds:covered.map(a=>a.id),extraEnc:layering.extraEnc,bulkPenalty:layering.bulkPenalty,layering,directionalContext:{opponents,d10:directional.length&&opponents>1?d10:null,checkedArticleIds:directional.map(a=>a.id)}};
}

export function resolveCustomArmourMeleeHit({pieces,location,aspect,direction,layerOptions={},armourOptions={},directionalContext={},armourReduction=0,...hit}={}){
 const protection=resolveCustomArmour({pieces,location,aspect,direction,layerOptions,armourOptions,directionalContext});
 if(!protection.ready)return protection;
 if(!Number.isFinite(armourReduction)||armourReduction<0)return {ready:false,reason:'Invalid armour reduction'};
 const result=resolveMeleeStrikeHit({...hit,location,aspect,armourValue:protection.armourValue,armourReduction,rigidArmour:protection.rigidArmour,metalArmour:protection.metalArmour});
 return {...protection,result};
}
