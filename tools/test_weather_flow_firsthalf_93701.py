from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parent.parent/'hmk-web-combat-engine-main'
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
 page.on('dialog',lambda d: d.accept())
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
    state=page.evaluate('window.__jReport93701()')
    assert state['clock']==720 and state['n']==3,state
    storage=page.evaluate("""()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}))""")
    assert storage, 'committed campaign missing from browser storage'
    print('Persisted browser keys:',len(storage))
    restored=b.new_page(viewport={'width':1550,'height':950})
    restored.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
    restored.evaluate("""records=>{const m=new Map(Object.entries(records));const api={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:api});Object.defineProperty(window,'sessionStorage',{configurable:true,value:api});}""",storage)
    for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:
     restored.add_style_tag(content=(root/css).read_text())
    restored.add_script_tag(content=bundle)
    rep=restored.evaluate('window.__jReport93701()')
    print('FRESH BROWSER LOAD:',rep)
    assert rep['clock']==state['clock'] and rep['n']==state['n'],rep
    assert rep['entries'][0]['id']==state['entries'][0]['id'],'original Skill ID changed during reload'
    print('PASS browser injected-bundle: real GM confirmation, 4h once, saved proof, fresh page restored unchanged')
    restored.close()
 print('errors',errors[:5]);assert not errors,errors
 b.close()
