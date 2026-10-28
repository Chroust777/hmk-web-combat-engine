/** Native, selectable text and semantic tables, without images. All source data
 * is extracted from the HMK 1.2 PDF supplied by the user (printed pp.351–401).
 * The source-page layout retains exact source block positions; generated numeric
 * values are never fabricated or inferred from source prose. */
import {animalAnatomyTable566,ANIMAL_WEAPON_DICE_566} from './hmk-bestiary-anatomy-566.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const display=v=>v===null||v===undefined?'—':String(v);
export function renderFullCreatureStats565(entry){
 if(!entry)return '';
 const a=entry.attributes||{},skills=entry.skills||{},c=entry.combat||{},weapons=entry.weapons||[];
 const data=(pairs,label)=>pairs.length?`<section class="hmk-beast-mini-table"><h5>${escape(label)}</h5><table class="hmk-native-data-table"><tbody>${pairs.map(([k,v])=>`<tr><th scope="row">${escape(k.toUpperCase())}</th><td>${escape(display(v))}</td></tr>`).join('')}</tbody></table></section>`:`<section><h5>${escape(label)}</h5><p class="hc-hint">Hodnoty nejsou v dosavadním strojovém profilu doloženy; viz textové tabulky na uvedené straně.</p></section>`;
 const combat=[['Dodge',c.dodge],['Press',c.press],['TAR',c.tar],['Shock',c.shock],['Body location table',c.bodyTable],['Movement',entry.move],['Flying',entry.fly],['Size',entry.size],['Weight lb',entry.weightLb]].filter(([,v])=>v!==undefined);
 const av=c.av?['b','e','p','f'].map(k=>[k,c.av[k]]):[];
 const anatomy=animalAnatomyTable566(c.bodyTable);
 const anatomyHTML=anatomy?`<section><h5>Body Location · tabulka ${escape(anatomy.id)} · HMK str. ${anatomy.sourcePage}</h5><div class="catalog-scroll"><table class="hmk-native-data-table"><thead><tr><th>ZN</th><th>LN (d10)</th><th>Lokalita</th><th>SHK</th></tr></thead><tbody>${anatomy.rows.map(r=>`<tr><td>${r.znMin}–${r.znMax}</td><td>${r.lnMin}–${r.lnMax}</td><td>${escape(r.name)} (${r.id})</td><td>${r.shock}</td></tr>`).join('')}</tbody></table></div><p class="hc-hint">Krvácení a amputace závisejí na zvláštních symbolech původní tabulky; tento přepis je zatím nepoužívá automaticky.</p></section>`:'';
 const weaponDice=ANIMAL_WEAPON_DICE_566[entry.id];
 const attacks=weapons.length?`<section><h5>Přirozené útoky a zbraně</h5><table class="hmk-native-data-table"><thead><tr><th>Zbraň</th><th>Attack ML</th><th>Defence ML</th><th>Impact</th><th>ZD / RCH</th><th>Zvláštní pravidlo</th></tr></thead><tbody>${weapons.map(w=>`<tr><td>${escape(w.name)}</td><td>${escape(display(w.attack))}</td><td>${escape(display(w.defence))}</td><td>${escape(display(w.impact))}</td><td>${escape(display(weaponDice?.[weapons.indexOf(w)]?.zd))} / ${escape(display(weaponDice?.[weapons.indexOf(w)]?.rch))}</td><td>${escape(display(w.special))}</td></tr>`).join('')}</tbody></table></section>`:'<p class="hc-hint">Přirozený útok není v současném datovém profilu ověřen. Zkontroluj pravidla tvora; nepoužívej domyšlenou zbraň.</p>';
 return `<div class="hmk-bestiary-native-stats"><div class="hmk-bestiary-native-grid">${data(Object.entries(a),'Atributy')}${data(Object.entries(skills),'Dovednosti a schopnosti')}${data(combat,'Boj a tělesné hodnoty')}${data(av,'Přirozená ochrana · b/e/p/f')}</div><details class="hmk-beast-subdetails"><summary>Útoky a zvláštní pravidla</summary>${attacks}</details>${anatomyHTML?`<details class="hmk-beast-subdetails"><summary>Anatomické lokality · tabulka ${escape(anatomy.id)}</summary>${anatomyHTML}</details>`:''}</div>`;
}
