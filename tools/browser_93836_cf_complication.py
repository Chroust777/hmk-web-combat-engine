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
errors=[];dialogs=[];report={'script':'browser_93836_cf_complication.py','checks':[],'errors':errors,'dialogs':dialogs}
def chk(c,name,info=None):
 if not c:raise AssertionError((name,info))
 report['checks'].append({'name':name,'status':'PASS'})
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1550,'height':980});page.set_default_timeout(12000)
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
  chk(before['minute']==480,'initial 08:00')
  page.locator('[data-shared-window-minutes]').fill('60')
  page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click()
  card=page.locator('[data-shared-plan-card]').last
  card.locator('[data-shared-row-actor]').select_option('a')
  page.locator('[data-shared-plan-card]').last.locator('[data-shared-plan-kind]').select_option('forage')
  card=page.locator('[data-shared-plan-card]').last
  if card.locator('[data-shared-plan-minutes]').count():card.locator('[data-shared-plan-minutes]').fill('60')
  page.locator('[data-shared-row-run]').click()
  form=page.locator('#hmk-time-episode-form');chk(form.is_visible(),'foraging interface')
  form.locator('[data-episode-section=skills]>summary').click()
  if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').click()
  form.locator('[data-episode-evaluate]').click()
  form.locator('[data-episode-section=rolls]>summary').click()
  form.locator('[name=habitat]').select_option('mixed-forest')
  form.locator('[name=forageD10]').fill('1')
  form.locator('[data-episode-evaluate]').click()
  page.locator('[data-episode-skill-task][data-episode-skill-field="orientationProofId"]').first.click()
  skill=page.locator('#skill-value-form');chk(skill.is_visible(),'Survival Skill Tests opened')
  skill.locator('[name=rollA]').fill('95')
  skill.locator('[type=submit]').click()
  page.locator('[data-episode-return]').first.click()
  form=page.locator('#hmk-time-episode-form')
  chk(form.is_visible(),'return to Foraging')
  beforeCF=page.evaluate('window.__forage35Snap()')
  chk(beforeCF['minute']==480 and not beforeCF['episodes'],'CF Skill Test itself cannot advance clock')
  form.locator('[data-episode-evaluate]').click()
  problem=page.evaluate('window.__forage35Snap()')
  report['before_hazard']={'error':problem['error'],'errorField':problem['errorField']}
  chk(problem['errorField']=='survivalD10','CF requires a real hazard d10',problem)
  roll=form.locator('[name=survivalD10]')
  chk(roll.is_visible(),'Survival Hazard d10 visible during stationary Foraging')
  roll.fill('7');roll.press('Tab')
  chk(page.evaluate('window.__forage35Snap().minute')==480,'typing Complication cannot advance clock')
  modes=int(page.evaluate('window.__forage35Snap().modes') or 0)
  for i in range(1,modes):form.locator(f'[name=forageD10_{i}]').fill('1')
  if form.locator('[data-episode-evaluate]').is_enabled():form.locator('[data-episode-evaluate]').click()
  blocked=page.evaluate('window.__forage35Snap()')
  report['blocked']={'minute':blocked['minute'],'episodes':len(blocked['episodes']),'error':blocked['error'],'field':blocked['errorField']}
  chk(blocked['minute']==480 and not blocked['episodes'],'Complication no auto calendar or supply mutation')
  chk(form.locator('[data-episode-finalize]').count()==0 or not page.locator('[data-episode-window-stage]').is_enabled(),'Complication cannot be staged without its real follow-up')
  chk(not blocked['error'] or 'Complication' in blocked['error'] or 'Hazard' in blocked['error'], 'Complication result reported as missing real evidence',report['blocked'])
  print('PASS Complication fail-closed Chromium',len(report['checks']),'checks',flush=True)
  chk(not errors,'no chromium errors',errors)
  print('PASS CF Chromium',len(report['checks']),'checks',flush=True)
  browser.close()
except Exception as e:
 report['failure']=str(e);report['traceback']=traceback.format_exc();print('FAIL',report['traceback'],flush=True);sys.exit(1)
finally:
 (root/'tools/browser_93836_complication_result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
 server.shutdown();server.server_close()
