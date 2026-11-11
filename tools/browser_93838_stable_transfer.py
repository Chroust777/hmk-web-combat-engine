"""v93.838: real Chromium clicks for two animals, purchased legacy tack, two-way transfers and carry weight.
Runs production bundle on an isolated campaign; no dice are manufactured.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8'); prefix='(()=>{const MOD='; mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
seed='''
window.__stableStart93838=()=>{const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};data.characters=[{id:'a',name:'Michal',kind:'PC',hmk:{attributes:attrs,weight:'150 lb',skills:[{id:'surv',name:'Survival',ml:65},{id:'rid',name:'Riding',ml:65}],healthState:H.initialCombatState()}}];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'stable-move-93838',label:'Audit',eventId:'init',gmConfirmed:true,characterIds:['a']});view='library';libraryTab='stable';selected='a';activeSheetSection='stable';storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__stableRehydrate93838=()=>{data=JSON.parse(storageBaseline);render();};
window.__showStable93838=()=>{require('./src/integration/hmk-character-creation.js').characterJournalReadiness=()=>({ready:true,missingSteps:[],issues:[],reason:''});view='sheet';selected='a';activeSheetSection='stable';render();};
window.__stableStatus93838=()=>{const L=require('./src/integration/hmk-livestock-562.js'),S=require('./src/integration/hmk-stable-hub-574.js'),cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);return {version:APP_VERSION,minute:data.campaignClock.minute,animals:L.verifiedLivestock(data,cid).map(a=>({id:a.id,name:a.name,b:S.stableBurden(data,cid,a).minimumLb,baseEnc:S.stableBurden(data,cid,a).baseENC,gear:S.stableBurden(data,cid,a).tack.map(g=>({entryId:g.entryId,inventoryId:g.inventoryId,itemId:g.itemId})),vehicles:S.stableBurden(data,cid,a).vehicles.map(g=>({entryId:g.entryId,inventoryId:g.inventoryId,itemId:g.itemId})),cargo:S.stableBurden(data,cid,a).cargoLb,capacity:S.stableBurden(data,cid,a).capacity,enc:S.stableBurden(data,cid,a).adjustedENC})),inventory:data.inventory.filter(i=>i.sourceItemId?.startsWith('hmk:stable-gear:')).map(i=>({id:i.id,owner:i.characterId,slot:i.slot,animal:i.stableAnimalId,weight:i.snapshot.properties.weightLb,quantity:i.quantity})),events:data.journal.filter(j=>j.stableHub574).map(j=>({type:j.stableHub574.type,animalId:j.stableHub574.animalId})),stored:JSON.parse(storageBaseline).inventory.filter(i=>i.sourceItemId?.startsWith('hmk:stable-gear:')).length,personGearEnc:require('./src/integration/combatant-load.js').resolveCombatantLoad({character:data.characters[0],inventory:activeRationInventory()}).gearENC};};
'''
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
checks=[]
def check(v,label):
 assert v,label
 checks.append(label)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);pg=browser.new_page(viewport={'width':1440,'height':1000});pg.set_default_timeout(12000)
 errors=[];dialogs=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 pg.set_content('<!doctype html><html><meta charset="utf-8"><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','hmk-global-ui-93741.css']:
  pg.add_style_tag(content=(root/css).read_text('utf8'))
 pg.add_script_tag(content=bundle);pg.evaluate('window.__stableStart93838()')
 def status():return pg.evaluate('window.__stableStatus93838()')
 try:
  check(status()['version']=='93.838','Correct current version')
  check(pg.locator('[data-hmk-livestock-acquire]').count()==1,'Stable acquisition form visible')
  a=pg.locator('[data-hmk-livestock-acquire]')
  def buybeast(name,breed):
   form=pg.locator('[data-hmk-livestock-acquire]');options=form.locator('[name=beastId] option')
   row=options.filter(has_text=breed).first;check(row.count()==1,'Catalog '+breed)
   form.locator('[name=beastId]').select_option(row.get_attribute('value'))
   form.locator('[name=beastName]').fill(name);form.locator('[name=ownerId]').select_option('a')
   form.locator('button[name=acquisition][value=free]').click()
   check(any(x['name']==name for x in status()['animals']),name+' exists')
  buybeast('Blesk','Bovine (Oxen)');buybeast('Vitr','Palfrey, riding horse');buybeast('Tulak','Palfrey, cart horse')
  pg.evaluate('window.__showStable93838()')
  def show(name):
   btn=pg.locator('[data-hmk-stable-pick-animal]').filter(has_text=name).first
   if btn.count() and btn.get_attribute('aria-pressed')!='true':btn.click()
  show('Blesk')
  check(pg.locator('.hmk-stable-equipment-ref').count()==1,'Source animal detail appears')
  guide=pg.locator('.hmk-stable-equipment-ref')
  check(guide.count()==1,'Species equipment table under anatomy')
  guide.locator('summary').click();check(guide.locator('tbody tr').count()==16,'All 16 printed species present')
  check('2 500' in guide.inner_text() and 'Saddle bags' in guide.inner_text(),'Capacity and gear table rendered')
  guideEvidence=root/'tools/evidence_93838';guideEvidence.mkdir(exist_ok=True)
  pg.screenshot(path=str(guideEvidence/'STABLE_16_SPECIES_GUIDE.png'),full_page=True)
  ev=pg.locator('form[data-hmk-stable-event]').filter(has=pg.locator('input[name=type][value="tack-add"]')).first
  gearoption=ev.locator('select[name=itemId] option').filter(has_text='Saddle bags, 15 lb').first
  ev.locator('select[name=itemId]').select_option(gearoption.get_attribute('value'))
  ev.locator('select[name=mode]').select_option('gift');ev.locator('input[name=reason]').fill('Vybavení potvrzené GM');ev.locator('button[type=submit]').click()
  state=status();check(len(state['animals'][0]['gear'])==1 and not state['inventory'],'Legacy direct purchase has one stable receipt, no duplicate inventory')
  ox=state['animals'][0]['id'];horse=state['animals'][1]['id']
  show('Blesk')
  moved=pg.locator('form.hmk-stable-move').first
  check(moved.count()==1,'Real gear move select and separate button')
  moved.locator('select[name=destination]').select_option(horse)
  pg.screenshot(path=str(guideEvidence/'TRANSFER_DESTINATION_DRAFT.png'),full_page=True)
  check(len(status()['events'])==1 and status()['animals'][0]['gear'],'Dropdown change made no save')
  moved.locator('button').click()
  state=status();print('After move to horse',state)
  check(len(state['inventory'])==1 and state['inventory'][0]['slot']=='stable' and state['inventory'][0]['animal']==horse,'Legacy purchase materialized once on horse')
  check(state['animals'][0]['b']==0 and state['animals'][1]['b']==3,'Animal loads recalculated: old 0 lb, new 3 lb')
  check(state['stored']==1,'New inventory physical item persisted to storage')
  check([x['type'] for x in state['events']]==['tack-add','legacy-gear-detach','inventory-gear-attach'],'Original purchase and custody chain preserved')
  ownedId=state['inventory'][0]['id']
  show('Vitr')
  pg.locator('form.hmk-stable-move').first.locator('button').click()
  state=status();print('After move to inventory',state)
  check(state['inventory']==[{'id':ownedId,'owner':'a','slot':'carried','animal':None,'weight':3,'quantity':1}],'Same item ID returned to actual owner inventory')
  check(state['animals'][1]['b']==0,'Target ENC load drops after recovery')
  check(state['stored']==1,'Unloaded item saved to storage')
  show('Blesk')
  attach=pg.locator('form[data-hmk-stable-event]').filter(has=pg.locator('input[name=type][value="inventory-gear-attach"]')).first
  check(attach.count()==1,'Recovered item offered for real re-attachment')
  attach.locator('select[name=inventoryId]').select_option(ownedId);attach.locator('button[type=submit]').click()
  state=status();print('After re-attach',state)
  check(len(state['inventory'])==1 and state['inventory'][0]['slot']=='stable' and state['inventory'][0]['animal']==ox,'Old piece reattached with same ID')
  check(state['animals'][0]['b']==3 and state['animals'][1]['b']==0,'Loads recalc on both animals after return')
  show('Blesk')
  cargo=pg.locator('form[data-hmk-stable-event]').filter(has=pg.locator('input[name=type][value="cargo-add"]')).first
  cargo.locator('input[name=name]').fill('Doložený náklad');cargo.locator('input[name=weightLb]').fill('10');cargo.locator('input[name=reason]').fill('Doložený náklad 10 lb');cargo.locator('button[type=submit]').click()
  state=status();check(state['animals'][0]['cargo']==10,'Cargo added into 15 lb bag capacity')
  show('Blesk')
  pg.locator('form.hmk-stable-move').first.locator('button').click()
  check(status()['animals'][0]['cargo']==10 and status()['inventory'][0]['slot']=='stable','Attempt to remove loaded saddlebags blocked')
  check(any('kapacitu' in d or 'kapacita' in d for d in dialogs),'User-facing no-capacity error displayed')
  # Weight threshold regression: 20 lb war saddle transferred from the horse
  # to the character changes both animal ENC and character Gear ENC.
  show('Vitr')
  ev=pg.locator('form[data-hmk-stable-event]').filter(has=pg.locator('input[name=type][value="tack-add"]')).first
  war=ev.locator('select[name=itemId] option').filter(has_text='Saddle, war').first
  check(war.count()==1,'War saddle exists in supported printed catalog')
  ev.locator('select[name=itemId]').select_option(war.get_attribute('value'))
  ev.locator('select[name=mode]').select_option('gift')
  ev.locator('input[name=reason]').fill('Doloženo GM: válečné sedlo pro Vitr')
  ev.locator('button[type=submit]').click()
  state=status()
  check(state['animals'][1]['b']==20 and state['animals'][1]['baseEnc']==5,'20 lb war saddle raises horse base ENC by 5')
  check(state['personGearEnc']==0,'Gear fitted to animal does not burden owner')
  show('Vitr')
  pg.locator('form.hmk-stable-move').first.locator('button').click()
  state=status()
  check(state['animals'][1]['b']==0 and state['animals'][1]['baseEnc']==0,'Removing 20 lb saddle drops horse base ENC by 5')
  check(state['personGearEnc']==5,'Same 20 lb saddle now causes owner Gear ENC 5')
  check(len(state['inventory'])==2 and state['stored']==2,'Two independently acquired pieces remain exactly two physical items')
  # Vehicles are assets, not back-carried gear: ox -> cart horse -> owner.
  show('Blesk')
  vehicle=pg.locator('form[data-hmk-stable-event]').filter(has=pg.locator('input[name=type][value="vehicle-add"]')).first
  check(vehicle.count()==1,'Original Stable vehicle purchasing UI accessible')
  cart=vehicle.locator('select[name=itemId] option').filter(has_text='Cart, 2-wheel').first
  vehicle.locator('select[name=itemId]').select_option(cart.get_attribute('value'))
  vehicle.locator('select[name=mode]').select_option('gift')
  vehicle.locator('input[name=reason]').fill('Doložená kára ze stáje')
  vehicle.locator('button[type=submit]').click()
  state=status()
  check(len(state['animals'][0]['vehicles'])==1,'Cart exists in ox Stable ownership ledger')
  old_burden=state['animals'][0]['b']
  cartHorse=state['animals'][2]['id']
  show('Blesk')
  moveVehicle=pg.locator('form.hmk-stable-move').filter(has=pg.locator('input[name=role][value="vehicle"]')).first
  check(moveVehicle.count()==1,'Cart has physical transfer destination control')
  moveVehicle.locator('select[name=destination]').select_option(cartHorse)
  check(len(status()['animals'][0]['vehicles'])==1,'Changing cart destination does not save')
  moveVehicle.locator('button').click()
  state=status()
  check(not state['animals'][0]['vehicles'] and len(state['animals'][2]['vehicles'])==1,'Cart transferred ox -> cart horse')
  check(state['animals'][0]['b']==old_burden and state['animals'][2]['b']==0,'Cart chassis is not an animal back load')
  cartId=next(i['id'] for i in state['inventory'] if i['weight']==200)
  show('Tulak')
  pg.locator('form.hmk-stable-move').first.locator('button').click()
  state=status()
  check(any(i['id']==cartId and i['slot']=='carried' for i in state['inventory']),'Same cart physically returned to owner inventory')
  check(state['stored']==3 and len(state['inventory'])==3,'Three physical items, no duplication, persisted')
  pg.evaluate('window.__stableRehydrate93838()')
  restored=status()
  check(len(restored['inventory'])==3 and restored['personGearEnc']==55,'Local saved state rehydration preserves custody and owner ENC')
  check(not errors,'No JavaScript page errors '+repr(errors))
  evidence=root/'tools/evidence_93838';evidence.mkdir(exist_ok=True)
  pg.screenshot(path=str(evidence/'STABLE_2_ANIMALS_CUSTODY.png'),full_page=True)
  (evidence/'BROWSER_STABLE_TRANSFERS.json').write_text(json.dumps({'status':'PASS','checks':checks,'count':len(checks),'dialogs':dialogs,'pageErrors':errors,'final':status()},ensure_ascii=False,indent=2),'utf8')
  print('PASS',len(checks),'Chromium stable transfers')
 except Exception as exc:
  evidence=root/'tools/evidence_93838';evidence.mkdir(exist_ok=True)
  pg.screenshot(path=str(evidence/'FAIL_STABLE_TRANSFER.png'),full_page=True)
  print('FAILED',str(exc),'STATUS',status(),'ERRORS',errors,'DIALOGS',dialogs,flush=True)
  raise
 finally: browser.close()
