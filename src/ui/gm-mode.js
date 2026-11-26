/** Local presentation role only. Never touches campaign state or calls render(). */
// Set to false to restore password login after QA.
const GM_QA_WITHOUT_PASSWORD=true;
const KEY='hmk-keeper-gm-remember-v1';
const GM_PAGES=new Set(['calendar','encounter','gmhistory','backup','trash']);
let active=GM_QA_WITHOUT_PASSWORD;
if(!GM_QA_WITHOUT_PASSWORD){
 try{active=localStorage.getItem(KEY)==='1';}catch{/* storage unavailable: session only */}
}
const root=document.documentElement;
root.dataset.hmkGm=String(active);
export function gmPageAttribute(view){return GM_PAGES.has(view)?'data-hmk-gm-page':'';}
export function gmNavigationMarkup(){return `<div class="hmk-gm-navigation" aria-label="Režim GameMastera">
 <button type="button" data-hmk-gm-login${GM_QA_WITHOUT_PASSWORD?'':' aria-haspopup="dialog"'}>GameMaster</button>
 <span class="hmk-gm-status" data-hmk-gm-status>GameMaster přihlášen</span>
 <button type="button" data-hmk-gm-logout>Odhlásit se</button>
 </div>`;}
function setActive(next){
 active=next;root.dataset.hmkGm=String(active);
 for(const atlas of document.querySelectorAll('.atlas-workspace'))atlas.dispatchEvent(new CustomEvent('hmk-gm-mode-change',{detail:{active}}));
}
function openLogin(){
 if(active||document.querySelector('[data-hmk-gm-dialog]'))return;
 const dialog=document.createElement('dialog');dialog.className='hmk-gm-dialog';dialog.dataset.hmkGmDialog='';dialog.setAttribute('aria-labelledby','hmk-gm-dialog-title');
 dialog.innerHTML=`<form data-hmk-gm-form autocomplete="off">
 <h2 id="hmk-gm-dialog-title">GameMaster</h2>
 <label>Zadejte heslo <input name="password" type="password" autocomplete="off" required autofocus></label>
 <label class="hmk-gm-remember"><input name="remember" type="checkbox"> Zapamatuj si toto zařízení</label>
 <p role="status" aria-live="polite" data-hmk-gm-error></p>
 <div class="hmk-gm-dialog-actions"><button type="submit">Přihlásit</button><button type="button" data-hmk-gm-cancel>Zrušit</button></div>
 </form>`;
 const form=dialog.querySelector('form'),password=form.elements.password,error=dialog.querySelector('[data-hmk-gm-error]');
 dialog.addEventListener('close',()=>{dialog.remove();if(!active)document.querySelector('[data-hmk-gm-login]')?.focus({preventScroll:true});},{once:true});
 dialog.querySelector('[data-hmk-gm-cancel]').addEventListener('click',()=>dialog.close());
 form.addEventListener('submit',event=>{
  event.preventDefault();event.stopPropagation();
  if(password.value!=='anakin'){error.textContent='Nesprávné heslo.';password.value='';password.focus();return;}
  let remembered=true;
  try{if(form.elements.remember.checked)localStorage.setItem(KEY,'1');else localStorage.removeItem(KEY);}catch{remembered=false;}
  password.value='';setActive(true);dialog.close();
  if(!remembered&&form.elements.remember.checked)window.alert('Přihlášení je aktivní, ale prohlížeč nedovolil zařízení zapamatovat.');
  document.querySelector('[data-hmk-gm-logout]')?.focus({preventScroll:true});
 });
 document.body.appendChild(dialog);dialog.showModal();password.focus();
}
// Own handlers run before the application's general action dispatcher.
document.addEventListener('click',event=>{
 const target=event.target.closest?.('[data-hmk-gm-login],[data-hmk-gm-logout]');if(!target)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(target.hasAttribute('data-hmk-gm-login')){
  if(!GM_QA_WITHOUT_PASSWORD){openLogin();return;}
  setActive(true);
  document.querySelector('[data-hmk-gm-logout]')?.focus({preventScroll:true});
 }else{
  if(!GM_QA_WITHOUT_PASSWORD){try{localStorage.removeItem(KEY);}catch{}}
  setActive(false);
  document.querySelector('[data-hmk-gm-login]')?.focus({preventScroll:true});
 }
},true);
// Escape belongs to the login dialog only, not to an open campaign/Atlas editor.
window.addEventListener('keydown',event=>{
 const dialog=document.querySelector('[data-hmk-gm-dialog][open]');if(event.key!=='Escape'||!dialog)return;
 event.preventDefault();event.stopImmediatePropagation();dialog.close();
},true);
// Remembered login is browser-local; other devices have their own independent key.
// A logout in another tab of this browser also hides the controls here.
if(!GM_QA_WITHOUT_PASSWORD){
 window.addEventListener('storage',event=>{if(event.key===KEY||(event.key===null&&event.newValue===null))setActive(event.key===KEY&&event.newValue==='1');});
}
