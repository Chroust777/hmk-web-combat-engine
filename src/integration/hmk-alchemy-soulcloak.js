/** HMK pp.270, 274. Resolve the Soulcloak defence for an attested True
 * Sight attempt, without adjudicating the True Sight roll itself. */
import {activeAdditionalTemporary} from './hmk-alchemy-imbibing.js?v=94.174';

const check=(condition,message)=>{if(!condition)throw Error('Soulcloak: '+message);};

export function soulcloakStatus({journal,campaignId,actorId,minute,auralShockLevels=0}){
 if(auralShockLevels!==0)return null;
 const sources=activeAdditionalTemporary(journal,campaignId,actorId,minute,'Soulcloak')
  .filter(source=>source.state.nextDueMinute>minute);
 return sources.reduce((best,source)=>!best||source.state.currentAS>best.state.currentAS?source:best,null);
}

export function createSoulcloakDefence({journal=[],campaignId,actorId,minute,auralShockLevels,
 attemptReference,d10,origin,gmConfirmed}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId&&
  Number.isSafeInteger(minute)&&minute>=0&&minute<=1e9&&gmConfirmed===true,
  'je třeba doložená kampaň, příjemce a potvrzení GM.');
 const reference=typeof attemptReference==='string'?attemptReference.trim():'';
 check(reference.length>=3&&reference.length<=160,'pojmenujte skutečný pokus o True Sight.');
 check(!journal.some(row=>row.calendarCampaignId===campaignId&&row.characterId===actorId&&
  row.calendarAlchemySoulcloakDefence?.attemptReference.toLowerCase()===reference.toLowerCase()),
  'tento pokus už byl vyhodnocen. Pro nový pokus použijte jiné označení.');
 check(Number.isInteger(d10)&&d10>=1&&d10<=10&&['manual','cryptographic-software-die'].includes(origin),
  'vyžaduje skutečný d10 v rozsahu 1–10.');
 check(auralShockLevels===0,'Aural Shock pozastavuje ochranu.');
 const source=soulcloakStatus({journal,campaignId,actorId,minute,auralShockLevels});
 check(source,'chybí účinná dávka. Zkontrolujte splatný Decay.');
 const asBefore=source.state.currentAS,blocked=d10<=asBefore;
 return {campaignId,actorId,minute,attemptReference:reference,useId:source.useId,finishId:source.finishId,
  d10,origin,asBefore,asAfter:asBefore-Number(blocked),blocked,auralShockLevels,gmConfirmed:true,sourcePage:274};
}

export function validateSoulcloakJournal(journal){
 for(const [index,row] of journal.entries()){
  const proof=row.calendarAlchemySoulcloakDefence;
  if(!proof)continue;
  check(row.calendarCampaignId===proof.campaignId&&row.characterId===proof.actorId&&row.campaignMinute===proof.minute,
   'doklad patří jiné kampani, postavě nebo minutě.');
  check(JSON.stringify(createSoulcloakDefence({...proof,journal:journal.slice(0,index)}))===JSON.stringify(proof),
   'historický doklad obrany byl změněn.');
 }
}

export function assertSoulcloakAppendOnly(before,after){
 const rows=new Map(after.map(row=>[row.id,row]));
 for(const old of before)if(old.calendarAlchemySoulcloakDefence)
  check(JSON.stringify(rows.get(old.id))===JSON.stringify(old),'doklad obrany nelze změnit ani odstranit.');
}
