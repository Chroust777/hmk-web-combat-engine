/** The calendar's read-only, evidence-backed history of actual completed
 * HMK actions. Never mistake elapsed calendar time for a resolved test.
 * Only committed rule proofs with a verified campaign minute are displayed;
 * an unfinished wound, poison episode, etc. retains its own pending event.
 */
import {projectedCalendarJournal,calendarMemberIds} from './hmk-calendar-campaign-lifecycle.js';
const safeMinute=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
export function historicalHMKCalendarEntries(clock,characters=[],journal=[]){
 if(!clock)return [];
 const allowed=new Map(calendarMemberIds(clock,characters).map(c=>[c.id,c.name]));
 const seen=new Set(),out=[];
 for(const entry of projectedCalendarJournal(clock,journal)){
  if(!entry||typeof entry.id!=='string'||!entry.id||seen.has(entry.id)||
    (entry.calendarCampaignId&&clock.campaignId&&entry.calendarCampaignId!==clock.campaignId&&!clock.journalMinuteEvidence?.some(e=>e.id===entry.id))||
    !allowed.has(entry.characterId)||!safeMinute(entry.campaignMinute)||
    entry.campaignMinute>clock.minute)continue;
  const skill=entry.skillTestProof,combat=entry.combatProof,special=entry.specialOutcomeProof,expedition=entry.calendarExpeditionProof,trek=entry.calendarTrekProof,wilderness=entry.calendarTrekWildernessProof,tracking=entry.calendarTrekTrackingProof,nutritionDay=entry.calendarNutritionDay,nutritionPolicy=entry.calendarNutritionPolicy,malnutrition=entry.calendarMalnutritionMedical,physicalStock=entry.calendarInventoryRationStock,physicalUse=entry.calendarInventoryRationUse,
   supplyUse=entry.calendarForagingSupplyUse,waterFill=entry.calendarInventoryWaterFill,
   waterUse=entry.calendarInventoryWaterUse,chest=entry.calendarChestTransfer;
  // Ordinary free-text GM notes and unverified timestamps are NOT marked done.
  if(!skill&&!combat&&!special&&!expedition&&!trek&&!wilderness&&!tracking&&!nutritionDay&&!nutritionPolicy&&!malnutrition&&!physicalStock&&!physicalUse&&!supplyUse&&!waterFill&&!waterUse&&!chest)continue;
  seen.add(entry.id);
  const name=allowed.get(entry.characterId),
   action=skill?.type||combat?.actionKind||special?.kind||expedition?.kind||(trek?'Cestovní podklady / Travel Watch':wilderness?'Foraging / Wilderness Tasks':tracking?'Tracking / Stalking':physicalStock?'Inventární příděly / HMK 120':physicalUse?'Spotřeba fyzických dávek / HMK 186':supplyUse?(supplyUse.disposition==='stored-in-container'?'Uložení nalezené vody do nádoby / HMK 120,147':supplyUse.disposition==='ingredient-reserved'?'Byliny vyhrazené pro Concoction':'Výdej nalezených zásob / HMK 147'):waterFill?'Naplnění měchu pitnou vodou / HMK 120':waterUse?'Spotřeba vody z měchu / HMK 186':chest?'Uložení či vyzvednutí výbavy / Arsenal & Gear':nutritionDay?'Denní výživa / HMK 186':malnutrition?'Starvation/Thirst · HR Course / HMK 184–186':nutritionPolicy?'Denní režim / HMK 186':'pravidlový výsledek'),
   original=typeof entry.title==='string'&&entry.title.trim()?entry.title.trim():action;
  out.push({id:'history:'+encodeURIComponent(entry.id),origin:'history',
   characterId:entry.characterId,name,kind:physicalStock?'physical-ration-stock':physicalUse?'physical-ration-use':supplyUse?'foraging-supply-use':waterFill?'physical-water-fill':waterUse?'physical-water-use':chest?'chest-transfer':malnutrition?'malnutrition-result':nutritionDay?'nutrition-day':nutritionPolicy?'nutrition-policy':trek?'trek-preparation':wilderness?'wilderness-foraging':tracking?'wilderness-tracking':expedition?'expedition-result':skill?'skill-result':combat?'combat-result':'special-result',
   sourceId:entry.id,title:original,description:action,
   note:physicalStock?`GM převzal ${physicalStock.quantity} skutečných dávek ${physicalStock.name} z inventáře ${physicalStock.itemId}, potvrdil čerstvost v minutě ${physicalStock.minute}; trvanlivost do ${physicalStock.expiresAt}. Kampaň ${physicalStock.campaignId}; bez posunu hodin.`:physicalUse?`Doložená spotřeba ${physicalUse.quantity} food-days z ${physicalUse.itemId}, zdroj ${physicalUse.sourceId}, kampaň ${physicalUse.campaignId}; bez samostatného posunu času.`:supplyUse?`Doložený ${supplyUse.disposition==='stored-in-container'?'převod':'výdej'} ${supplyUse.quantity} ${supplyUse.unit} z Foraging ${supplyUse.sourceId} / výsledek ${supplyUse.resultIndex+1}.${supplyUse.disposition==='stored-in-container'?' Nejde o vypití; návazné naplnění '+supplyUse.containerFillId+'.':''} Bez posunu času.`:waterFill?`Skutečné naplnění ${waterFill.itemId} půlgalonem pitné vody; doložený zdroj ${waterFill.waterSource}${waterFill.foragingSupplyUseId?' · převod Foraging '+waterFill.foragingSupplyUseId:''}. +5 lb, bez posunu času.`:waterUse?`Doložené vypití ${waterUse.quantity} gal z ${waterUse.itemId} · naplnění ${waterUse.fillId}. Bez posunu času.`:chest?`Doložené ${chest.toSlot==='chest'?'uložení':'vyzvednutí'} ${chest.quantity} ks u ${chest.place}, původ ${chest.sourceItemId}, výsledek ${chest.movedItemId}. Bez posunu času.`:malnutrition?`Doložená zdravotní událost ${malnutrition.kind} · ${malnutrition.phase}; původní splatnost ${malnutrition.dueMinute}, skutečné vyhodnocení ${entry.campaignMinute}. ${malnutrition.phase==='onset'?'Nástup HR'+malnutrition.hr+' a Weakness '+malnutrition.weakness:'d100 '+malnutrition.roll+'; HR'+malnutrition.beforeHR+' → HR'+malnutrition.afterHR}. Další povinné hody zůstávají samostatně otevřené.`:nutritionDay?`Doložený 24hodinový výdej: potrava ${nutritionDay.foodReceived}/${nutritionDay.foodNeed}, voda ${nutritionDay.waterReceived}/${nutritionDay.waterNeed}. ${nutritionDay.foodShortfall||nutritionDay.waterShortfall?'Nedostatek zásob; Starvation/Thirst vyžaduje samostatné zdravotní vyhodnocení.':'Účetní den dokončen.'} Čas posunul pouze GM.`:nutritionPolicy?'GM nastavil či pozastavil budoucí denní spotřebu; čas se nezměnil.':tracking?'Doložený výsledek Tracking / Stalking bez posunu času GM. ':wilderness?'Doložený zisk potravy, vody nebo bylin bez posunu času GM. ':trek?'Zapsány pouze doložené hody počasí, pohybu a setkání. '+(trek.unresolved?.length?'Nevyřešené návaznosti: '+trek.unresolved.join(', '):'Nevznikl předpoklad nové události.'): 'Uložený výsledek konkrétního pravidlového kroku. Navazující léčba a další povinnosti se evidují samostatně.',
   minute:entry.campaignMinute,dueMinute:entry.campaignMinute,status:'resolved',
   destination:'notes'});
 }
 return out.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id));
}
