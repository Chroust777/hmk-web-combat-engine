/** HMK 243, 270–271: Exsiccation creates a moving area of Dryness. */
import {activeAdditionalTemporary} from './hmk-alchemy-imbibing.js?v=94.169';

const requireProof=(condition,message)=>{
 if(!condition)throw Error('Exsiccation: '+message);
};

export function exsiccationSources({journal,campaignId,actorId,minute}){
 return activeAdditionalTemporary(journal,campaignId,actorId,minute,'Exsiccation')
  .filter(source=>source.state.nextDueMinute>minute);
}

export function activeExsiccationAreas({journal,campaignId,actorId,minute,auralShockLevels=0}){
 if(auralShockLevels!==0)return [];
 const committed=journal.filter(row=>row.calendarCampaignId===campaignId&&row.campaignMinute<=minute);
 return committed.flatMap((row,index)=>{
  const area=row.calendarAlchemyExsiccationBreath;
  if(area?.actorId!==actorId||minute>=area.endMinute)return [];
  const ended=committed.slice(index+1).some(later=>
   later.calendarAlchemyImbibing?.physicEffects?.some(effect=>effect.finishId===area.finishId&&effect.asAfter===0)||
   (later.calendarAlchemyNeutralCast?.finishId===area.finishId&&later.calendarAlchemyNeutralCast.dispel?.asAfter===0)||
   (later.calendarAlchemyDecay?.finishId===area.finishId&&later.calendarAlchemyDecay.asAfter===0));
  return ended?[]:[area];
 });
}

export function createExsiccationBreath({journal,campaignId,actorId,minute,useId,auralShockLevels,
 waterReference='',gmConfirmed=false}){
 requireProof(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9&&gmConfirmed===true,'chybí kampaň, čas, příjemce nebo potvrzení GM.');
 requireProof(auralShockLevels===0,'Aural Shock pozastavuje účinek.');
 requireProof(!journal.some(row=>row.calendarCampaignId===campaignId&&row.campaignMinute===minute&&
  row.calendarAlchemyExsiccationBreath?.actorId===actorId),'výdech v této minutě již byl zapsán.');
 const source=exsiccationSources({journal,campaignId,actorId,minute}).find(item=>item.useId===useId);
 requireProof(source,'chybí účinná dávka nebo její splatný Decay.');
 requireProof(typeof waterReference==='string'&&waterReference.trim().length<=240,'označení vody je příliš dlouhé.');
 const asBefore=source.state.currentAS,endMinute=minute+asBefore;
 requireProof(endMinute<=1e9,'konec oblasti přesahuje kalendář.');
 return {campaignId,actorId,minute,useId,finishId:source.finishId,asBefore,asAfter:asBefore-1,
  radiusFeet:5,endMinute,waterReference:waterReference.trim(),auralShockLevels,gmConfirmed:true,sourcePages:[243,270,271]};
}

export function validateExsiccationJournal(journal){
 for(const [index,row] of journal.entries()){
  const proof=row.calendarAlchemyExsiccationBreath;
  if(!proof)continue;
  requireProof(row.calendarCampaignId===proof.campaignId&&row.characterId===proof.actorId&&
   row.campaignMinute===proof.minute,'doklad patří jiné kampani, postavě nebo minutě.');
  requireProof(JSON.stringify(createExsiccationBreath({...proof,journal:journal.slice(0,index)}))===JSON.stringify(proof),
   'historický doklad výdechu byl změněn.');
 }
}

export function assertExsiccationAppendOnly(before,after){
 const rows=new Map(after.map(row=>[row.id,row]));
 for(const row of before)if(row.calendarAlchemyExsiccationBreath)
  requireProof(JSON.stringify(rows.get(row.id))===JSON.stringify(row),'doklad výdechu nelze změnit ani odstranit.');
}
