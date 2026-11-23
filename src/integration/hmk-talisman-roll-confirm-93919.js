/** HMK v93.919 — presentation and early-submit gate for Talisman Bestowal.
 * The authoritative Trance/Will calculations and persistent effects remain
 * exclusively in the original app submit handler. Never touches Combat.
 */
const accepted=new WeakMap();
const integer=(v)=>/^\d+$/.test(String(v).trim())&&Number.isSafeInteger(Number(v))&&Number(v)>=1&&Number(v)<=100;
let installed=false;
export function decorateTalismanDice93919(root,secureDie,requiresWill){
 if(!root||typeof secureDie!=='function'||typeof requiresWill!=='function')return 0;
 if(!installed){installed=true;
  window.addEventListener('submit',event=>{
   const form=event.target;
   if(form?.id!=='hsk-talisman-bestowal'||!accepted.has(form))return;
   const s=accepted.get(form),primary=form.elements.namedItem('talismanTranceRoll'),secondary=form.elements.namedItem('talismanWillRoll');
   const needed=s.requiresWill(),valid=integer(primary.value)&&s.trance===primary.value&&
    (!needed||(integer(secondary.value)&&s.will===secondary.value))&&
    (needed||!String(secondary.value).trim());
   if(valid)return;
   event.preventDefault();event.stopImmediatePropagation();
   s.repaint();s.message.textContent='Uložení pozastaveno: každý povinný hod musí být samostatně potvrzen.';
  },true);
 }
 const form=root.querySelector('#hsk-talisman-bestowal');
 if(!form||accepted.has(form))return 0;
 const trance=form.elements.namedItem('talismanTranceRoll'),will=form.elements.namedItem('talismanWillRoll');
 if(!(trance instanceof HTMLInputElement)||!(will instanceof HTMLInputElement))return 0;
 const submit=form.querySelector('button[type="submit"]');if(!submit)return 0;
 const message=document.createElement('p');message.className='hmk-simple-roll-status-93915';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 submit.before(message);
 const s={trance:null,will:null,message,requiresWill:()=>false,repaint:null};accepted.set(form,s);
 for(const [field,name] of [[trance,'trance'],[will,'will']]){
  const confirm=document.createElement('button');confirm.type='button';confirm.className='secondary hc-small';confirm.textContent='Vložit hodnotu';confirm.setAttribute('data-hmk-talisman-accept-93919',name);
  const generate=document.createElement('button');generate.type='button';generate.className='secondary hc-small';generate.textContent='⚄ Generovat d100';generate.setAttribute('data-hmk-talisman-generate-93919',name);
  field.after(generate,confirm);
  for(const old of field.closest('label')?.querySelectorAll('[data-hmk-general-auto-die]')||[]){old.hidden=true;old.disabled=true;}
  generate.addEventListener('click',()=>{
   if(generate.disabled)return;
   const result=secureDie(100);if(!integer(result))throw Error('Generátor nevrátil platný d100');
   field.value=String(result);field.dataset.hmkAutoDice=String(result);field.dispatchEvent(new Event('input',{bubbles:true}));s.repaint();
  });
  confirm.addEventListener('click',()=>{
   if(confirm.disabled||!integer(field.value))return;
   s[name]=field.value;
   if(name==='trance'){s.will=null;will.value='';}
   s.repaint();
  });
  field.addEventListener('input',()=>{if(s[name]!==field.value)s[name]=null;
   if(name==='trance'){s.will=null;will.value='';}
   s.repaint();
  });
 }
 const reset=document.createElement('button');reset.type='button';reset.className='secondary hc-small';reset.textContent='Změnit potvrzené hody';reset.setAttribute('data-hmk-talisman-reset-93919','');submit.before(reset);
 reset.addEventListener('click',()=>{s.trance=null;s.will=null;trance.value='';will.value='';s.repaint();trance.focus();});
 form.addEventListener('change',e=>{
  if(e.target===trance||e.target===will)return;
  s.trance=null;s.will=null;trance.value='';will.value='';s.repaint();
 });
 s.requiresWill=()=>s.trance!==null&&integer(trance.value)&&requiresWill(form,trance.value);
 s.repaint=()=>{
  const primaryDue=s.trance!==trance.value||!integer(trance.value);
  const secondaryDue=!primaryDue&&s.requiresWill()&&(s.will!==will.value||!integer(will.value));
  const needed=!primaryDue&&s.requiresWill();
  trance.closest('label')?.classList.toggle('hmk-simple-current-93915',primaryDue);
  will.closest('label')?.classList.toggle('hmk-simple-current-93915',secondaryDue);
  will.closest('label')?.toggleAttribute('hidden',!needed);
  const a=form.querySelector('[data-hmk-talisman-accept-93919=trance]'),b=form.querySelector('[data-hmk-talisman-accept-93919=will]');
  const ag=form.querySelector('[data-hmk-talisman-generate-93919=trance]'),bg=form.querySelector('[data-hmk-talisman-generate-93919=will]');
  a.disabled=!primaryDue||!integer(trance.value);ag.disabled=!primaryDue;
  b.disabled=!secondaryDue||!integer(will.value);bg.disabled=!secondaryDue;
  trance.readOnly=!primaryDue;will.readOnly=!secondaryDue;
  reset.hidden=s.trance===null&&s.will===null;
  submit.disabled=primaryDue||secondaryDue;
  message.textContent=primaryDue?'ČERVENÝ AKTIVNÍ KROK 1 · Trance d100 → Vložit hodnotu':
   secondaryDue?'ČERVENÝ AKTIVNÍ KROK 2 · po Trance CF povinný Will d100 → Vložit hodnotu':
   'Povinné kostky potvrzené; původní pravidlové vyhodnocení provede zápis.';
 };
 s.repaint();return 1;
}
