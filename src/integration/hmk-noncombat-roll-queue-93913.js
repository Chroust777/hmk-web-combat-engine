/** HMK GM non-combat staged dice entry, v93.913.
 * Presentation-only: never mutates calendar, game state, receipts or RNG until
 * an explicit user click. Original rule submit handlers remain authoritative.
 * Only the identified multi-die wild-food and animal-training forms are decorated.
 * Daily weather, GM weather changes, and simple one-die tests remain native.
 * Combat and Skill Workbench forms are deliberately outside this module.
 */
// Only genuine sequences of several conditional dice need a staged wizard.
// Daily weather (including a GM change) and the single malnutrition d100
// retain their original inline dice buttons and one final submit.
const SPEC = Object.freeze({
 'data-hmk-wild-spoil': ['rolls'],
 'data-hmk-animal-training': ['trainingD10'],
});
const names={temperature:'Denní teplota',precipitation:'Denní srážky',
 trekWeatherShiftTemperature:'Nová teplota',trekWeatherShiftPrecipitation:'Nové srážky',
 rolls:'Denní zkáza – jednotlivý food-day',trainingD10:'Výcvik zvířete – Training Roll'};
function valid(value,faces){return /^\d+$/.test(String(value).trim())&&Number(value)>=1&&Number(value)<=faces;}
/** Browser/UI-only. `die` is the existing cryptographic HMK roller. */
export function decorateNoncombatRollQueue93913(root,die){
 if(!root||typeof die!=='function')return;
 for(const [attribute,fields] of Object.entries(SPEC))for(const form of root.querySelectorAll('form['+attribute+']')){
  if(form.dataset.hmkRollQueue==='v93.913')continue;
  const spoil=attribute==='data-hmk-wild-spoil',training=attribute==='data-hmk-animal-training',nutrition=attribute==='data-malnutrition-course';
  const weatherFields=fields.map(name=>form.elements.namedItem(name));
  if(weatherFields.some(input=>!(input instanceof HTMLInputElement)))continue;
  let count=spoil?Number(form.dataset.hmkWildRollCount):training?Number(form.dataset.hmkDiceCount||0):fields.length;
  if(!Number.isSafeInteger(count)||count<0||count>500||(!training&&count<1))continue;
  const submit=form.querySelector('button[type="submit"]');if(!submit)continue;
  form.dataset.hmkRollQueue='v93.913';
  const state={step:0,rolls:[],origins:[],generated:null};
  const oldDisabled=submit.disabled;
  const temperature=spoil?form.elements.namedItem('temperature'):null;
  const gmCheckbox=spoil?form.elements.namedItem('gmConfirmed'):null;
  if(spoil||training||nutrition){weatherFields[0].closest('label').hidden=true;weatherFields[0].type='hidden';
   if(nutrition)form.querySelector('[data-malnutrition-die]')?.setAttribute('hidden','');
   if(training)form.querySelector('[data-hmk-followup-roll-all]')?.setAttribute('hidden','');}
  else for(const field of weatherFields){
   const wrapper=field.closest('.hc-trek-shift-control');if(wrapper)wrapper.hidden=true;
   field.type='hidden'; // retain original name and authoritative submit input
  }
  const host=document.createElement('fieldset');host.className='hmk-one-roll-93913';
  host.setAttribute('aria-live','polite');host.innerHTML=
   '<legend>Aktuální povinný hod – jeden krok po druhém</legend>'+
   '<p data-hmk-one-roll-prompt class="hmk-one-roll-prompt"></p>'+
   '<label>Skutečný výsledek <input data-hmk-one-roll-input type="number" min="1" step="1" inputmode="numeric" autocomplete="off"></label>'+
   '<div class="hmk-one-roll-actions">'+
   '<button type="button" data-hmk-one-roll-generate>⚄ Generovat hod</button>'+
   '<button type="button" data-hmk-one-roll-confirm>Vložit hodnotu</button>'+
   '<button type="button" class="secondary" data-hmk-one-roll-reset>Změnit potvrzené hody</button></div>'+
   '<output data-hmk-one-roll-status role="status" aria-live="polite"></output>';
  const prompt=host.querySelector('[data-hmk-one-roll-prompt]');
  const input=host.querySelector('[data-hmk-one-roll-input]');
  const gen=host.querySelector('[data-hmk-one-roll-generate]');
  const accept=host.querySelector('[data-hmk-one-roll-confirm]');
  const reset=host.querySelector('[data-hmk-one-roll-reset]');
  const output=host.querySelector('[data-hmk-one-roll-status]');
  const target=form.querySelector('.hc-trek-weather-actions')||submit;
  target.parentNode.insertBefore(host,target);
  const getFaces=()=>nutrition?100:spoil?({hot:2,warm:4,cool:8,cold:12}[temperature?.value]||null):10;
  const isDone=()=>state.step===count;
  function show(){
   const completed=isDone();const faces=getFaces();
   if(training)host.hidden=count===0;
   host.classList.toggle('hmk-one-roll-complete',completed);
   prompt.textContent=completed?'Všechny hody byly jednotlivě potvrzeny. Nyní lze potvrdit celou činnost.':
    'ČERVENÝ AKTIVNÍ KROK '+(state.step+1)+'/'+count+' · '+
    (spoil?'food-day '+(state.step+1):training?names.trainingD10+' '+(state.step+1):nutrition?'Výživa – zdravotní d100':names[fields[state.step]])+' · d'+faces;
   input.max=String(faces);input.disabled=completed||oldDisabled;gen.disabled=completed||oldDisabled;
   accept.disabled=completed||oldDisabled||!valid(input.value,faces);
   reset.hidden=!state.rolls.length;submit.disabled=oldDisabled||!completed;
   if(gmCheckbox)gmCheckbox.disabled=!completed;
   if(temperature){temperature.disabled=false;temperature.style.pointerEvents=state.rolls.length?'none':'';temperature.tabIndex=state.rolls.length?-1:0;temperature.setAttribute('aria-disabled',state.rolls.length?'true':'false');}
   output.textContent=state.rolls.length?'Potvrzeno: '+state.rolls.map((n,i)=>
    (i+1)+'. '+n+' ('+state.origins[i]+')').join('; '):'Čeká se na skutečný hod.';
   if(completed){input.value='';state.generated=null;}
  }
  function clear(){state.step=0;state.rolls=[];state.origins=[];state.generated=null;
   input.value='';for(const field of weatherFields){field.value='';delete field.dataset.cryptographicValue;delete field.dataset.trekGenerated;}
   if(gmCheckbox){gmCheckbox.checked=false;gmCheckbox.disabled=true;}
   if(temperature){temperature.disabled=false;temperature.style.pointerEvents='';temperature.tabIndex=0;temperature.setAttribute('aria-disabled','false');}show();}
  function acceptCurrent(){
   const faces=getFaces();if(isDone()||!valid(input.value,faces)){output.textContent='Zadejte jedno platné číslo d'+faces+'.';return;}
   const number=Number(input.value),software=state.generated===number;
   state.rolls.push(number);state.origins.push(software?'software':'ručně');
   if(!spoil&&!training&&!nutrition){const field=weatherFields[state.step];field.value=String(number);
    if(software){if(attribute==='data-trek-global-weather')field.dataset.cryptographicValue=field.value;
     else field.dataset.trekGenerated=field.value;}
   }
   state.step++;state.generated=null;input.value='';
   if(spoil||training||nutrition)weatherFields[0].value=state.rolls.join(',');
   show();if(!isDone()){input.focus({preventScroll:true});}
  }
  gen.addEventListener('click',()=>{
   if(isDone())return;try{const value=die(getFaces());input.value=String(value);state.generated=value;show();input.focus({preventScroll:true});}
   catch(err){output.textContent='Generátor hodu: '+String(err.message||err);}
  });
  input.addEventListener('input',()=>{state.generated=null;show();});
  accept.addEventListener('click',acceptCurrent);
  reset.addEventListener('click',()=>{clear();input.focus({preventScroll:true});});
  temperature?.addEventListener('change',clear);
  if(training)form.addEventListener('change',()=>queueMicrotask(()=>{
   const changed=Number(form.dataset.hmkDiceCount||0);
   if(Number.isSafeInteger(changed)&&changed>=0&&changed<=5&&changed!==count){count=changed;clear();}
  }));
  // Form-local capturing guard runs BEFORE document-level rule executor.
  form.addEventListener('submit',e=>{if(!isDone()){
   e.preventDefault();e.stopImmediatePropagation();output.textContent='Nejdříve jednotlivě potvrďte všechny skutečné hody tlačítkem Vložit hodnotu.';
   if(!input.disabled)input.focus({preventScroll:true});
  }},true);
  show();
 }
}
