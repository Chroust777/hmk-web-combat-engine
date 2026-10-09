/** HMK World of Kèthîra pp. 111, 113–119: read-only protection of a *live*
 * combat target, using equipped inventory snapshots. Never writes wounds or gear.
 * A source-id alone never certifies a modified/stale armour snapshot.
 */
import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {locationArmourValue} from '../rules/armour-options.js';
import {HMK_BODY_LOCATIONS} from './armour-coverage-readiness.js';
import {resolveCustomArmour} from './armour-custom-combat.js';
import {identifyWornPrintedSuit,resolvePrintedSuitProtection,selectPrintedSuitRigidStatus} from './printed-suit-combat.js';

const catalogue=new Map(PRINTED_ARMOUR_ARTICLES_P118.map(a=>[a.id,a]));
const aspects=new Set(['b','e','p','f']);
const directions=new Set(['front','rear','side']);
const materialCodes={C:'cloth',L:'leather',D:'padded',Q:'quilted',G:'gambeson',K:'kurbul',S:'scale',M:'mail',P:'plate'};
const validSlots=new Set(['underFar','underNear','base','overNear','overFar']);
const fail=(reason,detail)=>({ready:false,reason,detail:detail??null,requiresGMResolution:true});
const canonName=(name)=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^(cloth|leather|padded|quilted|gambeson|kurbul|scale|mail|plate)\s+/i,'').toLowerCase().trim();
const stableValue=(obj)=>JSON.stringify(obj);
const sameArray=(a,b)=>Array.isArray(a)&&a.length===b.length&&[...a].sort().every((x,i)=>x===[...b].sort()[i]);

/** Strictly establish that an inventory snapshot still expresses the audited p118
 * article. We don't silently replace the owned snapshot with a newer definition.
 */
export function resolveOwnedArmourArticle(item){
 if(!item||item.slot!=='worn'||item.quantity!==1||item.snapshot?.category!=='armor')return fail('Not a single worn armour article');
 const id=item.sourceItemId;
 if(typeof id!=='string'||item.snapshot.id!==id)return fail('Armour snapshot has no matching original definition ID');
 let source;
 const prefix='hmk:armour:p118:verified:';
 if(id.startsWith(prefix)){
  source=catalogue.get(id.slice(prefix.length));
  if(!source)return fail('Unknown p118 verified article ID');
  if(item.snapshot.properties?.coverageVerified!==true)return fail('Owned article coverage is not verified');
 }else if(id.startsWith('hmk:armour:p118:')){
  // Legacy built-ins have stable IDs and the source-verified annotation added
  // in v93.74. Resolve by unique *material + name*, never name alone.
  const p=item.snapshot.properties||{};
  if(p.armourReferenceStatus!=='matched-p118')return fail('Legacy armour has no verified p118 match');
  const material=materialCodes[p.material];
  const matches=PRINTED_ARMOUR_ARTICLES_P118.filter(a=>a.material===material&&canonName(a.name)===canonName(item.snapshot.name));
  if(matches.length!==1)return fail('Legacy armour material/name has no unique p118 match');
  source=matches[0];
 }else return fail('Armour is not linked to an audited HMK p118 article');
 const p=item.snapshot.properties||{};
 const mat=materialCodes[p.material]??String(p.material||'').toLowerCase();
 if(mat!==source.material||canonName(source.name)!==canonName(item.snapshot.name))return fail('Armour material/name differs from printed source');
 if(!sameArray(p.coveredLocations,source.coveredLocations))return fail('Snapshot covered locations differ from audited p118 source');
 if(!p.locationProtection||typeof p.locationProtection!=='object')return fail('Armour snapshot has no anatomical AV');
 const locations=Object.keys(p.locationProtection);
 if(!sameArray(locations,source.coveredLocations))return fail('Snapshot AV locations differ from audited p118 source');
 for(const loc of source.coveredLocations){
  for(const aspect of aspects){
   const expected=locationArmourValue({layers:[{material:source.material}],zone:loc,aspect}).av;
   if(p.locationProtection[loc]?.[aspect]!==expected)return fail(`Owned AV differs from HMK for ${loc}/${aspect}`);
  }
 }
 if(p.coverageMarkers!==undefined&&stableValue(p.coverageMarkers)!==stableValue(source.coverageMarkers))return fail('Snapshot directional/rigid markers differ from HMK p118');
 if(p.directionRestriction!==undefined&&p.directionRestriction!==source.directionRestriction)return fail('Snapshot directional rule differs from HMK p118');
 if(p.rigid!==undefined&&p.rigid!==source.rigid)return fail('Snapshot rigid status differs from HMK p118');
 if(p.layerZoneByLocation!==undefined&&stableValue(p.layerZoneByLocation)!==stableValue(source.layerZoneByLocation))return fail('Snapshot layering zones differ from HMK p118');
 return {ready:true,article:source};
}

/** Resolve the protection of a specified participant from the actual currently
 * worn items. 'auto': exact printed suit first, otherwise strictly audited
 * custom layering. 'custom': never substitute a suit or GM-entered sum.
 */
export function resolveLiveCombatArmour({inventory,targetId,location,aspect,direction,mode='auto',suitName=null,rigidStatus='unknown',layerOptions={},armourOptions={},directionalContext={}}={}){
 if(!Array.isArray(inventory)||typeof targetId!=='string'||!targetId)return fail('Missing target or inventory');
 if(!HMK_BODY_LOCATIONS.includes(location)||!aspects.has(aspect))return fail('Invalid anatomical location or aspect');
 if(!['auto','custom','reference'].includes(mode))return fail('Unknown armour resolution mode');
 if(!['yes','no','unknown'].includes(rigidStatus))return fail('Unknown rigid armour selection');
 const worn=inventory.filter(x=>x.characterId===targetId&&x.slot==='worn'&&x.snapshot?.category==='armor');
 if(inventory.some(x=>x.characterId===targetId&&x.slot==='worn'&&x.snapshot?.category!=='armor'))return fail('Non-armour item in worn slot');
 if(worn.some(x=>x.quantity!==1))return fail('Worn armour must have a quantity of exactly one');
 const match=identifyWornPrintedSuit(inventory,targetId);
 if(mode==='reference'||(mode==='auto'&&match.ok)){
  if(mode==='reference'&&(!suitName||typeof suitName!=='string'))return fail('Explicit suit reference requires a printed suit name');
  if(!directions.has(direction))return fail('Attack direction must be explicit');
  if(mode!=='reference'){for(const x of worn){const checked=resolveOwnedArmourArticle(x);if(!checked.ready)return fail(`${x.snapshot?.name||x.id}: ${checked.reason}`);}}
  const name=mode==='reference'?suitName:match.name;
  const p=resolvePrintedSuitProtection(name,location,aspect);
  if(!p.ok)return fail(p.reason||'Printed suit AV unavailable');
  const rigid=selectPrintedSuitRigidStatus(p,rigidStatus);
  if(!rigid.ok)return fail(rigid.reason);
  return {ready:true,mode:mode==='reference'?'gm-reference':'exact-worn-suit',source:'HMK pp.113–116',targetId,location,aspect,direction,
   armourValue:p.av[aspect],rigidArmour:rigid.status==='yes',rigidStatus:rigid.status,rigidSource:rigid.source,
   metalArmour:null, // Printed B/E/P/F alone cannot establish impact-specific metal protection.
   suitName:name,inventoryIds:mode==='reference'?[]:match.inventoryIds,
   extraEnc:null,bulkPenalty:null,requiresSeparateLoadAudit:true};
 }
 if(!directions.has(direction))return fail('Attack direction must be explicit for custom armour');
 const pieces=[],byId=new Map(),slotByArticleId={},bulkExceptionByZone={};
 for(const x of worn){
  const verified=resolveOwnedArmourArticle(x);
  if(!verified.ready)return fail(`${x.snapshot?.name||x.id}: ${verified.reason}`);
  const id=verified.article.id;
  if(byId.has(id))return fail(`Duplicate worn article ${id}; cannot distinguish layers by catalogue ID`);
  byId.set(id,x);
  const layerOrder=x.layerOrder??(worn.length===1?0:null);
  if(!Number.isSafeInteger(layerOrder)||layerOrder<0)return fail(`${x.snapshot.name}: specify inner-to-outer layer order in the character inventory`);
  if(x.layerSlot!==undefined&&x.layerSlot!==null&&x.layerSlot!==''){
   if(!validSlots.has(x.layerSlot))return fail(`${x.snapshot.name}: invalid layer column`);
   slotByArticleId[id]=x.layerSlot;
  }
  const bulkZones=x.bulkExceptionZones??[];
  if(!Array.isArray(bulkZones)||new Set(bulkZones).size!==bulkZones.length||bulkZones.some(z=>!['head','arms','torso','legs'].includes(z)))return fail(`${x.snapshot.name}: invalid GM Bulk exception zones`);
  for(const zone of bulkZones){
   if(bulkExceptionByZone[zone]!==undefined)return fail(`Several Bulk exception articles selected for ${zone}`);
   bulkExceptionByZone[zone]=id;
  }
  pieces.push({id,layerOrder});
 }
 if(layerOptions.bulkExceptionByZone&&Object.entries(layerOptions.bulkExceptionByZone).some(([z,id])=>bulkExceptionByZone[z]!==undefined&&bulkExceptionByZone[z]!==id))return fail('Contradictory GM Bulk selections');
 const merged={...layerOptions,bulkExceptionByZone:{...bulkExceptionByZone,...(layerOptions.bulkExceptionByZone||{})},slotByArticleId:{...slotByArticleId,...(layerOptions.slotByArticleId||{})}};
 const p=resolveCustomArmour({pieces,location,aspect,direction,layerOptions:merged,armourOptions,directionalContext});
 if(!p.ready)return fail(p.reason,p.detail);
 const actual=p.rigidArmour?'yes':'no';
 if(rigidStatus!=='unknown'&&rigidStatus!==actual)return fail(`GM rigid selection contradicts audited p118 protection (${actual})`);
 return {ready:true,mode:'custom-worn',source:'HMK pp.117–119',targetId,location,aspect,direction,
  armourValue:p.armourValue,rigidArmour:p.rigidArmour,rigidStatus:actual,rigidSource:'p118 verified marks',
  metalArmour:p.metalArmour,inventoryIds:worn.map(x=>x.id),articleIds:p.articleIds,
  extraEnc:p.extraEnc,bulkPenalty:p.bulkPenalty,requiresSeparateLoadAudit:true,
  layeringStatus:p.layering.status,directionalContext:p.directionalContext};
}
