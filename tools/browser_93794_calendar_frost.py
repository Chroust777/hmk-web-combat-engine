"""v93.794 isolated browser regression: source-linked timed Treatment + extreme Frostbite UI and persistence-neutral preview."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8'); prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
# This isolated regression fixture mocks 14-step creation readiness, not production logic.
creation=mods['src/integration/hmk-character-creation.js']
for original,new in [
 ('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="espardo-93794")return {ready:true,missingSteps:[],issues:[],reason:""};'),
 ('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="espardo-93794")return [];'),
 ('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="espardo-93794")return true;')
]:
 assert original in creation,original
 creation=creation.replace(original,new,1)
mods['src/integration/hmk-character-creation.js']=creation
mods['app.js']+='''
window.__audit93794Seed=()=>{
 const H=require('./src/integration/persistent-combat-state.js');
 const W=require('./src/integration/hmk-weather-trauma-completion.js');
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const P=require('./src/integration/hmk-concurrent-procedures.js');
 const person={id:'espardo-93794',name:'Espardo Test',kind:'NPC',hmk:{attributes:{str:12,end:12,agl:12,dex:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{name:'Shock',ml:80}],healthState:H.initialCombatState()}};
 const s=person.hmk.healthState;s.environmentalHazards=[{id:'haz',sourceId:'frost-93794',kind:'cold',hr:5,initialHR:5,periodMinutes:60,active:true,lastElapsedMinutes:0,sequence:0,weaknessApplied:0,shockApplied:'NONE',skinPending:'frostbite',treatmentStarted:false}];
 s.events.push({id:'haz',type:'skill-trekking-weather-hazard',round:1,details:{}});
 const proof=W.prepareExposureSkinInjuries({actor:person,inventory:[],state:s,sourceId:'frost-93794',round:1,windD20:20,durationD20:20,originMinute:520,rows:[{location:'ha',side:'left',av:0,shockD100:10,gmFrostChoice:'G5',gmFrostReason:'GM potvrzuje omezení extrémní rány G5 se zachováním původního IL8'}],gmConfirmed:true,allLocationsReviewed:true});
 person.hmk.healthState=proof.state;person.hmk.healthState.mishaps=[]; // Synthetic fixture: immediate Injury Mishap already resolved before the timed Treatment began.
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:40,campaignId:'audit-cal93794',eventId:'clock-start93794',gmConfirmed:true,characterIds:[person.id]});
 const wound=person.hmk.healthState.wounds[0];
 const operation={formId:'hmk-treatment-form',characterId:person.id,woundId:wound.id,healerId:'healer-93794',startMinute:clock.minute,endMinute:clock.minute+5,eventId:'original-treatment-93794',confirmed:true,
   args:{daySinceInjury:0,physicianRoll:20,physicianIndex:8,physicianML:80,dexSecondaryModifier:0,available:['bandages'],procedureTime:{startMinute:520,endMinute:525,gmConfirmed:true}}};
 data=clean();data.characters=[person];data.journal=[];data.inventory=[];data.campaignClock=P.startConcurrentProcedure(clock,{id:'start-treatment-93794',procedure:operation});
 data.campaignClock.minute=525;data.campaignClock.events.push({id:'advance-c93794',type:'advance',minute:525,reason:'GM potvrzuje pět minut pro dokončení zákroku'});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);
 render();return {woundId:wound.id,minute:data.campaignClock.minute,procedures:P.openConcurrentProcedures(data.campaignClock),agenda:C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).due.map(x=>({kind:x.kind,startId:x.startId,woundId:x.woundId,minute:x.minute}))};
};
window.__audit93794State=()=>({minute:data.campaignClock.minute,wounds:persistentStateOf(character('espardo-93794')).wounds.length,open:require('./src/integration/hmk-concurrent-procedures.js').openConcurrentProcedures(data.campaignClock).length,view,section:activeSheetSection});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':960});page.set_default_timeout(10000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 try:
  seed=page.evaluate('window.__audit93794Seed()');print('SEEDED',seed,flush=True)
  assert any(x['kind']=='concurrent-treatment' and x['startId']=='start-treatment-93794' for x in seed['agenda']),seed
  link=page.locator('[data-cal-link][data-cal-kind="concurrent-treatment"][data-cal-concurrent-id="start-treatment-93794"]').first
  assert link.count()==1,'Calendar link missing persisted startId'
  link.click()
  route=page.evaluate('''()=>({node:document.querySelector('.hc-treatment-route-notice')?.textContent||null,row:document.querySelector('[data-medical-procedure="start-treatment-93794"]')?.className,finish:!!document.querySelector('[data-concurrent-medical-finish="start-treatment-93794"]'),focus:document.activeElement?.dataset.concurrentMedicalFinish,view:document.querySelector('body')?.innerText.slice(-500)})''')
  print('ROUTE',route,flush=True)
  assert route['node'] and 'Espardo Test' in route['node'] and seed['woundId'] in route['node'] and 'NYNÍ splatné' in route['node'],route
  assert route['finish'] and 'hc-medical-procedure-focus' in route['row'] and route['focus']=='start-treatment-93794',route
  assert page.evaluate('window.__audit93794State()')['minute']==525 and page.evaluate('window.__audit93794State()')['open']==1
  assert not errors,errors
  print('PASS v93.794 browser calendar original Treatment -> specific patient/procedure + visible action + no implicit write',flush=True)
 except BaseException:
  print('PAGE_ERRORS',errors,'BODY',page.locator('body').inner_text()[-1600:],flush=True);traceback.print_exc();raise
 finally:b.close()
