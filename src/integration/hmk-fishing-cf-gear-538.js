/** Fishing Critical Failure (HMK v1.2 p.71): consequences of the follow-up
 * Dexterity/Agility test. Loss/damage is NOT implied on follow-up S/CS.
 * Physical injury on CF is separate and requires the existing Injury Sequence.
 * The printed rule does not prescribe WQ loss or a particular affected item.
 */
import {recordInventoryDisposition} from './hmk-inventory-disposition.js';
const must=(ok,msg)=>{if(!ok)throw Error(msg)};
const campaignKey=clock=>clock?.campaignId||`legacy:${clock?.events?.[0]?.id||''}`;
export function fishingGearDue(journal,followup){
 const p=followup?.skillTestProof;
 return p?.type==='critical-followup'&&p.skill==='Fishing'&&p.activity==='fishing-sv'&&
   ['F','CF'].includes(p.result?.level)&&
   !(journal||[]).some(x=>x.skillTestProof?.type==='fishing-gear-consequence'&&x.skillTestProof.sourceId===followup.id);
}
export function commitFishingGear(db,{sourceId,actorId,itemId,outcome,reason,eventId,dispositionId,createdAt,confirmedByGM}={}){
 must(db&&Array.isArray(db.inventory)&&Array.isArray(db.journal)&&Array.isArray(db.characters),'Chybí autoritativní inventář a historie');
 const source=db.journal.find(x=>x.id===sourceId),p=source?.skillTestProof;
 must(fishingGearDue(db.journal,source),'Tento rybářský F/CF následek není otevřen nebo už byl zapsán');
 must(p.actorId===actorId&&source.characterId===actorId,'Předmět musí patřit skutečné postavě původního Fishing Testu');
 const origin=db.journal.find(x=>x.id===p.originId)?.skillTestProof;
 const originalSkill=p.side==='B'?origin?.skills?.[1]:origin?.skills?.[0]||origin?.skill;
 const originalResult=p.side==='B'?origin?.b:origin?.a||origin?.result;
 const originalActor=p.side==='B'?origin?.opponentId:origin?.actorId;
 must(origin&&originalSkill==='Fishing'&&originalResult?.level==='CF'&&
  originalActor===actorId,'Chybí ověřený původní Fishing CF u zasažené postavy');
 must(['lost','damaged'].includes(outcome),'GM musí vybrat ztrátu nebo poškození');
 must(typeof reason==='string'&&reason.trim().length>=2&&reason.trim().length<=240,'Doplňte skutečný popis ztráty nebo poškození (2–240 znaků)');
 must(confirmedByGM===true,'GM musí potvrdit konkrétní fyzické vybavení a následek');
 must(db.campaignClock&&campaignKey(db.campaignClock)===source.calendarCampaignId&&
   source.calendarCampaignId===campaignKey(db.campaignClock)&&
   Number.isSafeInteger(db.campaignClock.minute)&&db.campaignClock.minute>=0&&
   (db.campaignClock.characterIds??db.characters.map(c=>c.id)).includes(actorId),
  'Následek patří k otevřené kampani a jejímu původnímu členovi');
 must(typeof eventId==='string'&&eventId&&typeof dispositionId==='string'&&dispositionId&&
  eventId!==dispositionId&&typeof createdAt==='string'&&createdAt,'Chybí identita dokladu');
 must(!db.journal.some(x=>[eventId,dispositionId].includes(x.id)),'Duplicitní identita dokladu');
 const item=db.inventory.find(x=>x.id===itemId&&x.characterId===actorId);
 must(item&&item.snapshot&&item.slot!=='chest','GM musí vybrat fyzický předmět u účastníka, nikoliv z truhly');
 const protectedStock=db.journal.some(x=>x.calendarInventoryRationStock?.itemId===itemId||x.calendarInventoryWaterFill?.itemId===itemId);
 must(!protectedStock,'Výbava vázaná na vodu nebo potraviny vyžaduje samostatný zásobovací odpis');
 must(!db.combatRuntime?.sequence?.active,'Během Initiative je nutná řízená bojová akce');
 let next;
 if(outcome==='lost'){
  must(Number.isSafeInteger(item.quantity)&&item.quantity===1,'Automatická ztráta vyžaduje jediný konkrétní kus (množství 1)');
  next=recordInventoryDisposition(db,{kind:'loss',actorId,itemId,quantity:1,reason:'Fishing CF: '+reason.trim(),
   confirmedByGM:true,eventId:dispositionId,createdAt,campaignId:campaignKey(db.campaignClock),minute:db.campaignClock.minute});
 }else{
  next=structuredClone(db);
  const target=next.inventory.find(x=>x.id===itemId);
  target.condition=[String(item.condition||'').trim(),`Fishing CF · poškozeno: ${reason.trim()}`].filter(Boolean).join(' | ');
  // No invented WQ, material or armour protection penalty: GM must assess.
 }
 const proof={type:'fishing-gear-consequence',sourceId,actorId,itemId,itemName:item.snapshot.name,
  originalFollowupLevel:p.result.level,followupRoll:p.result.roll,followupEML:p.result.eml,
  outcome,reason:reason.trim(),conditionBefore:item.condition||'',
  conditionAfter:outcome==='damaged'?next.inventory.find(x=>x.id===itemId)?.condition:null,
  dispositionId:outcome==='lost'?dispositionId:null,sourcePage:71,gmConfirmed:true};
 next.journal.push({id:eventId,characterId:actorId,createdAt,
  calendarCampaignId:campaignKey(db.campaignClock),campaignMinute:db.campaignClock.minute,
  title:'Fishing CF · '+(outcome==='lost'?'ztráta':'poškození')+' výbavy',
  body:`HMK s. 71 · Fishing CF → ${p.technique} d100 ${p.result.roll} / EML ${p.result.eml} = ${p.result.level}\n`+
   `${item.snapshot.name}: ${outcome==='lost'?'ztráta':'poškození'} · ${reason.trim()}`+
   (outcome==='damaged'?'\nRozsah mechanického poškození / WQ není pravidlem určen; posoudí GM.':''),
  skillTestProof:proof});
 return next;
}
