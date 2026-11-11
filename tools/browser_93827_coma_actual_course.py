"""Actual v93.788 browser Coma followup with verified original Travel Accident injury; calendar at attested due minute fixture."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
cr=mods['src/integration/hmk-character-creation.js']
for orig,add in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert orig in cr
 cr=cr.replace(orig,add)
mods['src/integration/hmk-character-creation.js']=cr
mods['app.js']+="""
window.__comaSeed93794=()=>{
 const H=require('./src/integration/persistent-combat-state.js'),I=require('./src/integration/hmk-skill-physical-consequences.js'),C=require('./src/integration/hmk-campaign-calendar.js');
 const a={id:'a',kind:'PC',name:'Zraněný 93794',hmk:{folk:'human',isFolk:true,attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,aur:12,cre:12,cml:12,emp:12,elo:12},skills:[{id:'s-shock-93794',name:'Shock',ml:65},{id:'s-survival-93794',name:'Survival',ml:70},{id:'s-initiative-93827',name:'Initiative',ml:65}],healthState:H.initialCombatState()}};
 const proof=I.prepareSkillPhysicalInjury({kind:'survival-accident',actor:a,inventory:[],state:a.hmk.healthState,sourceId:'coma-browser-93794',round:1,gmConfirmed:true,originMinute:480,hazardD10:5,agilityD100:100,randomVictimConfirmed:true,impactDie:1,zoneD10:1,locationD10:6,shockD100:100});
 a.hmk.healthState=proof.state;data=clean();data.characters=[a];data.inventory=[];data.journal=[];
 let clock=C.createCampaignCalendar({day:1,hour:8,minute:0,eventId:'seed-coma-browser',gmConfirmed:true,campaignId:'coma-browser93794',characterIds:['a']});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'a',woundId:proof.state.wounds[0].id,eventId:'coma-wound-anchor',combatEventId:proof.state.wounds[0].originEventId,source:'confirmed-health'});
 clock={...clock,minute:490,events:[...clock.events,{id:'actual-attested-ten-minutes',type:'advance',minute:490,reason:'Testovací osvědčení 10 skutečných minut pro due Shock'}]};C.validateCampaignCalendar(clock);data.campaignClock=clock;
 view='sheet';selected='a';activeSheetSection='hazards';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__comaState93794=()=>({minute:data.campaignClock.minute,shock:character('a').hmk.healthState.shock,shockFollowup:character('a').hmk.healthState.shockFollowup,coma:character('a').hmk.healthState.coma,extended:character('a').hmk.healthState.extendedShock,events:character('a').hmk.healthState.events.slice(-2),agenda:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).future.filter(x=>['coma','extended-shock'].includes(x.kind)),journal:data.journal.length,stored:JSON.parse(localStorage.getItem(STORAGE)).characters[0].hmk.healthState.coma});
window.__comaReload93794=()=>{data=JSON.parse(localStorage.getItem(STORAGE));selected='a';view='sheet';activeSheetSection='hazards';render();}
"""
mods['app.js']+="""
window.__attestShelteredCare93827=()=>{
 const N=require('./src/integration/hmk-nutrition-days.js');
 const policy=N.createNutritionPolicy({campaignId:data.campaignClock.campaignId,minute:data.campaignClock.minute,actorId:'a',autoNeeds:true,gmProvisioned:true});
 const row={id:'attested-caregiver-food-water-93827',characterId:'a',calendarCampaignId:data.campaignClock.campaignId,
   campaignMinute:data.campaignClock.minute,createdAt:stamp(),title:'Potvrzená péče o pacienta · jídlo a voda',
   body:'GM potvrdil, že opatrovník zajišťuje plné denní dávky jídla a vody po dobu sledovaného kómatu. Žádný fiktivní inventář.',calendarNutritionPolicy:policy};
 return mutate(()=>{data.journal.push(row);});
};
window.__showCalendar93827=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';render();return !!document.querySelector('#campaign-advance-form')};
window.__advanceComa93827=(mins)=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const before=data.campaignClock.minute;
 try{const next=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:mins,eventId:'actual-elapsed-'+before+'-'+mins,reason:'Doložený odpočinek a časový průběh pacienta',gmConfirmed:true,characters:data.characters,journal:data.journal,inventory:data.inventory});
  if(!mutate(()=>{data.campaignClock=next;},{gmClockAdvance:true}))throw Error('Mutace času nebyla uložena');
  selected='a';view='sheet';activeSheetSection='hazards';render();
  return {ok:true,minute:data.campaignClock.minute,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute};
 }catch(err){return {ok:false,message:err.message,minute:data.campaignClock.minute}}
};
window.__healthComa93827=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),s=character('a').hmk.healthState;
 const q=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);
 return {minute:data.campaignClock.minute,storedMinute:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,shock:s.shock,coma:s.coma,extended:s.extendedShock,wound:s.wounds[0],due:q.due.map(x=>[x.kind,x.minute]),future:q.future.slice(0,6).map(x=>[x.kind,x.minute]),unknown:q.unknown.map(x=>x.kind),suspended:q.suspended.map(x=>x.kind),journal:data.journal.length};
};
window.__healthComaReload93827=()=>{data=JSON.parse(localStorage.getItem(STORAGE));selected='a';view='sheet';activeSheetSection='hazards';render();return window.__healthComa93827()};
"""
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':1000});page.set_default_timeout(12000);errors=[];dialogs=[]
 page.on('pageerror',lambda err:errors.append(str(err)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),o={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__comaSeed93794()')
 try:
  form=page.locator('form[data-weather-shock-followup]')
  assert form.count()==1,'missing actual Travel Shock form'
  print('FORM',form.get_attribute('data-shock-coma-ready'),form.get_attribute('data-shock-eml'),flush=True)
  assert form.get_attribute('data-shock-coma-ready')=='yes'
  d10=form.locator('[name=initialComaD10]')
  assert d10.is_disabled(),'Coma d10 must be hidden until actually CF'
  form.locator('[name=roll]').fill('10');assert d10.is_disabled(),'CS falsely unlocks Coma d10'
  form.locator('[name=roll]').fill('100');assert d10.is_enabled(),'CF should unlock extra actual d10'
  # Conditional dice generator is activated along with the original manual field;
  # generating a value must NEVER itself confirm the Coma event.
  gen=form.locator('button[data-weather-coma-d10]')
  assert gen.count()==1 and gen.is_enabled(), 'missing required generator for Coma d10'
  gen.click()
  assert 1<=int(d10.input_value())<=10
  assert page.evaluate('window.__comaState93794()')['journal']==0
  form.locator('[name=roll]').fill('10')
  assert d10.is_disabled() and gen.is_disabled() and d10.input_value()==''
  form.locator('[name=roll]').fill('100')
  assert d10.is_enabled() and gen.is_enabled() and d10.input_value()==''
  # Missing conditional actual d10 must produce red exact-field focus, no effect.
  pre=page.evaluate('window.__comaState93794()');form.locator('[type=submit]').click()
  assert d10.get_attribute('aria-invalid')=='true' and d10.get_attribute('data-hmk-medical-invalid')=='yes'
  assert page.evaluate('document.activeElement?.name')=='initialComaD10'

  failed=page.evaluate('window.__comaState93794()');assert failed['journal']==pre['journal'] and not failed['coma']
  print('MISSING_D10',page.evaluate('''()=>({focus:document.activeElement?.name,marked:document.activeElement?.getAttribute('data-hmk-medical-invalid')})'''),flush=True)
  # Abandon the unfinished health form (reload confirmed campaign), then
  # start it again. An uncommitted shock/Coma must not survive as a success.
  page.evaluate('window.__comaReload93794()')
  reloaded=page.evaluate('window.__comaState93794()')
  assert reloaded['journal']==0 and not reloaded['coma'] and reloaded['minute']==490
  form=page.locator('form[data-weather-shock-followup]');d10=form.locator('[name=initialComaD10]')
  assert form.count()==1 and d10.is_disabled()
  form.locator('[name=roll]').fill('100')
  assert d10.is_enabled() and form.locator('button[data-weather-coma-d10]').is_enabled()
  d10.fill('4');assert d10.get_attribute('aria-invalid') is None
  form.locator('[type=submit]').click()
  result=page.evaluate('window.__comaState93794()');print('COMA_RESULT',json.dumps({k:v for k,v in result.items() if k not in ['events','shockFollowup']},ensure_ascii=False)[:1600],flush=True);print('COMA_FORM',form.locator('output').all_inner_texts() if form.count() else 'GONE', 'DIALOGS',dialogs[-5:], 'BODYTAIL',page.locator('body').inner_text()[-1000:],flush=True)
  assert result['coma']['active'] and result['coma']['nextCourseDays']==4 and result['coma']['hr']==5
  assert result['extended']['originState']=='UNC' and result['journal']==1 and result['minute']==490
  assert {'coma','extended-shock'}=={x['kind'] for x in result['agenda']},result['agenda']
  page.evaluate('window.__comaReload93794()');after=page.evaluate('window.__comaState93794()')
  assert after['coma']==result['coma'] and after['journal']==1 and not errors,errors
  seedCare=page.evaluate('window.__attestShelteredCare93827()');print('CARE_SETUP',seedCare,dialogs[-3:],flush=True);assert seedCare,'GM documented nutrition care registration'
  print('PASS original UNC + CF Coma creation and persistence',flush=True)
  assert page.evaluate('window.__showCalendar93827()'),'actual Calendar form must be present'
  advanceform=page.locator('#campaign-advance-form')
  assert advanceform.is_visible(),'Calendar form hidden'
  advanceform.locator('[name=days]').fill('0')
  advanceform.locator('[name=hours]').fill('4')
  advanceform.locator('[name=minutes]').fill('0')
  advanceform.locator('[name=reason]').fill('GM potvrzuje 4h hlídaného odpočinku pacienta')
  advanceform.locator('[type=submit]').click()
  advancement=page.evaluate('window.__healthComa93827()')
  print('FOUR_HOUR_ADVANCE_REAL_UI',advancement['minute'],advancement['storedMinute'],dialogs[-2:],flush=True)
  assert advancement['minute']==730 and advancement['storedMinute']==730,advancement
  page.evaluate('window.__healthComaReload93827()')
  course=page.locator('form[data-weather-trauma-course]')
  print('EXTENDED_FORM',course.count(),course.get_attribute('data-weather-trauma-course') if course.count() else None,flush=True)
  assert course.count()==1 and course.locator('[name=kind]').input_value()=='extended-shock'
  course.locator('[name=roll]').fill('10');course.locator('[type=submit]').click()
  state=page.evaluate('window.__healthComa93827()');print('EXTENDED_FINISHED',json.dumps(state,ensure_ascii=False,default=str)[:1900],flush=True)
  assert state['extended'] is None and state['coma'] is not None and state['shock']=='UNC'
  assert state['minute']==730 and state['storedMinute']==730
  page.evaluate('window.__healthComaReload93827()')
  state=page.evaluate('window.__healthComa93827()');assert state['extended'] is None and state['coma'] is not None and state['shock']=='UNC'
  print('PASS Chromium 4h actually progressed through Calendar transition, Extended CS resolves but Coma UNC persists on reload',flush=True)
  treatment=page.locator('#hmk-treatment-form')
  print('TREATMENT_VISIBLE',treatment.count(),treatment.is_visible() if treatment.count() else None,
        treatment.locator('[name=wound]').evaluate_all('(xs)=>xs.map(x=>x.value)') if treatment.count() else None,
        'AGENDA',state['due'],state['future'],flush=True)
  if treatment.count() and treatment.is_visible():
   treatment.locator('input[name=untreated]').first.check()
   print('TREATMENT_AFTER_UNTREATED',treatment.locator('[name]').evaluate_all('(es)=>es.filter(x=>x.getClientRects().length).map(x=>[x.name,x.value,x.disabled]).slice(0,25)'),flush=True)
   treatment.locator('[type=submit]').first.click()
   state=page.evaluate('window.__healthComa93827()')
   print('AFTER_UNTREATED',json.dumps(state,ensure_ascii=False,default=str)[:1900],flush=True)
  advance=page.evaluate('window.__advanceComa93827(5520)')
  print('COMA_FOUR_DAYS',advance,'DIALOGS',dialogs[-4:],flush=True)
  assert advance['ok'] and advance['minute']==6250 and advance['stored']==6250,advance
  course=page.locator('form[data-weather-trauma-course]')
  assert course.count()==1 and course.locator('[name=kind]').input_value()=='coma','Due Coma form unavailable'
  before=page.evaluate('window.__healthComa93827()')
  course.locator('[name=roll]').fill('10')
  course.locator('[name=restfulShelter]').select_option('yes')
  course.locator('[type=submit]').click()
  now=page.evaluate('window.__healthComa93827()')
  print('COMA_RESOLVED',json.dumps(now,ensure_ascii=False,default=str)[:1900],flush=True)
  assert now['coma'] is None and now['extended'] is None and now['shock']=='NONE'
  assert now['minute']==6250 and now['storedMinute']==6250
  page.evaluate('window.__healthComaReload93827()');assert page.evaluate('window.__healthComa93827().shock')=='NONE'
  print('PASS actual production Calendar advanced through 4 genuine days; real Coma CS form, saved and reloaded',flush=True)
  morale=page.locator('form[data-weather-injury-morale]')
  print('MORALE_FORM',morale.count(),morale.is_visible() if morale.count() else None,flush=True)
  assert morale.count()==1 and morale.is_visible() and morale.locator('[type=submit]').is_enabled()
  # Travel impact had no Aberrant originating attacker. GM explicitly certifies ABE 0,
  # rather than software silently fabricating a zero or an omitted d100.
  morale.locator('[name=aberrance]').fill('0')
  morale.locator('[name=gmConfirmedAberrance]').check()
  morale.locator('[name=roll]').fill('21')
  morale.locator('[type=submit]').click()
  st=page.evaluate('window.__healthComa93827()')
  print('AFTER_MORALE',st['due'],st['future'],st['journal'],flush=True)
  assert not any(k=='injury-morale' for k,m in st['due']) and st['minute']==6250
  page.evaluate('window.__healthComaReload93827()')
  move=page.evaluate('window.__advanceComa93827(1430)'); print('FIVE_DAY_HEALING',move,flush=True)
  assert move['ok'] and move['minute']==7680,move
  st=page.evaluate('window.__healthComa93827()')
  print('HEALING_DUE',st['due'],st['future'],flush=True)
  assert any(k=='healing' and m==7680 for k,m in st['due']),st['due']
  f=page.locator('#hmk-healing-roll-form')
  print('HEALING_FORM',f.count(),f.is_visible() if f.count() else None,flush=True)
  assert f.count()==1 and f.is_visible()
  print('HEALING_FIELDS',f.locator('[name]').evaluate_all('(es)=>es.map(x=>[x.name,x.value,x.disabled]).slice(0,16)'),flush=True)
  assert f.locator('[name=endurance]').input_value()=='12' and f.locator('[name=will]').input_value()=='12'
  f.locator('[name=roll]').fill('10');f.locator('[type=submit]').click()
  st=page.evaluate('window.__healthComa93827()');print('HEALING_ROLL',json.dumps(st,ensure_ascii=False,default=str)[:2100],flush=True)
  assert st['minute']==7680 and st['storedMinute']==7680
  assert st['wound']['level']<3,'Confirmed 5d Healing CS did not reduce IL'
  restored=page.evaluate('window.__healthComaReload93827()');assert restored['wound']['level']==st['wound']['level']
  print('PASS 4d Coma Course plus real 5d Healing UI and persistent original wound',flush=True)
  next_step=page.evaluate('window.__advanceComa93827(7200)')
  print('TEN_DAY_ADVANCE',next_step,flush=True)
  assert next_step['ok'] and next_step['minute']==14880,next_step
  st=page.evaluate('window.__healthComa93827()')
  print('TEN_DAY_DUE',st['due'],st['future'],flush=True)
  f=page.locator('#hmk-healing-roll-form')
  assert f.count()==1 and f.is_visible()
  print('TEN_DAY_HEALING_FIELDS',f.locator('[name]').evaluate_all('(es)=>es.map(x=>[x.name,x.value,x.disabled]).slice(0,18)'),flush=True)
  assert f.locator('[name=endurance]').input_value()=='12' and f.locator('[name=will]').input_value()=='12'
  f.locator('[name=roll]').fill('10');f.locator('[type=submit]').click()
  st=page.evaluate('window.__healthComa93827()')
  print('TEN_DAY_HEALED',json.dumps(st,ensure_ascii=False,default=str)[:2050],flush=True)
  assert st['minute']==14880 and st['storedMinute']==14880
  assert st['wound']['healed'] or st['wound']['level']==0
  st2=page.evaluate('window.__healthComaReload93827()')
  assert st2['wound']['healed'] or st2['wound']['level']==0
  assert st2['shock']=='NONE' and st2['coma'] is None and st2['extended'] is None
  print('BROWSER_STAGE_PASSED 10-day originally shocked/comatose severe-wound recovery',flush=True)

 except BaseException:
  print('FAILED_BROWSER_COMA',traceback.format_exc(), 'ERRORS',errors,flush=True)
  raise
 finally:browser.close()
