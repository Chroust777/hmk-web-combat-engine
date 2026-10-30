/** v93.626 — Read-only chronicle of existing HMK travel evidence.
 * No source is repaired, no die is inferred, no fatigue or inventory is written.
 * Travel distance is party-level; Weariness remains actor-level.
 */
const validMinute=n=>Number.isSafeInteger(n)&&n>=0;
const number=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
const labelOf=(map,id)=>map.get(id)||'Neznámý účastník';
const startOfDay=d=>d*1440;
const watchAt=m=>Math.max(0,Math.min(5,Math.floor((m%1440)/240)));
const fmt=n=>typeof n==='number'&&Number.isFinite(n)?Number(n.toFixed(3)):null;
const stampDie=(faces,value)=>Number.isSafeInteger(faces)&&Number.isSafeInteger(value)?`(d${faces}: ${value})`:null;
const levelName={CS:'kritický úspěch',S:'úspěch',F:'neúspěch',CF:'kritický neúspěch'};
const weatherName={none:'bez srážek',rain:'déšť',snow:'sníh',sleet:'déšť se sněhem'};
const roleName={survival:'průvodce · orientace',drover:'honák nebo jezdec',weather:'vystavený cestující',tracking:'stopař',direction:'průvodce · udržení směru'};
const challengeText={survival:'Vedl družinu krajinou a ověřoval správný směr cesty.',drover:'Ovládal jízdní nebo tažná zvířata během přesunu.',weather:'Odolával skutečným podmínkám chladu nebo horka.',tracking:'Vyhledával a sledoval stopy v krajině.',direction:'Pokoušel se znovu určit správný směr cesty.'};
function rollStrings(rolls=[]){return Array.isArray(rolls)?rolls.map(r=>stampDie(r.faces,r.value??r.roll)).filter(Boolean):[];}
function add(w,actorId,event){w.events.push({actorId,...event});}
function createWatch(day,index){return {index,startMinute:day*1440+index*240,endMinute:day*1440+(index+1)*240,
  sources:[],events:[],distances:[],participants:[],status:'bez potvrzeného cestování'};}
/** Each output contains six fixed watches, plus source-based participation and
 * personal lines. Entries dated at the END of a watch stay linked to the watch
 * that produced them rather than moving into the next 4h interval. */
export function trekkingDayLedger({journal=[],characters=[],campaignId,dayIndex}={}){
 if(!Number.isSafeInteger(dayIndex)||dayIndex<0)return null;
 const names=new Map(characters.map(c=>[c.id,String(c.name||'Neznámá postava')]));
 const map=new Map(journal.map(j=>[j.id,j]));
 const watches=Array.from({length:6},(_,i)=>createWatch(dayIndex,i));
 const seenDistance=new Set();
 const memberWatch=new Map();
 const attach=(sourceId,actorId,event,sourceTime=null)=>{
  const source=map.get(sourceId);
  const m=source?.calendarTrekProof?.campaignMinute??source?.campaignMinute??sourceTime;
  if(!validMinute(m)||Math.floor(m/1440)!==dayIndex)return;
  add(watches[watchAt(m)],actorId,{...event,sourceId});
 };
 const within=j=>j?.calendarCampaignId===campaignId;
 for(const j of journal){
  if(!within(j)||!j.calendarTrekProof||Math.floor(j.campaignMinute/1440)!==dayIndex)continue;
  const p=j.calendarTrekProof,w=watches[watchAt(j.campaignMinute)];
  const ids=[...new Set(p.partyModes?.memberIds??[j.characterId])];
  const animals=(p.partyModes?.animals??[]).map(a=>a.id);
  w.sources.push({id:j.id,area:p.area,guideId:j.characterId,guide:labelOf(names,j.characterId),
   members:ids.map(id=>({id,name:labelOf(names,id)})),animals:animals.map(id=>({id,name:labelOf(names,id)})),
   climate:p.climate,terrain:p.terrain,conveyance:p.conveyance,
   weatherConfirmed:!!p.weatherDay,dayTemperature:p.weatherDay?.daylightHazard??null,nightTemperature:p.weatherDay?.nightHazard??null,
   precipitation:weatherName[p.weatherWatch?.precipitation]??p.weatherWatch?.precipitation??null,
   continuous:p.weatherWatch?.continuous===true,provisionalDistance:fmt(p.effectiveMovement?.kilometres??p.movement?.kilometres)});
  for(const id of [...ids,...animals])memberWatch.set(`${j.id}|${id}`,true);
  add(w,j.characterId,{type:'preparation',sourceId:j.id,
   text:`${labelOf(names,j.characterId)} připravil orientaci a cestu v oblasti ${p.area}. Průvodce určil terén a způsob pohybu pro ${ids.length} členů družiny. Režimy: Progress ${p.modes?.progress??0}, Bearing ${p.modes?.bearing??0}, Foraging ${p.modes?.foraging??0}, Stalking ${p.modes?.stalking??0}, Vigilance ${p.modes?.vigilance??0}.`,
   rolls:rollStrings(p.rolls),status:'připravené podklady, nikoli dokončená cesta'});
  const e=p.encounter;
  if(e?.checkDue){add(w,null,{type:'encounter',sourceId:j.id,
    text:e.encounter?'Při cestě padlo náhodné setkání; jeho podobu určí GM.':'Kontrola náhodného setkání proběhla, bez setkání.',
    rolls:[stampDie(10,e.roll)].filter(Boolean),status:e.encounter?'čeká na rozhodnutí GM':'vyřízeno'});}
  if(p.hazards?.direction)add(w,j.characterId,{type:'direction',sourceId:j.id,
   text:`Průvodce čelil nebezpečí ztráty směru: ${p.hazards.direction}.`,
   rolls:(p.modes?.directionD10||[]).map(v=>stampDie(10,v)).filter(Boolean)});
 }
 for(const j of journal){
  if(!within(j))continue;
  if(j.calendarTrekSkillSource&&j.skillTestProof){
   const link=j.calendarTrekSkillSource,source=map.get(link.sourceId);if(!source?.calendarTrekProof)continue;
   const p=j.skillTestProof,r=p.a||p.result||{},sv=number(r.sv),stars=number(r.svTier?.stars??r.unopposedStars??null);
   const usedSkill=p.skills?.[0]||p.skill||link.skill||'Skill Test';
   const extra=Number.isInteger(sv)?` Výsledné SV ${sv}.`:'';
   attach(link.sourceId,j.characterId,{type:'skill',role:roleName[link.hazard]||'test cestovní události',
    text:`${labelOf(names,j.characterId)} (${usedSkill}) – ${challengeText[link.hazard]||'Vyhodnotil navazující cestovní situaci.'} Výsledek: ${levelName[r.level]||r.level||'doložený hod'}.${extra}`,
    rolls:[stampDie(100,r.roll)].filter(Boolean),stars:stars!==null?stars:null,sv,proofId:j.id});
  }
  if(j.calendarTrekWeatherRoll){const p=j.calendarTrekWeatherRoll;
   attach(p.sourceId,j.characterId,{type:'weather',role:'individuální expozice',
    text:`${labelOf(names,j.characterId)}: ${p.exposed===true?'počasí překonalo ochranu; následuje vyhodnocení expozice':p.exposed===false?'ochrana odolala počasí':'byl proveden Weather Hazard test'}.`,
    rolls:[stampDie(p.sides,p.roll)].filter(Boolean),proofId:j.id});}
  if(j.calendarTrekWildernessProof){const p=j.calendarTrekWildernessProof;
   attach(p.sourceId,j.characterId,{type:'foraging',role:'sběr zásob',
    text:`Během hlídky družina hledala potravu, vodu a léčivé rostliny; doložený nález: potrava ${p.totals?.foodDays??0} denních dávek, voda ${p.totals?.waterDays??0} denních dávek, byliny ${p.totals?.herbDoses??0} dávek.`,
    rolls:rollStrings(p.dice),proofId:j.id,resources:p.totals});}
  if(j.calendarTrekTrackingProof){const p=j.calendarTrekTrackingProof;
   attach(p.sourceId,p.trackerId??j.characterId,{type:'tracking',role:'stopař',
    text:`${labelOf(names,p.trackerId??j.characterId)} sledoval stopy. Upravené SV ${p.score?.adjustedSV??'nedoloženo'}; získané stopy ${p.score?.spoorStars??'nedoloženo'} ★.`,
    stars:number(p.score?.spoorStars),proofId:j.id});}
  if(j.calendarTrekTrackingAwarenessProof){const p=j.calendarTrekTrackingAwarenessProof;
   const track=journal.find(x=>x.id===p.trackingId),src=track?.calendarTrekTrackingProof?.sourceId;
   if(src)attach(src,j.characterId,{type:'tracking',role:'všímavost stopaře',
    text:`${labelOf(names,j.characterId)} rozpoznával stopy: Awareness ${p.level??'doložen'}; výsledné stopy ${p.resultSpoorStars??'nedoloženo'} ★.`,
    rolls:[stampDie(100,p.roll)].filter(Boolean),stars:number(p.resultSpoorStars),proofId:j.id});}
  if(j.calendarTrekEncounterGM){const p=j.calendarTrekEncounterGM;
   attach(p.sourceId,null,{type:'encounter-resolution',role:'rozhodnutí GM',
    text:`GM uzavřel setkání: ${p.disposition==='no-further-consequences'?'bez dalších následků':p.disposition||'vyhodnoceno'}.${p.note?' '+p.note:''}`,proofId:j.id});}
  if(j.calendarTrekAnimalWeatherProof){const p=j.calendarTrekAnimalWeatherProof;
   attach(p.sourceId,j.characterId,{type:'animal-weather',role:'zvíře · vystavení počasí',
    text:`${labelOf(names,j.characterId)} podstoupilo ${p.kind==='cold'?'Cold':'Heat'} Hazard. ${p.risk?.exposed?'Počasí překonalo ochranu zvířete.':'Ochrana zabránila expozici.'}${p.report?.addedWeariness?` Weariness +${p.report.addedWeariness}.`:''}${p.report?.hr?` Exposure HR ${p.report.hr}.`:''}`,
    rolls:[stampDie(p.risk?.sides,p.risk?.roll),stampDie(100,p.endD100)].filter(Boolean),
    proofId:j.id,stars:null});}
  if(j.skillTestProof?.type==='skill-weather-onset'){
   const parent=map.get(j.skillTestProof.sourceId),sourceId=parent?.calendarTrekSkillSource?.sourceId;
   if(sourceId){const report=j.skillTestProof.report||{};
    attach(sourceId,j.characterId,{type:'weather-consequence',role:'zdravotní následek počasí',
     text:`${labelOf(names,j.characterId)}: následný Cold/Heat postup byl potvrzen. ${report.hr?`Exposure HR ${report.hr}. `:''}${Number.isFinite(report.addedWeariness)?`Weariness +${report.addedWeariness}. `:''}${report.skinPending?`Čeká na ${report.skinPending}.`:''}`,
     proofId:j.id});
   }
  }
  if(j.calendarActivityInterruptProof){const p=j.calendarActivityInterruptProof,activity=map.get(p.activityId);
   const sourceId=activity?.calendarActivityProof?.plan?.trekSourceId;
   if(sourceId)attach(sourceId,j.characterId,{type:'interrupt',role:'přerušená cesta',
    text:`${labelOf(names,j.characterId)} přerušil cestu po ${p.elapsedMinutes??'?'} minutách. ${p.reason?'Důvod: '+p.reason+'.':''} Další následky vycházejí z potvrzených dílčích dokladů.`,
    proofId:j.id});
  }
  if(j.calendarForagingSupplyUse&&validMinute(j.campaignMinute)&&Math.floor(j.campaignMinute/1440)===dayIndex){
   const p=j.calendarForagingSupplyUse,unit={foodDays:'denní dávky jídla',waterDays:'denní dávky vody',herbDoses:'bylinné dávky'}[p.unit]||p.unit||'zásoby';
   add(watches[watchAt(j.campaignMinute)],j.characterId,{type:'supply',role:'zásoby',
    text:`${labelOf(names,j.characterId)}: doložený výdej ${p.quantity??'?'} ${unit}${p.herbName?' ('+p.herbName+')':''}. Stav: ${p.disposition==='consumed'?'spotřebováno':p.disposition==='stored-in-container'?'uloženo do nádoby':p.disposition==='reserved'?'rezervováno':p.disposition||'evidováno'}.`,proofId:j.id});
  }
  if(j.calendarNutritionDay){const p=j.calendarNutritionDay,m=validMinute(p.endMinute)?Math.max(0,p.endMinute-1):j.campaignMinute;
   if(validMinute(m)&&Math.floor(m/1440)===dayIndex){
    add(watches[watchAt(m)],j.characterId,{type:'nutrition',role:'denní potřeby',
     text:`${labelOf(names,j.characterId)}: uzavřena denní výživa. Jídlo ${p.foodReceived??'?'} z ${p.foodNeed??'?'} denních dávek, voda ${p.waterReceived??'?'} z ${p.waterNeed??'?'} denních dávek.${p.foodShortfall||p.waterShortfall?' Doložen nedostatek; zdravotní následky vyhodnocuje původní procedura.':''}`,proofId:j.id});
   }
  }
  if(j.calendarTrekAnimalFatigueProof){const p=j.calendarTrekAnimalFatigueProof;
   attach(p.trekSourceId,j.characterId,{type:'fatigue',role:'zvíře',
    text:`${labelOf(names,j.characterId)}: cestovní Weariness ${p.delta>=0?'+':''}${p.delta} (${p.priorFatigue} → ${p.finalFatigue}); ${p.elapsedMinutes} minut.`,
    delta:p.delta,prior:p.priorFatigue,after:p.finalFatigue,proofId:j.id,minutes:p.elapsedMinutes});}
  if(j.calendarExpeditionProof){const p=j.calendarExpeditionProof;
   const act=map.get(p.activityId||p.sourceId),sourceId=p.trekSourceId||act?.calendarActivityProof?.plan?.trekSourceId;
   const where=sourceId&&map.get(sourceId)?.calendarTrekProof;
   const time=act?.calendarActivityProof?.startMinute??(validMinute(j.campaignMinute)?j.campaignMinute-Math.max(0,p.durationMinutes||0):null);
   const type=p.kind==='travel'?'cesta':p.kind==='sleep'?'spánek':p.kind==='rest'?'odpočinek':p.kind==='winded'?'vydýchání':'činnost';
   const detail=`${labelOf(names,j.characterId)} dokončil ${type} (${p.durationMinutes??'?' } min). ${p.kind==='travel'?'Cestovní Weariness':'Obnova únavy'} ${p.delta>=0?'+':''}${p.delta}; stav ${p.priorFatigue} → ${p.finalFatigue}.`;
   const event={type:p.kind==='travel'?'fatigue':'rest',role:p.kind==='travel'?'cestující':'odpočívající',
    text:detail,delta:p.delta,prior:p.priorFatigue,after:p.finalFatigue,minutes:p.durationMinutes,
    rolls:rollStrings(p.physicalDice),proofId:j.id,sourceId};
   if(where)attach(sourceId,j.characterId,event);
   else if(validMinute(time)&&Math.floor(time/1440)===dayIndex)add(watches[watchAt(time)],j.characterId,event);
   if(p.kind==='travel'&&where&&Number.isFinite(p.travelledKilometres)){
    const marker=p.travelGroup?.id||sourceId;
    if(!seenDistance.has(marker)){
     seenDistance.add(marker);
     const m=where.campaignMinute;
     if(Math.floor(m/1440)===dayIndex)watches[watchAt(m)].distances.push({sourceId,km:p.travelledKilometres,leagues:p.travelledLeagues??null,minutes:p.durationMinutes,finished:true});
    }
   }
  }
 }
 for(const w of watches){
  w.events.sort((a,b)=>(a.type==='preparation'?-1:0)-(b.type==='preparation'?-1:0));
  if(w.distances.length)w.status='doložené skutečné cestování';
  else if(w.sources.length)w.status='připravené podklady (bez potvrzené vzdálenosti)';
  else if(w.events.length)w.status='doložené činnosti bez cestovní vzdálenosti';
 }
 const people=characters.map(c=>{
  const items=watches.flatMap(w=>w.events.filter(e=>e.actorId===c.id).map(e=>({...e,index:w.index})));
  const travelled=watches.filter(w=>w.sources.some(s=>s.members.some(x=>x.id===c.id)||s.animals.some(x=>x.id===c.id)));
  const totals=items.filter(e=>e.type==='fatigue'||e.type==='rest').reduce((a,e)=>{
   a.delta+=(e.delta??0);a.minutes+=(e.minutes??0);a.count++;if(a.first===null)a.first=e.prior??null;
   if(e.after!==undefined)a.last=e.after;return a;
  },{delta:0,minutes:0,count:0,first:null,last:null});
  return {id:c.id,name:c.name||c.id,kind:c.kind||'PC',events:items,watches:travelled.map(w=>w.index),fatigue:totals};
 }).filter(p=>p.events.length||p.watches.length);
 const km=fmt(watches.reduce((sum,w)=>sum+w.distances.reduce((s,d)=>s+d.km,0),0));
 return {campaignId,dayIndex,startMinute:startOfDay(dayIndex),endMinute:startOfDay(dayIndex+1),
  watches,people,km,completedWatches:watches.filter(w=>w.distances.length).length,
  evidenceOnly:true};
}
/** Available dates are derived from the START of the actual watch/activity,
 * never from the END-time receipt in the next calendar day. */
export function trekkingLedgerDays({journal=[],campaignId,now=0,maxDays=12}={}){
 const days=new Set([Math.floor(Math.max(0,now)/1440)]);
 const sources=new Map(journal.map(j=>[j.id,j]));
 for(const j of journal){
  if(j?.calendarCampaignId!==campaignId)continue;
  let minute=null;
  if(j.calendarTrekProof)minute=j.calendarTrekProof.campaignMinute??j.campaignMinute;
  else if(j.calendarExpeditionProof){
   const p=j.calendarExpeditionProof;
   const source=sources.get(p.trekSourceId)?.calendarTrekProof;
   const act=sources.get(p.activityId||p.sourceId)?.calendarActivityProof;
   minute=source?.campaignMinute??act?.startMinute??null;
  }
  if(validMinute(minute)&&minute<=now)days.add(Math.floor(minute/1440));
 }
 return [...days].sort((a,b)=>b-a).slice(0,maxDays);
}
