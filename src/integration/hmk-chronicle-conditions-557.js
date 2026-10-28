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
export function projectChronicleConditions(state){
 const s=state||{},fat=s.fatigue||{},blood=s.bloodLoss||{};
 const poisoned=(s.toxinCourses||[]).some(activePoison);
 const diseased=(s.diseaseCourses||[]).some(activeDisease);
 const winded=Number.isFinite(fat.windedness)?fat.windedness:0;
 const weary=Number.isFinite(fat.weariness)?fat.weariness:0;
 const weak=(Number.isFinite(fat.otherWeakness)?fat.otherWeakness:0)+(Number.isFinite(blood.weaknessFatigue)?blood.weaknessFatigue:0);
 const total=winded+weary+weak;
 const curse=s.cursed===true?'Ano (evidováno)':s.cursed===false?'Ne (evidováno)':'Neověřeno';
 return [
  ['Poisoned',poisoned?'Ano':'Ne','Aktivní nebo inkubující Poison/Toxin Course. Pole je pouze odrazem lékařského záznamu, nikoli checkboxem.'],
  ['Diseased',diseased?'Ano':'Ne','Aktivní nebo inkubující Disease Course, včetně čekání na potvrzený profil nemoci.'],
  ['Cursed',curse,'Prokletí: bez samostatně doloženého stavu aplikace nemůže tvrdit ani Ano, ani Ne.'],
  ['Winded',winded>0?`Ano (${winded})`:'Ne',CHRONICLE_FATIGUE_HELP.Winded],
  ['Weary',weary>0?`Ano (${weary})`:'Ne',CHRONICLE_FATIGUE_HELP.Weary],
  ['Fatigued',total,'Celková Fatigue = Windedness + Weariness + Weakness; '+CHRONICLE_FATIGUE_HELP.Total]
 ];
}
