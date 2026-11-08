"""Actual Character/Status GM authoritative wound editor browser & persistence."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedWoundGM782=()=>{
 const H=require('./src/integration/persistent-combat-state.js'),C=require('./src/integration/hmk-campaign-calendar.js');
 data=clean();data.characters=[{id:'a',kind:'PC',name:'GM pacient',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[],healthState:H.initialCombatState()}}];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-gm-wound-782',eventId:'start-gm-wound-782',gmConfirmed:true,characterIds:['a']});
 view='sheet';selected='a';activeSheetSection='status';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__woundStateGM782=()=>({clock:data.campaignClock.minute,wounds:data.characters[0].hmk.healthState.wounds,events:data.characters[0].hmk.healthState.events,
 journal:data.journal.filter(j=>j.calendarGMHealthOverride).map(j=>j.calendarGMHealthOverride),
 agenda:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory),
 inCombat:!!combatInitiativeSequence,stored:JSON.parse(localStorage.getItem(STORAGE))?.characters?.[0]?.hmk?.healthState?.wounds??[]});
window.__reloadWoundGM782=()=>{data=JSON.parse(localStorage.getItem(STORAGE));view='sheet';selected='a';activeSheetSection='status';render()};
'''
cr=mods['src/integration/hmk-character-creation.js']
for orig,add in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert orig in cr,orig
 cr=cr.replace(orig,add)
mods['src/integration/hmk-character-creation.js']=cr
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':960});page.set_default_timeout(10000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message)),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=bundle);page.evaluate('window.__seedWoundGM782()')
 form=page.locator('#hmk-gm-health-form');print('FORM',form.count(),page.locator('body').inner_text()[-420:],flush=True)
 assert form.count()==1
 page.locator('details').filter(has=form).evaluate('(n)=>n.open=true')
 form.locator('[name=action]').select_option('add');form.locator('[name=location]').select_option('ua');form.locator('[name=side]').select_option('left');form.locator('[name=level]').select_option('2');form.locator('[name=aspect]').select_option('blunt')
 form.locator('[name=reason]').fill('Při cestě se zranil podle rozhodnutí GM bez házení.');form.locator('[name=gmConfirmed]').check();form.locator('[type=submit]').click()
 result=page.evaluate('window.__woundStateGM782()');print('ADD',{'wounds':result['wounds'],'journals':result['journal'],'clock':result['clock'],'errors':errors,'dialogs':dialogs[-3:]},flush=True)
 assert len(result['wounds'])==1 and len(result['journal'])==1,result
 assert result['wounds'][0]['severity']=='S' and result['wounds'][0]['location']=='ua' and result['wounds'][0]['healing']['untreated']==True
 assert result['clock']==480 and not result['inCombat'] and len(result['stored'])==1
 assert not errors,errors
 # same page after render, mark resolved: preserve event history and health state.
 form=page.locator('#hmk-gm-health-form');page.locator('details').filter(has=form).evaluate('(n)=>n.open=true')
 form.locator('[name=action]').select_option('resolve');form.locator('[name=woundId]').select_option(result['wounds'][0]['id']);form.locator('[name=reason]').fill('GM ručně uznal kompletní zhojení po příběhovém zásahu.');form.locator('[name=gmConfirmed]').check();form.locator('[type=submit]').click()
 done=page.evaluate('window.__woundStateGM782()');print('RESOLVE',{'wounds':done['wounds'],'journals':len(done['journal']),'events':len(done['events']),'clock':done['clock'],'errors':errors,'dialogs':dialogs[-3:]},flush=True)
 assert done['wounds'][0]['healed'] is True and len(done['journal'])==2 and len(done['events'])>=3,done
 assert done['clock']==480 and not done['inCombat']
 page.evaluate('window.__reloadWoundGM782()');reload=page.evaluate('window.__woundStateGM782()');assert reload['wounds'][0]['healed'] and len(reload['journal'])==2 and reload['clock']==480
 assert not errors,errors
 print('PASS browser v93.782 GM anatomical injury create untreated + resolve + audit + reload; no auto Combat / no clock shift',flush=True)
 b.close()
