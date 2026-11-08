from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedRows93772=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c','d'].map((id,i)=>({id,name:['Aktér A','Aktér B','Aktér C','Aktér D'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:75},{id:'tracking-'+id,name:'Tracking',ml:75},{id:'awareness-'+id,name:'Awareness',ml:75},{id:'shock-'+id,name:'Shock',ml:70},{id:'physician-'+id,name:'Physician',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-rows-93772',label:'Plan',eventId:'init',gmConfirmed:true,characterIds:['a','b','c','d','pony-1','pony-2']});
 const ponyOne={id:'pony-1',name:'První poník',kind:'NPC',hmk:{verifiedMountedBreed:'pony',attributes:{agl:12,str:15,end:12,wil:12},healthState:H.initialCombatState()}};
 const ponyTwo={id:'pony-2',name:'Druhý poník',kind:'NPC',hmk:{verifiedMountedBreed:'pony',attributes:{agl:12,str:15,end:12,wil:12},healthState:H.initialCombatState()}};
 ponyOne.hmk.healthState.fatigue.weariness=24;ponyTwo.hmk.healthState.shock='UNC';
 data.characters.push(ponyOne,ponyTwo);
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
window.__auditState=()=>({minute:data.campaignClock?.minute,characters:data.characters.map(c=>({id:c.id,shock:c.hmk.healthState?.shock,wounds:c.hmk.healthState?.wounds?.length})),inventory:data.inventory,journal:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({id:j.id,actor:j.characterId,kind:j.calendarTimeEpisode.kind,modes:j.calendarTimeEpisode.orientation?.modes,foraging:j.calendarTimeEpisode.travelForaging?.length,meters:j.calendarTimeEpisode.distanceMeters,hazards:j.calendarTimeEpisode.hazardDetails})),nutrition:data.journal.filter(j=>j.calendarNutritionDay).length});window.__auditAnimalEpisodes=()=>data.journal.filter(j=>j.calendarTimeEpisode).map(j=>j.calendarTimeEpisode);window.__durableAnimalEpisodes=()=>JSON.parse(storageBaseline).journal.filter(j=>j.calendarTimeEpisode).map(j=>j.calendarTimeEpisode);window.__reloadRows93772=()=>{data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__statusRows93772();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1600,'height':1000});page.set_default_timeout(10000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 print('INIT',page.evaluate('window.__statusRows93772()'),errors,flush=True)
 page.locator('[data-shared-window-minutes]').fill('30');page.locator('[data-shared-window-create]').click()
 for actor in ['a','b','c','d']:
  page.locator('[data-shared-plan-add]').click(); r=page.locator('[data-shared-plan-card]').last
  r.locator('[data-shared-row-actor]').select_option(actor)
  r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option({'a':'travel','b':'forage','c':'tracking','d':'watch'}[actor])
 print('PLANS',page.evaluate('window.__statusRows93772()'),errors,flush=True)
 page.locator('[data-shared-row-run]').click()
 f=page.locator('#hmk-time-episode-form')
 print('FORM_VISIBLE',f.is_visible(), 'fields',f.locator('[name]').evaluate_all('(a)=>a.map(x=>({name:x.name,type:x.type,value:x.value})).filter(x=>/orientation|mode_|forag|habitat|tracking|encounter|weather/.test(x.name))'),flush=True)

 for i,mode in enumerate(['pace','forage','stealth','vigilance']):
  f=page.locator('#hmk-time-episode-form')
  if i==0:
   for animal in ('pony-1','pony-2'):
    selected=f.locator('[name=animalIds][value="'+animal+'"]')
    assert selected.is_visible(), 'Registered animal not visible '+animal
    selected.check()
   assert f.locator('[name=animalIds]:checked').count()==2
   beforeBlock=page.evaluate('window.__statusRows93772()')
   f.locator('[data-episode-evaluate]').click()
   message=f.get_attribute('data-episode-problem') or ''
   print('EXPECTED INCAPACITATED ANIMAL BLOCK',message,flush=True)
   assert 'zvíř' in message.lower() or 'shock' in message.lower() or 'pokračovat' in message.lower(),message
   assert page.evaluate('window.__statusRows93772()')['storedMinute']==beforeBlock['storedMinute'],'Animal failure moved clock'
   # First Evaluate freezes the identity; only emergency-reset can change participants.
   assert f.locator('[name=animalIds][value="pony-2"]').is_disabled()
   em=page.locator('[data-episode-emergency]')
   em.locator('summary').click()
   em.locator('[data-episode-emergency-confirm]').check()
   em.locator('[data-episode-emergency-reset]').click()
   reset=page.evaluate('window.__statusRows93772()')
   print('EMERGENCY RESET',reset,'DIALOGS',dialogs[-2:],flush=True)
   assert reset['minute']==beforeBlock['minute'] and reset['storedMinute']==beforeBlock['storedMinute']
   assert not reset['plans'] and reset['active'] is None and not reset['queue']
   page.locator('[data-shared-window-minutes]').fill('30');page.locator('[data-shared-window-create]').click()
   for actor in ['a','b','c','d']:
    page.locator('[data-shared-plan-add]').click(); r=page.locator('[data-shared-plan-card]').last
    r.locator('[data-shared-row-actor]').select_option(actor)
    r=page.locator('[data-shared-plan-card]').last
    r.locator('[data-shared-plan-kind]').select_option({'a':'travel','b':'forage','c':'tracking','d':'watch'}[actor])
   page.locator('[data-shared-row-run]').click()
   f=page.locator('#hmk-time-episode-form')
   f.locator('[name=animalIds][value="pony-1"]').check()
   assert f.locator('[name=animalIds]:checked').count()==1
   print('RECOVERED EDITABLE WITH ONE ANIMAL',flush=True)
  if i==0:
   f.locator('[name=orientationPriority]').evaluate("(n,v)=>{n.value=v;n.dispatchEvent(new Event('change',{bubbles:true}))}",'forage')
  if not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  print('ACTOR',i,mode,'START',flush=True)
  for step in range(32):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   f.locator('[data-episode-evaluate]').click()
   field=f.get_attribute('data-episode-problem-field') or ''
   msg=f.get_attribute('data-episode-problem') or ''
   print('ACTION',i,step,field,msg[:130],flush=True)
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','forageD10','directionD10','trackingD100'):
    node=f.locator('[name='+field+']');node.fill({'temperatureD10':'5','precipitationD10':'5','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100','forageD10':'10','directionD10':'6','trackingD100':'31'}[field]);continue
   if field.startswith('travelForageD10_'):
    f.locator('[name='+field+']').fill('10');continue
   if field.startswith('travelForageTarget_'):
    f.locator('[name='+field+']').select_option('food-water');continue
   if field in ('habitat','travelHabitat'):f.locator('[name='+field+']').evaluate("(n)=>{n.value='mixed-forest';n.dispatchEvent(new Event('change',{bubbles:true}))}");continue
   if field=='trackingTrail':f.locator('[name=trackingTrail]').fill('Pozorovaná zvěř');continue
   if field.startswith('end_'):f.locator('[name='+field+']').fill('5');continue
   if field in ('orientationProofId','droverProofId','trackingProofId','trackingAwarenessProofId'):
    task=page.locator('[data-episode-skill-task]')
    print('SKILL TASKS',task.count(),task.evaluate_all('(n)=>n.map(x=>({text:x.textContent.slice(0,70),html:x.outerHTML.slice(0,250)}))')[:8],flush=True)
    if task.count()==0:raise RuntimeError('No skill-task '+field)
    task.first.click()
    skill=page.locator('#skill-value-form' if field in ('orientationProofId','trackingProofId') else '#skill-secondary-form')
    print('SKILL FORM',skill.count(),skill.locator('[name]').evaluate_all('(a)=>a.map(x=>[x.name,x.value]).slice(0,30)') if skill.count() else '',flush=True)
    skill.locator('[name=rollA]').fill('25' if i!=0 else '31');skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    f=page.locator('#hmk-time-episode-form');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field=='confirmed':f.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   if field.startswith('whProof_') or field in ('hazardEvidenceId',):
    print('NEED SPECIAL SKILL',field,flush=True);break
   if not field and page.locator('[data-episode-skill-task]').count():
    task=page.locator('[data-episode-skill-task]').first
    print('EXTRA TASK',task.get_attribute('data-episode-skill-field'),task.get_attribute('data-episode-skill-task'),flush=True)
    task.click()
    skill=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    print('EXTRA SKILL FORM',skill.count(),skill.locator('[name]').evaluate_all('(a)=>a.map(x=>[x.name,x.value]).slice(0,15)') if skill.count() else '',flush=True)
    skill.locator('[name=rollA]').fill('30')
    skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    f=page.locator('#hmk-time-episode-form');continue
   print('CHECKLIST',page.locator('[data-episode-checklist]').all_text_contents(), 'RESULT',page.locator('[data-episode-result]').all_text_contents()[:4], 'DISABLED',page.locator('[data-episode-finalize]').evaluate_all('(n)=>n.map(x=>[x.disabled,x.title])'), 'BODY',page.locator('body').inner_text()[-1800:],flush=True)
   print('UNKNOWN',field,msg,'FIELDS',f.locator('[name]').evaluate_all('(a)=>a.map(x=>[x.name,x.value]).filter(x=>/forage|tracking|mode_|orientation|encounter|hazard/.test(x[0]))'),flush=True)
   break
  if i==2 and page.locator('[data-episode-window-stage]').is_enabled() and f.locator('[name=trackingTrail]').is_visible():
   trail=f.locator('[name=trackingTrail]');original=trail.input_value()
   assert original=='Pozorovaná zvěř',original
   trail.evaluate("(n)=>{n.value='Jiná stopa';n.dispatchEvent(new Event('input',{bubbles:true}))}")
   protected=f.locator('[name=trackingTrail]').input_value()
   print('TRAIL_TAMPER_CORRECTED',protected,'EXPECTED',original,flush=True)
   assert protected==original,'Změna zablokovaného názvu stopy musí být obnovena původní hodnotou'
   assert page.locator('[data-episode-window-stage]').is_enabled(),'Původní validní činnost musí zůstat dokončitelná'
  print('STAGE EN',page.locator('[data-episode-window-stage]').is_enabled(),flush=True)
  if not page.locator('[data-episode-window-stage]').is_enabled():break
  page.locator('[data-episode-window-stage]').click()
  print('STAGED',i,page.evaluate('window.__statusRows93772()')['queue'],flush=True)
 if page.locator('[data-episode-window-commit]').is_enabled():
  page.locator('[data-episode-window-commit]').click()
  print('FINAL',page.evaluate('window.__auditState()'),flush=True)
 finished=page.evaluate('window.__auditState()')
 assert finished['minute']==510,('Commit did not finish',finished,dialogs)
 assert [j['kind'] for j in finished['journal']]==['travel','forage','tracking','watch'], finished['journal']
 assert finished['journal'][0]['modes'],finished['journal'][0]
 episodes=page.evaluate('window.__auditAnimalEpisodes()')
 assert len(episodes)==4,episodes
 assert len(episodes[0]['animalHealth'])==1,episodes[0].get('animalHealth')
 assert episodes[0]['animalHealth'][0]['fatigue']>=20
 assert finished['characters'][-1]['shock']=='UNC','Incapacitated left-behind animal must remain UNC'
 assert episodes[0]['settings']['animalIds']==['pony-1']
 beforeReload=page.evaluate('window.__auditState()')
 copies=page.evaluate('window.__durableAnimalEpisodes()')
 page.evaluate('window.__reloadRows93772()')
 afterReload=page.evaluate('window.__auditState()')
 assert afterReload==beforeReload,'Reload changed actor health, journal, clock, or inventory'
 assert page.evaluate('window.__durableAnimalEpisodes()')==copies,'Serialized travel/foraging/stalking evidence changed across reload'
 assert page.locator('[data-shared-window-create]').count()>0,'Application did not return to usable calendar after reload'
 assert not errors,errors
 print('PASS incapacitated pony rejected with actionable UI, GM can uncheck, then 4 mixed activities complete',flush=True)
 print('ERRORS',errors,'DIALOGS',dialogs[-20:],flush=True)
 b.close()
