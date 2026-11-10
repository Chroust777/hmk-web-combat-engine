"""v93.814: browser clicks through time-cap, planner, active travel, real library animal
purchase, return/refresh, one stable animal checkbox with live Combat State.
Test seed only prepares campaign and legacy medical record; no rule result is faked.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__registerAuditVet93814=()=>{
 const animal=verifiedLivestock(data,campaignKey(data.campaignClock)).find(a=>a.name==='Blesk');
 if(!animal)throw Error('Horse not purchased');
 const cid=campaignKey(data.campaignClock),minute=data.campaignClock.minute;
 const module=require('./src/integration/hmk-stable-animal-health-registration-93759.js');
 const args={data,campaignId:cid,minute,animalId:animal.id,examinedHealthy:true,examNote:'Skutečná veterinární prohlídka - testovací záznam',gmConfirmed:true,proofId:uuid()};
 if(!mutate(()=>{
  const saved=module.prepareStableAnimalHealthRegistration93759({...args,data});
  data.characters.push(saved.actor);
  if(!data.campaignClock.characterIds.includes(saved.actor.id)){
   data.campaignClock.characterIds.push(saved.actor.id);
   data.campaignClock.events.push({id:uuid(),type:'membership',minute,reason:'Přidán historický ověřený profil zvířete'});
  }
  data.journal.push({id:args.proofId,characterId:saved.proof.ownerId,calendarCampaignId:cid,campaignMinute:minute,createdAt:stamp(),title:'Veterinární potvrzení',body:args.examNote,animalHealthRegistration93759:saved.proof});
 }))throw Error('Veterinary registration could not persist');
 return {id:animal.id,minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute};
};
window.__auditAnimalForm93814=()=>{
 const f=document.querySelector('#hmk-time-episode-form'),v=episodeFormSnapshot(f),c=sharedPlanPreflight93771(f);
 const stable=verifiedLivestock(data,campaignKey(data.campaignClock));
 return {selectedStable:v.stableAnimalIds,selectedLegacy:v.animalIds,stable:stable.map(a=>a.id),preflight:c,
  pendingGroup:sharedTimeWindowActivePlanId,groups:sharedTimeWindowPlans.map(p=>({actor:p.actorId,done:p.done})),
  time:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute};
};
window.__forceTaskDisplay93814=()=>episodeShowSetupError(document.querySelector('#hmk-time-episode-form'),{field:'stableAnimalIds',message:'Pro vyzkoušení rozvržení hlášení opravte výběr zvířete.'});
'''
seed=seed.replace('verifiedLivestock(data,',"require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,")
seed=seed.replace('campaignKey(data.campaignClock)',"require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)")
seed=seed.replace("require('./src/integration/hmk-calendar-multi-campaign.js').require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey", "require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey")
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(16000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 cap=page.locator('[data-shared-window-cap]')
 assert cap.is_visible(),cap.count()
 before=cap.inner_text()
 assert 'Maximální délka nového intervalu' in before,before
 assert page.locator('[data-shared-window-minutes]').get_attribute('max')
 print('CAP BEFORE',repr(before))
 page.locator('[data-shared-window-minutes]').fill('45')
 page.locator('[data-shared-window-create]').click()
 assert cap.is_hidden(), 'Cap should be hidden after creating the window'
 page.locator('[data-shared-plan-add]').click()
 page.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-shared-plan-add]').click()
 page.locator('[data-shared-plan-card]').nth(1).locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.is_visible()
 assert '3 · Zvířata a doprava' in form.inner_text()
 assert not form.locator('[data-episode-legacy-members]').is_visible()
 assert not form.locator('[data-episode-legacy-guide]').is_visible()
 assert form.locator('[data-episode-mandatory-cap]').is_hidden()
 print('FORM AFTER START: old actor picker hidden, cap hidden, new animals header visible')
 # The purchase button is part of the actual travel form.
 form.locator('[data-episode-open-stable-library]').click()
 acq=page.locator('[data-hmk-livestock-acquire]')
 assert acq.count(),page.locator('body').inner_text()[-900:]
 acq.locator('[name=beastId]').select_option(acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value'))
 acq.locator('[name=beastName]').fill('Blesk')
 acq.locator('[name=ownerId]').select_option('a')
 acq.locator('button[value=free]').click()
 reg=page.evaluate('window.__registerAuditVet93814()')
 print('REGISTRATION',reg)
 assert reg['minute']==reg['stored']==480
 # Return to unfinished travel from real UI, refresh the Stable.
 page.locator('[data-hmk-stable-go-travel]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.is_visible()
 form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 chosen=form.locator('[name="stableAnimalIds"][value="'+reg['id']+'"]')
 legacy=form.locator('[name="animalIds"][value="'+reg['id']+'"]')
 assert chosen.count()==1,chosen.count()
 assert legacy.count()==0, 'The same animal must not have a second checkbox'
 assert form.locator('[data-episode-stable-animal="'+reg['id']+'"]').count()==1
 health=form.locator('[data-episode-stable-animal="'+reg['id']+'"] .hc-episode-animal-health').inner_text()
 assert 'Zdravotní stav:' in health,health
 assert form.locator('[data-episode-stable-animal="'+reg['id']+'"] [data-trek-leave-animal]').count()==1
 chosen.check()
 state=page.evaluate('window.__auditAnimalForm93814()')
 print('AFTER CHECK',state,'HEALTH',health)
 assert state['selectedStable']==[reg['id']],state
 assert not state['selectedLegacy'],state
 assert state['preflight'] is None,state
 assert len(state['groups'])==2 and state['groups'][1]['actor']=='c' and not state['groups'][1]['done'],state
 assert state['time']==state['stored']==480,state
 # Browser click on actual Evaluate: if more dice are required, that is a legitimate
 # next task. The historical duplicate-membership error must not appear.
 form.locator('[data-episode-evaluate]').click()
 checklist=page.locator('[data-episode-checklist]').inner_text()
 assert 'nesmí být v jedné skupině uvedeno dvakrát' not in checklist,checklist
 assert 'Stejné zvíře nebo postava' not in checklist,checklist
 print('EVALUATE CHECKLIST',checklist[:370])
 # Extra CSS-level regression for the malformed narrow task button in screenshot.
 page.evaluate('window.__forceTaskDisplay93814()')
 btn=page.locator('[data-episode-checklist] [data-episode-jump="stableAnimalIds"]')
 assert btn.is_visible()
 box=btn.bounding_box()
 print('SETUP BUTTON WIDTH',box['width'])
 assert box['width']>110,box
 assert not errors,errors
 out=root/'docs/AUDIT_v93.814_one_animal.png';page.screenshot(path=str(out),full_page=True)
 print('PASS Chromium v93.814: before/after cap; no legacy participant editor; single Blesk checkbox; health projection; real library purchase during group; Stable refresh; planned second group preserved; no duplicate blocking; readable task button.',flush=True)
 b.close()
