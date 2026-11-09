from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seed93807=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean(); const attr={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c','d','e','f'].map((id,i)=>({id,name:'Actor '+id,kind:'PC',hmk:{attributes:attr,skills:[{id:'surv-'+id,name:'Survival',ml:65},{id:'track-'+id,name:'Tracking',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'test93807',label:'Test',eventId:'init',gmConfirmed:true,characterIds:['a','b','c','d','e','f']});
 const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});
 data.journal.push({id:'weather',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute,createdAt:stamp(),title:'Daily weather',body:'Test',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(data.campaignClock.minute/1440),area:'Forest',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__get93807=()=>({plans:sharedTimeWindowPlans.map(x=>({kind:x.kind,actor:x.actorId,members:[...x.memberIds],guide:x.actorId,done:x.done})), sidecar:JSON.parse(localStorage.getItem(EPISODE_SIDECAR_KEY)||'null')?.sharedPlans?.map(p=>({kind:p.kind,actor:p.actorId,members:p.memberIds})),time:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,events:data.campaignClock.events.length, errors:sharedPlanState93771().errors});
window.__reload93807=()=>{data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__get93807()};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1500,'height':900});page.set_default_timeout(12000)
 errors=[];dialogs=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seed93807()')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click();page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').first;row.locator('[data-shared-row-actor]').select_option('a')
 row=page.locator('[data-shared-plan-card]').first;row.locator('.hc-episode-group-members summary').click()
 for member in ['b','c','d','e']:
  page.locator('[data-shared-plan-card]').first.locator(f'[data-shared-plan-member][value="{member}"]').check()
 row=page.locator('[data-shared-plan-card]').first;row.locator('[data-shared-plan-guide][value="e"]').check()
 before=page.evaluate('window.__get93807()');assert sorted(before['plans'][0]['members'])==['a','b','c','d','e'],before
 assert before['sidecar'][0]['actor']=='e'
 print('DRAFT_MEMBERS',before,flush=True)
 for kind in ['rest','sleep','winded','forage','tracking','watch','other']:
  page.locator('[data-shared-plan-card]').first.locator('[data-shared-plan-kind]').select_option(kind)
  state=page.evaluate('window.__get93807()')
  assert state['plans'][0]['members']==['e'],(kind,state)
  assert state['plans'][0]['actor']=='e' and state['sidecar'][0]['members']==['e'] and not state['errors'],(kind,state)
  assert page.locator('[data-shared-plan-card]').first.locator('.hc-episode-group-members').count()==0
  assert not dialogs,(kind,dialogs)
  state=page.evaluate('window.__reload93807()')
  assert state['plans'][0]['kind']==kind and state['plans'][0]['members']==['e'],(kind,state)
  page.locator('[data-shared-plan-card]').first.locator('[data-shared-plan-kind]').select_option('travel')
  row=page.locator('[data-shared-plan-card]').first
  assert row.locator('.hc-episode-group-members').count()==1
  row.locator('.hc-episode-group-members summary').click()
  for member in ['a','b','c','d']:
   page.locator('[data-shared-plan-card]').first.locator(f'[data-shared-plan-member][value="{member}"]').check()
  print('SWITCH_PASS',kind,flush=True)
 assert page.evaluate('window.__get93807()')['stored']==480
 assert not dialogs and not errors,(dialogs,errors)
 print('PASS 7 transitions, 5 members, guide retained, sidecar persisted, no premature campaign write',flush=True)
 b.close()
