from pathlib import Path
import json,copy
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8');head='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(bundle[len(head):])
modules['app.js']+='''
window.__hmkTest472=(db)=>{
 const initial=require('./src/integration/persistent-combat-state.js').initialCombatState();
 for(const ch of db.characters){ch.hmk.combatState={...initial,...(ch.hmk.combatState||{}),morale:{...initial.morale,...(ch.hmk.combatState?.morale||{})}};}
 data=db;selected=db.characters[0].id;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=db.characters[0].id;provisionGuideRoute='have';storageReadOnly=false;
 const text=JSON.stringify(db);localStorage.setItem(STORAGE,text);storageBaseline=text;render();
};
'''
bundle=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(head)+end:]
fixture=json.loads((Path('/mnt/data/hmk_work_93470')/'test_generated_character_470.json').read_text());a=fixture['characters'][0];b=copy.deepcopy(a);b['id']='actor-2-472';b['name']='Borin';fixture['characters']=[a,b];id=a['id'];camp='c472';minute=480
fixture['campaignClock']={'format':'hmk-campaign-calendar-v1','campaignId':camp,'label':'Test','minute':minute,'characterIds':[id,b['id']],'anchors':[],'events':[{'id':'ev','type':'init','minute':minute,'reason':'GM confirmation'}]}
food={'id':'hmk:gear:hmk-p120-027','name':'Rations, standard','category':'other','properties':{'weightLb':3}}
water={'id':'hmk:gear:hmk-p121-043','name':'Jug, 1 gallon','category':'other','properties':{'weightLb':5}}
fixture['inventory']+=[{'id':'r472','characterId':id,'sourceItemId':food['id'],'snapshot':food,'quantity':3,'slot':'carried','condition':''},{'id':'w472','characterId':id,'sourceItemId':water['id'],'snapshot':water,'quantity':1,'slot':'carried','condition':''}]
fixture['journal']+=[
 {'id':'food-472','characterId':id,'calendarCampaignId':camp,'campaignMinute':minute,'createdAt':'now','title':'GM attested food','body':'GM confirmed stock','calendarInventoryRationStock':{'format':'hmk-physical-ration-stock-v1','campaignId':camp,'actorId':id,'itemId':'r472','sourceItemId':food['id'],'name':food['name'],'quantity':3,'unitWeightLb':3,'minute':minute,'expiresAt':minute+14400,'sourcePages':[120,186],'freshnessAttestedByGM':True}},
 {'id':'fill-472','characterId':id,'calendarCampaignId':camp,'campaignMinute':minute,'createdAt':'now','title':'GM attested water','body':'GM confirmed potable water','calendarInventoryWaterFill':{'format':'hmk-physical-water-fill-v1','campaignId':camp,'actorId':id,'itemId':'w472','minute':minute,'quantity':1,'unit':'waterDays','weightLb':10,'potableAndFilledConfirmedByGM':True,'waterSource':'Studna ve vesnici','sourcePages':[120,121,186]}}
]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1470,'height':950});errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const store=new Map();const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}""")
 for style in ['styles.css','book-templates.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle);page.evaluate('(db)=>window.__hmkTest472(db)',fixture)
 assert page.locator('.hc-provision-carry-summary').count()==1,(errs,page.locator('#app').inner_text()[:2000])
 assert '19 lb' in page.locator('.hc-provision-carry-summary').inner_text(),page.locator('.hc-provision-carry-summary').inner_text()
 assert page.locator('[data-provision-drop]').count()==2
 # no global group UI in personal mode
 assert page.locator('[data-foraging-batch-rations]').count()==0
 page.locator('.hc-provision-compact-extra').filter(has=page.locator('form[data-provision-drop]')).evaluate('(el)=>el.open=true')
 frm=page.locator('form[data-provision-drop]').filter(has=page.locator('input[value="food"]'))
 frm.locator('select[name=quantity]').select_option('0.5');frm.locator('input[name=reason]').fill('Odstaveno do zasoby tabora')
 frm.locator('input[name=confirmedByGM]').check();frm.locator('button[type=submit]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len([j for j in saved['journal'] if j.get('calendarInventoryRationLoss')])==1,(dialogs,errs)
 assert '17.5 lb' in page.locator('.hc-provision-carry-summary').inner_text()
 page.locator('.hc-provision-compact-extra').filter(has=page.locator('form[data-provision-drop]')).evaluate('(el)=>el.open=true')
 frm=page.locator('form[data-provision-drop]').filter(has=page.locator('input[value="water"]'))
 frm.locator('select[name=quantity]').select_option('0.5');frm.locator('input[name=reason]').fill('Odlozeno pro pozdejsi doplneni')
 frm.locator('input[name=confirmedByGM]').check();frm.locator('button[type=submit]').click()
 saved=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert len([j for j in saved['journal'] if j.get('calendarInventoryWaterLoss')])==1,(dialogs,errs)
 assert '12.5 lb' in page.locator('.hc-provision-carry-summary').inner_text(),page.locator('.hc-provision-carry-summary').inner_text()
 assert saved['campaignClock']['minute']==minute
 page.locator('[data-provision-scope="party"]').click()
 assert page.locator('.hc-provision-ledger').count()==1
 rows=page.locator('.hc-provision-table').first.locator('tbody tr');assert rows.count()==2
 assert '12.5 lb' in rows.first.inner_text()
 assert page.locator('form[data-foraging-batch-rations]').count()==1
 page.screenshot(path=str(root/'provisions_472_party.png'),full_page=True)
 page.locator('[data-provision-scope="person"]').click()
 page.screenshot(path=str(root/'provisions_472_person.png'),full_page=True)
 assert not errs,(errs,dialogs)
 print('PASS Chromium v93.472 personal food discard 0.5 => -1.5lb, water discard 0.5 => -5lb; party table rows; no clock change; no JS errors. dialogs:',dialogs)
 browser.close()
