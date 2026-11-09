"""Chromium v93.810: refresh stable animals and vehicle without discarding planned parties."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__presentAnimalStable93810=()=>{const mod=require('./src/integration/hmk-livestock-562.js');const c=require('./src/integration/hmk-calendar-multi-campaign.js');const a=mod.verifiedLivestock(data,c.campaignKey(data.campaignClock))[0];const div=document.createElement('div');div.id='audit-93810-real-stable-form';div.innerHTML=stableHubAnimalHTML(a,c.campaignKey(data.campaignClock));document.body.appendChild(div)};
window.__refreshState93810=()=>({minute:data.campaignClock?.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,
 view,tab:libraryTab,active:sharedTimeWindowActivePlanId,
 plans:sharedTimeWindowPlans.map(p=>({actor:p.actorId,members:p.memberIds,kind:p.kind,done:p.done})),
 queue:sharedTimeWindowQueue.length,epoch:episodeDraftEpoch,stagedRows:sharedUncommittedSkillRows93769().map(r=>r.id),
 startRows:episodeGroupStartingReceiptIds93810,
 animals:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(x=>({id:x.id,name:x.name,ownerId:x.ownerId})),
 evaluated:episodeEvaluationRequested,pinned:episodePinnedSkillFields.size});
window.__simulateRoll93810=()=>{
 const form=document.querySelector('#hmk-time-episode-form');
 if(!form)throw Error('no episode form');
 if(!episodeStageBaseline)episodeStageBaseline=structuredClone(data);
 const id='audit-93810-roll-'+uuid();
 data.journal.push({id,characterId:sharedPlanCurrent93771().actorId,calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'Pracovní test',body:'Původní rozpracovaný výsledek',
  calendarEpisodeSkillLink:{episodeEpoch:episodeDraftEpoch,campaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),minute:data.campaignClock.minute,field:'orientationProofId',skill:'Survival',actorId:sharedPlanCurrent93771().actorId,requestId:'audit-'+id},
  skillTestProof:{type:'secondary-mastery-value-test',a:{sv:7,level:'S'}}});
 episodePinnedSkillFields.set('orientationProofId',id);episodeEvaluationRequested=true;
 episodeEvaluatedIdentity=episodeIdentityOf(episodeFormSnapshot(form));
 timeEpisodeDraft=episodeFormSnapshot(form);timeEpisodeDraft.orientationProofId=id;
 persistEpisodeDraftSidecar();return id;
};
'''
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1520,'height':1080});page.set_default_timeout(15000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d: (dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();first=page.locator('[data-shared-plan-card]').first
 first.locator('[data-shared-row-actor]').select_option('a')
 first=page.locator('[data-shared-plan-card]').first
 first.locator('.hc-episode-group-members summary').click();first.locator('[data-shared-plan-member][value="b"]').check()
 page.locator('[data-shared-plan-add]').click();second=page.locator('[data-shared-plan-card]').nth(1);second.locator('[data-shared-row-actor]').select_option('c')
 assert not page.evaluate('window.__refreshState93810()')['queue']
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.count() and form.locator('[data-episode-stable-refresh]').count() and form.locator('[name=stableAnimalIds]').count()==0
 assert form.locator('[name=memberIds][value=a]').is_checked() and form.locator('[name=memberIds][value=b]').is_checked()
 print('BEFORE ACQUISITION',page.evaluate('window.__refreshState93810()'),flush=True)
 form.locator('[data-episode-open-stable-library]').click()
 acq=page.locator('[data-hmk-livestock-acquire]');assert acq.count(),page.locator('body').inner_text()[-1800:]
 candidates=acq.locator('[name=beastId] option').all_text_contents();print('ANIMAL OPTIONS',candidates,flush=True)
 assert candidates
 acq.locator('[name=beastId]').select_option(acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value'));acq.locator('[name=beastName]').fill('Blesk');acq.locator('[name=ownerId]').select_option('a');acq.locator('button[name=acquisition][value=free]').click()
 state=page.evaluate('window.__refreshState93810()');print('ACQUIRED',state,flush=True)
 assert len(state['animals'])==1,(state,dialogs)
 page.locator('[data-hmk-stable-go-travel]').click()
 form=page.locator('#hmk-time-episode-form');assert form.count()
 form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.locator('[name=stableAnimalIds]').count()==1
 new_id=page.evaluate('window.__refreshState93810()')['animals'][0]['id']
 form.locator('[name=stableAnimalIds][value="'+new_id+'"]').check()
 assert form.locator('[name=memberIds][value=a]').is_checked() and form.locator('[name=memberIds][value=b]').is_checked()
 state=page.evaluate('window.__refreshState93810()');print('AFTER REFRESH',state,flush=True)
 assert state['stored']==480 and len(state['plans'])==2 and state['plans'][1]['members']==['c'] and state['queue']==0
 # Re-open stable and add vehicle using real stable UI (free / gift).
 form.locator('[data-episode-open-stable]').click()
 page.evaluate('window.__presentAnimalStable93810()')
 stable=page.locator('[data-hmk-stable-event][name]')
 vehicle=page.locator('#audit-93810-real-stable-form form[data-hmk-stable-event]').filter(has=page.locator('input[name=type][value=vehicle-add]'))
 print('STABLE VEHICLE FORMS',vehicle.count(),'ANY FORMS',page.locator('form[data-hmk-stable-event]').count(),'ERRS',errors, 'BODYPART',page.locator('body').inner_text()[-2200:],flush=True)
 assert vehicle.count()==1
 vehicle.locator('[name=itemId]').select_option(vehicle.locator('[name=itemId] option').filter(has_text='Cart, 2-wheel').first.get_attribute('value'))
 vehicle.locator('[name=mode]').select_option('gift');vehicle.locator('[name=reason]').fill('Získáno od obchodníka');vehicle.locator('button[type=submit]').click()
 assert not errors,errors
 page.locator('#audit-93810-real-stable-form [data-hmk-stable-go-travel]').first.click()
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 assert form.locator('[name=transportVehicleKey] option').count()>1
 assert form.locator('[name=stableAnimalIds][value="'+new_id+'"]').is_checked()
 assert page.evaluate('window.__refreshState93810()')['stored']==480
 print('VEHICLE UPDATED',form.locator('[name=transportVehicleKey] option').all_text_contents(),flush=True)
 # Roll belongs only to current group. Refresh must preserve the other group's plan
 # and drop this group's provisional roll after an explicit confirmation.
 roll_id=page.evaluate('window.__simulateRoll93810()')
 assert roll_id in page.evaluate('window.__refreshState93810()')['stagedRows']
 form.locator('[data-episode-stable-refresh]').click()
 state=page.evaluate('window.__refreshState93810()')
 print('AFTER ROLL RESET',state,flush=True)
 assert roll_id not in state['stagedRows']
 assert not state['evaluated'] and state['pinned']==0 and state['stored']==480
 assert state['plans'][1]['members']==['c'] and state['queue']==0
 assert page.locator('#hmk-time-episode-form [name=stableAnimalIds][value="'+new_id+'"]').is_checked()
 assert not errors,errors
 assert any('znovu vyhodnotit' in x for x in dialogs),dialogs
 state2=page.evaluate('window.__reloadRows93772()')
 assert state2['storedMinute']==480 and len(state2['plans'])==2,(state2,errors)
 assert page.locator('#hmk-time-episode-form [name=stableAnimalIds][value="'+new_id+'"]').is_checked(),state2
 print('SIDE-CAR RELOAD PASS',state2['plans'],flush=True)
 print('PASS Chromium v93.810 refresh: purchase + animal + vehicle + stable return + current-only roll reset + group isolation',flush=True)
 browser.close()
