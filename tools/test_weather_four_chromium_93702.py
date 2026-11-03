from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path('/mnt/data/hmk_audit_v93702/hmk-web-combat-engine-main');raw=(root/'hmk-app.bundle.js').read_text()
prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__groupWeather93702=()=>{
 const {createCampaignCalendar,campaignCalendarAgenda,advanceCampaignCalendar}=require('./src/integration/hmk-campaign-calendar.js');
 const {prepareColdWaterShock}=require('./src/integration/hmk-weather-trauma-completion.js');
 const actors=data.characters;if(actors.length!==4||actors.some(a=>a.hmk.creation.status!=='auto-generated'))throw Error('Not four complete actors');
 data.campaignClock=createCampaignCalendar({day:1,hour:12,minute:0,label:'Group Weather',eventId:'group-clock',gmConfirmed:true,campaignId:'group-weather-93702',characterIds:actors.map(x=>x.id)});
 const cases=[['coldWater',100,'INC'],['freezingWater',100,'UNC'],['coolWater',1,'NONE'],['coolWater',100,'STN']];
 if(!mutate(()=>{
  cases.forEach(([condition,roll,expected],i)=>{
   const a=actors[i],source='group-weather-source:'+a.id;
   const r=prepareColdWaterShock({actor:a,state:persistentStateOf(a),sourceId:source,round:1,condition,d6s:[3,3,3],enduranceD100:roll,originMinute:720,gmConfirmed:true});
   if(r.state.shock!==expected)throw Error('Unexpected source result '+a.name);
   synchronizeCombatInjuries(a,r.state);
   data.journal.push({id:'group-original:'+a.id,characterId:a.id,calendarCampaignId:'group-weather-93702',campaignMinute:720,createdAt:stamp(),
   title:'Group Water Shock',body:'Skutečná expozice ve vodě a 3d6 + Endurance d100 dle HMK 185',
   skillTestProof:{type:'skill-cold-water-shock',actorId:a.id,sourceId:source,report:r.report}});
  });
 }))throw Error('Group seed rejected');
 selected=actors[0].id;view='sheet';activeSheetSection='hazards';render();return actors.map(a=>({id:a.id,name:a.name,shock:persistentStateOf(a).shock}));
};
window.__groupStatus93702=()=>{const {campaignCalendarAgenda}=require('./src/integration/hmk-campaign-calendar.js');const ag=campaignCalendarAgenda(data.campaignClock,data.characters,data.journal);
 return {minute:data.campaignClock.minute,states:data.characters.map(a=>({id:a.id,name:a.name,shock:persistentStateOf(a).shock,domain:persistentStateOf(a).shockFollowup?.domain??null})),
 due:ag.due.filter(x=>x.kind==='weather-shock').map(x=>x.characterId),future:ag.future.filter(x=>x.kind==='weather-shock').map(x=>[x.characterId,x.minute]),unknown:ag.unknown,
 active:selected,healthForms:document.querySelectorAll('form[data-weather-shock-followup]').length,healthRolls:data.journal.filter(j=>j.skillTestProof?.type==='weather-shock-recovery').map(j=>({actor:j.characterId,minute:j.campaignMinute,source:j.skillTestProof.sourceId,from:j.skillTestProof.from,to:j.skillTestProof.to})),
 journal:data.journal.length,combat:data.combatRuntime?.sequence?.timelineId??null};};
window.__chooseGroupActor93702=i=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render();return data.characters[i].id;};
window.__groupAdvance93702=delta=>{
 const {advanceCampaignCalendar}=require('./src/integration/hmk-campaign-calendar.js');const next=advanceCampaignCalendar(data.campaignClock,{deltaMinutes:delta,eventId:uuid(),reason:'Výslovně potvrzená doba ponoření a zotavení',gmConfirmed:true,characters:data.characters,journal:data.journal});
 if(!mutate(()=>data.campaignClock=next,{gmClockAdvance:true}))throw Error('Calendar advance failed');return data.campaignClock.minute;
};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1550,'height':950});errors=[];dialog=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialog.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const m=new Map();const api={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:api});Object.defineProperty(window,'sessionStorage',{configurable:true,value:api});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 for i in range(4):
  page.locator('[data-action="auto-random-character"]').click();f=page.locator('#hmk-random-name-form');f.locator('[name="name"]').fill('Weather'+str(i+1));f.locator('button[type="submit"]').click()
  start=time.monotonic()
  while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-start<60:page.wait_for_timeout(130)
  assert not page.locator('.hmk-auto-generation-overlay').count(),'Incomplete character '+str(i)
 print('ACTORS',page.evaluate('window.__groupWeather93702()'))
 start=page.evaluate('window.__groupStatus93702()');print('START',start)
 assert [x['shock'] for x in start['states']]==['INC','UNC','NONE','STN']
 assert len(start['due'])==2 and len(start['future'])==1 and not start['unknown']
 def finish_actor(i,count):
  page.evaluate('window.__chooseGroupActor93702('+str(i)+')')
  for j in range(count):
   f=page.locator('form[data-weather-shock-followup]');assert f.count()==1,(i,j,page.locator('#app').inner_text()[-800:])
   f.locator('[name="roll"]').fill('1')
   if f.locator('[name="turnEnded"]').count():f.locator('[name="turnEnded"]').check()
   f.locator('[name="confirmed"]').check();f.locator('button[type="submit"]').click()
   assert 'Weather Shock nelze zapsat' not in page.locator('#app').inner_text(),(i,j)
  return page.evaluate('window.__groupStatus93702()')
 first=finish_actor(0,2);print('FIRST',first)
 assert first['states'][0]['shock']=='NONE' and first['states'][1]['shock']=='UNC' and first['states'][3]['shock']=='STN'
 second=finish_actor(3,1);print('SECOND',second)
 assert len(second['due'])==0 and len(second['future'])==1
 assert page.evaluate('window.__groupAdvance93702(10)')==730
 third=finish_actor(1,2);print('FINAL',third)
 assert all(x['shock']=='NONE' and x['domain'] is None for x in third['states'])
 assert third['minute']==730 and len(third['healthRolls'])==5 and not third['unknown']
 assert sorted(x['minute'] for x in third['healthRolls'])==[720,720,720,720,730] or sorted(x['minute'] for x in third['healthRolls'])==[720,720,720,730,730],third['healthRolls']
 assert len({x['source'] for x in third['healthRolls']})==3
 assert third['combat'] is None and not errors,errors
 print('PASS: 4 fully generated actors, 3 exposed, 5 ordered individual Shock rolls, no cross-actor contamination or Combat, calendar-only time advance')
 b.close()
