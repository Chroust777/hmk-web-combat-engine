/** HMK v1.2 pp.184–186: when a character cannot feed themselves, inventory
 * possession is NOT evidence of swallowed food or water. HMK prescribes no
 * new feeding skill test or medical intervention: this is a dated GM factual
 * ruling about actual ingestion, not a fabricated Healing Roll.
 */
export const ASSISTED_INTAKE_FORMAT='hmk-nutrition-assisted-intake-v1';
const DAY=1440;
const check=(v,m)=>{if(!v)throw Error(m)};
const minute=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;

/** HR2 / INC or worse cannot independently obtain rations; HR1 / UNC and
 * coma explicitly require assistance. Other shock systems remain authoritative.
 * No additional Shock or medical status is created here. */
export function needsAssistedIntake(actor){
 const s=actor?.hmk?.combatState;
 if(!s||s.shock==='KIA')return false;
 return s.shock==='UNC'||s.shock==='INC'||s.coma?.active===true||
  (s.malnutritionEpisodes??[]).some(e=>e.status==='active'&&e.hr<=2);
}
export function assistedIntakeForDay(journal=[],campaignId,actorId,startMinute,endMinute){
 return journal.find(x=>x.calendarCampaignId===campaignId&&x.characterId===actorId&&
  x.calendarNutritionAssistedIntake?.format===ASSISTED_INTAKE_FORMAT&&
  x.calendarNutritionAssistedIntake.startMinute===startMinute&&
  x.calendarNutritionAssistedIntake.endMinute===endMinute)||null;
}
/** GM adjudicates the coming 24-hour game interval before committing its
 * clock advance. 'yes' means the character actually received/swallowed the
 * stated resource during that interval; the ledger still proves stock and
 * actual amount at day close. 'no' prevents any automatic intake. */
export function createAssistedIntake({campaignId,actorId,minute:now,startMinute,foodAccepted,waterAccepted,caregiver,reason}={}){
 check(typeof campaignId==='string'&&campaignId&&typeof actorId==='string'&&actorId,'Pomoc s příjmem vyžaduje postavu a kampaň.');
 check(minute(now)&&minute(startMinute)&&now>=startMinute&&now<startMinute+DAY,'Potvrzení musí být v právě rozpracovaném 24h intervalu.');
 check(typeof foodAccepted==='boolean'&&typeof waterAccepted==='boolean','GM musí potvrdit jídlo a vodu samostatně (ano/ne).');
 caregiver=String(caregiver||'').trim();reason=String(reason||'').trim();
 check(caregiver.length>=2&&caregiver.length<=160,'Uveďte skutečného pečujícího nebo způsob péče.');
 check(reason.length>=3&&reason.length<=400,'Uveďte skutečné okolnosti podání či nepodání dávek.');
 return {format:ASSISTED_INTAKE_FORMAT,campaignId,actorId,minute:now,startMinute,endMinute:startMinute+DAY,
  foodAccepted,waterAccepted,caregiver,reason,sourcePages:[184,186]};
}
export function validateAssistedIntakeJournal(journal=[]){
 const seen=new Set();
 for(const row of journal){const p=row.calendarNutritionAssistedIntake;if(!p)continue;
  check(JSON.stringify(createAssistedIntake({...p}))===JSON.stringify(p)&&
   row.calendarCampaignId===p.campaignId&&row.characterId===p.actorId&&row.campaignMinute===p.minute,
   'Poškozený doklad GM o skutečném příjmu jídla či vody.');
  const key=[p.campaignId,p.actorId,p.startMinute].join(':');
  check(!seen.has(key),'Duplicitní potvrzení GM pro stejný nutriční den.');seen.add(key);
 }
 return true;
}
export function assertAssistedIntakeAppendOnly(previous=[],next=[]){
 const rows=new Map(next.map(x=>[x.id,x]));
 for(const row of previous)if(row.calendarNutritionAssistedIntake){
  check(rows.has(row.id)&&JSON.stringify(rows.get(row.id))===JSON.stringify(row),
   'Doklad GM o skutečném podání dávek nelze měnit ani mazat.');
 }
 return true;
}
