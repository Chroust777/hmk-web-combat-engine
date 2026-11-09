"""Isolated UI regression of Journal Edit entry, wound-ID-specific timed-treatment cancellation and persistence."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]; raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedGM796=()=>{
 const H=require('./src/integration/persistent-combat-state.js'),C=require('./src/integration/hmk-campaign-calendar.js');
 data=clean();data.characters=[{id:'a',kind:'PC',name:'GM test 796',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[],healthState:H.initialCombatState()}}];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-gm-796',eventId:'start-gm-796',gmConfirmed:true,characterIds:['a']});
 view='sheet';selected='a';activeSheetSection='hazards';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__state796=()=>({wounds:structuredClone(data.characters[0].hmk.healthState.wounds),clock:structuredClone(data.campaignClock),
 agenda:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory),
 history:structuredClone(data.journal.filter(j=>j.calendarGMHealthOverride)),stored:JSON.parse(localStorage.getItem(STORAGE))});
window.__createTimed796=(id)=>{
 const P=require('./src/integration/hmk-concurrent-procedures.js');
 return mutate(()=>{data.campaignClock=P.startConcurrentProcedure(data.campaignClock,{id:'test-start-796',procedure:{
  formId:'hmk-treatment-form',characterId:'a',woundId:id,healerId:'a',startMinute:480,endMinute:540,eventId:'test-treatment-done-796',confirmed:true,args:{physicianRoll:45,daySinceInjury:0,physicianML:50,physicianIndex:3,dexSecondaryModifier:0,procedureTime:{startMinute:480,endMinute:540,gmConfirmed:true},available:[]}}});});
};
window.__overview796=()=>{view='sheet';activeSheetSection='overview';sheetEditingId='a';render();};
window.__reload796=()=>{data=JSON.parse(localStorage.getItem(STORAGE));selected='a';view='sheet';activeSheetSection='hazards';render();};
'''
cr=mods['src/integration/hmk-character-creation.js']
for orig,add in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert orig in cr,orig
 cr=cr.replace(orig,add)
mods['src/integration/hmk-character-creation.js']=cr
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1500,'height':900});page.set_default_timeout(12000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedGM796()')
 def create(loc,level,kind='pending'):
  form=page.locator('#hmk-gm-health-form');page.locator('[data-gm-wound-editor]').evaluate('(e)=>e.open=true')
  form.locator('[name=action]').select_option('add')
  form.locator('[name=location]').select_option(loc)
  form.locator('[name=side]').select_option('left')
  form.locator('[name=level]').select_option(str(level))
  form.locator('[name=aspect]').select_option('blunt')
  form.locator('[name=initialCare]').select_option(kind)
  form.locator('[name=reason]').fill('Doloženo rozhodnutím GM během herní události.')
  form.locator('[name=gmConfirmed]').check()
  form.locator('[type=submit]').click()
  return page.evaluate('window.__state796()')
 x=create('ha',4,'pending');first=x['wounds'][0]['id'];assert any(z['kind']=='treatment' and z.get('woundId')==first for z in x['agenda']['all']),x['agenda']
 x=create('ft',1,'untreated');second=x['wounds'][1]['id'];assert len(x['wounds'])==2
 assert any(z['kind']=='healing' and z.get('woundId')==second for z in x['agenda']['all']),x['agenda']
 assert page.evaluate('(id)=>window.__createTimed796(id)',first)==True
 x=page.evaluate('window.__state796()');assert x['clock']['concurrentProcedures'][-1]['type']=='start'
 # 93.798: direct Remove triggers exactly one native confirmation; no
 # mandatory Shock/BP/reason fields and no intermediary editor submission.
 page.locator('button[data-gm-select-wound]').first.click()
 assert dialogs and 'Odstranit ránu' in dialogs[-1]
 x=page.evaluate('window.__state796()');assert x['wounds'][0]['healed'] and not x['wounds'][1]['healed'],x['wounds']
 assert [r['type'] for r in x['clock']['concurrentProcedures']]==['start','cancel'],x['clock']['concurrentProcedures']
 assert x['clock']['concurrentProcedures'][1]['startId']=='test-start-796'
 assert any(z['kind']=='healing' and z.get('woundId')==second for z in x['agenda']['all']),x['agenda']
 assert all(z.get('woundId')!=first for z in x['agenda']['all']),x['agenda']
 assert x['history'][-1]['calendarGMHealthOverride']['cancelledProcedureStartIds']==['test-start-796']
 assert x['clock']['minute']==480
 # The same wound manager opens directly from the normal Journal Edit action.
 page.evaluate('window.__overview796()')
 assert page.locator('button[data-open-gm-wounds]').count()==1
 page.locator('button[data-open-gm-wounds]').click();assert page.locator('.editor-backdrop #hmk-gm-health-form').count()==1
 page.locator('.editor-backdrop [data-action=cancel-editor]').click()
 assert page.locator('.editor-backdrop').count()==0
 page.evaluate('window.__reload796()');reloaded=page.evaluate('window.__state796()')
 assert reloaded['wounds'][0]['healed'] and not reloaded['wounds'][1]['healed']
 assert [r['type'] for r in reloaded['clock']['concurrentProcedures']]==['start','cancel']
 assert not errors,errors
 print('PASS 93.798: create pending Treatment + independent untreated M1 + cancel matching in-flight timed Treatment + preserve other wound + journal Edit navigation + reload',flush=True)
 b.close()
