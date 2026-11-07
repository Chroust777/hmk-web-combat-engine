from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedPlan93771=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters=['a','b'].map((id,i)=>({id,name:['Aktér A','Aktér B'][i],kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-'+id,name:'Survival',ml:65}],healthState:H.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-plan-93771',label:'Plan',eventId:'init',gmConfirmed:true,characterIds:['a','b']});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__seedMidnight93771=()=>{const C=require('./src/integration/hmk-campaign-calendar.js');data.campaignClock=C.createCampaignCalendar({day:1,hour:23,minute:40,campaignId:'audit-plan-93771',label:'Plan',eventId:'init2',gmConfirmed:true,characterIds:['a','b']});storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);render();};
window.__statusPlan93771=()=>({minute:data.campaignClock.minute,storedMinute:JSON.parse(storageBaseline).campaignClock.minute,
 draft:sharedTimeWindowDraft&&{start:sharedTimeWindowDraft.startMinute,end:sharedTimeWindowDraft.endMinute},
 plans:sharedTimeWindowPlans.map(p=>({id:p.id,groupId:p.groupId,kind:p.kind,minutes:p.minutes,members:p.memberIds,done:p.done})),
 slots:sharedPlanState93771(),active:sharedTimeWindowActivePlanId,
 queue:sharedTimeWindowQueue.map(q=>({kind:q.kind,start:q.patch.startMinute,end:q.patch.endMinute,group:q.groupId})),
 journal:data.journal.length,events:data.campaignClock.events.length});
window.__reloadPlan93771=()=>{data=JSON.parse(storageBaseline);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__statusPlan93771();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':950});page.set_default_timeout(8000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if(root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedPlan93771()')
 page.evaluate('window.__seedMidnight93771()')
 page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
 x=page.evaluate('window.__statusPlan93771()');print('MIDNIGHT CAP',x,dialogs,errors,flush=True)
 assert x['draft']['start']==1420 and x['draft']['end']==1440
 assert page.locator('[data-shared-window-minutes]').is_disabled()
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').first
 card.locator('[data-shared-plan-minutes]').fill('21');card.locator('[data-shared-plan-minutes]').press('Tab')
 x=page.evaluate('window.__statusPlan93771()');print('OVERRUN',x['slots'],flush=True)
 assert x['slots']['errors'] and card.locator('[data-shared-plan-open]').is_disabled()
 card=page.locator('[data-shared-plan-card]').first
 card.locator('[data-shared-plan-minutes]').fill('20');card.locator('[data-shared-plan-minutes]').press('Tab')
 card=page.locator('[data-shared-plan-card]').first
 card.locator('.hc-shared-plan-members summary').click()
 card.locator('.hc-shared-plan-members input[value=a]').check()
 assert page.evaluate('window.__statusPlan93771()')['slots']['scheduled'][0]['endMinute']==1440
 assert not errors,errors
 print('PASS 23:40 + 20 minutes uses 23:59 last minute; new day 00:00 is separate',flush=True)
 b.close()
