import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {reconcileSuitArticles} from './armour-suit-article-crosswalk.js';

// The PDF's printed dot matrix is not a trustworthy substitute for a verified
// body-location transcription. Fail closed until each row is independently checked.
export const HMK_BODY_LOCATIONS=Object.freeze(['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft']);
const allowed=new Set(HMK_BODY_LOCATIONS);
export function validateArmourCoverage(article){
 const issues=[];
 if(!article||typeof article!=='object')return {ready:false,issues:['missing article']};
 if(article.coverageSource!=='HMK-p118-visual-verified')issues.push('coverage not visually verified against printed p.118');
 if(!Array.isArray(article.coveredLocations)||!article.coveredLocations.length)issues.push('missing anatomical locations');
 else {
  if(new Set(article.coveredLocations).size!==article.coveredLocations.length)issues.push('duplicate anatomical location');
  if(article.coveredLocations.some(x=>!allowed.has(x)))issues.push('unknown anatomical location');
 }
 if(!Array.isArray(article.bodyZones)||!article.bodyZones.length)issues.push('missing body-zone classification');
 else if(article.bodyZones.some(x=>!['head','arms','torso','legs'].includes(x)))issues.push('invalid body zone');
 if(!['none','front-only','rear-only','special'].includes(article.directionRestriction))issues.push('directional coverage not verified');
 if(typeof article.rigid!=='boolean')issues.push('rigid flag not verified');
 if(!article.coverageMarkers||typeof article.coverageMarkers!=='object'||Array.isArray(article.coverageMarkers))issues.push('missing per-location coverage markers');
 else if(Array.isArray(article.coveredLocations)){
  const keys=Object.keys(article.coverageMarkers);
  if(keys.length!==article.coveredLocations.length||keys.some(k=>!article.coveredLocations.includes(k)))issues.push('coverage markers do not match locations');
  if(keys.some(k=>!['standard','rigid','front-only','rear-only'].includes(article.coverageMarkers[k])))issues.push('invalid coverage marker');
  if(keys.some(k=>article.coverageMarkers[k]==='rigid')&&article.rigid!==true)issues.push('rigid marker conflicts with article');
  if(keys.some(k=>article.coverageMarkers[k]==='front-only')&&article.directionRestriction!=='front-only')issues.push('front-only marker conflicts with article');
  if(keys.some(k=>article.coverageMarkers[k]==='rear-only')&&!['rear-only','special'].includes(article.directionRestriction))issues.push('rear-only marker conflicts with article');
 }
 return {ready:issues.length===0,issues};
}
export function auditArmourCoverage(articles=PRINTED_ARMOUR_ARTICLES_P118){
 const rows=articles.map(article=>({id:article.id,material:article.material,name:article.name,...validateArmourCoverage(article)}));
 const crosswalk=reconcileSuitArticles({articles});
 return {total:rows.length,ready:rows.filter(x=>x.ready).length,pending:rows.filter(x=>!x.ready).length,suitParts:crosswalk.parts,matched:crosswalk.matched,rows};
}
export function requireVerifiedArmourCoverage(article){
 const result=validateArmourCoverage(article);
 if(!result.ready)throw new Error(`Armour coverage unverified: ${article?.id??'unknown'}: ${result.issues.join('; ')}`);
 return article;
}
