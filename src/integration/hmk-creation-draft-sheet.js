/** Read-only, safe partial journal for an unfinished HMK character.
 * An incomplete draft may have no Age Group or Attributes: never pass it
 * through completed-character calculations, Combat, or equipment preflight.
 */
import {creationOf} from './hmk-character-creation.js';
const E=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function draftCharacterJournalHTML(character,logs=[]){
 if(!character?.hmk?.creation)throw Error('Draft journal needs a character under guided creation');
 const h=character.hmk,cr=creationOf(character),name=E(character.name),step=cr.step;
 const notes=logs.filter(e=>e?.characterId===character.id).map(l=>`<div class="list-row"><div><b>${E(l.title)}</b><p>${E(l.body)}</p></div><div class="actions"><button class="secondary" data-edit-log="${E(l.id)}">Upravit</button><button class="danger" data-delete-log="${E(l.id)}">Smazat</button></div></div>`).join('');
 return `<div class="topline"><h2>Rozpracovaný deník: ${name}</h2><button type="button" class="secondary" data-action="go-characters">← Registr</button><button type="button" data-action="creation-open">Pokračovat v tvorbě · krok ${step}/14</button><button type="button" class="secondary" data-action="new-character">+ Nová postava</button></div>
 <section class="panel wide"><h3>Údaje zatím nejsou dokončené</h3><p>Postava je uložená v registru. Některé Attributes, Skills, Standing a Combat údaje ještě nejsou vypočtené. Zde se nezobrazují jako definitivní hodnoty.</p>
 <p><strong>Folk:</strong> ${E(h.folk||'—')} · <strong>Age:</strong> ${E(h.ageGroup||'—')} · <strong>Region:</strong> ${E(h.birthRegion||'—')} · <strong>Parent:</strong> ${E(h.familyOccupation||'—')} · <strong>Occupation:</strong> ${E(character.occupation||'—')}</p>
 <p>Uložený postup: krok ${step}/14 · ${Object.keys(cr.completed??{}).length} potvrzených kroků. Tvorbu lze bezpečně opustit a obnovit.</p><button type="button" data-action="creation-open">↩ Vrátit se do průvodce</button></section>
 <section class="panel wide"><h3>Osobní zápisník rozpracované postavy</h3><form id="journal-form"><label>Nadpis záznamu<input name="title" type="text"></label><label>Zápis<textarea name="body"></textarea></label><button type="submit">Přidat záznam</button></form>${notes}</section>`;
}
