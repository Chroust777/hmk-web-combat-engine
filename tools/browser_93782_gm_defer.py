from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedGM782=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js'),P=require('./src/integration/hmk-poison-course.js');
 data=clean();const a={id:'a',kind:'PC',name:'Testovací pacient',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'s1',name:'Survival',ml:60}],healthState:H.initialCombatState()}};
 a.hmk.healthState=P.preparePoisonStart({actor:a,state:a.hmk.healthState,round:1,sourceId:'viper-test-782',transmission:'contact',onsetMinutes:60,periodMinutes:60,initialHR:5,symptomD10s:[1,2,3,4],actualExposureConfirmed:true,gmConfirmed:true}).state;
 a.hmk.healthState=P.preparePoisonOnset({actor:a,state:a.hmk.healthState,round:1,sourceId:'viper-test-782',elapsedMinutes:60,gmConfirmed:true}).state;
 data.characters=[a];data.campaignClock=C.createCampaignCalendar({day:1,hour:2,minute:0,eventId:'init-gm782',campaignId:'audit782',gmConfirmed:true,characterIds:['a']});
 data.campaignClock=C.anchorCampaignOrigin(data.campaignClock,{kind:'poison',characterId:'a',episodeId:'poison:viper-test-782',elapsedMinutes:120,gmConfirmed:true,eventId:'anchor-gm782'});
 view='calendar';calendarLanding=false;activeCalendarSection='overview';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__reloadGM782=()=>{data=JSON.parse(localStorage.getItem(STORAGE));render();};
window.__gm782=()=>({clock:data.campaignClock.minute,events:data.campaignClock.events.filter(e=>e.type==='gm-defer'),
 due:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).due,
 deferred:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).deferred,
 health:JSON.stringify(data.characters[0].hmk.healthState),inCombat:!!combatInitiativeSequence,
 stored:JSON.parse(localStorage.getItem(STORAGE))?.campaignClock?.events?.filter(e=>e.type==='gm-defer').length||0,
 buttons:document.querySelectorAll('[data-cal-emergency-defer]').length});
'''
for name in ['src/integration/hmk-character-creation.js']:
 st=mods[name]
 for orig,inject in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
  assert orig in st,orig
  st=st.replace(orig,inject)
 mods[name]=st
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1380,'height':900});page.set_default_timeout(20000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message)),d.accept('Formulář zdravotního hodu momentálně není dostupný') if d.type=='prompt' else d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedGM782()')
 init=page.evaluate('window.__gm782()')
 print('INITIAL',{'due':[(i['kind'],i['id']) for i in init['due']],'buttons':init['buttons']},flush=True)
 assert init['clock']==120 and len(init['due'])==1 and init['buttons']==1,init
 before=init['health']
 page.locator('[data-cal-emergency-defer]').click()
 after=page.evaluate('window.__gm782()')
 print('AFTER',{'due':len(after['due']),'deferred':len(after['deferred']),'receipt':len(after['events']),'stored':after['stored'],'buttons':after['buttons'],'error':errors,'dialogs':dialogs},flush=True)
 assert len(after['due'])==0 and len(after['deferred'])==1 and after['stored']==1,after
 assert after['clock']==120 and after['health']==before and after['inCombat']==False
 assert page.locator('.hc-calendar-gm-deferred').count()>0
 # Rehydrate application data from its actual persistent saved storage, then render.
 page.evaluate('window.__reloadGM782()')
 reload=page.evaluate('window.__gm782()')
 assert reload['stored']==1 and len(reload['deferred'])==1 and reload['health']==before,reload
 assert not errors,errors
 print('PASS browser v93.782: real calendar due -> audited GM defer -> persisted reload; no Health/Combat/clock mutation',flush=True)
 browser.close()
