from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8')
mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__seedAnimal513=(fatigue=20,shock='NONE')=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const S=require('./src/integration/persistent-combat-state.js');
 const humans=['guide','other'].map(id=>({id,name:id,kind:'PC',hmk:{attributes:{str:12,end:10,agl:12,dex:12,per:12,wil:12,rea:12},combatState:S.initialCombatState()}}));
 const animal={id:'mule-01',name:'Mula Heda',kind:'NPC',hmk:{verifiedMountedBreed:'mule',attributes:{str:20,end:12},combatState:S.initialCombatState()}};
 animal.hmk.combatState.fatigue.weariness=fatigue;
 if(shock!=='NONE'){
   animal.hmk.combatState.shock=shock;
   animal.hmk.combatState.shockOriginRound=1;
   animal.hmk.combatState.shockFollowup={kind:shock,originRound:1,dueRound:shock==='UNC'?121:2,phase:shock==='UNC'?'after-ten-minutes':'end-next-turn',timelineId:null};
 }
 data=clean();data.characters=[...humans,animal];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test513',eventId:'start',gmConfirmed:true,campaignId:'c513',characterIds:['guide','other']});
 data.journal=[];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};render();
};
window.__countAnimalWatches513=()=>data.journal.filter(j=>j.calendarTrekProof).length;
window.__verifyAnimal513=()=>{
 const T=require('./src/integration/hmk-trekking-routine.js');
 T.validateTrekkingJournalEvidence(data);
 const s=JSON.stringify(data);
 data=JSON.parse(s);T.validateTrekkingJournalEvidence(data);
 render();return s;
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1600,'height':1100})
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 def fill():
  form=page.locator('#campaign-trekking-context-form')
  assert form.count()==1,errors
  form.evaluate('el=>el.closest("details").open=true')
  form.locator('[name="area"]').fill('Registered animal status')
  form.locator('[name="season"]').select_option('winter')
  form.locator('[name="conveyance"]').select_option('mount')
  form.locator('[name="diceOrigin"]').select_option('manual')
  form.locator('[name="rolls"]').fill('7,10,10')
  form.locator('[name="droverId"]').select_option('guide')
  form.locator('[name="drovingAnimals"]').fill('mule-01 ; 19 ; guide')
  form.locator('button[type="submit"]').click()
 page.evaluate('window.__seedAnimal513(20)')
 assert 'Mula Heda' in page.locator('#app').inner_text()
 assert 'Fatigue 20' in page.locator('#app').text_content(),page.locator('#app').text_content()[-1800:]
 fill()
 doc=json.loads(page.evaluate('window.__verifyAnimal513()'))
 watches=[j['calendarTrekProof'] for j in doc['journal'] if j.get('calendarTrekProof')]
 assert len(watches)==1,(dialogs,errors)
 h=watches[0]['partyModes']['animals'][0]['health']
 assert h['actorId']=='mule-01' and h['fatigue']==20
 assert watches[0]['partyModes']['wearied'] is True
 assert watches[0]['partyModes']['forcedSlow']==1
 assert watches[0]['modes']['slow']>=1
 assert doc['characters'][2]['hmk']['combatState']['fatigue']['weariness']==20
 assert not errors,errors
 # An incapacitated registered animal is refused without touching stored state.
 page.evaluate("window.__seedAnimal513(20,'STN')")
 fill()
 assert page.evaluate('window.__countAnimalWatches513()')==0,(dialogs,errors)
 assert any('Shock' in d for d in dialogs),(dialogs,errors)
 assert not errors,errors
 print('PASS Chromium v93.513: verified animal ID linked to canonical Combat State, Wearied Slow and saved proof, reload and tamper validator, STN blocks without duplicate journal')
 browser.close()
