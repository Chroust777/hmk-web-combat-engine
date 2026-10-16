/** HMK v1.2 source-bound special Secondary Roll routines.
 * These are NOT general Success Tests. Fatigue SR are per named PERIOD, not
 * free modifiers to EML. Ceremonies use multiple, independent Style dice.
 * Pure read-only outcomes; campaign time and fatigue must be advanced via their
 * existing dedicated authorities, never by an unrelated Skill Test submit.
 */
export const SPECIAL_SECONDARY_ROLLS=Object.freeze([
 {id:'fatigue-climbing',family:'fatigue',name:'Lezení – 5 minut',page:176,skill:'Endurance',base:'PF',period:'5 minut',description:'Úspěch END SR snižuje novou Windedness únavu o 5.'},
 {id:'fatigue-digging',family:'fatigue',name:'Kopání / zvedání – 5 minut',page:176,skill:'Endurance',base:'PF',period:'5 minut'},
 {id:'fatigue-melee',family:'fatigue',name:'Boj zblízka – 5 minut',page:176,skill:'Endurance',base:'PF',period:'5 minut'},
 {id:'fatigue-full-run',family:'fatigue',name:'Běh (Full Move) – 5 minut',page:176,skill:'Endurance',base:'PF',period:'5 minut'},
 {id:'fatigue-sprint',family:'fatigue',name:'Sprint (Double Move) – 5 sekund',page:176,skill:'Endurance',base:'PF',period:'5 sekund'},
 {id:'fatigue-swimming',family:'fatigue',name:'Plavání – 1 minuta',page:176,skill:'Endurance',base:'PF',period:'1 minuta'},
 {id:'fatigue-astral',family:'fatigue',name:'Návrat z astrální cesty',page:176,skill:'Endurance',base:'variable',period:'při návratu',description:'Weariness 0–20 určuje konkrétní astrální sekvence; úspěch END SR sníží přírůstek o 5.'},
 {id:'fatigue-summoning',family:'fatigue',name:'Summoning – únava po kouzlu',page:176,skill:'Endurance',base:'variable',period:'za kouzlo',description:'Weariness 5–20 dle konkrétního kouzla; úspěch END SR sníží o 5.'},
 {id:'fatigue-sleep',family:'fatigue',name:'Spánková deprivace – 24 hodin',page:176,skill:'Endurance',base:15,period:'24 hodin',description:'END SR snižuje 15 weariness o 5, nepopírá účinek spánkové deprivace.'},
 {id:'fatigue-slow-swim',family:'fatigue',name:'Pomalé plavání – 1 hodina',page:176,skill:'Endurance',base:5,period:'1 hodina'},
 {id:'fatigue-walk',family:'fatigue',name:'Chůze / trekking – 4 hodiny',page:149,skill:'Endurance',base:5,period:'4 hodiny (1 watch)'},
 {id:'fatigue-riding',family:'fatigue',name:'Jízda nebo řízení povozu – 4 hodiny',page:149,skill:'Endurance',base:5,tnAdjust:2,period:'4 hodiny (1 watch)',description:'Jezdci a vozkové mají +2 k Endurance TN v rámci této trekking rutiny.'},
 {id:'fatigue-double-walk',family:'fatigue',name:'Double Time – 1 hodina pěšky',page:149,skill:'Endurance',base:10,period:'1 hodina'},
 {id:'fatigue-double-drover',family:'fatigue',name:'Double Time – 1 hodina s hnanými zvířaty',page:149,skill:'Endurance',base:5,period:'1 hodina'},
 {id:'recovery-no-bedroll',family:'recovery',name:'Spánek bez lůžka / bez těžkého bedrollu',page:120,skill:'Endurance',description:'Po spánku bez příslušného bedrollu úspěšný END SR obnoví 10 weariness; neúspěch jen 5. Těžký bedroll tento SR odstraňuje.'},
 {id:'astral-rite-member',family:'astral',name:'Shamanic Rite – účastník Spirit SR',page:300,skill:'Spirit',description:'Po úspěšném Trance rituálu (S/CS) účastník provede Spirit SR; outsider potřebuje dva úspěšné Spirit SR. CS poskytuje +2 TN.'},
 {id:'astral-talisman',family:'astral',name:'Talisman – prodloužení účinku',page:300,skill:'Spirit',description:'Na konci období Spirit SR prodlouží účinek o další období. Outsider potřebuje dva úspěšné hody.'},
 {id:'astral-recovery',family:'astral',name:'Po Aural Shock – ověření uložené síly',page:300,skill:'Spirit',description:'Po zotavení ověřuje shaman samostatně každou uloženou sílu hodem Spirit SR.'},
 {id:'arcane-sensitivity',family:'arcane',name:'Sensitivity – pasivní zjištění energie',page:263,skill:'Sensitivity',description:'Při přiblížení do dosahu TI × 5 stop GM provede pasivní d10 proti Sensitivity Index; úspěch odhalí neurčitý pocit energie.'},
 {id:'arcane-elixir-will',family:'arcane',name:'Alchymický elixír – Will SR proti Dissolution',page:268,skill:'Will',description:'Použij pouze při konkrétním účinku elixíru vyžadujícím Will SR; neúspěch spouští Alchemical Dissolution dle zvláštního pravidla.'},
 {id:'festival-style',family:'divine',name:'Festival – Style SR jednotlivého účastníka',page:317,skill:'style',description:'Po Benediction Roll kněze: za každou hvězdu jeden Style SR; odečtěte jeden d10 za každý bod odchylky MOR od ortodoxie. Alespoň jeden úspěch poskytuje Renewed Faith +1 max. Piety na rok.'},
 {id:'ceremony-style',family:'divine',name:'Ceremony – Style SR kněze',page:316,skill:'style',description:'Po Benediction Roll kněze: za každou hvězdu jeden Style SR. Každý úspěch přidá +1 Benediction Modifier; viz maximum Blessing u konkrétního věřícího.'},
]);
export const HMK_CEREMONY_STYLES=Object.freeze([
 {id:'dance',label:'Dance',skill:'Agility',alternate:'Dancing'},
 {id:'ecstasy',label:'Ecstasy',skill:'Empathy'},
 {id:'oration',label:'Oration',skill:'Eloquence',alternate:'Discourse'},
 {id:'spectacle',label:'Spectacle',skill:'Creativity',alternate:'Theatrics'},
]);
export function specialSecondaryById(id){return SPECIAL_SECONDARY_ROLLS.find(r=>r.id===id)||null;}
export function resolveSpecialSR({routine,secondaryML,rolls,stars=0,baseFatigue=null,styleTNAdjust=0,outsider=false,moralityDifference=0,priestSuccessLevel=null,criticalBenedictionPenalty=0}={}){
 if(!routine||!SPECIAL_SECONDARY_ROLLS.some(x=>x.id===routine.id))throw Error('Neznámá speciální Secondary Roll činnost');
 if(!Number.isSafeInteger(secondaryML)||secondaryML<0||secondaryML>1000)throw Error('Secondary ML musí být celé číslo 0–1000');
 if(!Array.isArray(rolls)||rolls.some(n=>!Number.isSafeInteger(n)||n<1||n>10))throw Error('SR hody musí být celé hodnoty d10 od 1 do 10');
 const index=Math.floor(secondaryML/10),adjust=(routine.tnAdjust??0)+(Number.isSafeInteger(styleTNAdjust)?styleTNAdjust:0);
 if(!Number.isSafeInteger(adjust)||adjust<-20||adjust>20)throw Error('Úprava TN mimo rozsah');
 const tn=index+adjust,successes=rolls.filter(n=>n<=tn).length;
 if(routine.family==='fatigue'){
  const base=routine.base==='PF'||routine.base==='variable'?baseFatigue:routine.base;
  if(!Number.isSafeInteger(base)||base<0||base>500||base%5!==0)throw Error('Nelze doložit únavu za dané období');
  if(rolls.length!==1)throw Error('Únava vyžaduje jediný END SR za období');
  return {kind:'fatigue',tn,index,rolls,successes,base,accrual:Math.max(0,base-(successes?5:0)),reduction:successes?Math.min(5,base):0};
 }
 if(routine.family==='recovery'){
  if(rolls.length!==1)throw Error('Regenerace vyžaduje jediný END SR');
  return {kind:'recovery',tn,index,rolls,successes,wearinessRecovered:successes?10:5};
 }
 if(routine.family==='divine'){
  if(!Number.isSafeInteger(stars)||stars<0||stars>5)throw Error('Benediction stars 0–5');
  if(!Number.isSafeInteger(moralityDifference)||moralityDifference<0||moralityDifference>20)throw Error('Odchylka MOR musí být nezáporná');
  const count=routine.id==='festival-style'?Math.max(0,stars-moralityDifference):stars;
  if(rolls.length!==count)throw Error('Předepsaný počet Style SR: '+count);
  return {kind:'divine',tn,index,rolls,successes,diceCount:count,benedictionModifier:routine.id==='ceremony-style'?successes+criticalBenedictionPenalty:null,renewedFaith:routine.id==='festival-style'?successes>0:null};
 }
 const needed=outsider&&(routine.id==='astral-rite-member'||routine.id==='astral-talisman')?2:1;
 if(rolls.length!==needed)throw Error('Počet SR pro tuto sekvenci: '+needed);
 const validPrimary=routine.id!=='astral-rite-member'||['S','CS'].includes(priestSuccessLevel);
 return {kind:routine.family,tn,index,rolls,successes,needed,success:validPrimary&&successes===needed,requiresPriestSuccess:routine.id==='astral-rite-member',priestSuccessLevel};
}
