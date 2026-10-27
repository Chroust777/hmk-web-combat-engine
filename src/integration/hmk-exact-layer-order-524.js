/** Exact material-order CSP (HMK p.117), bound to authoritative layer table.
 * Local stack domains cover all admissible permutations at each location;
 * their directed constraints are merged into one global DAG. No permutations
 * of unrelated body zones are generated. The final authoritative evaluator
 * always rechecks the assembled order incl. Bulk and ENC conditions.
 */
import {localArmourOrderDomains,evaluateOrderedArmour} from './armour-layer-evaluation.js';

const addEdges=(edges,arr)=>{
 const additions=[];
 for(let i=1;i<arr.length;i++){
  const a=arr[i-1],b=arr[i];
  if(!edges.has(a))edges.set(a,new Set());
  if(!edges.get(a).has(b)){edges.get(a).add(b);additions.push([a,b]);}
 }
 return additions;
};
const undo=(edges,entries)=>{for(const [a,b] of entries)edges.get(a).delete(b)};
function topo(ids,edges){
 const indegree=new Map(ids.map(i=>[i,0]));
 for(const adj of edges.values())for(const b of adj)indegree.set(b,(indegree.get(b)??0)+1);
 const waiting=ids.filter(id=>indegree.get(id)===0).sort(),order=[];
 while(waiting.length){const a=waiting.shift();order.push(a);
  for(const b of edges.get(a)||[]){indegree.set(b,indegree.get(b)-1);
   if(indegree.get(b)===0){waiting.push(b);waiting.sort();}}
 }
 return order.length===ids.length?order:null;
}
export function findExactArmourOrder(items){
 const articles=items.map(c=>({...c.article,id:c.item.id}));
 const domains=localArmourOrderDomains(articles);
 if(!domains)return null;
 const byId=new Map(items.map(c=>[c.item.id,c]));
 const ids=[...byId.keys()];
 const edges=new Map(ids.map(id=>[id,new Set()]));
 const tasks=[],nominatedBulk=[];
 const isTopo=order=>{const loc=new Map(order.map((id,i)=>[id,i]));return [...edges].every(([a,bs])=>[...bs].every(b=>loc.get(a)<loc.get(b)));};
 // Branch on bulk exceptions (one per zone); then on local orders.
 let best=null,bestRank=null;
 const rank=check=>[check.bulkPenalty,-check.extraEnc];
 function checkFinal(){
  const base=topo(ids,edges);if(!base)return;
  // A nominated exceptional C/D article is absent from the ordinary layer
  // permutation domains. Examine every possible relative position for it;
  // all other disconnected pieces commute and need only one canonical order.
  const movable=[...new Set(nominatedBulk)];
  const fixed=base.filter(id=>!movable.includes(id));
  function tryPositions(i,arr){
   if(bestRank?.[0]===0&&bestRank?.[1]===0)return;
   if(i===movable.length){
    if(!isTopo(arr))return;
    const layout=arr.map((id,index)=>({...byId.get(id).article,id,layerOrder:index}));
    const check=evaluateOrderedArmour(layout);
    if(check.status!=='compatible')return;
    const r=rank(check);
    if(!bestRank||r[0]>bestRank[0]||r[0]===bestRank[0]&&r[1]>bestRank[1]){
     best={ordered:arr.map(id=>byId.get(id)),check};bestRank=r;
    }
    return;
   }
   const id=movable[i];
   for(let p=0;p<=arr.length;p++)tryPositions(i+1,[...arr.slice(0,p),id,...arr.slice(p)]);
  }
  tryPositions(0,fixed);
 }
 function visitLocal(i){
  if(bestRank?.[0]===0&&bestRank?.[1]===0)return;
  if(i===tasks.length){checkFinal();return;}
  for(const order of tasks[i]){
   const added=addEdges(edges,order);
   if(topo(ids,edges))visitLocal(i+1);
   undo(edges,added);
  }
 }
 function visitZone(i){
  if(bestRank?.[0]===0&&bestRank?.[1]===0)return;
  if(i===domains.length){
   tasks.sort((a,b)=>a.length-b.length);
   visitLocal(0);return;
  }
  const zone=domains[i];
  for(const option of zone.options){
   let added=[];
   if(option.except)nominatedBulk.push(option.except);
   if(topo(ids,edges)){
    const length=tasks.length;
    tasks.push(...option.subtasks);
    visitZone(i+1);
    tasks.length=length;
   }
   undo(edges,added);
   if(option.except)nominatedBulk.pop();
  }
 }
 visitZone(0);
 return best;
}
