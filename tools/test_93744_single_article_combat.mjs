import {PRINTED_ARMOUR_ARTICLES_P118 as articles,armourLocationAttributes} from '../src/rules/armour-articles-printed.js';
import {resolveCustomArmour} from '../src/integration/armour-custom-combat.js';
import {locationArmourValue} from '../src/rules/armour-options.js';
const locations=['sk','fa','nk','sh','ua','el','fo','ha','tx','ab','pv','th','kn','ca','ft'];
let pass=0,fail=[];function chk(b,s){if(b)pass++;else if(fail.length<30)fail.push(s)}
for(const a of articles){
 for(const loc of locations){
  for(const dir of ['front','rear','side'])for(const aspect of ['b','e','p','f']){
   const r=resolveCustomArmour({pieces:[{id:a.id,layerOrder:0}],location:loc,aspect,direction:dir,directionalContext:{opponents:1}});
   chk(r.ready,`not ready ${a.id}/${loc}/${aspect}/${dir} ${r.reason}`);
   if(!r.ready)continue;
   const marker=a.coverageMarkers[loc];
   const active=!!marker&&(marker!=='front-only'||dir==='front')&&(marker!=='rear-only'||dir==='rear');
   const av=active?locationArmourValue({layers:[{material:a.material}],zone:loc,aspect}).av:0;
   const rigid=active&&!!armourLocationAttributes(a,loc)?.rigid;
   chk(r.armourValue===av,`wrong AV ${a.id}/${loc}/${aspect}/${dir} ${r.armourValue} vs ${av}`);
   chk(r.rigidArmour===rigid,`rigid ${a.id}/${loc}/${aspect}/${dir}`);
  }
 }
}
console.log(JSON.stringify({catalogArticles:articles.length,locations:locations.length,aspects:4,directions:3,pass,failed:fail.length,firstFailures:fail},null,2));if(fail.length)process.exitCode=1;
