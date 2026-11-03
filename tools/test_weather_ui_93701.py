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
 print('weather fixture',page.evaluate('window.__webFixture93701("cold")'))
 form=page.locator('#hmk-time-episode-form');print('form count',form.count(),'summary',page.locator('[data-episode-weather-details] summary').count())
 assert form.count()==1
 labels=form.locator('[data-episode-weather-actor] label:has([name]):not([data-hmk-help])')
 print('unmapped labels',labels.count(),labels.all_inner_texts()[:12])
 assert labels.count()==0
 print('grouped sections',form.locator('[data-episode-weather-actor] .hc-weather-step').count())
 assert form.locator('[data-episode-weather-actor] .hc-weather-step').count()==1*2*3
 assert form.locator('[name^="whShade_cold_"]').count()==0
 assert form.locator('[name^="whFire_heat_"]').count()==0
 assert form.locator('[name^="whProtection_heat_"]').count()==0
 assert form.locator('[name^="whNative_heat_"]').count()==1
 print('HEAT dynamic die',page.evaluate('window.__hazardDie93701()'))
 print('COLD sleet preflight die',page.evaluate('window.__coldSleet93701()'))
 print('HEALTH LABEL:',page.evaluate('window.__weatherHealth93701()'),page.locator('h3').all_inner_texts()[:8]);assert 'Zdraví & Expozice' in page.locator('#app').inner_text()
 combat=page.evaluate('window.__combatCheck93701()');assert combat['form']==0,combat;print('COMBAT independent weather form:',combat['form'])
 page.evaluate("""()=>{window.__weatherHealth93701=window.__weatherHealth93701;}""")
 # Return to travel and reproduce the original invalid, unrequested Endurance proof.
 page.evaluate('window.__harn93701()')
 orphan=page.evaluate('window.__invalidWeatherProof93701()')
 print('orphan proof recovery',orphan)
 assert orphan['cleared']=='' and orphan['journalUnchanged'],orphan
 assert orphan['button'] and 'Endurance' in orphan['button'],orphan
 assert orphan['next'] and orphan['next']['skill']=='Endurance',orphan
 page.locator('[data-episode-checklist] [data-episode-skill-task]').click()
 assert page.locator('#hmk-time-episode-form').count()==0,'Skill Test navigation did not open'
 print('Endurance tab click PASS; no duplicate original proof')
 print('errors',errors);assert not errors,errors
 b.close()
