"""Headless Chromium: shared Journal/Calendar provision executor; GM history details.
Only in-memory localStorage; no cloud credentials, GitHub actions or real campaign data.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);modules['app.js']+='''
window.__seed485=()=>{
 const c=data.characters[0],clock={format:'hmk-campaign-calendar-v1',campaignId:'browser-485',label:'Testovací kampaň',minute:480,characterIds:[c.id],anchors:[],events:[{id:'init485',type:'init',minute:480,reason:'Test'}]};
 data.campaignClock=clock;data.inventory=[];data.journal=[];
 data.journal.push({id:'note485',characterId:c.id,calendarCampaignId:'browser-485',campaignMinute:480,createdAt:'2026-10-25T19:00:00Z',title:'Testovací osobní zápis',body:'Podrobnosti testovacího zápisu s velmi dlouhým textem: '+('01234567890 blah '+('z'*0)).repeat(100)});
 data.journal.push({id:'fall485',characterId:c.id,calendarCampaignId:'browser-485',campaignMinute:480,createdAt:'2026-10-25T19:00:01Z',title:'Test Climbing CF',body:'Původní Climbing test bez potvrzeného pádu',skillTestProof:{type:'critical-followup',actorId:c.id,skill:'Climbing',activity:'climb-easy',technique:'Acrobatics',result:{level:'CF'}}});
 selected=c.id;view='sheet';activeSheetSection='provisions';provisionGuideRoute='have';provisionScope='person';provisionGuideActorId=c.id;storageReadOnly=false;
 const encoded=JSON.stringify(data);localStorage.setItem(STORAGE,encoded);storageBaseline=encoded;render();
};
window.__summary485=()=>({clock:data.campaignClock,inventory:structuredClone(data.inventory),journal:structuredClone(data.journal),actorId:data.characters[0].id,selected,view,section:activeSheetSection});
window.__calendar485=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=data.characters[0].id;render()};
window.__journal485=()=>{view='sheet';activeSheetSection='provisions';selected=data.characters[0].id;render()};
window.__inventory485=()=>{view='sheet';activeSheetSection='inventory';selected=data.characters[0].id;render()};
window.__overview485=()=>{view='calendar';calendarLanding=false;activeCalendarSection='overview';calendarUI=null;render()};
window.__second485=()=>{const c=structuredClone(data.characters[0]);c.id='test-485-person-2';c.name='TEST DRUHÁ POSTAVA';data.characters.push(c);data.campaignClock.characterIds.push(c.id);selected=c.id;view='sheet';activeSheetSection='provisions';provisionGuideRoute='have';const j=JSON.stringify(data);localStorage.setItem(STORAGE,j);storageBaseline=j;render();return c.id};
window.__history485=()=>{view='gmhistory';render()};
window.__calendarNull488=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=null;render()};
window.__skills488=()=>{view='skills';selected=data.characters[0].id;render()};
window.__library488=()=>{view='library';libraryTab='melee';render()};
window.__removeBlocked488=()=>{data.journal=data.journal.filter(x=>x.id!=='fall485');const j=JSON.stringify(data);localStorage.setItem(STORAGE,j);storageBaseline=j;render()};

window.__rehydrate485=()=>{data=JSON.parse(localStorage.getItem(STORAGE));view='sheet';selected=data.characters[0].id;activeSheetSection='provisions';render()};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1660,'height':1100});errors=[];dialogs=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ('styles.css','skill-workbench.css','book-templates.css','library.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.locator('[data-action="auto-random-character"]').click()
 page.locator('#hmk-random-name-form [name="name"]').fill('TEST HMK 485')
 page.locator('#hmk-random-name-form button[type=submit]').click()
 start=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-start<45:page.wait_for_timeout(150)
 assert not page.locator('.hmk-auto-generation-overlay').count(),dialogs
 page.wait_for_function("()=>{try{return JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1'))?.characters?.length>0}catch{return false}}",timeout=25000)
 page.evaluate('window.__seed485()')
 assert page.locator('form[data-provision-vessel-acquire]').count()==1
 page.locator('.hc-provision-vessel-purchase summary').click()
 page.locator('form[data-provision-vessel-acquire] button[type=submit]').click()
 assert len(page.evaluate('window.__summary485().inventory'))==1,(dialogs,errors)
 # Reproduce the exact bug: calendar opens before any selection is changed.
 page.evaluate('window.__calendarNull488()')
 f=page.locator('form[data-provision-water-quick]')
 assert f.count()==1,'Calendar must show empty bottle of visible first actor'
 assert f.locator('[name="actorId"]').input_value()==page.evaluate('window.__summary485().actorId')
 f.locator('[name=waterSource]').fill('Zkouška plnění v kalendáři')
 f.locator('button[type=submit]').click()
 proof=page.evaluate('window.__summary485()')
 assert len([j for j in proof['journal'] if j.get('calendarInventoryWaterFill')])==1,('Calendar failed fill',dialogs,proof)
 assert not any('Nesprávná postava' in x for x in dialogs),dialogs
 # An actual GM quick-advance creates one durable clock event, and the GM
 # history reads it directly without writing an extra character journal row.
 page.evaluate('window.__removeBlocked488()')
 page.evaluate('window.__overview485()')
 form=page.locator('#campaign-quick-advance-form')
 assert form.count()==1,'Clock control is absent'
 assert form.locator('button[type=submit]').inner_text().strip()=='Nastavit čas ›'
 form.locator('[name=reason]').fill('Test plynutí času v kalendáři')
 form.locator('[name=gmConfirmed]').check()
 before=page.evaluate('window.__summary485()')
 form.locator('button[type=submit]').click()
 after=page.evaluate('window.__summary485()')
 assert after['clock']['minute']==before['clock']['minute']+1,('Clock did not move',dialogs,errors)
 assert sum(x['type']=='advance' for x in after['clock']['events'])==1,after['clock']['events']
 assert len(after['journal'])==len(before['journal']),'Clock history should not duplicate journal receipts'
 page.evaluate('window.__history485()')
 gm=page.locator('.gm-history-table tr').filter(has_text='GM · Nastavení času kampaně')
 assert gm.count()==1,('GM clock history missing',page.locator('.gm-history-table').inner_text())
 gm.locator('summary').click()
 details=gm.inner_text()
 assert '08:00' in details and '08:01' in details and 'Test plynutí času v kalendáři' in details,details
 # Same manuscript background and readable text on all three help tabs.
 page.evaluate('window.__skills488()')
 for value in ('secondary','value','assistance'):
  page.locator('[data-skill-tab="'+value+'"]').click()
  helpbox=page.locator('.hsk-skill-rule-explainer')
  panel=helpbox.locator('[data-skill-rule="'+value+'"]')
  assert panel.is_visible(),(value,helpbox.inner_text())
  cs=helpbox.evaluate('el=>({bg:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily,fg:getComputedStyle(el).color})')
  assert 'Georgia' in cs['font'],cs
  assert cs['bg']!='rgb(38, 51, 41)',cs
  assert len(panel.inner_text())>330,(value,panel.inner_text())
 page.screenshot(path='/mnt/data/hmk_work/skill_488.png',full_page=True)
 chips=page.locator('.hsk-eml-chip')
 assert chips.count()>1
 assert page.locator('.hsk-eml-chip small').nth(2).inner_text().startswith('Secondary 2'),page.locator('.hsk-eml-trace').inner_text()
 assert int(chips.first.evaluate('el=>parseFloat(getComputedStyle(el).borderTopLeftRadius)'))>=7,'Rounded corners lost'
 page.evaluate('window.__library488()')
 entry=page.locator('.folio-catalog-entry').first
 assert entry.count()==1,'Library catalog did not render'
 assert len(entry.locator('.folio-catalog-field').all())==5
 cols=entry.locator('.folio-catalog-stats').evaluate('el=>getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length')
 assert cols==5,('Library item stats must share one compact row',cols)
 page.screenshot(path='/mnt/data/hmk_work/library_488.png',full_page=True)
 assert not errors,errors
 print('PASS Chromium v93.488: water calendar actor fallback, timestamp history, quick-advance rename, all 3 manuscript explanations, rounded EML, 5-column catalog, '+str(len(dialogs))+' dialogs')
 browser.close()
