"""Chromium DOM e2e: HMK v93.694 treatment bottleneck, atomic time, reload, future event barriers.
Production bundle injected (HTTP blocked by administrator); no fake treatment calculations.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,shutil
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(); prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);assert 'app.js' in mods
mods['app.js']+='''
window.__auditSeed=(level=3,aspect='edge',two=false)=>{
const Calendar=require('./src/integration/hmk-campaign-calendar.js'),State=require('./src/integration/persistent-combat-state.js');
data=clean();const s=State.initialCombatState();s.wounds=[{id:'injury-694',location:'ua',side:'left',severity:level>=4?'G':level>=2?'S':'M',level,aspect,bleeding:false,nextAdvanceRound:null,recordedRound:1}];
State.validateCombatState(s);data.characters=[{id:'actor-0',name:'Patient',kind:'PC',hmk:{attributes:{end:12,wil:12},combatState:s}}];
if(two)data.characters.push({id:'actor-1',name:'Helper',kind:'PC',hmk:{attributes:{end:15,wil:13},combatState:State.initialCombatState()}});
let cl=Calendar.createCampaignCalendar({day:1,hour:8,minute:0,label:'Treatment 694',eventId:'initial-694',gmConfirmed:true,campaignId:'treatment694',characterIds:data.characters.map(x=>x.id)});
data.campaignClock=Calendar.anchorCampaignOrigin(cl,{kind:'wound',characterId:'actor-0',woundId:'injury-694',elapsedMinutes:0,eventId:'anchor-694',gmConfirmed:true});
data.journal=[];const NP=require('./src/integration/hmk-nutrition-days.js');for(const ch of data.characters){let policy=NP.createNutritionPolicy({campaignId:'treatment694',minute:480,actorId:ch.id,enabled:true,autoNeeds:true,gmProvisioned:true});data.journal.push({id:'nutrition-policy-'+ch.id,characterId:ch.id,calendarCampaignId:'treatment694',campaignMinute:480,createdAt:stamp(),title:'GM food and water guaranteed',body:'Test-specific GM coverage',calendarNutritionPolicy:policy});}selected='actor-0';view='calendar';calendarLanding=false;activeCalendarSection='overview';calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;encounterSelection.clear();render();};
window.__auditPlan=(minute)=>{data.campaignClock=require('./src/integration/hmk-calendar-planner.js').addGMCalendarPlan(data.campaignClock,{id:'timebar-694',eventId:'timebar-event-694',title:'Mid-procedure mandatory meeting',note:'Medical and travel transaction safety test',characterId:'actor-0',minute,endMinute:minute,destination:'notes',requiresAction:true,confirmed:true});render();};
window.__auditAddSecondWound=()=>{const s=data.characters[1].hmk.combatState;s.wounds=[{id:'second-injury-694',location:'ua',severity:'M',level:1,aspect:'blunt',bleeding:false,nextAdvanceRound:null,recordedRound:1}];data.campaignClock=require('./src/integration/hmk-campaign-calendar.js').anchorCampaignOrigin(data.campaignClock,{kind:'wound',characterId:'actor-1',woundId:'second-injury-694',elapsedMinutes:0,eventId:'second-anchor-694',gmConfirmed:true});render();};
window.__auditReport=()=>({clock:data.campaignClock.minute,events:data.campaignClock.events.map(x=>({type:x.type,minute:x.minute})),wounds:data.characters.map(c=>c.hmk?.combatState?.wounds),combatEvents:data.characters.map(c=>c.hmk?.combatState?.events?.map(e=>e.type)),journal:data.journal.map(j=>({id:j.id,title:j.title,medical:j.calendarMedicalResolution?.sourceEventId})),due:require('./src/integration/hmk-calendar-automatic-followups.js').automaticHMKFollowups(data.campaignClock,data.characters,data.journal).all.map(x=>({kind:x.kind,minute:x.minute})),version:APP_VERSION,storage:storageReadOnly});
window.__auditSecondWound=()=>{data.characters[0].hmk.injuries=[{id:'injury-694',location:'ua',severity:'S',level:3,aspect:'edge',bleeding:false,combatRecord:true}];const c=data.characters[1];const C=require('./src/integration/hmk-campaign-calendar.js');c.hmk.combatState.wounds=[{id:'injury-second',location:'ua',side:'left',severity:'M',level:1,aspect:'blunt',bleeding:false,nextAdvanceRound:null,recordedRound:1}];c.hmk.injuries=[{id:'injury-second',location:'ua',severity:'M',level:1,aspect:'blunt',bleeding:false,combatRecord:true}];data.campaignClock=C.anchorCampaignOrigin(data.campaignClock,{kind:'wound',characterId:c.id,woundId:'injury-second',elapsedMinutes:0,eventId:'anchor-second',gmConfirmed:true});render();};window.__auditGoCalendar=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
css=[(root/x).read_text() for x in ['styles.css','book-templates.css','skill-workbench.css','library.css']]
count=0;scenarios=0

def check(v,reason):
 global count
 if not v:raise AssertionError(reason)
 count+=1

def load(browser,save=None):
 page=browser.new_page(viewport={'width':1420,'height':1050});page.set_default_timeout(9000)
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''s=>{const m=new Map(s?Object.entries(s):[]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}});}''',save)
 for c in css:page.add_style_tag(content=c)
 page.add_script_tag(content=bundle)
 return page

def prepare(page,roll=21,lev=3):
 link=page.locator('[data-cal-kind="treatment"][data-cal-link="actor-0"]');check(link.count()>0,'No treatment calendar link')
 link.first.click();f=page.locator('#hmk-treatment-form');check(f.is_visible(),'Treatment form not open')
 for k,value in {'daySinceInjury':'0','physicianML':'60','physicianIndex':'6','physicianRoll':str(roll),'procedureStartMinute':'480','procedureEndMinute':str(480+(30 if lev>=4 else 5*lev))}.items():f.locator(f'[name={k}]').fill(value)
 f.locator('[name=available]').select_option(['water','bandages','needle-thread','surgery-tools'])
 return f

def trial(browser,roll,level=3,plan=None,second=False):
 global scenarios
 page=load(browser);msgs=[];errors=[]
 page.on('dialog',lambda d:(msgs.append(d.message),d.accept()))
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('args=>window.__auditSeed(args.lvl,args.asp,args.two)',{'lvl':level,'asp':'edge','two':second})
 if plan is not None:page.evaluate('n=>window.__auditPlan(n)',plan)
 if second:page.evaluate('window.__auditAddSecondWound()')
 initial=page.evaluate('window.__auditReport()')
 check(initial['clock']==480,'Bad initial minute')
 f=prepare(page,roll,level)
 beforeRaw=page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")')
 check(page.evaluate('window.__auditReport().wounds[0][0].healing===undefined'),'Early healing mutation')
 f.locator('button[type=submit]').click()
 result=page.evaluate('window.__auditReport()')
 if (plan is not None and plan<480+(30 if level>=4 else 5*level)) or second:
  check(result['clock']==480,'Crossed a mandatory barrier')
  check(result['wounds'][0][0].get('healing') is None,'Applied treatment despite mandatory barrier')
  check(result['journal']==[],'Unapproved journal write on failed treatment')
  check(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")')==beforeRaw,'Storage changed despite barrier rejection')
  check(any('Nelze přeskočit' in s or 'povinn' in s for s in msgs),'No clear mandatory barrier explanation')
  print('PASS barrier',{'plan':plan,'second':second,'errors':msgs[-1][:125]})
 else:
  minute=480+(30 if level>=4 else 5*level)
  check(result['clock']==minute,'Wrong finished time')
  h=result['wounds'][0][0].get('healing')
  check(h and h['treated'] is True,'Treatment missing')
  check(len(h['treatments'])==1,'Duplicated actual roll')
  check(h['treatments'][0]['physicianRoll']==roll,'Roll rewritten')
  check(h['treatments'][0]['procedureTime']=={'startMinute':480,'endMinute':minute,'gmConfirmed':True,'varianceReason':''},'Procedure chronology wrong')
  print('DEBUG',result['clock'],'journal',result['journal'],'msgs',msgs,'errors',errors,flush=True)
  check(sum(bool(j.get('medical')) for j in result['journal'])==1,'Medical diary not exactly once')
  check(not any(e['kind']=='treatment' for e in result['due']),'Treatment due not cleared')
  check(result['events'][-1]['minute']==minute,'Calendar ledger time mismatch')
  check(result['events'][-1]['type']=='resolution','No confirmed medical resolution in Calendar')
  check(not errors,'Chromium exception')
  if plan is not None:
   check(any(p.get('id')=='timebar-694' for p in json.loads(page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")'))['campaignClock'].get('plans',[])),'Due plan lost')
  stored=page.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")');check(bool(stored),'Missing durable save')
  page.close()
  re=load(browser,{'hmk-keepers-ledger-v1':stored})
  check(re.evaluate('window.__auditReport().clock')==minute,'Reload lost time')
  report=re.evaluate('window.__auditReport()')
  check(report['wounds'][0][0]['healing']==h,'Reload changed treatment')
  check(report['journal']==result['journal'],'Reload duplicated journal')
  check(report['events']==result['events'],'Reload damaged calendar events')
  re.close()
  print('PASS treatment',{'roll':roll,'sl':h['treatments'][0]['slName'],'minute':minute,'nextHealingDay':h.get('nextHealingDay'),'nextGrimShockDay':h.get('nextGrimShockDay')})
 page.close() if not page.is_closed() else None
 scenarios+=1



checks=0
def ck(ok,why):
 global checks
 if not ok:raise AssertionError(why)
 checks+=1
def adv(p,days=0,hours=0,minutes=0):
 p.evaluate('window.__auditGoCalendar()')
 f=p.locator('#campaign-advance-form')
 for k,v in {'days':days,'hours':hours,'minutes':minutes,'reason':'GM: documented passage of time'}.items():f.locator(f'[name={k}]').fill(str(v))
 f.locator('button[type=submit]').click()

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
 p=load(b);p.set_default_timeout(8000);alerts=[];errors=[]
 p.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.evaluate('window.__auditSeed(3, "edge", true)');p.evaluate('window.__auditSecondWound()')
 initial=p.evaluate('window.__auditReport()');ck(len(initial['wounds'])==2,'2 actors');ck(all(len(w)==1 for w in initial['wounds']),'2 injuries')
 # Handle actor2 without treatment - this is its documented explicit GM disposition.
 p.locator('[data-cal-kind=treatment][data-cal-link=actor-1]').first.click()
 f=p.locator('#hmk-treatment-form');ck(f.is_visible(),'2nd injury treatment visible')
 ck(f.locator('[name=wound]').input_value()=='actor-1::injury-second','wrong second patient')
 f.locator('[name=untreated]').check();f.locator('[name=daySinceInjury]').fill('0');f.locator('button[type=submit]').click()
 st=p.evaluate('window.__auditReport()');print('UNTREATED',st['clock'],st['combatEvents'],alerts[-1:] if alerts else '',flush=True)
 ck(st['clock']==480,'untreated should not advance time')
 ck(st['wounds'][1][0].get('healing',{}).get('untreated') is True,'no documented disposition')
 p.evaluate('window.__auditGoCalendar()')
 p.locator('[data-cal-kind=treatment][data-cal-link=actor-0]').first.click()
 f=p.locator('#hmk-treatment-form');ck(f.is_visible(),'1st injury treatment visible')
 for k,v in {'daySinceInjury':'0','physicianML':'60','physicianIndex':'6','physicianRoll':'81','procedureStartMinute':'480','procedureEndMinute':'495'}.items():f.locator(f'[name={k}]').fill(v)
 f.locator('[name=available]').select_option(['water','bandages','needle-thread','surgery-tools'])
 f.locator('button[type=submit]').click()
 st=p.evaluate('window.__auditReport()');ck(st['clock']==495,'treatment minutes')
 ck(st['wounds'][0][0]['healing']['infectionPossible'] is True,'F infection possibility')
 ck(len(st['journal'])>=4,'nutrition and 2 medical receipts')
 # The two independent wounds have next due time at precisely same minute.
 adv(p,4,23,45);st=p.evaluate('window.__auditReport()');print('DAY5',st['clock'],'links',p.locator('[data-cal-kind=healing]').count(),flush=True)
 ck(st['clock']==7680,'day5 due clock')
 ck(p.locator('[data-cal-kind=healing]').count()>=2,'both healings due')
 # GM resolves actor 0 first; a CF introduces infection and suspends actor 1.
 p.locator('[data-cal-kind=healing][data-cal-link=actor-0]').first.click()
 h=p.locator('#hmk-healing-roll-form');ck(h.is_visible(),'healing form visible')
 ck(h.locator('[name=daySinceInjury]').input_value()=='5','wrong healing day')
 for k,v in {'endurance':'12','will':'12','roll':'95'}.items():h.locator(f'[name={k}]').fill(v)
 h.locator('button[type=submit]').click();st=p.evaluate('window.__auditReport()')
 ck(st['wounds'][0][0]['healing'].get('infected') is True,'CF infection failed')
 ck(st['clock']==7680,'heal moved clock')
 print('AFTER INFECTION',st['combatEvents'],st['wounds'][1][0]['healing'],flush=True)
 # Cross-day limit must never skip the infection course.
 adv(p,2,0,0)
 ck(p.evaluate('window.__auditReport().clock')==7680,'skipped infection at day6')
 ck(any('Nelze' in a or 'nevyře' in a for a in alerts),'no due barrier message')
 # Independent actor 1 remains due: HMK pauses OTHER WOUNDS OF THE INFECTED PATIENT, not another character.
 p.evaluate('window.__auditGoCalendar()')
 p.locator('[data-cal-kind=healing][data-cal-link=actor-1]').first.click()
 h2=p.locator('#hmk-healing-roll-form')
 ck(h2.is_visible(),'actor1 healing must remain available')
 ck(h2.locator('[name=wound]').input_value()=='actor-1::injury-second','wrong independent actor after infection')
 for k,v in {'endurance':'12','will':'12','roll':'21'}.items():h2.locator(f'[name={k}]').fill(v)
 h2.locator('button[type=submit]').click()
 st=p.evaluate('window.__auditReport()')
 ck(st['wounds'][1][0].get('healed') is True,'independent injury did not heal')
 ck(st['clock']==7680,'second healing rolled time')
 # Advance exactly to next infection due.
 adv(p,1,0,0)
 print('AFTER DAY6',p.evaluate('window.__auditReport().clock'), 'ALERTS',alerts[-6:],flush=True);ck(p.evaluate('window.__auditReport().clock')==9120,'day6 wrong time')
 p.locator('[data-cal-kind=infection][data-cal-link=actor-0]').first.click()
 i=p.locator('#hmk-infection-course-form');ck(i.is_visible(),'infection form')
 ck(i.locator('[name=daySinceInjury]').input_value()=='6','infection day')
 print('RESUME FIELD',i.locator('[name="resumeDay:injury-second"]').count(),i.locator('[name="resumeDay:injury-second"]').input_value() if i.locator('[name="resumeDay:injury-second"]').count() else 'missing',flush=True)
 for k,v in {'endurance':'12','will':'12','roll':'5','physicianSV':'0'}.items():i.locator(f'[name={k}]').fill(v)
 i.locator('[name=gmConfirmed]').check();i.locator('button[type=submit]').click()
 st=p.evaluate('window.__auditReport()');print('CURED',st['clock'],[(w[0]['healing'].get('infected'),w[0]['healing'].get('nextHealingDay')) for w in st['wounds']],flush=True)
 ck(st['wounds'][0][0]['healing'].get('infected') is False,'not cured')
 ck(st['wounds'][0][0]['healing']['nextHealingDay']==11,'wrong resumption after infection')
 ck(st['wounds'][1][0]['healed'] is True,'independent healed injury changed')
 ck(len(st['combatEvents'][0])==3,'actor0 events missing')
 ck(len(st['combatEvents'][1])==2,'actor1 injury and healing missing')
 ck(sum(bool(j['medical']) for j in st['journal'])==5,'medical receipts count')
 before=p.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")');q=load(b,{'hmk-keepers-ledger-v1':before})
 re=q.evaluate('window.__auditReport()')
 ck(re['clock']==st['clock'],'reload clock')
 ck(re['wounds']==st['wounds'],'reload wounds')
 ck(re['journal']==st['journal'],'reload journal')
 ck(re['combatEvents']==st['combatEvents'],'reload events')
 print('RELOAD PASS',re['clock'],flush=True)
 ck(not errors,'Javascript runtime errors: '+str(errors))
 print('SUMMARY',checks,'checks, 1 scenario, 2 actors/2 independent injuries same due minute, course & reload',flush=True)
 q.close();p.close();b.close()
