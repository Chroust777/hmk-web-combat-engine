from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedGroups93769=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:['Aktér A','Aktér B'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-sequential-93769',label:'Sequential',eventId:'init',gmConfirmed:true,characterIds:['a','b']});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__inspect93770=()=>({journal:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({kind:j.calendarTimeEpisode.kind,hazard:j.calendarTimeEpisode.hazardDetails,encounter:j.calendarTimeEpisode.encounter,start:j.calendarTimeEpisode.startMinute,end:j.calendarTimeEpisode.endMinute,weather:j.calendarTimeEpisode.weatherDay})),clock:data.campaignClock.minute});
window.__status93769=()=>({minute:data.campaignClock.minute,storedMinute:JSON.parse(storageBaseline).campaignClock.minute,
 episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({kind:j.calendarTimeEpisode.kind,start:j.calendarTimeEpisode.startMinute,end:j.calendarTimeEpisode.endMinute,group:j.calendarTimeEpisode.sharedGroupId})),
 queued:sharedTimeWindowQueue.map(q=>({sourceId:q.sourceId,groupId:q.groupId,start:q.patch.startMinute,end:q.patch.endMinute})),
 group:sharedTimeWindowSelectedGroupId,notice,events:data.campaignClock.events.length});
window.__simulateReload93769=()=>{
 data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;
 episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;
 restoreEpisodeDraftSidecar();render();return window.__status93769();
};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1600,'height':1050});page.set_default_timeout(13000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedGroups93769()')
 page.locator('[data-shared-window-minutes]').fill('30');page.locator('[data-shared-window-create]').click()
 print('AFTER CREATE',page.evaluate('window.__status93769()'),flush=True)
 def run(kind,minutes,actor='a',area='Camp'):
  form=page.locator('#hmk-time-episode-form');form.locator('[name=kind]').select_option(kind)
  form.locator('[name=guideId]').select_option(actor)
  for el in form.locator('[name=memberIds]').all():
   if el.get_attribute('value')==actor:
    if not el.is_checked():el.check()
   elif el.is_checked():el.uncheck()
  form.locator('[name=minutes]').fill(str(minutes))
  form.locator('[name=area]').fill(area)
  if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  for i in range(15):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if form.locator('[data-episode-evaluate]').is_disabled():raise AssertionError(('disabled',i,form.get_attribute('data-episode-problem')))
   form.locator('[data-episode-evaluate]').click()
   field=form.get_attribute('data-episode-problem-field') or ''
   msg=form.get_attribute('data-episode-problem') or ''
   print('LOOP',i,field,msg[:110],flush=True)
   if field in ('temperatureD10','precipitationD10'):
    form.locator('[name='+field+']').fill('5');continue
   if field=='survivalD10':form.locator('[name=survivalD10]').fill('5');continue
   if field=='hazardAtMinute':form.locator('[name=hazardAtMinute]').fill('8');continue
   if field in ('orientationProofId','droverProofId'):
    page.locator('[data-episode-skill-task]').first.click()
    skill=page.locator('#skill-value-form' if field=='orientationProofId' else '#skill-secondary-form')
    assert skill.count()==1
    skill.locator('[name=rollA]').fill('100' if kind=='travel' else '31');skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    form=page.locator('#hmk-time-episode-form');continue
   import re
   val={'precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100',
        'directionD10':'6','forageD10':'4'}.get(field)
   if field=='habitat':form.locator('[name=habitat]').select_option('mixed-forest');continue
   if field.startswith('end_'):val='5'
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
   if val is not None:
    form.locator('[name='+field+']').fill(val);continue
   if not field and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():
    form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   if not field and 'Accident: GM musí zadat přesnou minutu nehody' in page.locator('[data-episode-checklist]').inner_text():
    print('HAZARD DOM',form.locator('[name=hazardAtMinute]').evaluate('n=>{let a=n,arr=[];while(a&&arr.length<8){arr.push({tag:a.tagName,hidden:a.hidden,open:a.open,className:a.className});a=a.parentElement;}return arr}'),flush=True)
    page.locator('[data-episode-jump=hazardAtMinute]').first.click()
    print('AFTER JUMP',form.locator('[name=hazardAtMinute]').evaluate('n=>{let a=n,arr=[];while(a&&arr.length<8){arr.push({tag:a.tagName,hidden:a.hidden,open:a.open,className:a.className});a=a.parentElement;}return arr}'),flush=True)
    form.locator('[name=hazardAtMinute]').fill('8');continue
   if not field and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
    form.locator('[name=encounterResolution]').select_option('no-consequence');continue
   if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   if page.locator('[data-episode-window-stage]').is_enabled():break
   raise AssertionError((field,msg,page.locator('[data-episode-checklist]').inner_text()[-350:],form.locator('[name=confirmed]').is_checked(),page.locator('[data-episode-finalize]').is_disabled(),form.get_attribute('data-episode-problem'),page.locator('[data-episode-window-stage]').get_attribute('disabled'),page.locator('[data-episode-evaluate]').get_attribute('disabled')))
  else:raise AssertionError('not ready')
  page.locator('[data-episode-window-stage]').click()
  print('STAGED',page.evaluate('window.__status93769()'),flush=True)
 run('travel',20)
 run('rest',8,actor='b',area='Independent Camp')
 page.locator('[data-episode-window-commit]').click()
 result=page.evaluate('window.__status93769()')
 print('RESULT',result,'INTERNAL',page.evaluate('window.__inspect93770()'),'ERRORS',errors,'DIALOGS',dialogs,flush=True)
 assert result['minute']==488 and result['storedMinute']==488 and len(result['episodes'])==2,(result,errors,dialogs)
 assert result['episodes'][0]['end']==488 and result['episodes'][1]['end']==488
 assert any('08:08' in d for d in dialogs),dialogs
 assert not errors,errors
 page.locator('[data-shared-window-minutes]').fill('10');page.locator('[data-shared-window-create]').click()
 print('POST ACCIDENT NEW WINDOW',page.evaluate('window.__status93769()'),'DIALOGS',dialogs,flush=True)
 assert page.evaluate('window.__status93769()')['minute']==488
 assert any('V aktuální minutě je splatný povinný zdravotní test' in d for d in dialogs),dialogs
 print('PASS accident blocks subsequent windows until health procedure',flush=True)
 b.close()
