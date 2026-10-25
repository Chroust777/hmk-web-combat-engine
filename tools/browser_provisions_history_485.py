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
 assert page.locator('.hc-provision-guide').count()==1,('Journal not interactive',errors,page.locator('#app').inner_text()[-1700:])
 for label in ('Vlastní zásoby','Nákup','Příroda / Foraging','Jiný zdroj'):
  assert label in page.locator('.hc-provision-choices').inner_text(),label
 assert page.locator('form[data-provision-vessel-acquire]').count()==1,'own supplies form absent'
 before=page.evaluate('window.__summary485()')
 page.locator('.hc-provision-vessel-purchase summary').click()
 page.locator('form[data-provision-vessel-acquire] button[type=submit]').click()
 after=page.evaluate('window.__summary485()')
 assert len(after['inventory'])==1,(dialogs,after)
 assert after['inventory'][0]['acquisition']['mode']=='free','Own supplies must be free'
 assert after['inventory'][0]['waterContentsLb'] if 'waterContentsLb' in after['inventory'][0] else True
 assert len(after['journal'])==len(before['journal'])+1,'Only one original acquisition receipt'
 assert page.locator('form[data-provision-water-quick]').count()==1,'After vessel acquisition the shared form must offer a fill'
 page.locator('form[data-provision-water-quick] [name=waterSource]').fill('Studna v testovací vesnici')
 page.locator('form[data-provision-water-quick] button[type=submit]').click()
 filled=page.evaluate('window.__summary485()')
 assert len([x for x in filled['journal'] if x.get('calendarInventoryWaterFill')])==1,(dialogs,filled)
 assert page.locator('.hc-provision-indicators').count()==1
 page.evaluate('window.__inventory485()')
 watertext=page.locator('.folio-water-ledger').inner_text()
 assert '2.0 + 5.0 = 7.0 lb' in watertext,('Total container + liquid',watertext)
 assert 'Efektivní výbava pro Gear ENC' in page.locator('#app').inner_text(), 'Gear ENC physical explanation absent'
 page.evaluate('window.__calendar485()')
 assert page.locator('.hc-provision-guide').count()==1,'Calendar form lost'
 assert 'Studna v testovací vesnici' in json.dumps(page.evaluate('window.__summary485()'),ensure_ascii=False),'Water proof not visible in persisted data'
 page.locator('[data-provision-route="buy"]').click()
 assert 'Zakoupit nádobu na pitnou vodu' in page.locator('.hc-provision-vessel-purchase summary').inner_text()
 assert 'Hotovost:' in page.locator('.hc-provision-vessel-purchase summary').inner_text()
 page.evaluate('window.__journal485()')
 assert page.locator('form[data-provision-vessel-acquire]').count()==1,'Journal must follow same route/form'
 assert 'Zakoupit nádobu na pitnou vodu' in page.locator('.hc-provision-vessel-purchase summary').inner_text()
 page.evaluate('window.__rehydrate485()')
 assert len(page.evaluate('window.__summary485().inventory'))==1,'Campaign restore lost water container'
 second=page.evaluate('window.__second485()')
 assert page.locator('.hc-provision-guide h3').inner_text().endswith('TEST DRUHÁ POSTAVA')
 assert page.locator('.hc-provision-guide .hc-provision-choices').count()==1
 page.locator('.hc-provision-vessel-purchase summary').click()
 page.locator('form[data-provision-vessel-acquire] button[type=submit]').click()
 owners=[x['characterId'] for x in page.evaluate('window.__summary485().inventory')]
 assert len(owners)==2 and len(set(owners))==2 and second in owners,('Per-actor isolation',owners,second)
 page.evaluate('window.__calendar485()')
 assert page.locator('[data-provision-actor] option').count()==2,'Calendar must let GM switch both actors'
 page.evaluate('window.__overview485()')
 notices=page.locator('.hc-entry--rule-detail .hc-event-description')
 assert notices.count()>=1,'No actionable Climbing CF notification in weekly calendar'
 assert 'Climbing' in notices.first.inner_text() and 'Falling Routine' in notices.first.inner_text(),notices.first.inner_text()
 assert notices.first.evaluate('el=>getComputedStyle(el).whiteSpace')=='normal','CF notice visually clipped'
 assert notices.first.evaluate('el=>getComputedStyle(el).textOverflow')!='ellipsis','CF details truncated'
 assert 'Splatné události ·' not in page.locator('main').inner_text() if page.locator('main').count() else 'Splatné události ·' not in page.locator('#app').inner_text(), 'Duplicate due overview still shown'
 page.evaluate('window.__history485()')
 assert page.locator('.gm-history-table').count()>=1
 first_actions=page.locator('.gm-history-table .gm-history-links:has([data-gm-history-procedure])').first
 assert first_actions.locator('button').count()>=2,('buttons absent',first_actions.inner_text())
 before_box=first_actions.bounding_box();page.locator('.gm-history-table details.gm-history-detail').first.locator('summary').click()
 after_box=first_actions.bounding_box()
 assert first_actions.locator('button:visible').count()>=2,'History expansion hides navigation links'
 assert before_box and after_box and abs(before_box['x']-after_box['x'])<=3,('History expanded and moved action col',before_box,after_box)
 assert not errors,errors
 print('PASS Chromium v93.485: Journal & Calendar same provision forms, free vessel and water journal, gear water breakdown, reload, buy route, two character isolation, untruncated CF calendar notices, and GM history buttons')
 browser.close()
