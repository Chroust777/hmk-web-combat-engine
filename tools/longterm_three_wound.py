from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
root=Path('/mnt/data/hmk93712_work'); prefix='(()=>{const MOD='
raw=(root/'hmk-app.bundle.js').read_text(); mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__auditSelect=i=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render()};
window.__auditReport=()=>({clock:data.campaignClock.minute,journal:data.journal.length,actors:data.characters.map(c=>({id:c.id,name:c.name,end:c.hmk.attributes.end,wil:c.hmk.attributes.wil,wounds:persistentStateOf(c).wounds.map(w=>({id:w.id,level:w.level,healed:w.healed,healing:w.healing})),hazards:persistentStateOf(c).environmentalHazards.map(h=>({id:h.sourceId,active:h.active,hr:h.hr,treated:h.treatmentStarted,elapsed:h.lastElapsedMinutes}))})),agenda:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal)});
window.__auditAdvance=(delta)=>{const C=require('./src/integration/hmk-campaign-calendar.js');const next=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:delta,eventId:uuid(),reason:'GM-certified treatment recovery interval',gmConfirmed:true,characters:data.characters,journal:data.journal});if(!mutate(()=>{data.campaignClock=next},{gmClockAdvance:true}))throw Error('Clock save');return data.campaignClock.minute;};
window.__auditProvision=i=>{const c=data.characters[i],N=require('./src/integration/hmk-nutrition-days.js'),clock=data.campaignClock;const proof=N.createNutritionProvisionSwitch({campaignId:clock.campaignId,actorId:c.id,minute:clock.minute,provisioned:true});if(!mutate(()=>data.journal.push({id:uuid(),characterId:c.id,calendarCampaignId:clock.campaignId,campaignMinute:clock.minute,createdAt:stamp(),title:'GM confirmed provisions during injury care',body:'GM confirms food and water access',calendarNutritionProvisionSwitch:proof})))throw Error('Provision not saved');};
window.__auditStorage=()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}));
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
records=json.loads(Path('/mnt/data/hmk93707_work/fixtures/post_three_treatment.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=b.new_page(viewport={'width':1480,'height':900});page.set_default_timeout(15000)
 errors=[];dialogs=[];page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()));page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a})}''',records)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/f).read_text())
 page.add_script_tag(content=bundle);r=lambda:page.evaluate('window.__auditReport()');adv=lambda d:page.evaluate('d=>window.__auditAdvance(d)',d)
 def select(i):page.evaluate('i=>window.__auditSelect(i)',i)
 def show(f):f.evaluate('f=>{for(let a=f;a;a=a.parentElement)if(a.tagName==="DETAILS")a.open=true}')
 def output(f):return f.locator('output').all_text_contents() if f.count() else []
 print('BOOT',r()['clock'],'due',[(x['kind'],x.get('minute')) for x in r()['agenda']['due']],flush=True)
 for i in [0,1]:
  select(i);button=page.locator('[data-provision-assure="yes"]');print('PROV',i,button.count(),flush=True)
  if button.count():button.click()
  else:page.evaluate('i=>window.__auditProvision(i)',i)
  print('PROVISION DONE',i,flush=True)
 for i in [0,1]:
  select(i);form=page.locator('form[data-skill-weather-treatment]')
  print('WARMING',i,form.count(),'hazards',r()['actors'][i]['hazards'],flush=True);assert form.count()==1
  show(form)
  for name in ['removedFromHazard','treatmentConfirmed','gmConfirmed']:
   if form.locator(f'[name={name}]').count():form.locator(f'[name={name}]').check()
  form.locator('button[type=submit]').click()
  print('WARMED',i,r()['actors'][i]['hazards'],output(form),flush=True)
  assert r()['actors'][i]['hazards'][0]['treated']
 print('AFTER WARMING',r()['clock'],'future',[(x['kind'],x['minute']) for x in r()['agenda']['future'][:8]],flush=True)
 # Both cold exposure healings due at 1200; per character, one roll.
 delta=1200-r()['clock']; print('ADVANCE',delta,adv(delta),'DUE',[(x['kind'],x.get('characterId'),x.get('elapsedMinutes')) for x in r()['agenda']['due']],flush=True)
 for i in [0,1]:
  select(i);f=page.locator('form[data-skill-weather-course]');assert f.count()==1;show(f)
  due=next(x for x in r()['agenda']['due'] if x['kind']=='weather-course' and x['characterId']==r()['actors'][i]['id'])
  f.locator('[name=elapsedMinutes]').fill(str(due['elapsedMinutes']));f.locator('[name=roll]').fill('1')
  if f.locator('[name=gmConfirmed]').count():f.locator('[name=gmConfirmed]').check()
  f.locator('button[type=submit]').click()
  print('HEAL EXPOSURE',i,r()['actors'][i]['hazards'],flush=True)
  assert not r()['actors'][i]['hazards'][0]['active']
 Path('/mnt/data/hmk93712_tests/out_post_treatment_weather_healed.json').write_text(json.dumps(page.evaluate('window.__auditStorage()')))
 print('COURSES OK','clock',r()['clock'],'due',[(x['kind'],x.get('characterId')) for x in r()['agenda']['due']],flush=True)
 print('FIRST ADV',adv(7920-r()['clock']),'due',[(x['kind'],x.get('woundId')) for x in r()['agenda']['due']],flush=True)
 # Three wounds for two actors. One wound on actor 0 will infect; another suspended while infected.
 for i,wi in [(0,0),(1,0)]:
  select(i);f=page.locator('#hmk-healing-roll-form');assert f.count()==1;show(f)
  if f.locator('[name=wound]').count():
   opts=f.locator('[name=wound] option').all();print('HEAL OPTIONS',i,[x.get_attribute('value') for x in opts],flush=True)
   f.locator('[name=wound]').select_option(r()['actors'][i]['id']+'::'+r()['actors'][i]['wounds'][wi]['id'])
  for k,v in {'daySinceInjury':5,'endurance':r()['actors'][i]['end'],'will':r()['actors'][i]['wil'],'roll':95}.items():
   if not f.locator(f'[name={k}]').is_editable():assert f.locator(f'[name={k}]').input_value()==str(v),(k,f.locator(f'[name={k}]').input_value(),v)
   else:f.locator(f'[name={k}]').fill(str(v))
  f.locator('button[type=submit]').click()
  print('HEAL CF',i,wi,r()['actors'][i]['wounds'][wi]['healing'],output(f),flush=True)
  assert r()['actors'][i]['wounds'][wi]['healing'].get('infected')
 print('ONE-ACTOR WOUND2 SUSPENDED',[(x['kind'],x.get('woundId'),x.get('status')) for x in r()['agenda']['all'] if x['characterId']==r()['actors'][0]['id'] and x['kind']=='healing'],flush=True)
 print('CALENDAR',r()['clock'],'due',[(x['kind'],x.get('woundId'),x.get('status')) for x in r()['agenda']['due']],flush=True)
 Path('/mnt/data/hmk93712_tests/out_infection_day5.json').write_text(json.dumps(page.evaluate('window.__auditStorage()')))
 # Infection on wound A blocks untreated healing on wound B of the SAME actor.
 blocked=[x for x in r()['agenda']['suspended'] if x.get('characterId')==r()['actors'][0]['id']]
 print('SUSPENDED',[(x['kind'],x.get('woundId')) for x in blocked],flush=True)
 assert len(blocked)>=2,'infection did not freeze all of actor1 wounds'
 for day,minute in [(6,9360),(7,10800),(8,12240)]:
  assert adv(minute-r()['clock'])==minute
  for i in [0,1]:
   select(i);f=page.locator('#hmk-infection-course-form');assert f.count()==1,('No infection form',i,day)
   show(f)
   print('INFECT DUE',day,i,'opts',[n.get_attribute('value') for n in f.locator('[name=wound] option').all()],flush=True)
   for k,v in {'daySinceInjury':day,'endurance':r()['actors'][i]['end'],'will':r()['actors'][i]['wil'],'roll':1}.items():
    if not f.locator(f'[name={k}]').is_editable():assert f.locator(f'[name={k}]').input_value()==str(v),(k,f.locator(f'[name={k}]').input_value(),v)
    else:f.locator(f'[name={k}]').fill(str(v))
   if f.locator('[name=gmConfirmed]').count():f.locator('[name=gmConfirmed]').check()
   f.locator('button[type=submit]').click()
   print('INFECT',day,i,r()['actors'][i]['wounds'][0]['healing'].get('infectionHR'),r()['actors'][i]['wounds'][0]['healing'].get('infected'),'dialog',dialogs[-1:],flush=True)
   assert r()['clock']==minute
  if not any(a['wounds'][0]['healing'].get('infected') for a in r()['actors']):break
 assert not any(a['wounds'][0]['healing'].get('infected') for a in r()['actors'])
 print('RESUMED',[[w['healing'].get('nextHealingDay') for w in a['wounds']] for a in r()['actors']],flush=True)
 assert [w['healing'].get('nextHealingDay') for w in r()['actors'][0]['wounds']]==[12,12], 'Both wounds must resume 5 days after LAST infection'
 assert [w['healing'].get('nextHealingDay') for w in r()['actors'][1]['wounds']]==[12]
 Path('/mnt/data/hmk93712_tests/out_infections_cured.json').write_text(json.dumps(page.evaluate('window.__auditStorage()')))
 # Five days later: each wound receives its own d100, with a healed wound
 # remaining in historical evidence but never blocking subsequent tests.
 for day,minute in [(13,18000),(18,25200)]:
  assert adv(minute-r()['clock'])==minute
  for i in [0,1]:
   for wi,w in enumerate(list(r()['actors'][i]['wounds'])):
    if w['healed']:continue
    select(i);f=page.locator('#hmk-healing-roll-form');assert f.count()==1
    show(f);f.locator('[name=wound]').select_option(r()['actors'][i]['id']+'::'+w['id'])
    for k,v in {'daySinceInjury':day-1,'endurance':r()['actors'][i]['end'],'will':r()['actors'][i]['wil'],'roll':1}.items():
     if not f.locator(f'[name={k}]').is_editable():assert f.locator(f'[name={k}]').input_value()==str(v),(k,f.locator(f'[name={k}]').input_value(),v)
     else:f.locator(f'[name={k}]').fill(str(v))
    f.locator('button[type=submit]').click()
    nw=r()['actors'][i]['wounds'][wi]
    print('HEAL',day,i,wi,'healed',nw['healed'],'hr',nw['healing'].get('healingRate'),'dialog',dialogs[-1:],flush=True)
    assert r()['clock']==minute
  if all(w['healed'] for a in r()['actors'] for w in a['wounds']):break
 print('FINAL',r()['clock'],'wounds',[(a['name'],[w['healed'] for w in a['wounds']]) for a in r()['actors']],'errors',errors,flush=True)
 assert all(w['healed'] for a in r()['actors'] for w in a['wounds']),'some wounds remain unhealed'
 Path('/mnt/data/hmk93712_tests/out_all_healed.json').write_text(json.dumps(page.evaluate('window.__auditStorage()')))
 assert not errors,errors
 print('PASS MULTI-WOUND ONE ACTOR + TWO ACTORS FULL INFECTION/HEALING',flush=True)
 b.close()
