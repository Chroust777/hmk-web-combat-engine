from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data/hmk_dev_93722')
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,pos=json.JSONDecoder().raw_decode(raw[len(prefix):]);
helper=r'''
window.__parallelTest={
 setup:()=>{
  const a=data.characters[0];if(a?.hmk?.creation?.status!=='auto-generated')throw Error('Full generated actor required');const actorId=a.id; const h=persistent_combat_state_js_1.initialCombatState();h.shock='INC';h.shockOriginRound=1;
  h.extendedShock={originState:'INC',hr:5,elapsedHours:0,domain:'travel-weather',sourceId:'old'};
  if(!mutate(()=>{character(actorId).hmk.healthState=h;}))throw Error('Fixture health mutation failed: '+notice);
  const clock=hmk_campaign_calendar_js_1.createCampaignCalendar({day:1,hour:12,minute:0,label:'Proof',eventId:'init',gmConfirmed:true,campaignId:'C1',characterIds:[actorId]});
  if(!mutate(()=>{data=hmk_calendar_multi_campaign_js_1.beginAdditionalCalendar(data,clock);}))throw Error('Fixture calendar begin failed: '+notice);
  if(!mutate(()=>{data.campaignClock=hmk_campaign_calendar_js_1.anchorCampaignOrigin(data.campaignClock,{kind:'extended-shock',characterId:actorId,elapsedMinutes:0,eventId:'anchor1',gmConfirmed:true});}))throw Error('Fixture anchor failed: '+notice);
  const out=hmk_weather_trauma_completion_js_1.prepareColdWaterShock({actor:character(actorId),state:h,sourceId:'cold1',round:2,condition:'freezingWater',d6s:[2,2,3],enduranceD100:100,originMinute:data.campaignClock.minute,gmConfirmed:true});
  if(!mutate(()=>{synchronizeCombatInjuries(character(actorId),out.state);}))throw Error('Fixture cold shock fail: '+notice);
  selected=actorId;view='sheet';activeSheetSection='hazards';render();return window.__parallelTest.inspect();
 },
 inspect:()=>({minute:data.campaignClock.minute,shock:data.characters[0].hmk.healthState.shock,
  parallel:data.characters[0].hmk.healthState.parallelColdShocks,extended:data.characters[0].hmk.healthState.extendedShock,
  creation:data.characters[0].hmk?.creation?.status,forms:document.querySelectorAll('form[data-parallel-cold-reroll]').length,
  courses:document.querySelectorAll('form[data-parallel-cold-course]').length,
  stored:(JSON.parse(localStorage.getItem(STORAGE)||'{}').characters||[])[0]?.hmk?.healthState?.parallelColdShocks?.length,notice}),
 advance:()=>{data.campaignClock=hmk_campaign_calendar_js_1.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:10,eventId:'adv1',reason:'Ten actual minutes elapsed',gmConfirmed:true,characters:data.characters,journal:data.journal});
  let ok=save({gmClockAdvance:true});render();return {ok,...window.__parallelTest.inspect()};},
 reload:()=>{data=JSON.parse(localStorage.getItem(STORAGE));render();return window.__parallelTest.inspect();}
};
'''
modules['app.js']+='\n'+helper
repacked=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+pos:]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();errors=[];alerts=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('console',lambda msg:print('CONSOLE',msg.type,msg.text[:1500]) if msg.type=='error' else None)
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.goto('about:blank');page.set_content('<div id="app"></div>')
 page.evaluate("""()=>{function mem(){let m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}}}Object.defineProperty(window,'localStorage',{configurable:true,value:mem()});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mem()})}""")
 page.add_script_tag(content=repacked)
 page.locator('[data-action="auto-random-character"]').click()
 f=page.locator('#hmk-random-name-form');f.locator('[name="name"]').fill('Patient')
 f.locator('button[type=submit]').click()
 page.locator('.hmk-auto-generation-overlay').wait_for(state='hidden',timeout=90000)
 print('FULL ACTOR',page.evaluate("()=>window.__parallelTest&&'available'"),flush=True)
 try:r=page.evaluate('window.__parallelTest.setup()');print('SETUP',r)
 except Exception:print('DIALOGS',alerts,'ERRORS',errors);raise
 assert r['forms']==1 and r['shock']=='UNC' and r['stored']==1
 r=page.evaluate('window.__parallelTest.advance()');print('ADVANCE',r)
 assert r['ok'] and r['minute']==730
 form=page.locator('form[data-parallel-cold-reroll]');form.locator('[name=roll]').fill('99')
 form.locator('button[type=submit]').click();r=page.evaluate('window.__parallelTest.inspect()');print('REROLL',r)
 assert r['parallel'][0]['extendedShock']['hr']==5 and r['courses']==1 and r['stored']==1
 r=page.evaluate('window.__parallelTest.reload()');print('RELOAD',r)
 assert r['courses']==1 and r['parallel'][0]['extendedShock']['hr']==5 and r['stored']==1
 print('PASS browser parallel Cold Water Shock: native UI, persisted reroll, next course, reload')
 print('ERRORS',errors,'DIALOGS',alerts)
 assert not errors
 browser.close()
