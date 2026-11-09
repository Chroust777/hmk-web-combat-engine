"""Regression on restored v93.809 group, and owned vehicle in character inventory."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
source=(root/'tools/browser_93810_stable_refresh.py').read_text('utf8')
baseSeed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+=\'\'\'",1)[1].split("\'\'\'\nbundle=",1)[0]
seed=baseSeed+source.split("\nseed+='''\n",1)[1].split("\n'''\nmods['app.js']+=seed",1)[0]
seed+='''
window.__beginWithoutRoll93811=()=>{episodeEvaluationRequested=true;timeEpisodeDraft=episodeFormSnapshot(document.querySelector('#hmk-time-episode-form'));persistEpisodeDraftSidecar();};
window.__testLegacy93811=()=>{const key=EPISODE_SIDECAR_KEY,side=JSON.parse(localStorage.getItem(key));
 delete side.groupStartingReceiptIds93810;localStorage.setItem(key,JSON.stringify(side));
 return {rows:side.rows.length,epoch:side.epoch,stored:side.groupStartingReceiptIds93810};};
window.__injectCart93811=()=>{
 const itemId='hmk-p122-tack-03';const g=require('./src/rules/conveyance-printed-p122.js').VEHICLES_TACK_P122.find(g=>g.id===itemId);
 if(!g)throw Error('missing catalog');
 const id='test-cart-'+uuid();const catalog=item('hmk:stable-gear:'+g.id);if(!catalog)throw Error('missing library gear');
 const itm={id,characterId:'a',sourceItemId:'hmk:stable-gear:'+g.id,
 snapshot:structuredClone(catalog),
 quantity:1,slot:'carried',currentWQ:null,condition:'',acquisition:{mode:'free',transactionId:uuid(),at:stamp(),pricePence:0,campaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),campaignMinute:data.campaignClock.minute}};
 if(!mutate(()=>data.inventory.push(itm)))throw Error('inventory not committed');
 return id;
};
window.__stateLegacy93811=()=>({inInventory:data.inventory.filter(i=>i.sourceItemId?.startsWith('hmk:stable-gear')).map(i=>({id:i.id,slot:i.slot,stable:i.stableAnimalId})),
 vehicles:require('./src/integration/hmk-travel-vehicle-93756.js').availableTransportVehicles93756(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)),
 epoch:episodeDraftEpoch,starter:episodeGroupStartingReceiptIds93810, staged:sharedUncommittedSkillRows93769().map(j=>({id:j.id,link:j.calendarEpisodeSkillLink})),
 evaluation:episodeEvaluationRequested,minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute});
'''
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1540,'height':1100});page.set_default_timeout(15000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists(): page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 print('BOOT', page.evaluate('typeof window.__seedRows93772'), errors);page.evaluate('window.__seedRows93772()')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();first=page.locator('[data-shared-plan-card]').first;first.locator('[data-shared-row-actor]').select_option('a')
 page.locator('[data-shared-plan-add]').click();second=page.locator('[data-shared-plan-card]').nth(1);second.locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-row-run]').click();form=page.locator('#hmk-time-episode-form')
 assert form.count()
 # Legacy draft with Evaluation initiated, but without any staged receipts.
 page.evaluate('window.__beginWithoutRoll93811()')
 print('PRE LEGACY',page.evaluate('window.__testLegacy93811()'))
 page.evaluate('window.__reloadRows93772()')
 assert page.evaluate('window.__stateLegacy93811()')['starter'] is None
 page.locator('[data-episode-stable-refresh]').click()
 state=page.evaluate('window.__stateLegacy93811()');print('LEGACY EMPTY RESET',state)
 assert state['starter']==[] and not state['evaluation'],(state,dialogs)
 assert not any('Starší rozpracované hody' in d for d in dialogs),dialogs
 # obtain stable animal via real app UI
 page.locator('[data-episode-open-stable-library]').click();acq=page.locator('[data-hmk-livestock-acquire]')
 acq.locator('[name=beastId]').select_option(acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value'))
 acq.locator('[name=beastName]').fill('Blesk');acq.locator('[name=ownerId]').select_option('a');acq.locator('button[value=free]').click()
 page.locator('[data-hmk-stable-go-travel]').click();form=page.locator('#hmk-time-episode-form')
 form.locator('[data-episode-stable-refresh]').click()
 # A real library-equivalent item (valid snapshot) already owned in personal inventory.
 try:
  id=page.evaluate('window.__injectCart93811()')
 except Exception as ex:
  print('INJECT FAILED',repr(ex),errors,dialogs)
  raise
 form=page.locator('#hmk-time-episode-form')
 print('UI inventory handoff',form.locator('[data-episode-attach-vehicle-choice] option').all_text_contents())
 assert form.locator('[data-episode-attach-inventory-vehicle]').count()==1
 form.locator('[data-episode-attach-inventory-vehicle]').click()
 state=page.evaluate('window.__stateLegacy93811()');print('ASSIGNED VEHICLE',state, 'dialogs',dialogs[-3:])
 assert state['inInventory'][0]['slot']=='stable',state
 assert len(state['vehicles'])==1,state
 # old resumed saved legacy with a linked roll
 page.evaluate('window.__simulateRoll93810()')
 page.evaluate('window.__testLegacy93811()')
 page.evaluate('window.__reloadRows93772()')
 before=page.evaluate('window.__stateLegacy93811()');print('LEGACY LINKED',before)
 assert before['starter'] is None and len(before['staged'])==1,before
 page.locator('[data-episode-stable-refresh]').click()
 after=page.evaluate('window.__stateLegacy93811()');print('LINKED RESET',after)
 assert not after['staged'] and after['starter']==[] and not after['evaluation'],(after,dialogs)
 assert not errors,errors
 print('PASS Chromium v93.811: legacy restored empty/linked group, owned inventory vehicle assignment, no travel time movement')
 b.close()
