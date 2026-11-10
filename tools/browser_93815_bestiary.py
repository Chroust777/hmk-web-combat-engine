"""Chromium clicks with synthetic health fixtures: no module-only PASS is claimed for a complete combat to travel workflow."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__vetSetup93815=()=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const animals=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,cid);
 const horse=animals.find(x=>x.name==='Blesk');
 if(!horse)throw Error('Missing stable purchase');
 const prepared=require('./src/integration/hmk-stable-animal-health-registration-93759.js').prepareStableAnimalHealthRegistration93759({
  data,campaignId:cid,minute:data.campaignClock.minute,animalId:horse.id,gmConfirmed:true,
  examinedHealthy:true,examNote:'GM medical baseline checked in isolated UI fixture',proofId:uuid()});
 if(!mutate(()=>{data.characters.push(prepared.actor);data.campaignClock.characterIds.push(prepared.actor.id);
  data.journal.push({id:uuid(),characterId:horse.ownerId,calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'Veterinary fixture',body:'Health registration',animalHealthRegistration93759:prepared.proof});}))throw Error('fixture registration failed');
 return horse.id;
};
window.__modifyHealth93815=(mode)=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const horse=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,cid).find(x=>x.name==='Blesk');
 if(!horse)throw Error('horse missing');
 if(!mutate(()=>{const a=data.characters.find(x=>x.id===horse.id);if(!a)throw Error('actor missing');
  a.hmk.healthState.fatigue.weariness=mode==='tired'?40:0;
  if(mode==='inactive')data.campaignClock.characterIds=data.campaignClock.characterIds.filter(x=>x!==horse.id);
  else if(!data.campaignClock.characterIds.includes(horse.id))data.campaignClock.characterIds.push(horse.id);
 }))throw Error('fixture change invalid');
 return {minute:data.campaignClock.minute,actor:horse.id,mode};
};
window.__bestiaryFixture93815=()=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const horse=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,cid).find(x=>x.name==='Blesk');
 if(!horse)throw Error('horse missing');
 const visit='enc-93815-trauma';
 {
   data.journal.push({id:uuid(),calendarCampaignId:cid,campaignMinute:100,
      bestiaryEncounter:{action:'create',id:visit,campaignId:cid,ownerAnimalId:horse.id,ownerId:horse.ownerId}});
   data.journal.push({id:uuid(),calendarCampaignId:cid,campaignMinute:100,
      bestiaryTrauma:{format:'hmk-bestiary-trauma-567-v1',kind:'hit',campaignId:cid,targetId:visit,minute:100,
      shock:{incoming:'none'},woundId:'w93815',location:{id:'lf',name:'Left Foreleg'},aspect:'b',injury:{level:3},bleeding:false}});
 }
 render();
 return horse.id;
};
window.__state93815=()=>{const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const horse=require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,cid).find(x=>x.name==='Blesk');
 const actor=data.characters.find(x=>x.id===horse.id);
 return {id:horse.id,minute:data.campaignClock.minute,health:structuredClone(actor.hmk.healthState),
  journal:data.journal.filter(x=>x.calendarTimeEpisode).length};
};
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(20000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click()
 page.locator('[data-shared-plan-card]').first.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[data-episode-open-stable-library]').click()
 acq=page.locator('[data-hmk-livestock-acquire]')
 acq.locator('[name=beastId]').select_option(acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value'))
 acq.locator('[name=beastName]').fill('Blesk')
 acq.locator('[name=ownerId]').select_option('a')
 acq.locator('button[value=free]').click()
 horse=page.evaluate('window.__vetSetup93815()')
 page.locator('[data-hmk-stable-go-travel]').click()
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 selector=form.locator('[name="stableAnimalIds"][value="'+horse+'"]')
 assert selector.count()==1 and not form.locator('[name="animalIds"][value="'+horse+'"]').count()
 # Invalid real medical condition prepared as a fixture; the next step is an actual user click.
 page.evaluate('window.__modifyHealth93815("tired")')
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 assert 'NEMŮŽE SE SAMO PŘESOUVAT' in form.locator('[data-episode-stable-animal="'+horse+'"] .hc-episode-animal-health').inner_text()
 form.locator('[name="stableAnimalIds"][value="'+horse+'"]').check()
 form.locator('[data-episode-evaluate]').click()
 checklist=page.locator('[data-episode-checklist]').inner_text()
 err=form.get_attribute('data-episode-problem') or ''
 assert ('Fatigue' in err or 'Fatigue' in checklist),(err,checklist[-700:])
 after=page.evaluate('window.__state93815()');assert after['minute']==480 and after['health']['fatigue']['weariness']==40 and after['journal']==0,after
 print('PASS Chromium click: Fatigue 40 blocked Travel before skill test, no calendar/Combat mutation',flush=True)
 page.evaluate('window.__modifyHealth93815("inactive")')
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 assert 'CHYBNÝ ZDRAVOTNÍ STAV' in form.locator('[data-episode-stable-animal="'+horse+'"] .hc-episode-animal-health').inner_text()
 form.locator('[name="stableAnimalIds"][value="'+horse+'"]').check()
 form.locator('[data-episode-evaluate]').click()
 err=form.get_attribute('data-episode-problem') or ''
 assert 'zdravotní profil není aktivní' in err,err
 after=page.evaluate('window.__state93815()');assert after['minute']==480 and after['journal']==0,after
 print('PASS Chromium click: inactive health link flagged, unsafe movement rejected, no side effect',flush=True)
 page.evaluate('window.__modifyHealth93815("healthy")')
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 assert 'Zdravotní stav bez omezení pohybu' in form.locator('[data-episode-stable-animal="'+horse+'"] .hc-episode-animal-health').inner_text()
 form.locator('[name="stableAnimalIds"][value="'+horse+'"]').check()
 form.locator('[data-episode-evaluate]').click()
 err=form.get_attribute('data-episode-problem') or ''
 assert 'zdravotní profil není aktivní' not in err and 'Fatigue ≥ 40' not in err,(err,page.locator('[data-episode-checklist]').inner_text()[-500:])
 assert page.evaluate('window.__state93815()')['journal']==0
 assert not errors,errors
 print('PASS Chromium click: correct link accepted for evaluation; combat state unchanged; downstream dice intentionally not fabricated',flush=True)
 # Another real GUI click: same physically owned animal's Bestiary trauma cannot be hidden by healthy Combat State.
 horse=page.evaluate('window.__bestiaryFixture93815()')
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name="stableAnimalIds"][value="'+horse+'"]').check()
 form.locator('[data-episode-evaluate]').click()
 err=form.get_attribute('data-episode-problem') or ''
 assert 'Bestiář eviduje aktivní zdravotní následek' in err,err
 after=page.evaluate('window.__state93815()')
 assert after['minute']==480 and after['journal']==0 and after['health']['fatigue']['weariness']==0,after
 assert not errors,errors
 page.screenshot(path=str(root/'docs/AUDIT_v93.815_Bestiary_block.png'),full_page=True)
 print('PASS Chromium click: active Bestiary wound of exact stable ID blocks Pochod, but Combat State and calendar unchanged',flush=True)
 b.close()
