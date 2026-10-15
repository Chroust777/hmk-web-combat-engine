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
export function characterSheetSummaryHTML(character){
 const E=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
 const h=character?.hmk??{},a=h.attributes??{};
 const labels=[['str','Strength'],['end','Endurance'],['dex','Dexterity'],['agl','Agility'],['per','Perception'],['cml','Comeliness'],['aur','Aura'],['wil','Will'],['rea','Reasoning'],['cre','Creativity'],['emp','Empathy'],['elo','Eloquence']];
 const line=(title,v)=>'<tr><th scope="row">'+E(title)+'</th><td>'+E(v)+'</td></tr>';
 const attrs=labels.map(([key,label])=>line(label,Number.isSafeInteger(a[key])?a[key]+' (test ML '+5*a[key]+')':'nedoloženo')).join('');
 const bio=[['Folk',h.folk],['Age Group',h.ageGroup],['Birthdate',h.birthdate],['Sunsign',h.sunsign],['Birthplace',h.birthplace],['Society',h.society],['Parent Class',h.socialClass],['Parent Occupation',h.familyOccupation],['Background',h.background],['Estrangement',h.estrangement],['Occupation',character?.occupation],['Wealth',h.wealth],['Coin (d)',h.coinsPence],['Possessions allowance (d)',h.possessionsBudgetPence],['Morality',h.morality],['Psyche',h.psyche],['Divine Grace',h.divineGrace?.grace],['Arcane status',h.arcaneStatus],['Religion / Pantheon',h.pantheon],['Home',h.home],['Standing',h.standing]].map(([k,v])=>line(k,v??'nedoloženo')).join('');
 return '<section class="panel wide"><h3>Character Sheet · přímý přehled hodnot</h3><p class="muted">Hodnoty jsou načteny přímo ze stávajícího profilu; chybějící data jsou označena jako nedoložená, nikoli odhadnutá. Atributový test používá ML = 5 × score (HMK p.61).</p><div class="field-grid"><div class="table-scroll"><table class="catalog-spec"><caption>12 Attributes</caption><tbody>'+attrs+'</tbody></table></div><div class="table-scroll"><table class="catalog-spec"><caption>Birth · Family · Persona · Standing</caption><tbody>'+bio+'</tbody></table></div></div></section>'
}
