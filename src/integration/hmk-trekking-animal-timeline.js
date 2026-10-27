/** HMK p.145,146,149–150: Wearied Mode is checked when opting to CONTINUE
 * trekking at the next watch, while Fatigue 40 prevents further self-movement.
 * The beast's hourly fatigue here is the explicit v93.515 optional analogy / GM
 * policy. No unprinted animal END Secondary Roll or hourly Mode reset is assumed.
 */
export function animalDoubleTimeTimeline(initialFatigue,policy){
 if(!Number.isSafeInteger(initialFatigue)||initialFatigue<0||
  policy?.period!=='hour'||!Number.isSafeInteger(policy.rate)||policy.rate<0)
  throw Error('Neplatné časové podklady únavy zvířete.');
 const periods=Array.from({length:4},(_,i)=>({hour:i+1,
  fatigue:initialFatigue+(i+1)*policy.rate}));
 return {periods,firstWeariedHour:initialFatigue>=20?0:(periods.find(p=>p.fatigue>=20)?.hour??null),
  firstImmobileHour:initialFatigue>=40?0:(periods.find(p=>p.fatigue>=40)?.hour??null),
  // The Slow mode gained during a chosen watch governs the next watch.
  nextWatchWearied:periods[3].fatigue>=20,sourcePages:[145,146,149,150]};
}
/** If an animal hits 40 before hour four, finish THAT hour and require a
 * decision before entering the following hour. Return wall-clock cutoff. */
export function animalDoubleTimeCutoff(startMinute,healthFatigue,policy){
 const t=animalDoubleTimeTimeline(healthFatigue,policy);
 return t.firstImmobileHour!==null&&t.firstImmobileHour<4?
  startMinute+60*t.firstImmobileHour:null;
}
