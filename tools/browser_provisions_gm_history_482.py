from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();head='(()=>{const MOD=';m,i=json.JSONDecoder().raw_decode(raw[len(head):])
m['app.js']+='''\nwindow.__hmkUI482=(db)=>{data=db;selected=db.characters[0].id;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=db.characters[0].id;provisionGuideRoute='have';storageReadOnly=false;const s=JSON.stringify(db);localStorage.setItem(STORAGE,s);storageBaseline=s;render();};\n'''
bundle=head+json.dumps(m,ensure_ascii=False,separators=(',',':'))+raw[len(head)+i:]
attrs={key:12 for key in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()}
c={'id':'a482','name':'Arel','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[],'wealth':20,'coinsPence':200}}
db={'schemaVersion':1,'characters':[c],'items':[],'inventory':[],'trash':[],'journal':[], 'campaignClock':{'format':'hmk-campaign-calendar-v1','label':'482 test','campaignId':'c482','minute':0,'characterIds':['a482'],'trOrigin':{'anchorDay':1,'year':720,'month':5,'day':6},'anchors':[],'events':[{'id':'event482','type':'init','minute':0,'reason':'GM confirmation'}]},'combatRuntime':None}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=b.new_page(viewport={'width':1500,'height':900});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{for(const k of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,k,{configurable:true,value:{getItem:x=>m.get(x)??null,setItem:(x,y)=>m.set(x,String(y)),removeItem:x=>m.delete(x),key:i=>[...m.keys()][i]??null,get length(){return m.size}}});}}''')
 for x in ('styles.css','skill-workbench.css','library.css','book-templates.css'):page.add_style_tag(content=(root/x).read_text())
 page.add_script_tag(content=bundle);page.evaluate('(db)=>window.__hmkUI482(db)',db)
 assert page.locator('[data-provision-food-acquire][name]').count()==0
 assert page.locator('form[data-provision-food-acquire]').count()==1,'own supply should show open acquisition'
 assert page.locator('form[data-provision-food-acquire] .hc-provision-cash').count()==0,'free acquisition should not show currency'
 assert page.locator('[data-provision-vessel-acquire]').count()==1
 # Get half-gallon waterskin freely
 page.locator('.hc-provision-vessel-purchase').evaluate('(x)=>x.open=true')
 own=page.locator('[data-provision-vessel-acquire]')
 own.locator('[name="acquisition"]').select_option('other');assert own.locator('[data-provision-vessel-cash]').is_hidden();own.locator('[name="origin"]').fill('Dárek hospodského')
 own.locator('button[type="submit"]').click()
 d=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 print('VESSEL1',[(x['snapshot']['name'],x['slot']) for x in d['inventory']]);assert len(d['inventory'])==1,(dialogs,d['inventory'])
 # fill half gallon
 page.locator('[data-provision-water-quick] [name="waterSource"]').fill('Studna')
 page.locator('[data-provision-water-quick] button[type="submit"]').click()
 water=page.locator('[data-provision-drop]').filter(has=page.locator('[name="unit"][value="water"]'))
 assert water.count()==1,'half-gallon drop form'
 page.locator('.hc-provision-compact-extra').filter(has=water).evaluate('(x)=>x.open=true')
 values=water.locator('[name="quantity"] option').evaluate_all('(options)=>options.map(x=>x.value)')
 assert values==['0.5'],f'Half gallon water must NEVER offer 1: {values}'
 assert water.locator('[name="confirmedByGM"]').count()==0,'no redundant checkbox'
 # buy jug and show cash
 page.locator('[data-provision-route="buy"]').click()
 page.locator('.hc-provision-vessel-purchase').evaluate('(x)=>x.open=true')
 own=page.locator('[data-provision-vessel-acquire]');own.locator('[name="acquisition"]').select_option('buy');own.locator('[name="vesselId"]').select_option('hmk:gear:hmk-p121-043')
 assert own.locator('[data-provision-vessel-cash]').is_visible() and '200d' in own.inner_text()
 own.locator('button[type="submit"]').click()
 d=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"));assert len(d['inventory'])==2,(dialogs,d['inventory'])
 # provide water in jug and verify two amounts; choosing other should adjust options
 waterForm=page.locator('[data-provision-water-quick]');waterForm.locator('[name="waterSource"]').fill('Studna')
 waterForm.locator('button[type="submit"]').click()
 page.locator('[data-provision-route="have"]').click()
 water=page.locator('[data-provision-drop]').filter(has=page.locator('[name="unit"][value="water"]'))
 page.locator('.hc-provision-compact-extra').filter(has=water).evaluate('(x)=>x.open=true')
 src=water.locator('[data-provision-drop-source]');options=src.locator('option').all()
 assert len(options)==2,len(options)
 src.select_option(index=0);v1=water.locator('[name="quantity"] option').evaluate_all('(opts)=>opts.map(x=>x.value)');assert v1==['0.5'],v1
 src.select_option(index=1);v2=water.locator('[name="quantity"] option').evaluate_all('(opts)=>opts.map(x=>x.value)');assert v2==['0.5','1'],v2
 # GM history shows both sources and linked routing to original place
 page.locator('[data-nav="gmhistory"]').first.click()
 assert page.locator('.gm-history-table').count()>=1
 assert 'Arel' in page.locator('.gm-history-table').first.inner_text()
 print('HISTORY',page.locator('.gm-history-table tr').count())
 link=page.locator('[data-gm-history-procedure="provisions"]').first
 assert link.count()==1,'activity ledger deep link'
 link.click()
 assert page.locator('.hc-provision-guide').count()==1,'return to actor provisions'
 assert not errors,errors
 print('PASS v93.482 browser: half-gallon cap, dynamic water limits, remove GM checkbox, free vessel, paid vessel, cash, journal provenance, GM overview and direct links, no JS errors. dialogs=',dialogs)
 b.close()
