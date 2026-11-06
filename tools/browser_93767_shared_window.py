from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedWindow93767=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c'].map((id,i)=>({id,name:['Průvodce A','Průvodce B','Odpočívající C'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-window-93767',label:'Concurrent Trek',eventId:'init',gmConfirmed:true,characterIds:['a','b','c']});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__windowValidate93767=()=>{try{return {ok:!!validate(data),rows:data.journal.length}}catch(e){return {error:e.message,stack:e.stack?.slice(0,900),rows:data.journal.length}}};
window.__windowState93767=()=>({minute:data.campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({id:j.id,start:j.calendarTimeEpisode.startMinute,end:j.calendarTimeEpisode.endMinute,memberIds:j.calendarTimeEpisode.memberIds,shared:j.calendarTimeEpisode.sharedWindowId})),windows:data.journal.filter(j=>j.calendarTimeWindow).length,queued:sharedTimeWindowQueue.length,stageBaseline:!!episodeStageBaseline,notice,medical:data.characters.map(c=>c.hmk.healthState.fatigue.weariness)});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1600,'height':1100});page.set_default_timeout(8500);err=[];dialogs=[]
 page.on('pageerror',lambda e:err.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedWindow93767()')
 print('ERRS',err,'STATE',page.evaluate('window.__windowState93767()'),flush=True)
 form=page.locator('#hmk-time-episode-form')
 print('FORM FIELDS',form.locator('input,select').count(),flush=True)
 print('SELECTS',form.locator('select').evaluate_all('(els)=>els.slice(0,18).map(e=>({name:e.name,value:e.value,opts:[...e.options].slice(0,5).map(x=>[x.value,x.text])}))'),flush=True)
 print('REST snippet',form.locator('select[name=kind]').evaluate('(e)=>[...e.options].map(x=>[x.value,x.text])'),flush=True)
 print('BUTTONS',page.locator('[data-episode-window-stage],[data-episode-window-commit]').count(),flush=True)
 page.locator('[data-shared-window-minutes]').fill('30')
 page.locator('[data-shared-window-create]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name=kind]').select_option('rest')
 form.locator('[name=minutes]').fill('20')
 form.locator('[name=area]').fill('Testovací tábor')
 print('INPUT VISIBLE?', form.locator('[name=temperatureD10]').evaluate('e=>({outer:e.outerHTML,parent:e.parentElement.outerHTML.slice(0,550),hiddenAncestor:e.closest("[hidden]")?.outerHTML.slice(0,260)})'),flush=True); form.locator('[name=temperatureD10]').evaluate("e=>{e.value='5';e.dispatchEvent(new Event('change',{bubbles:true}))}")
 form.locator('[name=precipitationD10]').evaluate("e=>{e.value='5';e.dispatchEvent(new Event('change',{bubbles:true}))}")
 form.locator('[name=confirmed]').evaluate("e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}")
 form.locator('[data-episode-evaluate]').click()
 print('CHECKLIST',page.locator('[data-episode-checklist]').inner_text()[:1700],flush=True); print('MEMBERS',form.locator('[name=memberIds]').evaluate_all('(els)=>els.map(x=>[x.value,x.checked])'),flush=True)
 print('STATUS',page.evaluate("window.__windowState93767()"),page.locator('[data-episode-finalize]').is_disabled(),page.locator('[data-episode-window-stage]').is_disabled(),flush=True)
 print('ERRS',err,'DIALOGS',dialogs,flush=True)
 assert page.locator('[data-episode-window-stage]').is_enabled()
 page.locator('[data-episode-window-stage]').click()
 print('AFTER GROUP A',page.evaluate('window.__windowState93767()'),'DIALOGS',dialogs,'ERRORS',err,flush=True)
 assert page.evaluate('window.__windowState93767()')['minute']==480
 assert page.evaluate('window.__windowState93767()')['queued']==1
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name=kind]').select_option('rest')
 form.locator('[name=minutes]').fill('30')
 form.locator('[name=guideId]').select_option('b')
 form.locator('[name=memberIds][value=a]').uncheck()
 form.locator('[name=memberIds][value=b]').check()
 form.locator('[name=area]').fill('Jiný tábor')
 form.locator('[name=confirmed]').evaluate("e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}")
 form.locator('[data-episode-evaluate]').click()
 print('AFTER B EVAL',page.locator('[data-episode-checklist]').inner_text()[:250],page.locator('[name=minutes]').input_value(),page.locator('[data-episode-window-stage]').is_disabled(),err,flush=True)
 for field in ['temperatureD10','precipitationD10']:
  form.locator('[name='+field+']').evaluate("e=>{e.value='5';e.dispatchEvent(new Event('change',{bubbles:true}))}")
 form.locator('[data-episode-evaluate]').click() if form.locator('[data-episode-evaluate]').is_enabled() else None
 print('B AFTER D10',page.locator('[data-episode-checklist]').inner_text()[:450],page.locator('[data-episode-window-stage]').is_disabled(),flush=True)
 page.locator('[data-episode-window-stage]').click()
 print('VALIDATE QUEUED',page.evaluate('window.__windowValidate93767()'),flush=True); print('AFTER GROUP B',page.evaluate('window.__windowState93767()'),'DIALOGS',dialogs[-2:],flush=True)
 assert page.evaluate('window.__windowState93767()')['minute']==480
 assert page.evaluate('window.__windowState93767()')['queued']==2
 page.locator('[data-episode-window-commit]').click()
 result=page.evaluate('window.__windowState93767()')
 print('FINAL',result,'DIALOGS',dialogs[-2:],'ERRORS',err,flush=True)
 assert result['minute']==510 and len(result['episodes'])==2 and result['windows']==1,(result,err,dialogs)
 assert not err,err
 browser.close()
