from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path('/mnt/data/hmk_audit_v93702/hmk-web-combat-engine-main')
raw=(root/'hmk-app.bundle.js').read_text()
prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__harn93701=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const chars=data.characters;
 if(!chars.length)throw Error('No generated actor');
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Kontrolní kampaň',eventId:'begin-harn-93701',gmConfirmed:true,campaignId:'c-harn93701',characterIds:chars.map(x=>x.id)});
 data.journal=[];view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';storageReadOnly=false;render();
 return {count:chars.length,auto:chars.map(x=>({name:x.name,status:x.hmk?.creation?.status,id:x.id}))};
};
window.__weatherHealth93701=()=>{selected=data.characters[0].id;view='sheet';activeSheetSection='hazards';render();return document.querySelectorAll('.hmk-health-exposure-followups').length;};
window.__combatCheck93701=()=>{selected=data.characters[0].id;view='sheet';activeSheetSection='status';render();return {form:document.querySelectorAll('form[data-skill-weather-onset]').length,nav:document.querySelector('.journal-book-subnav')?.innerText};};
window.__medReport93701=()=>{const a=data.characters[0];return {clock:data.campaignClock?.minute,name:a.name,hazards:persistentStateOf(a).environmentalHazards?.map(h=>({id:h.id,kind:h.kind,skinPending:h.skinPending,hr:h.hr,elapsedMinutes:h.elapsedMinutes})),wounds:persistentStateOf(a).wounds?.length,journal:data.journal.length};};
window.__jReport93701=()=>({n:data.journal.length,clock:data.campaignClock?.minute,view,skillRequest:episodePendingSkillRequest?.status||null,
 entries:data.journal.slice(-3).map(x=>({id:x.id,skill:x.skillTestProof?.type,level:x.skillTestProof?.a?.level||x.skillTestProof?.result?.level}))});
window.__flowHeat93701=()=>{
 const f=document.querySelector('#hmk-time-episode-form'),a=data.characters[0].id;
 const set=(k,val)=>{const e=f.elements.namedItem(k);if(!e)throw Error(k);e.value=String(val);};
 set('kind','rest');set('minutes','240');set('weatherSource','local');set('area','Tropický tábor');
 set('season','summer');set('climate','wet-tropical');set('temperatureD10','10');set('precipitationD10','10');
 set('whAV_heat_'+a,'1');set('whRoll_heat_'+a,'1');
 updateEpisodePreview(f);
 return {error:f.dataset.episodeProblem||'',tasks:document.querySelector('[data-episode-checklist]')?.innerText,button:document.querySelector('[data-episode-evaluate]')?.textContent};
};
window.__coldSleet93701=()=>{
 const f=document.querySelector('#hmk-time-episode-form'),a=data.characters[0].id;
 const set=(k,val)=>{const el=f.elements.namedItem(k);if(!el)throw Error(k);el.value=String(val);};
 set('kind','travel');set('weatherSource','local');set('area','Plískanice na cestě');
 set('season','winter');set('climate','subpolar');set('temperatureD10','1');
 set('precipitationD10','6');set('precipitationD6','1');
 updateEpisodePreview(f);
 const die=f.querySelector('[data-episode-die="whRoll_cold_'+a+'"]');
 return {faces:die.dataset.episodeFaces,max:f.elements.namedItem('whRoll_cold_'+a).max,
  hazard:f.querySelector('[data-episode-weather-selected]')?.textContent,
  note:f.dataset.episodeProblem||''};
};
window.__hazardDie93701=()=>{
 const f=document.querySelector('#hmk-time-episode-form'),a=data.characters[0].id;
 const set=(key,val)=>{const el=f.elements.namedItem(key);if(!el)throw Error(key);el.value=String(val);};
 set('kind','rest');set('minutes',240);set('weatherSource','local');set('area','Zkušební tábor');
 set('climate','wet-tropical');set('season','summer');set('temperatureD10',10);set('precipitationD10',10);
 f.elements.namedItem('whShade_heat_'+a).checked=true;
 f.elements.namedItem('whNative_heat_'+a).checked=true;
 updateEpisodePreview(f);
 const button=f.querySelector('[data-episode-die="whRoll_heat_'+a+'"]');
 return {faces:button.dataset.episodeFaces,visibleShade:!f.querySelector('[data-episode-heat-shade]').hidden,
   hazard:f.querySelector('[data-episode-weather-selected]')?.textContent,
   error:f.dataset.episodeProblem||'',rollMax:f.elements.namedItem('whRoll_heat_'+a).max};
};
window.__invalidWeatherProof93701=()=>{
 const f=document.querySelector('#hmk-time-episode-form'),actor=data.characters[0];
 const name='whProof_cold_'+actor.id,select=f.elements.namedItem(name);
 select.insertAdjacentHTML('beforeend','<option value="foreign-unlinked-id">Unlinked older Survival</option>');
 select.value='foreign-unlinked-id';
 const before=data.journal.length;
 episodeEvaluationRequested=true;
 timeEpisodeDraft=episodeFormSnapshot(f);
 renderEpisodeEndError(f,'Skill Test '+name+' nebyl vyžádán touto epizodou. Otevřete jeho vlastní tlačítko ve výsledcích; samostatné hody nelze převzít.');
 return {cleared:select.value,level:f.elements.namedItem('whEnd_cold_'+actor.id)?.value,
  text:document.querySelector('[data-episode-checklist]')?.innerText,
  button:document.querySelector('[data-episode-checklist] [data-episode-skill-task]')?.textContent,
  next:episodeNextSkillStep(f),journalUnchanged:data.journal.length===before};
};
window.__goCalendar93701=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';render();return {clock:data.campaignClock.minute,adv:!!document.querySelector('#campaign-advance-form')};};
window.__goTravel93701=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';render();return {clock:data.campaignClock.minute,form:!!document.querySelector('#hmk-time-episode-form')};};
window.__webFixture93701=(hazard,options={})=>{
  const form=document.querySelector('#hmk-time-episode-form');if(!form)throw Error('No time form');
  const set=(name,value)=>{const el=form.elements.namedItem(name);if(!el)throw Error('No field '+name);el.value=String(value);};
  const actor=data.characters[0];
  // Source verified complete actor already generated through UI, not artificial records.
  const weatherDay= require('./src/integration/hmk-trekking-routine.js').trekWeatherDay({season:hazard==='cold'?'winter':'summer',climate:hazard==='cold'?'subpolar':'warm',temperatureD10:hazard==='cold'?1:10,precipitationD10:hazard==='cold'?1:10,landscape:'flat'});
  return {actor:actor.name,weatherDay:weatherDay.daylightHazard,weatherNight:weatherDay.nightHazard,form:form.outerHTML.length,fields:[...form.elements].filter(x=>x.name?.startsWith('wh')).map(x=>x.name).slice(0,11)};
};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1550,'height':950});errors=[];page.on('pageerror',lambda x:errors.append(str(x)))
 dialogs=[];page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const m=new Map();const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}""")
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 for i in range(1):
  page.locator('[data-action="auto-random-character"]').click();form=page.locator('#hmk-random-name-form');form.locator('[name="name"]').fill(f'Audit{i+1}');form.locator('button[type="submit"]').click()
  start=time.monotonic()
  while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-start<45:page.wait_for_timeout(140)
  assert not page.locator('.hmk-auto-generation-overlay').count(),'auto-generation timeout'
  print('generated',i+1)
 print('SEED',page.evaluate('window.__harn93701()'))

 print('SCENE',page.evaluate('window.__flowHeat93701()'))
 page.locator('[data-episode-evaluate]').click()
 print('AFTER EVALUATE:',page.locator('[data-episode-checklist]').inner_text()[:1300])
 print('SKILL BTN:',page.locator('[data-episode-checklist] [data-episode-skill-task]').count())
 if page.locator('[data-episode-checklist] [data-episode-skill-task]').count():
  page.locator('[data-episode-checklist] [data-episode-skill-task]').click()
  print('SKILL VIEW TEXT:',page.locator('#app').inner_text()[:2500])
  print('TEST FORMS:',page.locator('#app form').count())
  print('FORM DETAILS:',page.evaluate("""()=>[...document.querySelectorAll('#app form')].map(f=>({
   attrs:[...f.attributes].map(a=>[a.name,a.value]).filter(([n])=>n.startsWith('data-')),
   fields:[...f.elements].filter(e=>e.name).map(e=>[e.tagName,e.name,e.value]).slice(0,25),
   buttons:[...f.querySelectorAll('button')].map(x=>[x.textContent.trim(),x.type]).slice(0,9)
  }))"""))
  page.locator('#app form').first.locator('[name="rollA"]').fill('95')
  page.locator('#app form').first.locator('button[type="submit"]').click()
  print('POST ENDURANCE:',page.locator('#app').inner_text()[-2400:])
  print('JOURNAL:',page.evaluate('window.__jReport93701()'))
  print('ACTION BUTTONS:',page.evaluate("""()=>[...document.querySelectorAll('#app button')].map(x=>({name:x.textContent.trim(),attrs:[...x.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name)})).filter(x=>/ulož|potvr|zaps|vrát|výsled/i.test(x.name)).slice(-35)"""))
  page.locator('[data-episode-return]').click()
  print('BACK TO EPISODE',page.evaluate('window.__jReport93701()'))
  print('AFTER LINK:',page.locator('[data-episode-checklist]').inner_text()[:950])
  print('FINALIZE BUTTON:',page.locator('[data-episode-finalize]').is_disabled())
  form=page.locator('#hmk-time-episode-form')
  if form.count():
   print('LINKED proof:',page.evaluate("""()=>{
    const f=document.querySelector('#hmk-time-episode-form'),a=window.__harnTestActorId;
    return [...f.elements].filter(e=>e.name?.startsWith('whProof_heat_')||e.name?.startsWith('whEnd_heat_')).map(e=>[e.name,e.value]);
   }"""))
   form.locator('[name="confirmed"]').check()
   print('After GM confirmed',page.locator('[data-episode-checklist]').inner_text()[:650])
   print('Button disabled',page.locator('[data-episode-finalize]').is_disabled())
   if not page.locator('[data-episode-finalize]').is_disabled():
    page.locator('[data-episode-finalize]').click()
    print('AFTER COMMIT',page.evaluate('window.__jReport93701()'))
    print('AFTER COMMIT UI',page.locator('#app').inner_text()[-1500:])
    print('CLIMATE STATE BEFORE MED',page.evaluate('window.__medReport93701()'))
    print('HEALTH NAV',page.evaluate('window.__weatherHealth93701()'))
    print('HEALTH FORMS',page.evaluate("""()=>[...document.querySelectorAll('.hmk-health-exposure-followups form')].map(f=>({
      attrs:[...f.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name),
      fields:[...f.elements].filter(e=>e.name).map(e=>[e.name,e.value])
    }))"""))
    if page.locator('form[data-skill-weather-onset]').count()==1:
     page.locator('form[data-skill-weather-onset]').evaluate("f=>{const d=f.closest('details');if(d)d.open=true}")
     page.locator('form[data-skill-weather-onset] button[type=submit]').click()
     print('CLIMATE STATE AFTER MED',page.evaluate('window.__medReport93701()'))
     print('AFTER ONSET FORMS',page.evaluate("""()=>[...document.querySelectorAll('.hmk-health-exposure-followups form')].map(f=>[...f.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name))"""))
     assert page.evaluate("window.__medReport93701().hazards?.[0]?.hr") == 4
     assert page.evaluate("window.__medReport93701().hazards?.[0]?.skinPending") == 'sunburn'
     before=page.evaluate('window.__medReport93701()')
     assert before['clock']==720 and before['journal']==4
     skin=page.locator('form[data-skill-weather-skin]')
     assert skin.count()==1, 'skin required'
     skin.evaluate("f=>{const d=f.closest('details');if(d)d.open=true}")
     skin.locator('[name="complexion"]').select_option('very-light')
     skin.locator('[name="rows"]').fill('ft;left;0;1;5;')
     skin.locator('[name="allLocationsReviewed"]').check()
     skin.locator('[name="gmConfirmed"]').check()
     skin.locator('button[type="submit"]').click()
     print('SKIN',page.evaluate('window.__medReport93701()'),page.locator('#app').inner_text()[-1200:])
     after=page.evaluate('window.__medReport93701()')
     assert after['journal']==before['journal']+1, 'Skin journal was not created'
     assert after['wounds']>=1, 'Sunburn was not recorded anatomically'
     assert after['clock']==before['clock'], 'Sunburn moved calendar'
     treat=page.locator('form[data-skill-weather-treatment]')
     assert treat.count()==1, 'active exposure treatment required'
     treat.evaluate("f=>{const d=f.closest('details');if(d)d.open=true}")
     treat.locator('[name="removedFromHazard"]').check()
     treat.locator('[name="treatmentConfirmed"]').check()
     treat.locator('[name="gmConfirmed"]').check()
     treat.locator('button[type="submit"]').click()
     print('TREAT',page.evaluate('window.__medReport93701()'),page.locator('#app').inner_text()[-1200:])
     afterT=page.evaluate('window.__medReport93701()')
     assert afterT['journal']==after['journal']+1, 'Treatment journal was not created'
     assert afterT['clock']==before['clock'], 'Treatment moved calendar'
     assert afterT['wounds']==after['wounds'], 'Treatment removed an anatomical wound'
     assert not errors, errors
     print('PASS: Travel->Endurance CF->Calendar->Sunburn wound->Compress starts, clock stable, original records preserved')
     print('CALENDAR ADV SCREEN',page.evaluate('window.__goCalendar93701()'))
     advance=page.locator('#campaign-advance-form')
     assert advance.count()==1
     print('CALENDAR AGENDA',page.locator('#app').inner_text()[-2200:])
     advance.locator('[name="days"]').fill('0')
     advance.locator('[name="hours"]').fill('0')
     advance.locator('[name="minutes"]').fill('15')
     advance.locator('[name="reason"]').fill('Kontrola splatného Heat Healing po 15 minutách')
     advance.locator('button[type="submit"]').click()
     print('CALENDAR AFTER ADV',page.evaluate('window.__medReport93701()'))
     if page.evaluate('window.__medReport93701().clock')==720:
      loc=page.locator('button[data-cal-kind="treatment"]')
      print('PENDING TREATMENT LINK',loc.count())
      assert loc.count()>=1,'Cannot navigate to due wound care'
      loc.first.click()
      print('AFTER WOUND CARE ROUTE',page.evaluate('window.__jReport93701()'))
      print('HEALTH CARE FORM',page.evaluate("""()=>{const f=document.getElementById('hmk-treatment-form');return f?{count:1,fields:[...f.elements].filter(e=>e.name).map(e=>[e.name,e.value,e.checked]),section:document.querySelector('.hmk-weather-wound-care')?.open}:null;}"""))
      assert page.locator('#hmk-treatment-form').count()==1,'Environmental wound treatment not in Health section'
      wf=page.locator('#hmk-treatment-form')
      wf.locator('[name=daySinceInjury]').fill('0')
      wf.locator('[name=untreated]').check()
      wf.locator('button[type=submit]').click()
      afterW=page.evaluate('window.__medReport93701()')
      print('WOUND TREATMENT DECISION',afterW,'DIALOGS',dialogs[-3:])
      assert afterW['journal']>=afterT['journal']+1, 'Treatment decision not persisted'
      assert afterW['clock']==720
      assert not any('nebylo zapsáno' in x.lower() for x in dialogs),dialogs
      print('CAL2',page.evaluate('window.__goCalendar93701()'))
      advance=page.locator('#campaign-advance-form')
      advance.locator('[name=days]').fill('0')
      advance.locator('[name=hours]').fill('0')
      advance.locator('[name=minutes]').fill('15')
      advance.locator('[name=reason]').fill('Plynutí času do první splatnosti Heat Healing')
      advance.locator('button[type=submit]').click()
      advanced=page.evaluate('window.__medReport93701()')
      print('ADVANCE TO HEALING',advanced,'DIALOGS',dialogs[-3:])
      assert advanced['clock']==735, 'Calendar failed to advance after wound Treatment'
      assert page.evaluate('window.__weatherHealth93701()')==1
      course=page.locator('form[data-skill-weather-course]')
      assert course.count()==1,'Due Heat Healing not available'
      course.evaluate("f=>{const d=f.closest('details');if(d)d.open=true}")
      print('COURSE FIELDS',page.evaluate("""()=>{const f=document.querySelector('form[data-skill-weather-course]');return [...f.elements].map(e=>[e.name,e.value,e.checked]);}"""))
      course.locator('[name=elapsedMinutes]').fill('15')
      course.locator('[name=roll]').fill('10')
      course.locator('[name=gmConfirmed]').check()
      course.locator('button[type=submit]').click()
      result=page.evaluate('window.__medReport93701()')
      print('POST HEALING',result,page.locator('#app').inner_text()[-900:])
      assert result['journal']==advanced['journal']+1,'Healing test not recorded'
      assert result['clock']==735,'Healing moved calendar unexpectedly'
      assert not errors,errors
      print('PASS: Weather Endurance CF -> Sunburn wound -> Compress -> wound care decision -> GM +15 min -> due Heat Healing d100; all persisted')
      saved=page.evaluate("""()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}))""")
      assert saved, 'No saved data after treatment and healing'
      fresh=b.new_page(viewport={'width':1550,'height':950})
      fresh.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
      fresh.evaluate("""records=>{const m=new Map(Object.entries(records));const api={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:api});Object.defineProperty(window,'sessionStorage',{configurable:true,value:api});}""",saved)
      for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:
       fresh.add_style_tag(content=(root/css).read_text())
      fresh.add_script_tag(content=bundle)
      afterReload=fresh.evaluate('window.__medReport93701()')
      print('FULL MEDICAL RELOAD',afterReload)
      assert afterReload['clock']==result['clock'] and afterReload['journal']==result['journal'] and afterReload['wounds']==result['wounds'], 'Reload changed time, wound or journal'
      assert afterReload['hazards'][0]['hr']==result['hazards'][0]['hr']
      print('NEXT TRAVEL',fresh.evaluate('window.__goTravel93701()'))
      assert fresh.locator('#hmk-time-episode-form').count()==1, 'Cannot open next Travel activity'
      # Starting the next travel is separate from finalizing it: no new dice are invented.
      fresh.evaluate("""()=>{const f=document.querySelector('#hmk-time-episode-form');f.elements.namedItem('kind').value='travel';f.elements.namedItem('minutes').value='15';f.dispatchEvent(new Event('change',{bubbles:true}));}""")
      print('NEXT TRAVEL FORM',fresh.locator('[data-episode-checklist]').inner_text()[:800])
      assert fresh.evaluate('window.__medReport93701().clock')==735,'Preparing next travel silently advanced time'
      assert fresh.evaluate('window.__medReport93701().journal')==8,'Preparing next travel rewrote saved evidence'
      fresh.close()
      print('PASS: Heat medical E2E complete through first due Healing, restart persistence, next Travel prepared without changing clock')

      b.close();exit(0)
     assert page.evaluate('window.__medReport93701().clock')==735, 'Calendar did not reach first due healing'
     print('HEALTH AT DUE',page.evaluate('window.__weatherHealth93701()'))
     course=page.locator('form[data-skill-weather-course]')
     assert course.count()==1,'Healing form not found'
     course.evaluate("f=>{const d=f.closest('details');if(d)d.open=true}")
     print('COURSE DUE DETAILS',page.evaluate("""()=>{const f=document.querySelector('form[data-skill-weather-course]');return [...f.elements].map(e=>[e.name,e.value,e.checked]);}"""))
     course.locator('[name="elapsedMinutes"]').fill('15')
     course.locator('[name="roll"]').fill('10')
     course.locator('[name="gmConfirmed"]').check()
     course.locator('button[type="submit"]').click()
     print('COURSE AFTER',page.evaluate('window.__medReport93701()'),page.locator('#app').inner_text()[-1700:])
     heal=page.evaluate('window.__medReport93701()')
     assert heal['clock']==735 and heal['journal']==afterT['journal']+1, 'Healing did not persist or moved clock'
     assert not errors,errors
     print('PASS: complete direct medical continuation at first due Heat Healing, no duplicated time')



 print('errors',errors[:5])
 b.close()
