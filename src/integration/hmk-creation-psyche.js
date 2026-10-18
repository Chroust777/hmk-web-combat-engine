/** HMK v1.2 p.40 — starting Psyche; physical dice and explicit trait choices.
 * Not the in-combat Psyche Stress mechanic. No random rolls are generated here. */
export const CREATION_PSYCHE_TRAITS=Object.freeze(['Angry','Depressed','Detached','Hallucinatory','Haunted','Hyperactive','Nervous','Paranoid','Phobic','Reckless']);
const AGE_COUNTS=Object.freeze({Young:1,Mature:2,Old:3});
export function creationPsycheCount(folk,ageGroup){
 if(folk==='Kúzhai'||folk==='Malákta')return 1;
 if(folk==='Sinái')return 4;
 if(folk==='Human'||folk==='Nâdi')return AGE_COUNTS[ageGroup]??null;
 // p.40 does not explicitly prescribe a starting count for these Folk.
 return null;
}
export function psycheIntensity(sum){
 if(!Number.isSafeInteger(sum)||sum<0)throw Error('Psyche: neplatný součet');
 return sum===0?[]:sum<=2?['Trait']:sum<=4?['Impulse']:sum<=6?['Disorder']:
   sum<=8?['Disorder','Trait']:sum<=10?['Disorder','Impulse']:['Disorder','Disorder'];
}
function die(v,sides){const n=Number(v);if(!Number.isInteger(n)||n<1||n>sides||String(v).trim()==='')throw Error(`Psyche: očekáván fyzický d${sides}`);return n;}
export function creationPsycheFromPhysical({folk,ageGroup,d20s,d10s=[],choices=[]}={}){
 const count=creationPsycheCount(folk,ageGroup);
 if(count===null)throw Error('HMK p.40 nestanovuje pro tento Folk počet počátečních Psyche d20: vyžaduje doložené rozhodnutí mimo automatickou tabulku');
 if(!Array.isArray(d20s)||d20s.length!==count)throw Error(`Psyche: vyžaduje ${count} samostatných fyzických d20`);
 const rolls=d20s.map(x=>die(x,20));
 const levels=rolls.map(d=>d===20?3:d===19?2:d===18?1:0),sum=levels.reduce((a,b)=>a+b,0);
 const intensities=psycheIntensity(sum);
 if(!Array.isArray(d10s)||!Array.isArray(choices)||d10s.slice(intensities.length).some(x=>x!==null&&x!==undefined&&String(x).trim()!=='')||choices.slice(intensities.length).some(x=>x!==null&&x!==undefined&&String(x).trim()!==''))throw Error('Psyche: přebytečný trait mimo výsledek tabulky');
 const traits=intensities.map((intensity,i)=>{
  const raw=d10s[i];const chosen=choices[i];
  if(raw!==undefined&&raw!==null&&String(raw).trim()!==''){
   const roll=die(raw,10),trait=CREATION_PSYCHE_TRAITS[roll-1];
   if(chosen&&chosen!==trait)throw Error('Psyche: vybraný trait neodpovídá fyzickému d10');
   return {intensity,trait,roll,method:'d10'};
  }
  if(!CREATION_PSYCHE_TRAITS.includes(chosen))throw Error('Psyche: vyberte konkrétní Trait nebo zadejte fyzický d10');
  return {intensity,trait:chosen,roll:null,method:'choice'};
 });
 return {folk,ageGroup,d20s:rolls,levels,sum,traits,sourcePage:40};
}
