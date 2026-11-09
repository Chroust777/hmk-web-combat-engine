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
 const a={id:'a',kind:'PC',name:'Zraněný 93794',hmk:{folk:'human',isFolk:true,attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,aur:12,cre:12,cml:12,emp:12,elo:12},skills:[{id:'s-shock-93794',name:'Shock',ml:65},{id:'s-survival-93794',name:'Survival',ml:70}],healthState:H.initialCombatState()}};
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
  print('PASS real Chrome original Injury -> UNC CF -> Coma d10 4 -> both scheduled -> persisted',flush=True)
 except BaseException:
  print('FAILED_BROWSER_COMA',traceback.format_exc(), 'ERRORS',errors,flush=True)
  raise
 finally:browser.close()
