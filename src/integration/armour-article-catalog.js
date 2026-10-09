import {PRINTED_ARMOUR_ARTICLES_P118,armourArticleLocationAttributes} from '../rules/armour-articles-printed.js';
import {validateArmourCoverage} from './armour-coverage-readiness.js';
import {locationArmourValue} from '../rules/armour-options.js';
const MATERIAL_CODES={C:'cloth',L:'leather',D:'padded',Q:'quilted',G:'gambeson',K:'kurbul',S:'scale',M:'mail',P:'plate'};
const ASPECTS=['b','e','p','f'];
/** New p118 catalogue entries; never replace legacy builtin IDs or inventory snapshots. */
export function missingPrintedArmourCatalogEntries(existing=[]){
 const keys=new Set(existing.filter(x=>x?.category==='armor').map(x=>`${(MATERIAL_CODES[x.properties?.material]||String(x.properties?.material||'').toLowerCase())}:${String(x.name||'').replace(/^(Cloth|Leather|Padded|Quilted|Gambeson|Kurbul|Kûrbúl|Scale|Mail|Plate)\s+/i,'').toLowerCase()}`));
 return PRINTED_ARMOUR_ARTICLES_P118.filter(a=>!keys.has(`${a.material}:${a.name.toLowerCase()}`)).map(a=>{
  const check=validateArmourCoverage(a);
  const protection=Object.fromEntries(a.coveredLocations.map(loc=>[loc,Object.fromEntries(ASPECTS.map(aspect=>[aspect,locationArmourValue({layers:[{material:a.material}],zone:loc,aspect}).av]))]));
  return Object.freeze({id:`hmk:armour:p118:verified:${a.id}`,name:`${a.material[0].toUpperCase()+a.material.slice(1)} ${a.name}`,category:'armor',builtin:true,
   description:'HMK p118 armour article; independent reference entry.',source:'HârnMaster Kèthîra, printed pp.117–118',
   properties:{material:a.material,pricePence:a.priceD,weightLb:a.weightLb,encumbrance:typeof a.enc==='number'?a.enc:null,printedEncCode:a.enc,...(a.enc==='a'?{armArticleEncGroup:true}:{}),...(a.perceptionPenalty?{perceptionPenalty:-a.perceptionPenalty}:{}),coveredLocations:[...a.coveredLocations],locationProtection:protection,
    coverageMarkers:{...a.coverageMarkers},locationAttributes:armourArticleLocationAttributes(a),directionRestriction:a.directionRestriction,rigid:a.rigid,bodyZones:[...a.bodyZones],layerZoneByLocation:{...a.layerZoneByLocation},coverageVerified:check.ready,
    coverageNote:check.ready?'p118 verified anatomical coverage; legality of combined layers still requires audit':'NOT combat-ready: '+check.issues.join('; ')}});
 });
}
