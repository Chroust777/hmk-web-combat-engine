/** G04: two conservative in-panel wizards for the existing Combat screen.
 * All numbers marked "roll" originate from GM input. No RNG, no alternate write.
 * Area supports proven Doom Flame casting with independently verified proactive Evade;
 * Mounted Ride-by requires a proven shared IR and a verified Melee hit journey.
 */
import {awaitingPelahnBonus,persistPelahnExtraPass,persistPelahnExtraMove,persistPelahnTotalReleaseSource,preparePelahnBonusMelee,persistPelahnExtraMelee,preparePelahnBonusMissile,persistPelahnExtraMissile,persistPelahnBonusIncantStart} from './hmk-pelahn-live-initiative.js';
import {prepareGuidedPyre,guidedPyreRequirement,submitGuidedPyreDie,persistGuidedPyre,persistGuidedPyreTotalReleaseSource} from './hmk-guided-pyre.js';
import {prepareDoomFlameSource,doomFlameRequirement,submitDoomFlameDie,resolveDoomFlameCohort,persistGuidedDoomFlame,persistFailedDoomFlame,persistDoomFlameFormMisfire} from './hmk-guided-doom-flame.js';
import {prepareMountedRideBy,finalizeMountedRideBy,persistMountedRideBy} from './hmk-mounted-ride-by.js';
import {prepareMountedSharedMove,finalizeMountedSharedMove,persistMountedSharedMove} from './hmk-mounted-shared-turn.js';
import {guidedAttackRequirement,chooseGuidedAttack,submitGuidedAttackDie,advanceGuidedAttack,completeGuidedAttack} from './hmk-guided-attack-journey.js';
import {resolveVerifiedAreaProtection} from './hmk-verified-area-protection.js';
import {previewProactiveDoomFlameEvade} from './hmk-proactive-area-evade.js';
import {dueInjuryMorale} from './persistent-combat-state.js';
import {pelahnBonusIncantChoices} from './hmk-pelahn-incant-registry.js';
import {pendingSpellPsycheChoices,persistSpellPsycheTraitChoice,SPELL_PSYCHE_TRAITS} from './hmk-spell-psyche-trait-choice.js';
import {availableSpellAuralRecoveries,persistSpellAuralRecovery} from './hmk-spell-aural-recovery.js';
import {pendingSpellPsycheManifestations,persistSpellPsycheManifestation} from './hmk-spell-psyche-manifestation.js';
import {availableSpellPsycheRecoveries,persistSpellPsycheRecoverySchedule,persistSpellPsycheRecoveryRoll} from './hmk-spell-psyche-recovery.js';
import {availableSpellPsycheExpressions,persistSpellPsycheExpression,persistSpellPsycheExpressionEnd} from './hmk-psyche-impulse-expression.js';
const cp=structuredClone,js=JSON.stringify;
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const positive=(x,lo=1,hi=100)=>{const s=String(x??'');if(!/^\d+$/.test(s))throw Error('Chybí číslo fyzického hodu GM');const n=Number(s);if(!Number.isSafeInteger(n)||n<lo||n>hi)throw Error('Hod mimo rozsah d'+hi);return n;};
const real=x=>{const s=String(x??'');if(!/^-?\d+(?:\.\d+)?$/.test(s))throw Error('Chybí ověřená souřadnice nebo vzdálenost');return Number(s);};
const opt=(c)=>`<option value="${esc(c.id)}">${esc(c.name||c.id)}</option>`;
const fld=(n,title,v='',type='text')=>`<label>${esc(title)}<input name="${esc(n)}" type="${type}" value="${esc(v)}" required></label>`;
const btn=(title)=>`<button type="submit">${title}</button>`;
function selection(name,title,items){return `<label>${esc(title)}<select name="${name}" required><option value="">Vybrat…</option>${items.map(x=>`<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('')}</select></label>`;}
function makeKey(c,prefix){return `${prefix}:${c.id}`;}
/** Designed to be inserted in the existing guidedAttackPanel; DOM listeners are
 * attached by app.js (capture phase), not by the rules module. */
export function createG04ActionWizards({getDocument,getBaseline,getStorage,getStorageKey,onCommit,onChange,newId,getSessionStorage,available,availableForPsycheChoice=available}={}){
 const DRAFT='hmk-g04-combined-wizard-draft-v1';let draft=null,notice='';
 function take(){return getDocument();}
 function serial(){try{if(draft)getSessionStorage().setItem(DRAFT,js(draft));else getSessionStorage().removeItem(DRAFT);}catch{notice='Pracovní uložiště odmítlo zapisovat; rozpracované hody nejsou zaručeně obnovitelné.';}}
 function set(d){
  if(['mounted','pelahn-melee','pelahn-missile'].includes(d?.kind)&&d.attack){
   for(let i=0;i<30;i++){const r=guidedAttackRequirement(d.attack);
    if(r.kind!=='automatic')break;
    const next=advanceGuidedAttack(d.attack);
    if(js(next)===js(d.attack))throw Error('Automatický Mounted krok nepostupuje');
    d={...d,attack:next,transcript:[...(d.transcript??[]),{kind:r.kind,id:r.id}]};
   }
  }
  draft=d;notice='';serial();onChange();}
 function clear(){draft=null;notice='';serial();onChange();}
 function restore(){try{const raw=getSessionStorage()?.getItem(DRAFT);if(!raw)return;const d=JSON.parse(raw);if(!['area','mounted','pelahn-melee','pelahn-missile','pyre'].includes(d.kind)||!d.stage?.id)throw Error('Neplatný návrh');
  const doc=take();if(js(doc)!==d.stage.documentWitness||doc.journal?.some(j=>j.combatProof?.sourceEventId===d.stage.id))throw Error('Již uložené nebo zastaralé úložiště');draft=d;
 }catch(e){draft=null;notice='Rozpracovaný G04 průvodce odmítnut: '+e.message;try{getSessionStorage()?.removeItem(DRAFT)}catch{}}}
 restore();
 function panel(){const document=take(),seq=document?.combatRuntime?.sequence;
  if(!seq)return '';
  const combatants=document.characters.filter(c=>seq.order.includes(c.id));
  const burst=awaitingPelahnBonus(seq);
  if(!draft&&burst&&available()){
   const current=combatants.find(c=>c.id===burst.actorId);
   const flags=['foe','threatens','aware','helpless','concentrating','reachImpeded'];
   const facts=combatants.map(c=>`<fieldset><legend>${esc(c.name)}</legend>${flags.map(n=>`<label>${esc(n)}<select name="map_${esc(c.id)}_${n}"><option value="">GM potvrdí…</option><option value="yes">Ano</option><option value="no">Ne</option></select></label>`).join('')}<label>Skutečný Reach ft<input name="map_${esc(c.id)}_reach" type="number"></label></fieldset>`).join('');
   return `<section class="panel"><h4>Pèleáhn Hyper Burst · kolo ${burst.round} · ${esc(current?.name||burst.actorId)}</h4><p>Po dokončeném běžném tahu je nutná další akce a vždy fyzický END d100. Při Fatigue ≥ Move není druhá akce dovolena. Druhý Melee i ověřený nabitý Missile mají níže samostatné fyzické průvodce. U ověřených známých Doom Flame VI nebo Pyre III lze zahájit Incant spellstart; jeho budoucí spellfire vyžaduje vlastní pravidlový průchod. Neověřené Missile/Incant kombinace a souběžné zdroje Hyper Burst jsou odmítnuty.</p><form id="hmk-g04-pelahn-extra">
    <label>Bonusová akce<select name="extraAction"><option value="pass">Pass / pouze END (při Fatigue ≥ Move)</option><option value="move">Move – half/full</option></select></label>
    ${fld('roll','Skutečný END d100','','number')}
    <label>Jen Move: skutečná trasa x,y;x,y<input name="route" type="text"></label>
    <label>Jen Move: rychlost<select name="rate"><option value="half">half</option><option value="full">full</option></select></label>
    ${fld('difficultSources','Jen Move: obtížný terén (0–8)','0','number')}
    <details><summary>Jen Move: všechna fakta mapy GM</summary>${facts}</details>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje skutečnou druhou akci, fyzický END a při Move kompletní mapu</label>
    ${btn('Atomicky dokončit bonus Hyper Burstu')}</form>
    <details><summary>Druhá akce — řízený Melee Attack (HMK 165–170, 204)</summary>
    <p>Vyžaduje kompletní fyzické hody v existující Melee a Injury Sequence. Jediný zápis nastane až po END. Další povinné následky bez podpory zůstávají odmítnuté.</p>
    <form id="hmk-g04-pelahn-melee-start">
    ${selection('targetId','Skutečný cíl',combatants.filter(c=>c.id!==burst.actorId).map(c=>({id:c.id,label:c.name||c.id})))}
    ${selection('attackerWeaponId','Nasazená zbraň útočníka',document.inventory.filter(i=>i.characterId===burst.actorId&&['main_hand','off_hand'].includes(i.slot)&&i.snapshot?.category==='weapon').map(i=>({id:i.id,label:i.snapshot.name||i.id})))}
    ${selection('defenderWeaponId','Nasazená zbraň cíle',document.inventory.filter(i=>i.characterId!==burst.actorId&&['main_hand','off_hand'].includes(i.slot)&&i.snapshot?.category==='weapon').map(i=>({id:i.id,label:i.snapshot.name||i.id})))}
    ${selection('attackerSkillId','Melee aktéra',(current?.hmk?.skills??[]).filter(s=>String(s.name).toLowerCase()==='melee').map(s=>({id:s.id,label:s.name+' ML '+s.ml})))}
    ${selection('defenderSkillId','Melee obránce',combatants.filter(c=>c.id!==burst.actorId).flatMap(c=>(c.hmk?.skills??[]).filter(s=>String(s.name).toLowerCase()==='melee').map(s=>({id:s.id,label:(c.name||c.id)+' ML '+s.ml}))))}
    <label>Ruka aktéra<select name="attackerUsedArms"><option value="right">pravá</option><option value="left">levá</option><option value="both">obě</option></select></label>
    <label>Ruka obránce<select name="defenderUsedArms"><option value="right">pravá</option><option value="left">levá</option><option value="both">obě</option></select></label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje skutečný cíl a okolnosti nevyžadující další zatím neřešené modifikátory</label>
    ${btn('Spustit fyzickou druhou Melee akci')}</form></details>
    <details><summary>Druhá akce — řízený Missile / Thrown Attack</summary>
    <p>Ověřeně nabitý luk, kuše nebo prak; nebo v ruce držená vrhací zbraň z tabulky HMK str. 110. Pouze přímá střelba / vrh bez Volley, nabíjení, Charge a dalších komplikací. Všechny kostky fyzicky hází GM. Vržená zbraň opustí ruku ve stejném atomickém zápisu.</p>
    <form id="hmk-g04-pelahn-missile-start">
    ${selection('targetId','Cíl přímo mířené střely',combatants.filter(c=>c.id!==burst.actorId).map(c=>({id:c.id,label:c.name||c.id})))}
    ${selection('weaponId','Ověřeně nabitá nebo vrhací zbraň',document.inventory.filter(i=>i.characterId===burst.actorId&&['main_hand','off_hand'].includes(i.slot)&&i.snapshot?.category==='weapon'&&(seq.missileReadiness?.[i.id]?.loaded||i.snapshot?.properties?.missileType==='thrown')).map(i=>({id:i.id,label:i.snapshot.name||i.id})))}
    ${selection('skillId','Dovednost střelce',(current?.hmk?.skills??[]).filter(z=>['archery','slings','throwing'].includes(String(z.name).toLowerCase())).map(z=>({id:z.id,label:z.name+' ML '+z.ml})))}
    <label>Skutečně použitá ruka<select name="attackerUsedArms"><option value="both">obě</option><option value="right">pravá</option><option value="left">levá</option></select></label>
    <label>Kuše: způsob Archery testu<select name="crossbowBasis"><option value="">GM vybere pro kuši…</option><option value="ml">Archery ML</option><option value="sb3">Archery SB × 3</option></select></label>
    <label>Stav cíle<select name="targetMovement"><option value="still">Still</option><option value="moving">Moving</option></select></label>
    <label>Windforce (0–4)<input type="number" name="windforce" min="0" max="4" value="0" required></label>
    <label><input type="checkbox" name="crosswind" value="yes"> Ověřený boční vítr</label>
    <label><input type="checkbox" name="movingShooter" value="yes"> Střelec se během Attack pohybuje</label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM ověřil viditelnost, zvolený stav cíle a střelce, směr větru, čistou trajektorii a nepřítomnost dalších TAR/nearby cílů</label>
    ${btn('Spustit druhý fyzický Missile Attack')}</form></details>
    <details><summary>Druhá akce — ověřený Incant spellstart</summary>
    <p>Ověřený Doom Flame VI (2 kola) nebo izolovaný Pyre III (1 kolo). Spellfire proběhne na dalším příslušném IR. Není to obecný resolver všech kouzel HMK.</p>
    <form id="hmk-g04-pelahn-incant-start">
    ${selection('spell','Známé kouzlo s úplným ověřeným Spellfire resolverem',pelahnBonusIncantChoices(current).map(x=>({id:x.name,label:x.name+' · '+x.castingTimeRounds+' kola'})))}
    ${fld('roll','Fyzický END d100 po spellstart','','number')}
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje jeden Incant v IR, naučené zvolené kouzlo, standardní cant/gesture a zahájenou koncentraci</label>
    ${btn('Atomicky zahájit Incant a END')}</form></details></section>`;
  }
  // A spell-induced Psyche choice is an explicit GM follow-up. It cannot
  // displace an outstanding Hyper Burst END, hence it appears only AFTER the
  // pending bonus-action gate above. Recovery is not simulated here.
  // Psyche choice is a GM aftermath, not an action. It may be completed
  // between consecutive physically due Morale rolls, without starting a
  // second wizard or consuming Initiative; the pending rolls remain due.
  if(!draft&&!burst&&(availableForPsycheChoice()||!seq.active)){
   const choices=pendingSpellPsycheChoices(document);
   if(choices.length){
    const c=choices[0];
    return `<section class="panel"><h4>HMK Psyche Stress (Morale / Spell / Aural) · volba Trait</h4>
    <p>${esc(c.name)}: nevyřešený Psyche Stress ${c.levels}, zdroj ${esc(c.sourceEventId)}.
    GM nyní vybere skutečný Trait z HMK str. 188. Jeho projev za cca 10 minut,
    Weakness a další Recovery se NEPROVÁDÍ tímto zápisem.</p>
    <form id="hmk-g04-psyche-choice">${selection('trait','Psyche Trait vybraný GM',SPELL_PSYCHE_TRAITS.map(x=>({id:x,label:x})))}
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje vybraný Trait a původní událost</label>
    ${btn('Atomicky uložit volbu Psyche Trait')}</form></section>`;
   }
  }
  // A completed bonus Pyre Incant must be resolved on its due Initiative IR.
  // The normal Area panel is not the correct action for this concentration.
  if(!draft&&!burst&&available()&&seq.active){
   const who=seq.order[seq.cursor],task=seq.commitments?.[who];
   const start=seq.log.find(x=>x.type==='pelahn-bonus-incant-spellstart'&&
    x.actorId===who&&x.round===task?.startRound&&x.spell==='Pyre');
   if(task?.status==='completed'&&task.completedRound===seq.round&&task.durationRounds===1&&start){
    const woods=document.inventory.filter(i=>i.slot==='none'&&i.destroyed===false&&
     i.quantity===1&&i.snapshot?.category==='other'&&
     i.snapshot?.properties?.material==='wood'&&i.snapshot.properties.living===false&&
     Number.isFinite(i.snapshot.properties.weightLb)&&i.snapshot.properties.weightLb>0);
    return `<section class="panel"><h4>Pèleáhn · Pyre III — fyzický Spellfire</h4>
    <p>HMK v1.2 str. 229, koncentrace 1 kolo. Jen jediný doložený, opuštěný, neživý dřevěný předmět mimo dotyk s bytostí, bez dalšího šíření ohně. GM musí fyzicky hodit Casting d100; CF vyžaduje fyzický Spell Misfire d100. Bez kompletních následků nelze tah uložit.</p>
    <form id="hmk-g04-pyre-start">
    ${selection('itemId','Ověřený izolovaný dřevěný předmět',woods.map(i=>({id:i.id,label:(i.snapshot.name||i.id)+' · '+i.snapshot.properties.weightLb+' lb'})))}
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje skutečný dotyk, prázdné okolí, hlasitý cant/gesture, nulové jiné modifikátory a požadované souhlasy podle HMK</label>
    ${btn('Zahájit fyzický Pyre Spellfire')}</form></section>`;
   }
  }
  if(!draft&&!seq.active){
   const manifestations=pendingSpellPsycheManifestations(document);
   if(manifestations.length){
    const t=manifestations[0];
    return `<section class="panel"><h4>HMK Psyche · nástup traitu po ~10 minutách</h4>
    <p>${esc(t.name)} · ${esc(t.trait)} PSY ${t.levels}. HMK str. 188–189: po skutečném nástupu přidej Weakness +${t.levels*5}. D6-denní Recovery zůstane nevyřešena.</p>
    <form id="hmk-g04-psyche-manifestation">
    <label><input type="checkbox" name="elapsed" value="yes" required> GM potvrzuje, že od příčinného traumatu skutečně uplynulo přibližně 10 herních minut</label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje trvalé uložení nástupu a Weakness</label>
    ${btn('Atomicky potvrdit nástup Psyche Trait')}</form></section>`;
   }
  }
  if(!draft&&!seq.active){
   const candidates=availableSpellPsycheRecoveries(document);
   if(candidates.length){
    const opts=candidates.map(x=>({id:x.characterId+'|'+x.trait,
     label:x.name+' · '+x.trait+' PSY '+x.levels+(x.permanent?' (permanent)':'')+
      (x.schedulePending?' · vyžaduje d6':' · Will od dne '+x.plan.dueGameDay)}));
    const c=candidates[0];
    return `<section class="panel"><h4>HMK Psyche Stress Recovery (str. 189)</h4>
    <p>Každý trait se zotavuje zvlášť. GM fyzicky hodí d6 pro počet herních dnů,
    které musí skutečně uplynout, pak Will d100 BEZ Fatigue penalty.
    CF znamená permanentní trait nebo zvýšení intenzity trvalého traitu;
    F beze změny; S odstraní PSY1, CS PSY2 a jen příslušnou Weakness.</p>
    <form id="hmk-g04-psyche-recovery">
    ${selection('case','Aktivní doložené trauma',opts)}
    <label>Fáze<select name="step"><option value="schedule">Naplánovat fyzický d6</option><option value="roll">Fyzický Will d100 po intervalu</option></select></label>
    ${fld('gameDay','Číslo počátečního dne pro d6 / aktuální den pro Will','','number')}
    ${fld('roll','Skutečný fyzický d6 nebo d100','','number')}
    <p>První dostupný případ: ${esc(c.trait)} · ${c.schedulePending?'čeká na d6':'Will EML '+c.willEML+'; nejdříve den '+c.plan.dueGameDay}. Po úspěšném Will s přetrvávajícím PSY je povinný nový d6.</p>
    <label><input type="checkbox" name="elapsed" value="yes" required> GM potvrzuje skutečný počátek / uplynutí příslušného herního intervalu, bez automatického posunu kalendáře</label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje fyzický hod, zvolenou postavu a autoritativní zápis</label>
    ${btn('Atomicky uložit fyzickou Psyche Recovery')}</form></section>`;
   }
  }
  if(!draft&&!seq.active){
   const recovering=availableSpellAuralRecoveries(document);
   if(recovering.length)return `<section class="panel"><h4>HMK · Aural Shock Recovery (str. 190)</h4>
    <p>V mezidobí po skutečném uplynutí nejméně jednoho dalšího herního dne: GM fyzicky hází Will d100 bez Fatigue a Impairment. S −1 Aural, CS −2, CF PSY +1 s následnou povinnou volbou traitu. Aplikace neodvozuje uplynulý den ani neháže kostky.</p>
    <form id="hmk-g04-aural-recovery">
    ${selection('characterId','Postava s doloženým Spellfire Aural Shock',recovering.map(x=>({id:x.characterId,label:x.name+' · Aural '+x.levels+' · Will EML '+x.willEML+(x.lastGameDay?' · poslední test dne '+x.lastGameDay:'')})))}
    ${fld('gameDay','Jednoznačné pořadové číslo herního dne (GM)','', 'number')}
    ${fld('roll','Fyzický Will d100 (GM)','', 'number')}
    <label><input type="checkbox" name="elapsed" value="yes" required> GM potvrzuje skutečně uplynulý příslušný herní den od vzniku Aural Shock / posledního testu</label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje všechny vstupy a zápis jediného zotavovacího výsledku</label>
    ${btn('Zapsat Aural Shock Recovery')}</form></section>`;
  }
  if(!available()&&!draft)return '';
  if(!draft){
   const eligible=combatants.filter(c=>c.hmk?.arcane?.primaryConvocation==='Pèleáhn'&&c.hmk.arcane.knownSpells?.includes('Doom Flame'));
   const options=xs=>xs.map(c=>({id:c.id,label:c.name||c.id}));
   const weapons=document.inventory.filter(w=>['main_hand','off_hand'].includes(w.slot)&&w.snapshot?.category==='weapon').map(w=>({id:w.id,label:`${combatants.find(c=>c.id===w.characterId)?.name??w.characterId}: ${w.snapshot.name}`}));
   const skills=combatants.flatMap(c=>(c.hmk?.skills??[]).filter(s=>s.name?.toLowerCase()==='melee').map(s=>({id:s.id,label:`${c.name}: ${s.name} ML${s.ml}`})));
   const mapInputs=combatants.map(c=>`<fieldset><legend>Mapa · ${esc(c.name)}</legend>
    ${fld('map_'+c.id+'_reach','Skutečný Reach (ft) této postavy','', 'number')}
    ${['foe','threatens','aware','helpless','concentrating','reachImpeded'].map(n=>
     `<label>${esc(n)} <select required name="map_${esc(c.id)}_${n}"><option value="">Potvrďte GM…</option><option value="yes">Ano</option><option value="no">Ne</option></select></label>`).join('')}
    </fieldset>`).join('');
   return `<section class="panel"><h4>G04 · prokazatelný Area source a Mounted Ride-by</h4>${notice?`<p class="notice">${esc(notice)}</p>`:''}
    <details><summary>Area Fire – Doom Flame (HMK str. 227)</summary><p>Podporuje jen jednoznačně doložený Primary Pèleáhn s naučeným Doom Flame, dokončené dvě kola koncentrace, známou výstroj a s ověřeným předchozím Evade, nebo jednou proaktivní Evade s úplnou trasou a budoucím spotřebovaným IR. Jinak bezpečně odmítne zápis.</p>
    <form id="hmk-g04-area-start">${selection('casterId','Kouzelník',options(eligible))}${fld('centerX','Doložený střed ohnivé koule X','', 'number')}${fld('centerY','Střed Y','', 'number')}${fld('seedX','Skutečný seed flame X','', 'number')}${fld('seedY','Seed flame Y','', 'number')}
    <label><input type="checkbox" name="conditions" value="yes" required> GM ověřil běžný hlasitý cant a gesture, bez Encumbrance/modifikátorů, bez přerušení, přímou LOS, skutečný seed flame a s doloženou geometrií každé Evade</label>${btn('Zahájit Area zdroj')}</form></details>
    <details><summary>Mounted shared Move → Ride-by Melee (HMK str.172)</summary><p>Control musí být již skutečně uložen jako volná akce na stejném IR jezdce. Společná trasa a fyzické hody Melee se uloží jediným commitem.</p>
    <form id="hmk-g04-mounted-start">${selection('riderId','Jezdec',options(combatants))}${selection('mountId','Kůň',options(combatants))}${selection('targetId','Protivník',options(combatants))}${selection('attackerWeaponId','Nasazená zbraň jezdce',weapons)}${selection('defenderWeaponId','Nasazená zbraň obránce',weapons)}${selection('attackerSkillId','Melee jezdce',skills)}${selection('defenderSkillId','Melee obránce',skills)}
    ${fld('route','Trasa x,y;x,y (skutečná mapa)','50,0')}${fld('previousRate','Předchozí rychlost (stop/half/full)','stop')}${fld('newRate','Rychlost nové akce (half/full)','half')}${fld('distance','Ujetá vzdálenost ft','50','number')}
    <label>Ruka jezdce<select name="attackerUsedArms"><option value="right">pravá</option><option value="left">levá</option></select></label><label>Ruka obránce<select name="defenderUsedArms"><option value="right">pravá</option><option value="left">levá</option></select></label>
    <details><summary>Jednotlivá skutečná fakta o bojišti</summary>${mapInputs}</details>
    <label><input type="checkbox" name="battlefieldVerified" value="yes" required> GM doložil kompletní prostorové pozice, dosahy, nepřítomnost neohlášené Threat, překážek, koncentrace a dalších cílů</label>${btn('Zahájit Mounted Ride-by')}</form></details>
    <details><summary>Mounted shared Move bez útoku (HMK str. 172)</summary>
    <p>Vyžaduje skutečně potvrzený Control na stejném IR. Jezdec a kůň se přesunou společně jedním zápisem. Bez útoku; ověřený Rider Impact se zachovává i do příštího kola. Pro Double Move musí být předchozí rychlost full, doložen skutečný END d10 a Personal Fatigue z uloženého profilu mounta. Zatáčení při Double Move vyžaduje skutečný Stumble AGL d100. Při neúspěchu se nepovolí zápis, dokud nejsou vyhodnocena zranění koně a pád jezdce.</p>
    <form id="hmk-g04-mounted-move-start">${selection('riderId','Jezdec',options(combatants))}${selection('mountId','Kůň',options(combatants))}
    ${fld('route','Trasa x,y;x,y (skutečná mapa)','50,0')}${fld('previousRate','Předchozí rychlost (stop/half/full/double)','stop')}${fld('newRate','Rychlost nové akce (half/full/double)','half')}${fld('distance','Ujetá vzdálenost ft','50','number')}
    <label><input type="checkbox" name="overrunRequested" value="yes"> Mounted Overrun podle HMK str.353: přes doložené menší stojící protivníky, pouze s ověřenými ZN v profilech; bez Trample</label>
    <label>Double Move: fyzický END SR d10 (jinak prázdné)<input name="enduranceD10" type="number" min="1" max="10"></label><label>Zatáčející Double Move: fyzický Stumble AGL d100 (jen při zatáčce)<input name="stumbleD100" type="number" min="1" max="100"></label>
    <details><summary>Stumble F/CF: obě Injury Sequence a Falling Routine (HMK str. 67, 354–355)</summary>
    <p><strong>VYPLŇTE POUZE PŘI STUMBLE F/CF.</strong> Všechny fyzické hody GM, bez automatického generování. Nedokončený důkaz se nikdy neuloží. Stumble se zastaví na doloženém vrcholu zatáčky. Povinné Mishaps a okamžité Morale musí být rovněž vyhodnoceny. V JSON každé položky se uvádí kind (injury-mishap / injury-morale), fyzický roll, při Morale i abe, při Mishap i ověřený mishapContext. ID odvozuje aplikace z autoritativní fronty; další událost nelze přeskočit.</p>
    ${fld('mountFallX','Doložená poloha Stumble – X (ft)','', 'number')}${fld('mountFallY','Poloha Stumble – Y','', 'number')}
    <label>Kůň: fyzický Impact d10<input name="mountImpactD10" type="number"></label><label>Kůň: náhodná ZD d10<input name="mountZoneDie" type="number"></label><label>Kůň: LD d10<input name="mountLocationDie" type="number"></label>
    <label>Kůň: Shock d100 (pouze Effective Impact nad 0)<input name="mountShockD100" type="number"></label><label>Kůň: Compound d10 (pouze při odpovídající staré ráně)<input name="mountCompoundD10" type="number"></label>
    <label>Jezdec: fyzický Impact d10<input name="riderImpactD10" type="number"></label><label>Jezdec: náhodná ZD d10<input name="riderZoneD10" type="number"></label><label>Jezdec: LD d10<input name="riderLocationD10" type="number"></label>
    <label>Falling Test<select name="riderFallTechnique"><option value="jumping">Jumping</option><option value="acrobatics">Acrobatics</option></select></label>
    <label>Falling Test: ověřené EML po ENC/Fatigue/Injury<input name="riderFallEML" type="number"></label><label>Falling Test: fyzický d100<input name="riderFallD100" type="number"></label>
    <label>Skutečný povrch dopadu<select name="riderSurface"><option value="">Potvrďte...</option><option value="rock">Skála</option><option value="paving">Dlažba</option><option value="earth">Tráva/země</option><option value="snow">Sníh/seno</option><option value="mud">Bláto</option><option value="water">Voda 6+ ft</option></select></label>
    <label>Ověřená výška pádu pro Prone (ft)<input name="riderFallHeightFt" type="number"></label><label>Ověřené místo dopadu jezdce: X<input name="riderLandingX" type="number"></label><label>Ověřené místo dopadu jezdce: Y<input name="riderLandingY" type="number"></label>
    <label>Směr dopadu pro skutečnou ochranu AV<select name="riderLandingDirection"><option value="">Potvrďte...</option><option value="front">Zepředu</option><option value="rear">Zezadu</option><option value="side">Z boku</option></select></label>
    <label>Jezdec: Shock d100 (pokud Effective Impact nad 0)<input name="riderShockD100" type="number"></label><label>Jezdec: Compound d10 (jen při staré kompatibilní ráně)<input name="riderCompoundD10" type="number"></label>
    <label>Opakované Falling Routine po CF (JSON pole, samostatné fyzické hody; jinak [])<textarea name="secondRiderFalls" rows="3" placeholder='[{"impactD10":5,"zoneD10":8,"locationD10":4,"fallingTest":{"technique":"jumping","EML":60,"d100":37},"surface":"rock","fallHeightFt":6,"landingPosition":{"x":50,"y":1},"shockD100":77}]'>[]</textarea></label>
    <label>Bezprostřední Mishap a Injury Morale koně (JSON pole s id, kind, roll, abe či mishapContext; jinak [])<textarea name="mountImmediate" rows="2">[]</textarea></label>
    <label>Bezprostřední Mishap a Injury Morale jezdce (JSON pole; jinak [])<textarea name="riderImmediate" rows="2">[]</textarea></label>
    <label><input type="checkbox" name="fallProofConfirmed" value="yes"> GM potvrdil všechny výše uvedené skutečné hody, polohy a povrch.</label>
    </details>
    <details><summary>Jednotlivá skutečná fakta o bojišti</summary>${mapInputs}</details>
    <label><input type="checkbox" name="battlefieldVerified" value="yes" required> GM ověřil celou mapu, trasu a nepřítomnost jiných povinných následků</label>${btn('Atomicky potvrdit společný Move')}</form></details></section>`;
  }
  const s=draft.stage;
  const common=`<p><strong>${esc(draft.kind==='area'?'Doom Flame Area':draft.kind==='pyre'?'Pyre III Spellfire':draft.kind==='pelahn-melee'?'Hyper Burst · druhý Melee Attack':draft.kind==='pelahn-missile'?'Hyper Burst · druhý Missile Attack':'Mounted Ride-by')} · ${esc(s.id)}</strong></p>${notice?`<p class="notice">${esc(notice)}</p>`:''}<form id="hmk-g04-cancel">${btn('Zrušit bez zápisu')}</form>`;
  if(draft.kind==='pyre'){
   const req=guidedPyreRequirement(s);
   if(req.faces)return `<section class="panel">${common}<form id="hmk-g04-pyre-die">${fld('roll',req.label,'','number')}${btn('Zapsat fyzický d'+req.faces)}</form></section>`;
   if(req.kind==='total-release-hyperburst-pending')return `<section class="panel">${common}<p>HMK str.203–204: Pyre III Total Release, Spirit ${esc(s.totalReleaseSpiritSL)}, ztráta Spirit ML ${s.totalReleaseSpiritMLLoss}. Causal CL III vytváří tříkolový Hyper Burst, ne šestikolový. Všechny fyzické hody byly zadány GM. Spirit CF se ukládá jako fyzická smrt a Shade se zachováním Raw Principle.</p><form id="hmk-g04-pyre-total-release">${btn('Atomicky založit tříkolový Hyper Burst')}</form></section>`;
   if(req.kind==='total-release-shade-pending')return `<section class="panel">${common}<p>Spirit CF: přeměna těla v obláček kouře, duše se stává Shade. Fyzická Initiative skončí; astrální akce nejsou tímto průchodem povoleny.</p><form id="hmk-g04-pyre-total-release">${btn('Atomicky zapsat Shade a Raw Principle')}</form></section>`;
   if(req.kind==='complete')return `<section class="panel">${common}<p>Pyre III: Casting ${esc(s.castingSL)}, Fatigue +${esc(s.castingFatigue)}.${s.misfireD100!==null?' Misfire '+esc(s.misfireKind)+', Psyche Stress +'+esc(s.misfirePsycheStress)+', Aural Shock +'+esc(s.misfireAuralShock)+'.':''} ${s.castingSL==='S'||s.castingSL==='CS'?'Ověřený izolovaný dřevěný předmět shoří.':'Bez účinku na předmět.'} Všechny fyzické hody jsou dokončené, po potvrzení nastane jediný autoritativní zápis.</p><form id="hmk-g04-pyre-commit">${btn('Atomicky potvrdit Pyre a dokončit Incant')}</form></section>`;
   return `<section class="panel">${common}<p class="notice">Tento Spell Misfire vyžaduje nepodporované následky podle HMK str. 203. Dokončení tahu je blokováno.</p></section>`;
  }
  if(draft.kind==='area'){
   const req=doomFlameRequirement(s);
   if(req.faces)return `<section class="panel">${common}<form id="hmk-g04-die">${fld('roll',req.label,'','number')}${btn('Zadat skutečný d'+req.faces)}</form></section>`;
   if(req.kind==='misfire-form-failure'||req.kind==='misfire-mental-trauma')return `<section class="panel">${common}<p>HMK str. 203: Casting CF, ${esc(s.misfireKind)}. Fatigue +${s.totalCastingFatigue}${s.misfirePsycheStress?'; Psyche Stress +'+s.misfirePsycheStress+' (vyžaduje následnou volbu traumatu a zotavení)':''}${s.misfireAuralShock?'; Aural Shock +'+s.misfireAuralShock+' (Weakness +'+s.misfireAuralShock*5+')':''}${s.crucialMisfire?'; Crucial Misfire: ztráta znalosti Doom Flame do dokončení Spell Research':''}. Žádný plošný zásah.</p><form id="hmk-g04-area-misfire">${btn('Ověřit oba fyzické d100 a atomicky uložit Misfire')}</form></section>`;
   if(req.kind==='total-release-hyperburst-pending')return `<section class="panel">${common}<p>HMK str.203–204: Total Release 100, Spirit ${esc(s.totalReleaseSpiritSL)}; ztráta Spirit ML ${s.totalReleaseSpiritMLLoss}. Zdroj Hyper Burstu bude uložen trvale, jeho druhé akce se musí řešit po každém IR šest kol. Spirit CF vytváří Shade bez fyzické akce; další astrální kroky řeší GM.</p><form id="hmk-g04-pelahn-source">${btn('Atomicky založit šestikolový Hyper Burst')}</form></section>`;
   if(req.kind==='misfire-unhandled')return `<section class="panel">${common}<p class="notice">Spell Misfire ${esc(s.misfireD100)} vyžaduje další povinné následky. Tento výsledek zatím nelze zapsat jako dokončený.</p></section>`;
   if(req.kind==='failed')return `<section class="panel">${common}<p>HMK str. 202: Casting F, kouzlo nemá účinek. Kouzelník získá 15 Fatigue (CL VI), žádný Impact ani Shock hod.</p><form id="hmk-g04-area-failure">${btn('Atomicky uložit neúspěšné seslání')}</form></section>`;
   return `<section class="panel">${common}<p>Vyhodnoťte každý zasažený cíl. Impact ${s.strikeImpact}; koule má poloměr ${s.radius} ft. Již uloženou Evade lze doložit z prostorového zápisu (zpravidla z předchozího kola); jedna proaktivní Evade je povolena jen s úplnou mapou, potvrzeným pohybem a budoucím spotřebovaným IR.</p>
    <form id="hmk-g04-area-commit">${s.targetIds.map(id=>{
     let av='neznámá',needs=true;try{const a=resolveVerifiedAreaProtection({inventory:document.inventory,targetId:id,method:'weighted'});av=a.areaAV;needs=s.strikeImpact>a.areaAV;}catch{}
     return `<fieldset><legend>${esc(combatants.find(c=>c.id===id)?.name??id)} · Area AV ${esc(av)}</legend><label>Evade skutečně doložena?<select required name="evade_${esc(id)}"><option value="no">Ne – GM potvrzuje žádnou Evade</option><option value="recorded">Ano – uložená Evade aktuálního/předchozího kola</option><option value="proactive">Proaktivní Evade – skutečná trasa nyní, spotřebuje příští IR (max. 1 cíl)</option></select></label><label>Proaktivní Evade: skutečná trasa x,y;x,y (prázdné pro jiné volby)<input name="path_${esc(id)}" placeholder="40,0;55,0"></label><label><input type="checkbox" name="witness_${esc(id)}" value="yes">GM přímo ověřil, že tento cíl viděl přilétající Doom Flame</label><label>U zaznamenané nebo proaktivní Evade, pokud cíl zůstane zasažen: fyzický Dodge d100<input type="number" min="1" max="100" name="dodge_${esc(id)}"></label>${needs?`<label>Skutečný Shock d100 (nevyžaduje se po proaktivním úniku mimo oblast)<input type="number" min="1" max="100" name="shock_${esc(id)}"></label>`:'<p>Bez účinného Impact: Shock d100 se neháže.</p>'}<label>Případný Compound d10 (jen je-li vyžadován) <input type="number" min="1" max="10" name="compound_${esc(id)}"></label></fieldset>`;
    }).join('')}<details><summary>Proaktivní Evade: faktická mapa GM (vyplnit jen při nové Evade)</summary><p>Všech šest okolností je povinných pro KAŽDOU postavu, pokud někdo právě pohybem uniká kouli. Souřadnice se berou výhradně z aktuální Initiative. Žádná hodnota se nehádá.</p>${combatants.map(c=>`<fieldset><legend>${esc(c.name||c.id)}</legend>${['foe','threatens','aware','helpless','concentrating','reachImpeded'].map(n=>`<label>${n}<select name="pro_map_${esc(c.id)}_${n}"><option value="">Potvrďte GM…</option><option value="yes">Ano</option><option value="no">Ne</option></select></label>`).join('')}<label>Skutečný Reach ft <input name="pro_map_${esc(c.id)}_reach" type="number" min="0" step="1"></label></fieldset>`).join('')}</details>${btn('Ověřit všechny cíle a atomicky uložit')}</form></section>`;
  }
  if(['pelahn-melee','pelahn-missile'].includes(draft.kind)){
   if(draft.phase==='end')return `<section class="panel">${common}<p>Attack a bezprostřední Injury Morale jsou potvrzeny. Teprve nyní GM fyzicky hází END d100, a celý průchod se uloží jedním checkpointem.</p><form id="hmk-g04-pelahn-${draft.kind==='pelahn-missile'?'missile':'melee'}-commit">${fld('roll','Skutečný END d100','','number')}${btn('Ověřit END a atomicky uložit')}</form></section>`;
   const r=guidedAttackRequirement(draft.attack);
   if(r.kind==='choice')return `<section class="panel">${common}<form id="hmk-g04-melee-choice">${selection('decision',r.label||r.id,r.choices.map(x=>typeof x==='string'?{id:x,label:x}:{id:x.value,label:x.label??x.value}))}${btn('Potvrdit fyzickou obranu')}</form></section>`;
   if(r.kind==='die')return `<section class="panel">${common}<form id="hmk-g04-melee-die">${fld('roll',r.label||r.id+' d'+r.faces,'','number')}${btn('Potvrdit fyzický d'+r.faces)}</form></section>`;
   if(r.kind==='complete'){
    const originalTarget=document.characters.find(c=>c.id===draft.stage.targetId)?.hmk?.combatState;
    const resolved=completeGuidedAttack({session:draft.attack,currentState:originalTarget,
     sourceSignature:draft.stage.sourceSignature,currentInventory:document.inventory});
    const due=dueInjuryMorale(resolved.strike?resolved.state:originalTarget);
    if(due.length)return `<section class="panel">${common}<p>Po Melee zásahu musí před END proběhnout bezprostřední Injury Morale; fyzický END zatím NEHÁZEJTE. Po dokončení Morale se zobrazí END.</p><form id="hmk-g04-pelahn-${draft.kind==='pelahn-missile'?'missile':'melee'}-morale">${due.map(w=>`${fld('roll_'+w.woundId,'Morale '+w.woundId+' d100','','number')}${fld('abe_'+w.woundId,'Skutečně doložená Aberrance','','number')}`).join('')}${btn('Potvrdit Morale a přejít k END')}</form></section>`;
    return `<section class="panel">${common}<p>Melee je dokončeno bez bezprostřední Injury Morale. Nyní GM fyzicky hází END d100; celý průchod se ukládá jedním checkpointem.</p><form id="hmk-g04-pelahn-${draft.kind==='pelahn-missile'?'missile':'melee'}-commit">${fld('roll','Skutečný END d100','','number')}${btn('Ověřit END a atomicky uložit')}</form></section>`;
   }
   return `<section class="panel">${common}<p>Bonus Melee vyžaduje nezpracované povinné pokračování a nelze jej zatím uložit.</p></section>`;
  }
  if(draft.phase==='morale')return `<section class="panel">${common}<p>Vážná rána vyžaduje okamžitou Injury Morale, pokud Shock již skončil.</p><form id="hmk-g04-morale">${draft.due.map(w=>`${fld('roll_'+w.woundId,'Morale '+w.woundId+' d100','','number')}${fld('abe_'+w.woundId,'Skutečně známá Aberrance útočníka (0 jen je-li doloženo)','','number')}`).join('')}${btn('Zadat Morale a atomicky dokončit')}</form></section>`;
  const r=guidedAttackRequirement(draft.attack);
  if(r.kind==='choice')return `<section class="panel">${common}<form id="hmk-g04-melee-choice">${selection('decision',r.label||r.id,r.choices.map(x=>typeof x==='string'?{id:x,label:x}:{id:x.value,label:x.label??x.value}))}${btn('Potvrdit volbu před dalším hodem')}</form></section>`;
  if(r.kind==='die')return `<section class="panel">${common}<form id="hmk-g04-melee-die">${fld('roll',r.label||r.id+' d'+r.faces,'','number')}${btn('Zadat skutečný d'+r.faces)}</form></section>`;
  if(r.kind==='complete')return `<section class="panel">${common}<form id="hmk-g04-mounted-commit">${btn('Ověřit Ride-by a atomicky uložit')}</form></section>`;
  return `<section class="panel">${common}<p class="notice">Tento Melee výsledek vyžaduje další podpůrný průvodce. Není dovoleno jej obejít ani uložit neúplný.</p></section>`;
 }
 function psycheExpressionPanel(){
  const document=take();if(draft||!document?.combatRuntime?.sequence)return '';
  const cases=availableSpellPsycheExpressions(document);
  if(!cases.length)return '';
  const open=cases.filter(c=>c.expressing),eligible=cases.filter(c=>!c.expressing);
  return `<section class="panel"><details><summary>HMK Psyche Impulse / Disorder · spouštěč a Will (str. 188)</summary>
   <p>Jde o samostatný následkový krok, nikoli o novou akci Initiative. GM označí skutečný spouštěč. Pokud postava chce potlačit projev, fyzicky hodí Will d100 včetně Fatigue; Impulse potřebuje S, Disorder CS. Při CF fyzicky hoďte ještě d6 pro trvání projevu d6 × 10 minut PO konci spouštěče. Dobrovolný projev fyzický Will nevyžaduje.</p>
   ${eligible.length?`<form id="hmk-g04-psyche-expression">
    ${selection('case','Ověřený Impulse/Disorder',eligible.map(c=>({id:c.characterId+'|'+c.trait,label:c.name+' · '+c.trait+' ('+c.intensity+')'})))}
    ${fld('trigger','Konkrétní skutečný spouštěč (GM)')}
    <label>Volba postavy<select name="mode"><option value="suppress">Zkusit potlačit: fyzický Will</option><option value="voluntary">Dobrovolně projevit bez hodu</option></select></label>
    <label>Fyzický Will d100 (jen při potlačení)<input name="roll" type="number"></label>
    <label>Fyzický d6 (jen při Will CF)<input name="d6" type="number"></label>
    <label><input type="checkbox" name="mods" value="yes" required> GM potvrzuje, že nejsou žádné další modifikátory Will; aplikace odečte evidovanou celkovou Fatigue</label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje spouštěč a skutečné fyzické hody</label>
    ${btn('Atomicky vyhodnotit projev či potlačení')}</form>`:''}
   ${open.length?`<form id="hmk-g04-psyche-expression-end">
    ${selection('case','Dosud trvající projev',open.map(c=>({id:c.characterId+'|'+c.trait,label:c.name+' · '+c.trait+' · minimálně '+c.minutesAfterTrigger+' min'})))}
    ${fld('elapsed','Minut uplynulých od skutečného konce spouštěče','','number')}
    <label><input type="checkbox" name="ended" value="yes" required> GM potvrzuje, že spouštěč skutečně skončil a požadovaná doba uplynula</label>
    <label><input type="checkbox" name="confirmed" value="yes" required> GM potvrzuje atomický zápis ukončení projevu</label>
    ${btn('Atomicky ukončit projev')}</form>`:''}
  </details></section>`;
 }
 function handleSubmit(f){if(!f?.id?.startsWith('hmk-g04-'))return false;
  try{const v=Object.fromEntries(new FormData(f)),document=take(),seq=document.combatRuntime.sequence;
   if(f.id==='hmk-g04-cancel'){clear();return true;}
   if(f.id==='hmk-g04-psyche-expression'||f.id==='hmk-g04-psyche-expression-end'){
    if(draft||v.confirmed!=='yes')throw Error('Psyche Expression: GM musí potvrdit skutečný spouštěč');
    const cases=availableSpellPsycheExpressions(document),selected=cases.find(c=>c.characterId+'|'+c.trait===v.case);
    if(!selected)throw Error('Psyche Expression: zastaralá volba nebo nedoložený trait');
    const args={document,characterId:selected.characterId,trait:selected.trait,eventId:newId(),
     gmConfirmed:true,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()};
    const out=f.id==='hmk-g04-psyche-expression'
     ?persistSpellPsycheExpression({...args,triggerDescription:v.trigger,mode:v.mode,
      d100:v.mode==='suppress'?positive(v.roll,1,100):null,
      d6:v.d6===''||v.d6==null?null:positive(v.d6,1,6),
      gmConfirmedNoOtherModifiers:v.mods==='yes'})
     :persistSpellPsycheExpressionEnd({...args,elapsedMinutes:positive(v.elapsed,10,100000),
       gmConfirmedTriggerEnded:v.ended==='yes'});
    if(!out.ok)throw Error('Psyche Expression: atomický zápis nebyl potvrzen: '+out.code);
    onCommit(out);return true;
   }
   if(f.id==='hmk-g04-psyche-choice'){
    if(draft||v.confirmed!=='yes')throw Error('Psyche volba vyžaduje potvrzeného GM');
    const pending=pendingSpellPsycheChoices(document);
    if(!pending.length)throw Error('Neexistuje splatná Psyche Trait volba');
    const choice=pending[0];
    const out=persistSpellPsycheTraitChoice({document,characterId:choice.characterId,
     sourceEventId:choice.sourceEventId,trait:v.trait,gmConfirmed:true,
     storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Psyche Trait: atomický zápis nebyl potvrzen: '+out.code);
    onCommit(out);return true;
   }
   if(f.id==='hmk-g04-psyche-manifestation'){
    if(draft||v.confirmed!=='yes'||v.elapsed!=='yes')throw Error('Psyche nástup musí výslovně potvrdit GM');
    const case0=pendingSpellPsycheManifestations(document)[0];
    if(!case0)throw Error('Žádné neprojevené doložené Psyche trauma');
    const out=persistSpellPsycheManifestation({document,characterId:case0.characterId,
     trait:case0.trait,eventId:newId(),gmConfirmed:true,gmConfirmedTenMinutesElapsed:true,
     storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Psyche nástup: atomický zápis nebyl potvrzen: '+out.code);
    onCommit(out);return true;
   }
   if(f.id==='hmk-g04-psyche-recovery'){
    if(draft||v.confirmed!=='yes'||v.elapsed!=='yes')throw Error('Psyche Recovery: GM musí potvrdit čas i fyzický hod');
    const current=availableSpellPsycheRecoveries(document);
    const selected=current.find(x=>x.characterId+'|'+x.trait===v.case);
    if(!selected)throw Error('Psyche Recovery: neplatná volba nebo neaktuální příčinný stav');
    if((v.step==='schedule')!==selected.schedulePending||!['schedule','roll'].includes(v.step))
     throw Error('Psyche Recovery: neplatné pořadí d6 a Will');
    const args={document,characterId:selected.characterId,trait:selected.trait,eventId:newId(),
     gmConfirmed:true,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()};
    const out=v.step==='schedule'
     ?persistSpellPsycheRecoverySchedule({...args,periodStartDay:positive(v.gameDay,1,999999),
        d6:positive(v.roll,1,6),gmConfirmedStartDay:true})
     :persistSpellPsycheRecoveryRoll({...args,gameDay:positive(v.gameDay,1,999999),
        d100:positive(v.roll,1,100),gmConfirmedIntervalElapsed:true});
    if(!out.ok)throw Error('Psyche Recovery: atomický zápis nebyl potvrzen: '+out.code);
    onCommit(out);return true;
   }
   if(f.id==='hmk-g04-aural-recovery'){
    if(draft||v.confirmed!=='yes'||v.elapsed!=='yes')throw Error('Aural Recovery vyžaduje potvrzeného GM a skutečně uplynulý den');
    const out=persistSpellAuralRecovery({document,characterId:v.characterId,eventId:newId(),
     gameDay:positive(v.gameDay,1,999999),d100:positive(v.roll),gmConfirmed:true,
     gmConfirmedDayElapsed:true,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Aural Shock: atomický zápis nebyl potvrzen: '+out.code);
    onCommit(out);return true;
   }
   if(f.id==='hmk-g04-pyre-start'){
    if(draft||!available()||v.confirmed!=='yes')throw Error('Pyre: ověřený Spellfire není dostupný');
    const actor=seq.order[seq.cursor];
    const stage=prepareGuidedPyre({id:newId(),document,casterId:actor,itemId:v.itemId,
     conditionsConfirmed:true,gmConfirmed:true});
    set({kind:'pyre',stage});return true;
   }
   if(f.id==='hmk-g04-pyre-die'){
    if(draft?.kind!=='pyre')throw Error('Pyre: chybí fyzický průvodce');
    const req=guidedPyreRequirement(draft.stage);
    if(!req.faces)throw Error('Pyre: v této fázi se nehází kostka');
    set({...draft,stage:submitGuidedPyreDie(draft.stage,positive(v.roll,1,req.faces))});return true;
   }
   if(f.id==='hmk-g04-pyre-total-release'){
    if(draft?.kind!=='pyre'||!['total-release-hyperburst-pending','total-release-shade-pending'].includes(draft.stage?.phase))
     throw Error('Pyre Total Release: chybí ověřený Spirit a všechny fyzické d6');
    const out=persistGuidedPyreTotalReleaseSource({stage:draft.stage,document,
     storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Pyre Total Release: atomický zápis nebyl potvrzen: '+out.code);
    draft=null;serial();onCommit(out);return true;
   }
   if(f.id==='hmk-g04-pyre-commit'){
    if(draft?.kind!=='pyre'||guidedPyreRequirement(draft.stage).kind!=='complete')throw Error('Pyre: nezpracované fyzické hody');
    const out=persistGuidedPyre({stage:draft.stage,document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Pyre: atomický zápis nebyl potvrzen: '+out.code);
    draft=null;serial();onCommit(out);return true;
   }
   if(f.id==='hmk-g04-pelahn-source'){
    if(draft?.kind!=='area'||draft.stage?.phase!=='total-release-hyperburst-pending')throw Error('Chybí skutečně dokončený Total Release');
    const out=persistPelahnTotalReleaseSource({stage:draft.stage,document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Uložení zdroje Hyper Burst nebylo potvrzeno: '+out.code);
    draft=null;serial();onCommit(out);return true;
   }
   if(f.id==='hmk-g04-pelahn-melee-start'){
    if(draft||!available()||v.confirmed!=='yes')throw Error('Nelze začít druhý Melee bez skutečné pravidlové možnosti');
    const stage=preparePelahnBonusMelee({id:newId(),document,targetId:v.targetId,
     attackerWeaponId:v.attackerWeaponId,defenderWeaponId:v.defenderWeaponId,
     attackerSkillId:v.attackerSkillId,defenderSkillId:v.defenderSkillId,
     attackerUsedArms:v.attackerUsedArms,defenderUsedArms:v.defenderUsedArms,
     sourceSignature:newId(),gmConfirmed:true});
    set({kind:'pelahn-melee',stage,attack:stage.attack,transcript:[],phase:'melee',morale:{}});return true;
   }
   if(f.id==='hmk-g04-pelahn-missile-start'){
    if(draft||!available()||v.confirmed!=='yes')throw Error('Nelze zahájit druhou Missile bez GM podmínek');
    const stage=preparePelahnBonusMissile({id:newId(),document,targetId:v.targetId,
     weaponId:v.weaponId,skillId:v.skillId,attackerUsedArms:v.attackerUsedArms,
     sourceSignature:newId(),targetMovement:v.targetMovement??'still',windforce:positive(v.windforce??'0',0,4),
     crosswind:v.crosswind==='yes',movingShooter:v.movingShooter==='yes',
     crossbowBasis:v.crossbowBasis||null,
     conditionsConfirmed:true,gmConfirmed:true});
    set({kind:'pelahn-missile',stage,attack:stage.attack,transcript:[],phase:'melee',morale:{}});return true;
   }
   if(f.id==='hmk-g04-pelahn-incant-start'){
    if(draft||!available()||v.confirmed!=='yes')throw Error('Incant spellstart není ověřený');
    const out=persistPelahnBonusIncantStart({document,spell:v.spell,storage:getStorage(),key:getStorageKey(),
     baseline:getBaseline(),ENDD100:positive(v.roll,1,100),conditionsConfirmed:true,gmConfirmed:true});
    if(!out.ok)throw Error('Incant + END není potvrzen: '+out.code);
    onCommit(out);return true;
   }
   if(f.id==='hmk-g04-pelahn-extra'){
    if(draft||!available()||v.confirmed!=='yes')throw Error('Jiný Combat průvodce nebo neověřené okolnosti');
    const args={document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline(),ENDD100:positive(v.roll,1,100),gmConfirmed:true};
    let out;
    if(v.extraAction==='pass')out=persistPelahnExtraPass({...args,extraAction:'auto'});
    else if(v.extraAction==='move'){
     const points=String(v.route).split(';').map(text=>{const pair=text.split(',');if(pair.length!==2)throw Error('Trasa Move vyžaduje x,y');return {x:real(pair[0]),y:real(pair[1])};});
     const due=awaitingPelahnBonus(seq),start=seq.spatialUnits.find(x=>x.id===due.actorId);
     const flags=['foe','threatens','aware','helpless','concentrating','reachImpeded'];
     const units=seq.spatialUnits.map(u=>{const facts={};for(const name of flags){const input=v['map_'+u.id+'_'+name];if(!['yes','no'].includes(input))throw Error('Chybí GM údaj '+u.id+'/'+name);facts[name]=input==='yes';}
      return {...u,reachFt:real(v['map_'+u.id+'_reach']),...facts};});
     const battlefield={units,barriers:seq.spatialBarriers??[]};
     out=persistPelahnExtraMove({...args,battlefield,path:[{x:start.x,y:start.y},...points],
      moveRate:v.rate,difficultSources:positive(v.difficultSources,0,8)});
    }else throw Error('Neznámá bonusová akce Hyper Burstu');
    if(!out.ok)throw Error('Atomický END / bonusový tah nebyl potvrzen: '+out.code);
    notice='';onCommit(out);return true;
   }
   if(f.id==='hmk-g04-area-start'){
    if(draft||!available())throw Error('Jiný bojový průvodce již probíhá');
    const stage=prepareDoomFlameSource({id:newId(),sequence:seq,document,casterId:v.casterId,
     center:{x:real(v.centerX),y:real(v.centerY)},seedFire:{x:real(v.seedX),y:real(v.seedY)},
     conditionsConfirmed:v.conditions==='yes',gmConfirmed:true});set({kind:'area',stage});return true;}
   if(f.id==='hmk-g04-mounted-move-start'){
    if(draft||!available()||v.battlefieldVerified!=='yes')throw Error('Chybí ověřená společná jízdní akce');
    const pts=String(v.route).split(';').map(x=>{const p=x.split(',');if(p.length!==2)throw Error('Trasa musí používat x,y');return {x:real(p[0]),y:real(p[1])}});
    const rider=document.characters.find(c=>c.id===v.riderId),mount=document.characters.find(c=>c.id===v.mountId);
    const riderUnit=seq.spatialUnits?.find(x=>x.id===v.riderId);
    if(!rider||!mount||!riderUnit)throw Error('Chybí skutečný jezdec, mount nebo jeho počáteční poloha');
    const named=['foe','threatens','aware','helpless','concentrating','reachImpeded'];
    const bf={units:seq.spatialUnits.map(u=>{
     const facts={};for(const name of named){const answer=v['map_'+u.id+'_'+name];
      if(!['yes','no'].includes(answer))throw Error('Chybí ověřené '+name+' pro '+u.id);
      facts[name]=answer==='yes';}
     return {id:u.id,x:u.x,y:u.y,reachFt:real(v['map_'+u.id+'_reach']),...facts};
    }),barriers:seq.spatialBarriers??[]};
    const states=Object.fromEntries(document.characters.filter(c=>seq.order.includes(c.id)).map(c=>[c.id,c.hmk?.combatState]));
    const control=rider.hmk?.combatState?.events?.filter(e=>e.type==='hmk-mounted-control'&&
     e.round===seq.round&&e.details?.mountId===mount.id&&e.details?.result?.controlled).at(-1);
    if(!control)throw Error('Chybí fyzicky ověřený Control v tomto kole');
    const fallEntered=String(v.mountFallX??'').trim()!=='';
    if(fallEntered&&v.fallProofConfirmed!=='yes')throw Error('F/CF: GM musí výslovně ověřit fyzické hody a polohy obou účastníků');
    const optionalDie=(key,max)=>String(v[key]??'').trim()===''?null:positive(v[key],1,max);
    const fallProof=fallEntered?{
     gmConfirmed:true,mountFallPosition:{x:real(v.mountFallX),y:real(v.mountFallY)},
     mountImpactD10:positive(v.mountImpactD10,1,10),mountZoneDie:positive(v.mountZoneDie,1,10),
     mountLocationDie:positive(v.mountLocationDie,1,10),mountShockD100:optionalDie('mountShockD100',100),
     mountCompoundD10:optionalDie('mountCompoundD10',10),
     riderImpactD10:positive(v.riderImpactD10,1,10),riderZoneD10:positive(v.riderZoneD10,1,10),
     riderLocationD10:positive(v.riderLocationD10,1,10),
     riderFallingTest:{technique:v.riderFallTechnique,EML:real(v.riderFallEML),d100:positive(v.riderFallD100,1,100)},
     riderSurface:v.riderSurface,riderFallHeightFt:real(v.riderFallHeightFt),
     riderLandingPosition:{x:real(v.riderLandingX),y:real(v.riderLandingY)},riderLandingDirection:v.riderLandingDirection,
     riderShockD100:optionalDie('riderShockD100',100),riderCompoundD10:optionalDie('riderCompoundD10',10),
     secondRiderFalls:JSON.parse(v.secondRiderFalls||'[]'),
     mountImmediate:JSON.parse(v.mountImmediate||'[]'),riderImmediate:JSON.parse(v.riderImmediate||'[]')
    }:null;
    if(!fallEntered&&(v.fallProofConfirmed==='yes'||
       ['mountImpactD10','riderImpactD10','riderFallD100'].some(n=>String(v[n]??'').trim()!=='')))
      throw Error('Neúplný důkaz pádu – žádné částečné Injury Sequence');
    const stage=prepareMountedSharedMove({id:newId(),sequence:seq,states,rider,mount,battlefield:bf,
     path:[{x:riderUnit.x,y:riderUnit.y},...pts],declaredDistanceFt:real(v.distance),
     previousRate:v.previousRate,newRate:v.newRate,effectiveMountMove:mount.hmk.verifiedMountedMove,
     mountRiderImpact:mount.hmk.verifiedRiderImpact,controlEventId:control.id,
     overrunRequested:v.overrunRequested==='yes',participants:document.characters,
     fallProof,inventory:fallProof?document.inventory:null,
     doubleMoveProof:v.newRate==='double'?{enduranceD10:positive(v.enduranceD10,1,10),
      ...(v.stumbleD100?{stumbleD100:positive(v.stumbleD100,1,100),
       stumbleEML:Math.max(0,5*mount.hmk.attributes?.agl-
        (states[mount.id].fatigue.windedness+states[mount.id].fatigue.weariness+
         states[mount.id].fatigue.otherWeakness+states[mount.id].bloodLoss.weaknessFatigue))}:{}),
      enduranceTN:mount.hmk.attributes?.end,personalFatigue:mount.hmk.verifiedMountedPersonalFatigue}:null,
     gmConfirmed:true});
    const plan=finalizeMountedSharedMove({stage,sequence:seq,states,rider,mount,battlefield:bf,participants:document.characters});
    const out=persistMountedSharedMove({stage,plan,document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Atomický Mounted Move zápis nebyl potvrzen: '+(out.code??out.reason));
    notice='';onCommit(out);return true;
   }
   if(f.id==='hmk-g04-mounted-start'){
    if(draft||!available()||v.battlefieldVerified!=='yes')throw Error('Chybí nezávislé potvrzení skutečné mapy');
    const pts=String(v.route).split(';').map(x=>{const p=x.split(',');if(p.length!==2)throw Error('Trasa musí používat x,y');return {x:real(p[0]),y:real(p[1])}});
    const riderUnit=seq.spatialUnits.find(x=>x.id===v.riderId);
    if(!riderUnit)throw Error('Chybí počáteční poloha jezdce');
    const path=[{x:riderUnit.x,y:riderUnit.y},...pts];
    const named=['foe','threatens','aware','helpless','concentrating','reachImpeded'];
    const bf={units:seq.spatialUnits.map(u=>{
     const facts={};for(const name of named){const answer=v['map_'+u.id+'_'+name];
      if(!['yes','no'].includes(answer))throw Error('Chybí explicitní GM potvrzení '+name+' pro '+u.id);
      facts[name]=answer==='yes';}
     return {id:u.id,x:u.x,y:u.y,reachFt:real(v['map_'+u.id+'_reach']),...facts};
    }),barriers:seq.spatialBarriers??[]};
    if(bf.units.find(u=>u.id===v.targetId)?.foe!==true)throw Error('Skutečný protivník musí být výslovně označen jako foe');
    const rider=document.characters.find(c=>c.id===v.riderId);
    const control=rider?.hmk?.combatState?.events?.filter(x=>x.type==='hmk-mounted-control'&&
      x.round===seq.round&&x.details?.mountId===v.mountId&&x.details?.result?.controlled).at(-1);
    if(!control)throw Error('Nelze doložit skutečný úspěšný Control pro tento mount v daném kole');
    const stage=prepareMountedRideBy({id:newId(),document,riderId:v.riderId,mountId:v.mountId,targetId:v.targetId,
     battlefield:bf,path,declaredDistanceFt:real(v.distance),previousRate:v.previousRate,newRate:v.newRate,
     controlEventId:control.id,attackerWeaponId:v.attackerWeaponId,defenderWeaponId:v.defenderWeaponId,
     attackerSkillId:v.attackerSkillId,defenderSkillId:v.defenderSkillId,
     attackerUsedArms:v.attackerUsedArms,defenderUsedArms:v.defenderUsedArms,
     sourceSignature:newId(),gmConfirmed:true});
    set({kind:'mounted',stage,attack:stage.attack,transcript:[],phase:'melee',morale:{}});return true;}
   if(!draft)throw Error('Žádný G04 průvodce právě neběží');
   if(js(document)!==draft.stage.documentWitness)throw Error('Při zadávání fyzických hodů se změnil trvalý dokument');
   if(f.id==='hmk-g04-die'){
    const req=doomFlameRequirement(draft.stage);
    set({...draft,stage:submitDoomFlameDie(draft.stage,positive(v.roll,1,req.faces))});return true;}
   if(f.id==='hmk-g04-area-misfire'){
    if(draft.kind!=='area'||!['misfire-form-failure','misfire-mental-trauma'].includes(draft.stage.phase))throw Error('Chybí dva skutečné fyzické d100 a doložený Misfire');
    const out=persistDoomFlameFormMisfire({stage:draft.stage,document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Atomický Spell Misfire nebyl potvrzen: '+(out.code??out.reason));
    draft=null;serial();onCommit(out);return true;
   }
   if(f.id==='hmk-g04-area-failure'){
    if(draft.kind!=='area'||draft.stage.phase!=='failed')throw Error('Chybí fyzicky doložené F seslání');
    const out=persistFailedDoomFlame({stage:draft.stage,document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Atomický Casting F nebyl potvrzen: '+(out.code??out.reason));
    draft=null;serial();onCommit(out);return true;
   }
   if(f.id==='hmk-g04-area-commit'){
    if(draft.kind!=='area'||draft.stage.phase!=='ready')throw Error('Chybí kompletní Area zdroj');
    const proactiveIds=draft.stage.targetIds.filter(id=>v['evade_'+id]==='proactive');
    if(proactiveIds.length>1)throw Error('Více současných proaktivních Evade vyžaduje další ověřený pohybový průvodce');
    const proactiveEvades={};let affected=new Set(draft.stage.targetIds);
    if(proactiveIds.length){
     const id=proactiveIds[0],path=String(v['path_'+id]??'').split(';').map(t=>{
      const xy=t.split(',');if(xy.length!==2)throw Error('Evade trasa musí používat x,y');
      return {x:real(xy[0]),y:real(xy[1])};});
     const flags=['foe','threatens','aware','helpless','concentrating','reachImpeded'];
     const units=seq.spatialUnits.map(u=>{
      const facts={};for(const name of flags){
       const val=v['pro_map_'+u.id+'_'+name];if(!['yes','no'].includes(val))throw Error('Chybí mapa pro '+u.id+' / '+name);
       facts[name]=val==='yes';}
      return {...u,...facts,reachFt:positive(v['pro_map_'+u.id+'_reach'],0,1000)};});
     const battlefield={units,barriers:seq.spatialBarriers??[]};
     const request={path,battlefield,witnessedProjectile:v['witness_'+id]==='yes'};
     const preflight=previewProactiveDoomFlameEvade({stage:draft.stage,document,targetId:id,...request,gmConfirmed:true});
     proactiveEvades[id]=request;
     if(!preflight.insideBlastAfterMove)affected.delete(id);
    }
    const rolls={},declined=[];
    for(const id of draft.stage.targetIds){
     const mode=v['evade_'+id];
     if(!['no','recorded','proactive'].includes(mode))throw Error('Area: neznámá Evade volba pro '+id);
     if(!affected.has(id))continue;
     if(mode==='no')declined.push(id);
     const a=resolveVerifiedAreaProtection({inventory:document.inventory,targetId:id,method:'weighted'});
     rolls[id]={shockD100:draft.stage.strikeImpact>a.areaAV?positive(v['shock_'+id]):null,
      dodgeD100:mode==='no'?null:positive(v['dodge_'+id]),
      compoundD10:v['compound_'+id]?positive(v['compound_'+id],1,10):null};
    }
    const arguments0={stage:draft.stage,document,rollsByTarget:rolls,noEvadeTargetIds:declined,
     proactiveEvades:Object.keys(proactiveEvades).length?proactiveEvades:null};
    const plan=resolveDoomFlameCohort(arguments0);
    const out=persistGuidedDoomFlame({...arguments0,plan,
     storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Atomický Area zápis nebyl potvrzen: '+(out.code??out.reason));
    draft=null;serial();onCommit(out);return true;}
   if(f.id==='hmk-g04-melee-choice'){
    const r=guidedAttackRequirement(draft.attack);
    const ev={kind:r.kind,id:r.id,value:v.decision};
    set({...draft,transcript:[...draft.transcript,ev],attack:chooseGuidedAttack(draft.attack,v.decision)});return true;}
   if(f.id==='hmk-g04-melee-die'){
    const r=guidedAttackRequirement(draft.attack),value=positive(v.roll,1,r.faces);
    const ev={kind:r.kind,id:r.id,value};
    set({...draft,transcript:[...draft.transcript,ev],attack:submitGuidedAttackDie(draft.attack,value)});return true;}
   if(['hmk-g04-pelahn-melee-commit','hmk-g04-pelahn-melee-morale','hmk-g04-pelahn-missile-commit','hmk-g04-pelahn-missile-morale'].includes(f.id)){
    if(!['pelahn-melee','pelahn-missile'].includes(draft?.kind)||guidedAttackRequirement(draft.attack).kind!=='complete')
     throw Error('Chybí dokončená druhá Melee akce');
    const originalTarget=document.characters.find(c=>c.id===draft.stage.targetId)?.hmk?.combatState;
    const resolved=completeGuidedAttack({session:draft.attack,currentState:originalTarget,
     sourceSignature:draft.stage.sourceSignature,currentInventory:document.inventory});
    const due=dueInjuryMorale(resolved.strike?resolved.state:originalTarget);
    if(f.id.endsWith('-morale')){
     if(!due.length||draft.phase!=='melee')throw Error('Morale není splatná nebo již byla potvrzena');
     const morale={};for(const w of due)morale[w.woundId]={roll:positive(v['roll_'+w.woundId]),
      aberrance:positive(v['abe_'+w.woundId],0,200)};
     set({...draft,phase:'end',morale});return true;
    }
    if(due.length&&draft.phase!=='end')throw Error('Před fyzickým END musí být dokončena Injury Morale');
    if(!due.length&&draft.phase!=='melee')throw Error('Nepovolené pořadí fyzického END');
    const END=positive(v.roll,1,100);
    const out=(draft.kind==='pelahn-missile'?persistPelahnExtraMissile:persistPelahnExtraMelee)({stage:draft.stage,attackSession:draft.attack,
     transcript:draft.transcript,document,ENDD100:END,injuryMoraleRolls:draft.morale??{},
     gmConfirmed:true,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('END / druhý Melee se nepodařilo atomicky uložit: '+out.code);
    draft=null;notice='';serial();onCommit(out);return true;
   }
   if(f.id==='hmk-g04-mounted-commit'||f.id==='hmk-g04-morale'){
    let morale=draft.morale??{};
    if(f.id==='hmk-g04-morale'){
     morale={};for(const w of draft.due){morale[w.woundId]={roll:positive(v['roll_'+w.woundId]),
      aberrance:positive(v['abe_'+w.woundId],0,200)};}
    }else{
     const resolved=completeGuidedAttack({session:draft.attack,
      currentState:document.characters.find(x=>x.id===draft.stage.targetId).hmk.combatState,
      sourceSignature:draft.stage.sourceSignature,currentInventory:document.inventory});
     const originalTarget=document.characters.find(c=>c.id===draft.stage.targetId).hmk.combatState;
     const due=dueInjuryMorale(resolved.strike?resolved.state:originalTarget);
     if(due.length){set({...draft,phase:'morale',due});return true;}
    }
    const plan=finalizeMountedRideBy({stage:draft.stage,attackSession:draft.attack,transcript:draft.transcript,
     document,injuryMoraleRolls:morale});
    const out=persistMountedRideBy({stage:draft.stage,attackSession:draft.attack,transcript:draft.transcript,injuryMoraleRolls:morale,
     plan,document,storage:getStorage(),key:getStorageKey(),baseline:getBaseline()});
    if(!out.ok)throw Error('Atomický Mounted zápis nebyl potvrzen: '+(out.code??out.reason));
    draft=null;serial();onCommit(out);return true;}
   throw Error('Neznámý krok řízené akce');
  }catch(e){notice=e.message;onChange();return true;}
 }
 return {panel,psycheExpressionPanel,handleSubmit,hasActive:()=>!!draft,clear,restore,getNotice:()=>notice};
}
