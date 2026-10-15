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
export function characterSheetSummaryHTML(character,{editing=false}={}){
 const E=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const h=character?.hmk??{},a=h.attributes??{},guided=Boolean(h.creation);
 const attrs=[['str','Strength'],['end','Endurance'],['dex','Dexterity'],['agl','Agility'],['per','Perception'],['cml','Comeliness'],['aur','Aura'],['wil','Will'],['rea','Reasoning'],['cre','Creativity'],['emp','Empathy'],['elo','Eloquence']];
 const bio=[['folk','Folk'],['ageGroup','Age Group'],['birthdate','Birthdate'],['sunsign','Sunsign'],['birthplace','Birthplace'],['society','Society'],['socialClass','Parent Class'],['familyOccupation','Parent Occupation'],['background','Background'],['estrangement','Estrangement'],['occupation','Occupation'],['wealth','Wealth'],['coinsPence','Coin (d)'],['possessionsBudgetPence','Possessions allowance (d)'],['morality','Morality'],['psyche','Psyche'],['divineGrace','Divine Grace'],['arcaneStatus','Arcane status'],['pantheon','Religion / Pantheon'],['home','Home'],['standing','Standing']];
 const input=(name,value,{number=false}={})=>`<input class="sheet-inline-input" name="${E(name)}" aria-label="${E(name)}" type="${number?'number':'text'}" ${number?'min="0" step="1"':''} value="${E(value??'')}">`;
 const isScalar=x=>x===null||x===undefined||['string','number','boolean'].includes(typeof x);
 const value=(key)=>key==='occupation'?character.occupation:key==='divineGrace'?h.divineGrace?.grace:h[key];
 const bioRows=bio.map(([k,label])=>{
  const v=value(k),shown=isScalar(v)?(v??'nedoloženo'):'Dle Character Creation';
  const editable=editing&&!guided&&k!=='occupation'&&k!=='divineGrace'&&isScalar(v);
  const view=editing&&!guided&&k==='occupation'?input('sheet_occupation',v):editable?input('sheet_bio_'+k,v,{number:['wealth','coinsPence','possessionsBudgetPence','morality'].includes(k)}):E(shown);
  return `<tr><th scope="row">${E(label)}</th><td>${view}${editing&&guided?'<span class="sheet-managed-dot" title="Hodnota vychází z Character Creation">◈</span>':''}</td></tr>`;
 }).join('');
 const attrRows=attrs.map(([key,label])=>{
  const n=a[key],shown=Number.isSafeInteger(n)?n+' (test ML '+(5*n)+')':'nedoloženo';
  const cell=editing&&!guided?input('sheet_attr_'+key,Number.isSafeInteger(n)?n:'',{number:true}):E(shown);
  return `<tr><th scope="row">${E(label)}</th><td>${cell}</td></tr>`;
 }).join('');
 const txt=(key,val,label)=>editing?`<label>${label}${key==='description'?`<textarea name="sheet_${key}" rows="3">${E(val??'')}</textarea>`:input('sheet_'+key,val)}</label>`:`<div><strong>${label}:</strong> ${E(val??'—')}</div>`;
 const who=editing?`<div class="sheet-personal-fields">${txt('name',character?.name,'Jméno')}<label>Typ<select name="sheet_kind"><option value="PC" ${character?.kind!=='NPC'?'selected':''}>PC</option><option value="NPC" ${character?.kind==='NPC'?'selected':''}>NPC</option></select></label>${txt('portrait',character?.portrait,'URL portrétu')}${txt('description',character?.description,'Popis a historie')}</div>`:`<div class="sheet-personal-read">${txt('name',character?.name,'Jméno')}<div><strong>Typ:</strong> ${E(character?.kind||'PC')}</div>${txt('description',character?.description,'Popis a historie')}</div>`;
 return `<section class="panel wide sheet-inline-projection"><h3>Character Sheet · přímý přehled hodnot</h3>${editing?(guided?'<p class="notice">Úprava osobních údajů přímo zde. Atributy, původ, Wealth a další pravidlové hodnoty vznikly při Character Creation; změňte je v průvodci, aby zůstaly zachované doklady hodů a výpočty Skills.</p>':'<p class="muted">Hodnoty upravte přímo v tabulkách. Uložení aktualizuje původní profil, nikoli jeho kopii.</p>'):'<p class="muted">Hodnoty jsou načteny přímo z profilu; chybějící data jsou označena jako nedoložená. Atributový test ML = 5 × score (HMK p.61).</p>'}${who}<div class="field-grid"><div class="table-scroll"><table class="catalog-spec"><caption>12 Attributes</caption><tbody>${attrRows}</tbody></table></div><div class="table-scroll"><table class="catalog-spec"><caption>Birth · Family · Persona · Standing</caption><tbody>${bioRows}</tbody></table></div></div>${editing&&guided?'<p><button type="button" class="secondary" data-action="creation-open">Upravit pravidlové hodnoty v Character Creation</button></p>':''}</section>`;
}
