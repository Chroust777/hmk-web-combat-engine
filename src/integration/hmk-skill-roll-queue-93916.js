import {specialSecondaryById} from './hmk-special-secondary-routines.js';
import {groupConfirmedDieControls93928} from './hmk-confirmed-dice-ui-93928.js';
/** HMK v93.916 · rule-aware, noncombat Skill Workbench roll confirmation.
 * Only decorates Skill Tests. Never calculates an HMK result, writes a receipt,
 * advances time, or changes Combat state. The original submit handler remains
 * authoritative, including its automatic-CF and untrained-SR exceptions.
 */
const FORM_IDS=['skill-secondary-form','skill-value-form','skill-assistance-form','skill-tiebreak-form'];
const WHOLE=/^[1-9][0-9]*$/;
const controllers=new Map();
let tabFocusInstalled=false;
function installTabFocus(){
 if(tabFocusInstalled)return;tabFocusInstalled=true;
 window.addEventListener('click',event=>{
  if(!event.target.closest?.('[data-skill-tab]'))return;
  window.setTimeout(()=>{
   const target=[...document.querySelectorAll('#skill-secondary-form .hmk-simple-current-93915 input, #skill-value-form .hmk-simple-current-93915 input, #skill-assistance-form .hmk-simple-current-93915 input')]
    .find(x=>x.getClientRects().length&&!x.closest('[hidden]'));
   if(target)focusField(target);
  },0);
 },true);
}

const values={rollA:100,rollB:100,roll10A:10,roll10B:10,tieD10A:10,tieD10B:10};
const namesFor=form=>form.id==='skill-tiebreak-form'?['tieD10A','tieD10B']:
 form.id==='skill-secondary-form'?['rollA','roll10A','rollB','roll10B']:['rollA','roll10A'];
function visible(el){
 if(!el||el.disabled||el.closest('[hidden],fieldset[disabled]'))return false;
 for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return false;
 return true;
}
function inRange(field){
 const raw=String(field.value).trim(),n=Number(raw),faces=values[field.name];
 return WHOLE.test(raw)&&Number.isSafeInteger(n)&&n>=1&&n<=faces;
}
function due(form,field){
 if(!visible(field))return false;
 if(field.name.startsWith('roll10')){
  const side=field.name.endsWith('B')?'B':'A';
  if(!form.elements.namedItem('srActivity'+side)?.value)return false;
  const hint=form.querySelector('[data-sr-tn="'+side+'"]')?.textContent||'';
  // HMK: an untrained secondary skill automatically fails, without d10.
  if(/Neosvojená|SR\s*=\s*F/i.test(hint))return false;
 }
 if((field.name==='rollA'||field.name==='rollB')&&form.querySelector('[data-hmk-skill-no-roll="'+field.name+'"]')?.checked)return false;
 return true;
}
function focusField(field){
 if(!field)return;
 try{field.focus({preventScroll:true});field.closest('label')?.scrollIntoView({block:'center',behavior:'smooth'});}catch{}
}
export function decorateSkillWorkbenchRolls93916(root,secureDie){
 if(!root||typeof secureDie!=='function')return {forms:0,fields:0};
 installTabFocus();
 for(const [id,item] of controllers)if(!item.form.isConnected){
  window.removeEventListener('submit',item.onSubmit,true);item.observer.disconnect();controllers.delete(id);
 }
 let forms=0,fields=0;
 for(const id of FORM_IDS){
  const form=root.querySelector('#'+id);
  if(!form||form.hasAttribute('data-hmk-skill-roll-stage-93916'))continue;
  const ordered=namesFor(form).map(name=>form.elements.namedItem(name)).filter(x=>x instanceof HTMLInputElement);
  if(!ordered.length)continue; // No extra tiebreak d10 when the original proof already resolves the tie.
  const state=new Map();form.setAttribute('data-hmk-skill-roll-stage-93916','yes');forms++;
  const submit=form.querySelector('button[type="submit"]');
  const message=document.createElement('p');message.className='hmk-simple-roll-status-93915';
  message.setAttribute('data-hmk-skill-roll-status-93916','');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const reset=document.createElement('button');reset.type='button';reset.className='secondary hc-small';reset.textContent='Změnit potvrzené hody';
  reset.setAttribute('data-hmk-skill-roll-reset-93916','');
  if(submit){submit.before(message);submit.before(reset);}else{form.append(message,reset);}
  for(const field of ordered){
   const faces=values[field.name];
   // Existing generator must keep the original provenance and click handler.
   let generator=field.closest('label')?.querySelector('[data-hmk-general-auto-die]')||
    field.closest('label')?.querySelector('[data-hmk-skill-auto-die-93916]');
   if(!generator){
    generator=document.createElement('button');generator.type='button';generator.className='secondary hc-small';
    generator.setAttribute('data-hmk-skill-auto-die-93916','');generator.textContent='⚄ Generovat hod d'+faces;
    field.after(generator);
    generator.addEventListener('click',()=>{
     if(generator.disabled||!due(form,field))return;
     try{
      const val=secureDie(faces);
      if(!Number.isSafeInteger(val)||val<1||val>faces)throw Error('Generátor nevrátil platné d'+faces);
      field.value=String(val);field.dataset.hmkAutoDice=String(val);
      field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
      refresh();
     }catch(e){message.textContent='Generátor selhal: '+String(e.message||e);}
    });
   }
   const accept=document.createElement('button');accept.type='button';accept.className='secondary hc-small';
   accept.setAttribute('data-hmk-skill-accept-93916',field.name);accept.textContent='Vložit hodnotu';
   accept.setAttribute('aria-label','Vložit hodnotu '+field.name+' d'+faces);
   generator.after(accept);
   groupConfirmedDieControls93928(field,generator,accept);
   state.set(field.name,{field,generator,accept,accepted:null});fields++;
   accept.addEventListener('click',()=>{
    if(accept.disabled||!inRange(field))return;
    state.get(field.name).accepted=String(field.value);
    refresh();focusField(pending()?.field);
   });
   field.addEventListener('input',()=>{
    if(state.get(field.name).accepted!==String(field.value))state.get(field.name).accepted=null;
    refresh();
   });
  }
  // The original HMK engine decides whether a primary d100 is unnecessary
  // because the result is a forced automatic CF. Explicit GM selection here
  // only skips the UI die; it never asserts that CF is actually permitted.
  if(form.id!=='skill-tiebreak-form')for(const name of ['rollA',...(form.id==='skill-secondary-form'?['rollB']:[])]){
   const field=form.elements.namedItem(name);if(!field)continue;
   const label=document.createElement('label');label.className='tiny hmk-skill-forced-cf-93916';
   const box=document.createElement('input');box.type='checkbox';box.setAttribute('data-hmk-skill-no-roll',name);
   label.append(box,document.createTextNode(' Bez hodu pouze při pravidlovém automatickém CF (ověří původní vyhodnocení)'));
   field.closest('label')?.after(label);
   box.addEventListener('change',()=>{clear(true);refresh();focusField(pending()?.field);});
  }
  function active(){return ordered.filter(field=>due(form,field));}
  function pending(){return active().map(f=>state.get(f.name)).find(x=>x.accepted!==String(x.field.value)||!inRange(x.field));}
  function clear(keepValues=false){
   for(const entry of state.values()){
    entry.accepted=null;
    if(!keepValues){entry.field.value='';delete entry.field.dataset.hmkAutoDice;}
   }
  }
  function refresh(){
   const list=active(),now=pending();
   for(const entry of state.values()){
    const on=list.includes(entry.field),current=on&&entry===now;
    entry.field.readOnly=!current;
    entry.field.closest('label')?.classList.toggle('hmk-simple-current-93915',current);
    entry.field.closest('label')?.classList.toggle('hmk-simple-done-93915',on&&!current&&entry.accepted===String(entry.field.value)&&inRange(entry.field));
    entry.generator.disabled=!current;
    entry.generator.hidden=!on;
    entry.accept.disabled=!current||!inRange(entry.field);
    entry.accept.hidden=!on;
   }
   reset.hidden=![...state.values()].some(x=>x.accepted!==null);
   if(now){const index=list.indexOf(now.field)+1;
    message.textContent='ČERVENÝ AKTIVNÍ HOD '+index+'/'+list.length+' · '+now.field.name+' · d'+values[now.field.name]+' · Generovat hod nebo ručně zadat číslo → Vložit hodnotu.';
   }else if(list.length)message.textContent='Všechny požadované hody potvrzené · lze použít původní Vyhodnotit.';
   else message.textContent='Tato situace nevyžaduje další kostku · rozhodne původní pravidlové vyhodnocení.';
  }
  reset.addEventListener('click',()=>{clear();refresh();focusField(pending()?.field);});
  form.addEventListener('change',event=>{
   if(state.has(event.target.name))return;
   if(event.target.hasAttribute('data-hmk-skill-no-roll'))return;
   // A change of rule choice, primary skill, defender, or SR activity invalidates
   // all earlier confirmations. Original handlers run on document afterward.
   clear(true);queueMicrotask(refresh);
  });
  const onSubmit=event=>{
   if(event.target!==form)return;
   const need=pending();
   if(need){
    // Primary rolls may be absent only with an explicit forced-CF exemption.
    event.preventDefault();event.stopImmediatePropagation();
    message.textContent='Uložení pozastaveno: potvrďte červený hod '+need.field.name+' (d'+values[need.field.name]+').';
    focusField(need.field);return;
   }
   // Tied d10/d10: existing HMK handler records this pair, asks for a new
   // pair and keeps the original d100. Prepare the next UI inputs only after
   // that handler has consumed both confirmed numbers.
   if(id==='skill-tiebreak-form'){
    const a=state.get('tieD10A')?.field,b=state.get('tieD10B')?.field;
    const equal=a&&b&&inRange(a)&&inRange(b)&&a.value===b.value;
    if(equal)window.setTimeout(()=>{if(form.isConnected&&/shodují|znovu/i.test(form.querySelector('.hsk-tiebreak-message')?.textContent||'')){clear();refresh();message.textContent='Remíza d10/d10: původní test vyžaduje oba nové hody; první aktivní hod je červený.';focusField(pending()?.field);}},0);
   }
  };
  // Must precede app.js document capture submit handlers.
  window.addEventListener('submit',onSubmit,true);
  const dispose=new MutationObserver(records=>{
   if(!form.isConnected){window.removeEventListener('submit',onSubmit,true);dispose.disconnect();return;}
   // Only changes to rule-controlled fields/panels affect which die is due.
   // Our own generator disabled/hidden toggles must not cause an observer loop.
   if(records.some(r=>r.target instanceof HTMLInputElement||r.target instanceof HTMLFieldSetElement||
     r.target.matches?.('[data-sr-fields],[data-hsk-defender]')))refresh();
  });
  // Rule-specific controls update disabled/hidden without rebuilding DOM.
  dispose.observe(form,{subtree:true,attributes:true,attributeFilter:['disabled','hidden']});
  controllers.set(id,{form,onSubmit,observer:dispose});
  refresh();
  // When a new workflow appears, guide the user to the only active red die.
  window.setTimeout(()=>{
   const next=pending()?.field;
   if(form.isConnected&&next&&next.getClientRects().length&&!next.closest('[hidden]')&&
      (document.activeElement===document.body||document.activeElement?.closest?.('[data-skill-tab]')))
    focusField(next);
  },80);
 }
 return {forms,fields};
}

/** v93.917 · guided physical evidence for situational Special SR. The HMK
 * resolver and atomic save remain exclusively in app.js. No new game action.
 * Raw d10 list is an output of individually confirmed dice, never an input
 * by which a pending primary, conditional Will, or second Spirit roll can be skipped.
 */
const specialWhole=(field,faces)=>/^(?:[1-9]|[1-9][0-9]|100)$/.test(String(field.value).trim())&&
 Number.isSafeInteger(Number(field.value))&&Number(field.value)>=1&&Number(field.value)<=faces;
export function decorateSpecialSecondaryRolls93917(root,secureDie,previewPrimary){
 const form=root?.querySelector('#hsk-special-sr-form');
 if(!form||form.dataset.hmkSpecialStage93917)return;
 form.dataset.hmkSpecialStage93917='yes';
 const primary=form.elements.namedItem('specialPrimaryRoll'),will=form.elements.namedItem('specialWillRoll'),
  raw=form.elements.namedItem('specialDice'),submit=form.querySelector('button[type="submit"]');
 if(!primary||!will||!raw||!submit)return;
 raw.closest('label').hidden=true;raw.tabIndex=-1;
 const stage=document.createElement('section');stage.className='hmk-special-stage-93917';
 const heading=document.createElement('p');heading.className='hmk-simple-roll-status-93915';
 heading.setAttribute('role','status');heading.setAttribute('aria-live','polite');
 const diceHolder=document.createElement('div');diceHolder.className='hsk-form-grid';
 diceHolder.dataset.hmkSpecialDice93917='';
 const reset=document.createElement('button');reset.type='button';reset.className='secondary hc-small';
 reset.textContent='Změnit potvrzené hody';reset.dataset.hmkSpecialReset93917='';
 stage.append(heading,diceHolder,reset);submit.before(stage);
 const state={primary:null,will:null,dice:[],preview:null,previewError:'',complete:false};
 form.__hmkSpecialStage93917=state;
 const valid=(field,faces)=>specialWhole(field,faces);
 const source=field=>field?.dataset.hmkAutoDice===String(field?.value)?'cryptographic-software-die':'entered-number';
 const routine=()=>specialSecondaryById(form.elements.namedItem('specialRoutine')?.value);
 const needsPrimary=r=>r&&(r.family==='divine'||r.id==='astral-rite-member');
 const resetAll=()=>{
  state.primary=null;state.will=null;state.dice=[];state.preview=null;state.previewError='';
  primary.value='';will.value='';delete primary.dataset.hmkAutoDice;delete will.dataset.hmkAutoDice;
  raw.value='';delete raw.dataset.hmkAutoDice;
  form.__hmkSpecialDieSources93917=[];
 };
 const wipeDice=()=>{state.dice=[];raw.value='';delete raw.dataset.hmkAutoDice;form.__hmkSpecialDieSources93917=[];};
 const addDie=(i)=>{
  const label=document.createElement('label');label.setAttribute('data-hmk-special-die-93917',String(i+1));
  label.append(document.createTextNode('Povinný Secondary Roll d10 · '+(i+1)+'. kostka'));
  const input=document.createElement('input');input.type='number';input.min='1';input.max='10';input.step='1';
  input.name='specialDieStep'+(i+1);input.setAttribute('aria-label','Secondary d10 '+(i+1));
  const generate=document.createElement('button');generate.type='button';generate.className='secondary hc-small';
  generate.textContent='⚄ Generovat d10';generate.setAttribute('data-hmk-special-generate-93917','');
  const accept=document.createElement('button');accept.type='button';accept.className='secondary hc-small';
  accept.textContent='Vložit hodnotu';accept.setAttribute('data-hmk-special-accept-93917','');
  label.append(input,generate,accept);diceHolder.append(label);
  groupConfirmedDieControls93928(input,generate,accept);
  const entry={input,label,generate,accept,accepted:null,source:null};
  state.dice.push(entry);
  input.addEventListener('input',()=>{if(entry.accepted!==input.value){entry.accepted=null;entry.source=null;}refresh();});
  generate.addEventListener('click',()=>{
   if(generate.disabled)return;
   try{input.value=String(secureDie(10));input.dataset.hmkAutoDice=input.value;
    input.dispatchEvent(new Event('input',{bubbles:true}));refresh();}
   catch(err){heading.textContent='Generátor d10 selhal: '+String(err?.message||err);}
  });
  accept.addEventListener('click',()=>{
   if(accept.disabled||!valid(input,10))return;
   entry.accepted=input.value;entry.source=source(input);refresh();
   const next=stage.querySelector('.hmk-simple-current-93915 input');if(next)next.focus({preventScroll:true});
  });
 };
 function preview(){
  const r=routine();state.previewError='';state.preview=null;
  if(!needsPrimary(r))return null;
  if(!valid(primary,100)||state.primary!==primary.value)return null;
  try{
   const result=previewPrimary(form);
   if(!result||!['CF','F','S','CS'].includes(result.level)||!Number.isSafeInteger(result.stars))
    throw Error('Chybí ověřený výsledek původního Ritual/Trance.');
   state.preview=result;return result;
  }catch(err){state.previewError=String(err?.message||err);return null;}
 }
 function refresh(){
  const r=routine();if(!r)return;
  const primaryNeeded=!!needsPrimary(r),p=preview();
  const willNeeded=r.family==='divine'&&p?.level==='CF';
  let count=null;
  if(!primaryNeeded||p){
   if(r.family==='divine'){
    const val=form.elements.namedItem('moralityDifference')?.value?.trim();
    if(r.id==='festival-style'&&val==='')count=null;
    else {const delta=r.id==='festival-style'?Number(val):0;
     count=Number.isSafeInteger(delta)&&delta>=0&&delta<=20?
      (r.id==='festival-style'?Math.max(0,p.stars-delta):p.stars):null;}
   }else if(r.id==='astral-rite-member'&&!['S','CS'].includes(p?.level))count=0;
   else count=(form.elements.namedItem('specialOutsider')?.checked&&['astral-rite-member','astral-talisman'].includes(r.id))?2:1;
  }
  const pendingPrimary=primaryNeeded&&(state.primary!==primary.value||!valid(primary,100)||!p);
  const pendingWill=willNeeded&&!pendingPrimary&&(state.will!==will.value||!valid(will,100));
  if(count===null||pendingPrimary||pendingWill){
   // Do not keep previous SR confirmation across an incomplete primary / Will.
   if(state.dice.length)wipeDice();diceHolder.replaceChildren();
  }else if(state.dice.length!==count){wipeDice();diceHolder.replaceChildren();for(let i=0;i<count;i++)addDie(i);}
  const pendingDie=!pendingPrimary&&!pendingWill&&count!==null?state.dice.find(x=>x.accepted!==x.input.value||!valid(x.input,10)):null;
  const active= pendingPrimary?primary:pendingWill?will:pendingDie?.input||null;
  for(const [field,needed,accepted] of [[primary,primaryNeeded,state.primary],[will,willNeeded,state.will]]){
   const label=field.closest('label');const current=field===active,done=needed&&accepted===field.value&&valid(field,100);
   label.hidden=!needed;label.classList.toggle('hmk-simple-current-93915',current);
   label.classList.toggle('hmk-simple-done-93915',done);
   field.readOnly=!current;field.disabled=!needed;
   const generate=field.nextElementSibling;
   if(generate?.dataset?.hmkGeneralAutoDie)generate.disabled=!current;
   const accept=label.querySelector('[data-hmk-special-accept-93917]');
   if(accept){accept.hidden=!needed;accept.disabled=!current||!valid(field,100);}
  }
  for(const die of state.dice){const current=die.input===active,done=die.accepted===die.input.value&&valid(die.input,10);
   die.label.classList.toggle('hmk-simple-current-93915',current);die.label.classList.toggle('hmk-simple-done-93915',done);
   die.input.readOnly=!current;die.generate.disabled=!current;die.accept.disabled=!current||!valid(die.input,10);
  }
  const ready=!active&&count!==null&&(!primaryNeeded||!!p)&&(!willNeeded||state.will===will.value);
  state.complete=ready;submit.disabled=!ready;
  if(ready){raw.value=state.dice.map(d=>d.accepted).join(', ');
   const generated=state.dice.length>0&&state.dice.every(d=>d.source==='cryptographic-software-die');
   if(generated)raw.dataset.hmkAutoDice=raw.value;else delete raw.dataset.hmkAutoDice;
   form.__hmkSpecialDieSources93917=state.dice.map(d=>({faces:10,value:Number(d.accepted),source:d.source}));
  }else {raw.value='';delete raw.dataset.hmkAutoDice;form.__hmkSpecialDieSources93917=[];}
  reset.hidden=!(state.primary||state.will||state.dice.some(d=>d.accepted!==null));
  heading.textContent=active?'ČERVENÝ AKTIVNÍ HOD · '+
   (active===primary?'primární Ritual / Trance d100':active===will?'následný Will d100':
    ('Secondary d10 '+(state.dice.indexOf(pendingDie)+1)+'/'+state.dice.length))+
   ' · Generovat nebo zadat hodnotu → Vložit hodnotu.':
   state.previewError?'Primární hod není pravidlově ověřitelný: '+state.previewError:
   count===null?'Nejdřív potvrďte primární hod / odchylku MOR; počet d10 nelze odhadnout.':
   ready?(count?'Všechny povinné kostky jsou jednotlivě potvrzeny.':'Výsledek primárního hodu nevyžaduje žádné další d10.'):
   'Potvrďte předepsané hody před uložením.';
  if(state.previewError&&active===primary)heading.textContent+=' Ověření: '+state.previewError;
 }
 function addAccept(field){
  const label=field.closest('label');const button=document.createElement('button');button.type='button';
  button.className='secondary hc-small';button.setAttribute('data-hmk-special-accept-93917',field.name);
  button.textContent='Vložit hodnotu';label.append(button);
  const generator=field.nextElementSibling;
  if(generator?.matches?.('button[data-hmk-general-auto-die],button[data-hmk-skill-auto-die-93916]'))
   groupConfirmedDieControls93928(field,generator,button);
  button.addEventListener('click',()=>{
   if(button.disabled||!valid(field,100))return;
   if(field===primary){state.primary=field.value;state.will=null;wipeDice();}
   else {state.will=field.value;wipeDice();}
   refresh();const next=form.querySelector('.hmk-simple-current-93915 input');
   if(next)next.focus({preventScroll:true});
  });
  field.addEventListener('input',()=>{
   if(field===primary&&state.primary!==field.value){state.primary=null;state.will=null;wipeDice();}
   if(field===will&&state.will!==field.value){state.will=null;wipeDice();}
   refresh();
  });
 }
 addAccept(primary);addAccept(will);
 reset.addEventListener('click',()=>{resetAll();refresh();const first=form.querySelector('.hmk-simple-current-93915 input');first?.focus({preventScroll:true});});
 form.addEventListener('change',event=>{
  if(event.target===primary||event.target===will||event.target.matches('[data-hmk-special-dice-93917]')||
   event.target.name?.startsWith('specialDieStep'))return;
  if(['specialRoutine','specialPriest','specialRitual'].includes(event.target.name))resetAll();
  else if(['specialStyle','specialOutsider','moralityDifference'].includes(event.target.name))wipeDice();
  queueMicrotask(refresh);
 });
 const submitGate=event=>{
  if(event.target!==form)return;
  refresh();
  if(!state.complete){event.preventDefault();event.stopImmediatePropagation();
   heading.textContent='Uložení pozastaveno: nejprve potvrďte červený povinný hod.';
   form.querySelector('.hmk-simple-current-93915 input')?.focus({preventScroll:true});}
 };
 window.addEventListener('submit',submitGate,true);
 const observer=new MutationObserver(()=>{
  if(!form.isConnected){window.removeEventListener('submit',submitGate,true);observer.disconnect();}
 });
 observer.observe(root,{childList:true,subtree:true});
 refresh();
}
