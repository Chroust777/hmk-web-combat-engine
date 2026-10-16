/** v93.251: READ-ONLY Character Sheet projection audit. No alternate source of character values. */
import {calculateSheetSkills} from './hmk-character-creation.js';
import {inspectLegacySkillRecords} from './hmk-sheet-legacy-authority.js';
export function auditCharacterSheet(character,inventory=[]){
 const issues=[],notes=[],h=character?.hmk??{},creation=h.creation;
 const attrs=h.attributes??{};
 if(!character?.id||!character?.name)issues.push('Chybí identita postavy.');
 if(creation){
  if(creation.completed?.[11]&&creation.values?.occupation&&character.occupation!==creation.values.occupation)issues.push('Povolání postavy neodpovídá potvrzenému kroku 11 Character Creation.');
  const done=Array.from({length:14},(_,i)=>Boolean(creation.completed?.[i+1]));
  if(creation.status==='auto-generated'&&!done.every(Boolean))issues.push('Automaticky dokončená tvorba nemá potvrzeno všech 14 kroků.');
  if(['auto-generated','review-required'].includes(creation.status)&&['str','end','dex','agl','per','cml','aur','wil','rea','cre','emp','elo'].some(k=>!Number.isSafeInteger(attrs[k])))issues.push('Dokončené tvorbě chybí alespoň jeden z 12 atributů.');
  const calculated=calculateSheetSkills(character);
  const projection=new Map((h.skills??[]).filter(s=>s.creationDerived).map(s=>[s.name,s]));
  const manual=inspectLegacySkillRecords(character,calculated);
  for(const entry of calculated.filter(x=>x.ml!==null&&x.sm>0)){
   const record=projection.get(entry.name);
   if(!record){if(!manual.manual.some(x=>x.name===entry.name))issues.push('Ve stávajícím profilu chybí promítnutá dovednost: '+entry.name);}
   else if(record.ml!==entry.ml||record.sb!==entry.sb)issues.push('Nesoulad ML/SB: '+entry.name);
  }
  if(manual.needsReview)notes.push('Historické ruční Skills ('+manual.manual.length+') vyžadují kontrolu GM; nebyly změněny.');
  if(!done.every(Boolean))notes.push('Postava je rozpracovaná ('+done.filter(Boolean).length+'/14 kroků).');
 }
 const owned=inventory.filter(x=>x.characterId===character?.id);
 if(owned.some(x=>!x.snapshot?.name||!Number.isInteger(x.quantity)||x.quantity<1))issues.push('Inventář obsahuje neúplné záznamy.');
 const occupied=owned.filter(x=>['main_hand','off_hand'].includes(x.slot));
 if(new Set(occupied.map(x=>x.slot)).size!==occupied.length)issues.push('V inventáři je dvakrát obsazena stejná ruka.');
 return {ok:issues.length===0,issues,notes,inventoryCount:owned.length,creationStatus:creation?.status??'legacy',authority:creation?'creation':'legacy'};
}

/** Faithful read-only summary of existing character values. Never reconstruct missing data. */
export function characterSheetSummaryHTML(character,{editing=false,currentCoins=null}={}){
 const E=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const h=character?.hmk??{},a=h.attributes??{};
 const attrs=[['str','Strength'],['end','Endurance'],['dex','Dexterity'],['agl','Agility'],['per','Perception'],['cml','Comeliness'],['aur','Aura'],['wil','Will'],['rea','Reasoning'],['cre','Creativity'],['emp','Empathy'],['elo','Eloquence']];
 const bio=[['Folk',h.folk],['Age Group',h.ageGroup],['Birthdate',h.birthdate],['Sunsign',h.sunsign],['Birthplace',h.birthplace],['Society',h.society],['Parent Class',h.socialClass],['Parent Occupation',h.familyOccupation],['Background',h.background],['Estrangement',h.estrangement],['Occupation',character?.occupation],['Wealth (start)',h.wealth],['Coin (d) · aktuální',currentCoins],['Possessions allowance (start)',h.possessionsBudgetPence],['Morality',h.morality],['Psyche',h.psyche],['Divine Grace',h.divineGrace?.grace],['Arcane status',h.arcaneStatus],['Religion / Pantheon',h.pantheon],['Home',h.home],['Standing',h.standing]];
 const scalar=v=>v===null||v===undefined||['string','number','boolean'].includes(typeof v);
 const bioRows=bio.map(([label,v])=>`<tr><th scope="row">${E(label)}</th><td>${editing&&label==='Coin (d) · aktuální'&&Number.isSafeInteger(currentCoins)?`<input class="sheet-inline-input" aria-label="Aktuální mince (d)" name="sheet_coin_current" type="number" min="0" max="999999999" step="1" value="${E(currentCoins)}">`:E(scalar(v)?(v??'nedoloženo'):'Dle Character Creation')}</td></tr>`).join('');
 const attrRows=attrs.map(([key,label])=>{const n=a[key];return `<tr><th scope="row">${E(label)}</th><td>${editing?`<input class="sheet-inline-input" aria-label="${E(label)}" name="sheet_attr_${E(key)}" type="number" min="0" max="99" step="1" required value="${Number.isSafeInteger(n)?E(n):''}">`:E(Number.isSafeInteger(n)?n+' (test ML '+(5*n)+')':'nedoloženo')}</td></tr>`}).join('');
 return `<section class="panel wide sheet-inline-projection"><h3>Character Sheet · přímý přehled hodnot</h3>${editing?'<p class="muted">Režim Edit: změň pouze aktuální atributy a mince. Folk, Age, Sunsign, Wealth a ostatní údaje tvorby se nemění. Počáteční hody zůstávají zachované.</p>':'<p class="muted">Aktuální hodnoty postavy. Atributový test: ML = 5 × score (HMK p.61).</p>'}<div class="field-grid"><div class="table-scroll"><table class="catalog-spec"><caption>12 Attributes</caption><tbody>${attrRows}</tbody></table></div><div class="table-scroll"><table class="catalog-spec"><caption>Birth · Family · Persona · Standing</caption><tbody>${bioRows}</tbody></table></div></div></section>`;
}
