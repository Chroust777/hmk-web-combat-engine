from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedBoundaries93772=(minute=480)=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 const camp=require('./src/integration/hmk-calendar-multi-campaign.js'),T=require('./src/integration/hmk-trekking-routine.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:['Aktér A','Aktér B'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:Math.floor(minute/60),minute:minute%60,campaignId:'audit-boundary-93772',label:'Plan',eventId:'init',gmConfirmed:true,characterIds:['a','b']});
 const cid=camp.campaignKey(data.campaignClock);
 for(const [id,area,d10] of [['g1','Les',5],['g2','Vrchovina',6]]){
  const weatherDay=T.trekWeatherDay({season:'spring',climate:'cool',temperatureD10:d10,precipitationD10:5,landscape:'flat'});
  data.journal.push({id,characterId:'a',calendarCampaignId:cid,campaignMinute:480,createdAt:stamp(),title:'Počasí '+area,body:'',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:0,area,season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 }
 view='calendar';calendarLanding=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__summaryBoundaries93772=()=>({minute:data.campaignClock.minute,saved:JSON.parse(storageBaseline).campaignClock.minute,
 plans:sharedTimeWindowPlans.map(x=>({actor:x.actorId,weather:x.weatherId,minutes:x.minutes,done:x.done})),
 slots:sharedPlanState93771(),end:sharedTimeWindowDraft?.endMinute,queue:sharedTimeWindowQueue.length,
 persisted:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({area:j.calendarTimeEpisode.area,actors:j.calendarTimeEpisode.memberIds}))});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':900});page.set_default_timeout(10000)
 dialogs=[];errors=[];page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()));page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedBoundaries93772(480)')
 assert page.locator('[data-shared-window-weather] option').count()==3
 page.locator('[data-shared-window-weather]').select_option('g1')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('rest');
 page.locator('[data-shared-plan-add]').click()
 r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('b')
 r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('rest')
 r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-weather]').select_option('g2')
 assert page.locator('[data-shared-row-run]').is_enabled(),page.evaluate('window.__summaryBoundaries93772()')
 page.locator('[data-shared-row-run]').click()
 for i in range(2):
  form=page.locator('#hmk-time-episode-form');assert form.locator('[name=weatherSource]').input_value()==('g1' if i==0 else 'g2')
  assert form.locator('[name=weatherSource]').is_disabled(), 'global weather selection should be locked to row'
  form.locator('[name=confirmed]').evaluate('(n)=>n.click()');form.locator('[data-episode-evaluate]').click()
  assert page.locator('[data-episode-window-stage]').is_enabled(),page.locator('[data-episode-checklist]').inner_text()
  page.locator('[data-episode-window-stage]').click()
 assert page.locator('[data-episode-window-commit]').is_enabled()
 page.locator('[data-episode-window-commit]').click()
 state=page.evaluate('window.__summaryBoundaries93772()')
 print('TWO AREAS',state,flush=True)
 assert [x['area'] for x in state['persisted']]==['Les','Vrchovina']
 assert state['saved']==520 and not errors
 print('PASS two distinct global weather profiles remain isolated within one window',flush=True)
 page.evaluate('window.__seedBoundaries93772(1420)')
 page.locator('[data-shared-window-weather]').select_option('g1')
 page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
 state=page.evaluate('window.__summaryBoundaries93772()')
 assert state['end']==1440 and state['saved']==1420,state
 page.locator('[data-shared-plan-add]').click()
 r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('a')
 r=page.locator('[data-shared-plan-card]').last
 assert r.locator('[data-shared-plan-minutes]').get_attribute('max')=='20'
 r.locator('[data-shared-plan-minutes]').fill('21');r.locator('[data-shared-plan-minutes]').press('Tab')
 state=page.evaluate('window.__summaryBoundaries93772()');assert state['plans'][0]['minutes']==20 and state['queue']==0 and state['saved']==1420,state
 print('PASS midnight 23:40–00:00 interval 20-minute cap; 21 denied before evidence',flush=True)
 assert not errors,errors
 b.close()
