/** Source-preserving consistency audit. Does not derive printed suit AV from articles. */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {PRINTED_ARMOUR_ARTICLES_P118,armourLocationAttributes} from '../rules/armour-articles-printed.js';
import {PRINTED_SUIT_PROTECTION,SUIT_LOCATION_CODES,printedSuitAV} from '../rules/armour-all-suits-fixed.js';
import {PRINTED_SUIT_RIGID_BOXES} from '../rules/armour-suit-rigid-verified.js';
import {reconcileSuitArticles} from './armour-suit-article-crosswalk.js';
import {classifySuitLibraryEntry} from './armour-suit-library-mode.js';
const ASPECTS=['b','e','p','f'];
export function auditArmourLibraryConsistency({suits=PRINTED_ARMOUR_SUITS_P113_116,articles=PRINTED_ARMOUR_ARTICLES_P118}={}){
 const errors=[],warnings=[],crosswalk=reconcileSuitArticles({suits,articles});
 const names=new Set(suits.map(s=>s.name));
 const articleIds=new Set();
 for(const a of articles){
  if(articleIds.has(a.id))errors.push(`Duplicate article id: ${a.id}`);articleIds.add(a.id);
  const locs=a.coveredLocations||[];
  for(const loc of locs){
   if(!SUIT_LOCATION_CODES.includes(loc))errors.push(`Unknown location ${a.id}/${loc}`);
   const att=armourLocationAttributes(a,loc);
   if(!att||att.direction==='unknown'||att.rigid===null)errors.push(`Unresolved location marker ${a.id}/${loc}`);
   if(!a.layerZoneByLocation?.[loc])errors.push(`Missing layer zone ${a.id}/${loc}`);
  }
  for(const loc of Object.keys(a.coverageMarkers||{}))if(!locs.includes(loc))errors.push(`Orphan coverage marker ${a.id}/${loc}`);
  for(const loc of Object.keys(a.layerZoneByLocation||{}))if(!locs.includes(loc))errors.push(`Orphan layer zone ${a.id}/${loc}`);
 }
 for(const e of crosswalk.entries)if(e.status!=='matched')errors.push(`${e.suit}: ${e.label} (${e.status})`);
 for(const name of Object.keys(PRINTED_SUIT_PROTECTION))if(!names.has(name))errors.push(`Orphan AV suit ${name}`);
 for(const name of Object.keys(PRINTED_SUIT_RIGID_BOXES))if(!names.has(name))errors.push(`Orphan rigid suit ${name}`);
 let cells=0,rigidCells=0,coveredCells=0;
 const results=[];
 for(const suit of suits){
  const local=[];const matrix=PRINTED_SUIT_PROTECTION[suit.name];const rigid=PRINTED_SUIT_RIGID_BOXES[suit.name];
  if(!matrix||!rigid){local.push('Missing AV or rigid matrix');errors.push(`${suit.name}: missing matrix`);continue;}
  for(const loc of SUIT_LOCATION_CODES){
   if(!Array.isArray(matrix[loc])||matrix[loc].length!==4||!Array.isArray(rigid[loc])||rigid[loc].length!==4){local.push(`Invalid matrix shape ${loc}`);continue;}
   for(let i=0;i<4;i++){
    cells++;const av=matrix[loc][i],flag=rigid[loc][i];
    if(av!==null&&(!Number.isInteger(av)||av<0))local.push(`Invalid AV ${loc}/${ASPECTS[i]}`);
    if(typeof flag!=='boolean')local.push(`Invalid rigid flag ${loc}/${ASPECTS[i]}`);
    if(av===null&&flag===true)local.push(`Rigid flag on uncovered cell ${loc}/${ASPECTS[i]}`);
    if(av!==null)coveredCells++;
    if(flag===true)rigidCells++;
    const api=printedSuitAV(suit.name,loc,ASPECTS[i]);
    if(!api.ok||api.av!==av||api.rigid!==flag||api.covered!==(av!==null))local.push(`API disagreement ${loc}/${ASPECTS[i]}`);
   }
  }
  const mode=classifySuitLibraryEntry({name:suit.name});
  if(!mode.recognized||mode.printedEnc!==suit.enc||mode.printedWeightLb!==suit.weightLb)local.push('Library classification mismatch');
  for(const issue of local)errors.push(`${suit.name}: ${issue}`);
  results.push({name:suit.name,page:suit.page,parts:suit.articles.length,issues:local,exception:mode.exception});
 }
 if(cells!==suits.length*SUIT_LOCATION_CODES.length*4)errors.push(`Expected ${suits.length*60} cells; got ${cells}`);
 warnings.push('Printed suit AV is authoritative; individual article AV is not summed to reproduce printed suit totals.');
 warnings.push('This structural audit does not prove visual source fidelity, layer order, Bulk, or browser operation.');
 return {ok:errors.length===0,suits:suits.length,articles:articles.length,matchedParts:crosswalk.matched,totalParts:crosswalk.parts,cells,coveredCells,rigidCells,errors,warnings,results};
}
