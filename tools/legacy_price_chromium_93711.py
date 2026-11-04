from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path('/mnt/data/hmk93711_work')
raw=(root/'hmk-app.bundle.js').read_text();pfx='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pfx):]);mods['app.js']+='''
window.__legacyItems=()=>data.items.map(x=>({name:x.name,price:x.properties.pricePence,viewPrice:libraryBrief(x)[3]}));
window.__saveProof=()=>{save();return data.items[0].properties.pricePence;};
'''
bundle=pfx+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pfx)+end:]
old={'schemaVersion':1,'characters':[],'items':[{'id':'old-price1','name':'Starý plášť','category':'other','description':'','source':'GM','properties':{'value':'75'}}], 'inventory':[],'trash':[],'journal':[]}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote']);pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.set_content('<html><body><div id="app"></div></body></html>')
 pg.evaluate('''doc=>{const m=new Map([['hmk-keepers-ledger-v1',JSON.stringify(doc)]]);const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''',old)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:pg.add_style_tag(content=(root/f).read_text())
 pg.add_script_tag(content=bundle)
 data=pg.evaluate('__legacyItems()');print('legacy load:',data,'errors',errs,flush=True)
 assert data==[{'name':'Starý plášť','price':75,'viewPrice':'75 d'}],data
 assert not errs,errs
 assert pg.evaluate('__saveProof()')==75
 saved=pg.evaluate("JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1')).items[0].properties.pricePence")
 assert saved==75,saved
 print('PASS legacy price restored and persisted as canonical pricePence',flush=True)
 b.close()
