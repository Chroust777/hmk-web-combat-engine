"""Real completed Character + Health/Calendar + provenance-aware GM closure in Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__init797=async()=>{
 data=clean();data.characters=[];data.inventory=[];data.journal=[];view='characters';selected=null;
 storageReadOnly=false;combatInitiativeSequence=null;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
 const ready=await generateCharacterFullyAutomatically('random','random',{name:'Full Frost Wound Closure',kind:'PC'});
 if(!ready)throw Error('14-step character creation failed');
 const c=data.characters[0],H=require('./src/integration/persistent-combat-state.js'),C=require('./src/integration/hmk-campaign-calendar.js');
 const s=H.initialCombatState();const id='wound:verified-frost-797';
 s.wounds.push({id,originDomain:'travel-weather',originEventId:'verified-frost-797',location:'ha',side:'left',severity:'G',level:4,
 aspect:'frost',bleeding:false,nextAdvanceRound:null,recordedRound:1,bodyKind:'human',healed:false,shockSL:'CF'});
 s.events.push({id:'verified-frost-797',type:'travel-weather-injury',round:1,details:{woundId:id,domain:'travel-weather',shock:'UNC',location:'ha'}});
 s.events.push({id:'verified-blood-797',type:'blood-loss-advance',round:1,details:{woundId:id,gainedBP:2,totalBP:2}});
 s.lastRound=1;s.shock='UNC';s.shockOriginRound=1;s.shockOriginWoundId=id;
 s.extendedShock={originState:'UNC',hr:4,elapsedHours:0,woundId:id};
 s.coma={active:true,hr:3,elapsedDays:0,nextCourseDays:2,woundId:id};
 s.bloodLoss={bp:2,weaknessFatigue:10,healingNextDay:10};
 H.validateCombatState(s);c.hmk.healthState=s;
 let cal=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'gm-complete-797',eventId:'calendar-797',gmConfirmed:true,characterIds:[c.id]});
 for(const kind of ['wound','blood-loss','extended-shock','coma'])cal=C.anchorCampaignOrigin(cal,{kind,characterId:c.id,
   ...(kind==='wound'?{woundId:id}:{}),elapsedMinutes:0,eventId:'anchor-'+kind+'-797',gmConfirmed:true});
 data.campaignClock=cal;selected=c.id;view='sheet';activeSheetSection='hazards';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
 return {id:c.id,woundId:id,ready:true};
};
window.__state797=()=>{
 const c=data.characters[0],C=require('./src/integration/hmk-campaign-calendar.js');
 const state=persistentStateOf(c),stored=JSON.parse(localStorage.getItem(STORAGE));
 const agenda=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);
 return {wounds:state.wounds,shock:state.shock,extendedShock:state.extendedShock,coma:state.coma,bloodLoss:state.bloodLoss,
  minute:data.campaignClock.minute,calendarKinds:agenda.all.map(x=>x.kind),
  journal:data.journal.filter(j=>j.calendarGMHealthOverride),storedWound:stored.characters[0]?.hmk?.healthState?.wounds?.[0],storedShock:stored.characters[0]?.hmk?.healthState?.shock};
};
window.__reload797=()=>{data=JSON.parse(localStorage.getItem(STORAGE));selected=data.characters[0].id;view='sheet';activeSheetSection='hazards';render();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':960});page.set_default_timeout(15000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message)),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{value:s,configurable:true});Object.defineProperty(window,'sessionStorage',{value:s,configurable:true});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 try:
  print('INIT',page.evaluate('window.__init797()'),flush=True)
  data=page.evaluate('window.__state797()')
  assert {'coma','extended-shock','blood-loss'}.issubset(set(data['calendarKinds'])),data
  form=page.locator('#hmk-gm-health-form');page.locator('[data-gm-wound-editor]').evaluate('(n)=>n.open=true')
  form.locator('[name=action]').select_option('resolve');form.locator('[name=woundId]').select_option(data['wounds'][0]['id'])
  assert form.locator('[name=shockDisposition]').input_value()=='clear'
  assert form.locator('[name=bloodPointsAttributed]').input_value()=='2'
  form.locator('[name=reason]').fill('GM ověřil konec všech následků konkrétní omrzliny.')
  form.locator('[name=gmConfirmed]').check()
  # Need to test missing cause gets red border, focus on the EXACT missing field.
  form.locator('[name=shockDisposition]').select_option('');form.locator('[type=submit]').click()
  invalid=page.evaluate('''()=>({name:document.activeElement?.name,invalid:document.activeElement?.getAttribute('aria-invalid')})''')
  assert invalid=={'name':'shockDisposition','invalid':'true'},invalid
  form.locator('[name=shockDisposition]').select_option('clear');form.locator('[name=bloodPointsAttributed]').fill('')
  form.locator('[type=submit]').click()
  invalid=page.evaluate('''()=>({name:document.activeElement?.name,invalid:document.activeElement?.getAttribute('aria-invalid')})''')
  assert invalid=={'name':'bloodPointsAttributed','invalid':'true'},invalid
  form.locator('[name=bloodPointsAttributed]').fill('2');form.locator('[type=submit]').click()
  state=page.evaluate('window.__state797()')
  print('RESOLVED',{'shock':state['shock'],'coma':state['coma'],'ext':state['extendedShock'],
    'bp':state['bloodLoss'],'kinds':state['calendarKinds'],'minute':state['minute']},flush=True)
  assert state['wounds'][0]['healed'] and state['shock']=='NONE' and state['coma'] is None and state['extendedShock'] is None
  assert state['bloodLoss']['bp']==0 and state['bloodLoss']['weaknessFatigue']==0
  assert not {'coma','extended-shock','blood-loss'}.intersection(state['calendarKinds'])
  assert state['minute']==480 and state['storedShock']=='NONE' and state['storedWound']['healed']
  receipt=state['journal'][-1]['calendarGMHealthOverride']['globalConsequences']
  assert receipt['shockDisposition']=='clear' and receipt['bloodPointsAttributed']==2
  page.evaluate('window.__reload797()');reload=page.evaluate('window.__state797()')
  assert reload['shock']=='NONE' and reload['bloodLoss']['bp']==0 and reload['wounds'][0]['healed']
  assert not errors,errors
  print('PASS 93.797 Chromium: completed character, exact red fields/focus, wound origin, cancel Shock/Coma/Extended/BP and future calendar, persistence, audit, clock unchanged',flush=True)
 finally:
  browser.close()
