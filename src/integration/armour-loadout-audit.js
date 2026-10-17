import { locationArmourValue } from '../rules/armour-options.js';
const ASPECTS=['b','e','p','f'];
const BODY_ZONES={head:['sk','fa','nk'],arms:['sh','ua','el','fo','ha'],torso:['tx','ab','pv'],legs:['th','kn','ca','ft']};
const MATERIAL_CODES={C:'C',cloth:'C',L:'L',leather:'L',D:'D',padded:'D',Q:'Q',quilted:'Q',G:'G',gambeson:'G',K:'K',kurbul:'K',S:'S',scale:'S',M:'M',mail:'M',P:'P',plate:'P'};
const VALID_LOCATIONS=new Set(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
/** Advisory protection audit; a partially mapped loadout cannot yield a complete AV. */
export function auditArmourLoadout(inventory=[]){
 const locations=new Map(),warnings=[],skipped=[],unknownCoverage=[],wornArticles=[];
 const worn=inventory.filter(x=>x?.slot==='worn'&&x?.snapshot?.category==='armor');
 const seenIds=new Set();
 for(const entry of worn){
  const name=entry.snapshot.name, p=entry.snapshot.properties||{};
  if(seenIds.has(entry.id)){skipped.push({id:entry.id,name,reason:'duplicate inventory ID'});continue;}
  seenIds.add(entry.id);
  if(!Number.isSafeInteger(entry.quantity)||entry.quantity!==1){skipped.push({id:entry.id,name,reason:'quantity not exactly one'});continue;}
  if(!p.locationProtection||typeof p.locationProtection!=='object'||Array.isArray(p.locationProtection)||!Object.keys(p.locationProtection).length){
   skipped.push({id:entry.id,name,reason:'missing locationProtection'});continue;
  }
  const entries=Object.entries(p.locationProtection);
  if(entries.some(([loc,av])=>!VALID_LOCATIONS.has(loc)||!av||!ASPECTS.every(a=>Number.isFinite(av[a])&&av[a]>=0))){
   skipped.push({id:entry.id,name,reason:'invalid anatomical location or incomplete AV'});continue;
  }
  wornArticles.push({id:entry.id,name,material:MATERIAL_CODES[String(p.material||'').toLowerCase()]||MATERIAL_CODES[p.material]||null,covered:new Set(entries.map(([loc])=>loc))});
  for(const [loc,av] of entries){
   if(!locations.has(loc))locations.set(loc,[]);
   locations.get(loc).push({id:entry.id,name,material:p.material,av});
  }
 }
 const rows=[...locations].sort(([a],[b])=>a.localeCompare(b)).map(([location,layers])=>{
  if(layers.length>5)warnings.push({location,reason:'More than five layers; not rules-validated',count:layers.length});
  const protection=Object.fromEntries(ASPECTS.map(aspect=>[aspect,locationArmourValue({layers,zone:location,aspect}).av]));
  return {location,count:layers.length,protection,articles:layers.map(({id,name})=>({id,name}))};
 });
 // HMK printed p.117: restrictions apply independently to the four Body Zones.
 // Different articles can cover disjoint locations in one zone; count layers at
 // each location, not total articles across the entire zone.
 const zones=[];
 for(const [zone,codes] of Object.entries(BODY_ZONES)){
   const relevant=wornArticles.filter(a=>codes.some(c=>a.covered.has(c)));
   const paddedQuilted=relevant.filter(a=>['D','Q'].includes(a.material));
   const unmapped=relevant.filter(a=>!a.material);
   const zoneWarnings=[];
   if(paddedQuilted.length>1)zoneWarnings.push('Multiple padded/quilted articles in one zone: manual p.117 layering review required');
   if(unmapped.length)zoneWarnings.push('Unknown armour material: layering cannot be checked');
   for(const reason of zoneWarnings)warnings.push({zone,reason,articleIds:relevant.map(a=>a.id)});
   zones.push({zone,articleIds:relevant.map(a=>a.id),paddedQuiltedCount:paddedQuilted.length,warnings:zoneWarnings});
 }
 const complete=skipped.length===0&&warnings.length===0;
 return {format:'hmk-armour-loadout-audit-v2',authoritative:false,complete,rows,zones,skipped,warnings,unknownCoverage,
  notes:['Protection is only a subtotal for explicitly mapped worn articles','If any worn article is skipped, all displayed anatomical values are incomplete subtotals','Full layering legality, ENC, rigid armour, and suit compliance remain unverified; zone D/Q flags are conservative manual-review triggers','No changes to saved data']};
}
