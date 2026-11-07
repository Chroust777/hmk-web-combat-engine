/** v93.772. Pure, side-effect-free scheduling. A person owns a continuous
 * lane inside a single GM interval. Different people may act concurrently.
 * This plans no rolls, weather outcomes, ledger mutations or calendar writes.
 */
import {planSharedWindow93771} from './hmk-shared-planner-93771.js';
export function planEpisodeRows93772(window,rows=[],weatherIds=[]){
 const scheduled=[],errors=[],used={};
 if(!window)return {scheduled,errors,used};
 if(!Array.isArray(rows)||!Array.isArray(weatherIds))return {scheduled,errors:[{id:'',message:'Neplatné plánované činnosti nebo počasí.'}],used};
 const allowed=new Set(weatherIds),seen=new Set(),laneIds=new Map(),converted=[];
 for(const r of rows){
  if(!r||typeof r.id!=='string'||!r.id||seen.has(r.id)){errors.push({id:r?.id||'',message:'Neplatná nebo duplicitní identita řádku.'});continue;}
  seen.add(r.id);
  const actor=r.actorId;
  if(typeof actor!=='string'||!actor){errors.push({id:r.id,message:'Vyberte postavu.'});continue;}
  if(!Number.isSafeInteger(r.minutes)||r.minutes<1){errors.push({id:r.id,message:'Zadejte kladný počet celých minut.'});continue;}
  if(!allowed.has(r.weatherId)){errors.push({id:r.id,message:'Vyberte platné globální počasí pro tento den.'});continue;}
  const prior=laneIds.get(actor),gid=prior||r.id;
  converted.push({id:r.id,groupId:gid,followsGroup:prior||'',kind:r.kind,minutes:r.minutes,memberIds:[actor]});
  laneIds.set(actor,gid);
  used[actor]=(used[actor]||0)+r.minutes;
 }
 const engine=planSharedWindow93771(window,converted);
 errors.push(...engine.errors);
 for(const item of engine.scheduled){
  const row=rows.find(r=>r.id===item.id);
  scheduled.push({...item,actorId:row.actorId,weatherId:row.weatherId});
 }
 for(const [actor,minutes] of Object.entries(used))if(minutes>window.minutes){
  for(const r of rows)if(r?.actorId===actor&&!errors.some(e=>e.id===r.id))
   errors.push({id:r.id,message:'Postavě '+actor+' zbývá v intervalu pouze '+Math.max(0,window.minutes-(minutes-r.minutes))+' minut.'});
 }
 return {scheduled,errors,used};
}
export function rowMaximum93772(window,rows=[],id,actorId){
 if(!window||!actorId)return 0;
 return Math.max(0,window.minutes-rows.reduce((n,r)=>n+(r.id!==id&&r.actorId===actorId&&Number.isSafeInteger(r.minutes)?r.minutes:0),0));
}
