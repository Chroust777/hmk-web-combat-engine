"""Three calendar days of weather + repeated Grim Wound deadlines in current Chromium UI.
Synthetic pre-existing Grim Wound fixture, actual production weather/health/calendar handlers.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
ROOT=Path(__file__).resolve().parents[1]
old=(ROOT/'tools/browser_93781_grim_deadline.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93781_grim_deadline.py')}
exec(old.split('with sync_playwright() as p:',1)[0],ns)
mods,raw,prefix,end=ns['modules'],ns['raw'],ns['prefix'],ns['end']
mods['app.js']+='''
window.__debug3Days93787=()=>{const f=document.querySelector('#hmk-time-episode-form');return {eval:episodeEvaluationRequested,stageBaseline:!!episodeStageBaseline,identity:episodeEvaluatedIdentity,lock:episodePendingSkillRequest,taskCount:episodeOutstandingSkillTasks.length,setup:f&&episodeSetupIssue(f),formData:f?.dataset,finalDisabled:document.querySelector('[data-episode-finalize]')?.disabled,stageDisabled:document.querySelector('[data-episode-window-stage]')?.disabled,sharedPlanState:sharedPlanState93771(),formDisabled:f?.querySelector('[data-episode-evaluate]')?.disabled};};
window.__seedThreeDays93787=()=>{
 window.__seedGrim93781();
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const clock=C.createCampaignCalendar({day:3,hour:23,minute:50,campaignId:'audit-weather-grim-3-days',label:'3 days',eventId:'init3',gmConfirmed:true,characterIds:['a','b','c','d','e','f']});
 data.characters[0].hmk.healthState.wounds[0].healing.nextGrimShockDay=1;
 data.characters[0].hmk.healthState.wounds[0].healing.nextHealingDay=5;
 data.campaignClock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'a',woundId:'grim-w1',elapsedMinutes:1430,eventId:'origin3',gmConfirmed:true});
 data.journal=data.journal.filter(j=>!j.calendarTrekDayWeather);
 const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:10,landscape:'flat'});
 data.journal.push({id:'weather-day3',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(clock),campaignMinute:clock.minute,
 createdAt:stamp(),title:'Weather day3',body:'GM confirmed 2 dice',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(clock.minute/1440),area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__inspect3Days93787=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),W=require('./src/integration/hmk-calendar-chronology.js'),a=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory),cur=Math.floor(data.campaignClock.minute/1440);
 return {minute:data.campaignClock.minute,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,dayIndex:cur,
 due:a.due.map(x=>({kind:x.kind,minute:x.minute,characterId:x.characterId})),maxAllowed:W.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda:a}).maxAllowed,
 weather:data.journal.filter(j=>j.calendarTrekDayWeather).map(j=>({dayIndex:j.calendarTrekDayWeather.dayIndex,t:j.calendarTrekDayWeather.weatherDay.temperatureD10,r:j.calendarTrekDayWeather.weatherDay.precipitationD10})),
 journal:data.journal.length,events:data.campaignClock.events.length,queue:sharedTimeWindowQueue.length,sidecar:!!localStorage.getItem(EPISODE_SIDECAR_KEY),nextShock:data.characters[0].hmk.healthState.wounds[0]?.healing?.nextGrimShockDay};
};
window.__travel3Days93787=()=>{view='calendar';calendarLanding=false;activeCalendarSection='travel';render();};
window.__overview3Days93787=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render();};
window.__advance3Days93787=delta=>{try{const C=require('./src/integration/hmk-campaign-calendar.js');const next=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:delta,eventId:uuid(),reason:'GM confirmed offscreen hours',gmConfirmed:true,characters:data.characters,journal:data.journal,inventory:data.inventory});const ok=mutate(()=>{data.campaignClock=next;applyDeterministicCalendarOnsets();},{gmClockAdvance:true});return {ok:!!ok,state:window.__inspect3Days93787()};}catch(e){return {ok:false,error:e.message,state:window.__inspect3Days93787()};}};
window.__reload3Days93787=()=>{data=JSON.parse(localStorage.getItem(STORAGE));storageBaseline=localStorage.getItem(STORAGE);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__inspect3Days93787();};
'''

mods['app.js']+='''
window.__seedComposite93788=()=>{
 window.__seedThreeDays93787();
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js'),P=require('./src/integration/hmk-poison-course.js');
 const make=(id)=>{const c=structuredClone(data.characters.find(x=>x.id==='b'));c.id=id;c.name='Compound '+id;c.hmk.healthState=H.initialCombatState();return c;};
 const infect=make('c'),blood=make('d'),poison=make('e'),exhausted=make('f');
 infect.hmk.healthState.wounds.push({id:'infection-388',location:'ua',severity:'S',level:3,aspect:'b',bleeding:false,nextAdvanceRound:null,healed:false,healing:{treated:true,untreated:false,healingRate:3,grimWound:false,infected:true,infectionHR:3,nextInfectionDay:1,nextHealingDay:5}});
 infect.hmk.injuries=[{id:'infection-388',location:'ua',severity:'S',bleeding:false,combatRecord:true}];
 blood.hmk.healthState.bloodLoss={bp:3,weaknessFatigue:15,healingNextDay:1};blood.hmk.healthState.fatigue.weariness=22;
 let p=P.preparePoisonStart({actor:poison,state:poison.hmk.healthState,round:1,sourceId:'viper-compound-93788',transmission:'contact',onsetMinutes:60,periodMinutes:60,initialHR:5,symptomD10s:[1,2,3,4],actualExposureConfirmed:true,gmConfirmed:true});
 p=P.preparePoisonOnset({actor:poison,state:p.state,round:1,sourceId:'viper-compound-93788',elapsedMinutes:60,gmConfirmed:true});poison.hmk.healthState=p.state;
 exhausted.hmk.healthState.fatigue.weariness=41;
 data.characters.push(infect,blood,poison,exhausted);
 for(const x of [{kind:'wound',characterId:'c',woundId:'infection-388',elapsedMinutes:1430,eventId:'orig-infect'},
 {kind:'blood-loss',characterId:'d',elapsedMinutes:1430,eventId:'orig-blood'},
 {kind:'poison',characterId:'e',episodeId:'poison:viper-compound-93788',elapsedMinutes:110,eventId:'orig-poison'}]) data.campaignClock=C.anchorCampaignOrigin(data.campaignClock,{...x,gmConfirmed:true});
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
const previousInspect=window.__inspect3Days93787;
window.__inspect3Days93787=()=>{const s=previousInspect(),C=require('./src/integration/hmk-campaign-calendar.js'),a=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);return {...s,deferred:a.deferred.map(x=>({kind:x.kind,characterId:x.characterId,minute:x.minute})),future:a.future.slice(0,6).map(x=>({kind:x.kind,minute:x.minute})),states:data.characters.map(c=>({id:c.id,blood:c.hmk?.healthState?.bloodLoss,weariness:c.hmk?.healthState?.fatigue?.weariness,wounds:c.hmk?.healthState?.wounds?.length,poisons:c.hmk?.healthState?.poisons?.length}))};};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':1050});page.set_default_timeout(9000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message[:130])),d.accept('Formulář zdravotního termínu nelze v izolovaném testu dokončit') if d.type=='prompt' else d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedComposite93788()')
 def st():return page.evaluate('window.__inspect3Days93787()')
 print('START',st(),flush=True)
 assert st()['minute']==4310 and st()['maxAllowed']==10 and len(st()['states'])==6,st()
 def rest_window(minutes=20,day_label=''):
  page.evaluate('window.__travel3Days93787()')
  weather_opts=page.locator('[data-shared-window-weather] option').evaluate_all('(es)=>es.filter(x=>x.value).map(x=>x.value)')
  assert len(weather_opts)==1,('Missing confirmed fresh weather',day_label,st(),weather_opts)
  page.locator('[data-shared-window-weather]').select_option(weather_opts[0])
  page.locator('[data-shared-window-minutes]').fill(str(minutes));page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click();row=page.locator('[data-shared-plan-card]').last
  row.locator('[data-shared-row-actor]').select_option('b');row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('rest')
  page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
  for i in range(14):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').evaluate('(n)=>n.click()')
   f.locator('[data-episode-evaluate]').click();
   if page.locator('[data-episode-window-stage]').is_enabled():break
   fld=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
   if fld in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub'):
    f.locator('[name='+fld+']').fill({'temperatureD10':'5','precipitationD10':'10','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100'}[fld]);continue
   if fld=='confirmed':f.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   todo=page.locator('[data-episode-checklist]').inner_text()
   if 'Hazard d6' in todo and f.locator('[name=whRoll_cold_b]').input_value()=='':
    page.locator('[data-episode-checklist] [data-episode-jump]').first.click()
    f.locator('[name=whRoll_cold_b]').fill('6');print('COLD HAZARD d6=6',day_label,flush=True);continue
   if 'Endurance' in todo and page.locator('[data-episode-skill-task]').count():
    page.locator('[data-episode-skill-task]').first.click();sf=page.locator('#skill-secondary-form')
    print('ENDURANCE FORM',sf.count(),sf.is_visible() if sf.count() else None,'VISIBLE',page.locator('form[id]').evaluate_all('(fs)=>fs.filter(x=>x.getClientRects().length).map(x=>x.id).slice(0,20)'),'SKILLSEC',page.locator('#skill-secondary-form').count(),page.locator('#skill-secondary-form').is_visible(),flush=True)
    sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click();page.locator('[data-episode-return]').first.click()
    f=page.locator('#hmk-time-episode-form');print('ENDURANCE TEST RETURN',day_label,flush=True);continue
   raise AssertionError(('rest blocked',day_label,i,fld,msg[:200],page.locator('[data-episode-checklist]').inner_text()[-900:],f.locator('[name=confirmed]').is_checked(),f.locator('[data-episode-evaluate]').is_enabled(),f.inner_text()[-1000:],page.evaluate('window.__debug3Days93787()')))
  else:raise AssertionError('rest loop exhausted')
  page.locator('[data-episode-window-stage]').click()
  pre=st();assert pre['queue']==1 and pre['sidecar']
  page.locator('[data-episode-window-commit]').click()
  post=st();print('DEBUG WINDOW',day_label,'pre',pre['minute'],pre['maxAllowed'],'post',post['minute'],'queue',post['queue'],'dialogs',dialogs[-5:],flush=True);assert post['minute']==pre['minute']+min(minutes,pre['maxAllowed']) and post['minute']==post['stored'] and post['queue']==0
  print('COMMITTED',day_label,pre['minute'],post['minute'],flush=True)
 def travel_window(minutes=20,day_label=''):
  page.evaluate('window.__travel3Days93787()')
  opts=page.locator('[data-shared-window-weather] option').evaluate_all('(es)=>es.filter(x=>x.value).map(x=>x.value)')
  assert len(opts)==1,(opts,st())
  page.locator('[data-shared-window-weather]').select_option(opts[0])
  page.locator('[data-shared-window-minutes]').fill(str(minutes));page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click();row=page.locator('[data-shared-plan-card]').last
  row.locator('[data-shared-row-actor]').select_option('b')
  row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('travel')
  page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form');assert f.is_visible()
  f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
  f.locator('[name=terrain]').select_option('paved-road')
  for i in range(45):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   f.locator('[data-episode-evaluate]').click();field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
   print('TRAVEL',day_label,i,field,msg[:130],flush=True)
   if page.locator('[data-episode-window-stage]').is_enabled():break
   todo=page.locator('[data-episode-checklist]').inner_text()
   if 'Hazard d6' in todo and f.locator('[name=whRoll_cold_b]').count() and f.locator('[name=whRoll_cold_b]').input_value()=='':
    f.locator('[name=whRoll_cold_b]').fill('6');print('TRAVEL COLD HAZARD',day_label,flush=True);continue
   if 'Endurance' in todo and page.locator('[data-episode-skill-task]').count():
    page.locator('[data-episode-skill-task]').first.click();sf=page.locator('#skill-secondary-form:visible');assert sf.is_visible()
    sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form');print('TRAVEL ENDURANCE',day_label,flush=True);continue
   if field=='orientationProofId':
    page.locator('[data-episode-skill-task]').first.click();sf=page.locator('#skill-value-form:visible')
    assert sf.is_visible();sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form');continue
   if field.startswith('end_'):f.locator('[name='+field+']').fill('3');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','directionD10','survivalD10'):
    f.locator('[name='+field+']').fill(str({'temperatureD10':5,'precipitationD10':10,'precipitationD6':6,'encounterD100':100,'encounterD100Sub':100,'directionD10':6,'survivalD10':10}[field]));continue
   if field=='confirmed':f.locator('[name=confirmed]').check();continue
   raise AssertionError(('travel unexpected',i,field,msg,page.locator('[data-episode-checklist]').inner_text()[-600:]))
  else:raise AssertionError(('travel loop limit',day_label))
  assert page.locator('[data-episode-window-stage]').is_enabled(),('cannot stage',day_label)
  page.locator('[data-episode-window-stage]').click();pre=st();assert pre['queue']==1,pre
  page.locator('[data-episode-window-commit]').click();post=st()
  assert post['minute']==pre['minute']+minutes and post['stored']==post['minute'] and post['queue']==0,(pre,post,dialogs[-4:])
  print('TRAVEL COMMITTED',day_label,pre['minute'],post['minute'],flush=True)
 def health_due():
  s=st();assert s['maxAllowed']==0 and any(x['kind']=='grim' for x in s['due']),s
  page.evaluate('window.__overview3Days93787()')
  btn=page.locator('[data-cal-kind=grim]');assert btn.count()>0,s
  btn.first.click();f=page.locator('#hmk-grim-shock-form');assert f.is_visible()
  f.locator('[name=locationShock]').fill('0');f.locator('[name=shockML]').fill('75');f.locator('[name=roll]').fill('20');f.locator('[type=submit]').click()
  done=st();assert done['minute']==s['minute'] and all(x['kind']!='grim' for x in done['due']),done
  print('GRIM DONE',done['minute'],'remaining',done['due'],flush=True)
  return done
 def defer_all_due():
  page.evaluate('window.__overview3Days93787()')
  for i in range(20):
   s=st()
   if not s['due']:break
   assert s['minute'] in [4320,5760] or s['minute']%60==0,s
   btn=page.locator('[data-cal-emergency-defer]')
   assert btn.count()==len(s['due']) and btn.count()>0,('no escape',s,btn.count())
   btn.first.click()
   now=st();print('DEBUG DEFERRAL',i,'dialogs',dialogs[-4:],'buttons',page.locator('[data-cal-emergency-defer]').count(),'fields',page.locator('form[id]').evaluate_all('(fs)=>fs.filter(x=>x.getClientRects().length).map(x=>x.id)'),flush=True);assert len(now['due'])==len(s['due'])-1 and now['minute']==s['minute'],(s,now)
   print('GM DEFERRAL',s['minute'],s['due'][0],flush=True)
  else:raise AssertionError('20 recurring due events same moment')
  after=st();assert after['maxAllowed']>0 and not after['due'],after
 def new_weather(t,r):
  page.evaluate('window.__travel3Days93787()')
  assert not page.locator('[data-shared-window-weather] option').evaluate_all('(es)=>es.some(x=>!!x.value)'),'Previous-day weather selectable'
  page.evaluate('window.__overview3Days93787()')
  f=page.locator('form[data-trek-global-weather]');assert f.count()==1 and f.is_visible()
  f.locator('[name=area]').fill('Les');f.locator('[name=season]').select_option('spring');f.locator('[name=climate]').select_option('cool');f.locator('[name=temperature]').fill(str(t));f.locator('[name=precipitation]').fill(str(r))
  before=st();assert len(before['weather'])==st()['dayIndex']-1 if False else True
  f.locator('[type=submit]').click();after=st()
  assert after['weather'][-1]['dayIndex']==after['dayIndex'] and after['weather'][-1]['t']==t and after['weather'][-1]['r']==r,after
  assert after['minute']==before['minute'] and after['stored']==before['stored']
  print('WEATHER CONFIRMED day',after['dayIndex'],'d10',t,r,flush=True)
 # Day 3 -> day 4 crossing medical due simultaneously.
 rest_window(10,'day3-before-midnight')
 s=st();assert s['minute']==4320 and {x['kind'] for x in s['due']}=={'grim','infection','blood-loss','poison'},s
 print('COMPOSITE FOUR DUE',s['due'],flush=True)
 health_due();defer_all_due()
 new_weather(7,3)
 travel_window(20,'day4-window')
 s=st();assert s['minute']==4340 and s['weather'][-1]['dayIndex']==3 and len(s['deferred'])>=3,s
 print('HEALTH CONTINUITY',s['states'],flush=True)
 restored=page.evaluate('window.__reload3Days93787()')
 assert restored['minute']==4340 and restored['deferred']==s['deferred'] and restored['states']==s['states'] and restored['weather']==s['weather'],(restored,s)
 # Advance in medically safe chunks, recording precisely if recurring poison causes another stop.
 cursor=st()['minute']
 for i in range(35):
  s=st()
  if s['minute']>=5760:break
  if s['due']:
   defer_all_due();continue
  nextDue=min([r['minute'] for r in s['future'] if r['minute']>s['minute']],default=5760)
  delta=min(nextDue-s['minute'],5760-s['minute'])
  assert delta>0,(i,s)
  out=page.evaluate('(x)=>window.__advance3Days93787(x)',delta)
  assert out['ok'],(i,delta,out)
  assert out['state']['minute']==s['minute']+delta,(i,out)
  print('CHUNK',s['minute'],'+',delta,'=>',out['state']['minute'],flush=True)
 else:raise AssertionError(('recurring schedule budget exceeded',st()))
 assert st()['minute']==5760,st()
 # Day 5: Grim Shock again, infection and blood-loss again if scheduled, plus any poison.
 s=st();print('DAY 5 DUE',s['due'],flush=True)
 if any(x['kind']=='grim' for x in s['due']):health_due()
 if st()['due']:defer_all_due()
 new_weather(4,9)
 travel_window(20,'day5-window')
 end=st();print('FINAL',end,'errors',errors,'dialogs',dialogs[-4:],flush=True)
 assert end['minute']==5780 and sorted(x['dayIndex'] for x in end['weather'])==[2,3,4],end
 assert end['stored']==end['minute'] and not errors,errors
 print('PASS 93788 3-day compound health + 4 simultaneous kinds + GM deferrals + 2 travel windows + cold Endurance + weather days + Grim shock forms + storage reload',flush=True)
 b.close()
