"""Chromium UI / mouse clicks, recorded prerequisite health/weight fixture; no synthetic PASS for complete campaign generation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import re
import sys
import os
root=Path(__file__).resolve().parents[1]
EVIDENCE=Path(os.environ.get('HMK_AUDIT_EVIDENCE_DIR',str(root/'docs'/'AUDIT_v93.819_evidence')))
EVIDENCE.mkdir(parents=True,exist_ok=True)
raw=(root/'hmk-app.bundle.js').read_text('utf8'); pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
rawFixture=json.loads(json.loads((root/'tools/frost_g_fixture.json').read_text('utf8'))['hmk-keepers-ledger-v1'])['characters'][0]
rawFixture.update(id='b',name='Aktér B',kind='PC')
mods['app.js'] += "\nwindow.__realPatientFixture93820=()=>{const b=" + json.dumps(rawFixture,ensure_ascii=False,separators=(',',':')) + ";b.hmk.healthState=require('./src/integration/persistent-combat-state.js').initialCombatState();b.hmk.injuries=[];b.hmk.expedition={};data.characters.splice(data.characters.findIndex(c=>c.id==='b'),1,b);localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};\n"

seed+='''
window.__setTransportFixture93816=()=>{
 for(const c of data.characters){c.hmk.weight=c.id==='a'?'150 lb':c.id==='b'?c.hmk.weight:'170 lb';if(c.id==='a')c.hmk.skills.push({id:'riding-a',name:'Riding',ml:65},{id:'animalcraft-a',name:'Animalcraft',ml:75});}
 // The patient is explicitly medically incapacitated; health data are shared,
 // but this UI fixture is NOT claiming a real combat-derived injury.
 data.characters.find(c=>c.id==='b').hmk.healthState.shock='INC';
 const T=require('./src/integration/hmk-trekking-routine.js');
 const hot=T.trekWeatherDay({season:'summer',climate:'wet-tropical',temperatureD10:10,precipitationD10:10,landscape:'flat'});
 const weather=data.journal.find(j=>j.calendarTrekDayWeather);
 weather.calendarTrekDayWeather.weatherDay=hot;
 weather.calendarTrekDayWeather.season='summer';weather.calendarTrekDayWeather.climate='wet-tropical';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__mountRiderFixture93816=(horseId)=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const w=stableRiderWeight584(character('a'));
 if(!w.ready)throw Error(w.reason);
 const proof={format:'hmk-stable-hub-574',animalId:horseId,ownerId:'a',type:'rider-mount',reason:'GM fixture: skutečné nasednutí doloženého jezdce',riderId:'a',
 riderWeightLb:w.totalLb,riderBodyLb:w.bodyLb,riderGearLb:w.gearLb,riderItems:w.items,riderWeightSource:'inventory-auto-584'};
 if(!mutate(()=>data.journal.push({id:uuid(),characterId:'a',calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'Stáj – nasednutí (fixture)',body:'Doložený jezdec připraven v testovacích datech',stableHub574:proof})))throw Error('rider fixture not committed');
 render();return proof;
};
window.__proofDebug93816=()=>({journal:data.journal.slice(-6).map(j=>({id:j.id,title:j.title,characterId:j.characterId,keys:Object.keys(j).filter(k=>/skill|roll|test/i.test(k))})),proofSelect:document.querySelector('[name=droverProofId]')?.value||'',options:[...document.querySelector('[name=droverProofId]')?.options||[]].slice(-4).map(x=>[x.value,x.textContent]),formGuide:document.querySelector('[name=guideId]')?.value,currentTask:document.querySelector('[data-episode-skill-task]')?.getAttribute('data-episode-skill-task')});
window.__finalMount93816=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,from:j.calendarTimeEpisode.startMinute,to:j.calendarTimeEpisode.endMinute,mount:j.calendarTimeEpisode.transportProof?.mount||null,mass:j.calendarTimeEpisode.transportProof?.mass||null})),windows:data.journal.filter(j=>j.calendarTimeWindow).length,patientHealth:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState)});
window.__transportStatus93816=()=>({minute:data.campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).length,
 horse:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(a=>({id:a.id,name:a.name})),
 stable:(data.journal||[]).filter(j=>j.stableHub574).map(j=>j.stableHub574.type),
 health:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState),
 mass:document.querySelector('[data-episode-transport-mass-summary]')?.textContent||'',
 problem:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem||''});
'''
seed += '''
window.__finalCart93818=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,events:data.campaignClock.events.length,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,conveyance:j.calendarTimeEpisode.conveyance,proof:j.calendarTimeEpisode.transportProof,distance:j.calendarTimeEpisode.distanceMeters})),windows:data.journal.filter(j=>j.calendarTimeWindow).length,health:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState)});
'''
if '--unc' in sys.argv:seed=seed.replace("healthState.shock='INC'","healthState.shock='UNC'")
if '--cold' in sys.argv:
 seed=seed.replace("season:'summer',climate:'wet-tropical',temperatureD10:10","season:'winter',climate:'cool',temperatureD10:1").replace("weather.calendarTrekDayWeather.season='summer'","weather.calendarTrekDayWeather.season='winter'").replace("weather.calendarTrekDayWeather.climate='wet-tropical'","weather.calendarTrekDayWeather.climate='cool'")
mods['app.js']+=seed+'''
window.__markReadyFixture93820=()=>{for(const c of data.characters)c.hmk.creation={version:1,step:14,skillStage:7,status:'complete',values:{},attributeProof:{},skillDP:{},auditEvents:[],completed:Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,true]))};localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__medicalColdShock93820=()=>data.journal.filter(j=>j.characterId==='b'&&j.skillTestProof?.type==='skill-cold-water-shock');
window.__aftercareHealth93820=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,health:character('b').hmk.healthState,receipts:data.journal.filter(j=>j.characterId==='b' && j.skillTestProof?.type==='skill-weather-onset').map(j=>({id:j.id,proof:j.skillTestProof})),skinReceipts:data.journal.filter(j=>j.characterId==='b' && j.skillTestProof?.type==='skill-weather-skin').map(j=>({id:j.id,proof:j.skillTestProof})),otherJobs:data.journal.filter(j=>j.calendarTimeEpisode).length});
window.__weatherResult93819=()=>({minute:data.campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({weather:j.calendarTimeEpisode.weatherExposure||[],transported:j.calendarTimeEpisode.transportedMemberIds||[]})),patientShock:character('b')?.hmk?.healthState?.shock,patientWounds:character('b')?.hmk?.healthState?.wounds||[],patientSkillProofs:data.journal.filter(j=>j.characterId==='b'&&j.skillTestProof).length});
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':1050});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()');page.evaluate('window.__realPatientFixture93820()');page.evaluate('window.__markReadyFixture93820()')
 print('SEEDED',page.locator('[data-nav="characters"]').count(),flush=True)
 page.locator('[data-nav="characters"]').first.click()
 print('CHARS',page.locator('[data-open]').count(),flush=True)
 page.locator('[data-open="b"]').first.click()
 print('JOURNAL NAV',page.locator('[data-sheet-section="overview"]').count(),flush=True)
 if page.locator('[data-sheet-section="overview"]').count():page.locator('[data-sheet-section="overview"]').click()
 region=page.locator('details[data-chronicle-injuries]')
 print('REGION',region.count(),page.locator('body').inner_text()[-1700:],flush=True)
 assert region.count()==1,'Body Locations disclosure missing'
 assert not region.evaluate('e=>e.open'),'Body Locations table should start collapsed'
 print('SUMMARY',repr(region.locator(':scope > summary').inner_text()),flush=True);assert 'BODY LOCATIONS' in region.locator(':scope > summary').inner_text()
 assert 'RÁNY: 0' in region.locator(':scope > summary').inner_text()
 assert not region.locator('.journal-anatomy-table').is_visible(),'anatomy table should be hidden before click'
 region.locator(':scope > summary').click()
 assert region.evaluate('e=>e.open')
 print('TABLE_VISIBLE_DEBUG',region.evaluate('e=>({open:e.open,first:e.innerHTML.slice(0,1600),parent:e.parentElement?.innerHTML.slice(0,2200),table:e.querySelector(".journal-anatomy-table")?.outerHTML.slice(0,150),count:e.querySelectorAll(".journal-anatomy-table").length,anc:[e.tagName,e.closest(".journal-book--overview")?.className]})'),flush=True);assert region.locator('.journal-anatomy-table').is_visible()
 page.screenshot(path='/mnt/data/hmk_93825/chronicle_injuries_open.png',full_page=True)
 region.locator(':scope > summary').click()
 assert not region.evaluate('e=>e.open')
 assert not region.locator('.journal-anatomy-table').is_visible()
 page.screenshot(path='/mnt/data/hmk_93825/chronicle_injuries_closed.png',full_page=True)
 page.locator('[data-sheet-section="status"]').click()
 page.locator('[data-sheet-section="overview"]').click()
 assert not page.locator('details[data-chronicle-injuries]').evaluate('e=>e.open'),'should reset on reopening Chronicle'
 print('PASS Chronicle Spread anatomy initially collapsed, click open and close, re-entry collapsed, underlying table intact, no JS errors',errors,flush=True)
 assert not errors,errors
 b.close()
