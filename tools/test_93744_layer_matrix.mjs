
import {evaluateOrderedArmour} from '../src/integration/armour-layer-evaluation.js';
import {PRINTED_LAYER_COMBINATIONS_P119} from '../src/rules/armour-layer-combinations-p119.js';
import {PRINTED_ARMOUR_ARTICLES_P118} from '../src/rules/armour-articles-printed.js';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../src/rules/armour-suit-printed.js';
import {auditArmourCoverage} from '../src/integration/armour-coverage-readiness.js';
import {auditSuitEnc} from '../src/integration/armour-suit-enc-audit.js';
import {auditSuitAnatomicalStacks} from '../src/integration/armour-suit-anatomical-audit.js';
import {checkArmourLayering} from '../src/integration/armour-layer-legality.js';
import {assessArmourFeasibility} from '../src/integration/hmk-armour-feasibility.js';
import {verifyOrderedArmourLayers} from '../src/rules/armour-layer-order.js';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let assertions=0;const failures=[];
function check(test,message){assertions++;if(!test)failures.push(message);}
const material={C:'cloth',L:'leather',D:'padded',Q:'quilted',G:'gambeson',K:'kurbul',S:'scale',M:'mail',P:'plate'};
const baseAV={C:[0,1,0,1],L:[1,2,1,3],D:[2,2,1,2],Q:[4,3,2,3],G:[6,5,4,5],K:[4,6,5,4],S:[4,8,5,5],M:[2,8,7,3],P:[6,11,9,5]};
// Independent literal source transcription from HMK p117.
const rows={
 C:['•','C','C','CD','Q'],L:['C','CD','L','•','C'],D:['•','C','D','KP','C'],
 Q:['•','C','Q','[kp]','C'],G:['•','C','G','•','C'],K:['C','CD','K','•','CDQ'],
 S:['•','CD','S','[kp]','CDQ'],M:['C','CD','M','KP','CDQ'],P:['C','CD','P','•','CDQ']};
const slotNames=['underFar','underNear','base','overNear','overFar'];
const parse=s=>s.replace(/[^A-Za-z]/g,'').replace(/\*/g,'').toUpperCase();
function oracleStrict(codes,zone='torso'){
 if(codes.length>5||codes.filter(x=>x==='D'||x==='Q').length>1)return false;
 if(!codes.length)return true;
 for(let base=0;base<codes.length;base++){
  const t=rows[codes[base]];if(!t)continue;
  const recurse=(i,last)=>{
   if(i>=codes.length)return true;
   for(let col=last+1;col<5;col++){
    if((i===base)!==(col===2))continue;
    if(col===4&&i!==codes.length-1)continue;
    const token=t[col];
    if(token==='•')continue;
    if(token==='[kp]'&&zone!=='arms'&&zone!=='legs')continue;
    if(!parse(token).includes(codes[i]))continue;
    if(recurse(i+1,col))return true;
   }return false;
  };
  if(recurse(0,-1))return true;
 }
 return false;
}
function mk(codes,zone='torso'){
 const loc=zone==='arms'?'ua':'tx';return codes.map((m,i)=>({id:'x'+i,material:material[m],name:'Coat',layerOrder:i,coveredLocations:[loc],bodyZones:[zone],layerZoneByLocation:{[loc]:zone}}));
}
const coverage=auditArmourCoverage();check(coverage.total===92&&coverage.ready===92,'92 articles source coverage');
const enc=auditSuitEnc();check(enc.count===12&&enc.allMatched&&enc.allEncMatched&&enc.allPerceptionMatched,'all 12 printed suits ENC and PER');
const suits=auditSuitAnatomicalStacks();check(suits.results.length===12&&suits.allMatched,'12 suits crosswalk');
let knownP119Mismatch=0;
for(const [idx,r] of PRINTED_LAYER_COMBINATIONS_P119.entries()){
 const sum=[0,0,0,0];
 const codes=r.slots.filter(t=>t!=='•').map(parse);
 for(const m of codes)for(let k=0;k<4;k++)sum[k]+=baseAV[m][k];
 if(!equal(sum,r.av)){knownP119Mismatch++;check(idx===72&&r.slots.join(',')==='•,•,D,K,•'&&r.av[2]===5&&sum[2]===6,'one printed p119 inconsistency');}
 const zone=r.slots.some(t=>t.startsWith('['))?'arms':'torso',loc=zone==='arms'?'ua':'tx';
 const article=r.slots.flatMap((t,i)=>t==='•'?[]:[{id:'p'+idx+'-'+i,material:material[parse(t)],name:i===4?'Cloak':i===3?'Kneecops':'Coat',layerOrder:i,coveredLocations:[loc],bodyZones:[zone],layerZoneByLocation:{[loc]:zone}}]);
 const slotByArticleId=Object.fromEntries(r.slots.flatMap((t,i)=>t==='•'?[]:[['p'+idx+'-'+i,slotNames[i]]]));
 const result=evaluateOrderedArmour(article,{slotByArticleId});
 check(result.status==='compatible'&&result.bulkPenalty===0,'p119 row '+idx+' '+r.slots.join('/'));
 const expectExtra=(r.slots[4]==='D'||r.slots[4]==='Q')?5:0;
 check(result.extraEnc===expectExtra,'p119 extra ENC row '+idx+' '+r.slots.join('/'));
}
check(knownP119Mismatch===1,'exactly one printed p119 arithmetical mismatch');
// All physical orders of all 9 materials up to 4 simultaneous layers, plus
// all 59,049 five-layer signatures; includes illegal stacks. This is exhaustive
// over material signatures, not over inventory identities or 92-article subsets.
const stats={strings:0,strict:0,bulk:0,forbidden:0,unresolved:0,oracleMismatch:0};
const letters=Object.keys(material);
for(let len=1;len<=5;len++){
 const total=9**len;
 for(let i=0;i<total;i++){
  let v=i,cs=[];for(let j=0;j<len;j++){cs.push(letters[v%9]);v=Math.floor(v/9);}
  const direct=oracleStrict(cs);
  const exceptional=!direct&&cs.some((m,index)=>(m==='C'||m==='D')&&oracleStrict(cs.filter((_,k)=>k!==index)));
  const r=evaluateOrderedArmour(mk(cs));
  stats.strings++;
  if(direct){stats.strict++;if(!['compatible','unresolved'].includes(r.status)){stats.oracleMismatch++;if(failures.length<20)failures.push('oracle strict '+cs+' vs '+r.status+' '+r.errors)}}
  else if(exceptional){stats.bulk++;if(!['compatible','unresolved'].includes(r.status)){stats.oracleMismatch++;if(failures.length<20)failures.push('oracle bulk '+cs+' vs '+r.status+' '+r.errors)}}
  else{stats.forbidden++;if(r.status==='compatible'){stats.oracleMismatch++;if(failures.length<20)failures.push('oracle forbidden '+cs+' vs '+r.status)}}
  if(r.status==='unresolved')stats.unresolved++;
 }
}
check(stats.oracleMismatch===0,'all 66,429 material signatures vs independent reference oracle');
// The full combinatorial inventory (2^92) is intentionally not enumerated;
// material/layout equivalence classes above are exhaustively covered.
// Distinct disjoint articles can exceed five in one zone without extra layers.
const make=(id,m,loc,order)=>({id,name:'Coat',material:m,code:Object.keys(material).find(k=>material[k]===m),layerOrder:order,coveredLocations:[loc],bodyZones:['arms'],layerZoneByLocation:{[loc]:'arms'}});
const distinctDQ=[make('a','padded','sh',0),make('b','quilted','fo',1)];
const sixDistinct=[make('c1','cloth','sh',0),make('c2','cloth','sh',1),...['ua','el','fo','ha'].map((l,i)=>make('c'+(i+3),'cloth',l,i+2))];
for(const [name,items] of [['disjoint D/Q',distinctDQ],['six distinct articles',sixDistinct]]){
 check(evaluateOrderedArmour(items).status==='compatible',name+' ordered');
 check(checkArmourLayering(items).status==='compatible',name+' legality');
 check(assessArmourFeasibility(items).status==='can-arrange',name+' feasibility');
 check(verifyOrderedArmourLayers(items).valid,name+' secondary validator');
}
console.log(JSON.stringify({assertions,failures:failures.length,firstFailures:failures.slice(0,20),statistics:stats,printedP119Mismatch:knownP119Mismatch},null,2));
if(failures.length)process.exitCode=1;
