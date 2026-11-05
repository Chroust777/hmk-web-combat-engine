import {PRINTED_ARMOUR_ARTICLES_P118 as A} from '../src/rules/armour-articles-printed.js';
import {evaluateOrderedArmour} from '../src/integration/armour-layer-evaluation.js';
const C={cloth:'C',leather:'L',padded:'D',quilted:'Q',gambeson:'G',kurbul:'K',scale:'S',mail:'M',plate:'P'};
const R={C:['•','C','C','CD','Q'],L:['C','CD','L','•','C'],D:['•','C','D','KP','C'],Q:['•','C','Q','[kp]','C'],G:['•','C','G','•','C'],K:['C','CD','K','•','CDQ'],S:['•','CD','S','[kp]','CDQ'],M:['C','CD','M','KP','CDQ'],P:['C','CD','P','•','CDQ']};
const FAR=new Set(['cloak','mantle','vest','surcoat','coat','robe','cuisse','cuisses']);
function legal(items,z){
 if(items.length>5||items.filter(a=>['padded','quilted'].includes(a.material)).length>1)return false;
 if(!items.length)return true;
 for(let b=0;b<items.length;b++){
  const row=R[C[items[b].material]];
  function recur(i,last){if(i===items.length)return true;
   for(let k=last+1;k<5;k++){
    if((i===b)!==(k===2))continue;
    const token=row[k],code=C[items[i].material];
    if(token==='•'||!token.toUpperCase().includes(code))continue;
    if(token==='[kp]'&&!['arms','legs'].includes(z))continue;
    if(k===4&&!FAR.has(items[i].name.toLowerCase()))continue;
    if(recur(i+1,k))return true;
   }return false;
  }
  if(recur(0,-1))return true;
 }return false;
}
function possible(items){
 for(const zone of ['head','arms','torso','legs']){
  const members=items.filter(a=>a.bodyZones.includes(zone));
  const locs=new Set(members.flatMap(a=>a.coveredLocations.filter(loc=>a.layerZoneByLocation[loc]===zone)));
  const candidates=[null,...members.filter(a=>['cloth','padded'].includes(a.material))];
  if(!candidates.some(exc=>[...locs].every(loc=>legal(members.filter(a=>a!==exc&&a.layerZoneByLocation[loc]===zone),zone))))return false;
 }return true;
}
let seed=9474415;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
let checks=0,compatible=0,unresolved=0,violation=0,unknown=0;const errors=[];
for(let j=0;j<50000;j++){
 let n1=rand()%A.length,n2=rand()%A.length,n3=rand()%A.length;
 if(new Set([n1,n2,n3]).size!==3){j--;continue;}
 const order=[A[n1],A[n2],A[n3]];
 const articles=order.map((a,i)=>({...a,layerOrder:i}));
 const out=evaluateOrderedArmour(articles);checks++;
 if(out.status==='compatible')compatible++;
 else if(out.status==='unresolved')unresolved++;
 else if(out.status==='violation')violation++;
 else unknown++;
 if(out.status==='compatible'&&!possible(order)){
  errors.push({ids:order.map(x=>x.id),status:out.status,bulk:out.bulkPenalty});if(errors.length>=20)break;
 }
}
console.log(JSON.stringify({randomTripleOrders:checks,compatible,unresolved,violation,unknown,falseAuthorizations:errors.length,firstErrors:errors.slice(0,8)},null,2));
if(errors.length)process.exitCode=1;
