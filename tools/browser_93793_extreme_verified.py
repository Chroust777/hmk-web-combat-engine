"""Browser regression v93.786: two independent active Bleeders, same due minute, both original health forms."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
ROOT=Path(__file__).resolve().parents[1]
base=((ROOT/'tools/browser_93790_bleeding_full_cycle_continued.py').read_text()).replace("ROOT=Path('/mnt/data/hmk_93786_work/hmk-web-combat-engine-main')","ROOT=Path(__file__).resolve().parents[1]")
ns={'__file__':str(ROOT/'tools/browser_93787_accident_agility_matrix.py')}
exec(base.rsplit('with sync_playwright() as p:',1)[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
# Only the synthetic fixture bypasses unfinished character creation for test actor B.
cr=mods['src/integration/hmk-character-creation.js']
assert cr.count('character?.id==="a"')>=3
mods['src/integration/hmk-character-creation.js']=cr.replace('character?.id==="a"','["a","b"].includes(character?.id)')
mods['app.js']+='''
window.__seedTwoBleeders93791=()=>{window.__seedBleeder93790();
 const b=data.characters.find(x=>x.id==='b'),state=b.hmk.healthState,source='bleed-b93791',origin='skill-injury:survival-accident:'+source,woundId='wound:'+origin;
 b.hmk.isFolk=true;b.hmk.folk='human';state.lastRound=1;
 state.wounds.push({id:woundId,originDomain:'travel-accident',location:'ab',severity:'G',level:5,aspect:'b',bleeding:true,nextAdvanceRound:61,recordedRound:1,originEventId:origin,shockSL:'CS',side:null,bodyKind:'human',moralePending:false,healing:{treated:true,untreated:false,healingRate:4,grimWound:false,infected:false,nextHealingDay:6}});
 state.events.push({id:origin,type:'travel-accident-injury',round:1,details:{domain:'travel-accident',woundId,sourceId:source,originMinute:data.campaignClock.minute}});
 synchronizeCombatInjuries(b,state);
 const C=require('./src/integration/hmk-campaign-calendar.js');data.campaignClock=C.anchorCampaignOrigin(data.campaignClock,{kind:'wound',characterId:'b',woundId,elapsedMinutes:0,source:'confirmed-health',combatEventId:origin,eventId:'anchor-bleed-b93791',gmConfirmed:true});
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__twoBleedersState93791=()=>{const C=require('./src/integration/hmk-campaign-calendar.js'),L=require('./src/integration/hmk-calendar-chronology.js');const agenda=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory);return {minute:data.campaignClock.minute,cap:L.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda}).maxAllowed,due:agenda.due.map(x=>({kind:x.kind,id:x.characterId})),future:agenda.future.filter(x=>x.minute<=data.campaignClock.minute+5).map(x=>({kind:x.kind,id:x.characterId,minute:x.minute})),bleeding:data.characters.filter(x=>['a','b'].includes(x.id)).map(x=>({id:x.id,bleeding:x.hmk.healthState.wounds[0]?.bleeding,blood:x.hmk.healthState.bloodLoss?.bp||0})),journal:data.journal.length,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute}};
window.__showBloodActor93791=(id)=>{selected=id;view='sheet';activeSheetSection='hazards';render();};
window.__showTravel93791=()=>{view='calendar';calendarLanding=false;activeCalendarSection='travel';render();};
window.__failedCareReceipts93787=()=>data.characters.filter(x=>['a','b'].includes(x.id)).map(x=>({id:x.id,events:x.hmk.healthState.events.filter(e=>e.type==='travel-blood-stoppage').map(e=>({sl:e.details.physicianSL,eml:e.details.physicianEML,blood:e.details.bloodSL,stopped:e.details.stopped,bp:e.details.totalBP}))}));
'''
mods['app.js']+="""
window.__showNoncombatCare93793=(kind)=>{selected='b';view='sheet';activeSheetSection='hazards';weatherCareActiveSection=kind;render();};
window.__extremeState93793=(id)=>{const s=data.characters.find(x=>x.id===id)?.hmk.healthState;return {bp:s.bloodLoss.bp,shock:s.shock,bleeding:s.wounds[0]?.bleeding,extended:s.extendedShock,followup:s.shockFollowup,posture:s.posture,events:s.events.filter(x=>x.type==='travel-blood-stoppage').slice(-1)}};
"""
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message[:100])),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedTwoBleeders93791()')
 initial=page.evaluate('window.__twoBleedersState93791()');print('INITIAL',initial,flush=True)
 assert initial['cap']==5 and len([x for x in initial['future'] if x['kind']=='bleeding'])==2,initial
 # START CARE FOR BOTH PATIENTS AT 08:00 WITHOUT MOVING THE CLOCK.
 for actor in ['a','b']:
  page.evaluate('window.__showBloodActor93791("'+actor+'")')
  start=page.locator('form[data-weather-blood-start]')
  print('CARE_START',actor,start.count(),start.locator('[name=healerId] option').all_text_contents() if start.count() else page.locator('body').inner_text()[-700:],flush=True)
  assert start.count()==1
  start.locator('[name=healerId]').select_option('c')
  start.locator('[name=method]').select_option('cau')
  # Deliberately attempt unprepared Cauterisation: after OK highlight the exact equipment checkbox.
  start.locator('[type=submit]').click()
  heater=page.evaluate('''()=>({name:document.activeElement?.name,marked:document.activeElement?.getAttribute('data-hmk-medical-invalid'),
     color:document.activeElement?.closest('label')?getComputedStyle(document.activeElement.closest('label')).outlineColor:null})''')
  print('MISSING_HEATED_TOOL',actor,heater,'dialog',dialogs[-1:],flush=True)
  assert heater['name']=='hasHeatedTool' and heater['marked']=='yes',heater
  start.locator('[name=hasHeatedTool]').check()
  assert start.locator('[name=hasHeatedTool]').get_attribute('data-hmk-medical-invalid') is None
  start.locator('[type=submit]').click()
  current=page.evaluate('window.__twoBleedersState93791()');print('AFTER_START',actor,current,'dialogs',dialogs[-4:],flush=True)
 # Move clock in one genuine shared interval: patient A rests while healer C works.
 def advance_five():
  page.evaluate('window.__showTravel93791()')
  page.locator('[data-shared-window-minutes]').fill('5');page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click();card=page.locator('[data-shared-plan-card]').last
  card.locator('[data-shared-row-actor]').select_option('a');card=page.locator('[data-shared-plan-card]').last
  card.locator('[data-shared-plan-kind]').select_option('rest')
  page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
  f.locator('[data-episode-evaluate]').click();f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
  assert page.locator('[data-episode-window-stage]').is_enabled(),page.locator('[data-episode-checklist]').inner_text()[-850:]
  page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 advance_five()
 now=page.evaluate('window.__twoBleedersState93791()');print('AFTER_FIRST_FIVE',now,flush=True)
 assert now['minute']==485 and now['cap']==0 and {x['id'] for x in now['due'] if x['kind']=='bleeding'}=={'a','b'},now
 for actor in ['a','b']:
  page.evaluate('window.__showBloodActor93791("'+actor+'")');form=page.locator('form[data-weather-blood-complete]')
  assert form.count()==1
  # Browser's native required validation is also visibly marked red.
  form.locator('[type=submit]').click()
  missing_phys=page.evaluate('''()=>({name:document.activeElement?.name,marked:document.activeElement?.getAttribute('data-hmk-medical-invalid')})''')
  print('MISSING_PHYSICIAN',actor,missing_phys,flush=True)
  assert missing_phys['name']=='physicianRoll' and missing_phys['marked']=='yes',missing_phys
  form.locator('[name=physicianRoll]').fill('99')
  assert form.locator('[name=physicianRoll]').get_attribute('data-hmk-medical-invalid') is None
  # Missing conditional Strength must be rejected. Record whether UI points at the field.
  form.locator('[type=submit]').click()
  diagnosis=page.evaluate('''()=>({active:document.activeElement?.name,invalid:[...document.querySelectorAll('[aria-invalid="true"]')].map(x=>x.name),msg:document.querySelector('form[data-weather-blood-complete] output')?.textContent})''')
  print('MISSING_STRENGTH_VALIDATION',actor,diagnosis,'dialog',dialogs[-2:],'focusHTML',page.evaluate('document.activeElement?.outerHTML.slice(0,250)'),flush=True)
  form.locator('[name=strengthRoll]').fill('99');form.locator('[type=submit]').click()
  now=page.evaluate('window.__twoBleedersState93791()');print('FAILED_STOP',actor,now,flush=True)
 assert now['minute']==485 and now['cap']==5 and all(x['bleeding'] for x in now['bleeding']),now
 for actor in ['a','b']:
  page.evaluate('window.__showBloodActor93791("'+actor+'")');form=page.locator('form[data-weather-blood-start]')
  print('RESTART_CARE',actor,form.count(),flush=True);assert form.count()==1
  form.locator('[name=healerId]').select_option('c');form.locator('[name=method]').select_option('cau');form.locator('[name=hasHeatedTool]').check();form.locator('[type=submit]').click()
 advance_five()
 now=page.evaluate('window.__twoBleedersState93791()');print('AFTER_SECOND_FIVE',now,flush=True)
 assert now['minute']==490 and now['cap']==0,now
 for actor in ['a','b']:
  page.evaluate('window.__showBloodActor93791("'+actor+'")');form=page.locator('form[data-weather-blood-complete]')
  assert form.count()==1
  # Browser's native required validation is also visibly marked red.
  form.locator('[type=submit]').click()
  missing_phys=page.evaluate('''()=>({name:document.activeElement?.name,marked:document.activeElement?.getAttribute('data-hmk-medical-invalid')})''')
  print('MISSING_PHYSICIAN',actor,missing_phys,flush=True)
  assert missing_phys['name']=='physicianRoll' and missing_phys['marked']=='yes',missing_phys
  form.locator('[name=physicianRoll]').fill('100' if actor=='b' else '99')
  assert form.locator('[name=physicianRoll]').get_attribute('data-hmk-medical-invalid') is None;form.locator('[name=strengthRoll]').fill('21');form.locator('[type=submit]').click()
  now=page.evaluate('window.__twoBleedersState93791()');print('SECOND_FAILED_STOP',actor,now,flush=True)
 assert now['minute']==490 and now['cap']==5 and all(x['bleeding'] for x in now['bleeding']),now
 receipts=page.evaluate('window.__failedCareReceipts93787()');print('PHYSICIAN_RECEIPTS',receipts,flush=True)
 assert all(len(x['events'])==2 and all(e['sl'] in ['F','CF'] and e['stopped'] is False for e in x['events']) for x in receipts),receipts
 # Extreme scenario A reaches BP4/KIA, B CS after five more confirmed minutes.
 page.evaluate('window.__showBloodActor93791("b")')
 start=page.locator('form[data-weather-blood-start]')
 assert start.count()==1
 start.locator('[name=healerId]').select_option('c')
 start.locator('[name=method]').select_option('cau')
 start.locator('[name=hasHeatedTool]').check()
 start.locator('[type=submit]').click()
 advance_five()
 now=page.evaluate('window.__twoBleedersState93791()')
 print('THIRD_CYCLE_DUE',now,flush=True)
 assert now['minute']==495 and {x['id'] for x in now['due'] if x['kind']=='bleeding'}=={'a','b'},now
 page.evaluate('window.__showBloodActor93791("a")')
 f=page.locator('form[data-weather-blood-complete]')
 assert f.count()==1 and f.locator('[name=mode]').input_value()=='loss'
 f.locator('[name=strengthRoll]').fill('99');f.locator('[type=submit]').click()
 a=page.evaluate('window.__extremeState93793("a")')
 print('EXTREME_KIA_A',a,flush=True)
 assert a['bp']==4 and a['shock']=='KIA' and not a['bleeding'] and a['extended'] is None and a['followup'] is None,a
 now=page.evaluate('window.__twoBleedersState93791()')
 assert {x['id'] for x in now['due'] if x['kind']=='bleeding'}=={'b'},now
 page.evaluate('window.__showBloodActor93791("b")')
 f=page.locator('form[data-weather-blood-complete]')
 assert f.count()==1 and f.locator('[name=mode]').input_value()=='stoppage'
 f.locator('[name=physicianRoll]').fill('10');f.locator('[type=submit]').click()
 bb=page.evaluate('window.__extremeState93793("b")')
 print('SURVIVOR_STOP_B',bb,flush=True)
 assert bb['bp']==3 and bb['bleeding'] is False and bb['events'][-1]['details']['physicianSL']=='CS' and bb['events'][-1]['details']['strengthRoll'] is None,bb
 endstate=page.evaluate('window.__twoBleedersState93791()');print('EXTREME_END',endstate,flush=True)
 assert endstate['minute']==495 and not any(x['kind']=='bleeding' for x in endstate['due']),endstate
 assert not errors,errors
 print('PASS extreme: BP4 KIA and independent patient CS with due Shock Reroll, no double clock',flush=True)
 b.close()
