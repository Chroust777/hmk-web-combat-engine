/** HMK noncombat dice UI preflight, v93.915.
 * Scope: unambiguous 1-die forms, or 2-die forms in which both rolls are
 * explicitly required. Complex conditional chains keep their native wizard.
 * Never changes game state, clocks, journal receipts, or Combat UI.
 */
const FACES=new Set([2,3,4,6,8,10,12,20,30,100]);
const OPT_OUT='[data-hmk-roll-queue],[data-hmk-one-roll-input],[data-hmk-one-roll-confirm],'+
 '[data-episode-roll-confirm],[data-episode-roll-field],[data-creation-roll],'+
 '[data-hmk-critical-roll-confirm]';
// The 14-step Character Creation already verifies physical dice itself.
// A second generic confirmation gate blocks its automatic Age step.
const SKIP_FORM='#hsk-talisman-bestowal,#creation-step-form,#skill-secondary-form,#skill-value-form,#skill-assistance-form,#skill-tiebreak-form,#hsk-special-sr-form,'+
 '[data-hmk-wild-spoil],[data-hmk-animal-training],'+
 '[data-hmk-fishing-catch],[data-herb-assess],[data-weather-blood-start],'+
 '[data-weather-shock-followup],'+
 '[data-trek-global-weather],[data-trek-global-shift],'+
 '[data-malnutrition-course],#hmk-time-episode-form,'+
 '#hmk-g04-mounted-move-start,#hmk-g04-area-commit,'+
 '[data-skill-physical-impact],[data-climbing-fall-form],'+
 '[data-alchemy-finish],[data-alchemy-acid-flesh-round],'+
 '[data-hmk-beast-frost-sequence-573],[data-hmk-beast-contact-566]';
const EXCLUDE_ANCESTOR='.journal-book--combat,.hmk-sheet-combat-action,'+
 '.hmk-guided-attack,.hmk-guided-combat';
const OK=/^\d+$/;
const valid=(input)=>OK.test(String(input.value).trim())&&Number(input.value)>=1&&
 Number(input.value)<=Number(input.max)&&Number.isSafeInteger(Number(input.value));
function visible(input){
 if(input.disabled||input.hidden||input.closest('[hidden],fieldset[disabled]'))return false;
 // Closed details do not mean that the corresponding rule roll is due.
 for(let p=input.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return false;
 return true;
}
function rollField(input){
 if(input.type!=='number'||!input.name||!FACES.has(Number(input.max))||Number(input.min)>1)return false;
 if(input.matches(OPT_OUT)||input.closest('[data-hmk-roll-queue],.hmk-one-roll-93913'))return false;
 const label=input.closest('label');if(!label)return false;
 const faces=Number(input.max),text=(label.textContent||'').replace(/\s+/g,' ');
 return new RegExp('(?:^|\\W)d\\s*'+faces+'(?:\\W|$)','i').test(text)||
  new RegExp('(?:roll|die|dice|hod)'+faces+'(?:$|_)','i').test(input.name)||
  new RegExp('(?:^|\\W)(?:skutečný|skutečné|fyzický)\\s+(?:hod|výsledek)','i').test(text)&&
  new RegExp('(?:roll|d'+faces+')','i').test(input.name);
}
function generatorFor(input){
 const label=input.closest('label');
 if(!label)return null;
 const buttons=[...label.querySelectorAll('button[type="button"]'),
  ...(label.nextElementSibling?.tagName==='BUTTON'?[label.nextElementSibling]:[])];
 return buttons.find(b=>b!==input&&!b.matches('[data-alchemy-roll-time]')&&(/\b(?:data-hmk-general-auto-die|data-hmk-calendar-auto-die|data-episode-die|data-herb-shelf-roll|data-hmk-recovery-generate)\b/.test(b.outerHTML)||
   /⚄|generovat|vygenerovat|hodit\s*d\d+/i.test(b.textContent||'')))||null;
}
/** Called after existing field-generator installation. */
export function decorateSimpleNoncombatRolls93915(root,die){
 if(!root||typeof die!=='function')return {decorated:0,skipped:0};
 let decorated=0,skipped=0;
 for(const form of root.querySelectorAll('form')){
  if(form.dataset.hmkSimpleRollStage==='v93.915')continue;
  if(form.matches(SKIP_FORM)||form.closest(EXCLUDE_ANCESTOR)||
   form.querySelector('[data-hmk-one-roll-confirm],[data-episode-roll-confirm]'))continue;
  const fields=[...form.querySelectorAll('input[type="number"]')].filter(rollField).filter(visible);
  // Complex conditional chains must remain in their original, rule-aware wizard.
  if(!fields.length)continue;
  const fixedAlchemy=!!(form.matches('[data-alchemy-start]')&&fields.length===3&&
   fields.every(x=>x.required&&Number(x.max)===6&&/^timeD6[012]$/.test(x.name)));
  if((fields.length>2&&!fixedAlchemy)||(fields.length===2&&!fields.every(x=>x.required))){skipped++;continue;}
  const inputs=fields.map(input=>({input,faces:Number(input.max),confirm:null,generator:null,accepted:null}));
  form.dataset.hmkSimpleRollStage='v93.915';
  if(fixedAlchemy){const bulk=form.querySelector('[data-alchemy-roll-time]');if(bulk){bulk.hidden=true;bulk.disabled=true;bulk.setAttribute('aria-hidden','true');}}
  const status=document.createElement('p');status.className='hmk-simple-roll-status-93915';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.textContent='Červeně je označen povinný aktuální hod. Každé číslo potvrďte tlačítkem Vložit hodnotu.';
  const submit=form.querySelector('button[type="submit"]');
  if(submit)submit.parentNode.insertBefore(status,submit);else form.append(status);
  const reset=document.createElement('button');reset.type='button';
  reset.className='secondary hc-small hmk-simple-reset-93915';
  reset.textContent='Změnit potvrzené hody';
  if(submit)submit.parentNode.insertBefore(reset,submit);else form.append(reset);
  reset.addEventListener('click',()=>{
   for(const item of inputs){
    item.accepted=null;item.input.value='';delete item.input.dataset.hmkAutoDice;
    if(fixedAlchemy)delete item.input.dataset.alchemyGenerated;
    item.input.dispatchEvent(new Event('input',{bubbles:true}));
    item.input.dispatchEvent(new Event('change',{bubbles:true}));
   }
   refresh();const first=inputs.find(x=>visible(x.input));first?.input.focus({preventScroll:true});
  });
  for(const item of inputs){
   const {input,faces}=item;
   let gen=generatorFor(input);
   if(!gen){
    gen=document.createElement('button');gen.type='button';gen.className='hc-small hmk-simple-auto-93915';
    gen.textContent='⚄ Generovat hod d'+faces;
    input.after(gen);
    gen.addEventListener('click',()=>{
     if(gen.disabled)return;
     try{const value=die(faces);if(!Number.isSafeInteger(value)||value<1||value>faces)throw Error('Neplatný výsledek generátoru');
      input.value=String(value);input.dataset.hmkAutoDice=String(value);
      if(fixedAlchemy)input.dataset.alchemyGenerated=String(value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      refresh();
     }catch(e){status.textContent='Hod nebyl proveden: '+String(e.message||e);}
    });
   }
   if(/^⚄\s*d\d+$/i.test((gen.textContent||'').trim()))gen.textContent='⚄ Generovat hod d'+faces;
   item.generator=gen;
   const confirm=document.createElement('button');confirm.type='button';
   confirm.className='secondary hc-small hmk-simple-accept-93915';
   confirm.textContent='Vložit hodnotu';confirm.setAttribute('aria-label','Potvrdit '+input.name+' · d'+faces);
   gen.after(confirm);item.confirm=confirm;
   confirm.addEventListener('click',()=>{
    if(confirm.disabled||!valid(input)){
     status.textContent='Červený aktuální hod vyžaduje celé číslo 1–'+faces+'.';return;
    }
    item.accepted=String(input.value);
    input.dispatchEvent(new Event('change',{bubbles:true}));
    refresh();
   });
   input.addEventListener('input',()=>{
    if(item.accepted!==String(input.value))item.accepted=null;
    refresh();
   });
   decorated++;
  }
  function refresh(){
   const enabled=inputs.filter(x=>visible(x.input));
   const current=enabled.find(x=>x.accepted!==String(x.input.value)||!valid(x.input));
   for(const item of inputs){
    const shown=enabled.includes(item),isActive=shown&&item===current,done=shown&&item.accepted===String(item.input.value)&&valid(item.input);
    item.input.readOnly=shown&&!isActive;
    item.input.closest('label')?.classList.toggle('hmk-simple-current-93915',isActive);
    item.input.closest('label')?.classList.toggle('hmk-simple-done-93915',done);
    item.confirm.disabled=!isActive||!valid(item.input);
    // Do not unlock generators of conditional, currently disabled rule fields.
    item.generator.disabled=!isActive||item.input.disabled;
    item.generator.hidden=!shown;
    item.confirm.hidden=!shown;
   }
   reset.hidden=!inputs.some(x=>x.accepted!==null);
   const activeIndex=current?inputs.indexOf(current)+1:0;
   status.textContent=current?
    'ČERVENÝ AKTIVNÍ HOD '+activeIndex+'/'+inputs.length+' · d'+current.faces+
      ' · '+(current.input.closest('label')?.firstChild?.textContent||current.input.name).replace(/\s+/g,' ').slice(0,95)+
      ' · nejdřív Generovat hod nebo ručně zadat číslo, potom Vložit hodnotu.':
    'Všechny aktuálně požadované hody jsou potvrzené. Následuje původní pravidlové vyhodnocení.';
  }
  form.addEventListener('change',e=>{
   if(inputs.some(item=>item.input===e.target))return;
   // User changed a rule-relevant choice; never keep stale confirmation.
   for(const item of inputs)item.accepted=null;
   queueMicrotask(refresh);
  });
  // Capturing at WINDOW runs before all existing document-level rule submitters.
  const onSubmit=e=>{
   if(e.target!==form)return;
   const pending=inputs.filter(item=>visible(item.input)&&
    (item.input.required||String(item.input.value).trim()!=='')&&
    (item.accepted!==String(item.input.value)||!valid(item.input)));
   if(!pending.length)return;
   e.preventDefault();e.stopImmediatePropagation();
   status.textContent='Uložení pozastaveno: nejdřív potvrďte červený hod tlačítkem Vložit hodnotu.';
   pending[0].input.focus({preventScroll:true});
  };
  window.addEventListener('submit',onSubmit,true);
  // Clean up the event listener when the full render replaces its form.
  // No effect on retained forms, Combat or game state.
  const dispose=new MutationObserver(records=>{
   if(!form.isConnected){window.removeEventListener('submit',onSubmit,true);dispose.disconnect();return;}
   if(records.some(r=>r.type==='attributes'&&r.target instanceof HTMLInputElement&&
    inputs.some(x=>x.input===r.target)&&['disabled','required','hidden'].includes(r.attributeName)))
    queueMicrotask(refresh);
  });
  dispose.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','required','hidden']});
  refresh();
 }
 return {decorated,skipped};
}
