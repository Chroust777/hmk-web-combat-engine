/** HMK 1.2 pp.145–150: verify a watch before advancing the campaign clock.
 * Travel cannot be certified by a checkbox or a general GM journal note.
 * Only proofs for the SAME guide, calendar, watch and source are admissible.
 * Not an alternative Skill SV / Fatigue / Injury engine.
 */
import {trekkingOutstandingCases} from './hmk-trekking-followups.js';
import {adjustedOrienteeringSV,assertOrienteeringModes} from './hmk-trekking-orienteering.js';
const valid = x => Number.isSafeInteger(x) && x>=0 && x<=1e9;
const requireFact=(ok,message)=>{if(!ok)throw Error(message);};
export function assessTrekkingReadiness({journal=[],characters=[],actorId,campaignId,minute,kind}={}){
 requireFact(typeof actorId==='string'&&actorId&&typeof campaignId==='string'&&campaignId&&valid(minute),
  'Chybí postava, kampaň nebo doložená minuta cestovní hlídky.');
 requireFact(['walk','ride','drive','double-walk','double-drover'].includes(kind),'Neznámý cestovní režim.');
 const rows=journal.filter(j=>j.characterId===actorId&&j.calendarCampaignId===campaignId&&
  j.campaignMinute===minute&&j.calendarTrekProof?.format==='hmk-trekking-watch-evidence-v1');
 requireFact(rows.length===1,'Před cestou je nutná právě jedna uložená Trekking Routine pro tuto postavu, kampaň a minutu.');
 const source=rows[0],p=source.calendarTrekProof;
 const compatible=(kind==='walk'||kind==='double-walk')?p.conveyance==='foot':
  kind==='ride'?p.conveyance==='mount':kind==='drive'?['cart','wagon'].includes(p.conveyance):
  ['mount','cart','wagon'].includes(p.conveyance);
 requireFact(compatible&&p.modes?.doubleTime===kind.startsWith('double-'),
  'Režim cesty neodpovídá uložené Trekking Routine.');
 const linked=journal.filter(j=>j.calendarTrekSkillSource?.format==='hmk-trek-linked-skill-v1'&&
  j.calendarTrekSkillSource.sourceId===source.id&&j.calendarTrekSkillSource.hazard==='survival'&&
  j.calendarCampaignId===campaignId&&j.characterId===actorId&&valid(j.campaignMinute)&&j.campaignMinute>=minute&&
  ['success-value-specific','secondary-mastery-value-test'].includes(j.skillTestProof?.type)&&
  (j.skillTestProof?.a||j.skillTestProof?.result));
 requireFact(linked.length===1,
  'Chybí jediný přímo navázaný Orienteering / Survival Success Value test pro tuto hlídku. Otevřete upozornění v kalendáři.');
 const result=linked[0].skillTestProof.a||linked[0].skillTestProof.result;
 requireFact(Number.isSafeInteger(result.sv)&&['CF','F','S','CS'].includes(result.level),
  'Uložený Survival test nedokládá vyhodnotitelný Success Value.');
 let available,spent,verifiedSV=result.sv;
 if(p.orienteeringContext){
  const drover=journal.filter(j=>j.calendarTrekSkillSource?.sourceId===source.id&&
   j.calendarTrekSkillSource.hazard==='drover'&&j.calendarCampaignId===campaignId&&
   j.characterId===p.orienteeringContext.droverId&&j.campaignMinute>=minute);
  requireFact(p.conveyance==='foot'||drover.length===1,
   'Chybí doložený Riding/Animalcraft Drover Test pro tuto hlídku.');
  const droverResult=p.conveyance==='foot'?null:(drover[0].skillTestProof?.a||drover[0].skillTestProof?.result);
  const adjustment=adjustedOrienteeringSV({baseSV:result.sv,context:p.orienteeringContext,droverResult});
  const certified=assertOrienteeringModes({adjustment,modes:p.modes});
  available=certified.available;spent=certified.spent;verifiedSV=certified.adjustedSV;
 }else{
  available=result.sv>=5?Math.min(5,result.sv-4):0;spent=p.modes.progress+p.modes.bearing;
  requireFact(Number.isSafeInteger(spent)&&spent>=0&&spent<=available,
   `Orienteering SV ${result.sv} dovoluje ${available} Advantage Modes, ale v hlídce je ${spent} Progress/Bearing.`);
  if(result.sv<=0)throw Error('Starší hlídka se SV ≤ 0 nemá doložený Lax Mode. Nelze ji bezpečně vyhodnotit.');
  if(result.sv<=2)requireFact(p.modes.slow>=1,'Orienteering SV 1–2 vyžaduje Slow Mode.');
 }
 const pending=trekkingOutstandingCases(characters,journal,campaignId)
  .filter(x=>x.sourceId===source.id&&x.characterId===actorId);
 requireFact(pending.length===0,
  'Neuzavřená pravidlová povinnost před pokračováním cesty: '+pending.map(x=>x.description).join('; '));
 requireFact(!journal.some(j=>j.calendarExpeditionProof?.trekSourceId===source.id),
  'Únava a čas této cestovní hlídky již byly uloženy. Nelze je započítat podruhé.');
 const movement=p.effectiveMovement??p.movement;
 requireFact(movement&&Number.isFinite(movement.leagues)&&Number.isFinite(movement.kilometres),
  'Nedoložená vypočtená vzdálenost cesty.');
 return {sourceId:source.id,source,orienteeringId:linked[0].id,sv:verifiedSV,rawSV:result.sv,
  availableModes:available,spentModes:spent,movement};
}
