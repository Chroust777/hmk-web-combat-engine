from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedRows93772=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b','c'].map((id,i)=>({id,name:['Aktér A','Aktér B','Aktér C'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
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
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':950});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 print('INJECT',page.evaluate('typeof window.__seedRows93772'), 'ERRORS',errors,flush=True);page.evaluate('window.__seedRows93772()')
 assert not errors,errors
 page.locator('[data-shared-window-minutes]').fill('40')
 page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').first
 row.locator('[data-shared-row-actor]').select_option('a')
 row=page.locator('[data-shared-plan-card]').first
 row.locator('.hc-episode-group-members summary').click()
 row.locator('[data-shared-plan-member][value="b"]').check()
 row=page.locator('[data-shared-plan-card]').first
 assert row.locator('[data-shared-plan-member][value="a"]').is_checked()
 assert row.locator('[data-shared-plan-member][value="b"]').is_checked()
 assert not row.locator('[data-shared-plan-member][value="c"]').is_checked()
 assert row.locator('.hc-episode-group-members').get_attribute('open') is not None
 row.locator('[data-shared-plan-guide][value="b"]').check()
 row=page.locator('[data-shared-plan-card]').first
 assert row.locator('[data-shared-row-actor]').input_value()=='b'
 assert row.locator('[data-shared-plan-group]').input_value()=='1'
 page.locator('[data-shared-plan-add]').click()
 second=page.locator('[data-shared-plan-card]').nth(1)
 assert second.locator('[data-shared-plan-group]').input_value()=='2'
 assert second.locator('[data-shared-row-actor] option[value="a"]').count()==0
 assert second.locator('[data-shared-row-actor] option[value="b"]').count()==0
 second.locator('[data-shared-row-actor]').select_option('c')
 state=page.evaluate('window.__statusRows93772()')
 print('GROUPS',state['slots'], 'ERRORS',errors,flush=True)
 assert not state['slots']['errors'],state['slots']
 assert len(state['slots']['scheduled'])==2
 assert sorted(state['slots']['scheduled'][0]['memberIds'])==['a','b']
 assert state['slots']['scheduled'][0]['guideId']=='b'
 assert page.locator('[data-shared-row-run]').is_enabled()
 # Group 1: exactly one rules form, two members, guide B.
 page.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').evaluate('(n)=>n.focus()')
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.is_visible()
 assert form.locator('[name="guideId"]').input_value()=='b'
 assert form.locator('[name="memberIds"][value="a"]').is_checked()
 assert form.locator('[name="memberIds"][value="b"]').is_checked()
 assert not form.locator('[name="memberIds"][value="c"]').is_checked()
 assert len(page.evaluate('window.__statusRows93772()')['queue'])==0
 assert page.evaluate('window.__statusRows93772()')['storedMinute']==480
 # Without dice, it is not valid to save this travel episode.
 assert not page.locator('[data-episode-window-stage]').is_enabled()
 print('PASS 93.806 browser: group assignment, independent guides, one shared rules form, no early clock or write',flush=True)
 assert not errors,errors
 b.close()
