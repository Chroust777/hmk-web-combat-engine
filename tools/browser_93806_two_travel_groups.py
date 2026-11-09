from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedRows93772=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c'].map((id,i)=>({id,name:['Aktér A','Aktér B','Aktér C'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-rows-93772',label:'Plan',eventId:'init',gmConfirmed:true,characterIds:['a','b','c']});
 const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});
 data.journal.push({id:'global-weather-snow',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'HMK · Denní počasí · Les',body:'Testovací globální počasí',
  calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(data.campaignClock.minute/1440),area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__statusRows93772=()=>({minute:data.campaignClock.minute,storedMinute:JSON.parse(storageBaseline).campaignClock.minute,
 draft:sharedTimeWindowDraft&&{start:sharedTimeWindowDraft.startMinute,end:sharedTimeWindowDraft.endMinute},
 plans:sharedTimeWindowPlans.map(p=>({id:p.id,actor:p.actorId,groupId:p.groupId,kind:p.kind,minutes:p.minutes,weatherId:p.weatherId,done:p.done})),
 slots:sharedPlanState93771(),active:sharedTimeWindowActivePlanId,auto:sharedEpisodeAutoRun93772,
 queue:sharedTimeWindowQueue.map(q=>({kind:q.kind,start:q.patch.startMinute,end:q.patch.endMinute,group:q.groupId})),
 journal:data.journal.length,events:data.campaignClock.events.length,weather:sharedWeatherSources93772().map(w=>w.id),campaign:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),weatherKey:data.journal[0]?.calendarCampaignId,day:Math.floor(data.campaignClock.minute/1440)});
window.__reloadRows93772=()=>{data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__statusRows93772();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1600,'height':1000});page.set_default_timeout(12000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 print('INIT',page.locator('[data-shared-window-weather]').count(),page.locator('[data-shared-window-weather]').input_value(),page.evaluate('window.__statusRows93772()'),errors,flush=True)
 assert page.locator('#hmk-time-episode-form').is_hidden(), 'old legacy form visible before interval'
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click()
 print('CREATED',page.evaluate('window.__statusRows93772()'),dialogs,errors,flush=True)
 assert page.locator('[data-shared-window-create]').is_hidden() and page.locator('[data-shared-window-minutes]').is_disabled()
 def add(actor,kind):
  page.locator('[data-shared-plan-add]').click()
  row=page.locator('[data-shared-plan-card]').last
  row.locator('[data-shared-row-actor]').select_option(actor)
  row=page.locator('[data-shared-plan-card]').last
  row.locator('[data-shared-plan-kind]').select_option(kind)
  return page.locator('[data-shared-plan-card]').last
 row=add('a','travel')
 row.locator('.hc-episode-group-members summary').click()
 row.locator('[data-shared-plan-member][value="b"]').check()
 row=page.locator('[data-shared-plan-card]').first
 row.locator('[data-shared-plan-guide][value="b"]').check()
 add('c','travel')
 plan=page.evaluate('window.__statusRows93772()')['slots']
 assert not plan['errors'],plan
 assert len(plan['scheduled'])==2
 assert plan['scheduled'][0]['memberIds']==['a','b']
 assert plan['scheduled'][0]['guideId']=='b'
 assert plan['scheduled'][1]['memberIds']==['c']
 assert page.locator('[data-shared-row-run]').is_enabled(),page.evaluate('window.__statusRows93772()')
 print('READY',page.evaluate('window.__statusRows93772()'),dialogs,errors,flush=True)
 page.locator('[data-shared-row-run]').click()
 print('RUN',page.evaluate('window.__statusRows93772()'),dialogs,errors,flush=True)
 assert page.locator('#hmk-time-episode-form').is_visible()
 for i in range(2):
  form=page.locator('#hmk-time-episode-form')
  if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  for j in range(30):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   form.locator('[data-episode-evaluate]').click()
   field=form.get_attribute('data-episode-problem-field') or ''
   msg=form.get_attribute('data-episode-problem') or ''
   print('RESULT',i,j,field,msg[:180],flush=True)
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','forageD10','directionD10'):
    form.locator('[name='+field+']').fill({'temperatureD10':'5','precipitationD10':'5','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100','forageD10':'4','directionD10':'6'}[field]);continue
   if field=='habitat':form.locator('[name=habitat]').select_option('mixed-forest');continue
   if field.startswith('end_'):form.locator('[name='+field+']').fill('5');continue
   if field in ('orientationProofId','droverProofId'):
    page.locator('[data-episode-skill-task]').first.click()
    skill=page.locator('#skill-value-form' if field=='orientationProofId' else '#skill-secondary-form')
    print('SKILL_NAV',page.locator('[data-episode-return]').count(),page.locator('.hc-episode-return-top').count(),errors,flush=True)
    skill.locator('[name=rollA]').fill('31');skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    form=page.locator('#hmk-time-episode-form');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    form.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   if not field and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
    form.locator('[name=encounterResolution]').select_option('no-consequence');continue
   raise AssertionError((field,msg,page.locator('[data-episode-checklist]').inner_text()[-1000:],dialogs,errors))
  assert page.locator('[data-episode-window-stage]').is_enabled(),page.evaluate('window.__statusRows93772()')
  page.locator('[data-episode-window-stage]').click()
  state=page.evaluate('window.__statusRows93772()');print('STAGE',i,state,'ERRORS',errors,'DIALOGS',dialogs,flush=True)
  assert len(state['queue'])==i+1
  if i==0:
   recovered=page.evaluate('window.__reloadRows93772()')
   print('RESTORED',recovered,flush=True)
   assert recovered['active'] is not None and len(recovered['queue'])==1 and recovered['storedMinute']==480
   assert page.locator('#hmk-time-episode-form').is_visible()
 assert page.locator('[data-episode-window-commit]').is_enabled()
 page.locator('[data-episode-window-commit]').click()
 end=page.evaluate('window.__statusRows93772()');print('END',end,'ERRORS',errors,'DIALOGS',dialogs,flush=True)
 assert end['storedMinute']==520 and end['events']==2
 assert not errors,errors
 print('PASS v93.806 browser: 2 travel groups, 2 guides, one proof per group, one clock commit',flush=True)
 b.close()
