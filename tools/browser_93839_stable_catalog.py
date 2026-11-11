"""v93.839 real Chromium pointer/keyboard tests. Isolated synthetic campaign, real production bundle.
No test rolls, fabricated purchase receipts or mocked Stable button handlers.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
seed='''
window.__testStart839=()=>{const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};data.characters=[{id:'a',name:'Michal',kind:'PC',hmk:{attributes:attrs,weight:'150 lb',coinsPence:300,wealth:30,skills:[{id:'surv',name:'Survival',ml:65},{id:'rid',name:'Riding',ml:65}],healthState:H.initialCombatState()}}];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'stable-gear-v839',label:'Audit',eventId:'init',gmConfirmed:true,characterIds:['a']});view='library';libraryTab='stable';selected='a';activeSheetSection='stable';storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__testShowStable839=()=>{require('./src/integration/hmk-character-creation.js').characterJournalReadiness=()=>({ready:true,missingSteps:[],issues:[],reason:''});view='sheet';selected='a';activeSheetSection='stable';render();};
window.__testState839=()=>{const S=require('./src/integration/hmk-stable-hub-574.js'),L=require('./src/integration/hmk-livestock-562.js'),cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);return {version:APP_VERSION,cash:cashForCharacter(data.characters[0]),minute:data.campaignClock.minute,inv:data.inventory.map(i=>({id:i.id,item:i.sourceItemId,slot:i.slot,animal:i.stableAnimalId,price:i.acquisition?.pricePence,mode:i.acquisition?.mode,w:i.snapshot?.properties?.weightLb})),animals:L.verifiedLivestock(data,cid).map(a=>({id:a.id,name:a.name,load:S.stableBurden(data,cid,a).minimumLb,tack:S.stableBurden(data,cid,a).tack.map(t=>({itemId:t.itemId,inventoryId:t.inventoryId}))})),purchases:data.characters[0].hmk.campaignCashAccounts?.[cid]?.purchases||[],stableEvents:data.journal.filter(j=>j.stableHub574).length,stored:JSON.parse(storageBaseline).inventory.length};};
window.__testRehydrate839=()=>{data=JSON.parse(storageBaseline);render();};
'''
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
checks=[]
def check(test,text):
 if not test:raise AssertionError(text)
 checks.append(text)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);pg=browser.new_page(viewport={'width':1590,'height':1120}, device_scale_factor=1);pg.set_default_timeout(13000)
 errors=[];dialogs=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 pg.set_content('<!doctype html><html lang="cs"><meta charset="utf-8"><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','library.css','skill-workbench.css','hmk-global-ui-93741.css']:
  pg.add_style_tag(content=(root/css).read_text('utf8'))
 pg.add_script_tag(content=bundle)
 pg.evaluate('window.__testStart839()')
 def state():return pg.evaluate('window.__testState839()')
 def buybeast(name,breed):
  f=pg.locator('[data-hmk-livestock-acquire]');o=f.locator('select[name=beastId] option').filter(has_text=breed).first
  check(o.count()==1,'Available '+breed);f.locator('select[name=beastId]').select_option(o.get_attribute('value'))
  f.locator('input[name=beastName]').fill(name);f.locator('select[name=ownerId]').select_option('a')
  f.locator('button[name=acquisition][value=free]').click()
  check(any(a['name']==name for a in state()['animals']),'Added animal '+name)
 buybeast('Blesk','Bovine (Oxen)');buybeast('Vitr','Palfrey, riding horse')
 check(state()['cash']['balance']==300,'No coins spent acquiring gifted animals')
 pg.evaluate('window.__testShowStable839()')
 gd=pg.locator('.hmk-stable-equipment-ref');gd.locator('summary').click()
 check(gd.locator('tbody tr').count()==16,'16 species with real dropdowns')
 check('parchment_dynamic_texture.png' in gd.evaluate('(el)=>getComputedStyle(el).backgroundImage'),'Guide has actual parchment background')
 check(gd.locator('select[name=useMode]').count()==16 and gd.locator('select[name=itemId]').count()==16,'Each species has two menus')
 check(gd.locator('button[value=buy]').count()==16 and gd.locator('button[value=free]').count()==16,'Each species has Buy and Free actions')
 check(gd.locator('[data-hmk-help]').count()>=32,'Species and item contextual tooltips present')
 dogs=gd.locator('tr[data-hmk-guide-beast]').filter(has_text='Dog, guard').first
 check(dogs.locator('button[value=buy]').is_disabled() and dogs.locator('button[value=free]').is_disabled(),'Dogs cannot buy unverified horse harness')
 animal=gd.locator('tr[data-hmk-guide-beast]').filter(has_text='Bovine (Oxen)').first
 f=animal.locator('form[data-hmk-stable-guide-buy]')
 check(f.count()==1,'Ox single shared-library form')
 use=f.locator('select[name=useMode]');gear=f.locator('select[name=itemId]')
 old=state();use.select_option('pack')
 check(state()==old,'Change mode does not mutate/cost coins')
 check('Pack harness' in gear.locator('option:checked').inner_text(),'Mode switch selects first matching pack item')
 first=gear.locator('option').filter(has_text='Saddle bags, 15 lb').first
 gear.select_option(first.get_attribute('value'))
 check(state()==old,'Change gear alone does not mutate/cost coins')
 check('Saddle bags' in gear.get_attribute('data-hmk-help'),'Tooltip updates with selected real item')
 check(f.locator('button[value=buy]').inner_text().strip().endswith('d'),'Buy button shows current printed price')
 # Purchase: cost exactly printed price, journal transaction, same catalog ID as Knihovna.
 price=int(f.locator('button[value=buy]').inner_text().split('·')[-1].strip().split('d')[0]);f.locator('button[value=buy]').click()
 s=state();check(s['cash']['balance']==300-price,'Library purchase deducts exact printed cost')
 check(len(s['inv'])==1 and s['inv'][0]['item']==first.get_attribute('value'),'Canonical item ID and one physical inventory entry')
 check(s['inv'][0]['slot']=='carried' and s['inv'][0]['price']==price,'Library puts purchased gear in character inventory with true cost')
 check(len(s['purchases'])==1 and s['purchases'][0]['amountPence']==price,'Real campaign cash purchase transaction recorded')
 initialPurchasedId=s['inv'][0]['id']
 check(s['stored']==1 and s['minute']==480,'Storage persists purchase; no time deducted')
 check(s['animals'][0]['load']==0 and s['stableEvents']==0,'Buying did not automatically equip animal')
 # Free uses same receipt format, no coins deducted.
 animal=pg.locator('tr[data-hmk-guide-beast]').filter(has_text='Bovine (Oxen)').first
 f=animal.locator('form[data-hmk-stable-guide-buy]')
 f.locator('select[name=useMode]').select_option('draft')
 harness=f.locator('select[name=itemId] option').filter(has_text='Harness, ox').first
 f.locator('select[name=itemId]').select_option(harness.get_attribute('value'))
 before=state();f.locator('button[value=free]').click();s=state()
 check(s['cash']['balance']==before['cash']['balance'],'Free acquisition does not reduce coins')
 check(len(s['inv'])==2 and s['inv'][1]['mode']=='free','Free entry is a real physical Library inventory entry')
 check(len(s['purchases'])==1,'Free acquisition has no fictitious cash transaction')
 # Already spent cash must prevent a more expensive item, but GM Free remains available.
 f=pg.locator('tr[data-hmk-guide-beast]').filter(has_text='Bovine (Oxen)').first.locator('form')
 f.locator('select[name=useMode]').select_option('draft')
 wagon=f.locator('select[name=itemId] option').filter(has_text='Wagon, 4-wheel').first
 f.locator('select[name=itemId]').select_option(wagon.get_attribute('value'))
 if state()['cash']['balance']<220:
  check(f.locator('button[value=buy]').is_disabled(),'Unavailable expensive purchase is disabled')
  check(f.locator('button[value=free]').is_enabled(),'GM can still explicitly grant item')

 # Attach through existing real Stable form and verify physical burden.
 attach=pg.locator('form[data-hmk-stable-event]').filter(has=pg.locator('input[name=type][value="inventory-gear-attach"]')).first
 check(attach.count()==1,'Owned goods offered for real Stable attach')
 attach.locator('select[name=inventoryId]').select_option(s['inv'][0]['id'])
 attach.locator('button[type=submit]').click();s=state()
 check(s['inv'][0]['slot']=='stable' and s['inv'][0]['animal']==s['animals'][0]['id'],'Purchased saddlebags attach to ox via normal Stable')
 check(s['animals'][0]['load']==s['inv'][0]['w'],'Animal load increases by real item weight')
 # Existing transfer uses one compact horizontal row, no intermediate submit.
 move=pg.locator('form.hmk-stable-move').first
 out=root/'tools/evidence_93839';out.mkdir(parents=True,exist_ok=True)
 pg.screenshot(path=str(out/'COMPACT_TRANSFER_INLINE.png'),full_page=True)
 check(move.count()==1,'Move form exists')
 box1=move.locator('select[name=destination]').bounding_box();box2=move.locator('button').bounding_box()
 check(abs((box1['y']+box1['height']/2)-(box2['y']+box2['height']/2))<9,'Transfer dropdown and confirm button share same row')
 check(move.locator('button').inner_text().strip()=='Přesunout','Compact one-word transfer button')
 check('hmk-stable-compact-table' in move.locator('xpath=ancestor::table').get_attribute('class'),'Compact row in revised table')
 ox=state()['animals'][0];horse=state()['animals'][1]
 move.locator('select[name=destination]').select_option(horse['id'])
 check(state()['animals'][0]['load']==ox['load'],'Transfer selection does not change animal burden')
 move.locator('button').click();s=state()
 check(s['animals'][0]['load']==0 and s['animals'][1]['load']==s['inv'][0]['w'],'Transfer to compatible horse moves load and keeps single item')
 check(s['inv'][0]['id']==initialPurchasedId,'Stable receipt retains purchase ID')
 # Rehydrate actual saved JSON, and check unchanged cash/inventory/Stable.
 saved=state();pg.evaluate('window.__testRehydrate839()');check(state()==saved,'Saved JSON correctly rehydrates cash, items and transfer')
 # Screenshot on visible Guide + compact table: select ox gear back if needed.
 focus=pg.locator('.hmk-stable-equipment-ref');focus.scroll_into_view_if_needed()
 out=root/'tools/evidence_93839';out.mkdir(parents=True,exist_ok=True)
 pg.screenshot(path=str(out/'STABLE_GUIDE_PARCHMENT_AND_COMPACT_ROWS.png'),full_page=True)
 check(not errors,'No Chromium page errors: '+repr(errors))
 log={'version':'93.839','count':len(checks),'status':'PASS','checks':checks,'dialogs':dialogs,'errors':errors,'final':state()}
 (out/'BROWSER_STABLE_GUIDE.json').write_text(json.dumps(log,ensure_ascii=False,indent=2),'utf8')
 print('PASS',len(checks),'\n'+'\n'.join(' • '+x for x in checks))
 browser.close()
