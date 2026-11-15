/** Prevent JSON.stringify silently turning NaN/Infinity into null in a campaign
 * snapshot. Never "repair" evidence: report the exact invalid field instead.
 */
export function assertFiniteState93897(value){
 const stack=[{value,path:'$'}],visited=new WeakSet();
 while(stack.length){
  const node=stack.pop(),v=node.value;
  if(typeof v==='number'&&!Number.isFinite(v))
   throw Error('Neplatná číselná hodnota v herním stavu: '+node.path);
  if(!v||typeof v!=='object')continue;
  if(visited.has(v))continue;
  visited.add(v);
  for(const [key,child] of Object.entries(v))
   stack.push({value:child,path:Array.isArray(v)?node.path+'['+key+']':node.path+'.'+key});
 }
 return true;
}
