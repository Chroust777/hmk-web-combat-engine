/** HMK pp.231, 270, 274. Verity reveals a real illusion; the GM establishes
 * how the imbiber encounters it. Seeing through it does not dispel it.
 */
import {activeVerity} from './hmk-alchemy-imbibing.js?v=94.170';

const check=(condition,message)=>{if(!condition)throw Error('Verity: '+message);};

export function verityStatus({journal,campaignId,minute,actorId,auralShockLevels}){
 const sources=activeVerity(journal,campaignId,actorId,minute);
 const ready=sources.filter(source=>source.state.nextDueMinute>minute);
 return {sources,ready,active:ready.length>0&&auralShockLevels===0};
}

export function createVerityReveal({journal=[],campaignId,minute,actorId,auralShockLevels,illusionReference,
 mode,distanceFeet=null,gmConfirmed=false}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9,'neplatná kampaň, čas nebo postava.');
 check(gmConfirmed===true,'GM musí potvrdit skutečnou iluzi a okolnosti jejího vnímání.');
 check(auralShockLevels===0,'Aural Shock pozastavuje účinek.');
 const {ready}=verityStatus({journal,campaignId,minute,actorId,auralShockLevels});
 check(ready.length,'není dostupná účinná dávka. Zkontrolujte Decay.');
 const reference=typeof illusionReference==='string'?illusionReference.trim():'';
 check(reference.length>=3&&reference.length<=160,'zadejte označení potvrzené iluze.');
 check(mode==='direct'&&distanceFeet===null||mode==='visual'&&Number.isFinite(distanceFeet)&&
  distanceFeet>=0&&distanceFeet<=60,'iluze musí působit přímo na příjemce nebo se mu vizuálně jevit do 60 ft.');
 check(!journal.some(row=>row.calendarCampaignId===campaignId&&row.campaignMinute===minute&&
  row.calendarAlchemyVerityReveal?.actorId===actorId&&row.calendarAlchemyVerityReveal.illusionReference===reference),
  'tato iluze už byla postavě v této minutě odhalena.');
 return {campaignId,minute,actorId,illusionReference:reference,mode,distanceFeet,
  sources:ready.map(source=>({useId:source.useId,as:source.state.currentAS})),
  auralShockLevels,gmConfirmed:true,sourcePages:[231,270,274]};
}

export function validateVerityRevealJournal(journal){
 const prior=[];
 for(const row of journal){
  const reveal=row.calendarAlchemyVerityReveal;
  if(reveal){
   check(reveal.campaignId===row.calendarCampaignId&&reveal.minute===row.campaignMinute&&
    reveal.actorId===row.characterId,'záznam patří jiné kampani, minutě nebo postavě.');
   check(JSON.stringify(createVerityReveal({...reveal,journal:prior}))===JSON.stringify(reveal),
    'historický doklad iluze byl změněn.');
  }
  prior.push(row);
 }
}

export function assertVerityRevealAppendOnly(before,after){
 const rows=new Map(after.map(row=>[row.id,row]));
 for(const old of before){
  if(old.calendarAlchemyVerityReveal)
   check(JSON.stringify(rows.get(old.id))===JSON.stringify(old),'historický doklad iluze nelze změnit ani odstranit.');
 }
}
