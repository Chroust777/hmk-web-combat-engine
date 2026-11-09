"""Independent audit: actual 14-step automatic character -> frost IL8 in rendered Health UI -> persist/reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback,time
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__frostE2eStart=async()=>{
 data=clean();data.characters=[];data.inventory=[];data.journal=[];view='characters';selected=null;storageReadOnly=false;combatInitiativeSequence=null;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
 const ok=await generateCharacterFullyAutomatically('random','random',{name:'Test Frostbite IL8',kind:'PC'});
 if(!ok)return {error:'generator failed',names:data.characters.map(c=>c.name),body:document.body.textContent.slice(-700)};
 const a=data.characters[0]; const readiness=require('./src/integration/hmk-character-creation.js').characterJournalReadiness(a);
 const H=require('./src/integration/persistent-combat-state.js'),C=require('./src/integration/hmk-campaign-calendar.js');
 const s=a.hmk.healthState??H.initialCombatState();
 s.environmentalHazards=[{id:'haz-test-e2e',sourceId:'frost-e2e',kind:'cold',hr:5,initialHR:5,periodMinutes:60,active:true,lastElapsedMinutes:0,sequence:0,weaknessApplied:0,shockApplied:'NONE',skinPending:'frostbite',treatmentStarted:false}];
 s.events.push({id:'haz-test-e2e',type:'skill-trekking-weather-hazard',round:1,details:{}});a.hmk.healthState=s;
 data.inventory=[]; // naked test subject, AV=0; not modifying real campaign
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'frost-e2e-audit',eventId:'frost-audit-start',gmConfirmed:true,characterIds:[a.id]});
 selected=a.id;view='sheet';activeSheetSection='hazards';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
 return {ok:true,readiness,id:a.id,inventory:data.inventory.length,forms:document.querySelectorAll('form[data-skill-weather-skin]').length,clock:data.campaignClock.minute};
};
window.__frostE2eState=()=>{const a=data.characters[0];const s=persistentStateOf(a);const z=JSON.parse(localStorage.getItem(STORAGE));return {wounds:s.wounds.map(w=>({id:w.id,level:w.level,severity:w.severity,il:w.il,rawIL:w.rawIL,gmFrostRuling:w.gmFrostRuling,location:w.location})),shock:s.shock,events:s.events.filter(x=>x.type==='skill-weather-skin-complete'||x.details?.weatherTrauma),journal:data.journal.filter(j=>j.skillTestProof?.type==='skill-weather-skin').map(j=>({type:j.skillTestProof.type,report:j.skillTestProof.report,proof:j.skillTestProof.diceEvidence})),clock:data.campaignClock?.minute,storedWounds:z.characters[0].hmk.healthState.wounds.map(w=>({id:w.id,rawIL:w.rawIL,gmFrostRuling:w.gmFrostRuling})),storedJournal:z.journal.filter(j=>j.skillTestProof?.type==='skill-weather-skin').length,active:a.hmk.healthState.environmentalHazards.map(h=>({skinPending:h.skinPending,id:h.id}))}};
window.__frostE2eReload=()=>{data=JSON.parse(localStorage.getItem(STORAGE));selected=data.characters[0].id;view='sheet';activeSheetSection='hazards';render();}
window.__frostE2eOpenCalendar=()=>{view='calendar';activeCalendarSection='overview';calendarLanding=false;render();const links=[...document.querySelectorAll('[data-cal-kind=\"weather-skin\"]')];return {count:links.length,kinds:[...new Set([...document.querySelectorAll('[data-cal-kind]')].map(x=>x.dataset.calKind))]}}
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':980});page.set_default_timeout(15000)
 errs=[];dialogs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const map=new Map(),s={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 try:
  start=time.monotonic();r=page.evaluate('window.__frostE2eStart()');print('GENERATED',r,'duration',round(time.monotonic()-start,2),flush=True)
  assert r.get('ok') and r['readiness']['ready'] and r['forms']>=1,r
  route=page.evaluate('window.__frostE2eOpenCalendar()');print('CALENDAR_ROUTE',route,flush=True)
  if route['count']:
   page.locator('[data-cal-kind=weather-skin]').first.click()
   assert page.evaluate('document.activeElement?.name')=='windD20', 'Calendar did not focus missing wind D20'
   assert page.evaluate('document.activeElement?.closest("label")?.classList.contains("hmk-medical-required-target")')==True, 'Calendar did not mark exact target'
  else:
   # The fixture creates a medical pending hazard directly, without a full real travel episode.
   # Thus no claim is made about a calendar event that this fixture did not create.
   page.evaluate('''()=>{view='sheet';selected=data.characters[0].id;activeSheetSection='hazards';render()}''')
  f=page.locator('form[data-skill-weather-skin][data-weather-skin-kind=frostbite]');assert f.count()==1
  f.locator('xpath=ancestor::details[1]').evaluate('(e)=>e.open=true')
  print('INIT',{'rows':f.locator('[data-weather-skin-row]').count(),'none':f.locator('[name=noneExposed]').is_checked()},flush=True)
  f.locator('[name=noneExposed]').check(force=True)
  f.locator('details.hc-weather-skin-exceptions').evaluate('(e)=>e.open=true')
  pick=f.locator('[data-weather-skin-select][data-skin-location=ha][data-skin-side=left]')
  pick.check(force=True)
  rows=f.locator('[data-weather-skin-row]');assert rows.count()==1,rows.count()
  row=rows.first;print('PRE',{'av':row.get_attribute('data-skin-av'), 'level':row.get_attribute('data-skin-level'),'state':page.evaluate('window.__frostE2eState()')['wounds']},flush=True)
  assert row.get_attribute('data-skin-av')=='0',row.get_attribute('data-skin-av')
  f.locator('[data-weather-skin-evaluate]').click()
  assert f.locator('[name=windD20]').get_attribute('aria-invalid')=='true' and page.evaluate('document.activeElement?.name')=='windD20'
  assert page.evaluate('window.__frostE2eState()')['wounds']==[]
  f.locator('[name=windD20]').fill('20');f.locator('[name=durationD20]').fill('20')
  f.locator('[data-weather-skin-evaluate]').click()
  print('IL8_PENDING',{'msg':row.locator('[data-weather-skin-preview]').inner_text(),'redpanel':row.locator('[data-weather-skin-gm-wrap]').is_visible(),'choiceEnabled':row.locator('[name=gmFrostChoice]').is_enabled(),'shockEnabled':row.locator('[name=shockD100]').is_enabled(),'state':page.evaluate('window.__frostE2eState()')['wounds']},flush=True)
  assert row.locator('[data-weather-skin-gm-wrap]').is_visible() and not row.locator('[name=shockD100]').is_enabled()
  f.locator('[type=submit]').click(force=True)
  print('MISSING_CHOICE',{'focus':page.evaluate('document.activeElement?.name'), 'choiceRed':row.locator('[name=gmFrostChoice]').get_attribute('aria-invalid'),'reasonRed':row.locator('[name=gmFrostReason]').get_attribute('aria-invalid'),'status':f.locator('output').all_inner_texts()},flush=True)
  assert row.locator('[name=gmFrostChoice]').get_attribute('aria-invalid')=='true' and page.evaluate('document.activeElement?.name')=='gmFrostChoice'
  assert len(page.evaluate('window.__frostE2eState()')['wounds'])==0
  row.locator('[name=gmFrostChoice]').select_option('G5')
  f.locator('[type=submit]').click(force=True)
  print('MISSING_REASON',{'focus':page.evaluate('document.activeElement?.name'), 'choiceRed':row.locator('[name=gmFrostChoice]').get_attribute('aria-invalid'),'reasonRed':row.locator('[name=gmFrostReason]').get_attribute('aria-invalid'),'status':f.locator('output').all_inner_texts()},flush=True)
  assert row.locator('[name=gmFrostReason]').get_attribute('aria-invalid')=='true' and page.evaluate('document.activeElement?.name')=='gmFrostReason'
  assert len(page.evaluate('window.__frostE2eState()')['wounds'])==0
  row.locator('[name=gmFrostReason]').fill('GM potvrzuje podle vzácných okolností zastropování na G5.')
  assert row.locator('[name=shockD100]').is_enabled(),'Shock still locked after decision'
  row.locator('[name=shockD100]').fill('10')
  f.locator('[type=submit]').click(force=True)
  v=page.evaluate('window.__frostE2eState()');print('AFTER',json.dumps(v,ensure_ascii=False)[:2600],flush=True)
  assert len(v['wounds'])==1 and v['wounds'][0]['level']==5 and v['wounds'][0]['severity']=='G',v
  assert v['journal'][0]['report']['wounds'][0]['rawIL']==8 and v['journal'][0]['report']['wounds'][0]['gmFrostRuling']['choice']=='G5'
  assert any(e['details'].get('weatherTrauma',{}).get('rawIL')==8 for e in v['events'])
  assert v['storedWounds'][0]['id']==v['wounds'][0]['id'] and v['storedJournal']==1 and v['clock']==480
  page.evaluate('window.__frostE2eReload()');reloaded=page.evaluate('window.__frostE2eState()');assert reloaded['wounds']==v['wounds'] and reloaded['storedJournal']==1,reloaded
  assert not errs,errs
  print('PASS FULL 14-STEP CHARACTER UI -> FROST IL8 -> GM G5 -> CONFIRMED SHOCK -> PERSISTED -> RELOAD',flush=True)
 except BaseException:
  print('FAIL',traceback.format_exc(),'PAGEERR',errs,'dialogs',dialogs[-4:],'TAIL',page.locator('body').inner_text()[-1300:],flush=True);raise
 finally:b.close()
