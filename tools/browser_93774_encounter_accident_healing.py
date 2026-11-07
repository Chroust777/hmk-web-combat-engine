"""HMK v93.773 composite travel / multi-patient medical regression.
Test-only: the synthetic three characters bypass Character Creation readiness and
creation-invariant checks; the production calendar, health, treatment and
travel resolvers are NOT altered. This does NOT certify Character Creation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__injuryState93773=()=>({minute:data.campaignClock.minute,accidents:data.journal.filter(j=>j.calendarTimeEpisode?.hazardDetails?.some(h=>h.hazard==='accident')).map(j=>({start:j.calendarTimeEpisode.startMinute,end:j.calendarTimeEpisode.endMinute,fullMinutes:j.calendarTimeEpisode.minutes,hazard:j.calendarTimeEpisode.hazardDetails.filter(h=>h.hazard==='accident'),distance:j.calendarTimeEpisode.distanceMeters,encounter:j.calendarTimeEpisode.encounter,encounterDetails:j.calendarTimeEpisode.encounterDetails})),health:data.characters.map(c=>({id:c.id,wounds:c.hmk.healthState.wounds})),injuryRows:data.journal.filter(j=>j.skillTestProof?.type==='skill-physical-consequence').map(j=>({minute:j.campaignMinute,actorId:j.characterId}))});
window.__seedRows93772=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c'].map((id,i)=>({id,name:['Aktér A','Aktér B','Aktér C'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65},{id:'shock-'+id,name:'Shock',ml:65},{id:'initiative-'+id,name:'Initiative',ml:65},{id:'physician-'+id,name:'Physician',ml:60}],healthState:H.initialCombatState()}}));
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
# Synthetic fixture only: bypass 14-step Character Creation gating, not health/travel rules.
creation_src = mods['src/integration/hmk-character-creation.js']
creation_src = creation_src.replace('function characterJournalReadiness(character) {', 'function characterJournalReadiness(character) {if(["a","b","c"].includes(character?.id))return {ready:true,missingSteps:[],issues:[],reason:""};')
creation_src = creation_src.replace('function creationRevisionIssues(character) {', 'function creationRevisionIssues(character) {if(["a","b","c"].includes(character?.id))return [];')
creation_src = creation_src.replace('function assertCreationInvariants(character) {', 'function assertCreationInvariants(character) {if(["a","b","c"].includes(character?.id))return true;')
mods['src/integration/hmk-character-creation.js'] = creation_src
mods['app.js'] += '\nwindow.__setCreationFixture93774=()=>{const C=require("./src/integration/hmk-character-creation.js");for(const c of data.characters){c.hmk.creation=C.defaultCreation();c.hmk.creation.status="complete";c.hmk.creation.completed=Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,true]));c.hmk.creation.step=14;}render();};window.__healthMarks93774=()=>({state:data.characters.map(c=>({id:c.id,health:persistentStateOf(c).wounds.map(w=>({id:w.id,moralePending:w.moralePending,treated:w.healing?.treated}))})), proof:data.journal.filter(j=>j.skillTestProof?.type?.includes("injury-morale")).map(x=>x.title),journal:data.journal.length});window.__ui93774=()=>({view,selected,activeSheetSection,activeSkillTab,encounterSelection:[...encounterSelection],notice});window.__goOverview93774=()=>{view="calendar";calendarLanding=false;activeCalendarSection="overview";render();};window.__goHazards93774=id=>{selected=id;view="sheet";activeSheetSection="hazards";render();};window.__auditAgenda93774=()=>{const C=require("./src/integration/hmk-campaign-calendar.js");const W=require("./src/integration/hmk-calendar-chronology.js");const a=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);return {due:a.due.map(x=>({kind:x.kind,characterId:x.characterId,minute:x.minute,sourceId:x.sourceId})),window:W.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda:a})};};window.__calendarReturn93774=()=>{view=\"calendar\";calendarLanding=false;activeCalendarSection=\"travel\";render();};\n'
mods['app.js'] += "\nwindow.__advanceAudit93774=delta=>{try{const C=require('./src/integration/hmk-campaign-calendar.js');const next=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:delta,eventId:uuid(),reason:'audit next day',gmConfirmed:true,characters:data.characters,journal:data.journal,inventory:data.inventory});const saved=mutate(()=>{data.campaignClock=next;applyDeterministicCalendarOnsets();},{gmClockAdvance:true});return {ok:!!saved,minute:data.campaignClock.minute};}catch(error){return {ok:false,error:error.message};}};window.__openProcedures93774=()=>require('./src/integration/hmk-concurrent-procedures.js').openConcurrentProcedures(data.campaignClock);"
mods['app.js'] += "\nwindow.__newWeather93774=()=>{const c=require('./src/integration/hmk-campaign-calendar.js');const key=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);const old=data.journal.find(j=>j.calendarTrekDayWeather?.area==='Les');const next=structuredClone(old);next.id=uuid();next.campaignMinute=data.campaignClock.minute;next.calendarCampaignId=key;next.calendarTrekDayWeather.dayIndex=Math.floor(data.campaignClock.minute/1440);next.createdAt=stamp();next.title+=' · další den';const saved=mutate(()=>{data.journal.push(next)});return {saved:!!saved,dayIndex:next.calendarTrekDayWeather.dayIndex,weather:sharedWeatherSources93772().map(w=>w.id)};};"
mods['app.js'] += "\nwindow.__gmProvisions93774=()=>{const key=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);const N=require('./src/integration/hmk-nutrition-days.js');for(const c of data.characters){data.journal.push({id:uuid(),characterId:c.id,calendarCampaignId:key,campaignMinute:data.campaignClock.minute,createdAt:stamp(),title:'Audit · GM doložil denní zásobování',body:'Test GM-confirmed food/water availability',calendarNutritionPolicy:N.createNutritionPolicy({campaignId:key,minute:data.campaignClock.minute,actorId:c.id,autoNeeds:true,gmProvisioned:true})});}localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);return data.journal.filter(j=>j.calendarNutritionPolicy).length;};"
mods['app.js'] += '\nwindow.__debugAccidents=()=>({rows:data.journal.filter(j=>j.calendarTimeEpisode?.hazardDetails?.some(h=>h.hazard==="accident")).map(j=>({id:j.id,campaignKey:require("./src/integration/hmk-calendar-multi-campaign.js").campaignKey(data.campaignClock),receiptKey:j.calendarCampaignId,skillId:j.calendarTimeEpisode.orientation?.skillId,hazards:j.calendarTimeEpisode.hazardDetails,hasResolution:data.journal.some(r=>r.skillTestProof?.type==="skill-physical-consequence"&&r.skillTestProof.sourceId===j.calendarTimeEpisode.orientation?.skillId)})),pendingExact:data.journal.filter(j=>j.calendarCampaignId===require("./src/integration/hmk-calendar-multi-campaign.js").campaignKey(data.campaignClock)&&j.calendarTimeEpisode?.hazardDetails?.some(h=>h.hazard==="accident"&&h.externalMedicalPending)).filter(j=>{const skillId=j.calendarTimeEpisode.orientation?.skillId;return skillId&&!data.journal.some(r=>r.calendarCampaignId===j.calendarCampaignId&&r.skillTestProof?.type==="skill-physical-consequence"&&r.skillTestProof.sourceId===skillId)}).length,journal:data.journal.filter(j=>j.skillTestProof).map(j=>({id:j.id,type:j.skillTestProof?.type,sourceId:j.skillTestProof?.sourceId})).slice(-20)});'
mods['app.js'] += '\nwindow.__debugHtml=()=>{const s=timeEpisodePageHTML(data.campaignClock,data.characters);return {accident:s.includes("data-episode-open-accident"),notice:s.includes("data-episode-encounter-reported"),p:s.slice(s.indexOf("data-episode-encounter-reported"),s.indexOf("data-episode-columns"))};};'
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
 assert page.evaluate('window.__gmProvisions93774()')==3
 print('INIT',page.locator('[data-shared-window-weather]').count(),page.locator('[data-shared-window-weather]').input_value(),page.evaluate('window.__statusRows93772()'),errors,flush=True)
 assert page.locator('#hmk-time-episode-form').is_hidden(), 'old legacy form visible before interval'
 page.locator('[data-shared-window-minutes]').fill('30');page.locator('[data-shared-window-create]').click()
 print('CREATED',page.evaluate('window.__statusRows93772()'),dialogs,errors,flush=True)
 assert page.locator('[data-shared-window-create]').is_hidden() and page.locator('[data-shared-window-minutes]').is_disabled()
 def add(actor,kind,minutes):
  page.locator('[data-shared-plan-add]').click()
  r=page.locator('[data-shared-plan-card]').last
  r.locator('[data-shared-row-actor]').select_option(actor)
  r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option(kind)
  assert minutes == 30
  return page.locator('[data-shared-plan-card]').last
 add('a','travel',30)
 add('b','travel',30)
 add('c','rest',30)
 assert page.locator('[data-shared-row-run]').is_enabled(), page.evaluate('window.__statusRows93772()')
 print('READY',page.evaluate('window.__statusRows93772()'),dialogs,errors,flush=True)
 page.locator('[data-shared-row-run]').click()
 print('RUN',page.evaluate('window.__statusRows93772()'),dialogs,errors,flush=True)
 assert page.locator('#hmk-time-episode-form').is_visible()
 for i in range(3):
  form=page.locator('#hmk-time-episode-form')
  if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  for j in range(30):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   form.locator('[data-episode-evaluate]').click()
   if i==0 and j==0:
    form.evaluate('f=>{f.elements.namedItem("encounterD100").value="99";f.elements.namedItem("encounterD100Sub").value="50";}')
   field=form.get_attribute('data-episode-problem-field') or ''
   msg=form.get_attribute('data-episode-problem') or ''
   print('RESULT',i,j,field,msg[:180],flush=True)
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','forageD10','directionD10'):
    form.locator('[name='+field+']').fill({'temperatureD10':'5','precipitationD10':'5','precipitationD6':'6','encounterD100':('95' if i==0 else '100'),'encounterD100Sub':'100','forageD10':'4','directionD10':'6'}[field]);continue
   if field=='survivalD10':form.locator('[name=survivalD10]').fill('5');continue
   if field=='hazardAtMinute':raise AssertionError('Manual accident minute should not be requested')
   if field=='habitat':form.locator('[name=habitat]').select_option('mixed-forest');continue
   if field.startswith('end_'):form.locator('[name='+field+']').fill('5');continue
   if field in ('orientationProofId','droverProofId'):
    page.locator('[data-episode-skill-task]').first.click()
    skill=page.locator('#skill-value-form' if field=='orientationProofId' else '#skill-secondary-form')
    assert page.locator('.hc-episode-return-top').is_visible(), 'Missing top-level calendar return'
    skill.locator('[name=rollA]').fill('100' if i<2 else '31');skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    form=page.locator('#hmk-time-episode-form');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    form.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
  
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
 assert end['storedMinute']==510 and end['events']==2
 assert page.locator('[data-episode-encounter-reported]').count()>=1, 'End-of-interval Encounter notice missing'
 assert not errors,errors
 print('ACCIDENT DOCUMENT',page.evaluate('window.__injuryState93773()'),flush=True)
 state=page.evaluate('window.__injuryState93773()')
 assert state['minute']==510 and len(state['accidents'])==2,state
 assert all(x['encounter']['found'] and x['encounterDetails'][0]['disposition']=='reported-to-gm' for x in state['accidents'][:1]),state
 assert state['accidents'][0]['distance']==2500 and state['accidents'][1]['distance']==2500,state
 assert all(x['hazard'][0]['medicalHandoffMinute']==510 for x in state['accidents']),state
 assert all(x['hazard'][0]['hazardAtMinute']==30 for x in state['accidents']),state
 print('DEBUG_AFTER_ENCOUNTER',page.evaluate('window.__debugAccidents()'),page.locator('[data-episode-open-accident]').count(),page.evaluate('window.__debugHtml()'),flush=True)
 page.evaluate('window.__calendarReturn93774()')
 print('DEBUG_REFRESHED',page.locator('[data-episode-open-accident]').count(),flush=True)
 assert page.locator('[data-episode-open-accident]').count(), 'Accident followup shortcut missing'
 print('PENDING INJURY BUTTONS',page.locator('[data-episode-open-accident]').count(),page.evaluate('window.__debugHtml()'),flush=True)
 page.locator('[data-episode-open-accident]').first.click()
 sf=page.locator('[data-skill-physical-impact]')
 assert sf.count(), 'Original injury flow missing'
 sf.locator('[name=targetId]').select_option('a')
 sf.locator('[name=agilityD100]').fill('99')
 for name,value in [('impactDie','6'),('zoneD10','5'),('locationD10','5'),('shockD100','50')]:
  sf.locator('[name='+name+']').fill(value)
 sf.locator('button[type=submit]').first.click()
 print('INJURY FORM ERROR',sf.locator('output').all_text_contents(),flush=True)
 print('INJURY DIALOGS',dialogs,'PAGE',errors,flush=True)
 after=page.evaluate('window.__injuryState93773()')
 print('INJURY AT END',after,flush=True)
 assert after['minute']==510 and after['injuryRows'][0]['minute']==510,after
 assert after['health'][0]['wounds'],after
 print('AFTER FIRST INJURY',after,flush=True)
 print('PENDING NEXT',page.locator('[data-episode-open-accident]').count(),page.evaluate('window.__debugHtml()'),flush=True)

 page.evaluate('window.__calendarReturn93774()')
 print('AFTER CALENDAR RETURN BUTTON COUNT',page.locator('[data-episode-open-accident]').count(),page.evaluate('window.__debugHtml()'),flush=True)
 assert page.locator('[data-episode-open-accident]').count()==1, 'B pending accident not navigable'
 page.locator('[data-episode-open-accident]').first.click()
 sf=page.locator('[data-skill-physical-impact]')
 print('SECOND FORM',sf.count(),sf.locator('[name=targetId]').all_text_contents(),flush=True)
 assert sf.count()
 sf.locator('[name=targetId]').select_option('b')
 sf.locator('[name=agilityD100]').fill('99')
 for name,value in [('impactDie','6'),('zoneD10','5'),('locationD10','5'),('shockD100','50')]:
  sf.locator('[name='+name+']').fill(value)
 sf.locator('button[type=submit]').first.click()
 end=page.evaluate('window.__injuryState93773()')
 print('BOTH',end,flush=True)
 assert sorted(x['actorId'] for x in end['injuryRows'])==['a','b']
 assert end['health'][0]['wounds'] and end['health'][1]['wounds']
 assert all(x['minute']==510 for x in end['injuryRows'])
 print('AGENDA AFTER DOUBLE INJURY',page.evaluate('window.__auditAgenda93774()'),flush=True)
 page.evaluate('window.__setCreationFixture93774()')
 page.evaluate('window.__goOverview93774()')
 print('BODY CURRENT',page.locator('body').inner_text()[:500],flush=True)
 print('DUE ROUTES',page.locator('[data-cal-kind]').evaluate_all('(es)=>es.slice(0,12).map(e=>({kind:e.dataset.calKind,tag:e.tagName,text:e.textContent.slice(0,80)}))'),flush=True)
 print('AVAILABLE MORALE FORMS',page.locator('form#combat-injury-morale-form').count(),page.locator('form[data-weather-injury-morale]').count(),page.locator('form#hmk-guided-mandatory-form').count(),flush=True)
 page.locator('[data-cal-kind=injury-morale]').first.click()
 print('BODY AFTER ROUTE',page.locator('body').inner_text()[:1000],flush=True)
 print('UI AFTER ROUTE',page.evaluate('window.__ui93774()'),flush=True)
 print('AFTER ROUTE',page.locator('form').evaluate_all('(es)=>es.filter(e=>e.offsetWidth>0).slice(-12).map(e=>({id:e.id,attrs:e.getAttributeNames().filter(n=>n.startsWith("data-")).map(n=>n+"="+e.getAttribute(n))}))'),flush=True)
 print('WEATHER MORALE HTML',page.locator('form[data-weather-injury-morale]').evaluate_all('(es)=>es.map(e=>e.outerHTML.slice(0,2800))'),flush=True)
 print('MORALE HTML',page.locator('#combat-injury-morale-form').evaluate_all('(es)=>es.map(e=>e.outerHTML.slice(0,1300))'),flush=True)
 for actor in ['a','b']:
  form=page.locator('form[data-weather-injury-morale]')
  assert form.count()==1,(actor,page.evaluate('window.__ui93774()'))
  form.locator('[name=aberrance]').fill('0')
  form.locator('[name=roll]').fill('10')
  print('MORALE VALID',form.evaluate('f=>({valid:f.checkValidity(),html:f.outerHTML.slice(0,900),submit:f.querySelector("[type=submit]").disabled})'),flush=True)
  form.locator('[type=submit]').click()
  print('MORALE DIALOGS',dialogs[-3:],'ERRORS',errors[-3:],flush=True)
  print('MORALE MARKS',page.evaluate('window.__healthMarks93774()'),flush=True)
  print('MORALE SAVED',actor,'RESULT',form.locator('output').all_text_contents(),page.evaluate('window.__auditAgenda93774()')['due'][:3],flush=True)
  page.evaluate('window.__goOverview93774()')
  next_morale=page.locator('[data-cal-kind=injury-morale]')
  if actor=='a':
   assert next_morale.count()>0
   next_morale.first.click()
 print('AFTER TWO MORALES',page.evaluate('window.__auditAgenda93774()')['due'],flush=True)
 assert len(page.evaluate('window.__auditAgenda93774()')['due'])==2
 assert all(x['kind']=='treatment' for x in page.evaluate('window.__auditAgenda93774()')['due'])
 page.locator('[data-cal-kind=treatment]').first.click()
 print('TREATMENT FORM',page.locator('#hmk-treatment-form').evaluate_all('(es)=>es.map(e=>e.outerHTML.slice(0,3200))'),flush=True)


 for who,healer in [('a','c'),('b','b')]:
  if who=='b':
   page.evaluate('window.__goOverview93774()')
   page.locator('[data-cal-kind=treatment]').first.click()
  form=page.locator('#hmk-treatment-form')
  print('TREATMENT SELECT',who,form.locator('[name=wound]').input_value(),form.locator('[name=healerId]').locator('option').all_text_contents(),flush=True)
  form.locator('[name=healerId]').select_option(healer)
  form.locator('[name=physicianRoll]').fill('10')
  print('TREATMENT BEFORE',who,form.evaluate('f=>({valid:f.checkValidity(),duration:document.querySelector("[data-weather-treatment-timing]")?.textContent,ml:f.elements.namedItem("physicianML")?.value})'),flush=True)
  form.locator('[type=submit]').click()
  print('AFTER START',who,page.evaluate('window.__auditAgenda93774()'),page.evaluate('window.__healthMarks93774()'),dialogs[-3:],errors[-3:],flush=True)
 print('CONCURRENT STATUS',page.evaluate('window.__statusRows93772()'),page.evaluate('window.__auditAgenda93774()'),flush=True)

 old=page.evaluate('window.__auditAgenda93774()')
 assert old['window']['maxAllowed']==15,old
 print('ADVANCE 15',page.evaluate('window.__advanceAudit93774(15)'),flush=True)
 page.evaluate('window.__goHazards93774("a")')
 print('FINISH BUTTONS',page.locator('[data-concurrent-medical-finish]').count(),page.evaluate('window.__openProcedures93774()'),flush=True)
 for n in range(2):
  btn=page.locator('[data-concurrent-medical-finish]').first
  assert btn.count()==1,(n,page.evaluate('window.__openProcedures93774()'))
  btn.click()
  print('FINISH RESULT',n,page.evaluate('window.__healthMarks93774()'),page.evaluate('window.__auditAgenda93774()'),dialogs[-3:],errors[-3:],flush=True)
 print('HEALING FUTURE',page.evaluate('window.__auditAgenda93774()'),flush=True)
 assert not page.evaluate('window.__openProcedures93774()')
 assert all(x['treated'] is True for v in page.evaluate('window.__healthMarks93774()')['state'][:2] for x in v['health'])

 print('TOMORROW CALENDAR',page.evaluate('window.__advanceAudit93774(1395)'),page.evaluate('window.__auditAgenda93774()'),flush=True)
 assert page.evaluate('window.__statusRows93772()')['storedMinute']==1920
 page.evaluate('window.__calendarReturn93774()')
 print('TOMORROW WEATHER BEFORE',page.locator('[data-shared-window-weather]').evaluate_all('(es)=>es.map(e=>({v:e.value,opts:[...e.options].map(o=>[o.value,o.textContent])}))'),flush=True)
 print('TOMORROW WEATHER ADD',page.evaluate('window.__newWeather93774()'),flush=True)
 assert len(page.evaluate('window.__statusRows93772()')['weather'])>=1
 page.evaluate('window.__calendarReturn93774()')
 print('TOMORROW WEATHER AFTER',page.locator('[data-shared-window-weather]').evaluate_all('(es)=>es.map(e=>({v:e.value,opts:[...e.options].map(o=>[o.value,o.textContent])}))'),flush=True)
 print('TOMORROW MEDICAL',page.evaluate('window.__healthMarks93774()'),flush=True)
 page.locator('[data-shared-window-minutes]').fill('30')
 weatherOpt=page.locator('[data-shared-window-weather] option').evaluate_all('(es)=>es.map(e=>e.value).filter(Boolean)')
 assert len(weatherOpt)==1,weatherOpt
 page.locator('[data-shared-window-weather]').select_option(weatherOpt[0])
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 page.locator('[data-shared-plan-card]').last.locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-plan-card]').last.locator('[data-shared-plan-kind]').select_option('rest')
 assert page.locator('[data-shared-row-run]').is_enabled()
 page.locator('[data-shared-row-run]').click()
 for z in range(20):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  f=page.locator('#hmk-time-episode-form')
  if not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  f.locator('[data-episode-evaluate]').click()
  field=f.get_attribute('data-episode-problem-field') or ''
  print('NEXT DAY FORM FIELD',z,field,f.get_attribute('data-episode-problem'),flush=True)
  if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','forageD10','survivalD10','directionD10'):
   f.locator('[name='+field+']').fill('5');continue
  if field.startswith('end_'):f.locator('[name='+field+']').fill('5');continue
  if field=='habitat':f.locator('[name=habitat]').select_option('mixed-forest');continue
  if field=='confirmed':f.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
  if not field:continue
  raise AssertionError(field)
 assert page.locator('[data-episode-window-stage]').is_enabled()
 page.locator('[data-episode-window-stage]').click()
 assert page.locator('[data-episode-window-commit]').is_enabled()
 page.locator('[data-episode-window-commit]').click()
 print('NEXT DAY EPISODE',page.evaluate('window.__statusRows93772()'),page.evaluate('window.__healthMarks93774()'),flush=True)
 assert page.evaluate('window.__statusRows93772()')['storedMinute']==1950
 print('TO FIRST HEALING',page.evaluate('window.__advanceAudit93774(5760)'),page.evaluate('window.__auditAgenda93774()'),flush=True)
 assert page.evaluate('window.__statusRows93772()')['storedMinute']==7710
 assert sorted(x['characterId'] for x in page.evaluate('window.__auditAgenda93774()')['due'] if x['kind']=='healing')==['a','b']
 page.evaluate('window.__goOverview93774()')
 print('HEALING DUE BUTTONS',page.locator('[data-cal-kind=healing]').count(),page.evaluate('window.__auditAgenda93774()'),flush=True)
 assert page.locator('[data-cal-kind=healing]').count()>=2
 page.locator('[data-cal-kind=healing]').first.click()
 print('HEALING FORM HTML',page.locator('#hmk-healing-roll-form').evaluate_all('(es)=>es.map(e=>e.outerHTML.slice(0,5000))'),flush=True)

 for who,roll in [('a','10'),('b','99')]:
  if who=='b':
   page.evaluate('window.__goOverview93774()')
   assert page.locator('[data-cal-kind=healing]').count()>0
   page.locator('[data-cal-kind=healing]').first.click()
  f=page.locator('#hmk-healing-roll-form')
  print('HEALING INPUT',who,f.locator('[name=wound]').input_value(),f.locator('[name=endurance]').input_value(),f.locator('[name=will]').input_value(),flush=True)
  f.locator('[name=roll]').fill(roll)
  prior=page.evaluate('window.__auditAgenda93774()')
  f.locator('[type=submit]').click()
  afterDue=page.evaluate('window.__auditAgenda93774()')['due']
  assert len(afterDue)==len(prior['due'])-1,(who,prior,afterDue)
  print('HEALING RESULT',who,page.evaluate('window.__healthMarks93774()'),page.evaluate('window.__auditAgenda93774()'),dialogs[-3:],errors[-3:],flush=True)
 print('AFTER HEALING DUE',page.evaluate('window.__auditAgenda93774()'),flush=True)
 assert page.evaluate('window.__auditAgenda93774()')['window']['maxAllowed']==7200
 assert len(page.evaluate('window.__auditAgenda93774()')['due'])==0
 assert not errors,errors
 print('AVAILABLE MORALE FIELDS',page.locator('#combat-injury-morale-form').all_text_contents()[:1],flush=True)

 evidence={
  'version':'v93.773',
  'scenario':'positive encounter + 2 CF accidents + third rest + 2 injury morale + 2 concurrent treatments + new-day weather + next-day rest + 2 synchronized healing rolls',
  'calendar_final_minute':page.evaluate('window.__statusRows93772()')['storedMinute'],
  'accidents':[{'workerId':x['hazard'][0]['workerId'],'at':x['hazard'][0]['medicalHandoffMinute'],'distanceMeters':x['distance']} for x in page.evaluate('window.__injuryState93773()')['accidents']],
  'injuries':page.evaluate('window.__injuryState93773()')['injuryRows'],
  'healing_next_window':page.evaluate('window.__auditAgenda93774()')['window']['maxAllowed'],
  'health':page.evaluate('window.__healthMarks93774()'),
  'js_errors':errors,
  'synthetic_creation_readiness_bypass':True,
  'assumed_daily_food_water_supply':'GM-attested; yes',
 }
 (Path('/mnt/data')/'HMK_v93.773_COMBINED_AUDIT_E2E_RESULT.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf8')
 print('PASS mixed encounter and double accident documents',flush=True)
 b.close()
