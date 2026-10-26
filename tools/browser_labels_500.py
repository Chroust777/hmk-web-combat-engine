from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
raw=(root/'hmk-app.bundle.js').read_text()
marker='(()=>{const MOD='
modules, end=json.JSONDecoder().raw_decode(raw[len(marker):])
modules['app.js']+='''
window.__probe500={
 armour:()=>libraryBrief({category:'armor',properties:{material:'M',encumbrance:5,printedEncCode:'a',locationProtection:{tx:{b:1,e:1,p:1,f:1}},weightLb:2,pricePence:40}}),
 details:()=>catalogParameters({category:'armor',properties:{material:'M',pricePence:40,weightLb:2,coverageNote:'Location codes from p.118; layering, Bulk, ENC and armour totals not calculated.',locationProtection:{tx:{b:1,e:1,p:1,f:1}}}}),
 inventory:()=>{const c={id:'test500',name:'Pokusná postava',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12},skills:[]}};
  data=clean();data.characters=[c];data.inventory=[{id:'testitem500',characterId:c.id,sourceItemId:'test:dagger',quantity:1,slot:'carried',snapshot:{id:'test:dagger',name:'Dagger',category:'weapon',properties:{quality:12,pricePence:72,weightLb:4,heft:10,length:5}}}];
  return characterInventoryOverview(c,data.inventory);
 }
};
'''
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1450,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for sheet in ('styles.css','book-templates.css','library.css'):
  page.add_style_tag(content=(root/sheet).read_text())
 page.add_script_tag(content=bundle)
 assert page.evaluate('window.__probe500.armour()[1]')=='5 (podmíněné)'
 details=page.evaluate('window.__probe500.details()')
 assert 'Kódy anatomických lokalit podle strany 118' in details,details[-500:]
 inv=page.evaluate('window.__probe500.inventory()')
 assert '<th>Hmotnost</th>' in inv
 assert '4.0 lb' in inv
 assert '72 d' in inv and '72 d / ks' not in inv, inv[-1000:]
 assert 'Nesené / vybavené položky' in inv and 'Nesené / vybavené položky (lb)' not in inv
 page.locator('#app').evaluate('(el,html)=>el.innerHTML=html',inv)
 assert page.locator('table.inv-ledger-table tr').count()==2
 assert page.locator('table.inv-ledger-table tbody td').nth(2).inner_text()=='72 d'
 assert page.locator('table.inv-ledger-table tbody td').nth(3).inner_text()=='4.0 lb'
 assert not errors, errors
 print('PASS Chromium v93.500: armour ENC, Czech note, inventory price and lb headings/values')
 browser.close()
