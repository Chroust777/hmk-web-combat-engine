/** Read-only Chronicle Spread status projection.  Never mutate combat state.
 * A blank or absent condition is not evidence for a negative assertion.
 */
export const CHRONICLE_FATIGUE_HELP = Object.freeze({
  Winded: 'Windedness: krátkodobá únava z námahy; odstraňuje se doloženým klidem, obvykle po 10 minutách podle podmínek HMK.',
  Weary: 'Weariness: dlouhodobější únava vznikající cestováním nebo nedostatkem odpočinku; obnovuje se doloženým odpočinkem či spánkem.',
  Weak: 'Weakness: oslabení způsobené zraněními, krvácením, nemocemi nebo jinými účinky. Neodstraní se pouhým krátkým odpočinkem.',
  Total: 'Celková únava: součet Windedness, Weariness a Weakness včetně anémie z Blood Loss; postihuje příslušné testy a Move.',
  PF: 'Personal Fatigue: únava účtovaná za příslušné časované činnosti; není okamžitý stav postavy.',
  'END SR (TN)': 'Endurance Secondary Roll: cílové číslo TN pro pravidlem vyžadovaný vedlejší test výdrže.'
});
const activePoison = x => ['incubating','active'].includes(x?.status);
const activeDisease = x => ['pending-profile','incubating','active'].includes(x?.status);
export function projectChronicleConditions(state,{campaignId=null,auralShockLevels=null}={}){
 const s=state||{},fat=s.fatigue||{},blood=s.bloodLoss||{};
 const poisoned=(s.toxinCourses||[]).some(activePoison);
 const diseased=(s.diseaseCourses||[]).some(activeDisease);
 const winded=Number.isFinite(fat.windedness)?fat.windedness:0;
 const weary=Number.isFinite(fat.weariness)?fat.weariness:0;
 const weak=(Number.isFinite(fat.otherWeakness)?fat.otherWeakness:0)+(Number.isFinite(blood.weaknessFatigue)?blood.weaknessFatigue:0);
 const total=winded+weary+weak;
 const malnutrition=(s.malnutritionEpisodes||[]).filter(e=>!campaignId||e.campaignId===campaignId);
 const activeMaln=kind=>malnutrition.find(e=>e.kind===kind&&e.status==='active');
 const starved=activeMaln('starvation'),thirsty=activeMaln('thirst');
 const curse=s.cursed===true?'Ano (evidováno)':s.cursed===false?'Ne (evidováno)':'Neověřeno';
 return [
  ['Starvation',starved?'Ano · HR'+starved.hr:'Ne','Hlad: HMK str.186. Nástup po dni bez potravy nebo dvou dnech s polovičními dávkami. HR6 zotavení, HR5 +5 Weakness, HR4 +10 Weakness, HR3 STN, HR2 INC, HR1 UNC, HR0 KIA (smrtelné průběhy). Advance za 3 dny, s poloviční dávkou za 6 dní; plné denní dávky Healing každý den. Úplný klid prodlužuje Advance interval na dvojnásobek.'],
  ['Thirst',thirsty?'Ano · HR'+thirsty.hr:'Ne','Žízeň: HMK str.186. Nástup po dni bez potřebné vody nebo dvou dnech s polovičními dávkami. HR6 zotavení, HR5 +5 Weakness, HR4 +10 Weakness, HR3 STN, HR2 INC, HR1 UNC, HR0 KIA. Advance za 1 den, s poloviční dávkou za 2 dny; plné denní dávky Healing každý den. Úplný klid prodlužuje Advance interval na dvojnásobek.'],
  ['Poisoned',poisoned?'Ano':'Ne','Aktivní nebo inkubující Poison/Toxin Course. Pole je pouze odrazem lékařského záznamu, nikoli checkboxem.'],
  ['Diseased',diseased?'Ano':'Ne','Aktivní nebo inkubující Disease Course, včetně čekání na potvrzený profil nemoci.'],
  ['Cursed',curse,'Prokletí: bez samostatně doloženého stavu aplikace nemůže tvrdit ani Ano, ani Ne.'],
  ['Winded',winded>0?`Ano (${winded})`:'Ne',CHRONICLE_FATIGUE_HELP.Winded],
  ['Weary',weary>0?`Ano (${weary})`:'Ne',CHRONICLE_FATIGUE_HELP.Weary],
  ['Fatigued',total,'Celková Fatigue = Windedness + Weariness + Weakness; '+CHRONICLE_FATIGUE_HELP.Total],
  ['Cold Exposure',(s.environmentalHazards||[]).some(h=>h.active&&h.kind==='cold')?'Ano · HR'+(s.environmentalHazards.find(h=>h.active&&h.kind==='cold')?.hr??'?'):'Ne','Dokumentovaný Cold Exposure; postup a Recovery podle HMK str. 185.'],
  ['Heat Exposure',(s.environmentalHazards||[]).some(h=>h.active&&h.kind==='heat')?'Ano · HR'+(s.environmentalHazards.find(h=>h.active&&h.kind==='heat')?.hr??'?'):'Ne','Dokumentovaný Heat Exposure, HMK str.185.'],
  ['Bleeding',(s.wounds||[]).some(w=>!w.healed&&w.bleeding)?'Ano':'Ne','Aktivní krvácení nezhojené rány; změnu musí potvrdit Blood Stoppage.'],
  ['Infection',(s.wounds||[]).some(w=>!w.healed&&w.healing?.infected)?'Ano':'Ne','Infekce rány pozastavuje běžné Injury Healing Rolls všech ran.'],
  ['Coma',s.coma?.active?'Ano · HR'+(s.coma.hr??'?'):'Ne','Aktivní Coma Course, HMK str.179; další termín musí vycházet z herního kalendáře.'],
  ['Sleep Deprivation',s.sleepDeprivation?.status==='awake'?'Ano · '+(s.sleepDeprivation.hoursAwake??'?')+' h':'Ne','Nedostatek spánku, HMK str.186; má samostatnou evidenci Weariness a PSY.'],
  ['Sequelae',(s.ailmentSequelae||[]).some(x=>x.active)?'Ano':'Ne','Trvalé následky neletálního Disease HR0, například paralýza.'],
  ['Psyche Stress',Number.isFinite(s.morale?.psycheStress)?s.morale.psycheStress:'—','Aktuálně evidované úrovně Psyche Stress; účinek může zvyšovat Weakness.'],
  ['Aural Shock',Number.isFinite(auralShockLevels)?auralShockLevels:'—','Aural Shock z původního Arcane záznamu; zobrazuje se přímo z postavy.']
 ];
}
