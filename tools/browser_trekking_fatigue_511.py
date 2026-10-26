from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8');mark='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(mark):])
mods['app.js']+='''
window.__selected509=()=>selected;
window.__seed509=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const T=require('./src/integration/hmk-trekking-routine.js');
 const state=require('./src/integration/persistent-combat-state.js');
 const roster=['guide','companion'].map((id,i)=>({id,name:i?'Cestovatel':'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-end',name:"Endurance",ml:60},{id:'skill-sur',name:"Survival",ml:55}],combatState:state.initialCombatState(),expedition:{claims:{}}}}));
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test',eventId:'init509',gmConfirmed:true,campaignId:'c509',characterIds:roster.map(c=>c.id)});
 const weatherDay=T.trekWeatherDay({season:'winter',climate:'subpolar',temperatureD10:1,precipitationD10:10,landscape:'flat'});
 const weatherWatch=T.trekWeatherWatch(weatherDay,{night:false,precipitationD6:null,pavedRoad:true});
 const party={format:'hmk-trek-party-modes-v1',memberIds:['companion','guide'],guideId:'guide',conveyance:'foot',
  members:['guide','companion'].map(id=>({id,name:id==='guide'?'Průvodce':'Cestovatel',fatigue:0,injured:false,immobile:false,seriousWounds:[],modifiedENC:0,minimumENC:null,loaded:false,loadUnresolved:false})),
  wearied:false,injured:false,loaded:false,forcedSlow:0,manualLoaded:false,loadUnresolved:[],sourcePages:[112,145,146,167]};
 const modes={progress:0,slow:0,manualSlow:0,orienteeringSlow:0,lax:false,loaded:false,ignoreLoaded:false,
 bearing:0,trackingForcedBearingSourceId:null,foraging:0,stalking:0,vigilance:0,progressD10:[],directionD10:[],doubleTime:false,environ:'highway',wildernessNightWatches:0};
 const movement=T.trekMovement({topography:'flat',terrain:'paved-road',conveyance:'foot',progress:0,slow:0,loaded:false,bearing:0,progressD10:[],doubleTime:false,hours:4,continuousPrecipitation:false});
 const hazards=T.trekHazards({bearingDeficit:0,directionD10:[]});
 const encounter=T.trekEncounterCheck({environ:'highway',night:false,roll:10,elapsedWildernessNightWatches:0});
 const proof={format:'hmk-trekking-watch-evidence-v1',dayIndex:0,campaignMinute:480,area:'Výprava',partyModes:party,
 modes,season:'winter',climate:'subpolar',landscape:'flat',terrain:'paved-road',conveyance:'foot',night:false,alpine:false,aridDesert:false,
 weatherDay,dayAlready:false,weatherWatch,movement,hazards,encounter,rolls:[{faces:10,label:'Daily Temperature',value:1,origin:'manual'},
 {faces:10,label:'Daily Precipitation',value:10,origin:'manual'}, {faces:10,label:'Random Encounter',value:10,origin:'manual'}],
 unresolved:['Weather Hazard: cold'],sourcePages:[141,144,145,146,148,149,150]};
 const watch={id:'watch509',body:'Doložená cestovní hlídka',createdAt:'2026-10-26T19:00:00Z',characterId:'guide',calendarCampaignId:'c509',campaignMinute:480,calendarTrekProof:proof};
 data=clean();data.characters=roster;data.campaignClock=clock;data.journal=[watch];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';storageReadOnly=false;cloudSync=null;
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
'''
mods['app.js']+="\nwindow.__openTravel511=()=>{view='calendar';activeCalendarSection='travel';render();};\n"
bundle=mark+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1600,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for style in ['styles.css','book-templates.css','skill-workbench.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed509()')
 html=page.locator('#app').inner_text()
 assert 'Cold/Heat' in html or 'Weather Hazard' in html,(html[-1800:],errors,dialogs)
 assert 'Průvodce' in html and 'Cestovatel' in html,(html[-1800:],errors)
 assert not errors,errors
 links=page.locator('[data-cal-kind="trek-weather-hazard"]')
 assert links.count()>=2,(links.count(),html[-1800:])
 chosen=page.locator('[data-cal-kind="trek-weather-hazard"][data-cal-link="companion"]')
 assert chosen.count()>=1,(chosen.count(),links.all_text_contents())
 chosen.first.click()
 # First required step is a physical Hazard AV roll, NOT Endurance.
 assert page.locator('form[data-trek-weather-roll]').count()==1,(page.locator('#app').inner_text()[-1400:],errors)
 assert 'Cestovatel' in page.locator('[data-weather-roll-panel]').inner_text()
 page.locator('form[data-trek-weather-roll] [name="areaAV"]').fill('3')
 page.locator('form[data-trek-weather-roll] [name="roll"]').fill('2')
 page.locator('form[data-trek-weather-roll] button[type="submit"]').click()
 html=page.locator('#app').inner_text()
 assert page.locator('form[data-trek-weather-roll]').count()==0,(html[-1500:],errors,dialogs)
 assert page.locator('[data-cal-kind="trek-weather-hazard"][data-cal-link="companion"]').count()==0,(html[-1800:],errors)
 page.locator('[data-calendar-section="overview"]').first.click()
 guide=page.locator('[data-cal-kind="trek-weather-hazard"][data-cal-link="guide"]')
 assert guide.count()>0,(html[-1800:],errors)
 guide.first.click()
 assert page.locator('form[data-trek-weather-roll]').count()==1
 page.locator('form[data-trek-weather-roll] [name="areaAV"]').fill('0')
 page.locator('form[data-trek-weather-roll] [name="roll"]').fill('5')
 page.locator('form[data-trek-weather-roll] button[type="submit"]').click()
 assert page.locator('#skill-secondary-form').count()==1,(page.locator('#app').inner_text()[-1700:],errors)
 assert page.evaluate('window.__selected509()')=='guide'
 assert page.locator('#skill-secondary-form [name="primary"]').input_value() in ('Endurance','Survival')
 form=page.locator('#skill-secondary-form')
 form.locator('[name=rollA]').fill('25')
 form.locator('button[type=submit]').first.click()
 page.wait_for_timeout(120)
 journal=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))['journal']
 assert any(j.get('calendarTrekSkillSource',{}).get('hazard')=='weather' and j.get('characterId')=='guide' for j in journal),(errors,dialogs,[j.get('title') for j in journal])
 assert not errors,errors
 page.evaluate('window.__openTravel511()')
 form=page.locator('#campaign-expedition-form')
 assert form.count()==1,(page.locator('#app').inner_text()[-1400:],errors)
 form.locator('[name="kind"]').select_option('double-walk')
 form.locator('[name="characterIds"][value="guide"]').check()
 form.locator('[name="characterIds"][value="companion"]').check()
 page.wait_for_timeout(200)
 rows=form.locator('[data-expedition-actor-dice-row]')
 assert rows.count()==2,(rows.count(),page.locator('#app').inner_text()[-1200:],errors)
 for row in rows.all():
  assert row.locator('input').count()==4,('Double Time requires 4 independent hourly d10 inputs',row.inner_text())
 form.locator('[data-expedition-roll]').click()
 for row in rows.all():
  dice=[int(v) for v in row.locator('input').evaluate_all('(els)=>els.map(x=>x.value)')]
  assert len(dice)==4 and all(1<=x<=10 for x in dice),dice
 assert not errors,errors
 print('PASS Chromium: weather calendar routing AND double-time 4 separate d10 rolls for both actors, browser UI')
 b.close()
