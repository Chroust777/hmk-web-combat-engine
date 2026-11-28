/** HMK 243, 270–271, 274: breathing elixirs create temporary moving areas. */
import {activeAdditionalTemporary} from './hmk-alchemy-imbibing.js?v=94.174';

const breathField={Exsiccation:'calendarAlchemyExsiccationBreath',Shadowbreath:'calendarAlchemyShadowbreath'};

const requireProof=(condition,message)=>{
 if(!condition)throw Error('Alchemy · výdech: '+message);
};

export function elixirBreathSources({journal,campaignId,actorId,minute,elixirName='Exsiccation'}){
 return activeAdditionalTemporary(journal,campaignId,actorId,minute,elixirName)
  .filter(source=>source.state.nextDueMinute>minute);
}

export function activeElixirBreathAreas({journal,campaignId,actorId,minute,auralShockLevels=0,elixirName='Exsiccation'}){
 if(auralShockLevels!==0)return [];
 const committed=journal.filter(row=>row.calendarCampaignId===campaignId&&row.campaignMinute<=minute);
 return committed.flatMap((row,index)=>{
  const area=row[breathField[elixirName]];
  if(area?.actorId!==actorId||minute>=area.endMinute)return [];
  const ended=committed.slice(index+1).some(later=>
   later.calendarAlchemyImbibing?.physicEffects?.some(effect=>effect.finishId===area.finishId&&effect.asAfter===0)||
   (later.calendarAlchemyNeutralCast?.finishId===area.finishId&&later.calendarAlchemyNeutralCast.dispel?.asAfter===0)||
   (later.calendarAlchemyDecay?.finishId===area.finishId&&later.calendarAlchemyDecay.asAfter===0));
  return ended?[]:[area];
 });
}

export function createElixirBreath({journal,campaignId,actorId,minute,useId,auralShockLevels,elixirName='Exsiccation',
 waterReference='',gmConfirmed=false}){
 requireProof(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9&&gmConfirmed===true,'chybí kampaň, čas, příjemce nebo potvrzení GM.');
 requireProof(Object.hasOwn(breathField,elixirName),'neznámý elixír.');
 requireProof(auralShockLevels===0,'Aural Shock pozastavuje účinek.');
 requireProof(!journal.some(row=>row.calendarCampaignId===campaignId&&row.campaignMinute===minute&&
  Object.values(breathField).some(key=>row[key]?.actorId===actorId)),'výdech v této minutě již byl zapsán.');
 const source=elixirBreathSources({journal,campaignId,actorId,minute,elixirName}).find(item=>item.useId===useId);
 requireProof(source,'chybí účinná dávka nebo její splatný Decay.');
 requireProof(typeof waterReference==='string'&&waterReference.trim().length<=240,'označení vody je příliš dlouhé.');
 const asBefore=source.state.currentAS,endMinute=minute+asBefore;
 requireProof(endMinute<=1e9,'konec oblasti přesahuje kalendář.');
 return {campaignId,actorId,minute,useId,finishId:source.finishId,asBefore,asAfter:asBefore-1,
  radiusFeet:5,endMinute,...(elixirName==='Exsiccation'?{waterReference:waterReference.trim()}:{}),
  auralShockLevels,gmConfirmed:true,sourcePages:elixirName==='Exsiccation'?[243,270,271]:[270,274]};
}

export function validateElixirBreathJournal(journal){
 for(const [index,row] of journal.entries()){
  const entries=Object.entries(breathField).filter(([,key])=>row[key]);
  requireProof(entries.length<=1,'jeden záznam nemůže obsahovat dvě akce.');
  for(const [elixirName,key] of entries){
   const proof=row[key];
   requireProof(row.calendarCampaignId===proof.campaignId&&row.characterId===proof.actorId&&
    row.campaignMinute===proof.minute,'doklad patří jiné kampani, postavě nebo minutě.');
   requireProof(JSON.stringify(createElixirBreath({...proof,elixirName,journal:journal.slice(0,index)}))===JSON.stringify(proof),
    'historický doklad výdechu byl změněn.');
  }
 }
}

export function assertElixirBreathAppendOnly(before,after){
 const rows=new Map(after.map(row=>[row.id,row]));
 for(const old of before)if(Object.values(breathField).some(key=>old[key]))
  requireProof(JSON.stringify(rows.get(old.id))===JSON.stringify(old),'doklad výdechu nelze změnit ani odstranit.');
}
