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
window.__seedMidnight93771=()=>{data.campaignClock.minute=1420; storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);render();};
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
 page=b.new_page(viewport={'width':1640,'height':1080});page.set_default_timeout(14000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedPlan93771()')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click()
 assert page.locator('[data-shared-window-create]').is_hidden() and page.locator('[data-shared-window-minutes]').is_disabled()
 assert page.locator('#hmk-time-episode-form').is_hidden()
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').first
 card.locator('[data-shared-plan-minutes]').fill('20'); card.locator('[data-shared-plan-minutes]').press('Tab')
 print('AFTER MINUTES',page.evaluate('window.__statusPlan93771()'),'CARDS',page.locator('[data-shared-plan-card]').count(),'ERRORS',errors,'DIALOGS',dialogs,flush=True)
 card=page.locator('[data-shared-plan-card]').first
 card.locator('.hc-shared-plan-members summary').click()
 card.locator('.hc-shared-plan-members').locator('input[value=a]').check()
 card=page.locator('[data-shared-plan-card]').first
 print('BEFORE OPEN',page.evaluate('window.__statusPlan93771()'),flush=True)
 card.locator('[data-shared-plan-open]').click()
 print('AFTER OPEN',page.evaluate('window.__statusPlan93771()'),flush=True)
 form=page.locator('#hmk-time-episode-form');assert form.is_visible()
 assert form.locator('[name=kind]').input_value()=='travel' and form.locator('[name=minutes]').input_value()=='20'
 assert form.locator('[name=minutes]').is_disabled()
 form.locator('[name=area]').fill('Sněžení')
 if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
 for i in range(20):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  form.locator('[data-episode-evaluate]').click()
  field=form.get_attribute('data-episode-problem-field') or ''
  msg=form.get_attribute('data-episode-problem') or ''
  print('LOOP',i,field,msg[:140],flush=True)
  if field in ('temperatureD10','precipitationD10'):
   form.locator('[name='+field+']').fill('5');continue
  if field in ('orientationProofId','droverProofId'):
   page.locator('[data-episode-skill-task]').first.click()
   skill=page.locator('#skill-value-form' if field=='orientationProofId' else '#skill-secondary-form')
   skill.locator('[name=rollA]').fill('31');skill.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   form=page.locator('#hmk-time-episode-form');continue
  val={'precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100',
       'directionD10':'6','forageD10':'4'}.get(field)
  if field=='habitat':form.locator('[name=habitat]').select_option('mixed-forest');continue
  if field.startswith('end_'):val='5'
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
   val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
  if val is not None:
   form.locator('[name='+field+']').fill(val);continue
  if not field and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
   form.locator('[name=encounterResolution]').select_option('no-consequence');continue
  if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
  if page.locator('[data-episode-window-stage]').is_enabled():break
  raise AssertionError(('unable',field,msg,page.locator('[data-episode-checklist]').inner_text()[-500:],dialogs,errors))
 else:raise AssertionError('not ready')
 page.locator('[data-episode-window-stage]').click()
 result=page.evaluate('window.__statusPlan93771()')
 print('STAGED',result,flush=True)
 assert len(result['queue'])==1 and result['plans'][0]['done']
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').nth(1)
 card.locator('[data-shared-plan-kind]').select_option('forage')
 card=page.locator('[data-shared-plan-card]').nth(1)
 follow=card.locator('[data-shared-plan-follow]')
 print('FOLLOW OPTIONS',follow.evaluate('e=>[...e.options].map(o=>({value:o.value,text:o.text}))'),flush=True)
 follow.select_option(result['plans'][0]['groupId'])
 card=page.locator('[data-shared-plan-card]').nth(1)
 assert card.locator('[data-shared-plan-minutes]').input_value()=='20'
 card.locator('[data-shared-plan-minutes]').fill('30');card.locator('[data-shared-plan-minutes]').press('Tab')
 card=page.locator('[data-shared-plan-card]').nth(1)
 state=page.evaluate('window.__statusPlan93771()')
 print('OVERSIZE STATE',state,flush=True)
 assert state['slots']['errors'] and '20 minut' in state['slots']['errors'][0]['message']
 assert card.locator('[data-shared-plan-open]').is_disabled()
 assert not page.locator('[data-episode-skill-task]').count() or page.locator('#hmk-time-episode-form').is_hidden()
 assert len(state['queue'])==1 and state['journal']>=0 and state['storedMinute']==480
 card.locator('[data-shared-plan-minutes]').fill('20');card.locator('[data-shared-plan-minutes]').press('Tab')
 state=page.evaluate('window.__statusPlan93771()')
 assert not state['slots']['errors']
 print('FIXED',state,flush=True)
 # Resume after browser reload should retain all staged proofs and schedule, without new rolls.
 after_reload=page.evaluate('window.__reloadPlan93771()');print('RELOAD',after_reload,flush=True)
 assert len(after_reload['queue'])==1 and len(after_reload['plans'])==2 and not after_reload['slots']['errors']
 assert not errors,(errors,dialogs)
 print('PASS preflight 40/20/30 -> 20, lock, reload',flush=True)
 def complete_plan(index,area):
  card=page.locator('[data-shared-plan-card]').nth(index);card.locator('[data-shared-plan-open]').click()
  form=page.locator('#hmk-time-episode-form')
  form.locator('[name=area]').fill(area)
  if not form.locator('[name=confirmed]').is_checked():form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
  for i in range(25):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   form.locator('[data-episode-evaluate]').click()
   field=form.get_attribute('data-episode-problem-field') or ''
   msg=form.get_attribute('data-episode-problem') or ''
   print('NEXT LOOP',index,i,field,msg[:120],flush=True)
   if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','forageD10','directionD10'):
    form.locator('[name='+field+']').fill({'temperatureD10':'5','precipitationD10':'5','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100','forageD10':'4','directionD10':'6'}[field]);continue
   if field=='habitat':form.locator('[name=habitat]').select_option('mixed-forest');continue
   if field.startswith('end_'):
    form.locator('[name='+field+']').fill('5');continue
   if field in ('orientationProofId','droverProofId'):
    page.locator('[data-episode-skill-task]').first.click()
    skill=page.locator('#skill-value-form' if field=='orientationProofId' else '#skill-secondary-form')
    skill.locator('[name=rollA]').fill('31');skill.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click();form=page.locator('#hmk-time-episode-form');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    form.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
   if not field and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text():
    form.locator('[name=encounterResolution]').select_option('no-consequence');continue
   if page.locator('[data-episode-window-stage]').is_enabled():break
   raise AssertionError(('next unable',index,field,msg,page.locator('[data-episode-checklist]').inner_text()[-350:],dialogs,errors))
  else:raise AssertionError('second card not ready')
  page.locator('[data-episode-window-stage]').click()
  print('NEXT STAGED',index,page.evaluate('window.__statusPlan93771()'),flush=True)
 complete_plan(1,'Sněžení')
 page.set_default_timeout(5000)
 print('BEFORE THIRD ADD',page.locator('[data-shared-plan-add]').evaluate('e=>({disabled:e.disabled,hidden:e.hidden,outer:e.outerHTML})'),page.evaluate('window.__statusPlan93771()'),flush=True)
 page.locator('[data-shared-plan-add]').click()
 print('AFTER THIRD ADD',page.locator('[data-shared-plan-card]').count(),flush=True)
 card=page.locator('[data-shared-plan-card]').nth(2)
 card.locator('[data-shared-plan-kind]').select_option('rest')
 card=page.locator('[data-shared-plan-card]').nth(2)
 card.locator('[data-shared-plan-minutes]').fill('30');card.locator('[data-shared-plan-minutes]').press('Tab')
 card=page.locator('[data-shared-plan-card]').nth(2)
 card.locator('.hc-shared-plan-members summary').click()
 card.locator('.hc-shared-plan-members input[value=b]').check()
 state=page.evaluate('window.__statusPlan93771()')
 assert not state['slots']['errors'] and state['slots']['scheduled'][2]['startMinute']==480,state
 complete_plan(2,'Sněžení')
 state=page.evaluate('window.__statusPlan93771()')
 assert len(state['queue'])==3 and all(x['done'] for x in state['plans'])
 assert page.locator('[data-episode-window-commit]').is_enabled()
 page.locator('[data-episode-window-commit]').click()
 state=page.evaluate('window.__statusPlan93771()')
 print('COMMITTED',state,'ERRORS',errors,'DIALOGS',dialogs,flush=True)
 assert state['storedMinute']==520 and state['minute']==520 and len(state['queue'])==0
 assert state['events']==2
 assert not errors,errors
 print('PASS E2E 3 cards (A travel 20+forage 20, B rest 30), GM once 08:40',flush=True)
 # Fresh window: closing an unopened/test-free card is not emergency recovery.
 page.locator('[data-shared-window-minutes]').fill('20');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').first
 card.locator('[data-shared-plan-kind]').select_option('rest')
 card=page.locator('[data-shared-plan-card]').first
 card.locator('.hc-shared-plan-members summary').click();card.locator('.hc-shared-plan-members input[value=b]').check()
 card=page.locator('[data-shared-plan-card]').first
 card.locator('[data-shared-plan-open]').click()
 assert page.locator('#hmk-time-episode-form').is_visible()
 page.locator('[data-shared-plan-close]').click()
 assert page.locator('#hmk-time-episode-form').is_hidden()
 assert len(page.evaluate('window.__statusPlan93771()')['queue'])==0
 print('PASS opened empty card can return to planning',flush=True)
 before=page.evaluate('window.__statusPlan93771()')
 page.locator('[data-shared-window-cancel]').click()
 after=page.evaluate('window.__statusPlan93771()')
 assert after['draft'] is None and after['queue']==[] and after['storedMinute']==before['storedMinute']
 assert not errors,errors
 print('PASS cancel draft without evidence preserves GM time',flush=True)
 page.locator('[data-shared-window-minutes]').fill('20');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 card=page.locator('[data-shared-plan-card]').first
 card.locator('[data-shared-plan-kind]').select_option('rest')
 card=page.locator('[data-shared-plan-card]').first
 card.locator('.hc-shared-plan-members summary').click();card.locator('.hc-shared-plan-members input[value=b]').check()
 card=page.locator('[data-shared-plan-card]').first;card.locator('[data-shared-plan-open]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name=area]').fill('Sněžení')
 form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
 form.locator('[data-episode-evaluate]').click()
 assert page.locator('[data-episode-window-stage]').is_enabled(),(form.get_attribute('data-episode-problem'),form.get_attribute('data-episode-problem-field'))
 page.locator('[data-episode-window-stage]').click()
 mid=page.evaluate('window.__statusPlan93771()');assert len(mid['queue'])==1
 saved=mid['storedMinute'];saveJournal=len(json.loads(page.evaluate('window.localStorage.getItem("hmk-ledger-state-v1") || "{}"')).get('journal',[])) if False else 0
 page.locator('[data-shared-window-cancel]').click()
 after=page.evaluate('window.__statusPlan93771()')
 assert after['draft'] is None and after['queue']==[] and after['minute']==saved and after['storedMinute']==saved
 assert not errors,errors
 print('PASS cancellation after staged group does not require emergency, no GM time movement',flush=True)
 b.close()
