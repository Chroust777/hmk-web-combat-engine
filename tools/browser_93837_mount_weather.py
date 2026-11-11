"""Chromium, actual UI clicks, isolated fake campaign: ox + horse selection and global weather read-only.
Tests execute the production hmk-app.bundle.js and styles in a sandbox document.
This does not claim HTTP address reload. No dice or proofs invented outside UI.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);seed=(root/'tools/browser_93806_groups.py').read_text().split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__healthyStart93823=()=>{const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};data.characters=[{id:'a',name:'Michal',kind:'PC',hmk:{attributes:attrs,weight:'150 lb',skills:[{id:'surv',name:'Survival',ml:65},{id:'rid',name:'Riding',ml:65}],healthState:H.initialCombatState()}}];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'ride-weather-93837',label:'Audit',eventId:'init',gmConfirmed:true,characterIds:['a']});const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});data.journal.push({id:'weather-93837',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:480,createdAt:stamp(),title:'Počasí',body:'Počasí',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:0,area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__auditStatus93837=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,animals:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(a=>({id:a.id,name:a.name,breed:a.spec.breed})),episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({ride:j.calendarTimeEpisode.mountRiding93823,members:j.calendarTimeEpisode.memberIds,stable:j.calendarTimeEpisode.settings?.stableAnimalIds})),version:APP_VERSION,previewError:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem||''});
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
checks=[]
def verify(v,name):
 assert v,name
 checks.append(name)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);pg=b.new_page(viewport={'width':1420,'height':1000});pg.set_default_timeout(15000)
 errors=[];dialogs=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 pg.set_content('<!doctype html><html><meta charset="utf-8"><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:pg.add_style_tag(content=(root/css).read_text('utf8'))
 pg.add_script_tag(content=bundle);pg.evaluate('window.__healthyStart93823()')
 pg.locator('[data-shared-window-minutes]').fill('45');pg.locator('[data-shared-window-create]').click();pg.locator('[data-shared-plan-add]').click();pg.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').select_option('a');pg.locator('[data-shared-row-run]').click()
 f=pg.locator('#hmk-time-episode-form');verify(f.count()==1,'Actual episode form opens')
 # Weather source auto-selected from confirmed global day/area.
 verify(f.locator('[name=weatherSource]').input_value()=='weather-93837','Daily weather source confirmed')
 names=['latitudeBand','topography','season','climate','temperatureD10','precipitationD10','alpine','aridDesert']
 for name in names:verify(f.locator('[name="'+name+'"]').is_disabled(),name+' inherited and disabled')
 verify(f.locator('[name=area]').get_attribute('readonly') is not None,'Area title inherited read-only')
 verify(f.locator('[name=latitudeBand]').input_value()=='mid' and f.locator('[name=topography]').input_value()=='flat','Latitude and landscape inherited')
 verify(f.locator('[name=temperatureD10]').input_value()=='5' and f.locator('[name=precipitationD10]').input_value()=='5','Original daily d10 values visible and immutable')
 verify(f.locator('[name=terrain]').is_enabled() and f.locator('[name=weatherSafeShelter]').is_enabled(),'Route terrain/shelter remain independent')
 verify('globáln' in f.locator('[data-episode-global-weather-lock-note]').inner_text().lower(),'Global weather locking explained')
 evdir=root/'tools/evidence_93837';evdir.mkdir(exist_ok=True)
 pg.screenshot(path=str(evdir/'CONFIRMED_GLOBAL_WEATHER_LOCK.png'),full_page=True)
 verify(f.locator('[name=weatherSource]').is_disabled(),'Weather source is locked by the active confirmed group plan')
 f.locator('[name=conveyance]').select_option('mount')
 def acquire(name,kind):
  f=pg.locator('#hmk-time-episode-form');f.locator('[data-episode-open-stable-library]').click()
  a=pg.locator('[data-hmk-livestock-acquire]')
  choices=a.locator('[name=beastId] option').all_text_contents()
  verify(any(kind in x for x in choices),'Catalogue offers '+kind)
  a.locator('[name=beastId]').select_option(a.locator('[name=beastId] option').filter(has_text=kind).first.get_attribute('value'))
  a.locator('[name=beastName]').fill(name);a.locator('[name=ownerId]').select_option('a')
  a.locator('button[name=acquisition][value=free]').click()
  pg.locator('[data-hmk-stable-go-travel]').click();f=pg.locator('#hmk-time-episode-form');f.locator('[data-episode-stable-refresh]').click()
  return pg.evaluate('window.__auditStatus93837()')['animals'][-1]['id']
 ox=acquire('Blesk','Bovine (Oxen)')
 f=pg.locator('#hmk-time-episode-form');f.locator('[name=stableAnimalIds][value="'+ox+'"]').check()
 txt=f.locator('[data-episode-equipment-checklist-body]').inner_text()
 verify('Vybraná zvířata nejsou jezdecká' in txt,'Ox-only warns before any mount rolls')
 verify('NENÍ JÍZDNÍ' in f.locator('[data-episode-stable-roster]').inner_text(),'Ox clearly labelled not rideable')
 pg.screenshot(path=str(evdir/'OX_ONLY_SHOWS_WARNING.png'),full_page=True)
 verify(pg.evaluate('window.__auditStatus93837()')['minute']==480,'Selecting ox does not advance time')
 horse=acquire('Vitr','Palfrey, riding horse');f=pg.locator('#hmk-time-episode-form')
 verify(f.locator('[name=stableAnimalIds][value="'+ox+'"]').is_checked(),'Ox remains selected across Stable refresh')
 f.locator('[name=stableAnimalIds][value="'+horse+'"]').check()
 verify(f.locator('[name=travelRideAnimalId]').input_value()=='','Auto mount still default')
 # Neither the presence of a non-mount ox nor its draft harness must block horse riding.
 txt=f.locator('[data-episode-equipment-checklist-body]').inner_text()
 verify('Jízdní zvíře vybráno' in txt and 'Vitr' in txt,'Horse selected automatically from mixed herd')
 verify('nevhodné jízdní zvíře' not in txt,'Ox companion does not block selected horse')
 verify('Blesk · doprovází skupinu' in txt,'Companion ox shown as informational')
 pg.screenshot(path=str(evdir/'OX_PLUS_HORSE_CHECKLIST.png'),full_page=True)
 for i in range(5):
  g=f.locator('[data-episode-equipment-action="gift"]')
  if not g.count():break
  g.first.click();f=pg.locator('#hmk-time-episode-form')
 verify(f.locator('[data-episode-equipment-action="gift"]').count()==0,'Real tack gifts confirmed by clicking')
 verify('Jízdní zvíře vybráno' in f.locator('[data-episode-equipment-checklist-body]').inner_text(),'Mount remains correct after saddling')
 verify('ENC' in f.locator('[data-episode-healthy-ride-mass]').inner_text(),'Rider real mass computed on eligible horse')
 # Explicit id must also work; changing selection does not commit or advance.
 f.locator('[name=travelRideAnimalId]').select_option(horse)
 verify('ENC' in f.locator('[data-episode-healthy-ride-mass]').inner_text(),'Explicit horse selection computed')
 verify(pg.evaluate('window.__auditStatus93837()')['minute']==480,'No accidental timeline commit')
 # Finish the ordinary UI workflow, including actual skill value tests.
 import re
 for i in range(30):
  f=pg.locator('#hmk-time-episode-form')
  if pg.locator('[data-episode-window-stage]').is_enabled():break
  f.locator('[data-episode-evaluate]').click()
  field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
  if field in ('orientationProofId','droverProofId'):
   pg.locator('[data-episode-skill-task]').first.click();sf=pg.locator('#skill-value-form') if field=='orientationProofId' else pg.locator('#skill-secondary-form')
   verify(sf.count()>0,'Real '+field+' test opened')
   sf.locator('[name=rollA]').fill('31');sf.locator('[type=submit]').click();pg.locator('[data-episode-return]').first.click();continue
  if field.startswith('end_'):f.locator('[name="'+field+'"]').fill('5');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg);f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
  if field in ('encounterD100','encounterD100Sub','directionD10','survivalD10','precipitationD6','temperatureD10','precipitationD10'):
   f.locator('[name="'+field+'"]').fill({'encounterD100':'100','encounterD100Sub':'100','directionD10':'6','survivalD10':'10','precipitationD6':'6','temperatureD10':'5','precipitationD10':'10'}[field]);continue
  raise AssertionError(('Unexpected next task',field,msg))
 else:raise AssertionError('Missing completed stage')
 verify(pg.evaluate('window.__auditStatus93837()')['minute']==480,'Ready-to-stage still no time advance')
 pg.locator('[data-episode-window-stage]').click();pg.locator('[data-episode-window-commit]').click()
 status=pg.evaluate('window.__auditStatus93837()')
 print('FINAL',status,flush=True)
 verify(status['minute']==status['stored']==525,'Explicit 45 minute Calendar confirmation persisted')
 verify(len(status['episodes'])==1,'One travel receipt')
 verify(status['episodes'][0]['ride']['animalId']==horse,'Horse (not ox) is actually ridden')
 verify(ox in status['episodes'][0]['stable'] and horse in status['episodes'][0]['stable'],'Both animals retained in travel party')
 verify(not errors,'No JS page errors: '+str(errors))
 path=root/'tools/evidence_93837';path.mkdir(exist_ok=True)
 pg.screenshot(path=str(path/'MIXED_OX_HORSE_AFTER_COMMIT.png'),full_page=True)
 (path/'BROWSER_MOUNT_WEATHER.json').write_text(json.dumps({'status':'PASS','checks':checks,'count':len(checks),'errors':errors,'dialogs':dialogs,'final':status},ensure_ascii=False,indent=2),'utf8')
 print('PASS',len(checks),'Chromium clicked mixed draft ox + riding horse, weather global lock, committed 45m',flush=True)
 b.close()
