/** HMK v1.2 verified skill-specific critical failure continuations.
 * A CF alone never authorizes a universal mishap. Activity is selected AFTER
 * the original roll, but BEFORE resolving its dependent consequence.
 * The ordinary Combat engine remains authority for combat attacks.
 */
import {successLevel,SL} from '../rules/tests.js';
export const CF_ACTIVITIES=Object.freeze({
 Acrobatics:Object.freeze([
  {id:'acro-balance',label:'Balance · úzká lávka / rovnováha',page:64,mode:'test',test:'Agility'},
  {id:'acro-gymnastics',label:'Gymnastics · salto / přemet během pohybu',page:64,mode:'prone'}]),
 Climbing:Object.freeze([
  {id:'climb-easy',label:'Easy Climbing · snadný výstup',page:67,mode:'test',test:'Stumble'},
  {id:'climb-difficult',label:'Difficult Climbing · výstup SV',page:67,mode:'split'}]),
 Jumping:Object.freeze([{id:'jumping-sv',label:'Jumping · skok SV',page:77,mode:'test',test:'Stumble'}]),
 Fishing:Object.freeze([{id:'fishing-sv',label:'Fishing · lov ryb SV',page:71,mode:'split-fishing'}]),
 Survival:Object.freeze([{id:'trek-survival-hazard',label:'Trekking · náhodný Survival Hazard',page:148,mode:'hazard'}]),
 Script:Object.freeze([{id:'writing-routine',label:'Writing Routine · autor textu',page:132,mode:'test',test:'Will'}]),
 Lockcraft:Object.freeze([{id:'lock-picking',label:'Picking Locks · otevírání zámku',page:77,mode:'lock'}])
});
export function criticalActivities(skill){const name=String(skill);return CF_ACTIVITIES[name]||(/^Script(?:\s|\(|:|$)/.test(name)?CF_ACTIVITIES.Script:[]);}
export function criticalFollowupPlan(skill,activity,original){
 if(!original||original.level!=='CF'||original.forcedCF===true)return null;
 const r=criticalActivities(skill).find(x=>x.id===activity);if(!r)return null;
 const unit=original.roll%10,cf0=unit===0,cf5=unit===5;
 const t=r.mode==='split'||r.mode==='split-fishing'?(cf0?'Fumble':'Stumble'):r.test;
 if(r.mode==='prone')return {...r,requiresRoll:false,detail:'CF: manévr selhal; postava padá prone. Další hod pravidlo nevyžaduje.'};
 if(r.mode==='hazard')return {...r,requiresRoll:false,detail:'CF Trekking: vyhodnoťte Survival Hazard d10 (1–3 Equipment, 4–6 Accident, 7–10 Complication). Accident vyžaduje Agility test náhodně určené postavy a při neúspěchu skutečné zranění d6+4b.'};
 if(r.mode==='lock')return {...r,requiresRoll:false,detail:'CF: zámek se neotevře; další pokusy mají kumulativní postih −20 ML. Bez dalšího d100.'};
 return {...r,requiresRoll:true,test:t,detail:t==='Fumble'?'Test Dexterity nebo doložené Legerdemain.':t==='Stumble'?'Test Agility nebo doložené Acrobatics.':`Následuje test ${t}.`};
}
export function criticalFollowupResult(plan,roll,eml){
 if(!plan?.requiresRoll)throw Error('Tato činnost žádný další hod nevyžaduje');
 if(!Number.isSafeInteger(roll)||roll<1||roll>100||!Number.isFinite(eml))throw Error('Následný d100 a EML musí být ověřené');
 const sl=successLevel(roll,eml),level=['CF','F','S','CS'][sl];
 let effect='';
 switch(plan.id){
 case 'acro-balance':effect=sl<SL.S?'Postava spadne.':sl===SL.S?'Příští tah obnovuje rovnováhu, nepohybuje se.':'Rovnováha udržena bez dalšího následku.';break;
 case 'acro-gymnastics':effect='Postava spadne prone.';break;
 case 'climb-easy':case 'climb-difficult':effect=sl<SL.S?'Následný Mishap selhal: postava padá; případné zranění se určí podle pravidel pádu, str. 67.':'Mishap odvrácen; základní Climbing CF se tím nemění.';break;
 case 'jumping-sv':effect=sl<SL.S?'Stumble selhal: postava klopýtla před skokem; pokud následoval pád z výšky nad 5 stop, je nutná Falling Routine str.67.':'Stumble úspěšný: skok může pokračovat vyhodnocením SV.';break;
 case 'fishing-sv':effect=sl===SL.CF?'Následné CF: ztráta/poškození vybavení a náhodné zranění d10e Impact; pokračujte povinnou Injury Sequence.':sl===SL.F?'Vybavení je ztraceno nebo poškozeno.':'Vybavení uchráněno, původní Fishing CF trvá.';break;
 case 'writing-routine':effect=sl===SL.CF?'Dokončení práce trvá o 100 % déle.':sl===SL.F?'Dokončení práce trvá o 50 % déle.':'Bez dodatečného časového postihu.';break;
 default:effect='Následek podle pravidla činnosti';
 }
 return {roll,eml,sl,level,effect};
}
export function criticalEMLRange(result,ctx){
 const d=ctx?.loadEvidence;
 const low=d?.modifiedENC??d?.knownMinimumENC;
 const high=d?.modifiedENC??d?.knownMaximumENC;
 const applies=ctx?.condition?.applicability?.kind==='applies';
 if(!result||!Number.isSafeInteger(result.eml)||!applies||!Number.isSafeInteger(low)||!Number.isSafeInteger(high)||high<low)return null;
 const upper=result.eml,lower=Math.max(5,Math.min(95,upper-(high-low)));
 if(lower===upper&&!ctx?.armourIsProvisional)return null;
 return {low:lower,high:upper,encLow:low,encHigh:high,provisional:!!ctx?.armourIsProvisional,prohibited:!!d?.prohibitedOutfit,otherUnknown:ctx?.trauma?.bulk?.mode==='provisional-unresolved'||ctx?.trauma?.perception?.mode==='provisional-unresolved'};
}
