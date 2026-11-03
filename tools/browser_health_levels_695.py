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
window.__auditGoCalendar=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render();};
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
def ck(v,m):
 global checks
 if not v:raise AssertionError(m)
 checks+=1
def single(b,roll):
 p=load(b);p.set_default_timeout(7000);messages=[];errors=[]
 p.on('dialog',lambda d:(messages.append(d.message),d.accept()))
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.evaluate('window.__auditSeed(3,"edge",false)')
 f=prepare(p,81,3);f.locator('button[type=submit]').click()
 st=p.evaluate('window.__auditReport()')
 ck(st['clock']==495,'treatment time');ck(st['wounds'][0][0]['healing']['infectionPossible'] is True,'missing F risk')
 p.evaluate('window.__auditGoCalendar()')
 af=p.locator('#campaign-advance-form')
 for k,v in {'days':'4','hours':'23','minutes':'45','reason':'GM supervised convalescence'}.items():af.locator(f'[name={k}]').fill(v)
 af.locator('button[type=submit]').click()
 ck(p.evaluate('window.__auditReport().clock')==7680,'5 day due')
 p.locator('[data-cal-kind=healing][data-cal-link=actor-0]').first.click()
 h=p.locator('#hmk-healing-roll-form');ck(h.is_visible(),'healing form')
 ck(h.locator('[name=daySinceInjury]').input_value()=='5','healing day')
 for k,v in {'endurance':'12','will':'12','roll':str(roll)}.items():h.locator(f'[name={k}]').fill(v)
 h.locator('button[type=submit]').click()
 st=p.evaluate('window.__auditReport()');w=st['wounds'][0][0];he=w['healing']
 expected={20:(1,False),21:(2,False),81:(3,False),95:(3,True)}[roll]
 ck(w['level']==expected[0],f'wrong level {roll} {w["level"]}')
 ck(bool(he.get('infected')) is expected[1],f'wrong infection {roll}')
 ck(he.get('nextHealingDay')==(5 if roll==95 else 10),f'wrong next day {roll}')
 ck(st['clock']==7680,'healing changed time')
 ck(st['combatEvents'][0]==['injury-treatment','injury-healing-roll'],'missing combat events')
 ck(sum(bool(j['medical']) for j in st['journal'])==2,'not exactly 2 medical receipts')
 old=p.evaluate('localStorage.getItem("hmk-keepers-ledger-v1")');ck(bool(old),'not saved')
 q=load(b,{'hmk-keepers-ledger-v1':old});re=q.evaluate('window.__auditReport()')
 ck(re['wounds']==st['wounds'],'reload wounds changed')
 ck(re['clock']==7680,'reload clock')
 ck(re['journal']==st['journal'],'reload diary')
 ck(re['combatEvents']==st['combatEvents'],'reload combat')
 ck(not errors,'page error')
 print('PASS Healing',roll,'SL',('CS' if roll==20 else 'S' if roll==21 else 'F' if roll==81 else 'CF'),'IL',w['level'],'infected',he.get('infected',False),'next',he.get('nextInfectionDay',he.get('nextHealingDay')),flush=True)
 q.close();p.close()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
 for roll in [20,21,81,95]:single(b,roll)
 b.close();print('SUMMARY 4 scenarios',checks,'checks, Chromium with production bundle injected')
