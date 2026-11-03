from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path('/mnt/data/hmk_audit_v93702/hmk-web-combat-engine-main')
raw=(root/'hmk-app.bundle.js').read_text(); prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__seedActualColdWaterShock93702=()=>{
 const {createCampaignCalendar}=require('./src/integration/hmk-campaign-calendar.js');
 const {prepareColdWaterShock}=require('./src/integration/hmk-weather-trauma-completion.js');
 const actor=data.characters[0];if(actor.hmk?.creation?.status!=='auto-generated')throw Error('Postava nebyla plně vygenerována');
 data.campaignClock=createCampaignCalendar({day:1,hour:12,minute:0,label:'Weather E2E',eventId:'clock-open',gmConfirmed:true,campaignId:'weather-c93702',characterIds:[actor.id]});
 const source='immersion-full-actor-93702';
 const r=prepareColdWaterShock({actor,state:persistentStateOf(actor),sourceId:source,round:Math.max(1,persistentStateOf(actor).lastRound),originMinute:720,
  condition:'freezingWater',d6s:[3,4,5],enduranceD100:100,gmConfirmed:true});
 if(!mutate(()=>{
  synchronizeCombatInjuries(actor,r.state);
  data.journal.push({id:'original-immersion-93702',characterId:actor.id,calendarCampaignId:'weather-c93702',campaignMinute:720,
  title:'Cold Water Shock · original',body:'Skutečné 3d6 a END d100 ponoření; origin=720, freezingWater',createdAt:stamp(),skillTestProof:{type:'skill-cold-water-shock',sourceId:source,actorId:actor.id,report:r.report}});
 }))throw Error('Failed to persist rule event; '+String(window.__lastAutoError||'see dialog'));
 selected=actor.id;view='sheet';activeSheetSection='hazards';render();
 return {name:actor.name,creation:actor.hmk?.creation?.status,kind:r.state.shock,origin:r.state.shockFollowup.domain,
  newClock:data.campaignClock.minute,entry:data.journal.length,encounter:data.combatRuntime?.sequence?.timelineId??null};
};
window.__advanceActualWeatherTime93702=(delta)=>{
 const {advanceCampaignCalendar}=require('./src/integration/hmk-campaign-calendar.js');
 const r=advanceCampaignCalendar(data.campaignClock,{deltaMinutes:delta,eventId:uuid(),reason:'Doložená zdravotní prodleva Cold Water Shock',gmConfirmed:true,characters:data.characters,journal:data.journal});
 if(!mutate(()=>data.campaignClock=r,{gmClockAdvance:true}))throw Error('Time advance not persisted');
 selected=data.characters[0].id;view='sheet';activeSheetSection='hazards';render();return data.campaignClock.minute;
};
window.__shockReport93702=()=>{const c=data.characters[0],s=persistentStateOf(c);const {campaignCalendarAgenda}=require('./src/integration/hmk-campaign-calendar.js');
 const a=campaignCalendarAgenda(data.campaignClock,data.characters,data.journal);
 return {clock:data.campaignClock.minute,shock:s.shock,q:s.shockFollowup,history:data.journal.length,
   weatherProofs:data.journal.filter(x=>x.skillTestProof?.type==='weather-shock-recovery').map(x=>x.skillTestProof),
   weatherDue:a.all.filter(x=>x.kind==='weather-shock'),unknown:a.unknown,
   encounter:data.combatRuntime?.sequence?.timelineId??null,tab:activeSheetSection};};
window.__nextTravel93702=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';render();return !!document.querySelector('#hmk-time-episode-form')};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1550,'height':950});errors=[];page.on('pageerror',lambda x:errors.append(str(x)))
 dialogs=[];page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const m=new Map();const api={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:api});Object.defineProperty(window,'sessionStorage',{configurable:true,value:api});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.locator('[data-action="auto-random-character"]').click();f=page.locator('#hmk-random-name-form');f.locator('[name="name"]').fill('ShockTester');f.locator('button[type="submit"]').click()
 start=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-start<60:page.wait_for_timeout(150)
 assert page.locator('.hmk-auto-generation-overlay').count()==0,'Full actor generation timed out'
 try:starting=page.evaluate('window.__seedActualColdWaterShock93702()')
 except Exception as e:print('ERROR DIALOGS',dialogs);raise
 print('PREPARE',starting)
 assert starting['creation']=='auto-generated' and starting['kind']=='UNC' and starting['newClock']==720
 assert page.locator('form[data-weather-shock-followup]').count()==1
 assert page.locator('form[data-weather-shock-followup] button[type="submit"]').is_disabled(), 'premature UNC check was allowed'
 assert page.locator('form[data-weather-shock-followup] [name="roll"]').count()==1
 before=page.evaluate('window.__shockReport93702()');print('BEFORE',before)
 assert len(before['weatherDue'])==1 and before['weatherDue'][0]['minute']==730
 assert not before['unknown'],'A parallel Combat Shock blocker exists'
 try: advanced=page.evaluate('window.__advanceActualWeatherTime93702(10)')
 except Exception:print('TIME DIALOGS',dialogs);raise
 assert advanced==730
 beforeRecovery=page.evaluate('window.__shockReport93702()');print('AFTER TIME ADVANCE',beforeRecovery)
 form=page.locator('form[data-weather-shock-followup]');assert form.count()==1 and not form.locator('button[type="submit"]').is_disabled()
 form.locator('[name="roll"]').fill('1');form.locator('[name="confirmed"]').check();form.locator('button[type="submit"]').click()
 after=page.evaluate('window.__shockReport93702()');print('AFTER UNC',after)
 assert after['clock']==730 and after['shock']=='STN' and after['q']['domain']=='travel-weather',after
 assert after['history']==beforeRecovery['history']+1 and len(after['weatherProofs'])==1
 form=page.locator('form[data-weather-shock-followup]');assert form.count()==1
 form.locator('[name="roll"]').fill('1');form.locator('[name="turnEnded"]').check();form.locator('[name="confirmed"]').check();form.locator('button[type="submit"]').click()
 done=page.evaluate('window.__shockReport93702()');print('AFTER STN',done)
 assert done['shock']=='NONE' and done['q'] is None
 assert done['clock']==730 and len(done['weatherProofs'])==2 and done['history']==beforeRecovery['history']+2
 assert not done['unknown'] and done['encounter'] is None,done
 assert not errors,errors
 saved=page.evaluate("""()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}))""")
 fresh=b.new_page(viewport={'width':1550,'height':950})
 fresh.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 fresh.evaluate("""r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}""",saved)
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:fresh.add_style_tag(content=(root/css).read_text())
 fresh.add_script_tag(content=bundle)
 restored=fresh.evaluate('window.__shockReport93702()');print('AFTER RELOAD',restored)
 assert restored['clock']==730 and restored['shock']=='NONE' and len(restored['weatherProofs'])==2 and restored['history']==done['history']
 assert fresh.evaluate('window.__nextTravel93702()')==True
 print('PASS: Chromium full actor, Cold Water UNC due minute 730, two independent Health Shock d100, no Combat, time unchanged by tests, durable reload, next Travel prepared')
 fresh.close();b.close()
