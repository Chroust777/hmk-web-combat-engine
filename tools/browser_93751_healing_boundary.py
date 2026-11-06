"""Real Chromium isolated UI test: split five-day boundary and original Healing link."""
import json,traceback,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8'); marker='(()=>{const MOD='; assert raw.startswith(marker)
mods,end=json.JSONDecoder().raw_decode(raw[len(marker):]);mods['app.js']+='''
window.__auditSeed751=()=>{
 const CC=require('./src/integration/hmk-campaign-calendar.js');
 const ST=require('./src/integration/persistent-combat-state.js');
 const state=ST.initialCombatState();state.wounds.push({id:'w751',location:'ua',severity:'S',level:2,aspect:'e',bleeding:false,nextAdvanceRound:null,healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}});
 const actor={id:'pc751',name:'Průvodce léčením',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'sur751',name:'Survival',ml:70},{id:'end751',name:'Endurance',ml:60}],healthState:state}};
 let clock=CC.createCampaignCalendar({day:1,hour:8,minute:0,label:'E2E léčba',eventId:'seed751',gmConfirmed:true,campaignId:'audit751',characterIds:[actor.id]});
 clock=CC.anchorCampaignOrigin(clock,{kind:'wound',characterId:actor.id,woundId:'w751',eventId:'wound751',gmConfirmed:true});
 data=clean();data.characters=[actor];data.inventory=[];data.journal=[];data.campaignClock=clock;
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditState751=()=>({minute:data.campaignClock.minute,storedMinute:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,wound:structuredClone(character('pc751')?.hmk.healthState.wounds[0]),journalCount:data.journal.length,storedCount:JSON.parse(localStorage.getItem(STORAGE)).journal.length,view,selected,notice});
window.__auditReturnTravel751=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';episodeEvaluationRequested=false;timeEpisodeDraft={...episodeFreshDraft()};render();};
window.__auditAdvance751=()=>{
 const CC=require('./src/integration/hmk-campaign-calendar.js');
 data.campaignClock=CC.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:7200,eventId:'gm-step751',reason:'Isolated GM confirmed 5 days of rest',gmConfirmed:true,characters:data.characters,journal:data.journal});
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);
 activeCalendarSection='travel';view='calendar';episodeEvaluationRequested=false;timeEpisodeDraft={...episodeFreshDraft()};render();
};
'''
bundle=marker+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); page=b.new_page(viewport={'width':1480,'height':900});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__auditSeed751()');f=page.locator('#hmk-time-episode-form');assert f.count()==1
 try:
  assert page.evaluate('window.__auditState751()')['minute']==480
  # Choose a longer episode than the five-day healing deadline; the relevant GM action must be visible BEFORE Evaluate.
  f.locator('[name="kind"]').select_option('rest')
  f.locator('[name="minutes"]').fill('7201')
  button=page.locator('[data-episode-medical-boundary="7680"]')
  print('DEBUG pre-evaluation medical button count=',button.count(),'display=',page.locator('[data-episode-independent-due]').inner_text()[:380],flush=True)
  assert button.count()==1 and button.is_visible(),'Due healing boundary not navigable during setup'
  assert not page.locator('[data-episode-finalize]').is_enabled(),'No GM time commit should be possible when interval skips healing'
  assert page.evaluate('window.__auditState751()')['minute']==480
  button.click(timeout=7000)
  assert f.locator('[name="minutes"]').input_value()=='7200','Split button did not set exact 5-day interval'
  assert page.evaluate('window.__auditState751()')['minute']==480,'Split button unexpectedly advanced campaign time'
  # Deadline is now at the endpoint, so no premature healing roll / duplicate health write.
  assert page.locator('[data-episode-medical-boundary]').count()==0
  page.screenshot(path=str(root/'docs/AUDIT_v93.751_healing_boundary.png'))
  # Move the actual campaign to the witnessed boundary using its real calendar executor (not the browser UI).
  page.evaluate('window.__auditAdvance751()')
  assert page.evaluate('window.__auditState751()')['minute']==7680
  f=page.locator('#hmk-time-episode-form');f.locator('[name="kind"]').select_option('rest');f.locator('[name="minutes"]').fill('60')
  route=page.locator('[data-episode-medical-route="healing"]')
  assert route.count()==1 and route.is_visible(),'Due healing source not shown in travel panel'
  assert route.get_attribute('data-episode-medical-source')=='w751'
  assert not page.locator('[data-episode-finalize]').is_enabled()
  route.click(timeout=7000)
  heal=page.locator('#hmk-healing-roll-form');assert heal.count()==1 and heal.is_visible(),'GM route did not open native healing form'
  assert heal.locator('[name="wound"]').input_value()=='pc751::w751','Wrong patient/wound targeted'
  assert heal.locator('[name="endurance"]').input_value()=='12'
  assert heal.locator('[name="will"]').input_value()=='12'
  assert heal.locator('[name="roll"]').locator('xpath=ancestor::label[1]').get_attribute('class').find('hmk-medical-required-target')>=0,'Medical rule link must highlight exact d100 input in red'
  assert page.evaluate('window.__auditState751()')['minute']==7680
  before=page.evaluate('window.__auditState751()')
  heal.locator('[name="roll"]').fill('20')
  heal.locator('[type="submit"]').click(timeout=7000)
  after=page.evaluate('window.__auditState751()')
  print('DEBUG after healing',after,flush=True)
  assert after['minute']==after['storedMinute']==7680,'Native Healing added a second time charge'
  assert after['journalCount']>=before['journalCount'] and after['wound']['healed'] is True or after['wound']['healing']['nextHealingDay']>5,'Healing did not advance original wound'
  assert not errs,errs
  page.screenshot(path=str(root/'docs/AUDIT_v93.751_healing_confirmed.png'))
  # Return to the actual Travel form and GM-confirm an additional short episode.
  page.evaluate('window.__auditReturnTravel751()')
  travel=page.locator('#hmk-time-episode-form')
  assert travel.count()==1,'Original travel form could not be reopened'
  travel.locator('[name="kind"]').select_option('rest')
  travel.locator('[name="minutes"]').fill('60')
  traveller=travel.locator('[name="memberIds"][value="pc751"]')
  if not traveller.is_checked():traveller.check()
  shelter=travel.locator('[name="weatherSafeShelter"]')
  if shelter.count() and not shelter.is_checked():shelter.check()
  assert page.locator('[data-episode-medical-route="healing"]').count()==0,'Finished Healing is still blocking'
  travel.locator('[data-episode-evaluate]').click(timeout=7000)
  for step in range(25):
   fin=page.locator('[data-episode-finalize]')
   if fin.is_enabled():break
   f=page.locator('#hmk-time-episode-form');field=f.get_attribute('data-episode-problem-field') or ''
   issue=f.get_attribute('data-episode-problem') or ''
   print('CONTINUE STEP',step,field,issue[:130],flush=True)
   if field=='confirmed':f.locator('[name="confirmed"]').check();continue
   if field=='temperatureD10':f.locator('[name="temperatureD10"]').fill('5');continue
   if field=='precipitationD10':f.locator('[name="precipitationD10"]').fill('10');continue
   if field=='precipitationD6':f.locator('[name="precipitationD6"]').fill('6');continue
   if not field and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():f.locator('[name="confirmed"]').check();continue
   raise AssertionError('unexpected next-episode input '+field+' '+issue)
  else:raise AssertionError('next episode did not become ready')
  prior=page.evaluate('window.__auditState751()')
  assert prior['minute']==7680 and prior['storedMinute']==7680
  page.locator('[data-episode-finalize]').click(timeout=7000)
  final=page.evaluate('window.__auditState751()')
  assert final['minute']==final['storedMinute']==7740,final
  assert final['wound']['healed'] and final['journalCount']>prior['journalCount']
  assert not errs,errs
  page.screenshot(path=str(root/'docs/AUDIT_v93.751_healing_followup_travel.png'))
  print('PASS Chromium: full due Healing original confirmation + GM confirmed follow-up rest 7680->7740; no double minutes',flush=True)
 except Exception as exc:
  print('FAIL',repr(exc),flush=True);traceback.print_exc()
  page.screenshot(path=str(root/'docs/AUDIT_v93.751_healing_failure.png'))
  sys.exit(1)
 finally:b.close()
