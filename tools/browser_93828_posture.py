from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);
rawFixture=json.loads(json.loads((root/'tools/frost_g_fixture.json').read_text('utf8'))['hmk-keepers-ledger-v1'])['characters'][0]
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
mods['app.js']+=seed+'\nwindow.__validFixture93828=()=>{const x='+json.dumps(rawFixture,ensure_ascii=False,separators=(',',':'))+';x.id="a";x.name="Pacient A";x.hmk.healthState=require("./src/integration/persistent-combat-state.js").initialCombatState();x.hmk.injuries=[];data.characters[0]=x;localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();};\n'
mods['app.js']+='''
window.__goHealth93828=()=>{selected='a';view='sheet';activeSheetSection='hazards';render();};
window.__goChronicle93828=()=>{selected='a';view='sheet';activeSheetSection='overview';render();};
window.__reload93828=()=>{data=JSON.parse(storageBaseline);render();};
window.__status93828=()=>{const s=character('a').hmk.healthState;return {shock:s.shock,prone:s.posture.prone,wounds:s.wounds.filter(w=>!w.healed).length,
   journal:data.journal.filter(j=>j.calendarGMShockState).map(j=>j.calendarGMShockState),
   storedProne:JSON.parse(storageBaseline).characters.find(c=>c.id==='a').hmk.healthState.posture.prone};};
'''
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1450,'height':1100});page.set_default_timeout(15000)
 errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedRows93772()');page.evaluate('window.__validFixture93828()');page.evaluate('window.__goHealth93828()')
 def submit(shock,stand=None,reason='GM potvrdil změnu polohy a doložil, že postava stojí.'):
  panel=page.locator('[data-gm-shock-status="a"]');assert panel.count()==1
  panel.locator('details.hmk-gm-shock-editor summary').click()
  f=panel.locator('form[data-gm-shock-set]')
  f.locator('select[name="shock"]').select_option(shock)
  if stand is not None:
   chk=f.locator('input[name="standingConfirmed"]')
   if stand:chk.check()
   else:chk.uncheck()
  f.locator('textarea[name="reason"]').fill(reason)
  f.locator('input[name="gmConfirmed"]').check()
  f.locator('button[type="submit"]').click()
  return page.evaluate('window.__status93828()')
 print('START',page.evaluate('window.__status93828()'),flush=True)
 unc=submit('UNC',None,'GM zakládá náhlé bezvědomí mimo boj, bez zranění.');assert unc['shock']=='UNC' and unc['prone'] and unc['wounds']==0,unc
 page.evaluate('window.__goChronicle93828()')
 assert 'prone' in page.locator('body').inner_text().lower()
 print('UNC',unc,flush=True)
 page.evaluate('window.__goHealth93828()')
 # select NONE automatically reveals and prechecks the declaration to stand
 panel=page.locator('[data-gm-shock-status="a"]');panel.locator('details.hmk-gm-shock-editor summary').click()
 f=panel.locator('form[data-gm-shock-set]');f.locator('select[name="shock"]').select_option('NONE')
 assert f.locator('[data-gm-shock-standing-row]').is_visible(),'Standing row not revealed'
 assert f.locator('input[name="standingConfirmed"]').is_checked(),'Standing checkbox not prechecked'
 f.locator('textarea[name="reason"]').fill('GM potvrdil konec bezvědomí a že postava fyzicky stojí.')
 f.locator('input[name="gmConfirmed"]').check();f.locator('button[type="submit"]').click()
 standing=page.evaluate('window.__status93828()');print('STANDING',standing,flush=True)
 assert standing['shock']=='NONE' and not standing['prone'] and not standing['storedProne'],standing
 page.evaluate('window.__goChronicle93828()')
 body=page.locator('body').inner_text()
 assert 'Postava leží na zemi (prone)' not in body,body[-1500:]
 assert 'schopna běžných činností' in body,body[-1500:]
 page.screenshot(path='/mnt/data/HMK_v93.828_Chronicle_po_oprave.png',full_page=True)
 page.evaluate('window.__reload93828()');assert not page.evaluate('window.__status93828().prone')
 page.evaluate('window.__goHealth93828()')
 second_unc=submit('UNC',None,'GM znovu přivodil bezvědomí pro ověření alternativní polohy.');assert second_unc['prone'] and second_unc['shock']=='UNC'
 lying=submit('NONE',False,'GM vyřešil Shock, ale postava dál fyzicky leží na zemi.')
 print('LYING',lying,flush=True)
 assert lying['shock']=='NONE' and lying['prone'] and lying['storedProne'],lying
 # The legacy state (NONE + PRONE) must be editable with the SAME Shock value.
 corrected=submit('NONE',True,'GM potvrdil, že dříve ležící postava již stojí na nohou.')
 print('REPAIRED',corrected,flush=True)
 assert corrected['shock']=='NONE' and not corrected['prone'] and not corrected['storedProne'],corrected
 assert len(corrected['journal'])==5,corrected['journal']
 assert corrected['journal'][-1]['proneBefore'] and not corrected['journal'][-1]['proneAfter']
 page.evaluate('window.__reload93828()');assert not page.evaluate('window.__status93828().prone')
 assert not errs,errs
 print('PASS UI UNC→NONE standing + chronicle + local persistence + deliberate remain prone + legacy NONE→NONE posture repair + buttons',flush=True)
 b.close()
