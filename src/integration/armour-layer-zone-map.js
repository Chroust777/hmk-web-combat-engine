/** HMK p.117-118: layer zone belongs to an article/location pair. */
export const BODY_ZONES=Object.freeze(['head','arms','torso','legs']);
export const ANATOMICAL_LOCATIONS=Object.freeze(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
const zoneSet=new Set(BODY_ZONES);
const locationSet=new Set(ANATOMICAL_LOCATIONS);
export function validateLayerZoneMap(article){
 const coverage=article.coveredLocations;
 const map=article.layerZoneByLocation;
 if(!Array.isArray(coverage)||!coverage.length||new Set(coverage).size!==coverage.length||coverage.some(l=>!locationSet.has(l)))return 'Invalid anatomical coverage';
 if(!map||typeof map!=='object'||Array.isArray(map))return 'Missing or invalid per-location layer zone map';
 const keys=Object.keys(map);
 if(keys.length!==coverage.length||keys.some(k=>!coverage.includes(k)||!zoneSet.has(map[k])))return 'Layer zone map must cover exactly the anatomical locations with valid zones';
 if(article.bodyZones!==undefined){
  if(!Array.isArray(article.bodyZones)||!article.bodyZones.length||new Set(article.bodyZones).size!==article.bodyZones.length||article.bodyZones.some(z=>!zoneSet.has(z)))return 'Invalid explicit body zones';
  if(article.bodyZones.length!==new Set(Object.values(map)).size||article.bodyZones.some(z=>!Object.values(map).includes(z)))return 'Explicit body zones disagree with per-location map';
 }
 return null;
}
export function articleCoversZone(article,zone){return article.coveredLocations.some(l=>article.layerZoneByLocation[l]===zone);}
export function zoneLocations(articles,zone){return [...new Set(articles.flatMap(a=>a.coveredLocations.filter(l=>a.layerZoneByLocation[l]===zone)))];}
export function articleCoversZoneLocation(article,zone,loc){return article.layerZoneByLocation[loc]===zone;}
