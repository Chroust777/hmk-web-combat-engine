from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();head='(()=>{const MOD=';m,i=json.JSONDecoder().raw_decode(raw[len(head):])
m['app.js']+='''\nwindow.__hmkUI480=(db)=>{data=db;selected=db.characters[0].id;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=db.characters[0].id;provisionGuideRoute='have';storageReadOnly=false;const s=JSON.stringify(db);localStorage.setItem(STORAGE,s);storageBaseline=s;render();};\nwindow.__hmkUI480Jug=()=>{const vessel=item('hmk:gear:hmk-p121-043');data.inventory.push({id:'jug480',currentWQ:null,characterId:'a480',sourceItemId:vessel.id,snapshot:structuredClone(vessel),quantity:1,condition:'',slot:'carried'});const raw=JSON.stringify(data);localStorage.setItem(STORAGE,raw);storageBaseline=raw;render();};\n'''
bundle=head+json.dumps(m,ensure_ascii=False,separators=(',',':'))+raw[len(head)+i:]
attrs={key:12 for key in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()}
c={'id':'a480','name':'Aron','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[],'wealth':20,'coinsPence':200}}
db={'schemaVersion':1,'characters':[c],'items':[],'inventory':[],'trash':[],'journal':[],'campaignClock':{'format':'hmk-campaign-calendar-v1','label':'480 test','campaignId':'c480','minute':0,'characterIds':['a480'],'trOrigin':{'anchorDay':1,'year':720,'month':5,'day':6},'anchors':[],'events':[{'id':'c480event','type':'init','minute':0,'reason':'GM confirmation'}]},'combatRuntime':None}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 p=b.new_page(viewport={'width':1550,'height':980});errors=[];dialogs=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 p.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 p.evaluate("""()=>{const store=new Map();const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}""")
 for x in ('styles.css','book-templates.css','skill-workbench.css'):p.add_style_tag(content=(root/x).read_text())
 p.add_script_tag(content=bundle)
 print('BROWSERERR',errors, p.evaluate("document.getElementById('app')?.innerText.slice(0,350)")); p.evaluate('(db)=>window.__hmkUI480(db)',db)
 assert p.locator('.hc-provision-guide').count()==1
 p.locator('[data-provision-route="other"]').click()
 assert p.locator('[data-provision-food-acquire]').count()==1
 p.locator('[data-provision-food-acquire] [name="days"]').select_option('2')
 p.locator('[data-provision-food-acquire] [name="origin"]').fill('GM našel balíky ve statku')
 p.locator('[data-provision-food-acquire] button[type=submit]').click()
 stored=json.loads(p.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 food=[x for x in stored['journal'] if x.get('calendarInventoryRationStock')]
 print('JOURNAL',len(food),'INVENTORY',len(stored['inventory']),'dialogs',dialogs[-3:])
 assert len(food)==1,(food,dialogs)
 assert food[0]['calendarInventoryRationStock']['quantity']==2
 assert stored['inventory'][-1]['quantity']==2
 assert p.locator('.hc-provision-card').inner_text().find('2 dávky')>=0
 p.locator('[data-provision-route="buy"]').click()
 assert p.locator('form[data-provision-food-acquire]').count()==1
 p.locator('[data-provision-food-acquire] [name=days]').select_option('3')
 p.locator('[data-provision-food-acquire] button[type=submit]').click()
 bought=json.loads(p.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len([j for j in bought['journal'] if j.get('calendarInventoryRationStock')])==2,(dialogs,bought['journal'][-2:])
 assert bought['inventory'][-1]['quantity']==3
 assert len(bought['characters'][0]['hmk'].get('campaignCashAccounts',{}))>=1,(dialogs,bought['characters'][0]['hmk'])
 # Prepare real catalogue vessel for a separate water fill test.
 p.evaluate("window.__hmkUI480Jug()")
 p.locator('[data-provision-water-quick]').first.locator('[name=waterSource]').fill('Studna v hostinci')
 p.locator('[data-provision-water-quick] button[type=submit]').click()
 hydrated=json.loads(p.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len([j for j in hydrated['journal'] if j.get('calendarInventoryWaterFill')])==1,(dialogs,hydrated['journal'][-1:])
 assert hydrated['campaignClock']['minute']==0
 p.locator('[data-provision-scope="party"]').click()
 assert p.locator('.hc-provision-ledger').count()==1
 assert p.locator('.hc-provision-table tbody tr').count()>=1
 assert p.locator('[data-foraging-batch-rations]').count()==1
 p.locator('[data-provision-scope="person"]').click()
 assert p.locator('[data-provision-food-acquire]').count()==1
 print('PASS actual purchase + GM received ration lots, filled water vessel, persistence; dialogs',dialogs)
 p.screenshot(path=str(root/'tools/visual_480_food.png'),full_page=True)
 p.locator('[data-nav="skills"]').click()
 assert p.locator('.journal-book--skills').count()==1,errors
 p.screenshot(path=str(root/'tools/visual_480_skills.png'),full_page=True)
 print('PASS skills book theme and navigation')
 print('PAGE ERRORS',errors)
 b.close()
