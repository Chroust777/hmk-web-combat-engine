/** Bounded, purely presentational in-app navigation history.
 * Never holds, replays, or rolls back persisted campaign state.
 * A new visit after Back drops the prior Forward branch.
 */
export const uiRouteSignature=route=>JSON.stringify(route);
export function createNavigationHistory({limit=120}={}){
 if(!Number.isSafeInteger(limit)||limit<2)throw Error('Neplatná délka historie');
 const entries=[];let pointer=-1;
 const current=()=>entries[pointer]||null;
 const clone=route=>JSON.parse(JSON.stringify(route));
 return {
  canBack:()=>pointer>0,
  canForward:()=>pointer>=0&&pointer<entries.length-1,
  current:()=>current()?clone(current()):null,
  length:()=>entries.length,
  rememberScroll(y){if(current()&&Number.isFinite(y))current().scrollY=Math.max(0,Math.floor(y));},
  visit(route,{scrollY}={}){
   if(!route||typeof route.view!=='string')throw Error('Chybí obrazovka historie');
   const key=uiRouteSignature(route);
   if(current()?.key===key)return false;
   this.rememberScroll(scrollY);
   entries.splice(pointer+1);
   entries.push({route:clone(route),key,scrollY:0});
   if(entries.length>limit)entries.shift();
   pointer=entries.length-1;
   return true;
  },
  back(){if(pointer<=0)return null;pointer--;return clone(current());},
  forward(){if(pointer<0||pointer>=entries.length-1)return null;pointer++;return clone(current());}
 };
}
