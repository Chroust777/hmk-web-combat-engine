"""Actual Chromium UI clicks with production CSS/bundle via set_content (network URLs blocked); isolated 93.835 fixture only.
Never counts developer seed as UI completion. Deterministic test dice are explicit.
"""
from pathlib import Path
import json, threading, contextlib, traceback, sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
mods['app.js']+=r'''
window.__forage35Seed=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const a={id:'a',name:'Průvodce A',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'s',name:'Survival',ml:80},{id:'e',name:'Endurance',ml:65},{id:'t',name:'Tracking',ml:65}],healthState:H.initialCombatState()}};
 data.characters=[a];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit835',eventId:'start',gmConfirmed:true,characterIds:['a']});
 const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});
 data.journal.push({id:'weather-audit835',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'Auditní počasí',body:'Fixture 5/5',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(data.campaignClock.minute/1440),area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 selected='a';view='calendar';calendarLanding=false;activeCalendarSection='travel';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__forage35Tamper=()=>{
 const E=require('./src/integration/hmk-time-episodes.js'),S=require('./src/integration/hmk-foraging-supply-ledger.js');
 const original=structuredClone(data.journal);
 const audit=(modifier)=>{const j=structuredClone(original);modifier(j.find(x=>x.calendarTimeEpisode)?.calendarTimeEpisode,j);try{E.validateTimeEpisodes(j);return 'ACCEPTED';}catch(err){return 'REJECTED: '+err.message;}};
 return {original:audit(()=>{}),changedDie:audit(e=>{e.standaloneForaging[1].roll=1;}),
   lostMode:audit(e=>{e.standaloneForaging.pop();}),changedCarry:audit(e=>{e.standaloneForaging[0].carryOut.foodDays+=1;}),
   missingSurvival:audit((e,j)=>{j.splice(j.findIndex(x=>x.id===e.orientation.skillId),1);}),
   lots:S.supplyLots(original,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).length};
};
window.__forage35Snap=()=>{
 const S=require('./src/integration/hmk-foraging-supply-ledger.js'),cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 return {version:APP_VERSION,minute:data.campaignClock.minute,events:data.campaignClock.events.length,
  journal:data.journal.length,stored:JSON.stringify(data),baseline:storageBaseline,
  episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>j.calendarTimeEpisode),
  supply:S.supplyBalances(data.journal,cid),stage:sharedTimeWindowQueue.length,eval:episodeEvaluationRequested,
  error:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem||'',
  errorField:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblemField||'',
  modes:document.querySelector('#hmk-time-episode-form')?.dataset.episodeStationaryForagingModes||''};
};
'''
cr=mods['src/integration/hmk-character-creation.js']
for a,b in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert a in cr;cr=cr.replace(a,b)
mods['src/integration/hmk-character-creation.js']=cr
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,fmt,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
errors=[];dialogs=[];report={'script':'browser_93837_stationary_regression.py','checks':[],'errors':errors,'dialogs':dialogs}
def chk(c,name,info=None):
 assert c,(name,info);report['checks'].append({'name':name,'status':'PASS'})
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1540,'height':1000});page.set_default_timeout(12000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});}''')
  for style in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
   page.add_style_tag(content=(root/style).read_text('utf8'))
  page.add_script_tag(content=bundle)
  page.wait_for_function('!!window.__forage35Seed')
  page.evaluate('window.__forage35Seed()')
  before=page.evaluate('window.__forage35Snap()')
  chk(before['version']=='93.837' and before['minute']==480,'version and seeded campaign time')
  page.locator('[data-shared-window-minutes]').fill('60')
  chk(page.evaluate('window.__forage35Snap().stored')==before['stored'],'minutes typing cannot commit')
  page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click()
  card=page.locator('[data-shared-plan-card]').last
  card.locator('[data-shared-row-actor]').select_option('a')
  card=page.locator('[data-shared-plan-card]').last
  card.locator('[data-shared-plan-kind]').select_option('forage')
  card=page.locator('[data-shared-plan-card]').last
  if card.locator('[data-shared-plan-minutes]').count():
   card.locator('[data-shared-plan-minutes]').fill('60')
   card.locator('[data-shared-plan-minutes]').press('Tab')
  page.locator('[data-shared-row-run]').click()
  form=page.locator('#hmk-time-episode-form');chk(form.is_visible(),'UI opens stationary Foraging')
  form.locator('[data-episode-section=skills]>summary').click()
  chk(form.locator('[data-episode-orientation-new]').is_visible(),'UI shows mandatory new Orienteering fields')
  if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').click()
  form.locator('[data-episode-evaluate]').click()
  form=page.locator('#hmk-time-episode-form')
  chk(form.locator('[data-episode-section=rolls]').is_visible(),'explicit evaluate reveals the roll panel')
  form.locator('[data-episode-section=rolls]>summary').click()
  form.locator('[name=habitat]').select_option('mixed-forest')
  # Attempt to skip Orienteering with a pre-entered d10. It must not yield receipts.
  form.locator('[name=forageD10]').fill('10')
  form.locator('[name=forageD10]').press('Tab')
  pre=page.evaluate('window.__forage35Snap()')
  chk(pre['minute']==480 and not pre['episodes'] and pre['journal']==before['journal'],'d10 and blur do not create supplies or time')
  form.locator('[data-episode-evaluate]').click()
  a=page.evaluate('window.__forage35Snap()')
  chk(not a['episodes'] and a['errorField']=='orientationProofId','evaluate blocks standalone d10 without Survival SV',a)
  buttons=page.locator('[data-episode-skill-task][data-episode-skill-field="orientationProofId"]')
  chk(buttons.count()>0,'genuine Survival task button exposed')
  buttons.first.click()
  skill=page.locator('#skill-value-form')
  chk(skill.is_visible(),'Skill Tests opens by actual button')
  skill.locator('[name=rollA]').fill('31')
  skill.locator('[type=submit]').click()
  page.locator('[data-episode-return]').first.click()
  form=page.locator('#hmk-time-episode-form')
  chk(form.is_visible(),'return to stationary Foraging after saved Survival test')
  chk(bool(form.locator('[name=orientationProofId]').input_value()),'Survival proof selected after return')
  # Re-evaluate explicitly; d10 already existed, so can only evaluate based on new proof.
  form.locator('[data-episode-evaluate]').click()
  s=page.evaluate('window.__forage35Snap()')
  chk(int(s['modes'])>=2,'+2 Orienteering yields at least two Foraging Modes',s)
  chk(not s['episodes'] and s['minute']==480,'Survival receipt does not end episode')
  count=int(s['modes']);report['foraging_modes']=count
  for i in range(1,count):
   inp=form.locator(f'[name=forageD10_{i}]')
   chk(inp.is_visible(),f'mode {i+1} has visible independent d10')
   inp.fill('10');inp.press('Tab')
   chk(page.evaluate('window.__forage35Snap().minute')==480,f'd10 mode {i+1} edits do not advance time')
  # Test repeated edit and undo before explicit Evaluate.
  first=form.locator('[name=forageD10]')
  for val in ['1','10','3','10']:
   first.fill(val);first.press('Tab')
   chk(page.evaluate('window.__forage35Snap().minute')==480,'repeated first d10 edit cannot commit '+val)
  if form.locator('[data-episode-evaluate]').is_enabled():form.locator('[data-episode-evaluate]').click()
  else:report['reevaluation_note']='UI automatically re-evaluated after field edits while earlier evaluate state remained true; no durable write'
  val=page.evaluate('window.__forage35Snap()')
  chk(not val['error'],'all independent d10 resolve after explicitly evaluating',val)
  page.screenshot(path=str(root/'tools/browser_93835_before_commit.png'),full_page=True)
  page.locator('[data-episode-window-stage]').click()
  stage=page.evaluate('window.__forage35Snap()')
  chk(stage['stage']==1 and stage['minute']==480,'stage button queues episode, no premature campaign clock advance',stage)
  page.locator('[data-episode-window-commit]').click()
  after=page.evaluate('window.__forage35Snap()')
  chk(after['minute']==540 and after['episodes'] and len(after['episodes'][0]['standaloneForaging'])==count,
   'one commit advances 60 minutes and stores exactly awarded d10 results',{'minute':after['minute'],'episodes':len(after['episodes']),'dialogs':dialogs})
  ep=after['episodes'][0]
  chk(ep['orientation']['adjustment']['stationaryForagingBonus']==2 and ep['distanceMeters']==0,
   'committed +2 SV and zero movement')
  chk(after['supply']['gross']['foodDays']>0 and after['supply']['gross']['waterDays']>0,
   'committed d10 yields ledger food and water',after['supply'])
  page.screenshot(path=str(root/'tools/browser_93835_after_commit.png'),full_page=True)
  tamper=page.evaluate('window.__forage35Tamper()')
  report['tamper']=tamper
  chk(tamper['original']=='ACCEPTED','committed stationary episode validates from real stored journal',tamper)
  for attack in ['changedDie','lostMode','changedCarry','missingSurvival']:
   chk(tamper[attack].startswith('REJECTED:'),f'journal replay rejects {attack}',tamper)
  chk(tamper['lots']==count*2,'ledger counts one food lot and one water lot per Mode without alias duplication',tamper)

  # Browser network/file navigations are blocked by environment, so only isolated
  # new-page launch from persisted bytes can be tested, not actual browser URL reload.
  page2=browser.new_page(viewport={'width':1540,'height':1000})
  page2.on('pageerror',lambda e:errors.append(str(e)))
  page2.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page2.evaluate('''(snapshot)=>{const m=new Map([['hmk-keepers-ledger-v1',snapshot]]);const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});}''',after['stored'])
  for style in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
   page2.add_style_tag(content=(root/style).read_text('utf8'))
  page2.add_script_tag(content=bundle)
  loaded=page2.evaluate('window.__forage35Snap()')
  settings_before=after['episodes'][0].get('settings',{});settings_after=loaded['episodes'][0].get('settings',{});settings_diff={k:(settings_before.get(k),settings_after.get(k)) for k in settings_before.keys()|settings_after.keys() if settings_before.get(k)!=settings_after.get(k)}
  report['cold_load_settings_changes']=settings_diff
  report['cold_load_episode_exact_equal']=loaded['episodes']==after['episodes']
  report['cold_load_loaded_json_hash']=__import__('hashlib').sha256(json.dumps(loaded['episodes'],sort_keys=True).encode()).hexdigest()
  report['cold_load_committed_json_hash']=__import__('hashlib').sha256(json.dumps(after['episodes'],sort_keys=True).encode()).hexdigest()
  chk(loaded['minute']==after['minute'] and loaded['supply']==after['supply'] and len(loaded['episodes'])==len(after['episodes']),
   'isolated Chromium cold-load of minute, supply and episode count (not URL reload)',{'minute':loaded['minute'],'supply':loaded['supply']})
  report['browser_reload']='BLOCKED_BY_ADMINISTRATOR: actual URL reload was not executable'
  chk(not errors,'no browser page errors',errors)
  print('PASS Chromium Foraging UI',len(report['checks']),'checks, modes',count,'cold-load simulated',flush=True)
  browser.close()
except Exception as e:
 report['failure']=str(e);report['traceback']=traceback.format_exc();print('FAIL',report['traceback'],flush=True);sys.exit(1)
finally:
 (root/'tools/browser_93835_result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
 server.shutdown();server.server_close()
