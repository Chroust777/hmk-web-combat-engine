"""Isolated v93.774 browser regression; synthetic actors bypass Character Creation only inside this test.
Validates cold hazard receipt and independent post-episode medical handoff; full Frostbite location dice are not auto-invented.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);
mods['app.js']+='''
window.__seedColdTest=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 const camp=require('./src/integration/hmk-calendar-multi-campaign.js'),T=require('./src/integration/hmk-trekking-routine.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:['Aktér A','Aktér B'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65},{id:'endurance-'+id,name:'Endurance',ml:65},{id:'initiative-'+id,name:'Initiative',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-cold-93774',label:'Cold',eventId:'init',gmConfirmed:true,characterIds:['a','b']});
 const key=camp.campaignKey(data.campaignClock),weatherDay=T.trekWeatherDay({season:'winter',climate:'subpolar',temperatureD10:1,precipitationD10:1,landscape:'flat'});
 data.journal.push({id:'cold-weather',characterId:'a',calendarCampaignId:key,campaignMinute:480,createdAt:stamp(),title:'Počasí Mraz',body:'',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:0,area:'Mraz',season:'winter',climate:'subpolar',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 view='calendar';calendarLanding=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
 return {weather:weatherDay.daylightHazard,night:weatherDay.nightHazard};
};
window.__goColdHealth=()=>{selected='a';view='sheet';activeSheetSection='hazards';render();return {clock:data.campaignClock.minute};};
window.__statusCold=()=>({queued:sharedTimeWindowQueue.map(q=>({keys:Object.keys(q.patch||{}),weather:q.patch?.journal?.map(j=>({format:j.calendarTimeEpisode?.format,exposure:j.calendarTimeEpisode?.weatherExposure})),episode:q.patch?.calendarTimeEpisode?.weatherExposure,settings:q.patch?.settings?.weatherExposure})),minute:data.campaignClock.minute,journal:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({minute:j.calendarTimeEpisode.endMinute,exposure:j.calendarTimeEpisode.weatherExposure})),tasks:episodeOutstandingSkillTasks.map(x=>x.field)});
'''
# Synthetic Character Creation readiness is bypassed only in this isolated browser fixture.
creation_src=mods['src/integration/hmk-character-creation.js']
creation_src=creation_src.replace('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(["a","b"].includes(character?.id))return {ready:true,missingSteps:[],issues:[],reason:""};')
creation_src=creation_src.replace('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(["a","b"].includes(character?.id))return [];')
creation_src=creation_src.replace('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(["a","b"].includes(character?.id))return true;')
mods['src/integration/hmk-character-creation.js']=creation_src
mods['app.js']+='''
window.__setCreationFixture=()=>{const C=require('./src/integration/hmk-character-creation.js');for(const c of data.characters){c.hmk.creation=C.defaultCreation();c.hmk.creation.status='complete';c.hmk.creation.completed=Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,true]));c.hmk.creation.step=14;}render();};
window.__validateCold=()=>{const V=require('./src/integration/hmk-time-episodes.js').validateTimeEpisodes; const rows=structuredClone(data.journal); V(rows);const tests={original:'PASS'}; for(const key of ['inventoryWitness','gearSourceId','protection','effect']){const copy=structuredClone(rows),w=copy.find(j=>j.calendarTimeEpisode)?.calendarTimeEpisode.weatherExposure[0];if(key==='inventoryWitness')w.coldProtection.inventoryWitness='[123,null]';if(key==='gearSourceId')w.coldProtection.gearSourceId='forged';if(key==='protection')w.protection=3;if(key==='effect')w.effect='none';try{V(copy);tests[key]='ACCEPTED';}catch(err){tests[key]='REJECTED: '+err.message}}return tests;};
window.__coldHealthReport=()=>({minute:data.campaignClock.minute,weatherOnsets:data.journal.filter(j=>j.skillTestProof?.type==='skill-weather-onset').map(j=>({minute:j.campaignMinute,report:j.skillTestProof.report})),health:data.characters.map(c=>({id:c.id,wounds:persistentStateOf(c).wounds})),forms:document.querySelectorAll('form[data-skill-weather-skin]').length});
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1550,'height':900});page.set_default_timeout(6000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 print('WEATHER',page.evaluate('window.__seedColdTest()'),flush=True)
 page.locator('[data-shared-window-weather]').select_option('cold-weather')
 page.locator('[data-shared-window-minutes]').fill('30');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('rest')
 page.locator('[data-shared-row-run]').click()
 for i in range(15):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  f=page.locator('#hmk-time-episode-form')
  if not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  f.locator('[data-episode-evaluate]').click()
  name=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
  print('ITER',i,'field',name,'msg',msg[:180],'stage',page.locator('[data-episode-window-stage]').is_enabled(),flush=True)
  if page.locator('[data-episode-window-stage]').is_enabled():break
  if name.startswith('whRoll_'):f.locator('[name="'+name+'"]').fill('6');continue
  if name in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','survivalD10','forageD10'):f.locator('[name="'+name+'"]').fill('5');continue
  if name.startswith('whProof_'):
   print('TASKS',page.locator('[data-episode-checklist]').inner_text()[:1500],flush=True)
   print('SKILLBTNS',page.locator('[data-episode-skill-task]').count(),flush=True)
   if not page.locator('[data-episode-skill-task]').count():break
   page.locator('[data-episode-skill-task]').first.click()
   print('SKILLFORMS',page.locator('form').evaluate_all('(es)=>es.filter(x=>x.offsetWidth>0).map(x=>({id:x.id,fields:[...x.elements].filter(e=>e.name).map(e=>e.name).slice(0,15)})).slice(-6)'),flush=True)
   sk=page.locator('#skill-secondary-form')
   sk.locator('[name=rollA]').fill('100');sk.locator('button[type=submit]').click()
   print('AFTER SKILL',page.locator('body').inner_text()[-400:],flush=True)
   print('RETURN',page.locator('[data-episode-return]').count(),flush=True)
   page.locator('[data-episode-return]').first.click()
   continue
  if name.startswith('whAV_'):print('AV MISSING',msg,flush=True);break
  if not name and i==0:
   z=f.locator('[name=whRoll_cold_a]');print('WEATHER ROLL FIELD',z.count(),flush=True)
   if z.count():
    print('CHECK BUTTONS',page.locator('[data-episode-checklist] button').evaluate_all('(es)=>es.map(e=>({text:e.textContent.trim(),outer:e.outerHTML.slice(0,260)}))'),flush=True)
    page.locator('[data-episode-checklist] button').first.click()
    z.fill('6');continue
  if not name:
   print('CHECK',page.locator('[data-episode-checklist]').inner_text()[:1700],flush=True)
   print('RESULT',page.locator('#hmk-time-episode-form').inner_text()[-2200:],flush=True)
   print('FIELDS',f.evaluate('(f)=>({haz:f.elements.namedItem("weatherSafeShelter")?.value,kind:f.elements.namedItem("kind")?.value,source:f.elements.namedItem("weatherSource")?.value,weather:f.querySelector("[data-episode-weather-details]")?.outerHTML.slice(0,700)})'),flush=True)
   break
 else:print('MAX ITER')
 if page.locator('[data-episode-window-stage]').is_enabled():
  page.locator('[data-episode-window-stage]').click()
  print('STAGED',page.evaluate('window.__statusCold()'),flush=True)
  print('COMMIT ENABLED',page.locator('[data-episode-window-commit]').is_enabled(),flush=True)
  page.locator('[data-episode-window-commit]').click()
  print('COMMITTED',page.evaluate('window.__statusCold()'),flush=True)
 page.evaluate('window.__setCreationFixture()')
 proof_checks=page.evaluate('window.__validateCold()')
 assert proof_checks['original']=='PASS' and all(x.startswith('REJECTED:') for k,x in proof_checks.items() if k!='original'),proof_checks
 print('VALIDATOR',proof_checks,flush=True)
 print('AFTERCARE',page.evaluate("window.__goColdHealth()"),flush=True)
 onset=page.locator('form[data-skill-weather-onset]')
 print('AFTERCARE_FORMS',page.locator('form[data-skill-weather-onset]').count(),'BODY',page.locator('body').inner_text()[-2500:],flush=True)
 assert onset.count()==1, 'Cold exposure must require explicit aftercare'
 onset.evaluate('(f)=>f.closest("details").open=true')
 onset.locator('button[type=submit]').click()
 print('AFTER ONSET',page.evaluate("window.__coldHealthReport()"),flush=True)
 skin=page.locator('form[data-skill-weather-skin]')
 assert skin.count()==1, 'Critical Cold Exposure must offer separate Frostbite review'
 assert page.evaluate('window.__coldHealthReport().weatherOnsets[0].minute')==510
 assert len(page.evaluate('window.__coldHealthReport().health[0].wounds'))==0, 'No wound before separate skin review'
 print('PASS cold Hazard -> independent Endurance CF -> 30min commit -> Cold Exposure onset at 08:30 -> Frostbite form; no pre-confirmed wound',flush=True)
 assert not errors,errors
 b.close()
