"""v93.823 Chromium UI: a healthy solo rider, real purchase/gifts, actual skill rolls, committed calendar."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8'); pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);seed=(root/'tools/browser_93806_groups.py').read_text().split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__healthyStart93823=()=>{const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};data.characters=[{id:'a',name:'Michal',kind:'PC',hmk:{attributes:attrs,weight:'150 lb',skills:[{id:'surv',name:'Survival',ml:65},{id:'rid',name:'Riding',ml:65}],healthState:H.initialCombatState()}}];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'healthy-93823',label:'Healthy Rider',eventId:'init',gmConfirmed:true,characterIds:['a']});const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});data.journal.push({id:'weather-93823',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:480,createdAt:stamp(),title:'Počasí',body:'Počasí',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:0,area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__healthyStatus93823=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,animals:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(a=>({id:a.id,name:a.name})),episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,ride:j.calendarTimeEpisode.mountRiding93823,transport:j.calendarTimeEpisode.transportProof?.mount||null})),error:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem||''});
window.__healthyProjection93823=id=>{const campaign=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);const animal=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,campaign).find(a=>a.id===id);return {ride:require('./src/integration/hmk-travel-riding-93823.js').recordedTravelRide93823(data,campaign,id),burden:require('./src/integration/hmk-stable-hub-574.js').stableBurden(data,campaign,animal)};};
window.__readyHealthy93823=()=>{const C=require('./src/integration/hmk-character-creation.js');const c=character('a');c.hmk.creation=C.defaultCreation();c.hmk.creation.status='complete';c.hmk.creation.step=14;c.hmk.creation.completed=Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,true]));render();};
window.__inspectStableHTML93823=id=>{const campaign=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);const animal=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,campaign).find(a=>a.id===id);return stableHubAnimalHTML(animal,campaign);};
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);pg=b.new_page(viewport={'width':1400,'height':1000});pg.set_default_timeout(12000)
 errors=[]; dialogs=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 pg.set_content('<!doctype html><html><meta charset="utf-8"><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:pg.add_style_tag(content=(root/css).read_text('utf8'))
 pg.add_script_tag(content=bundle);pg.evaluate('window.__healthyStart93823()')
 pg.locator('[data-shared-window-minutes]').fill('45');pg.locator('[data-shared-window-create]').click();pg.locator('[data-shared-plan-add]').click();r=pg.locator('[data-shared-plan-card]').first;r.locator('[data-shared-row-actor]').select_option('a');pg.locator('[data-shared-row-run]').click();f=pg.locator('#hmk-time-episode-form')
 f.locator('[name=conveyance]').select_option('mount')
 f.locator('[data-episode-open-stable-library]').click();a=pg.locator('[data-hmk-livestock-acquire]');beast=a.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value');a.locator('[name=beastId]').select_option(beast);a.locator('[name=beastName]').fill('Blesk');a.locator('[name=ownerId]').select_option('a');a.locator('button[value=free]').click();pg.locator('[data-hmk-stable-go-travel]').click();f=pg.locator('#hmk-time-episode-form');f.locator('[data-episode-stable-refresh]').click()
 animals=pg.evaluate('window.__healthyStatus93823()')['animals'];assert animals,pg.locator('body').inner_text()[-500:];horse=animals[0]['id'];f.locator('[name=stableAnimalIds][value="'+horse+'"]').check()
 for i in range(5):
  g=f.locator('[data-episode-equipment-action=gift]');
  if not g.count():break
  g.first.click();f=pg.locator('#hmk-time-episode-form')
 assert not f.locator('[data-episode-equipment-action=gift]').count(), f.locator('[data-episode-equipment-checklist-body]').inner_text()
 f.locator('[name=travelRideAnimalId]').select_option(horse)
 f.locator('[name=travelRideRiderId]').select_option('a')
 mass=f.locator('[data-episode-healthy-ride-mass]').inner_text();assert '150 lb' in mass and 'ENC 0 · Move 130' in mass,mass
 print('BROWSER ACTIVE RIDER MASS',mass,flush=True)
 for i in range(40):
  f=pg.locator('#hmk-time-episode-form')
  if pg.locator('[data-episode-window-stage]').is_enabled():break
  f.locator('[data-episode-evaluate]').click();field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or '';print('GATE',i,field,msg[:100],flush=True)
  if field in ('orientationProofId','droverProofId'):
   pg.locator('[data-episode-skill-task]').first.click();sf=pg.locator('#skill-value-form') if field=='orientationProofId' else pg.locator('#skill-secondary-form');assert sf.count(),('no skill form',field);sf.locator('[name=rollA]').fill('31');sf.locator('[type=submit]').click();pg.locator('[data-episode-return]').first.click();continue
  if field.startswith('end_'):f.locator('[name="'+field+'"]').fill('5');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg);f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
  if field in ('encounterD100','encounterD100Sub','directionD10','survivalD10','precipitationD6','temperatureD10','precipitationD10'):
   f.locator('[name="'+field+'"]').fill({'encounterD100':'100','encounterD100Sub':'100','directionD10':'6','survivalD10':'10','precipitationD6':'6','temperatureD10':'5','precipitationD10':'10'}[field]);continue
  raise AssertionError(('unhandled UI',field,msg))
 else:raise AssertionError('not finished')
 pg.locator('[data-episode-window-stage]').click();pg.locator('[data-episode-window-commit]').click()
 final=pg.evaluate('window.__healthyStatus93823()');print('FINAL',final,flush=True)
 assert final['minute']==final['stored']==525 and len(final['episodes'])==1,final
 ride=final['episodes'][0]['ride'];assert ride and ride['riderId']=='a' and ride['riderLb']==150,final
 projection=pg.evaluate('window.__healthyProjection93823',horse);assert projection['ride']['occupants']==['a'] and projection['burden']['riderWeightLb']==150,projection
 assert projection['burden']['adjustedENC']==ride['enc']==0,projection
 html=pg.evaluate('window.__inspectStableHTML93823',horse);assert 'Poslední uložený Pochod' in html and 'Michal' in html and 'rider-mount' not in html.split('Kompletní časový registr stáje')[0],html[:400]
 assert not errors,errors
 pg.evaluate('window.__readyHealthy93823()')
 print('STABLE READY NAV',pg.locator('[data-nav]').evaluate_all('nodes=>nodes.map(n=>({nav:n.dataset.nav,text:n.innerText.slice(0,25)})).slice(0,15)'),flush=True)
 pg.locator('[data-nav="characters"]').first.click()
 print('CHARACTER SCREEN',pg.locator('body').inner_text()[-2000:],flush=True)
 pg.locator('button:has-text("Otevřít deník")').first.click()
 print('JOURNAL STABLE LINK CANDIDATES',pg.locator('button').evaluate_all('nodes=>nodes.filter(n=>/Stáj|stáj|Blesk/.test(n.innerText)).map(n=>({text:n.innerText,outer:n.outerHTML.slice(0,230)})).slice(0,12)'),flush=True)
 print('JOURNAL SCREEN',pg.locator('body').inner_text()[-3000:],flush=True)
 pg.locator('[data-sheet-section="stable"]').click()
 stable=pg.locator('body').inner_text()
 assert 'Poslední uložený Pochod' in stable and 'Na zvířeti Michal' in stable,stable[-3500:]
 assert pg.locator('button:has-text("Nasednout")').count()==0 and pg.locator('button:has-text("Sesednout")').count()==0
 pg.screenshot(path=str(root/'docs/AUDIT_v93.823_stable_readonly_UI.png'),full_page=True)
 print('PASS REAL UI Stáj: last completed rider Michal read-only, no mount/dismount buttons',flush=True)
 pg.screenshot(path=str(root/'docs/AUDIT_v93.823_healthy_ride_FINAL.png'),full_page=True)
 print('PASS: REAL UI all steps healthy rider, journal, clock +45, Stable read-only render and projection',flush=True)
 b.close()
