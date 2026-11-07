from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedGroups93769=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:['Aktér A','Aktér B'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65},{id:'shock-'+id,name:'Shock',ml:65},{id:'initiative-'+id,name:'Initiative',ml:65},{id:'physician-'+id,name:'Physician',ml:60}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-sequential-93769',label:'Sequential',eventId:'init',gmConfirmed:true,characterIds:['a','b']});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__inspect93770=()=>({journal:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({kind:j.calendarTimeEpisode.kind,hazard:j.calendarTimeEpisode.hazardDetails,encounter:j.calendarTimeEpisode.encounter,start:j.calendarTimeEpisode.startMinute,end:j.calendarTimeEpisode.endMinute,weather:j.calendarTimeEpisode.weatherDay})),clock:data.campaignClock.minute,health:data.characters.map(c=>({id:c.id,wounds:c.hmk.healthState.wounds,followup:c.hmk.healthState.shockFollowup})),proofs:data.journal.filter(j=>j.skillTestProof).map(j=>({type:j.skillTestProof.type,title:j.title,minute:j.campaignMinute}))});
window.__status93769=()=>({minute:data.campaignClock.minute,storedMinute:JSON.parse(storageBaseline).campaignClock.minute,
 episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({kind:j.calendarTimeEpisode.kind,start:j.calendarTimeEpisode.startMinute,end:j.calendarTimeEpisode.endMinute,group:j.calendarTimeEpisode.sharedGroupId})),
 queued:sharedTimeWindowQueue.map(q=>({sourceId:q.sourceId,groupId:q.groupId,start:q.patch.startMinute,end:q.patch.endMinute})),
 group:sharedTimeWindowSelectedGroupId,notice,events:data.campaignClock.events.length});
window.__getAgenda93770=()=>{const a=require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);return {minute:data.campaignClock.minute,cap:episodeMandatoryWindow(),due:a.due.map(x=>({kind:x.kind,minute:x.minute,characterId:x.characterId,description:x.description})),next:a.all.filter(x=>x.minute>=data.campaignClock.minute).sort((a,b)=>a.minute-b.minute).slice(0,6).map(x=>({kind:x.kind,minute:x.minute,characterId:x.characterId,description:x.description}))};};
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
 print('ACCIDENT BUTTONS',page.locator('[data-episode-open-accident]').count(),flush=True)
 if page.locator('[data-episode-open-accident]').count():
  page.locator('[data-episode-open-accident]').first.click()
  print('AFTER NAV',page.evaluate('document.querySelector(".shell")?.innerText.slice(-900)'),flush=True)
  print('SKILL FIELDS',page.evaluate('Array.from(document.querySelectorAll("[data-skill-physical-impact] [name]")).map(e=>({name:e.name,type:e.type,value:e.value}))'),flush=True)
  sf=page.locator('[data-skill-physical-impact]')
  sf.locator('[name=targetId]').select_option('a')
  sf.locator('[name=agilityD100]').fill('99')
  for name,value in [('impactDie','6'),('zoneD10','5'),('locationD10','5'),('shockD100','50')]:
   sf.locator('[name='+name+']').fill(value)
  print('BEFORE SUBMIT',sf.inner_text()[-1400:],flush=True)
  sf.locator('button[type=submit]').first.click()
  assert page.evaluate('window.__inspect93770()')['health'][0]['wounds'], 'Accident failed to register wound in authoritative health state'
  assert page.evaluate('window.__inspect93770()')['clock']==488
  print('AFTER MEDICAL',page.evaluate('document.querySelector(".shell")?.innerText.slice(-1800)'), 'HEALTH',page.evaluate('window.__inspect93770()'), 'DIALOGS',dialogs,'ERRORS',errors,flush=True)
  choices=page.locator('[data-hmk-followup-choice-598] option').all_text_contents()
  print('AFTER MEDICAL FOLLOWUP OPTIONS',choices,flush=True)
  if any('Injury Morale' in c for c in choices):
   select=page.locator('[data-hmk-followup-choice-598]');select.select_option(label=next(c for c in choices if 'Injury Morale' in c))
   page.locator('[data-hmk-followup-open-598]').click()
   morale=page.locator('form[data-weather-injury-morale]')
   print('MORALE VIS',morale.count(),morale.inner_text()[-1000:],flush=True)
   morale.locator('[name=aberrance]').fill('0');morale.locator('[name=roll]').fill('31')
   morale.locator('[type=submit]').click()
   health=page.evaluate('window.__inspect93770()')
   assert any(x['type']=='weather-injury-morale' for x in health['proofs']), 'Injury Morale confirmation missing'
   assert health['health'][0]['wounds'][0]['moralePending'] is False, 'Morale not discharged'
   assert page.evaluate('window.__getAgenda93770()')['cap']['maxAllowed']==0, 'Treatment at 08:08 must block next calendar window'
   print('POST MORALE',page.evaluate('window.__inspect93770()'),'AGENDA',page.evaluate('window.__getAgenda93770()'),'ERRORS',errors,flush=True)
  tf=page.locator('#hmk-treatment-form');print('TREATMENT FORM',tf.count(),tf.inner_text()[-1300:] if tf.count() else '',flush=True)
  if tf.count():print('TREATMENT SELECTS',tf.evaluate('(n)=>Array.from(n.querySelectorAll("select")).map(s=>({name:s.name,val:s.value,options:Array.from(s.options).map(o=>[o.value,o.textContent])}))'),flush=True)
 assert not errors,errors
 print('PASS accident -> injury -> Injury Morale -> Treatment barrier at 08:08',flush=True)
 b.close()
