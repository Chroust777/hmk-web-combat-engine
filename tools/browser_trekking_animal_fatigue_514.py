from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8')
mark='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(mark):]);
mods['app.js']+='''
window.__seedAnimal514=(elapsed=120)=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const E=require('./src/integration/hmk-calendar-expedition.js');
 const T=require('./src/integration/hmk-trekking-routine.js');
 const H=require('./src/integration/hmk-trekking-handoff.js');
 const A=require('./src/integration/hmk-calendar-activities.js');
 const S=require('./src/integration/persistent-combat-state.js');
 const P=require('./src/integration/hmk-trekking-party-modes.js');
 const F=require('./src/integration/hmk-trekking-animal-fatigue.js');
 const human={id:'guide',name:'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:10,agl:12,dex:12,per:12,wil:12,rea:12},combatState:S.initialCombatState()}};
 const mule={id:'mule',name:'Mezek Blesk',kind:'NPC',hmk:{verifiedMountedBreed:'mule',attributes:{str:25,end:12},combatState:S.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:Math.floor((480+elapsed)/60),minute:(480+elapsed)%60,label:'Test514',eventId:'start',gmConfirmed:true,campaignId:'c514',characterIds:['guide','mule']});
 const day=T.trekWeatherDay({season:'summer',climate:'cool',landscape:'flat',temperatureD10:5,precipitationD10:10});
 const wet=T.trekWeatherWatch(day,{night:false,pavedRoad:true});
 const party=P.trekPartyModes({memberIds:['guide'],guideId:'guide',characters:[human,mule],conveyance:'mount',drovingAnimals:[{id:'mule',enc:10,droverId:'guide'}]});
 const modes={progress:0,slow:0,manualSlow:0,orienteeringSlow:0,lax:false,loaded:false,ignoreLoaded:false,bearing:0,trackingForcedBearingSourceId:null,foraging:0,stalking:0,vigilance:0,progressD10:[],directionD10:[],doubleTime:true,environ:'highway',wildernessNightWatches:0};
 const movement=T.trekWatchMovement({topography:'flat',terrain:'paved-road',conveyance:'mount',progress:0,slow:0,loaded:false,bearing:0,progressD10:[],doubleTime:true,continuousPrecipitation:false});
 const proof={format:'hmk-trekking-watch-evidence-v1',dayIndex:0,campaignMinute:480,area:'Cesta',partyModes:party,modes,season:'summer',climate:'cool',landscape:'flat',terrain:'paved-road',conveyance:'mount',night:false,alpine:false,aridDesert:false,weatherDay:day,dayAlready:false,weatherWatch:wet,movement,hazards:T.trekHazards({bearingDeficit:0,directionD10:[]}),encounter:T.trekEncounterCheck({environ:'highway',night:false,roll:10}),rolls:[{faces:10,label:'Daily Temperature',value:5,origin:'manual'},{faces:10,label:'Daily Precipitation',value:10,origin:'manual'},{faces:10,label:'Random Encounter',value:10,origin:'manual'}],unresolved:[],sourcePages:[141,144,145,146,148,149,150]};
 const trek={id:'trek',createdAt:'2026-10-26T18:00:00.000Z',body:'Podklady trekking',characterId:'guide',calendarCampaignId:'c514',campaignMinute:480,calendarTrekProof:proof};
 const skillProof={type:'success-value-specific',skills:['Survival'],a:{sv:5,level:'S'}};
 const link=H.trekkingSkillLinkForNewProof({pending:{sourceId:'trek',hazard:'survival'},source:trek,actorId:'guide',campaignId:'c514',minute:480,proof:skillProof});
 const skill={id:'skill',createdAt:'2026-10-26T18:00:00.000Z',body:'Hod Survival',characterId:'guide',calendarCampaignId:'c514',campaignMinute:480,skillTestProof:skillProof,calendarTrekSkillSource:link};
 const policies=F.prepareAnimalWeariness(party.animals,[{actorId:'mule',rate:5,reason:'Testovací rozhodnutí GM o únavě',gmConfirmed:true}],'double-walk');
 const group={format:'hmk-group-watch-v1',id:'g514',guideId:'guide',memberIds:['guide'],planningKind:'double-walk',animalWeariness:policies};
 const plan={...E.expeditionWatchFatigue({mode:'double-drover',endurance:10,rolls:[10,1,10,1]}),kind:'travel',trekSourceId:'trek',orienteeringId:'skill',travelledLeagues:movement.leagues,travelledKilometres:movement.kilometres,travelGroup:group};
 const activity=A.scheduleHMKActivity({journal:[],clock:{...clock,minute:480},characterId:'guide',name:'Průvodce',kind:'double-walk',plan,id:'activity',origin:'manual'});
 data=clean();data.characters=[human,mule];activity.createdAt='2026-10-26T18:00:00.000Z';data.campaignClock=clock;data.journal=[trek,skill,activity];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:Math.floor((480+elapsed)/60),prefillMinute:null};const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1600,'height':1100});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept('Střet s vlky' if d.type=='prompt' else None)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 for elapsed,expectedHuman,expectedAnimal in [(120,5,10),(90,5,10)]:
  page.evaluate('(elapsed)=>window.__seedAnimal514(elapsed)',elapsed)
  form=page.locator('#campaign-expedition-form');assert form.count()==1,errors
  assert form.locator('[data-expedition-animal-policy]').count()==1
  stop=page.locator('[data-calendar-interrupt-activity="activity"]');assert stop.count()==1,errors
  stop.evaluate("el=>el.closest('details').open=true")
  if elapsed==90:
   page.locator('[data-calendar-partial-weariness="activity"]').fill('5')
   page.locator('[data-calendar-animal-partial="activity:mule"]').fill('10')
  stop.click()
  doc=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
  actor=next(c for c in doc['characters'] if c['id']=='guide')
  animal=next(c for c in doc['characters'] if c['id']=='mule')
  assert actor['hmk']['combatState']['fatigue']['weariness']==expectedHuman,(elapsed,dialogs,errors,actor['hmk']['combatState']['fatigue'])
  assert animal['hmk']['combatState']['fatigue']['weariness']==expectedAnimal,(elapsed,dialogs,errors,animal['hmk']['combatState']['fatigue'])
  assert len([j for j in doc['journal'] if j.get('calendarTrekAnimalFatigueProof')])==1
  assert len([j for j in doc['journal'] if j.get('calendarExpeditionProof',{}).get('interrupted')])==1
  assert not errors,errors
 print('PASS Chromium 514: calendar interruption 120min automated animal rate and 90min GM partial decision, separate canonical animal+human state, no duplicates')
 browser.close()
