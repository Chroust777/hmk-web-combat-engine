import {PRINTED_ARMOUR_ARTICLES_P118 as articles} from '../src/rules/armour-articles-printed.js';
import {evaluateOrderedArmour,localArmourOrderDomains} from '../src/integration/armour-layer-evaluation.js';
import {checkArmourLayering} from '../src/integration/armour-layer-legality.js';
import {resolveCustomArmour} from '../src/integration/armour-custom-combat.js';
import {validateArmourCoverage} from '../src/integration/armour-coverage-readiness.js';
import {locationArmourValue} from '../src/rules/armour-options.js';
const mat={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const rows={C:['•','C','C','CD','Q'],L:['C','CD','L','•','C'],D:['•','C','D','KP','C'],Q:['•','C','Q','[kp]','C'],G:['•','C','G','•','C'],K:['C','CD','K','•','CDQ'],S:['•','CD','S','[kp]','CDQ'],M:['C','CD','M','KP','CDQ'],P:['C','CD','P','•','CDQ']};
const far=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
function strict(items,zone){
 if(items.length>5||items.filter(x=>x.material==='padded'||x.material==='quilted').length>1)return false;
 if(!items.length)return true;
 for(let base=0;base<items.length;base++){
  const row=rows[mat[items[base].material]];
  function rec(i,last){
   if(i===items.length)return true;
   const item=items[i];
   for(let c=last+1;c<5;c++){
    if((i===base)!==(c===2))continue;
    const token=row[c],code=mat[item.material];
    if(token==='•'||!token.toUpperCase().includes(code))continue;
    if(c===4&&!far.has(item.name.toLowerCase().trim()))continue;
    if(token==='[kp]'&&!['arms','legs'].includes(zone))continue;
    if(rec(i+1,c))return true;
   }
   return false;
  }
  if(rec(0,-1))return true;
 }
 return false;
}
let checks=0,pass=0,disallowed=0,unresolved=0,violations=0,compatible=0,bulk=0;const failures=[],samples=[];
const ok=(cond,msg)=>{checks++;if(cond)pass++;else failures.push(msg);};
const items=a=>({...a});
for(const a of articles){
 const valid=validateArmourCoverage(a);ok(valid.ready,`coverage ${a.id}`);
 const evaln=evaluateOrderedArmour([{...a,layerOrder:0}]);ok(evaln.status==='compatible'&&evaln.bulkPenalty===0&&evaln.extraEnc===0,`single ${a.id}: ${evaln.status}`);
 for(const loc of a.coveredLocations){
  for(const aspect of ['b','e','p','f']){
   const av=locationArmourValue({layers:[{material:a.material}],zone:loc,aspect}).av;
   ok(Number.isSafeInteger(av)&&av>=0,`AV ${a.id}/${loc}/${aspect}`);
  }
 }
}
for(let i=0;i<articles.length;i++)for(let j=i+1;j<articles.length;j++)for(let order=0;order<2;order++){
 const arr=[articles[i],articles[j]];
 if(order)arr.reverse();
 const input=arr.map((a,k)=>({...a,layerOrder:k}));
 const assessment=evaluateOrderedArmour(input);
 if(assessment.status==='compatible')compatible++;
 if(assessment.status==='unresolved')unresolved++;
 if(assessment.status==='violation')violations++;
 if(assessment.bulkPenalty)bulk++;
 // For two articles the abstract rules can be checked independently at
 // every actual overlapping location, including the one-C/D Bulk exception.
 let possible=true,strictAll=true;
 for(const zone of ['head','arms','torso','legs']){
  const locs=new Set(input.flatMap(a=>a.coveredLocations.filter(loc=>a.layerZoneByLocation[loc]===zone)));
  const local=[];
  for(const loc of locs){
   const stack=input.filter(a=>a.layerZoneByLocation[loc]===zone);
   const legal=strict(stack,zone);
   local.push([stack,legal]);
   if(!legal)strictAll=false;
  }
  if(local.some(([,legal])=>!legal)){
   const eligibles=input.filter(a=>a.bodyZones.includes(zone)&&['cloth','padded'].includes(a.material));
   if(!eligibles.some(removed=>local.every(([stack])=>strict(stack.filter(a=>a.id!==removed.id),zone))))possible=false;
  }
 }
 ok(!(assessment.status==='compatible'&&!possible),`false authorization ${arr[0].id} / ${arr[1].id} order${order}`);
 // If physically disjoint, no Bulk and no bonus ENC is ever needed.
 const overlap=arr.some((a,k)=>arr.slice(k+1).some(b=>a.coveredLocations.some(loc=>a.layerZoneByLocation[loc]===b.layerZoneByLocation[loc]&&b.coveredLocations.includes(loc))));
 if(!overlap)ok(assessment.status==='compatible'&&assessment.bulkPenalty===0&&assessment.extraEnc===0,`disjoint improperly blocked ${arr[0].id} / ${arr[1].id}`);
 if(!possible)disallowed++;
}
const result={articles:articles.length,pairs:articles.length*(articles.length-1),checks,pass,failures:failures.length,firstFailures:failures.slice(0,15),pairStates:{compatible,unresolved,violation:violations,bulk},abstractForbidden:disallowed};
console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
