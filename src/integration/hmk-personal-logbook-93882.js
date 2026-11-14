/** Character Notes & Logbook: read-only, concise projections of already committed
 * HMK evidence. Never infer a roll, apply a rule, or mutate the authoritative log. */
const txt = value => String(value ?? '').trim();
const numeric = value => Number.isFinite(value) ? value : null;
export const personalTestLevel = Object.freeze({CS:'kritický úspěch',S:'úspěch',F:'neúspěch',CF:'kritický neúspěch'});
const levelLabel = level => personalTestLevel[level] ? `${level} · ${personalTestLevel[level]}` : txt(level) || 'neurčeno';

export function personalSkillReceipt(row, fallback={}) {
 const p=row?.skillTestProof||{}, a=p.a||p.result||p.will||{}, b=p.b||null;
 const original=txt(row?.body||fallback.body);
 const skill=txt(p.skills?.[0]||p.skill||fallback.skill||fallback.title?.replace(/^(?:Success (?:Value|Test)|Opposed)\s*·\s*/,'')||row?.title?.replace(/^(?:Success (?:Value|Test)|Opposed)\s*·\s*/,'')||p.kind||'Test');
 const eml=numeric(a.eml??a.rawEML), roll=numeric(a.roll), level=txt(a.level||a.victoryLevel||p.originalLevel||p.report?.level);
 const isValue=/value/i.test(txt(p.type||fallback.title||row?.title));
 const sv=numeric(a.sv), stars=numeric(a.svTier?.stars);
 const consequence=p.consequence||{};
 let effect='Bez dalšího potvrzeného následku';
 if(consequence.type==='context-specific-critical-failure')effect='CF: zvláštní následek pouze podle pravidla dané činnosti';
 else if(consequence.type&&consequence.type!=='none')effect=txt(consequence.label||consequence.description||consequence.effect)||'Následek evidován u původního testu';
 else if(p.effect)effect=txt(p.effect).split('\n')[0];
 else if(p.type==='skill-physical-consequence')effect=original.split('\n')[0]||'Zdravotní následek zaznamenán';
 if(!row?.skillTestProof) {
  const em=original.match(/\bEML\s*(-?\d+)/i), die=original.match(/(?:Primární\s+)?d100\s*\((\d{1,3})\)/i),
   sl=original.match(/d100\s*\(\d{1,3}\)\s*→\s*(CS|CF|S|F)\b/i), val=original.match(/\bSV\s*(-?\d+)\b/i);
  return {skill,kind:val?'Success Value':'Skill Test',eml:em?Number(em[1]):null,roll:die?Number(die[1]):null,
   level:sl?sl[1]:'',result:sl?levelLabel(sl[1]):'výsledek bez strukturovaného dokladu',sv:val?Number(val[1]):null,
   effect:'Následek viz původní doklad',actorId:txt(fallback.actorId),id:txt(fallback.id)};
 }
 const parts=[levelLabel(level)];
 if(isValue&&sv!==null)parts.push(`SV ${sv}${stars!==null?` · ${stars} ★`:''}`);
 if(p.comparison?.winner)parts.push(p.comparison.tie?'remíza':`převaha ${p.comparison.winner==='a'?'aktéra':'protistrany'}`);
 const other=b?{eml:numeric(b.eml),roll:numeric(b.roll),level:txt(b.level)}:null;
 return {skill,kind:isValue?'Success Value':'Skill Test',eml,roll,level,result:parts.join(' · '),sv,effect,other,
  actorId:txt(p.actorId||fallback.actorId),id:txt(row?.id||fallback.id)};
}

const HAZARDS={equipment:'problém s výbavou',accident:'nehoda',complication:'komplikace',direction:'ztráta směru',none:'bez nebezpečí'};
export function personalEpisodeTests(episode,journalById){
 const p=episode||{},tests=[],seen=new Set();
 const add=(row,fallback)=>{
  const id=txt(row?.id||fallback?.id);if(id&&seen.has(id))return;if(id)seen.add(id);
  tests.push(personalSkillReceipt(row,fallback));
 };
 for(const link of p.skillLinks||[])add(journalById.get(link.id),link);
 for(const [name,memory] of [['Survival / Orienteering',p.orientation],['Tracking',p.trackingMemory]]){
  if(!memory||seen.has(txt(memory.skillId)))continue;
  if(memory.skillId&&journalById.has(memory.skillId)){add(journalById.get(memory.skillId),{id:memory.skillId,title:name});continue;}
  tests.push({skill:name,kind:'Success Value',eml:null,roll:numeric(memory.roll),level:txt(memory.level),
   result:`${levelLabel(memory.level)} · SV ${memory.adjustment?.adjustedSV??memory.score?.adjustedSV??memory.sv??'—'}`,
   effect:'Výsledek z dokončené cestovní epizody',id:txt(memory.skillId),actorId:txt(memory.guideId||memory.trackerId)});
 }
 for(const actor of p.actors||[]){
  if(!actor.sr)continue;
  tests.push({skill:'Endurance · cestovní SR',kind:'Success Roll',eml:null,tn:numeric(actor.sr.tn),roll:numeric(actor.roll),
   die:'d10',level:actor.sr.success?'S':'F',result:actor.sr.success?'S · úspěch':'F · neúspěch',
   effect:`Weariness ${actor.before??'—'} → ${actor.after??'—'}${Number.isFinite(actor.delta)?` (změna ${actor.delta>=0?'+':''}${actor.delta})`:''}`,
   actorId:txt(actor.id),id:`end-${txt(actor.id)}`});
 }
 if(p.survivalHazard&&p.survivalHazard!=='none'){
  tests.push({skill:'Survival Hazard',kind:'Hazard Roll',eml:null,roll:numeric(p.settings?.survivalD10),die:'d10',
   level:'',result:HAZARDS[p.survivalHazard]||txt(p.survivalHazard),effect:'Další následky jen z potvrzených návazných hodů',actorId:'',id:'survival-hazard'});
 }
 for(const [i,roll] of (p.direction?.rolls||[]).entries()){
  tests.push({skill:`Direction Hazard${(p.direction.rolls||[]).length>1?` ${i+1}`:''}`,
   kind:'Hazard Roll',eml:null,roll:numeric(roll),die:'d10',level:'',
   result:txt(p.direction?.direction)||'viz pravidlový výsledek',effect:'Změna směru dle doloženého výsledku',actorId:'',id:`direction-${i}`});
 }
 if(p.foraging&&Number.isInteger(p.foraging.roll))tests.push({skill:'Foraging',kind:'Hazard Roll',eml:null,roll:p.foraging.roll,die:'d10',
  level:'',result:'hledání zásob',effect:'Nalezené množství je uvedeno v Zásobách',actorId:'',id:'foraging'});
 return tests;
}

function hash(text){let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0;}
function pick(values,key){return values[hash(key)%values.length]}
export function personalEpisodeFlavor(entry,episode){
 const p=episode||{},key=`${entry?.id||''}:${p.startMinute||0}:${p.kind||''}`;
 const patterns={
  travel:['Cesta postupuje podle skutečně zvolené trasy; každý krok prověřuje tempo družiny.',
   'Postavy drží společný směr a přizpůsobují postup terénu.',
   'Úsek cesty ukazuje, jak se volba tempa promítla do skutečného postupu.',
   'Pochod pokračuje s ohledem na cestovní podmínky a síly účastníků.',
   'Další část putování přináší nový úsek trasy a jeho doložené nároky.'],
  tracking:['Pozornost se obrací k terénu a drobným známkám sledované stopy.',
   'Při sledování stopy záleží na pozorování a souvislostech v okolí.',
   'Stopování postupuje po nalezených vodítkách, nikoli po odhadu bez opory.',
   'Postava vyhodnocuje, co lze ze stop bezpečně vyčíst.',
   'Terén nabízí podklady k dalšímu sledování; rozhoduje doložený test.'],
  forage:['Hledání zásob se soustředí na skutečné možnosti zdejší krajiny.',
   'Postavy procházejí dostupné okolí s cílem získat potravu nebo vodu.',
   'Při shánění obživy rozhodují podmínky prostředí a skutečné hody.',
   'Čas věnovaný sběru a hledání má v tomto úseku vlastní výsledek.',
   'Pozornost patří tomu, co krajina může poskytnout.'],
  watch:['Družina vyčleňuje čas na ostrahu a sledování okolí.',
   'Hlídka udržuje pozornost, zatímco čas běží dál.',
   'Při ostraze je důležitá vytrvalost a klidné pozorování.',
   'Tento úsek patří bdělosti, nikoli postupu krajinou.'],
  rest:['Úsek přináší doložený odpočinek bez dalšího cestovního postupu.',
   'Postava věnuje čas obnově sil podle skutečné délky odpočinku.'],
  sleep:['Čas patří spánku; změny únavy se řídí skutečnou evidencí.',
   'Po dobu tohoto úseku postava spí a cestovní pohyb ustává.'],
  other:['Zapsaná činnost zabrala skutečný čas v kampani.',
   'Tento úsek zaznamenává další doloženou činnost postavy.']};
 const base=patterns[p.kind]||patterns.other;
 return pick(base,key)+ (p.survivalHazard==='accident'?' Během úseku je doložena nehoda.':
 p.navigationState&&p.navigationState!=='clear'?' Orientace zatím není potvrzena jako obnovená.':'');
}
