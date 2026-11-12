"""v93.814: browser clicks through time-cap, planner, active travel, real library animal
purchase, return/refresh, one stable animal checkbox with live Combat State.
Test seed only prepares campaign and legacy medical record; no rule result is faked.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed=seed.replace("skills:[{id:'survival-'+id,name:'Survival',ml:65}]","skills:[{id:'survival-'+id,name:'Survival',ml:65},{id:'animalcraft-'+id,name:'Animalcraft',ml:75},{id:'riding-'+id,name:'Riding',ml:75}]")
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
seed += """
window.__debugReserved93848=()=>({groups:sharedTimeWindowDraft?.groups,plan:sharedPlanCurrent93771(),scheduled:sharedPlanState93771().scheduled,reserved:[...episodeAnimalReservations93848().entries()]});
"""
seed=seed.replace('verifiedLivestock(data,',"require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,")
seed=seed.replace('campaignKey(data.campaignClock)',"require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)")
seed=seed.replace("require('./src/integration/hmk-calendar-multi-campaign.js').require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey", "require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey")
seed+='''
window.__finalReceipt93814=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,
 events:data.campaignClock.events.length,
 episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({memberIds:j.calendarTimeEpisode.memberIds,
  stable:j.calendarTimeEpisode.settings.stableAnimalIds||[],animalHealth:j.calendarTimeEpisode.animalHealth||[],
  from:j.calendarTimeEpisode.startMinute,to:j.calendarTimeEpisode.endMinute,distance:j.calendarTimeEpisode.distanceMeters})),
 windows:data.journal.filter(j=>j.calendarTimeWindow).length});
'''
seed+="""
window.__vetStateDigest93815=()=>{
 const ids=(data.campaignClock?.characterIds||[]).filter(id=>data.characters.find(c=>c.id===id)?.hmk?.verifiedMountedBreed);
 return JSON.stringify(ids.map(id=>[id,data.characters.find(c=>c.id===id).hmk.healthState]));
};
"""
seed+="""
window.__cartWeights93852=()=>{for(const c of data.characters){c.hmk.weight=c.id==='a'?'150 lb':c.id==='c'?'170 lb':'120 lb';}localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render()};
"""
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
 page.evaluate('window.__seedRows93772()');page.evaluate('window.__cartWeights93852()')
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
 medical_before=page.evaluate('window.__vetStateDigest93815()')
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
 form.locator('[name=conveyance]').select_option('cart')
 form=page.locator('#hmk-time-episode-form')
 team=form.locator('[name=transportTeamIds][value="'+reg['id']+'"]')
 assert team.count()==1,('missing cart draft horse',form.inner_text()[-500:])
 team.check()
 if form.locator('[data-episode-equipment-action=gift]').count():
  form.locator('[data-episode-equipment-action=gift]').first.click()
  form=page.locator('#hmk-time-episode-form')
 if form.locator('[data-episode-equipment-action=vehicle-gift]').count():
  form.locator('[data-episode-equipment-action=vehicle-gift]').first.click()
  form=page.locator('#hmk-time-episode-form')
 if form.locator('[name=transportVehicleKey]').count():form.locator('[name=transportVehicleKey]').select_option(index=1)
 print('CART_CHECKLIST',form.locator('[data-episode-equipment-checklist-body]').inner_text()[:700],flush=True)
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

 # Each step below uses the visible controls and actual Skill Tests, without
 # injecting synthetic result journal rows. Finish and stage both travel groups.
 def finish_group(group_label):
  f=page.locator('#hmk-time-episode-form')
  assert f.is_visible(),('group not opened',group_label)
  confirmed=f.locator('[name=confirmed]')
  if not confirmed.is_visible():f.locator('[data-episode-evaluate]').click()
  if confirmed.is_visible() and not confirmed.is_checked():confirmed.check()
  for i in range(35):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   f.locator('[data-episode-evaluate]').click()
   if page.locator('[data-episode-window-stage]').is_enabled():break
   field=f.get_attribute('data-episode-problem-field') or ''
   msg=f.get_attribute('data-episode-problem') or ''
   print('STEP',group_label,i,repr(field),msg[:130],flush=True)
   if field=='droverProofId':
    task=page.locator('[data-episode-skill-task]').first
    assert task.count(),('missing Drover Skill Test button',field,msg)
    task.click()
    sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    assert sf.count(),('no Drover skill test form',field,page.locator('body').inner_text()[-450:])
    sf.locator('[name=rollA]').fill('31')
    sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    f=page.locator('#hmk-time-episode-form')
    continue
   if field=='orientationProofId':
    task=page.locator('[data-episode-skill-task]').first
    assert task.count(),('missing Skill Test button',field,msg)
    task.click()
    sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
    assert sf.count(),('no skill test form',field)
    sf.locator('[name=rollA]').fill('31')
    sf.locator('[type=submit]').click()
    page.locator('[data-episode-return]').first.click()
    f=page.locator('#hmk-time-episode-form')
    if f.locator('[data-episode-allocation-choice]').is_visible():
     assert not page.locator('[data-episode-window-stage]').is_enabled(), 'Unconfirmed stars cannot be staged'
     f.locator('[data-episode-allocation-set="auto"]').click()
     assert f.locator('[name=orientationAllocation]').is_disabled(), 'Allocation menu must not change later'
    continue
   if field in ('confirmed',):
    if not f.locator('[name=confirmed]').is_checked():f.locator('[name=confirmed]').check()
    continue
   if field.startswith('end_'):
    f.locator('[name="'+field+'"]').fill('5')
    f.locator('[data-episode-roll-confirm="'+field+'"]').click()
    continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)))
    f.locator('[data-episode-roll-confirm=progressD10]').click()
    continue
   if field in ('encounterD100','encounterD100Sub','directionD10','survivalD10','precipitationD6','temperatureD10','precipitationD10'):
    val={'encounterD100':'100','encounterD100Sub':'100','directionD10':'6','survivalD10':'10','precipitationD6':'6','temperatureD10':'5','precipitationD10':'10'}[field]
    f.locator('[name="'+field+'"]').fill(val)
    if f.locator('[data-episode-roll-confirm="'+field+'"]').count():f.locator('[data-episode-roll-confirm="'+field+'"]').click()
    continue
   raise AssertionError(('Unhandled actual UI prerequisite',group_label,field,msg,page.locator('[data-episode-checklist]').inner_text()[-700:]))
  else:raise AssertionError(('group not ready',group_label))
  print('STAGING',group_label,page.locator('[data-episode-checklist]').inner_text()[-250:],flush=True)
  page.locator('[data-episode-window-stage]').click()
  return page.evaluate('window.__auditAnimalForm93814()') if page.locator('#hmk-time-episode-form').is_visible() else {'no_form':True}

 one=finish_group('group1-with-animal')
 print('AFTER STAGE 1',one,'RESERVED',page.evaluate('window.__debugReserved93848()'),flush=True)
 # The first explicitly staged group owns Blesk during this overlapping interval.
 second=page.locator('#hmk-time-episode-form')
 assert second.count(), 'Second group was not opened'
 secondHorse=second.locator('[name=stableAnimalIds][value="'+reg['id']+'"]')
 assert secondHorse.count()==1,'The reserved animal must remain visible, but disabled'
 assert secondHorse.is_disabled(), 'An animal already used by an overlapping group must be unavailable'
 assert not secondHorse.is_checked(), 'Already-used animal must not be prechecked in the second group'
 secondHorse.evaluate('(e)=>e.dispatchEvent(new Event("change",{bubbles:true}))')
 assert not secondHorse.is_checked(), 'Change event cannot assign a disabled animal'
 print('RESERVATION_PASS', secondHorse.is_disabled(),secondHorse.is_checked(),flush=True)
 (root/'tools/evidence_93852').mkdir(exist_ok=True)
 second.locator('[data-episode-stable-roster]').screenshot(path=str(root/'tools/evidence_93852/ANIMAL_RESERVED_SECOND_GROUP.png'))
 two=finish_group('group2-independent')
 print('AFTER STAGE 2',two,flush=True)
 # Verify final single calendar confirmation; no release before both groups.
 page.locator('[data-episode-window-commit]').click()
 receipt=page.evaluate('window.__finalReceipt93814()')
 print('FINAL RECEIPT',receipt,'DIALOGS',dialogs,'ERRORS',errors,'TAIL',page.locator('body').inner_text()[-1600:],flush=True)
 assert receipt['minute']==receipt['stored']==525,receipt
 assert receipt['windows']==1 and len(receipt['episodes'])==2,receipt
 assert any(reg['id'] in e['stable'] for e in receipt['episodes']),receipt
 assert sorted(sorted(e['memberIds']) for e in receipt['episodes'])==[['a'],['c']],receipt
 assert all(e['from']==480 and e['to']==525 for e in receipt['episodes']),receipt
 assert page.evaluate('window.__vetStateDigest93815()')==medical_before,'Travel changed immutable animal Combat State without a medical procedure'
 assert not errors,errors
 page.screenshot(path=str(root/'tools/evidence_93852/TWO_GROUPS_COMPLETE.png'),full_page=True)
 print('PASS Chromium v93.852 TWO GROUPS: actual two travel groups, bought and selected animal, manual Survival Skill Tests, two journals, one final clock advance 480→525; no duplicate animal and no runtime errors.',flush=True)
 b.close()
