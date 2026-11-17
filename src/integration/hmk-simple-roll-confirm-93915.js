/** HMK v93.921: small noncombat forms use their ORIGINAL controls.
 * An inline generator is added only if the original single/dual-die field
 * does not already have one. No replacement input, red wizard, acceptance
 * stage, reset, clock/receipt changes, or submission interceptor.
 * Conditional/complex processes retain their dedicated rule-aware wizards.
 */
const FACES=new Set([2,3,4,6,8,10,12,20,30,100]);
const SKIP_FORM='#hsk-talisman-bestowal,#creation-step-form,#skill-secondary-form,#skill-value-form,#skill-assistance-form,#skill-tiebreak-form,#hsk-special-sr-form,'+
 '[data-hmk-wild-spoil],[data-hmk-animal-training],'+
 '[data-hmk-fishing-catch],[data-herb-assess],[data-weather-blood-start],'+
 '[data-weather-shock-followup],[data-weather-trauma-course],'+
 '[data-trek-global-weather],[data-trek-global-shift],'+
 '[data-malnutrition-course],#hmk-time-episode-form,'+
 '#hmk-g04-mounted-move-start,#hmk-g04-area-commit,'+
 '[data-skill-physical-impact],[data-climbing-fall-form],'+
 '[data-alchemy-finish],[data-alchemy-acid-flesh-round],'+
 '[data-hmk-beast-frost-sequence-573],[data-hmk-beast-contact-566]';
const EXCLUDE_ANCESTOR='.journal-book--combat,.hmk-sheet-combat-action,'+
 '.hmk-guided-attack,.hmk-guided-combat';
function visible(input){
 if(input.disabled||input.hidden||input.closest('[hidden],fieldset[disabled]'))return false;
 for(let p=input.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return false;
 return true;
}
function rollField(input){
 if(input.type!=='number'||!input.name||!FACES.has(Number(input.max))||Number(input.min)>1)return false;
 if(input.matches('[data-hmk-roll-queue],[data-hmk-one-roll-input],[data-hmk-one-roll-confirm],'+
  '[data-episode-roll-confirm],[data-episode-roll-field],[data-creation-roll],'+
  '[data-hmk-critical-roll-confirm]')||input.closest('[data-hmk-roll-queue],.hmk-one-roll-93913'))return false;
 const label=input.closest('label');if(!label)return false;
 const faces=Number(input.max),text=(label.textContent||'').replace(/\s+/g,' ');
 return new RegExp('(?:^|\\W)d\\s*'+faces+'(?:\\W|$)','i').test(text)||
  new RegExp('(?:roll|die|dice|hod)'+faces+'(?:$|_)','i').test(input.name)||
  new RegExp('(?:^|\\W)(?:skutečný|skutečné|fyzický)\\s+(?:hod|výsledek)','i').test(text)&&
  new RegExp('(?:roll|d'+faces+')','i').test(input.name);
}
function nativeGenerator(input){
 const label=input.closest('label');if(!label)return null;
 const buttons=[...label.querySelectorAll('button[type="button"]'),
  ...(label.nextElementSibling?.tagName==='BUTTON'?[label.nextElementSibling]:[])];
 return buttons.find(b=>/data-hmk-general-auto-die|data-hmk-calendar-auto-die|data-episode-die|data-herb-shelf-roll|data-hmk-recovery-generate/.test(b.outerHTML)||
   /⚄|generovat|vygenerovat|hodit\s*d\d+/i.test(b.textContent||''))||null;
}
export function decorateSimpleNoncombatRolls93915(root,die){
 if(!root||typeof die!=='function')return {decorated:0,skipped:0};
 let decorated=0,skipped=0;
 for(const form of root.querySelectorAll('form')){
  if(form.dataset.hmkSimpleRollStage==='native-v93.921')continue;
  if(form.matches(SKIP_FORM)||form.closest(EXCLUDE_ANCESTOR)||
    form.querySelector('[data-hmk-one-roll-confirm],[data-episode-roll-confirm]'))continue;
  const fields=[...form.querySelectorAll('input[type="number"]')].filter(rollField).filter(visible);
  if(!fields.length)continue;
  const bulkAlchemy=form.matches('[data-alchemy-start]')&&fields.length===3&&
   fields.every(x=>x.required&&Number(x.max)===6&&/^timeD6[012]$/.test(x.name));
  if(fields.length>2&&!bulkAlchemy){skipped++;continue;}
  // Native buttons (including Alchemy's bulk roller) always retain original
  // click listeners, usability and placement. Ordinary submit is final accept.
  form.dataset.hmkSimpleRollStage='native-v93.921';
  if(bulkAlchemy&&form.querySelector('[data-alchemy-roll-time]'))continue;
  for(const input of fields){
   if(nativeGenerator(input))continue;
   const faces=Number(input.max),gen=document.createElement('button');
   gen.type='button';gen.className='hc-small hmk-simple-auto-93915';
   gen.textContent='⚄ d'+faces;
   gen.addEventListener('click',()=>{
    if(gen.disabled||input.disabled)return;
    const value=die(faces);
    if(!Number.isSafeInteger(value)||value<1||value>faces)throw Error('Neplatný výsledek d'+faces);
    input.value=String(value);input.dataset.hmkAutoDice=input.value;
    if(form.matches('[data-alchemy-start]'))input.dataset.alchemyGenerated=input.value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
   });
   input.after(gen);decorated++;
  }
 }
 return {decorated,skipped};
}
