/** v93.928 · shared PRESENTATION only for individually-confirmed HMK dice.
 * Never rolls, accepts, evaluates or saves: the original rule owner still does all that.
 * Do not attach to native one/two-die forms, which intentionally have one final submit.
 */
export function groupConfirmedDieControls93928(field,generator,accept){
 if(!(field instanceof HTMLInputElement)||!(generator instanceof HTMLButtonElement)||!(accept instanceof HTMLButtonElement))return false;
 const label=field.closest('label');
 if(!label||generator.closest('label')!==label||accept.closest('label')!==label)return false;
 if(field.closest('.hmk-confirmed-dice-row'))return true;
 const row=document.createElement('span');
 row.className='hmk-confirmed-dice-row';
 // Keep all three controls beside one another when the form column permits it.
 // Accessible name retains the die/field identity even with a shorter button label.
 accept.textContent='Vložit';
 row.setAttribute('data-hmk-confirmed-dice-row','');
 field.before(row);row.append(field,generator,accept);
 label.classList.add('hmk-confirmed-dice-label');
 return true;
}
