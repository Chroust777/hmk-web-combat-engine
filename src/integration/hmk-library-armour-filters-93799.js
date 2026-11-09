/** HMK v1.2 pp.112,117–118: read-only presentation filters for armour
 * articles. Do not infer anatomical coverage from an article's name or
 * assign protection where no location evidence is stored. */
export const ARMOUR_FILTER_MATERIALS_93799=Object.freeze([
 ['C','Cloth'],['L','Leather'],['D','Padded'],['Q','Quilted'],
 ['G','Gambeson'],['K','Kûrbúl'],['S','Scale'],['M','Mail'],['P','Plate']
]);
export const ARMOUR_FILTER_LOCATIONS_93799=Object.freeze([
 ['sk','Skull'],['fa','Face'],['nk','Neck'],['sh','Shoulder'],
 ['ua','Upper Arm'],['el','Elbow'],['fo','Forearm'],['ha','Hand'],
 ['tx','Thorax'],['ab','Abdomen'],['pv','Pelvis'],['th','Thigh'],
 ['kn','Knee'],['ca','Calf'],['ft','Foot']
]);
const materialByName=new Map(ARMOUR_FILTER_MATERIALS_93799.map(([code,name])=>[name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),code]));
materialByName.set('kurbul','K');
const locByName=new Map(ARMOUR_FILTER_LOCATIONS_93799.map(([code,name])=>[name.toLowerCase().replace(/[^a-z]/g,''),code]));
export function armourFilterMaterialCode93799(value){
 const raw=String(value??'').trim();
 if(ARMOUR_FILTER_MATERIALS_93799.some(([code])=>code===raw.toUpperCase()))return raw.toUpperCase();
 return materialByName.get(raw.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase())||'';
}
export function armourFilterLocationCode93799(value){
 const raw=String(value??'').trim().toLowerCase().replace(/[^a-z]/g,'');
 if(ARMOUR_FILTER_LOCATIONS_93799.some(([code])=>code===raw))return raw;
 return locByName.get(raw)||'';
}
export function armourArticleLocations93799(item){
 const p=item?.properties||{},result=new Set();
 for(const value of Array.isArray(p.coveredLocations)?p.coveredLocations:[]){
  const code=armourFilterLocationCode93799(value);if(code)result.add(code);
 }
 // A keyed locationProtection object supplies explicit anatomical evidence.
 if(p.locationProtection&&typeof p.locationProtection==='object'&&!Array.isArray(p.locationProtection)){
  for(const [loc,protection] of Object.entries(p.locationProtection)){
   const code=armourFilterLocationCode93799(loc);
   if(code&&protection&&typeof protection==='object')result.add(code);
  }
 }
 return result;
}
export function armourCatalogMatches93799(item,material='all',location='all'){
 if(item?.category!=='armor')return false;
 if(material!=='all'&&armourFilterMaterialCode93799(item.properties?.material)!==material)return false;
 if(location!=='all'&&!armourArticleLocations93799(item).has(location))return false;
 return true;
}
export function filterArmourCatalog93799(items,material='all',location='all'){
 return items.filter(item=>armourCatalogMatches93799(item,material,location));
}
