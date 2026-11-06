/** v93.760: GM-controlled exit of an ENCOUNTER-only Bestiary entity.
 * A temporary reference creature is not a campaign PC/NPC and does not acquire
 * mandatory medical deadlines in the shared calendar. Its scene health remains
 * immutable evidence once the GM ends its participation.
 * NOTE: owning a real stable animal does NOT turn its Bestiary proof into a
 * substitute for the separate authoritative, registered NPC Health State.
 */
import {encounterBeastHistory} from './hmk-bestiary-563.js';
import {animalHealthProjection567} from './hmk-bestiary-trauma-567.js';
import {campaignKey} from './hmk-calendar-multi-campaign.js';
const ensure=(ok,message)=>{if(!ok)throw Error('Bestiář · ukončení účasti: '+message)};
export const BESTIARY_DEPARTURE_FORMAT_93760='hmk-bestiary-departure-93760-v1';
export const BESTIARY_DEPARTURE_OUTCOMES_93760=Object.freeze({
 dead:'Zemřel',incapacitated:'Neschopný pokračovat',surrendered:'Vzdal se',
 fled:'Utekl',removed:'GM odstranil ze scény'
});
export function prepareBestiaryDeparture93760({data,campaignId,minute,targetId,outcome,gmConfirmed=false}={}){
 ensure(gmConfirmed===true,'GM musí výslovně potvrdit konec účasti.');
 ensure(typeof campaignId==='string'&&campaignId.length>0&&Number.isSafeInteger(minute)&&minute>=0,
  'Chybí herní čas nebo identita kampaně.');
 ensure(data?.campaignClock?.minute===minute&&campaignKey(data.campaignClock)===campaignId,
  'Kalendář kampaně se změnil; otevřete aktuální scénu znovu.');
 ensure(typeof targetId==='string'&&targetId.length>0&&Object.hasOwn(BESTIARY_DEPARTURE_OUTCOMES_93760,outcome),
  'Zvolte výsledek střetnutí pro konkrétního tvora.');
 const creature=encounterBeastHistory(data,campaignId).find(x=>x.id===targetId&&x.active);
 ensure(creature,'Tvor již opustil encounter nebo nebyl nikdy zařazen.');
 const medical=animalHealthProjection567(data.journal,campaignId,targetId);
 const proof={format:BESTIARY_DEPARTURE_FORMAT_93760,targetId,campaignId,minute,outcome,
  gmConfirmed:true,healthFrozen:true,
  medicalSnapshot:{shock:medical.shock,
   wounds:medical.wounds.map(w=>({id:w.id,location:w.locationName,level:w.level,healed:!!w.healed,bleeding:!!w.bleeding})),
   evidenceIds:medical.records.map(r=>r.id)}};
 return {creature,proof};
}
/** Append-only replay of new departures, but leave legacy dismissals untouched. */
export function validateBestiaryDepartureJournal93760(data){
 const preceding=[],closed=new Set();
 for(const row of data?.journal||[]){
  const d=row.bestiaryDeparture93760;
  if(d){
   ensure(row.bestiaryEncounter?.action==='dismiss'&&row.bestiaryEncounter?.id===d.targetId&&
    row.bestiaryEncounter?.campaignId===d.campaignId&&row.calendarCampaignId===d.campaignId&&
    row.campaignMinute===d.minute,'Opuštění musí mít totožný závěrečný doklad Bestiáře.');
   const previous={...data,journal:preceding,campaignClock:{...data.campaignClock,campaignId:d.campaignId,minute:d.minute}};
   const expected=prepareBestiaryDeparture93760({data:previous,campaignId:d.campaignId,
    minute:d.minute,targetId:d.targetId,outcome:d.outcome,gmConfirmed:true}).proof;
   ensure(JSON.stringify(expected)===JSON.stringify(d),'Historický zdravotní snapshot nebo rozhodnutí GM bylo pozměněno.');
   closed.add(d.campaignId+'::'+d.targetId);
  }
  if(row.bestiaryTrauma){const t=row.bestiaryTrauma;
   ensure(!closed.has(t.campaignId+'::'+t.targetId),
    'Po výslovném ukončení scény nelze zpětně přidat zranění nebo léčbu bývalému účastníkovi.');
  }
  preceding.push(row);
 }
 return true;
}
