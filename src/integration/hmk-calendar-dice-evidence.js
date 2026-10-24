/** Calendar-generated dice are entered into the existing rules forms.
 * Record their cryptographic provenance only if a NEW rules journal entry
 * contains precisely matching recorded dice. Never change an existing event,
 * and never claim that a UI click was a committed rule result.
 */
export const CALENDAR_DICE_FIELDS=Object.freeze({
 'treatment':{roll:100,physicianRoll:100},'healing':{roll:100},'infection':{roll:100},'grim':{roll:100},
 'blood-loss':{roll:100},'extended-shock':{roll:100},'coma':{roll:100,periodD10:10},
 'poison':{courseD100:100},
 'disease':{onsetD6:6,virulenceD20:20,courseD100:100,
   symptom1:10,symptom2:10,symptom3:10,symptom4:10},
 'weather-course':{roll:100},'sleep-deprivation':{enduranceD10:10},
 'skill-critical':{followRoll:100},
 'skill-fall':{impactD10:10,zoneD10:10,locationD10:10,fallingD100:100,
   shockD100:100,compoundD10:10},
 'skill-injury':{hazardD10:10,agilityD100:100,impactDie:[6,10],zoneD10:10,
   locationD10:10,shockD100:100,compoundD10:10},
 'aural-recovery':{die:100},'psyche-interval':{die:6},'psyche-recovery':{die:100},
 'talisman-period':{specialDice:10}
});
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const permits=(available,faces)=>Array.isArray(available)?available.includes(faces):available===faces;
export function verifiedCalendarDiceWitness({kind,sourceId,characterId,minute,rolls}={}){
 if(!CALENDAR_DICE_FIELDS[kind]||typeof sourceId!=='string'||!sourceId||
   typeof characterId!=='string'||!characterId||!whole(minute,0,1e9)||
   !Array.isArray(rolls)||!rolls.length)throw Error('Neplatná vazba kalendářového hodu');
 const allowed=CALENDAR_DICE_FIELDS[kind],used=new Set();
 const transcript=rolls.map(r=>{
  const pos=r?.occurrence??0,identifier=`${r?.field}@${pos}`;
  if(!r||used.has(identifier)||!whole(pos,0,100)||!permits(allowed[r.field],r.faces)||
    !whole(r.value,1,r.faces)||r.origin!=='cryptographic-software-die'||
    typeof r.id!=='string'||!r.id)throw Error('Nedoložený nebo duplicitní hod');
  used.add(identifier);
  return {field:r.field,occurrence:pos,faces:r.faces,value:r.value,
   source:r.origin,rollId:r.id};
 });
 return {format:'hmk-calendar-dice-witness-v1',kind,characterId,sourceId,minute,rolls:transcript};
}
function recordedDice(proof){
 const out=[];if(!proof||typeof proof!=='object')return out;
 const visit=(obj,depth)=>{
  if(depth>5||!obj||typeof obj!=='object')return;
  if(obj.faces&&obj.value!=null&&Number.isInteger(obj.faces))out.push(obj);
  if(Array.isArray(obj)){for(const row of obj)visit(row,depth+1);return;}
  // Do not search arbitrary numeric data for accidental roll matches.
  for(const [name,field] of Object.entries(obj))if(['physicalDice','physicalDie','proofs','rolls','rollProof'].includes(name))visit(field,depth+1);
 };
 visit(proof,0);return out;
}
/** The same value *and* die size must be present in the committed original
 * executor's physical-dice proof. One proof die may support only one witness.
 * If an executor lacks physical-dice evidence, it is not falsely annotated. */
export function annotateNewCalendarRolls(before,after,witness){
 if(!witness)return 0;
 const known=new Set((before?.journal??[]).map(j=>j.id));let added=0;
 for(const entry of after?.journal??[]){
  if(known.has(entry.id)||entry.characterId!==witness.characterId||
   (!entry.skillTestProof&&!entry.combatProof))continue;
  const verified=recordedDice(entry.skillTestProof??entry.combatProof);
  const available=verified.slice(),matched=[];
  for(const r of witness.rolls){
   const i=available.findIndex(d=>d.faces===r.faces&&d.value===r.value);
   if(i>=0){matched.push(r);available.splice(i,1);}
  }
  if(!matched.length)continue;
  if(entry.calendarDiceProof)throw Error('Již existuje doklad kalendářového hodu');
  entry.calendarDiceProof={...structuredClone(witness),rolls:matched};added++;
 }
 return added;
}
