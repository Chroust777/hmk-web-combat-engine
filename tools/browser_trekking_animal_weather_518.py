from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8')
mark='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(mark):]);
mods['app.js']+='''
window.__seedAnimal515=(elapsed=120)=>{
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
 const policies=F.prepareAnimalWeariness(party.animals,[{actorId:'mule',mode:'walking-analogy'}],'double-walk');
 const group={format:'hmk-group-watch-v1',id:'g514',guideId:'guide',memberIds:['guide'],planningKind:'double-walk',animalWeariness:policies};
 const plan={...E.expeditionWatchFatigue({mode:'double-drover',endurance:10,rolls:[10,1,10,1]}),kind:'travel',trekSourceId:'trek',orienteeringId:'skill',travelledLeagues:movement.leagues,travelledKilometres:movement.kilometres,travelGroup:group};
 const activity=A.scheduleHMKActivity({journal:[],clock:{...clock,minute:480},characterId:'guide',name:'Průvodce',kind:'double-walk',plan,id:'activity',origin:'manual'});
 data=clean();data.characters=[human,mule];activity.createdAt='2026-10-26T18:00:00.000Z';data.campaignClock=clock;data.journal=[trek,skill,activity];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:Math.floor((480+elapsed)/60),prefillMinute:null};const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
window.__seedAnimalRest517=()=>{
 window.__seedAnimal515(0);
 data.journal=data.journal.filter(x=>x.id!=='activity');
 data.campaignClock.minute=480;
 data.characters.find(c=>c.id==='mule').hmk.combatState.fatigue.weariness=25;
 const v=JSON.stringify(data);localStorage.setItem(STORAGE,v);storageBaseline=v;
 view='calendar';activeCalendarSection='travel';render();
};
window.__animalRestReload517=()=>{data=JSON.parse(localStorage.getItem(STORAGE));render();return require('./src/integration/hmk-campaign-calendar-ui.js').calendarBoardEvents({clock:data.campaignClock,characters:data.characters,journal:data.journal}).some(x=>x.title?.startsWith('Zvíře ·'));};

window.__seedWeather518=()=>{
 window.__seedAnimalRest517();
 const T=require('./src/integration/hmk-trekking-routine.js');
 const src=data.journal.find(x=>x.id==='trek');const t=src.calendarTrekProof;
 t.season='winter';t.climate='subpolar';
 const day=T.trekWeatherDay({season:'winter',climate:'subpolar',landscape:'flat',temperatureD10:3,precipitationD10:10});
 t.weatherDay=day;t.weatherWatch=T.trekWeatherWatch(day,{night:false,pavedRoad:true});
 t.animalWeatherPolicy='hmk-trek-animal-weather-analogy-v1';t.unresolved=['Weather Hazard: cold'];
 t.rolls[0].value=3;
 data.characters.find(x=>x.id==='mule').hmk.combatState.fatigue.weariness=0;
 const s=JSON.stringify(data);localStorage.setItem(STORAGE,s);storageBaseline=s;
 view='calendar';activeCalendarSection='travel';render();
};
window.__seedHeat518=()=>{
 window.__seedWeather518();
 const T=require('./src/integration/hmk-trekking-routine.js');const t=data.journal.find(x=>x.id==='trek').calendarTrekProof;
 t.season='summer';t.climate='subtropical';
 t.weatherDay=T.trekWeatherDay({season:'summer',climate:'subtropical',landscape:'flat',temperatureD10:10,precipitationD10:10});
 t.weatherWatch=T.trekWeatherWatch(t.weatherDay,{night:false,pavedRoad:true});t.unresolved=['Weather Hazard: heat'];
 t.rolls[0].value=10;
 const s=JSON.stringify(data);localStorage.setItem(STORAGE,s);storageBaseline=s;render();
};
window.__weatherReload518=()=>{data=JSON.parse(localStorage.getItem(STORAGE));render();return data.journal.some(x=>x.calendarTrekAnimalWeatherProof)};
window.__animalRestMove517=(m)=>{const C=require('./src/integration/hmk-campaign-calendar.js');const next=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:m-data.campaignClock.minute,eventId:uuid(),gmConfirmed:true,reason:'Test animal rest 517',characters:data.characters,journal:data.journal});return mutate(()=>{data.campaignClock=next},{gmClockAdvance:true});};
'''
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedWeather518()')
 form=page.locator('form[data-trek-animal-weather]')
 assert form.count()==1,(errors,page.locator('body').inner_text()[-1900:])
 assert 'Cold' in form.inner_text()
 assert 'Area AV 3' in form.inner_text()
 form.locator('[data-animal-weather-die="hazardRoll"]').click()
 assert 1<=int(form.locator('[name="hazardRoll"]').input_value())<=6
 form.locator('[data-animal-weather-die="endD100"]').click()
 assert 1<=int(form.locator('[name="endD100"]').input_value())<=100
 form.locator('[name="hazardRoll"]').fill('6')
 form.locator('[name="endEML"]').fill('60')
 form.locator('[name="endD100"]').fill('31')
 form.locator('[name="gmConfirmed"]').check()
 form.locator('[type="submit"]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 we=[x for x in saved['journal'] if x.get('calendarTrekAnimalWeatherProof')]
 assert len(we)==1,(errors,dialogs,page.locator('output').all_inner_texts(),page.locator('body').inner_text()[-1700:])
 proof=we[0]['calendarTrekAnimalWeatherProof'];assert proof['sl']=='S' and proof['risk']['exposed']
 assert saved['characters'][1]['hmk']['combatState']['fatigue']['weariness']==5
 assert page.evaluate('window.__weatherReload518()')
 assert page.locator('form[data-trek-animal-weather]').count()==0
 assert not errors,errors
 # Second scenario: no exposure -> no END, retains original Health exactly.
 page.evaluate('window.__seedWeather518()')
 form=page.locator('form[data-trek-animal-weather]')
 form.locator('[name="shelterAV"]').select_option('3')
 form.locator('[name="hazardRoll"]').fill('6')
 form.locator('[name="gmConfirmed"]').check()
 form.locator('[type="submit"]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 we=[x for x in saved['journal'] if x.get('calendarTrekAnimalWeatherProof')]
 assert len(we)==1,(errors,dialogs,page.locator('output').all_inner_texts())
 assert we[0]['calendarTrekAnimalWeatherProof']['sl'] is None
 assert saved['characters'][1]['hmk']['combatState']['fatigue']['weariness']==0
 assert not errors,errors
 # Heat: d4 <= animal Area AV 3 => exposure; +10 Weariness for S.
 page.evaluate('window.__seedHeat518()')
 form=page.locator('form[data-trek-animal-weather]')
 assert form.count()==1 and 'Heat' in form.inner_text(),(errors,dialogs)
 form.locator('[name="hazardRoll"]').fill('1')
 form.locator('[name="endEML"]').fill('60')
 form.locator('[name="endD100"]').fill('31')
 form.locator('[name="gmConfirmed"]').check()
 form.locator('[type="submit"]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 we=[x for x in saved['journal'] if x.get('calendarTrekAnimalWeatherProof')]
 assert len(we)==1,(errors,dialogs,page.locator('output').all_inner_texts())
 assert we[0]['calendarTrekAnimalWeatherProof']['sl']=='S'
 assert saved['characters'][1]['hmk']['combatState']['fatigue']['weariness']==10
 assert not errors,errors
 # Genuine software dice must retain their source instead of being labelled manual.
 page.evaluate('window.__seedWeather518()')
 form=page.locator('form[data-trek-animal-weather]')
 form.locator('[name="shelterAV"]').select_option('3')
 form.locator('[data-animal-weather-die="hazardRoll"]').click()
 form.locator('[name="gmConfirmed"]').check()
 form.locator('[type="submit"]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 we=[x for x in saved['journal'] if x.get('calendarTrekAnimalWeatherProof')]
 assert len(we)==1 and we[0]['calendarTrekAnimalWeatherProof']['risk']['origin']=='cryptographic-software-die',(errors,dialogs,page.locator('output').all_inner_texts())
 page.evaluate('window.__seedHeat518()')
 form=page.locator('form[data-trek-animal-weather]')
 form.locator('[name="hazardRoll"]').fill('1')
 form.locator('[name="endEML"]').fill('60')
 form.locator('[data-animal-weather-die="endD100"]').click()
 form.locator('[name="gmConfirmed"]').check()
 form.locator('[type="submit"]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 we=[x for x in saved['journal'] if x.get('calendarTrekAnimalWeatherProof')]
 assert len(we)==1 and we[0]['calendarTrekAnimalWeatherProof']['endOrigin']=='cryptographic-software-die',(errors,dialogs,page.locator('output').all_inner_texts())
 assert not errors,errors
 print('PASS Chromium 518: Cold exposed/protected, Heat, auto-dice provenance, history and reload')
 browser.close()
