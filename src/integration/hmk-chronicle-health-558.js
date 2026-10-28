/** HMK 1.2 pp.177–186: read-only character health projection.
 * No derived deadline is ever treated as an authoritative course roll.
 * Calendar minutes and validated original medical episodes are the only
 * sources for deadlines. This file never writes health, rolls or time.
 */
import {ailmentOutcome} from '../rules/ailments.js';
export const HR_HELP_558 = 'Healing Rate (HR), HMK str. 184–186: sedm stupňů 0 až 6. HR6 = zotavení; HR5 = +5 Weakness Fatigue; HR4 = +10 Weakness Fatigue; HR3 = Stunned (STN); HR2 = Incapacitated (INC); HR1 = Unconscious (UNC); HR0 = smrt u smrtelných průběhů. Stupně se nesčítají, účinek současného HR nahrazuje předchozí. Hlad začíná HR5 a žízeň HR4. Advance hlad: 3 dny, při polovičních dávkách 6 dní; žízeň: 1 / 2 dny. Úplný klid prodlužuje Advance interval na dvojnásobek. Plná denní dávka umožní Healing Roll po jednom dni. Každý hod může další průběh změnit, předem nelze určit datum smrti ani zotavení.';
export const HR_LEVELS_558=Object.freeze([
 'HR0 · smrt (při smrtelném průběhu)','HR1 · bezvědomí (UNC)',
 'HR2 · vyřazení (INC)','HR3 · omráčení (STN)',
 'HR4 · +10 Weakness Fatigue','HR5 · +5 Weakness Fatigue',
 'HR6 · zotavení'
]);
const integer=x=>Number.isSafeInteger(x);
const elapsed=m=>{
 if(!integer(m))return 'neověřeno';
 if(m<0)return 'po termínu o '+elapsed(-m);
 if(m===0)return 'splatné nyní';
 const d=Math.floor(m/1440),h=Math.floor(m%1440/60),min=m%60;
 return 'za '+([d?d+' d':null,h?h+' h':null,min?min+' min':null].filter(Boolean).join(' ')||'< 1 min');
};
const item=(id,label,rate,impact,time=null,detail='',hrHelp=true)=>({id,label,rate,impact,time,detail,hrHelp});
export const courseSummary_558=(hr)=>integer(hr)&&hr>=0&&hr<=6?HR_LEVELS_558[hr]:'HR nedoloženo';
function nextTime(absoluteMinute,now,display){
 if(!integer(absoluteMinute)||absoluteMinute<0)return 'Další kontrola: termín není doložen';
 const date=typeof display==='function'?display(absoluteMinute):'minuta '+absoluteMinute;
 return 'Další kontrola '+(integer(now)?elapsed(absoluteMinute-now):'čas do kontroly neověřen')+' ('+date+')';
}
const dueFor=(agenda,kind,actorId,episodeId,woundId)=>{
 const events=(agenda?.all||[]).filter(x=>x.characterId===actorId&&x.kind===kind&&
  (episodeId?(x.episodeId===episodeId||x.sourceId===episodeId):true)&&(woundId?x.woundId===woundId:true)&&integer(x.minute));
 return events.sort((a,b)=>a.minute-b.minute)[0]??null;
};
const missing=(agenda,kind,actorId,episodeId,woundId)=>
 (agenda?.unknown||[]).find(x=>x.characterId===actorId&&x.kind===kind&&
  (episodeId?(x.episodeId===episodeId||x.sourceId===episodeId):true)&&(woundId?x.woundId===woundId:true));
const dueDescriptor=(agenda,kind,actorId,now,display,episodeId,woundId)=>{
 const event=dueFor(agenda,kind,actorId,episodeId,woundId);
 if(event)return nextTime(event.minute,now,display);
 const miss=missing(agenda,kind,actorId,episodeId,woundId);
 return miss?'Termín neověřen: '+(miss.reason||miss.description||'chybí původní doklad'):'Další kontrola: bez potvrzeného termínu';
};
/** Status includes all active medical courses and wound obligations, not just
 * the first sorted agenda item. No assumption that every course has a timer. */
export function projectChronicleHealth_558({actorId,state,now=null,campaignId=null,agenda=null,displayMinute=null,auralShockLevels=null}={}){
 const s=state||{},rows=[],issues=[];
 const gmTime=integer(now)&&now>=0?now:null;
 for(const e of s.malnutritionEpisodes||[]){
  if(campaignId&&e.campaignId!==campaignId)continue;
  if(!['active','dead'].includes(e.status))continue;
  const label=e.kind==='starvation'?'Hlad · Starvation':e.kind==='thirst'?'Žízeň · Thirst':'Strádání';
  const info=e.status==='dead'?'smrtelný následek':courseSummary_558(e.hr);
  const period=e.kind==='starvation'?'Advance obvykle 3 dny, při polovičních dávkách 6 dní':
   'Advance obvykle 1 den, při polovičních dávkách 2 dny';
  const mode=e.lastMode==='healing'?'poslední provedený hod: Healing':
    e.lastMode==='advance'?'poslední provedený hod: Advance':'typ příštího hodu určí zásobování';
  rows.push(item(e.id,label,'HR'+e.hr,info,
   e.status==='active'?nextTime(e.nextDueMinute,gmTime,displayMinute):'Bez další kontroly',
   period+'; '+mode+'. Plné dávky umožňují Healing každý den; příští výsledek vyžaduje skutečný d100.'));
 }
 for(const t of s.toxinCourses||[]){
  if(!['incubating','active'].includes(t.status))continue;
  rows.push(item(t.id,'Otrava · Poison',integer(t.hr)?'HR'+t.hr:'Nástup čeká',
   t.status==='incubating'?'inkubace':courseSummary_558(t.hr),
   dueDescriptor(agenda,'poison',actorId,gmTime,displayMinute,t.id),
   'Další Course Roll závisí na potvrzené expozici a pravidlovém intervalu.'));
 }
 for(const t of s.diseaseCourses||[]){
  if(!['pending-profile','incubating','active'].includes(t.status))continue;
  rows.push(item(t.id,'Nemoc · '+(t.diseaseKey||'Disease'),integer(t.hr)?'HR'+t.hr:'HR neurčeno',
   t.status==='active'?courseSummary_558(t.hr):t.status==='incubating'?'inkubace':'čeká na profil',
   dueDescriptor(agenda,'disease',actorId,gmTime,displayMinute,t.id),
   'Course a jeho následky jen po předepsaném testu; bez profilu žádný odhad HR.'));
 }
 for(const h of s.environmentalHazards||[]){
  if(!h.active)continue;
  rows.push(item(h.id,(h.kind==='cold'?'Chlad':'Horko')+' · Exposure','HR'+h.hr,courseSummary_558(h.hr),
   dueDescriptor(agenda,'weather-course',actorId,gmTime,displayMinute,h.sourceId),
   'Vyhodnocení vyžaduje skutečný Advance/Healing Roll a doloženou změnu podmínek.'));
 }
 for(const w of s.wounds||[]){
  if(w.healed)continue;
  const name=[w.location||w.loc||'neznámá lokace',w.severity&&w.level?w.severity+w.level:null].filter(Boolean).join(' ');
  const h=w.healing;
  if(!h){rows.push(item(w.id,'Rána · '+name,'Bez ošetření',
    w.bleeding?'krvácení':'léčba nepotvrzena','Termín dalšího hojení neověřen',
    'Nejprve dokončit původní Treatment a případné zastavení krvácení.',false));continue;}
  const infected=!!h.infected;
  const healing=h.treated&&!h.noMundaneHealing&&!infected;
  const kind=infected?'infection':healing?'healing':null;
  const status=infected?'aktivní infekce':h.noMundaneHealing?'běžné hojení nedostupné':
   h.treated?'ošetřená rána':'čeká na ošetření';
  const stateHR=infected?('Infection HR'+(integer(h.infectionHR)?h.infectionHR:'?')):
   healing&&integer(h.healingRate)?'Healing HR'+h.healingRate:'HR neurčeno';
  rows.push(item(w.id,'Rána · '+name,stateHR,status,
   kind?dueDescriptor(agenda,kind,actorId,gmTime,displayMinute,null,w.id):
    'Termín nedoložen nebo běžné léčení pozastaveno',
   infected?'Infekce pozastavuje Healing Rolls všech ran (HMK str. 181).':
    'Přesný čas úplného uzdravení nelze bez dalších skutečných hodů určit.',!!kind));
  if(h.grimWound)rows.push(item(w.id+':grim','Grim Wound · '+name,'Shock',
   'samostatná denní kontrola',dueDescriptor(agenda,'grim',actorId,gmTime,displayMinute,null,w.id),
   'Současná infekce neruší povinnost denního Grim Shock.',false));
 }
 if(s.shockFollowup)rows.push(item('shock-followup','Shock Reroll','Povinný',
  'čeká na skutečný Shock test',dueDescriptor(agenda,'shock-followup',actorId,gmTime,displayMinute),
  'Termín může záviset na bojovém kole; nepřevádět automaticky na minuty kampaně.',false));
 if(s.bloodShockPending)rows.push(item('blood-shock-pending','Blood Shock','Povinný',
  'vyřešit v Combat',dueDescriptor(agenda,'blood-shock',actorId,gmTime,displayMinute),
  'Povinný Shock následek Blood Loss se nesmí pominout.',false));
 if(s.asphyxiaComaPending?.active)rows.push(item('asphyxia-coma-pending','Asphyxia / Coma',
  'Vyžaduje GM','počáteční Coma HR nebylo doloženo',
  dueDescriptor(agenda,'asphyxia',actorId,gmTime,displayMinute),
  'Nelze dosadit výchozí HR bez předepsaného dokladu.',false));
 if(s.herbalParalysis)rows.push(item('herbal-paralysis','Bylinná paralýza',
  'Aktivní účinek','omezení pohybu závisí na doloženém cíli',
  nextTime(s.herbalParalysis.endMinute,gmTime,displayMinute),
  'Nástup a konec jsou převzaty z původního důkazu, nikoli z odhadu.',false));
 if(s.extendedShock)rows.push(item('extended-shock','Prodloužený šok','HR'+s.extendedShock.hr,
  'Extended Shock · '+String(s.shock||''),dueDescriptor(agenda,'extended-shock',actorId,gmTime,displayMinute),
  'Course každé 4 doložené hodiny; bez hodu nelze předvídat zotavení ani Coma.'));
 if(s.coma?.active)rows.push(item('coma','Kóma','HR'+s.coma.hr,'bezvědomí',
  dueDescriptor(agenda,'coma',actorId,gmTime,displayMinute),
  'Další Coma Course v určeném d10denním intervalu, výsledek nelze předjímat.'));
 if(s.bloodLoss?.bp>0)rows.push(item('blood-loss','Ztráta krve','BP '+s.bloodLoss.bp,
  'slabost '+(s.bloodLoss.weaknessFatigue??'—'),
  dueDescriptor(agenda,'blood-loss',actorId,gmTime,displayMinute),
  'Krvácení a regenerace jsou samostatné účinky; aktivní krvácení vyžaduje původní bojovou proceduru.',false));
 if(auralShockLevels>0)rows.push(item('aural','Aural Shock',auralShockLevels+' úrovní',
  'průběžný duchovní šok',dueDescriptor(agenda,'aural-recovery',actorId,gmTime,displayMinute),
  'Samostatná Will Recovery podle HMK str.190.',false));
 if(s.sleepDeprivation?.status==='awake')rows.push(item('sleep','Nedostatek spánku',
  (s.sleepDeprivation.activeWeariness??'—')+' Weariness',
  (s.sleepDeprivation.hoursAwake??'—')+' h beze spánku',
  dueDescriptor(agenda,'sleep-deprivation',actorId,gmTime,displayMinute),
  'Další účinky jsou vázané na doložený čas a END SR; samotné množství zásob spánek nepotvrzuje.',false));
 for(const seq of s.ailmentSequelae||[])if(seq.active)rows.push(item(seq.id,'Trvalý následek',
  seq.condition||'neurčeno',seq.affectedLimb||'trvalý stav',
  'Bez automatického termínu obnovy','Původní Disease Course je dokladem následku.',false));
 const eligible=new Set(['healing','infection','grim','extended-shock','coma','blood-loss','treatment','bleeding','weather','weather-course','weather-skin','poison','disease','sleep','sleep-deprivation','shock-followup','blood-shock','aural-recovery','psyche-choice','asphyxia']);
 for(const missing of agenda?.unknown||[])if(missing.characterId===actorId&&eligible.has(missing.kind))issues.push(missing.description||missing.reason||missing.kind);
 return {rows,issues,hasActiveMalnutrition:rows.some(r=>r.label.startsWith('Hlad')||r.label.startsWith('Žízeň'))};
}
