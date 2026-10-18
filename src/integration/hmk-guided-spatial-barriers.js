/** Geometric obstacles are witnessed GM map facts, not HMK-invented rules.
 * HMK p.159 engagement explicitly depends on physical obstructions; p.161
 * movement cannot pass through a closed door or solid wall on a battle map.
 * A door's open state always comes from persistent Initiative, never from a
 * separate untrusted move-path checkbox. Units: feet.
 */
const guard=(yes,msg)=>{if(!yes)throw Error(msg)};
const limit=1e-7;
const pt=p=>p&&typeof p.x==='number'&&typeof p.y==='number'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1000000&&Math.abs(p.y)<=1000000;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
export function validateSpatialBarriers(barriers){
 guard(Array.isArray(barriers)&&barriers.length<=200,'Překážky musí tvořit nejvýše 200 potvrzených úseček');
 const ids=new Set();
 for(const b of barriers){
  guard(b&&typeof b.id==='string'&&b.id.length>0&&b.id.length<=120&&!ids.has(b.id)&&
   ['wall','door'].includes(b.kind)&&pt(b.from)&&pt(b.to)&&Math.hypot(b.to.x-b.from.x,b.to.y-b.from.y)>limit,
   'Neplatná či duplicitní geometrie dveří nebo stěny');
  ids.add(b.id);
 }
 return barriers;
}
export function effectiveSpatialBarriers(sequence){
 const bars=validateSpatialBarriers(sequence.spatialBarriers??[]);
 const objects=sequence.interactionObjects??[];
 return bars.map(b=>{
  if(b.kind==='wall')return {...b,open:false};
  const matching=objects.filter(o=>o.id===b.id&&o.kind==='door'&&typeof o.open==='boolean');
  guard(matching.length===1,'Dveře '+b.id+' nemají jednoznačný uložený stav otevření');
  return {...b,open:matching[0].open};
 });
}
/** Closed barrier collision, including a route that passes along a wall. */
export function pathCrossesClosedBarrier(path,barriers){
 validateSpatialBarriers(barriers);
 guard(Array.isArray(path)&&path.length>=2&&path.every(pt),'Neplatná skutečná trasa pro kontrolu překážek');
 // A two-segment route must not evade collision by putting a waypoint
 // exactly on a door/wall and continuing on the opposite side.
 for(const b of barriers){
  if(b.open===true)continue;
  const vec=sub(b.to,b.from),len2=vec.x*vec.x+vec.y*vec.y;
  for(let k=1;k<path.length-1;k++){
   const mid=path[k],m=sub(mid,b.from),where=(m.x*vec.x+m.y*vec.y)/len2;
   if(Math.abs(cross(vec,m))>limit||where< -limit||where>1+limit)continue;
   let before=0,after=0;
   for(let j=k-1;j>=0;j--){const d=cross(vec,sub(path[j],b.from));if(Math.abs(d)>limit){before=Math.sign(d);break;}}
   for(let j=k+1;j<path.length;j++){const d=cross(vec,sub(path[j],b.from));if(Math.abs(d)>limit){after=Math.sign(d);break;}}
   if(before&&after&&before!==after)return {id:b.id,kind:b.kind,segment:k};
  }
 }
 for(let i=1;i<path.length;i++){
  const a=path[i-1],end=path[i],r=sub(end,a);
  if(Math.hypot(r.x,r.y)<limit)continue;
  for(const b of barriers){
   if(b.open===true)continue;
   const c=b.from,s=sub(b.to,c),den=cross(r,s),u=sub(c,a);
   if(Math.abs(den)<=limit){
    if(Math.abs(cross(u,r))>limit)continue;
    const rr=r.x*r.x+r.y*r.y;
    const t1=(u.x*r.x+u.y*r.y)/rr,t2=((b.to.x-a.x)*r.x+(b.to.y-a.y)*r.y)/rr;
    if(Math.min(Math.max(t1,t2),1)-Math.max(Math.min(t1,t2),0)>limit)
     return {id:b.id,kind:b.kind,segment:i};
    continue;
   }
   const t=cross(u,s)/den,v=cross(u,r)/den;
   // Touching the closed physical barrier at a turn endpoint cannot grant a
   // route through it on the NEXT turn. There is no authoritative side-of-wall
   // history for an actor placed exactly on a barrier, so fail closed on the
   // complete [0,1] interval rather than silently allowing a t=0 crossing.
   if(t>=-limit&&t<=1+limit&&v>=-limit&&v<=1+limit)
    return {id:b.id,kind:b.kind,segment:i};
  }
 }
 return null;
}
/** Manual scene entry, no random result, fixed syntax and full validation. */
export function parseSpatialBarrierSegments(text){
 const s=String(text??'').trim();if(!s)return [];
 const re=/^(wall|door):([^:;]+):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/i;
 const barriers=s.split(';').map(entry=>{
  const m=re.exec(entry.trim());guard(m,'Překážka musí mít tvar door:ID:x1,y1:x2,y2 nebo wall:ID:x1,y1:x2,y2');
  return {kind:m[1].toLowerCase(),id:m[2].trim(),from:{x:Number(m[3]),y:Number(m[4])},to:{x:Number(m[5]),y:Number(m[6])}};
 });
 return validateSpatialBarriers(barriers);
}
