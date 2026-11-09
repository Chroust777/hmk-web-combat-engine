from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(); prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__audit93793Setup=()=>{
 const H=require('./src/integration/persistent-combat-state.js'),C=require('./src/integration/hmk-campaign-calendar.js');
 const a={id:'pc-dice',kind:'PC',name:'Pokusná postava',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,aur:12,cre:12,cml:12,emp:12,elo:12},skills:[{id:'ss1',name:'Survival',ml:60},{id:'ss2',name:'Jumping',ml:60},{id:'ss3',name:'Climbing',ml:60}],healthState:H.initialCombatState()}};
 data=clean();data.characters=[a];data.inventory=[];data.journal=[];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'dice93793',eventId:'clock93793',gmConfirmed:true,characterIds:[a.id]});selected=a.id;
 const src={id:'src-accident-93793',calendarCampaignId:'dice93793',skillTestProof:{type:'critical-followup',skill:'Survival',activity:'trek-survival-hazard',originId:'previous-trek-source',actorId:a.id,result:{level:'CF'}}};
 const fall={id:'src-fall-93793',calendarCampaignId:'dice93793',skillTestProof:{type:'critical-followup',skill:'Climbing',activity:'climb-difficult',actorId:a.id,result:{level:'F'}}};
 data.journal=[src,fall];const wrap=document.createElement('div');wrap.id='audit-dice-wrap';wrap.innerHTML=hskSkillPhysicalImpactForm(src)+hskClimbingFallForm(fall);document.getElementById('app').append(wrap);enhanceHMKDiceFields();
 return {forms:wrap.querySelectorAll('form').length,health:persistentStateOf(a).wounds.length};
};
window.__audit93793AddCompatible=()=>{
 const G=require('./src/integration/hmk-gm-health-override.js');const loc=require('./src/integration/hmk-mounted-fall-injury-join.js').humanLocation(1,6);
 const a=character('pc-dice'),out=G.prepareGMHealthOverride({state:persistentStateOf(a),action:'add',eventId:'gm-wound93793',reason:'GM reálné původní zranění pro test slučování',gmConfirmed:true,location:loc.location,side:loc.side,level:1,aspect:'blunt'});
 synchronizeCombatInjuries(a,out.state);return {loc,wounds:persistentStateOf(a).wounds.map(w=>[w.id,w.location,w.side,w.aspect])};
};
window.__audit93793Counts=()=>({wounds:persistentStateOf(character('pc-dice')).wounds.length,journal:data.journal.length,minute:data.campaignClock.minute});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(10000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{value:x,configurable:true});Object.defineProperty(window,'sessionStorage',{value:x,configurable:true})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 try:
  print('SETUP',page.evaluate('window.__audit93793Setup()'),flush=True)
  a=page.locator('form[data-skill-physical-impact]');shock=a.locator('[name=shockD100]');compound=a.locator('[name=compoundD10]');assert shock.is_disabled() and compound.is_disabled()
  a.locator('[name=hazardD10]').fill('5');a.locator('[name=targetId]').select_option('pc-dice');a.locator('[name=agilityD100]').fill('99')
  assert a.locator('[name=shockD100] + [data-hmk-general-auto-die]').count()==1
  assert a.locator('[name=compoundD10] + [data-hmk-general-auto-die]').count()==1
  assert a.locator('[name=shockD100] + [data-hmk-general-auto-die]').is_disabled()
  a.locator('[name=impactDie]').fill('1');a.locator('[name=zoneD10]').fill('1');a.locator('[name=locationD10]').fill('6')
  print('ACCIDENT',shock.is_disabled(),compound.is_disabled(),a.locator('[data-hsk-physical-dice-status]').inner_text(),flush=True)
  assert shock.is_enabled() and compound.is_disabled(),'Accident first wound must have Shock and NO Compound'
  assert a.locator('[name=shockD100] + [data-hmk-general-auto-die]').is_enabled()
  assert a.locator('[name=compoundD10] + [data-hmk-general-auto-die]').is_disabled()
  a.locator('[name=shockD100] + [data-hmk-general-auto-die]').click()
  assert shock.input_value().isdigit() and 1<=int(shock.input_value())<=100
  assert page.evaluate('window.__audit93793Counts()')['journal']==2
  shock.fill('61');assert page.evaluate('window.__audit93793Counts()')['journal']==2,'Unconfirmed impact mutated journal'
  print('OLD WOUND',page.evaluate('window.__audit93793AddCompatible()'),flush=True)
  a.locator('[name=locationD10]').fill('7');a.locator('[name=locationD10]').fill('6')
  print('ACCIDENT REPEAT',shock.is_disabled(),compound.is_disabled(),a.locator('[data-hsk-physical-dice-status]').inner_text(),flush=True)
  assert shock.is_enabled() and compound.is_enabled(),'Same location compatible wound must activate Compound'
  assert a.locator('[name=compoundD10] + [data-hmk-general-auto-die]').is_enabled()
  a.locator('[name=compoundD10] + [data-hmk-general-auto-die]').click()
  assert 1<=int(compound.input_value())<=10
  compound.fill('4');a.locator('[name=hazardD10]').fill('7')
  assert shock.is_disabled() and compound.is_disabled() and shock.input_value()=='' and compound.input_value()=='','Switching hazard kept forbidden dice'
  f=page.locator('form[data-climbing-fall-form]');fs=f.locator('[name=shockD100]');fc=f.locator('[name=compoundD10]')
  assert fs.is_disabled() and fc.is_disabled(),'Falling stage prematurely unlocked conditional dice'
  f.locator('[name=heightFt]').fill('6');f.locator('[name=surface]').select_option('water')
  for name,value in [('impactD10','1'),('zoneD10','1'),('locationD10','6'),('fallingD100','1')]:f.locator('[name='+name+']').fill(value)
  print('FALL WATER',fs.is_disabled(),fc.is_disabled(),f.locator('[data-climb-fall-guide]').inner_text()[:350],flush=True)
  assert fs.is_disabled() and fc.is_disabled(),'Fully absorbed fall must not require Shock or Compound'
  f.locator('[name=surface]').select_option('rock');f.locator('[name=heightFt]').fill('30')
  print('FALL ROCK',fs.is_disabled(),fc.is_disabled(),f.locator('[data-climb-fall-guide]').inner_text()[:350],flush=True)
  assert fs.is_enabled(),'Unarmoured hard 30ft fall must unlock Shock'
  assert f.locator('[name=shockD100] + [data-hmk-general-auto-die]').is_enabled()
  assert f.locator('[name=compoundD10] + [data-hmk-general-auto-die]').is_enabled()
  assert not errors,errors
  print('PASS Chromium conditional Accident + Falling dice, non-commit, impact/location changes',flush=True)
 except BaseException:
  print('ERRORS',errors,'BODY',page.locator('body').inner_text()[-1200:]);traceback.print_exc();raise
 finally:browser.close()
