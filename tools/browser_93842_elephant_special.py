"""Actual click of exceptional ×5 elephant tack moved from right to left; does not claim platform coverage."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text();pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):]);old=(root/'tools/browser_93840_stable_catalog.py').read_text();mods['app.js']+=old.split("seed='''",1)[1].split("'''",1)[0];bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);pg=b.new_page(viewport={'width':1500,'height':950});pg.set_default_timeout(18000);err=[];dialogs=[]
 pg.on('pageerror',lambda e:err.append(str(e)));pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 pg.set_content('<!doctype html><html lang="cs"><meta charset="utf-8"><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:pg.add_style_tag(content=(root/css).read_text())
 pg.add_script_tag(content=bundle);pg.evaluate('window.__testStart839()')
 f=pg.locator('[data-hmk-livestock-acquire]');option=f.locator('select[name=beastId] option').filter(has_text='Elephant').first
 f.locator('select[name=beastId]').select_option(option.get_attribute('value'));f.locator('input[name=beastName]').fill('Slon test');f.locator('select[name=ownerId]').select_option('a');f.locator('button[value=free]').click()
 pg.evaluate('window.__testShowStable839()')
 ref=pg.locator('details.hmk-stable-equipment-ref').first
 if not ref.get_attribute('open'):ref.locator('summary').click()
 row=ref.locator('tr[data-hmk-guide-beast]').filter(has_text='Elephant').first
 special=row.locator('form.hmk-stable-elephant-special-93842');assert special.count()==1
 item=special.locator('select[name=itemId] option').filter(has_text='Pack harness').first
 special.locator('select[name=itemId]').select_option(item.get_attribute('value'))
 special.locator('select[name=mode]').select_option('gift')
 before=pg.evaluate('window.__testState839()');assert before['animals'][0]['load']==0
 special.locator('button').click()
 after=pg.evaluate('window.__testState839()')
 assert after['cash']==before['cash'] and after['animals'][0]['load']==50, (before,after)
 assert after['stableEvents']==1 and after['minute']==480 and not err,(after,err)
 out=root/'tools/evidence_93842';out.mkdir(exist_ok=True)
 (out/'ELEPHANT_SPECIAL_TRANSFER.json').write_text(json.dumps({'status':'PASS','tack':'Pack harness','originalWeightLb':10,'elephantWeightLb':50,'cashUntouched':True,'stableReceipts':1,'minute':480,'errors':err},ensure_ascii=False,indent=2),'utf8')
 print('PASS Elephant special ×5 tack has one confirmed transfer and verified burden')
 b.close()
