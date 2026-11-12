"""HMK v93.843 Equipment real Skill Test (adapts v93.780): REAL Chromium travel form audited across hazard paths; fixture only seeds campaign/characters/weather."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,sys,traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__auditWorkRead=()=>({minute:data.campaignClock?.minute,staged:sharedTimeWindowQueue.length,
 episodes:data.journal.filter(r=>r.calendarTimeEpisode).map(r=>({id:r.id,kind:r.calendarTimeEpisode.kind,work:r.calendarTimeEpisode.equipmentTimeWork93844,minutes:r.calendarTimeEpisode.minutes,memberIds:r.calendarTimeEpisode.memberIds})),
 item:data.inventory.map(i=>({id:i.id,status:i.hmkEquipmentRepair?.status,source:i.hmkEquipmentRepair?.sourceEpisodeId})),
 pending:require('./src/integration/hmk-equipment-time-work-93844.js').pendingEquipmentTimeWork93844(data.journal,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),data.campaignClock?.minute).map(x=>({source:x.sourceEpisodeId,rem:x.remainingMinutes,worker:x.repairWorkerId}))});

window.__auditHazardSeed=(label)=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 const key=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey;
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:'Výprava '+id,kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:75},{id:'hidework-'+id,name:'Hideworking',ml:75},{id:'textile-'+id,name:'Textilecraft',ml:75},{id:'awareness-'+id,name:'Awareness',ml:75},{id:'agility-'+id,name:'Agility',ml:75},{id:'animalcraft-'+id,name:'Animalcraft',ml:75},{id:'climbing-'+id,name:'Climbing',ml:75}],healthState:H.initialCombatState()}}));
 data.inventory=[{id:'item-a',characterId:'a',sourceItemId:'rope',snapshot:{id:'tunic',name:'Cloth Tunic',category:'other',properties:{weightLb:2.3,pricePence:45,material:'cloth'}},quantity:1,slot:'carried',condition:''}];
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
 receipts:data.journal.filter(x=>x.calendarEpisodeEquipmentHazard).map(x=>x.calendarEpisodeEquipmentHazard),item:data.inventory.map(x=>({id:x.id,condition:x.condition,repair:x.hmkEquipmentRepair,usable:!require('./src/integration/hmk-equipment-serviceability.js').equipmentUnusable(x)})),health:data.characters.map(x=>({id:x.id,health:x.hmk.healthState?.wounds})),queue:sharedTimeWindowQueue.length, clearCount:document.querySelectorAll('[data-episode-checklist] .hc-episode-all-clear').length, stageDisabled:document.querySelector('[data-episode-window-stage]')?.disabled,finishDisabled:document.querySelector('[data-episode-finalize]')?.disabled, hazardStatus:document.querySelector('[data-hazard-choice-status]')?.textContent,hazardButtonDisabled:document.querySelector('[data-hazard-choices-confirm]')?.disabled,hazardButtonHidden:document.querySelector('[data-hazard-confirmation]')?.hidden, hazardDetailsHidden:document.querySelector('[data-episode-hazard-details]')?.hidden, hazardLegend:document.querySelector('[data-episode-hazard-legend]')?.textContent,  hazardChoice:document.querySelector('[name=hazardChoices93840]')?.value?.slice(0,350), evalReq:episodeEvaluationRequested, episodeProblem:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem, pending:sharedTimeWindowDraft&&{start:sharedTimeWindowDraft.startMinute,end:sharedTimeWindowDraft.endMinute},errors:sharedPlanState93771?.()?.errors});
window.__auditHazardDraft=()=>({savedDisposition:timeEpisodeDraft.hazardEquipmentDisposition||'repair',savedItem:timeEpisodeDraft.hazardItemId||'',stamp:timeEpisodeDraft.hazardChoices93840||'',minute:data.campaignClock?.minute,journal:data.journal.length,storedMinute:JSON.parse(storageBaseline).campaignClock.minute});
window.__auditHazardReload=()=>{data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__auditHazardState();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]

MODE=sys.argv[1] if len(sys.argv)>1 else 'F'
assert MODE in ('F','S','CS','CF','ignore','abandon')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1560,'height':1180});page.set_default_timeout(12000)
 errors=[];dialogs=[];page.on('pageerror',lambda x:errors.append(str(x)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("()=>{const m=new Map(),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{value:x,configurable:true});Object.defineProperty(window,'sessionStorage',{value:x,configurable:true});}")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('(x)=>window.__auditHazardSeed(x)','TextileRepair-'+MODE)
 page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('a')
 r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('travel')
 r.locator('summary').first.click();r.locator('[data-shared-plan-member][value=b]').check()
 page.locator('[data-shared-row-run]').click()
 f=page.locator('#hmk-time-episode-form');assert f.is_visible()
 f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 evidence=root/'tools/evidence_93843';evidence.mkdir(exist_ok=True)
 def value(field,val):
  el=f.locator('[name="'+field+'"]');assert el.count()==1,field
  if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(val)
  else:el.fill(str(val))
 def test_skill(roll):
  global f
  task=page.locator('[data-episode-skill-task]').first
  assert task.count(),('missing-test',page.locator('[data-episode-checklist]').inner_text()[:900]);task.click()
  sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
  print('OPEN SKILL',sf.locator('[name]').evaluate_all('(x)=>x.map(e=>[e.name,e.value]).slice(0,15)'),flush=True)
  sf.locator('[name=rollA]').fill(str(roll));sf.locator('[type=submit]').click()
  page.locator('[data-episode-return]').first.click()
  f=page.locator('#hmk-time-episode-form')
 finishedSkill=False; confirmed=False
 for n in range(70):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click()
  field=f.get_attribute('data-episode-problem-field') or ''
  msg=f.get_attribute('data-episode-problem') or ''
  print('STEP',n,repr(field),msg[:160],flush=True)
  if field=='orientationProofId':test_skill(95);continue
  if field=='survivalD10':value(field,2);continue
  if f.locator('[data-hazard-equipment-workflow]').is_visible() and not confirmed:
   assert f.locator('[name=hazardRepairSkill]').get_attribute('type')=='hidden'
   assert f.locator('[data-hazard-skill-level]').is_hidden()
   assert f.locator('.hc-episode-hazard-proof > label').is_hidden()
   assert 'Výprava a' in f.locator('[data-hazard-equipment-party]').inner_text()
   before=page.evaluate('window.__auditHazardDraft()')
   value('hazardItemId','item-a')
   if MODE in ('ignore','abandon'):value('hazardEquipmentDisposition',MODE)
   else:value('hazardWorkerId','b')
   if MODE not in ('ignore','abandon'):assert f.locator('[data-hazard-repair-skill-text]').inner_text()=='Textilecraft'
   assert page.evaluate('window.__auditHazardDraft()')==before,'input incorrectly persisted'
   assert f.locator('[data-hazard-choice-status]').get_attribute('data-state')=='pending'
   f.locator('[name=hazardItemId]').focus();f.locator('[name=hazardItemId]').press('Enter')
   assert page.evaluate('window.__auditHazardDraft()')==before,'Enter incorrectly persisted'
   f.locator('[data-episode-hazard-details]').evaluate('(n)=>{for(let p=n;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true}')
   f.locator('[data-episode-hazard-details]').screenshot(path=str(evidence/'EQUIPMENT_CLOTH_BEFORE_CONFIRM.png'))
   f.locator('[data-hazard-choices-confirm]').click()
   assert page.evaluate('window.__auditHazardState()')['minute']==480
   print('AFTER CHOICE', f.locator('[data-hazard-choice-status]').inner_text(),f.locator('[data-hazard-choice-status]').get_attribute('data-state'),page.evaluate('window.__auditHazardState()'),page.evaluate('window.__auditHazardDraft()'),dialogs,flush=True)
   assert f.locator('[data-hazard-choice-status]').get_attribute('data-state')=='confirmed'
   confirmed=True
   continue
  if MODE not in ('ignore','abandon') and (field=='hazardEvidenceId' or (confirmed and not finishedSkill and page.locator('[data-episode-skill-task]').count())):
   assert f.locator('[data-hazard-repair-skill-text]').inner_text()=='Textilecraft'
   assert f.locator('[data-hazard-repair-start]').is_enabled()
   f.locator('[data-hazard-repair-start]').click()
   sf=page.locator('#skill-secondary-form:visible')
   assert sf.count(), 'wrong test tab'
   print('REPAIR SKILL',sf.locator('[name=primary]').input_value(),flush=True)
   assert sf.locator('[name=primary]').input_value()=='Textilecraft'
   sf.locator('[name=rollA]').fill(str({'F':91,'S':21,'CS':5,'CF':95}[MODE]));sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form')
   assert MODE in f.locator('[data-hazard-equipment-test-result]').inner_text()
   finishedSkill=True
   f.locator('[data-episode-hazard-details]').evaluate('(n)=>{for(let p=n;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true}')
   print('AFTER_SKILL_VISIBILITY',f.locator('[data-episode-hazard-details]').is_visible(),f.get_attribute('data-episode-problem-field'),page.evaluate('window.__auditHazardState()'),flush=True)
   page.screenshot(path=str(evidence/'EQUIPMENT_CLOTH_AFTER_SKILL.png'))
   continue
  if field.startswith('end_'):value(field,5);continue
  if field=='directionD10':value(field,'3');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg);value(field,','.join('10' for _ in range(int(m.group(1)) if m else 1)));continue
  if field in ('precipitationD6','temperatureD10','precipitationD10','encounterD100','encounterD100Sub'):
   value(field,6 if field=='precipitationD6' else (100 if field.startswith('encounter') else 5));continue
  if field=='confirmed':f.locator('[name=confirmed]').evaluate('(e)=>e.click()');continue
  if field=='' and f.locator('[data-hazard-choices-confirm]').is_enabled():
   f.locator('[data-hazard-choices-confirm]').click();continue
  if field=='':print('STATUS',page.evaluate('window.__auditHazardState()'),page.locator('[data-episode-checklist]').inner_text()[:1200],flush=True)
  raise AssertionError(('unhandled',field,msg))
 else:raise AssertionError('not ready')
 assert confirmed and (finishedSkill or MODE in ('ignore','abandon')),'not tested equipment decision'
 before=page.evaluate('window.__auditHazardState()');assert before['minute']==480
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 after=page.evaluate('window.__auditHazardState()')
 print('AFTER COMMIT',after,flush=True)
 assert after['minute']==540 and after['storedMinute']==540
 assert after['episodes'] and after['receipts'], 'missing saved equipment hazard'
 assert not errors,errors
 (evidence/('BROWSER_EQUIPMENT_'+MODE+'.json')).write_text(json.dumps({'before':before,'after':after,'dialog':dialogs,'errors':errors},ensure_ascii=False,indent=2))
 print('PASS Chromium Equipment',MODE,'Cloth Tunic / real commit; owner a, repairer b when relevant',flush=True)
 if MODE in ('F','CF'):
  ev=root/'tools/evidence_93844';ev.mkdir(exist_ok=True)
  pre=page.evaluate('window.__auditWorkRead()')
  assert pre['pending'][0]['rem']==240,pre
  # A real UI attempt to begin another ordinary Pochod before 240 minutes is completed MUST be rejected.
  page.locator('[data-shared-window-minutes]').fill('60')
  page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click()
  blocked=page.locator('[data-shared-plan-card]').last
  blocked.locator('[data-shared-row-actor]').select_option('a')
  blocked.locator('[data-shared-plan-kind]').select_option('travel')
  blocked.locator('summary').first.click()
  blocked.locator('[data-shared-plan-member][value=b]').check()
  page.locator('[data-shared-row-run]').click()
  blockedForm=page.locator('#hmk-time-episode-form')
  blockedForm.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
  blockedForm.locator('[data-episode-evaluate]').click()
  denial=(blockedForm.get_attribute('data-episode-problem') or '')+' '+page.locator('[data-episode-checklist]').inner_text()
  print('EXPECTED TRAVEL BLOCK',denial[:280],flush=True)
  assert 'Equipment' in denial and ('čeká' in denial or 'zakázan' in denial),denial
  assert page.locator('[data-episode-window-stage]').is_disabled()
  assert page.evaluate('window.__auditWorkRead()')==pre, 'blocked travel altered permanent state'
  page.locator('[data-shared-window-cancel]').click()
  assert page.evaluate('window.__auditWorkRead()')==pre,'cancel of blocked travel altered permanent state'
  # Only an explicit work-action click may authorize a future work receipt.
  for i in range(4):
   before=page.evaluate('window.__auditWorkRead()')
   page.locator('[data-shared-window-minutes]').fill('60')
   page.locator('[data-shared-window-create]').click()
   page.locator('[data-shared-plan-add]').click()
   r=page.locator('[data-shared-plan-card]').last
   r.locator('[data-shared-row-actor]').select_option('b')
   r.locator('[data-shared-plan-kind]').select_option('other')
   page.locator('[data-shared-row-run]').click()
   f=page.locator('#hmk-time-episode-form')
   # Ordinary selection/blur/Enter must not stamp or write an episode.
   workPanel=f.locator('[data-episode-equipment-time-duty]')
   assert workPanel.is_visible(),('No visible equipment work',i,workPanel.get_attribute('hidden'))
   assert '240 minut' in workPanel.inner_text()
   if i==0:
    workPanel.screenshot(path=str(ev/('EQUIPMENT_'+MODE+'_TIME_PANEL.png')))
   confirmedBefore=f.locator('[name=equipmentWorkSourceId]').input_value()
   assert not confirmedBefore,('premature authorization',confirmedBefore)
   f.locator('[name=equipmentWorkSourceId]').focus()
   f.locator('[name=equipmentWorkSourceId]').press('Enter')
   assert not f.locator('[name=equipmentWorkSourceId]').input_value(),'Enter authorized work'
   assert page.evaluate('window.__auditWorkRead()')==before,'input triggered a permanent write'
   f.locator('[data-episode-equipment-time-confirm]').click()
   assert f.locator('[name=equipmentWorkSourceId]').input_value()==before['pending'][0]['source']
   assert page.evaluate('window.__auditWorkRead()')==before,'confirmation wrote before final episode commit'
   for step in range(15):
    if page.locator('[data-episode-window-stage]').is_enabled():break
    if f.locator('[data-episode-evaluate]').is_enabled():f.locator('[data-episode-evaluate]').click()
    if page.locator('[data-episode-window-stage]').is_enabled():break
    field=f.get_attribute('data-episode-problem-field') or ''
    msg=f.get_attribute('data-episode-problem') or ''
    print('WORK',MODE,i,'STEP',step,field,msg[:130],flush=True)
    if field=='confirmed':f.locator('[name=confirmed]').evaluate('(e)=>e.click()');continue
    if field in ('precipitationD6','temperatureD10','precipitationD10'):
     f.locator('[name="'+field+'"]').fill('5');continue
    if field:raise AssertionError(('missing work',field,msg))
    else:raise AssertionError(('cannot stage work',msg, f.locator('[data-episode-evaluate]').is_enabled(),page.evaluate('window.__auditHazardState()'),f.locator('[data-episode-evaluate]').inner_text(),page.locator('[data-episode-checklist]').inner_text()[:1400]))
   assert page.locator('[data-episode-window-stage]').is_enabled(),'work not ready'
   page.locator('[data-episode-window-stage]').click()
   page.locator('[data-episode-window-commit]').click()
   current=page.evaluate('window.__auditWorkRead()')
   print('WORK PASS',MODE,i+1,current,flush=True)
   assert current['minute']==540+(i+1)*60
   if i<3:
    assert current['pending'][0]['rem']==240-(i+1)*60
    assert current['item'][0]['status']==('damaged' if MODE=='F' else 'irreparable')
   else:
    assert not current['pending']
    if MODE=='F':assert current['item'][0]['status']=='repaired'
    else: assert not current['item']
   if i==0:
    page.screenshot(path=str(ev/('EQUIPMENT_'+MODE+'_FIRST_60MIN.png')))
    # Rebuild the running UI from persisted campaign state (not an HTTP URL reload).
    reloaded=page.evaluate('window.__auditHazardReload()')
    reread=page.evaluate('window.__auditWorkRead()')
    assert reread==current,('Persistence mismatch after reinitializing UI',current,reread)
    assert reloaded['storedMinute']==600, 'calendar time not preserved after reopening'
  end=page.evaluate('window.__auditWorkRead()')
  (ev/('EQUIPMENT_'+MODE+'_WORK_E2E.json')).write_text(json.dumps({'initial':pre,'after':end,'errors':errors,'dialogs':dialogs},ensure_ascii=False,indent=2))
  assert not errors,errors
  print('PASS CHROMIUM v93.844:',MODE,'240 minutes across 4 explicit 60min work-activity commits',flush=True)
 b.close()
