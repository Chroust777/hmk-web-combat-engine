from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);
rawFixture=json.loads(json.loads((root/'tools/frost_g_fixture.json').read_text('utf8'))['hmk-keepers-ledger-v1'])['characters'][0]
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
mods['app.js']+=seed+'\nwindow.__validFixture93826=()=>{const x='+json.dumps(rawFixture,ensure_ascii=False,separators=(',',':'))+';x.id=\"a\";x.name=\"Aktér A\";x.hmk.healthState=require(\"./src/integration/persistent-combat-state.js\").initialCombatState();x.hmk.injuries=[];data.characters[0]=x;localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};\n'
mods['app.js']+='''\nwindow.__markReady93826=()=>{for(const c of data.characters)c.hmk.creation={version:1,step:14,skillStage:7,status:'complete',values:{},attributeProof:{},skillDP:{},auditEvents:[],completed:Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,true]))}; localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};
window.__goHealth93826=()=>{selected='a';view='sheet';activeSheetSection='hazards';render();};
window.__goChronicle93826=()=>{selected='a';view='sheet';activeSheetSection='overview';render();};
window.__reload93826=()=>{data=JSON.parse(storageBaseline);render();return {shock:character('a').hmk.healthState.shock,wounds:character('a').hmk.healthState.wounds.length,gm:data.journal.filter(j=>j.calendarGMShockState).length}};
window.__status93826=()=>({shock:character('a').hmk.healthState.shock,wounds:character('a').hmk.healthState.wounds.length,followup:character('a').hmk.healthState.shockFollowup,journal:data.journal.filter(j=>j.calendarGMShockState).map(j=>j.calendarGMShockState),stored:JSON.parse(storageBaseline).characters.find(c=>c.id==='a').hmk.healthState.shock});
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); page=b.new_page(viewport={'width':1450,'height':1100});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedRows93772()');page.evaluate('''()=>{for(const c of window.__getTestCharacters93826()){} }''') if False else page.evaluate('window.__seedRows93772()');page.evaluate('window.__validFixture93826()');page.evaluate('window.__goHealth93826()')
 panel=page.locator('[data-gm-shock-status="a"]');print('PANEL COUNT',panel.count(),'ERR',errors,'BODY',page.locator('body').inner_text()[:2500],flush=True);assert panel.count()==1
 assert 'NONE' in panel.locator('[data-gm-shock-current]').inner_text()
 panel.locator('details summary').first.click();f=panel.locator('form[data-gm-shock-set]');f.locator('select[name=shock]').select_option('UNC');f.locator('textarea[name=reason]').fill('GM nasadil bezvědomého NPC po přirozeném kolapsu.');f.locator('input[name=gmConfirmed]').check();f.locator('button[type=submit]').click()
 print('AFTER SET',page.evaluate('window.__status93826()'),'ERRORS',errors,'DIALOGS',dialogs,flush=True)
 assert page.evaluate('window.__status93826().shock')=='UNC','GM set did not persist UNC'
 assert page.evaluate('window.__status93826().stored')=='UNC','not saved local storage'
 assert page.evaluate('window.__status93826().wounds')==0,'created a fake wound'
 assert page.evaluate('window.__status93826().journal.length')==1
 panel=page.locator('[data-gm-shock-status="a"]');assert 'UNC' in panel.locator('[data-gm-shock-current]').inner_text()
 page.screenshot(path='/mnt/data/HMK_v93.826_GM_zdravi.png',full_page=True)
 page.evaluate('window.__goChronicle93826()');table=page.locator('.journal-anatomy-table');print('ANATOMY',table.count(),table.is_visible() if table.count() else '-',flush=True);assert table.count()==1 and table.is_visible()
 print('COURSE',page.locator('details.journal-health-courses').count(),flush=True)
 details=page.locator('details.journal-health-courses');assert details.count()==1
 assert not details.evaluate('e=>e.open')
 details.locator('summary').click();assert details.evaluate('e=>e.open')
 page.screenshot(path='/mnt/data/HMK_v93.826_Chronicle.png',full_page=True)
 details.locator('summary').click();assert not details.evaluate('e=>e.open')
 print('RELOAD',page.evaluate('window.__reload93826()'),flush=True)
 assert page.evaluate('window.__reload93826().shock')=='UNC'
 assert not errors,errors
 print('PASS GM UNC, 0 wounds, saved/reload, visible Chronicle anatomy and collapsed health courses',flush=True)
 b.close()
