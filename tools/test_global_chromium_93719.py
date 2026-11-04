from playwright.sync_api import sync_playwright
from pathlib import Path
import json,traceback,sys
root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data/hmk_dev_93718')
raw=(root/'hmk-app.bundle.js').read_text()
prefix='(()=>{const MOD='
assert raw.startswith(prefix)
modules,pos=json.JSONDecoder().raw_decode(raw[len(prefix):])
helper=r'''
const initialCombatState=persistent_combat_state_js_1.initialCombatState;
const createCampaignCalendar=hmk_campaign_calendar_js_1.createCampaignCalendar;
const anchorCampaignOrigin=hmk_campaign_calendar_js_1.anchorCampaignOrigin;
const campaignCalendarAgenda=hmk_campaign_calendar_js_1.campaignCalendarAgenda;
const advanceCampaignCalendar=hmk_campaign_calendar_js_1.advanceCampaignCalendar;
const openConcurrentProcedures=hmk_concurrent_procedures_js_1.openConcurrentProcedures;
window.__receiptSummary=()=>({length:(data.globalActionLedger||[]).length,rows:(data.globalActionLedger||[]).map(r=>({id:r.id,seq:r.seq,minute:r.minute,actors:r.actorIds,health:r.healthEventIds,proofs:r.journalEventIds}))});
window.__installConcurrent=()=>{
 data=clean();storageBaseline=null;storageReadOnly=false;
 for(const [id,name] of [['p','Pepa'],['m','Michal'],['h','Healer']]){
  const s=initialCombatState();
  if(id!=='h'){
   s.wounds.push({id:'w-'+id,location:'fo',severity:'M',level:1,aspect:'frost',bleeding:false,nextAdvanceRound:null,healed:false,originEventId:'origin-'+id,originDomain:'travel-weather',recordedRound:1});
   s.events.push({id:'origin-'+id,type:'travel-weather-injury',round:1,details:{domain:'travel-weather',woundId:'w-'+id}});
  }
  data.characters.push({id,name,kind:'PC',hmk:{folk:'Human',attributes:{str:12,end:12,dex:14,rea:14,per:14,wil:12},skills:[{id:'phys-'+id,name:'Physician',ml:80}],injuries:s.wounds.map(w=>({id:w.id,location:w.location,severity:w.severity,injuryLevel:w.level,bleeding:w.bleeding,combatRecord:true})),healthState:s}});
 }
 data.campaignClock=createCampaignCalendar({day:1,hour:9,minute:20,eventId:'init',campaignId:'conv-test',characterIds:['p','m','h'],gmConfirmed:true});
 for(const id of ['p','m']) data.campaignClock=anchorCampaignOrigin(data.campaignClock,{kind:'wound',characterId:id,woundId:'w-'+id,eventId:'anchor-'+id,source:'confirmed-health',combatEventId:'origin-'+id});
 selected='p';view='sheet';activeSheetSection='hazards';weatherCareActiveSection='treatment';
 render=()=>{document.querySelector('#app').innerHTML=hskEnvironmentalWoundCarePanel(character(selected));refreshAllCalendarHealingFields();syncWeatherCarePanel()};
 render();return {minute:data.campaignClock.minute,form:!!document.querySelector('#hmk-treatment-form'),html:document.querySelector('#app').innerText.slice(0,800)};
};
window.__convShow=(id)=>{selected=id;weatherCareActiveSection='treatment';render();return {form:!!document.querySelector('#hmk-treatment-form'),html:document.querySelector('#app').innerText.slice(0,1000)}};
window.__convForm=()=>{const f=document.querySelector('#hmk-treatment-form');return !f?null:{html:f.outerHTML.slice(0,3000),vals:[...f.elements].filter(x=>x.name).map(x=>({name:x.name,value:x.value,disabled:x.disabled,required:x.required}))}};
window.__convState=()=>({minute:data.campaignClock.minute,queued:openConcurrentProcedures(data.campaignClock).map(p=>({id:p.startId,char:p.characterId,due:p.endMinute,physicianRoll:p.args.physicianRoll})),dataSaved:!!localStorage.getItem(STORAGE),health:data.characters.map(c=>({id:c.id,healing:c.hmk.healthState.wounds.map(w=>w.healing||null)})),agenda:campaignCalendarAgenda(data.campaignClock,data.characters,data.journal).all.filter(x=>['treatment','concurrent-treatment'].includes(x.kind)).map(x=>({kind:x.kind,id:x.characterId,minute:x.minute})),unk:campaignCalendarAgenda(data.campaignClock,data.characters,data.journal).unknown});
window.__convAdvance=()=>mutate(()=>{data.campaignClock=advanceCampaignCalendar(data.campaignClock,{deltaMinutes:120,eventId:uuid(),reason:'GM 5 min ošetření',gmConfirmed:true,characters:data.characters,journal:data.journal})},{gmClockAdvance:true});
window.__convCold=()=>mutate(()=>{
 const ch=character('m');const wx=hmk_weather_hazard_aftermath_js_1.prepareTrekkingWeatherTest;
 for(const [sourceId,round] of [['cold-existing',2],['cold-again',3]]){
  ch.hmk.healthState=wx({state:ch.hmk.healthState,sourceId,round,kind:'cold',originalSL:'F',coldCondition:'damp',weatherHazardConfirmed:true,gmConfirmed:true}).state;
  data.campaignClock=anchorCampaignOrigin(data.campaignClock,{kind:'weather',characterId:'m',episodeId:'skill-weather:'+sourceId+':cold',eventId:'anchor-'+sourceId,gmConfirmed:true});
 }
});
window.__convReload=()=>{const raw=localStorage.getItem(STORAGE);data=validate(JSON.parse(raw));render();return __convState()};
window.__convSubmit=(id)=>{selected=id;weatherCareActiveSection='treatment';render();const f=document.querySelector('#hmk-treatment-form');if(!f)throw Error('missing form');f.elements.namedItem('wound').value=id+'::w-'+id;
 const h=f.elements.namedItem('healerId');h.value=id==='p'?'h':'m';h.dispatchEvent(new Event('change',{bubbles:true}));
 f.elements.namedItem('physicianRoll').value='11';
 for(const x of f.querySelectorAll('[name="available"] option'))x.selected=['water','bandages'].includes(x.value);
 f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return __convState();};
'''
modules['app.js']+='\n'+helper
repacked=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+pos:]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page()
 page_errors=[];dialogs=[]
 page.on('pageerror',lambda e:page_errors.append(str(e)))
 def dialog(d):dialogs.append(d.message);d.accept()
 page.on('dialog',dialog)
 page.goto('about:blank')
 page.set_content('<div id="app"></div>')
 page.evaluate("""()=>{function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}};}Object.defineProperty(window,'localStorage',{configurable:true,value:memoryStorage()});Object.defineProperty(window,'sessionStorage',{configurable:true,value:memoryStorage()});}""")
 page.add_script_tag(content=repacked)
 try:
  result=page.evaluate('window.__installConcurrent()')
  print('INSTALL',json.dumps(result,ensure_ascii=False)[:650])
  assert result['form'],'Treatment not displayed'
  print('FORM',json.dumps(page.evaluate('window.__convForm()'),ensure_ascii=False)[:800])
  for ch in ['p','m']:
   result=page.evaluate('(id)=>window.__convSubmit(id)',ch)
   print('AFTER START',ch,json.dumps(result,ensure_ascii=False)[:1000])
   assert len(result['queued'])==(1 if ch=='p' else 2), 'Not staged'
  assert not page_errors,page_errors
  assert not dialogs,dialogs
  assert page.evaluate('window.__convCold()'), 'Concurrent Cold denied';print('COLD',json.dumps(page.evaluate('window.__convState()'),ensure_ascii=False)[:550])
  result=page.evaluate('window.__convReload()');print('RELOAD',json.dumps(result,ensure_ascii=False)[:650]);assert len(result['queued'])==2
  result=page.evaluate('window.__convAdvance()');print('ADV',result,'dialogs',dialogs);assert result,'Advance failed: '+str(dialogs)
  result=page.evaluate('window.__convState()');print('AT DUE',json.dumps(result,ensure_ascii=False)[:700]);assert result['minute']==680
  page.evaluate('window.__convShow("p")')
  assert page.locator('[data-concurrent-medical-finish]').count()==1
  page.locator('[data-concurrent-medical-finish]').click()
  result=page.evaluate('window.__convState()');print('FINISH p',json.dumps(result,ensure_ascii=False)[:750]);assert len(result['queued'])==1
  page.evaluate('window.__convShow("m")')
  page.locator('[data-concurrent-medical-finish]').click()
  result=page.evaluate('window.__convState()');print('FINISH m',json.dumps(result,ensure_ascii=False)[:750]);assert not result['queued']
  result=page.evaluate('window.__convReload()');assert not result['queued']
  receipts=page.evaluate('window.__receiptSummary()');assert receipts['length']==6,receipts
  assert len(set(x['id'] for x in receipts['rows']))==receipts['length'],receipts
  assert [x['seq'] for x in receipts['rows']]==list(range(1,receipts['length']+1)),receipts
  assert sum(len(x['health']) for x in receipts['rows'])>=4,receipts
  print('GLOBAL RECEIPTS',receipts['length'],'last minute',receipts['rows'][-1]['minute'])
  print('PASS Chromium: parallel Treatment/Cold, global receipt IDs and immutable sequence, reload, completion')
 except Exception as e:
  print('ERROR',str(e));traceback.print_exc()
  print('PAGE ERRORS',page_errors[-6:]);print('DIALOGS',dialogs[-6:]);
  raise
 finally:browser.close()
