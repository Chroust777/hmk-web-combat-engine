"""E2E Grim Wound due in long journey. Synthetic existing wound, production calendar and executor."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'hmk-app.bundle.js').read_text(encoding='utf8')
prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
# Synthetic actor lacks 14-step Creation; bypass that fixture gate only.
creation=modules['src/integration/hmk-character-creation.js']
for fn,ret in [('characterJournalReadiness(character)','{ready:true,missingSteps:[],issues:[],reason:""}'),('creationRevisionIssues(character)','[]'),('assertCreationInvariants(character)','true')]:
 needle='function '+fn+' {'
 assert needle in creation,needle
 creation=creation.replace(needle,needle+'if(["a","b"].includes(character?.id))return '+ret+';')
modules['src/integration/hmk-character-creation.js']=creation
modules['app.js']+='' '''
window.__seedGrim93781=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');const H=require('./src/integration/persistent-combat-state.js');
 data=clean();const state=H.initialCombatState();
 state.wounds.push({id:'grim-w1',location:'ua',severity:'G',level:4,aspect:'b',bleeding:false,healed:false,nextAdvanceRound:null,
  healing:{treated:true,untreated:true,healingRate:1,grimWound:true,nextGrimShockDay:2,nextHealingDay:5,infectionPossible:true}});
 data.characters=[{id:'a',name:'Zraněný cestovatel',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},
  skills:[{id:'survival-a',name:'Survival',ml:75},{id:'shock-a',name:'Shock',ml:75}],healthState:state}}];
 const healthy=structuredClone(data.characters[0]);healthy.id='b';healthy.name='Zdravý průvodce';healthy.hmk.healthState=H.initialCombatState();healthy.hmk.skills=[{id:'survival-b',name:'Survival',ml:75}];data.characters.push(healthy);data.characters[0].hmk.injuries=[{id:'grim-w1',location:'ua',severity:'G',bleeding:false,combatRecord:true}];
 let clock=C.createCampaignCalendar({day:3,hour:8,minute:0,campaignId:'audit-grim-93781',eventId:'start',gmConfirmed:true,characterIds:['a','b']});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'a',woundId:'grim-w1',elapsedMinutes:2820,eventId:'wound-claim',source:'gm-attested',gmConfirmed:true});
 data.campaignClock=clock;
 const weatherDay=require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5,landscape:'flat'});
 data.journal.push({id:'global-weather-grim',characterId:'a',calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(clock),campaignMinute:clock.minute,
  createdAt:stamp(),title:'Denní počasí · Les',body:'Audit počasí',calendarTrekDayWeather:{format:'hmk-trek-daily-weather-v1',dayIndex:Math.floor(clock.minute/1440),area:'Les',season:'spring',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,latitudeBand:'mid',weatherDay,diceOrigins:['manual','manual'],uniquenessPolicy:'area-day-v93.620'}});
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__stateGrim93781=()=>{const C=require('./src/integration/hmk-campaign-calendar.js');const W=require('./src/integration/hmk-calendar-chronology.js');const a=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);
 return {minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,due:a.due.map(x=>({kind:x.kind,minute:x.minute})),future:a.future.map(x=>({kind:x.kind,minute:x.minute})),unknown:a.unknown,window:W.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda:a}),journal:data.journal.length,wounds:data.characters[0].hmk.healthState.wounds,shock:data.characters[0].hmk.healthState.shock};};
window.__grimOverview93781=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render()};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':960})
 page.set_default_timeout(3500);errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedGrim93781()')
 start=page.evaluate('window.__stateGrim93781()');print('START',start,flush=True)
 assert start['minute']==3360 and start['window']['maxAllowed']==60,start
 # A user asks for a longer journey; UI must warn/cap before starting.
 inp=page.locator('[data-shared-window-minutes]');print('UI MINUTES',inp.get_attribute('max'),inp.input_value(),flush=True)
 inp.fill('120');page.locator('[data-shared-window-create]').click()
 print('AFTER 120 REQUEST',page.evaluate('window.__stateGrim93781()'),dialogs,flush=True)
 assert page.evaluate('window.__stateGrim93781()')['stored']==3360,'Crossed grim deadline'
 # At safe limit use a 60 minute travelling segment.
 if page.locator('[data-shared-window-minutes]').is_enabled():
  page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
 assert page.locator('[data-shared-plan-add]').is_visible()
 page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').last
 row.locator('[data-shared-row-actor]').select_option('b')
 row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('rest')
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form');form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
 for i in range(30):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  form.locator('[data-episode-evaluate]').click()
  field=form.get_attribute('data-episode-problem-field') or '';msg=form.get_attribute('data-episode-problem') or ''
  print('STEP',i,field,msg[:160],flush=True)
  if page.locator('[data-episode-window-stage]').is_enabled():break
  if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','directionD10','forageD10'):
   form.locator('[name='+field+']').fill({'temperatureD10':'5','precipitationD10':'5','precipitationD6':'6','encounterD100':'100','encounterD100Sub':'100','directionD10':'6','forageD10':'5'}[field]);continue
  if field=='orientationProofId':
   page.locator('[data-episode-skill-task]').first.click();skill=page.locator('#skill-value-form');skill.locator('[name=rollA]').fill('31');skill.locator('[type=submit]').click();page.locator('[data-episode-return]').first.click();form=page.locator('#hmk-time-episode-form');continue
  if field=='progressD10':form.locator('[name=progressD10]').fill('1');continue
  if field.startswith('end_'):form.locator('[name='+field+']').fill('5');continue
  if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
  raise AssertionError('Unreachable '+field+' '+msg)
 assert page.locator('[data-episode-window-stage]').is_enabled()
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 due=page.evaluate('window.__stateGrim93781()');print('DUE',due,'DIALOGS',dialogs,'PAGE_ERR',errs,'BODY',page.locator('body').inner_text()[-1000:],flush=True)
 assert due['minute']==3420 and due['stored']==3420 and any(x['kind']=='grim' for x in due['due'])
 # A fresh journey cannot advance time while Grim Shock is due.
 assert due['window']['maxAllowed']==0
 page.evaluate('window.__grimOverview93781()')
 button=page.locator('[data-cal-kind=grim]').first
 print('ORIGINAL LINK',button.count(),button.get_attribute('data-cal-destination') if button.count() else None,flush=True)
 assert button.count()>0
 button.click()
 gf=page.locator('#hmk-grim-shock-form')
 print('GRIM FORM',gf.count(),gf.is_visible() if gf.count() else None, gf.locator('[name]').evaluate_all('(a)=>a.map(n=>[n.name,n.value])') if gf.count() else None,flush=True)
 assert gf.count() and gf.is_visible(),'Original Grim Shock form not accessible'
 gf.locator('[name=locationShock]').fill('0');gf.locator('[name=shockML]').fill('75');gf.locator('[name=roll]').fill('20')
 gf.locator('[type=submit]').click()
 resumed=page.evaluate('window.__stateGrim93781()')
 print('RESUMED AFTER GRIM',resumed,'DIALOGS',dialogs[-3:],flush=True)
 assert resumed['stored']==3420 and not resumed['due'] and resumed['wounds'][0]['healing']['nextGrimShockDay']==3
 assert resumed['window']['maxAllowed']>0,'Grim form did not unlock calendar'
 print('LAST ERR',errs,'DIALOGS',dialogs,flush=True)
 assert not errs,errs
 print('PASS Grim Wound limits long travel, blocks due after exact minute, and links to original visible medical form',flush=True)
 browser.close()
