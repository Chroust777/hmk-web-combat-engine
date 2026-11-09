"""Chromium regression: live trek equipment, actual Stable transactions, group isolation."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__auditEquipmentState93812=()=>({
 clock:data.campaignClock.minute, stored:JSON.parse(storageBaseline).campaignClock.minute,
 animals:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(x=>({id:x.id,name:x.name,spec:x.spec.name})),
 stable:(data.journal||[]).filter(j=>j.stableHub574).map(j=>({type:j.stableHub574.type,itemId:j.stableHub574.itemId,animalId:j.stableHub574.animalId})),
 plan:sharedTimeWindowPlans.map(p=>({id:p.id,kind:p.kind,done:p.done,actorId:p.actorId,memberIds:p.memberIds})),
 queue:sharedTimeWindowQueue.length,evaluated:episodeEvaluationRequested,printed:document.querySelector('[data-episode-equipment-checklist-body]')?.innerText||'',
 inventory:data.inventory.filter(i=>i.sourceItemId?.startsWith('hmk:stable-gear:')).map(i=>({id:i.id,slot:i.slot,stable:i.stableAnimalId})),
 });
window.__injectEquipOwned93812=(animalId,gearName)=>{
 const gear=require('./src/rules/conveyance-printed-p122.js').VEHICLES_TACK_P122.find(g=>g.name===gearName);
 const animal=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).find(a=>a.id===animalId);
 const catalog=item('hmk:stable-gear:'+gear.id);
 if(!catalog||!animal)throw Error('No source item');
 const inv={id:uuid(),characterId:animal.ownerId,sourceItemId:'hmk:stable-gear:'+gear.id,snapshot:structuredClone(catalog),quantity:1,slot:'carried',currentWQ:null,condition:'',
 acquisition:{mode:'free',transactionId:uuid(),at:stamp(),pricePence:0,campaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute}};
 if(!mutate(()=>data.inventory.push(inv)))throw Error('Not persisted');return inv.id;
};
window.__simulateGearRoll93812=()=>{
 const form=document.querySelector('#hmk-time-episode-form');if(!episodeStageBaseline)episodeStageBaseline=structuredClone(data);
 const id='audit-gear-skill-'+uuid();data.journal.push({id,characterId:sharedPlanCurrent93771().actorId,calendarCampaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute,
 createdAt:stamp(),title:'Pracovní test',body:'Pracovní hod',calendarEpisodeSkillLink:{episodeEpoch:episodeDraftEpoch,campaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),minute:data.campaignClock.minute,field:'orientationProofId',skill:'Survival',actorId:sharedPlanCurrent93771().actorId,requestId:'audit-'+id},skillTestProof:{type:'secondary-mastery-value-test',a:{sv:7,level:'S'}}});
 episodePinnedSkillFields.set('orientationProofId',id);episodeEvaluationRequested=true;
 episodeEvaluatedIdentity=episodeIdentityOf(episodeFormSnapshot(form));persistEpisodeDraftSidecar();return id;
};
window.__gearRollStaged93812=(id)=>sharedUncommittedSkillRows93769().some(j=>j.id===id);
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1600,'height':1100});page.set_default_timeout(15000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();one=page.locator('[data-shared-plan-card]').first;one.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-shared-plan-add]').click();two=page.locator('[data-shared-plan-card]').nth(1);two.locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-row-run]').click();form=page.locator('#hmk-time-episode-form')
 assert form.count() and form.locator('[data-episode-equipment-checklist]').is_hidden()
 form.locator('[data-episode-open-stable-library]').click()
 acq=page.locator('[data-hmk-livestock-acquire]'); assert acq.count(),page.locator('body').inner_text()[-900:]
 acq.locator('[name=beastId]').select_option(acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value'))
 acq.locator('[name=beastName]').fill('Blesk');acq.locator('[name=ownerId]').select_option('a');acq.locator('button[value=free]').click()
 page.locator('[data-hmk-stable-go-travel]').click();form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 animals=page.evaluate('window.__auditEquipmentState93812()')['animals'];assert len(animals)==1,animals;id=animals[0]['id']
 form.locator('[name=conveyance]').select_option('cart')
 form.locator('[name=stableAnimalIds][value="'+id+'"]').check()
 form.locator('[name=transportTeamIds][value="'+id+'"]').check()
 assert not form.locator('[data-episode-equipment-checklist]').is_hidden()
 body=form.locator('[data-episode-equipment-checklist-body]')
 print('INITIAL CHECKLIST',body.inner_text()[:2000],flush=True)
 assert 'Harness, horse' in body.inner_text(),body.inner_text()
 assert 'Koupit a zařadit' in body.inner_text()
 assert 'Vybrat skutečné vozidlo' in body.inner_text()
 assert body.locator('[data-episode-equipment-action="gift"]').count()==1
 form.locator('[name=transportOtherLb]').fill('250')
 form.locator('[name=transportCoLocated]').check()
 # First acquisition while no roll has occurred: direct gift (no cash)
 body.locator('[data-episode-equipment-action="gift"]').first.click()
 state=page.evaluate('window.__auditEquipmentState93812()')
 assert len(state['stable'])==1 and state['stable'][0]['type']=='tack-add',(state,dialogs,errors)
 form=page.locator('#hmk-time-episode-form');body=form.locator('[data-episode-equipment-checklist-body]')
 assert 'Nasazeno ve Stáji' in body.inner_text(),body.inner_text()
 assert body.locator('[data-episode-equipment-action="gift"]').count()==0
 print('HARNESS ADDED',state['stable'],flush=True)
 # Started roll + purchase vehicle: reset local group, keep second group intact
 roll=page.evaluate('window.__simulateGearRoll93812()')
 body.locator('[data-episode-equipment-action="vehicle-gift"]').click()
 state=page.evaluate('window.__auditEquipmentState93812()')
 assert not page.evaluate('(id)=>window.__gearRollStaged93812(id)',roll),state
 assert state['stable'][-1]['type']=='vehicle-add',(state,dialogs,errors)
 assert not state['evaluated'] and state['stored']==state['clock']==480,(state,dialogs)
 assert state['plan'][1]['actorId']=='c' and state['queue']==0,state
 print('VEHICLE ADDED / ROLL RESET',state['stable'],state['plan'],flush=True)
 form=page.locator('#hmk-time-episode-form');assert form.locator('[name=transportVehicleKey] option').count()==2
 form.locator('[name=transportVehicleKey]').select_option(index=1)
 body=form.locator('[data-episode-equipment-checklist-body]')
 assert '✓' in body.inner_text(),body.inner_text()
 assert 'Vozidlo vybráno' in body.inner_text(),body.inner_text()
 # Real inventory tack transfer (the same item must not be paid twice).
 # Remove harness via a temporary reversible stable UI only if needed? Instead
 # test mounted mode: a fresh bridle in inventory is attached via checklist.
 inv=page.evaluate('(id)=>window.__injectEquipOwned93812(id,"Bit & bridle")',id)
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name=conveyance]').select_option('mount')
 body=form.locator('[data-episode-equipment-checklist-body]')
 assert 'Bit & bridle' in body.inner_text(),body.inner_text()
 assert body.locator('[data-episode-equipment-action="attach"]').count()==1,body.inner_text()
 body.locator('[data-episode-equipment-action="attach"]').click()
 state=page.evaluate('window.__auditEquipmentState93812()')
 assert any(i['id']==inv and i['slot']=='stable' for i in state['inventory']),state
 assert any(r['type']=='inventory-gear-attach' for r in state['stable']),state
 body=page.locator('[data-episode-equipment-checklist-body]')
 assert body.locator('[data-episode-equipment-action="attach"]').count()==0
 assert 'Blanket, horse' in body.inner_text() and 'Saddle, riding' in body.inner_text()
 assert not errors,errors
 print('PASS Chromium v93.812: two groups; cart horse; required draft harness; actual stable transaction; vehicle purchase after started roll; only current group reset; mounted inventory bridle attach without double payment; checklists react and time stays unchanged.',flush=True)
 browser.close()
