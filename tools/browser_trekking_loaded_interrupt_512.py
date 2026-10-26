from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8');mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__seedAnimal512=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const S=require('./src/integration/persistent-combat-state.js');
 data=clean();data.characters=['guide','other'].map(id=>({id,name:id,kind:'PC',hmk:{attributes:{str:12,end:10,agl:12,dex:12,per:12,wil:12,rea:12},combatState:S.initialCombatState()}}));
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test512',eventId:'start',gmConfirmed:true,campaignId:'c512',characterIds:['guide','other']});
 data.journal=[];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};render();
};
window.__seedPartial512=(elapsed=120)=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const E=require('./src/integration/hmk-calendar-expedition.js');
 const T=require('./src/integration/hmk-trekking-routine.js');
 const H=require('./src/integration/hmk-trekking-handoff.js');
 const A=require('./src/integration/hmk-calendar-activities.js');
 const S=require('./src/integration/persistent-combat-state.js');
 const actor={id:'guide',name:'Guide',kind:'PC',hmk:{attributes:{str:12,end:10},combatState:S.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:Math.floor((480+elapsed)/60),minute:(480+elapsed)%60,label:'Test512',eventId:'start',gmConfirmed:true,campaignId:'c512',characterIds:['guide']});
 const day=T.trekWeatherDay({season:'summer',climate:'cool',landscape:'flat',temperatureD10:5,precipitationD10:10});
 const wet=T.trekWeatherWatch(day,{night:false,pavedRoad:true});
 const party={format:'hmk-trek-party-modes-v1',memberIds:['guide'],guideId:'guide',conveyance:'foot',members:[{id:'guide',name:'Guide',fatigue:0,injured:false,immobile:false,seriousWounds:[],modifiedENC:0,minimumENC:null,loaded:false,loadUnresolved:false}],wearied:false,injured:false,loaded:false,forcedSlow:0,manualLoaded:false,loadUnresolved:[],sourcePages:[112,145,146,167]};
 const modes={progress:0,slow:0,manualSlow:0,orienteeringSlow:0,lax:false,loaded:false,ignoreLoaded:false,bearing:0,trackingForcedBearingSourceId:null,foraging:0,stalking:0,vigilance:0,progressD10:[],directionD10:[],doubleTime:true,environ:'highway',wildernessNightWatches:0};
 const movement=T.trekWatchMovement({topography:'flat',terrain:'paved-road',conveyance:'foot',progress:0,slow:0,loaded:false,bearing:0,progressD10:[],doubleTime:true,continuousPrecipitation:false});
 const proof={format:'hmk-trekking-watch-evidence-v1',dayIndex:0,campaignMinute:480,area:'Cesta',partyModes:party,modes,season:'summer',climate:'cool',landscape:'flat',terrain:'paved-road',conveyance:'foot',night:false,alpine:false,aridDesert:false,weatherDay:day,dayAlready:false,weatherWatch:wet,movement,hazards:T.trekHazards({bearingDeficit:0,directionD10:[]}),encounter:T.trekEncounterCheck({environ:'highway',night:false,roll:10}),rolls:[{faces:10,label:'Daily Temperature',value:5,origin:'manual'},{faces:10,label:'Daily Precipitation',value:10,origin:'manual'},{faces:10,label:'Random Encounter',value:10,origin:'manual'}],unresolved:[],sourcePages:[141,144,145,146,148,149,150]};
 const trek={id:'trek',createdAt:'2026-10-26T18:00:00.000Z',body:'Podklady trekking',characterId:'guide',calendarCampaignId:'c512',campaignMinute:480,calendarTrekProof:proof};
 const skillProof={type:'success-value-specific',skills:['Survival'],a:{sv:5,level:'S'}};
 const link=H.trekkingSkillLinkForNewProof({pending:{sourceId:'trek',hazard:'survival'},source:trek,actorId:'guide',campaignId:'c512',minute:480,proof:skillProof});
 const skill={id:'skill',createdAt:'2026-10-26T18:00:00.000Z',body:'Hod Survival',characterId:'guide',calendarCampaignId:'c512',campaignMinute:480,skillTestProof:skillProof,calendarTrekSkillSource:link};
 const plan={...E.expeditionWatchFatigue({mode:'double-walk',endurance:10,rolls:[10,1,10,1]}),kind:'travel',trekSourceId:'trek',orienteeringId:'skill',travelledLeagues:movement.leagues,travelledKilometres:movement.kilometres};
 const activity=A.scheduleHMKActivity({journal:[],clock:{...clock,minute:480},characterId:'guide',name:'Guide',kind:'double-walk',plan,id:'activity',origin:'manual'});
 data=clean();data.characters=[actor];activity.createdAt='2026-10-26T18:00:00.000Z';data.campaignClock=clock;data.journal=[trek,skill,activity];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:Math.floor((480+elapsed)/60),prefillMinute:null};const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1600,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept('Přepadení skupiny' if d.type=='prompt' else None)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for f in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/f).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedAnimal512()')
 form=page.locator('#campaign-trekking-context-form');assert form.count()==1,errors
 form.evaluate("el=>el.closest('details').open=true")
 form.locator('[name="area"]').fill('Test load')
 form.locator('[name="season"]').select_option('winter')
 form.locator('[name="conveyance"]').select_option('mount')
 form.locator('[name="diceOrigin"]').select_option('manual')
 form.locator('[name="rolls"]').fill('7,10,10')
 form.locator('[name="droverId"]').select_option('guide')
 form.locator('[name="drovingAnimals"]').fill('Mule A ; 20 ; guide\nMule B ; 39 ; other')
 form.locator('[name="ignoreLoaded"]').check()
 form.locator('[name="doubleTime"]').check()
 form.locator('[name="trekMemberIds"][value="other"]').check()
 form.locator('button[type="submit"]').click()
 store=page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")
 assert store is not None,(dialogs,errors)
 doc=json.loads(store)
 watches=[j['calendarTrekProof'] for j in doc['journal'] if j.get('calendarTrekProof')]
 assert len(watches)==1,(dialogs,errors,len(watches))
 assert watches[0]['partyModes']['animals']==[{'id':'Mule A','enc':20,'droverId':'guide','loaded':True},{'id':'Mule B','enc':39,'droverId':'other','loaded':True}]
 assert watches[0]['modes']['ignoreLoaded']==True
 assert watches[0]['orienteeringContext']['droverId']=='guide'
 assert not errors,errors
 page.evaluate('window.__seedPartial512()')
 # The 10:00 clock is 120 min after the schedule at 08:00.
 stop=page.locator('[data-calendar-interrupt-activity="activity"]');assert stop.count()==1,(errors,page.locator('#app').inner_text()[-1000:])
 stop.evaluate("el=>el.closest('details').open=true")
 stop.click()
 store=page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')")
 doc=json.loads(store)
 stopproof=[j for j in doc['journal'] if j.get('calendarActivityInterruptProof')]
 partial=[j for j in doc['journal'] if j.get('calendarExpeditionProof',{}).get('interrupted')]
 assert len(stopproof)==1 and len(partial)==1,(dialogs,errors,[x.get('title') for x in doc['journal']])
 assert partial[0]['calendarExpeditionProof']['delta']==15,partial
 assert doc['characters'][0]['hmk']['combatState']['fatigue']['weariness']==15
 assert stopproof[0]['calendarActivityInterruptProof']['partialTravel']['elapsedMinutes']==120
 assert not errors,errors
 # GM explicitly decides the otherwise unspecified fractional-hour fatigue.
 page.evaluate('window.__seedPartial512(90)')
 stop=page.locator('[data-calendar-interrupt-activity="activity"]');stop.evaluate("el=>el.closest('details').open=true")
 page.locator('[data-calendar-partial-weariness="activity"]').fill('12')
 stop.click()
 doc=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len([j for j in doc['journal'] if j.get('calendarExpeditionProof',{}).get('interrupted')])==1,(dialogs,errors)
 assert doc['characters'][0]['hmk']['combatState']['fatigue']['weariness']==12
 assert [j for j in doc['journal'] if j.get('calendarActivityInterruptProof')][0]['calendarActivityInterruptProof']['partialTravel']['fullHours']==1
 assert not errors,errors
 print('PASS Chromium UI: two loaded animals with separate drovers and bypass, 2-hour and 90-minute Double Time interruptions commit only earned/GM-confirmed fatigue to Combat State')
 b.close()
