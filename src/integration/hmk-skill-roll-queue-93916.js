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
