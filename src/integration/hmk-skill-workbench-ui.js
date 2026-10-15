/** Purpose-built Skill System UI only; no global CSS or Combat editor. */
import {availableMasteries} from './hmk-skill-test-engine.js';
import {skillConditionAvailability} from './hmk-skill-context.js';
import {skillTraumaAvailability} from './hmk-skill-trauma.js';
import {pendingCombatConsequences} from './hmk-skill-consequence-resolution.js';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function masteries(character,name='primary',selected=''){const entries=availableMasteries(character);return `<select name="${name}" required>${entries.map(x=>`<option value="${E(x.name)}" ${x.name===selected?'selected':''}>${E(x.name)} · ML ${x.ml} · Index ${x.index}</option>`).join('')}</select>`;}
function optional(character,name){return `<select name="${name}"><option value="">— bez sekundární dovednosti —</option>${availableMasteries(character).map(x=>`<option value="${E(x.name)}">${E(x.name)} · ML ${x.ml}</option>`).join('')}</select>`;}
function helpChoice(){return '<p class="tiny muted">Vlastní číslo d100/d10 = doložený hod. Prázdné pole = softwarový hod. Fatigue a ENC se při vyhodnocení znovu načtou ze skutečného stavu postavy; pokud nejsou ověřené, je nutná výslovná hodnota nebo rozhodnutí GM. GM bonusy v ostatních polích nesmějí podruhé obsahovat stejné postihy.</p>';}
function conditionControls(actor,inventory,primaryName,prefix=''){
 const availability=skillConditionAvailability({actor,inventory,name:primaryName});
 const f=availability.fatigue,e=availability.enc,notApplicable=availability.applicability.kind==='not-applicable';
 const textF=f.ready?'Potvrzená Fatigue '+f.totals.total+' → '+f.modifier:'Nedoložená Fatigue: '+f.reason;
 const textE=notApplicable?'ENC se na tuto dovednost/atribut nevztahuje':e.ready?'Upravené ENC '+e.modifiedENC+' → '+e.modifier:'ENC nelze automaticky použít: '+e.reason;
 const p=k=>prefix+k;
 return `<fieldset class="hsk-condition"><legend>Stav postavy · ${E(actor?.name||'protivník')}</legend><p class="tiny muted" data-condition-summary="${prefix||'primary'}">${E(textF)}. ${E(textE)}.</p>
 <div class="hsk-form-grid"><label>Fatigue · zdroj<select name="${p('fatigueMode')}"><option value="auto" ${f.ready?'selected':''}>Automaticky z Combat</option><option value="manual" ${!f.ready?'selected':''}>Potvrzená hodnota GM</option><option value="omit">GM potvrzuje: nepoužít</option></select></label>
 <label>Fatigue celkem · GM (0, 5, 10…)<input type="number" name="${p('manualFatigue')}" min="0" max="1000" step="5" placeholder="Vyžadováno při ruční volbě"></label>
 <label>ENC · zdroj<select name="${p('encMode')}"><option value="auto" ${e.ready?'selected':''}>Automaticky z inventáře</option><option value="manual" ${!e.ready?'selected':''}>Ověřené ENC od GM</option><option value="omit">GM potvrzuje: nepoužít</option></select></label>
 <label>Upravené ENC · GM (0, 5, 10…)<input type="number" name="${p('manualENC')}" min="0" max="500" step="5" placeholder="Vyžadováno při ruční volbě"></label>
 <label>Poloha (pro výpočet ENC)<select name="${p('mounted')}"><option value="foot">Pěšky</option><option value="mounted">Jezdec · potvrzeno GM</option></select></label></div>
 <p class="tiny muted">Při změně vybavení, únavy nebo cílové dovednosti se příslušné hodnoty znovu ověří při samotném hodu. Ruční pole nejsou předvyplněna nulou.</p></fieldset>`;
}
function traumaControls(actor,inventory,skill,prefix=''){
 const x=skillTraumaAvailability({actor,inventory,name:skill});
 const p=k=>prefix+k;
 const choice=(key,ready,label)=>`<label>${label} · zdroj<select name="${p(key+'Mode')}"><option value="auto" ${ready?'selected':''}>Automaticky z HMK</option><option value="manual" ${!ready?'selected':''}>Potvrzená hodnota GM</option><option value="omit">GM rozhodl: nepoužít</option></select></label>`;
 return `<details class="hsk-trauma" open><summary>Shock · zranění · Bulk · ochrana smyslů (${E(actor?.name||'postava')})</summary>
 <p class="tiny muted" data-trauma-summary="${prefix||'primary'}">${E(x.shock.ready?'Shock: '+x.shock.value:'Shock: '+x.shock.reason)}; ${E(x.injury.ready?'Zranění: bez potvrzené rány':x.injury.reason)}; ${E(x.bulk.ready?'Bulk '+x.bulk.modifier:x.bulk.reason)}; ${E(x.perception.ready?'Helma/PER '+x.perception.modifier:x.perception.reason)}</p>
 <div class="hsk-form-grid">
 <label>Shock · oprávnění ke Skill Testu<select name="${p('shockMode')}"><option value="auto" ${x.shock.ready?'selected':''}>Potvrzený Combat State</option><option value="" ${!x.shock.ready?'selected':''}>— zvolte rozhodnutí GM —</option><option value="gm-ready">GM potvrzuje: postava může jednat</option></select></label>
 ${choice('injury',x.injury.ready||(x.shock.ready&&!!x.impairedKind),'Zranění / Impairment')}
 <label>Impairment · GM (0, 5, 10…)<input type="number" name="${p('manualInjury')}" min="0" max="1000" step="5" placeholder="Neznámá hodnota nesmí být 0"></label>
 <label>Aktuální kolo · potvrzuje GM<input type="number" name="${p('currentRound')}" min="1" max="9999" step="1" placeholder="Nutné u aktivní rány"></label>
 <label>Použité ruce při testu<select name="${p('usedArm')}"><option value="">— vyberte —</option><option value="left">Levá</option><option value="right">Pravá</option><option value="both">Obě</option><option value="none">Žádná</option></select></label>
 ${choice('bulk',x.bulk.ready,'Bulk · zbroj / vrstvy')}
 <label>Bulk postih · GM (0, 5, 10…)<input type="number" name="${p('manualBulk')}" min="0" max="1000" step="5" placeholder="Vždy kladná velikost postihu"></label>
 ${choice('perception',x.perception.ready,'Zbroj · Perception')}
 <label>Helma/PER postih · GM (0, 5, 10…)<input type="number" name="${p('manualPerception')}" min="0" max="1000" step="5" placeholder="Vždy kladná velikost postihu"></label>
 </div><label class="hsk-check"><input type="checkbox" name="${p('bulkAssessed')}" value="yes"> GM výslovně zkontroloval vrstvy tištěného zbrojního kompletu (p.117)</label>
 <fieldset class="hsk-bulk-zones"><legend>Ověřené zóny s porušením vrstvení (Bulk −5 za zónu)</legend>${['head','arms','torso','legs'].map(z=>`<label><input type="checkbox" name="${p('bulkZone')}" value="${z}"> ${z}</label>`).join('')}</fieldset>
 <p class="tiny muted">U zranění je pro automatiku povinné doložené kolo a zapojená ruka. Neznámý stav nesmí znamenat nulu. INC/UNC/KIA nelze potvrzením GM obejít. Nepoužitelná oblast vyvolá automatické CF bez d100. Fumble/Stumble při bojovém CF se vyhodnotí pouze v původním Combat průvodci.</p></details>`;
}
function activityContext(){return `<label>Kontext běžného Skill Testu<select name="actionContext"><option value="general">Mimo bojový Attack/Defence resolver</option><option value="combat">Bojový útok / obrana – přejít do Combat (bez druhého d100)</option></select></label><p class="tiny muted">Zde se nesmí znovu házet na útok nebo obranu. Melee, Missile, Block, Dodge, Counterstrike, Press, Trip a Grab se vyhodnocují jako jediná bojová událost v Combat, včetně jejich Mishaps.</p>`;}
export function sheetCombatActionHTML(character,roster){
 const rivals=roster.filter(c=>c.id!==character.id);
 return `<section class="panel wide hmk-sheet-combat-action"><h3>Konkrétní bojová akce → Mishap</h3><p class="muted">Napojení na jediný původní Combat průvodce podle HMK str.161,163–166. Akce, obrana i všechny fyzické hody proběhnou výhradně tam; Skill Workbench nevytvoří duplicitní hod ani Combat stav.</p><form id="hmk-sheet-combat-action-form"><div class="hsk-form-grid"><label>Akce<select name="kind"><option value="melee">Melee Strike</option><option value="missile">Missile / Volley</option><option value="press">Press – deklarovat před útokem</option><option value="trip">Trip – deklarovat před útokem</option><option value="grab">Grab – deklarovat před útokem</option></select></label><label>Protivník / cíl<select name="targetId" required><option value="">Vyberte skutečný cíl…</option>${rivals.map(c=>`<option value="${E(c.id)}">${E(c.name)}</option>`).join('')}</select></label></div><button type="submit" ${rivals.length?'':'disabled'}>Připravit v Combat – bez hodu</button></form><p class="tiny muted">Připravení vyžaduje potvrzené střetnutí, aktivní Initiative, vlastní tah a žádnou dřívější splatnou událost. Zbraň, použitou ruku, obranu (Block/Dodge/Counterstrike/Ignore) a další okolnosti pak ověří původní průvodce. Příprava nic nezapíše.</p></section>`;
}
function pendingCombatPanel(actor){const p=pendingCombatConsequences(actor);if(p.state==='unknown')return `<p class="tiny muted">Bojové následky: chybí potvrzený bojový stav, nelze tvrdit, že nic nečeká.</p>`;if(p.state==='invalid')return `<p class="notice error">Neplatný Combat State: ${E(p.reason)}</p>`;return p.events.length?`<aside class="notice"><strong>Povinné následky již evidované v Combat</strong><ul>${p.events.map(x=>`<li>${E(x.label)} · ${E(x.id)}</li>`).join('')}</ul><button type="button" class="secondary" data-nav="encounter">Otevřít původní Combat procedury</button><p class="tiny">Pouze odkazy na autoritativní události; Workbench je nepřepočítává ani nezdvojuje.</p></aside>`:'<p class="tiny muted">V potvrzeném Combat State nejsou evidovány nevyřízené Injury Mishaps, Morale ani Shock Followups.</p>'; }
function helpers(actors){return Array.from({length:4},(_,i)=>`<label>Pomocník ${i+1}<select name="assist${i+1}"><option value="">Bez pomocníka</option>${actors.map(c=>`<option value="${E(c.id)}">${E(c.name)}</option>`).join('')}</select></label>`).join('');}
export function skillWorkbenchHTML(character,roster,inventory=[]){
 const entries=availableMasteries(character);const allies=roster.filter(x=>x.id!==character.id);const first=allies[0];
 const initialMastery=entries[0]?.name||'';const opponent=first?masteries(first,'opponentSkill'):'';
 const own=masteries(character,'primary');
 return `<section class="panel wide hmk-skill-workbench" id="hmk-skill-workbench"><div class="topline"><div><h3>Skill System · HMK v1.2, str. 60–62</h3><p class="muted">Aktér: <strong>${E(character.name)}</strong>. Vstupní ML se načítá z aktuálního Character Sheet; záznamy testů se ukládají do jeho stávajícího deníku.</p></div></div>
 ${entries.length?`<div class="hsk-workbench-grid">
 <section class="hsk-test-card"><h4>Success Test + Success Value + Victory Stars</h4><form id="skill-test-form">
 <div class="hsk-form-grid"><label>Primární Skill / Attribute ${own}</label><label>GM součet bonusů a postihů<input name="gmModifier" type="number" step="1" value="0" required></label>
 <label>1. Secondary Modifier ${optional(character,'secondary1')}</label><label>2. Secondary Modifier ${optional(character,'secondary2')}</label>
 <label>d100 (nepovinné)<input name="roll" type="number" min="1" max="100" step="1" placeholder="Softwarový hod"></label><label>SV – doložená zvláštní úprava<input name="svExtra" type="number" step="1" value="0"></label></div>
 <details><summary>Assistance · až 4 pomocníci</summary><div class="hsk-form-grid">${helpers(allies)}</div><p class="tiny">Každý pomocník musí mít zvolenou stejnou dovednost aspoň na polovině ML aktéra. Bonus = Index pomocníka, celkově nejvýše +10. Povoluje-li činnost menší počet pomocníků, ponechte ostatní nevybrané.</p></details>
 ${conditionControls(character,inventory,initialMastery)}
 ${traumaControls(character,inventory,initialMastery)}
 ${activityContext()}
 <label class="hsk-check"><input name="exceptional" type="checkbox" value="yes"> Výslovně doložená výjimka z běžného limitu EML 05–95</label>
 <button type="submit">Hodit / vyhodnotit d100</button></form></section>
 <section class="hsk-test-card"><h4>Opposed Success Test · Victory Stars</h4><form id="skill-opposed-form"><div class="hsk-form-grid"><label>Skill / Attribute aktéra ${masteries(character,'primary')}</label>
 <label>Protivník<select name="opponentId" required>${allies.map(x=>`<option value="${E(x.id)}">${E(x.name)}</option>`).join('')}</select></label>
 <label>Skill / Attribute protivníka <span data-opponent-skill-wrap>${opponent||'<span class="muted">Není druhá postava</span>'}</span></label>
 <label>GM modifikátor aktéra<input name="gmA" type="number" value="0" required></label><label>GM modifikátor protivníka<input name="gmB" type="number" value="0" required></label>
 <label>d100 aktéra (nepovinné)<input name="rollA" type="number" min="1" max="100" step="1" placeholder="Softwarový hod"></label><label>d100 protivníka (nepovinné)<input name="rollB" type="number" min="1" max="100" step="1" placeholder="Softwarový hod"></label></div>
 ${conditionControls(character,inventory,initialMastery,'a')}
 ${traumaControls(character,inventory,initialMastery,'a')}
 ${first?conditionControls(first,inventory,availableMasteries(first)[0]?.name||'','b'): ''}
 ${first?traumaControls(first,inventory,availableMasteries(first)[0]?.name||'','b'): ''}
 ${activityContext()}
 <label class="hsk-check"><input name="breakTie" type="checkbox" value="yes"> Pravidlo vyžaduje rozhodnout shodu úspěchů (p.61)</label>
 <button type="submit" ${first?'':'disabled'}>Vyhodnotit oba testy</button></form></section>
 <section class="hsk-test-card"><h4>Secondary Mastery · d10</h4><form id="skill-secondary-form"><div class="hsk-form-grid"><label>Sekundární dovednost ${masteries(character,'secondary')}</label><label>Úprava TN d10<input name="tnAdjust" type="number" value="0" required></label><label>d10 (nepovinné)<input name="roll" type="number" min="1" max="10" step="1" placeholder="Softwarový hod"></label></div><button type="submit">Hodit Secondary Roll</button></form><p class="tiny muted">Pro Secondary Modifier se používá tabulka indexů −25 až +25; výše uvedený d10 je samostatný Secondary Roll. Efekt úspěchu d10 záleží na konkrétní činnosti.</p></section>
 <section class="hsk-test-card"><h4>Assistance · kontrola způsobilosti</h4><form id="skill-assistance-form"><label>Hlavní Skill / Attribute ${masteries(character,'primary')}</label><div class="hsk-form-grid">${helpers(allies)}</div><button type="submit">Spočítat EML bonus</button></form><p class="tiny muted">Kontrola žádnou kostkou nehází ani sama nezapisuje bonus do Combat.</p></section>
 </div>${pendingCombatPanel(character)}<output id="skill-workbench-result" role="status" aria-live="polite" class="hsk-workbench-result">Vyberte test; výsledky se zobrazí zde. Uložený hod je zapsán do osobního deníku.</output>
 ${helpChoice()}`:'<p class="notice">Postava dosud nemá doložené Skills/Attributes s ML &gt; 0. Doplňte Character Creation.</p>'}
 </section>`;
}
