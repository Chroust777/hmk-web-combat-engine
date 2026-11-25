/** v93.928 · shared PRESENTATION only for individually-confirmed HMK dice.
 * Never rolls, accepts, evaluates or saves: the original rule owner still does all that.
 * Do not attach to native one/two-die forms, which intentionally have one final submit.
 */
export function groupConfirmedDieControls93928(field,generator,accept=null){
 if(!(field instanceof HTMLInputElement)||!(generator instanceof HTMLButtonElement)||(accept&&!(accept instanceof HTMLButtonElement)))return false;
 const label=field.closest('label');
 if(!label||generator.closest('label')!==label||(accept&&accept.closest('label')!==label))return false;
 if(field.closest('.hmk-confirmed-dice-row'))return true;
 // Preserve the original container and its event handlers. In particular, Travel
 // already has a dedicated .hc-episode-die, while Swimming uses an inline row.
 // Never insert a second nested row or duplicate a generator/accept control.
 const existing=field.closest('.hc-episode-die,.hmk-inline-die-controls');
 const row=existing&&existing.contains(generator)&&(!accept||existing.contains(accept))?existing:document.createElement('span');
 if(!existing||row!==existing){field.before(row);row.append(field,generator);if(accept)row.append(accept);}
 row.classList.add('hmk-confirmed-dice-row');
 row.setAttribute('data-hmk-confirmed-dice-row','');
 // The original label and all three controls remain in place.
 if(!existing&&accept)accept.textContent='Vložit';
 label.classList.add('hmk-confirmed-dice-label');
 return true;
}
