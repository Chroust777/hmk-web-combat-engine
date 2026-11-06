from pathlib import Path
from playwright.sync_api import sync_playwright
from re import search
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedTrekWindow93767=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c'].map((id,i)=>({id,name:['Průvodce A','Průvodce B','Odpočívající C'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-travel-window-93767',label:'Two treks',eventId:'init',gmConfirmed:true,characterIds:['a','b','c']});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__tamperActor93768=()=>{character('a').hmk.attributes.end+=1;};
window.__trekWindowState93767=()=>({minute:data.campaignClock.minute,events:data.campaignClock.events.length,
 episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({id:j.id,kind:j.calendarTimeEpisode.kind,metres:j.calendarTimeEpisode.distanceMeters,memberIds:j.calendarTimeEpisode.memberIds})),
 windows:data.journal.filter(j=>j.calendarTimeWindow).length,queued:sharedTimeWindowQueue.length,
 stageBaseline:!!episodeStageBaseline,notice,fatigue:data.characters.map(c=>persistentStateOf(c).fatigue.weariness)});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1600,'height':1050});page.set_default_timeout(12000);errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedTrekWindow93767()')
 page.locator('[data-shared-window-minutes]').fill('20')
 page.locator('[data-shared-window-create]').click()
 def trek(actor,area):
  f=page.locator('#hmk-time-episode-form')
  f.locator('[name=kind]').select_option('travel')
  f.locator('[name=conveyance]').select_option('foot')
  f.locator('[name=guideId]').select_option(actor)
  for n in f.locator('[name=memberIds]').all():
   if n.get_attribute('value')==actor:
    if not n.is_checked():n.check()
   elif n.is_checked():n.uncheck()
  f.locator('[name=area]').fill(area)
  if not page.evaluate('''()=>!!document.querySelector('[name=minutes]').readOnly'''):
   f.locator('[name=minutes]').fill('20')
  for i in range(50):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if f.locator('[data-episode-evaluate]').is_disabled():
    if not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').evaluate('(node)=>node.click()');continue
    raise AssertionError(('evaluate disabled',i,actor))
   f.locator('[data-episode-evaluate]').click()
   fld=f.get_attribute('data-episode-problem-field') or ''
   problem=f.get_attribute('data-episode-problem') or ''
   checklist=page.locator('[data-episode-checklist]').inner_text()
   print('TASK',actor,i,repr(fld),problem[:140],flush=True)
   if fld=='confirmed' or ('Potvrzení GM' in checklist and not fld):f.locator('[name=confirmed]').evaluate('(node)=>node.click()');continue
   if fld in ('orientationProofId','droverProofId'):
    page.locator('[data-episode-skill-task]').first.click()
    sf=page.locator('#skill-value-form' if fld=='orientationProofId' else '#skill-secondary-form');assert sf.count()==1
    sf.locator('[name=rollA]').fill('31');sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form');continue
   val={'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6','encounterD100':'100',
        'encounterD100Sub':'100','directionD10':'6'}.get(fld)
   if fld.startswith('end_'):val='5'
   if fld=='progressD10':
    m=search(r'vyžaduje (\d+) skutečných d10',problem);val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
   if val is not None:
    f.locator('[name="'+fld+'"]').fill(val);continue
   if not fld and 'Encounter · rozhodnutí GM' in checklist:
    f.locator('[name=encounterResolution]').select_option('no-consequence');continue
   raise AssertionError((actor,'unhandled prerequisite',fld,problem,checklist[-500:]))
  else:raise AssertionError(('never prepared',actor))
  print('READY',actor,area,page.evaluate('window.__trekWindowState93767()'),flush=True)
  page.locator('[data-episode-window-stage]').click()
  print('QUEUED',actor,page.evaluate('window.__trekWindowState93767()'),flush=True)
 trek('a','Road A')
 trek('b','Road B')
 before=page.evaluate('window.__trekWindowState93767()')
 assert before['queued']==2 and before['minute']==480 and before['episodes']==[]
 page.evaluate('window.__tamperActor93768()')
 page.locator('[data-episode-window-commit]').click()
 after=page.evaluate('window.__trekWindowState93767()')
 print('RESULT',after,'DIALOGS',dialogs[-2:],'ERRORS',errs,flush=True)
 assert after['minute']==480 and after['windows']==0 and len(after['episodes'])==0 and after['queued']==2,(after,dialogs,errs)
 assert any('změnil stav nebo vybavení' in d for d in dialogs),dialogs
 assert after['events']==1,(after,'no clock shift')
 assert not errs,errs
 (root/'docs/AUDIT_v93.768_stale_witness_rejection.json').write_text(json.dumps({'before':before,'after':after,'dialogs':dialogs,'errors':errs},ensure_ascii=False,indent=2))
 page.screenshot(path=str(root/'docs/AUDIT_v93.768_stale_witness_rejection.png'),full_page=True)
 b.close()
