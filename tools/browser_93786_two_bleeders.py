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
'''
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
 # Five-minute in-world rest for third actor. The patients are still bleeding.
 page.locator('[data-shared-window-minutes]').fill('5');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();card=page.locator('[data-shared-plan-card]').last;card.locator('[data-shared-row-actor]').select_option('c');card=page.locator('[data-shared-plan-card]').last;card.locator('[data-shared-plan-kind]').select_option('rest')
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form');f.locator('[data-episode-evaluate]').click()
 f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 assert page.locator('[data-episode-window-stage]').is_enabled(),('Cannot stage 5-minute rest',page.locator('[data-episode-checklist]').inner_text()[-600:])
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 curr=page.evaluate('window.__twoBleedersState93791()');print('DUE',curr,flush=True)
 assert curr['minute']==485 and curr['cap']==0 and set(x['id'] for x in curr['due'] if x['kind']=='bleeding')=={'a','b'},curr
 # Complete BOTH distinct actual health forms and show the other obligation persists.
 for idx,actor in enumerate(['a','b']):
  page.evaluate('window.__showBloodActor93791("'+actor+'")');form=page.locator('form[data-weather-blood-complete]')
  assert form.count()==1,(actor,page.locator('body').inner_text()[-700:])
  form.locator('[name=strengthRoll]').fill('99');form.locator('[type=submit]').click()
  curr=page.evaluate('window.__twoBleedersState93791()');print('RESOLVED',actor,curr,flush=True)
  remain={'b'} if idx==0 else set()
  assert set(x['id'] for x in curr['due'] if x['kind']=='bleeding')==remain,curr
 assert curr['cap']==5 and all(x['bleeding'] for x in curr['bleeding']),curr
 assert curr['minute']==485 and curr['stored']==485 and not errors,errors
 print('PASS two independent active bleeders, same due, two original health forms, future recheck +5, no fictional time, no silent healing')
 b.close()
