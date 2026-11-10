"""HMK v93.780 candidate: REAL Chromium travel form audited across hazard paths; fixture only seeds campaign/characters/weather."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,sys,traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__auditHazardSeed=(label)=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 const key=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey;
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:'Výprava '+id,kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:75},{id:'hidework-'+id,name:'Hideworking',ml:75},{id:'awareness-'+id,name:'Awareness',ml:75},{id:'agility-'+id,name:'Agility',ml:75},{id:'animalcraft-'+id,name:'Animalcraft',ml:75},{id:'climbing-'+id,name:'Climbing',ml:75}],healthState:H.initialCombatState()}}));
 data.inventory=[{id:'item-a',characterId:'a',sourceItemId:'rope',snapshot:{id:'rope',name:'Testovací řemen',category:'other',properties:{weightLb:2,pricePence:3}},quantity:1,slot:'carried',condition:''}];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-hazards-'+label,label:'Test',eventId:'initial',gmConfirmed:true,characterIds:['a','b']});
 const day=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:10,landscape:'flat'});
 data.journal.push({id:'good-weather',characterId:'a',calendarCampaignId:key(data.campaignClock),campaignMinute:data.campaignClock.minute,createdAt:stamp(),title:'Test · Denní počasí · Les',body:'Real preconfirmed weather',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(data.campaignClock.minute/1440),area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay:day,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditHazardState=()=>({version:APP_VERSION,minute:data.campaignClock?.minute,storedMinute:JSON.parse(storageBaseline).campaignClock.minute,events:data.campaignClock.events.length,
 journal:data.journal.length,skillRows:data.journal.filter(x=>x.skillTestProof).map(x=>({id:x.id,type:x.skillTestProof.type,skill:x.skillTestProof.skill||x.skillTestProof.skills,level:x.skillTestProof.a?.level||x.skillTestProof.result?.level})),
 episodes:data.journal.filter(x=>x.calendarTimeEpisode).map(x=>({id:x.id,from:x.calendarTimeEpisode.startMinute,to:x.calendarTimeEpisode.endMinute,minutes:x.calendarTimeEpisode.minutes,memberIds:x.calendarTimeEpisode.memberIds,slow:x.calendarTimeEpisode.slow,baseSlow:x.calendarTimeEpisode.equipmentBaseSlow,carryIn:x.calendarTimeEpisode.equipmentSlowCarryIn,carryOut:x.calendarTimeEpisode.equipmentSlowCarryOut,movementMinutes:x.calendarTimeEpisode.movementMinutes,distance:x.calendarTimeEpisode.distanceMeters,nav:x.calendarTimeEpisode.navigationState,direction:x.calendarTimeEpisode.direction,hazards:x.calendarTimeEpisode.hazardDetails,delay:x.calendarTimeEpisode.travelDelay})),
 receipts:data.journal.filter(x=>x.calendarEpisodeEquipmentHazard).map(x=>x.calendarEpisodeEquipmentHazard),item:data.inventory.map(x=>({id:x.id,condition:x.condition,repair:x.hmkEquipmentRepair,usable:!require('./src/integration/hmk-equipment-serviceability.js').equipmentUnusable(x)})),health:data.characters.map(x=>({id:x.id,health:x.hmk.healthState?.wounds})),queue:sharedTimeWindowQueue.length,
 pending:sharedTimeWindowDraft&&{start:sharedTimeWindowDraft.startMinute,end:sharedTimeWindowDraft.endMinute},errors:sharedPlanState93771?.()?.errors});
window.__auditHazardReload=()=>{data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__auditHazardState();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1600,'height':1000});page.set_default_timeout(10000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 def run_case(case='F'):
  page.evaluate('(label)=>window.__auditHazardSeed(label)',case)
  print('SEED',case,page.evaluate('window.__auditHazardState()'),flush=True)
  page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last
  r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('travel')
  page.locator('[data-shared-row-run]').click()
  f=page.locator('#hmk-time-episode-form');assert f.is_visible()
  f.locator('[name=confirmed]').evaluate('(x)=>{if(!x.checked)x.click()}')
  def value(field,x):
   el=f.locator('[name="'+field+'"]')
   if el.count()==0:raise Exception('no input: '+field)
   if el.first.get_attribute('type')=='checkbox':el.first.set_checked(bool(x))
   elif el.first.evaluate('e=>e.tagName')=='SELECT':el.first.select_option(x)
   else:el.first.fill(str(x))
  def test_skill(which,roll):
   task=page.locator('[data-episode-skill-task]');print('TASKS',which,task.count(),task.evaluate_all('(n)=>n.map(x=>x.textContent.slice(0,100))')[:8],flush=True)
   task.first.click()
   sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   print('SKILL',which,sf.locator('[name]').evaluate_all('(n)=>n.map(x=>[x.name,x.value]).slice(0,24)'),flush=True)
   sf.locator('[name=rollA]').fill(str(roll));sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   return page.locator('#hmk-time-episode-form')
  for j in range(60):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   f.locator('[data-episode-evaluate]').click()
   field=f.get_attribute('data-episode-problem-field') or ''
   msg=f.get_attribute('data-episode-problem') or ''
   print('STEP',case,j,repr(field),msg[:180],flush=True)
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if field=='orientationProofId':f=test_skill('Survival', {'CS':10,'S':31,'F':91,'CF':95}.get(case,95));continue
   if field=='hazardEvidenceId':f=test_skill('Hideworking',{'CS':5,'S':21,'F':91,'CF':95}.get(case,21));continue
   if field=='hazardItemId':value('hazardItemId','item-a');continue
   if field=='hazardRepairSkill':value('hazardRepairSkill','Hideworking');continue
   if field=='hazardWorkerId':value('hazardWorkerId','a');continue
   if field=='hazardSkillLevel':value('hazardSkillLevel',case);continue
   if field=='survivalD10':value(field,'5' if case=='accident' else '8');continue
   if field=='directionD10':value(field,'3');continue
   if field=='confirmed':f.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   if field in ['temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub']:value(field,{'temperatureD10':5,'precipitationD10':10,'precipitationD6':6,'encounterD100':100,'encounterD100Sub':100}[field]);continue
   if field.startswith('end_'):value(field,5);continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg);value(field,','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field=='hazardAtMinute':value(field,20 if case in ('F','CF') else 60);continue
   if field=='' and page.locator('[data-episode-hazard-details]').is_visible():
    print('SURVIVAL FORM',case,f.locator('[data-episode-hazard-details]').inner_text()[-850:],flush=True)
    if case=='accident':
     if f.locator('[name=hazardAtMinute]').input_value()!='60':value('hazardAtMinute',60)
    else:
     if f.locator('[name=hazardComplicationSkill]').input_value()!='Climbing':value('hazardComplicationSkill','Climbing')
     if f.locator('[name=hazardWorkerId]').input_value()!='a':value('hazardWorkerId','a')
     if f.locator('[name=hazardSkillLevel]').input_value()!=case:value('hazardSkillLevel',case)
     if case in ('F','CF') and f.locator('[name=hazardAtMinute]').input_value()!='20':value('hazardAtMinute',20)
     if case=='CF' and not f.locator('[name=hazardComplicationRouteChanged]').is_checked():value('hazardComplicationRouteChanged',True)
    if page.locator('[data-episode-skill-task]').count():
     f=test_skill('Climbing',{'CS':5,'S':21,'F':91,'CF':95}.get(case,21))
    continue
   if field=='' and page.locator('[data-episode-skill-task]').count():
    f=test_skill('auto',21);continue
   print('UNHANDLED',case,field,msg,page.locator('[data-episode-checklist]').inner_text()[-1500:],flush=True)
   raise AssertionError((case,field,msg))
  else:raise AssertionError('not ready')
  print('PRESTAGE',case,page.evaluate('window.__auditHazardState()'),flush=True)
  page.locator('[data-episode-window-stage]').click()
  print('STAGE',case,page.evaluate('window.__auditHazardState()'),flush=True)
  page.locator('[data-episode-window-commit]').click()
  print('COMMIT',case,page.evaluate('window.__auditHazardState()'),'ERRORS',errors,'DIALOG',dialogs,flush=True)
  if '--reload' in sys.argv:
   before=page.evaluate('window.__auditHazardState()')
   after=page.evaluate('window.__auditHazardReload()')
   for key in ('minute','storedMinute','journal','episodes','receipts','item','health'):
    assert before[key]==after[key],('reload-mismatch',case,key,before[key],after[key])
   print('PASS RELOAD',case,'same clock, journal, navigation, hazards, item and health',flush=True)

  if '--next' in sys.argv:
   for next_i in range(1,4):
    page.locator('[data-shared-window-minutes]').fill('30');page.locator('[data-shared-window-create]').click()
    page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last
    r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('travel')
    page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
    f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
    print('NEXT START',next_i,page.evaluate('window.__auditHazardState()'),flush=True)
    for step in range(60):
     if page.locator('[data-episode-window-stage]').is_enabled():break
     f.locator('[data-episode-evaluate]').click()
     if page.locator('[data-episode-window-stage]').is_enabled():break
     field=f.get_attribute('data-episode-problem-field') or ''
     msg=f.get_attribute('data-episode-problem') or ''
     print('NEXT STEP',next_i,step,repr(field),msg[:130],flush=True)
     if field=='orientationProofId':f=test_skill('Survival next',31);continue
     if field=='confirmed':f.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
     if field.startswith('end_'):value(field,5);continue
     if field=='progressD10':
      m=re.search(r'vyžaduje (\d+) skutečných d10',msg);value(field,','.join('10' for _ in range(int(m.group(1)) if m else 1)));continue
     if field=='directionD10':value(field,'3');continue
     if field=='survivalD10':value(field,'10');continue
     if field in ('encounterD100','encounterD100Sub','precipitationD6'):value(field,'100' if field.startswith('encounter') else '6');continue
     raise AssertionError(('NEXT',next_i,field,msg))
    else:raise AssertionError('NEXT loop not ready')
    state=page.evaluate('window.__auditHazardState()')
    assert state['storedMinute']==540+30*(next_i-1)
    page.locator('[data-episode-window-stage]').click()
    page.locator('[data-episode-window-commit]').click()
    endstate=page.evaluate('window.__auditHazardState()')
    print('NEXT COMMIT',next_i,endstate,flush=True)
    assert endstate['minute']==540+30*next_i and endstate['events']==2+next_i
   assert not errors,errors

 run_case(sys.argv[1] if len(sys.argv)>1 else 'F')
 b.close()
