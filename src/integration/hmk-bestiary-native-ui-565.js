/** Native, selectable text and semantic tables, without images. All source data
 * is extracted from the HMK 1.2 PDF supplied by the user (printed pp.351–401).
 * The source-page layout retains exact source block positions; generated numeric
 * values are never fabricated or inferred from source prose. */
import {bestiaryRulePage565} from './hmk-bestiary-reference-565.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const display=v=>v===null||v===undefined?'—':String(v);
export function renderFullCreatureStats565(entry){
 if(!entry)return '';
 const a=entry.attributes||{},skills=entry.skills||{},c=entry.combat||{},weapons=entry.weapons||[];
 const data=(pairs,label)=>pairs.length?`<section><h5>${escape(label)}</h5><table class="hmk-native-data-table"><tbody>${pairs.map(([k,v])=>`<tr><th scope="row">${escape(k.toUpperCase())}</th><td>${escape(display(v))}</td></tr>`).join('')}</tbody></table></section>`:`<section><h5>${escape(label)}</h5><p class="hc-hint">Hodnoty nejsou v dosavadním strojovém profilu doloženy; viz textové tabulky na uvedené straně.</p></section>`;
 const combat=[['Dodge',c.dodge],['Press',c.press],['TAR',c.tar],['Shock',c.shock],['Body location table',c.bodyTable],['Movement',entry.move],['Flying',entry.fly],['Size',entry.size],['Weight lb',entry.weightLb]].filter(([,v])=>v!==undefined);
 const av=c.av?['b','e','p','f'].map(k=>[k,c.av[k]]):[];
 const attacks=weapons.length?`<section><h5>Přirozené útoky a zbraně</h5><table class="hmk-native-data-table"><thead><tr><th>Zbraň</th><th>Attack ML</th><th>Defence ML</th><th>Impact</th><th>Zvláštní pravidlo</th></tr></thead><tbody>${weapons.map(w=>`<tr><td>${escape(w.name)}</td><td>${escape(display(w.attack))}</td><td>${escape(display(w.defence))}</td><td>${escape(display(w.impact))}</td><td>${escape(display(w.special))}</td></tr>`).join('')}</tbody></table></section>`:'<p class="hc-hint">Přirozený útok není v současném datovém profilu ověřen. Zkontroluj pravidla tvora; nepoužívej domyšlenou zbraň.</p>';
 return `<div class="hmk-bestiary-native-stats"><div class="hmk-bestiary-native-grid">${data(Object.entries(a),'Atributy')}${data(Object.entries(skills),'Dovednosti a schopnosti')}${data(combat,'Boj a tělesné hodnoty')}${data(av,'Přirozená ochrana · b/e/p/f')}</div>${attacks}</div>`;
}
export function renderPrintedBestiaryPage565(page){
 const p=bestiaryRulePage565(page);if(!p)return '<p>Pravidlová strana není dostupná.</p>';
 // A selectable true-text reconstruction; x/y offsets come from printed PDF.
 const blocks=p.blocks.map(b=>`<div class="hmk-printed-block" style="left:${b.x}px;top:${b.y}px;width:${Math.min(612-b.x,Math.max(20,b.w+15))}px;font-size:${b.size}px">${escape(b.text)}</div>`).join('');
 const tables=p.tables.map((t,i)=>`<section class="hmk-native-source-table"><h5>Tabulka ${i+1} · HMK str. ${p.page}</h5><div class="hmk-native-table-scroll"><table><tbody>${t.rows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('');
 return `<div class="hmk-bestiary-page-text"><p><strong>HMK 1.2 · strana ${p.page}</strong> · výběrový text z PDF, bez obrázku. Tabulky jsou níže také v samostatném HTML formátu.</p><div class="hmk-printed-scroll"><div class="hmk-printed-sheet" role="document" aria-label="HMK strana ${p.page}">${blocks}</div></div>${tables?`<details><summary>Datové tabulky z této strany (${p.tables.length})</summary><p class="hc-hint">Automaticky rozpoznané buňky pro čtení a kopírování. Pro pravidlové vyhodnocení je rozhodující úplné textové rozložení výše; rozpoznávání složitých tabulek nemusí zachytit všechny sloupce.</p>${tables}</details>`:'<p class="hc-hint">Na této straně nebyla automaticky rozpoznána samostatná tabulka. Úplný výběrový text se nachází výše.</p>'}</div>`;
}
