/** HMK 1.2, printed pp.145-148. Append-only correction of a prepared watch.
 * Do not replace dice, source watch, the clock or a character's state. The
 * correction is an additional, source-linked, replayable proof.
 */
import {adjustedOrienteeringSV,assertOrienteeringModes} from './hmk-trekking-orienteering.js';
import {trekWatchMovement,trekHazards,adjustedTrekkingMovement} from './hmk-trekking-routine.js';
const ok=(condition,message)=>{if(!condition)throw Error(message);};
const isD10=x=>Number.isSafeInteger(x)&&x>=1&&x<=10;
export const TREK_CORRECTION_FORMAT='hmk-trekking-watch-correction-v1';
export const extras=m=>({foraging:m?.foraging??0,stalking:m?.stalking??0,vigilance:m?.vigilance??0});
export const modeTotal=m=>m.progress+m.bearing+extras(m).foraging+extras(m).stalking+extras(m).vigilance;
export function certifyTrekOrienteering(source,journal){
 const p=source?.calendarTrekProof;
 ok(p?.format==='hmk-trekking-watch-evidence-v1','Chybí původní cestovní hlídka');
 const linked=journal.filter(j=>j.calendarTrekSkillSource?.format==='hmk-trek-linked-skill-v1'&&
  j.calendarTrekSkillSource.sourceId===source.id&&j.calendarTrekSkillSource.hazard==='survival'&&
  j.calendarCampaignId===source.calendarCampaignId&&j.characterId===source.characterId&&
  j.campaignMinute>=source.campaignMinute);
 ok(linked.length===1,'Chybí jeden autoritativní Orienteering / Survival test pro tuto hlídku');
 const r=linked[0].skillTestProof?.a??linked[0].skillTestProof?.result;
 ok(Number.isSafeInteger(r?.sv)&&['CF','F','S','CS'].includes(r?.level),'Neplatný doložený Survival SV');
 ok(p.orienteeringContext,'Starší hlídka bez situačního kontextu nemůže být automaticky opravena');
 const drover=journal.filter(j=>j.calendarTrekSkillSource?.sourceId===source.id&&
  j.calendarTrekSkillSource.hazard==='drover'&&j.calendarCampaignId===source.calendarCampaignId&&
  j.characterId===p.orienteeringContext.droverId&&j.campaignMinute>=source.campaignMinute);
 ok(p.conveyance==='foot'||drover.length===1,'Chybí původní Riding/Animalcraft test vodiče');
 const droverResult=p.conveyance==='foot'?null:(drover[0].skillTestProof?.a??drover[0].skillTestProof?.result);
 const adjustment=adjustedOrienteeringSV({baseSV:r.sv,context:p.orienteeringContext,droverResult});
 return {orienteeringId:linked[0].id,droverId:drover[0]?.id??null,adjustment};
}
/** Preserve bearing first (it protects the original route), then other modes.
 * Excess Progress is discarded first. The preselected travel intent remains
 * documented by the original watch, while this projection uses only certified
 * modes. Lax vs Slow at SV 1-2 defaults to Slow, conservatively.
 */
export function correctedModes(prepared,adjustment,{lowChoice=null}={}){
 const original={progress:prepared.progress,bearing:prepared.bearing,...extras(prepared)};
 ok(Object.values(original).every(x=>Number.isSafeInteger(x)&&x>=0)&&
  original.stalking<=1&&original.vigilance<=1,'Neplatné připravené režimy hlídky');
 const result={...prepared};
 let spare=adjustment.advantageModes;
 for(const key of adjustment.stationaryForaging?['foraging','stalking','vigilance']:['bearing','foraging','stalking','vigilance','progress']){
  result[key]=Math.min(original[key],spare);spare-=result[key];
 }
 const sv=adjustment.adjustedSV;
 const validLowChoice=sv>=1&&sv<=2&&Number(prepared.lax)+Number(prepared.orienteeringSlow)===1;
 if(sv>=1&&sv<=2&&!validLowChoice)ok(['lax','slow'].includes(lowChoice),
  'SV 1–2 vyžaduje rozhodnutí GM: vyberte Lax nebo Slow; žádná volba nebude domyšlena.');
 result.lax=sv<=0||(sv>=1&&sv<=2&&(validLowChoice?prepared.lax:lowChoice==='lax'));
 result.orienteeringSlow=sv<=0?1:sv<=2?(validLowChoice?prepared.orienteeringSlow:Number(lowChoice==='slow')):0;
 result.slow=result.manualSlow+(result.orienteeringSlow)+(prepared.slow-prepared.manualSlow-(prepared.orienteeringSlow??0));
 // A forfeited Foraging/Stalking Mode removes its associated movement penalty.
 if(!adjustment.stationaryForaging)result.slow+=(result.foraging>0?1:0)-(original.foraging>0?1:0)+result.stalking-original.stalking;
 ok(Number.isSafeInteger(result.slow)&&result.slow>=0,'Neplatný součet Slow Modes');
 assertOrienteeringModes({adjustment,modes:result});
 ok(modeTotal(result)<=adjustment.advantageModes,'Překročený rozpočet Advantage Modes');
 return result;
}
export function previewTrekCorrection(source,journal,{lowChoice=null}={}){
 const {orienteeringId,droverId,adjustment}=certifyTrekOrienteering(source,journal);
 const p=source.calendarTrekProof,old=p.modes;
 const modes=correctedModes(old,adjustment,{lowChoice});
 const neededProgress=Math.max(0,modes.progress-modes.slow),oldProgress=old.progressD10.length;
 const additionalProgress=Math.max(0,neededProgress-oldProgress);
 const movementBase=trekWatchMovement({stationaryForaging:!!p.orienteeringContext?.stationaryForaging,topography:p.landscape,terrain:p.terrain,conveyance:p.conveyance,
  progress:modes.progress,slow:modes.slow,loaded:modes.loaded,bearing:modes.bearing,
  doubleTime:modes.doubleTime,continuousPrecipitation:p.weatherWatch.continuous,
  progressD10:[...old.progressD10.slice(0,neededProgress),...Array(additionalProgress).fill(1)]});
 const additionalDirection=Math.max(0,movementBase.bearingDeficit-old.directionD10.length);
 ok(!(modes.doubleTime&&(modes.slow>0||modes.loaded)),
  'Oprava by změnila přípustnost Double Time. Vyžaduje samostatné rozhodnutí GM o režimu cesty.');
 return {orienteeringId,droverId,adjustment,modes,additionalProgress,additionalDirection,
  alreadyValid:modeTotal(old)<=adjustment.advantageModes&&old.lax===modes.lax&&
   old.orienteeringSlow===modes.orienteeringSlow&&old.slow===modes.slow&&modeTotal(old)===modeTotal(modes)};
}
export function createTrekCorrection({source,journal,additionalRolls=[],origin='manual',lowChoice=null}={}){
 const preview=previewTrekCorrection(source,journal,{lowChoice}),p=source.calendarTrekProof;
 ok(!preview.alreadyValid,'Hlídka již odpovídá doloženému Orienteering SV. Oprava není potřebná.');
 ok(['manual','cryptographic-software-die'].includes(origin),'Neplatný původ nových kostek');
 ok(Array.isArray(additionalRolls)&&additionalRolls.length===preview.additionalProgress+preview.additionalDirection&&
  additionalRolls.every(isD10),'Nesouhlasí počet doplňkových d10 hodů');
 const modes={...preview.modes};let cursor=0;
 modes.progressD10=[...p.modes.progressD10.slice(0,Math.max(0,modes.progress-modes.slow)),
  ...additionalRolls.slice(cursor,cursor+preview.additionalProgress)];cursor+=preview.additionalProgress;
 const movement=trekWatchMovement({stationaryForaging:!!p.orienteeringContext?.stationaryForaging,topography:p.landscape,terrain:p.terrain,conveyance:p.conveyance,
  progress:modes.progress,slow:modes.slow,loaded:modes.loaded,bearing:modes.bearing,
  doubleTime:modes.doubleTime,continuousPrecipitation:p.weatherWatch.continuous,progressD10:modes.progressD10});
 modes.directionD10=[...p.modes.directionD10.slice(0,movement.bearingDeficit),...additionalRolls.slice(cursor)];
 const hazards=trekHazards({bearingDeficit:movement.bearingDeficit,directionD10:modes.directionD10});
 const adapted={...p,modes,hazards,movement};
 const effectiveMovement=hazards.direction==='lost-time'?adjustedTrekkingMovement(adapted):movement;
 ok(!(modes.doubleTime&&hazards.direction==='lost-time'),
  'Nový Direction Hazard znamená Lost Time; Double Time nelze automaticky potvrdit.');
 const rolls=[...additionalRolls.slice(0,preview.additionalProgress).map(value=>({faces:10,label:'Oprava Progress',value,origin})),
  ...additionalRolls.slice(preview.additionalProgress).map(value=>({faces:10,label:'Oprava Direction Hazard',value,origin}))];
 return {format:TREK_CORRECTION_FORMAT,sourceId:source.id,sourceMinute:source.campaignMinute,
  orienteeringId:preview.orienteeringId,droverId:preview.droverId,
  adjustedSV:preview.adjustment.adjustedSV,lowChoice,modes,movement,hazards,effectiveMovement,rolls,sourcePage:145};
}
export function latestTrekCorrection(source,journal){
 const rows=journal.filter(j=>j.calendarTrekCorrection?.sourceId===source.id);
 ok(rows.length<=1,'Duplicitní oprava jedné hlídky');return rows[0]??null;
}
export function effectiveTrekSource(source,journal){
 const row=latestTrekCorrection(source,journal);
 if(!row)return source;
 const c=row.calendarTrekCorrection;
 return {...source,calendarTrekProof:{...source.calendarTrekProof,
  modes:c.modes,movement:c.movement,hazards:c.hazards,effectiveMovement:c.effectiveMovement}};
}
export function validateTrekCorrections(journal=[]){
 const byId=new Map(journal.map(j=>[j.id,j])),seen=new Set();
 for(const row of journal){const c=row.calendarTrekCorrection;if(!c)continue;
  ok(c.format===TREK_CORRECTION_FORMAT&&!seen.has(c.sourceId),'Neplatná nebo duplicitní oprava hlídky');seen.add(c.sourceId);
  const source=byId.get(c.sourceId);
  ok(source?.calendarTrekProof&&source.characterId===row.characterId&&
   source.calendarCampaignId===row.calendarCampaignId&&row.campaignMinute>=source.campaignMinute&&
   c.sourceMinute===source.campaignMinute,'Oprava nepatří do této kampaně, hlídky nebo postavě');
  const documented=c.rolls??[];
  ok(documented.every(x=>x.faces===10&&isD10(x.value)&&['manual','cryptographic-software-die'].includes(x.origin))&&
   new Set(documented.map(x=>x.origin)).size<=1,'Neplatné důkazy doplňkových hodů');
  const restored=createTrekCorrection({source,journal,additionalRolls:documented.map(x=>x.value),origin:documented[0]?.origin??'manual',lowChoice:c.lowChoice??null});
  ok(JSON.stringify(restored)===JSON.stringify(c),'Pozměněný výsledek opravy hlídky');
  ok(!journal.some(j=>j.calendarExpeditionProof?.trekSourceId===source.id&&j.campaignMinute<row.campaignMinute),
   'Opravu nelze zpětně zavést po dokončeném cestovním intervalu');
 }
 return true;
}
