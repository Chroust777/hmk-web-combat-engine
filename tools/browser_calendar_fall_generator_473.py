from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parents[1];s=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(s[len(prefix):]);mods['app.js']+='''
window.__hmkSeed473=(raw)=>{
 const initial=require('./src/integration/persistent-combat-state.js').initialCombatState();
 data=raw; const ch=data.characters[0];ch.hmk.combatState={...initial,...(ch.hmk.combatState||{}),morale:{...initial.morale,...(ch.hmk.combatState?.morale||{})}};
 selected=ch.id;view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='overview';storageReadOnly=false;
 const encoded=JSON.stringify(data);localStorage.setItem(STORAGE,encoded);storageBaseline=encoded;render();
};
''';s=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+s[len(prefix)+end:]
db=json.loads(Path('/mnt/data/hmk_work_93470/test_generated_character_470.json').read_text());actor=db['characters'][0];actor['name']='Honza';id=actor['id'];db['campaignClock']={'format':'hmk-campaign-calendar-v1','campaignId':'camp473','label':'Kampaň','minute':800,'characterIds':[id],'anchors':[],'events':[{'id':'start473','type':'init','minute':800,'reason':'GM začal kampaň'}]}
db['journal'].append({'id':'cf473','characterId':id,'calendarCampaignId':'camp473','createdAt':'now','title':'Pád po CF','body':'Ověřený skill CF','skillTestProof':{'type':'critical-followup','actorId':id,'skill':'Climbing','activity':'climb-easy','result':{'level':'CF'}}})
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=browser.new_page(viewport={'width':1600,'height':950});errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const store=new Map();const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''')
 page.add_style_tag(content=(root/'styles.css').read_text());page.add_style_tag(content=(root/'book-templates.css').read_text());page.add_script_tag(content=s)
 page.evaluate('(db)=>window.__hmkSeed473(db)',db)
 b=page.locator('[data-cal-unknown-fall]');assert b.count()==1,('UNKNOWN',page.locator('#app').inner_text()[:2200],errors)
 assert b.get_attribute('data-cal-unknown-source')=='cf473';assert page.locator('#campaign-advance-form').count()==1
 before=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"));b.click()
 form=page.locator('[data-climbing-fall-form]');assert form.count()==1,('FORM',page.locator('#app').inner_text()[:2500],errors)
 assert form.locator('[name=sourceId]').input_value()=='cf473'
 assert page.evaluate("document.activeElement.name")=='heightFt'
 assert form.locator('[data-hmk-calendar-auto-die]').count()>=4,('DICE',form.inner_text()[:1300]);assert not errors,errors
 after=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"));assert before==after,'navigation cannot modify evidence'
 # The same source with a known original minute must use the ordinary due-event link.
 db['journal'][-1]['campaignMinute']=700
 page.evaluate('(d)=>window.__hmkSeed473(d)',db)
 due=page.locator('[data-cal-link][data-cal-kind="skill-fall"]')
 assert due.count()>=1,('missing dated event',page.locator('#app').inner_text()[:1500]);due.first.click()
 assert page.locator('[data-climbing-fall-form] [name="sourceId"]').input_value()=='cf473'
 assert page.evaluate('document.activeElement.name')=='heightFt'
 assert not errors,errors
 print('PASS Chromium calendar Honza CF → unknown and dated direct falling form; height focus; dice controls; no state or clock changes')
 browser.close()
