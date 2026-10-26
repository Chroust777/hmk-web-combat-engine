from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();mark='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(mark):]);modules['app.js']+='''
window.__seed496=()=>{
 const character=(i)=>({id:'ch'+i,name:'Postava '+i,kind:i<=4?'PC':'NPC',occupation:'Cestovatel',description:'',portrait:'',hmk:{attributes:{str:12,end:11,dex:11,agl:12,per:12,cml:10,aur:10,wil:12,rea:11,cre:12,emp:12,elo:12},skills:[],injuries:[]}});
 const gear=(id,props={})=>({id,characterId:'ch1',sourceItemId:'testwaterskin',snapshot:{id:'testwaterskin',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2,pricePence:24}},quantity:1,slot:'carried',currentWQ:null,condition:'',...props});
 data=clean();data.characters=Array.from({length:8},(_,i)=>character(i+1));data.inventory=[gear('w1'),gear('w2'),gear('w3',{condition:'poškozeno'}),gear('w4',{waterContentsLb:5})];data.campaignClock=null;
 view='characters';selected=null;query='';render();
};
window.__goGear496=()=>{selected='ch1';view='sheet';activeSheetSection='inventory';document.getElementById('app').innerHTML=characterInventoryOverview(data.characters[0],data.inventory);};
window.__inspect496=()=>({rows:document.querySelectorAll('.inv-ledger-table tbody tr').length,ids:data.inventory.map(x=>x.id),items:data.inventory.length,stored:JSON.stringify(data.inventory),labels:[...document.querySelectorAll('.inv-ledger-table tbody tr')].map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,150))});
window.__goProvision496=()=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId='ch1';provisionGuideRoute='have';data.campaignClock={format:'hmk-campaign-calendar-v1',campaignId:'c496',label:'Výprava',minute:480,characterIds:data.characters.map(c=>c.id),anchors:[],events:[{id:'e1',type:'init',minute:480,reason:'Tvorba kampaně'}]};render();};
'''
bundle=mark+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1700,'height':1000});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const store=new Map();const a={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css','library.css','skill-workbench.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed496()')
 cards=page.locator('[data-character-kind="PC"] .character-card')
 assert cards.count()==4,f'cards {cards.count()} {errs}'
 rectangles=[x.bounding_box() for x in cards.all()]
 cols=len(set(round(x['x']/8) for x in rectangles if x))
 print('PC row coordinates:',[(round(x['x']),round(x['y']),round(x['width'])) for x in rectangles if x],flush=True)
 assert cols==4,f'PC cards should be 4 per row, got {cols} distinct columns'
 page.evaluate('window.__goGear496()')
 state=page.evaluate('window.__inspect496()')
 print('inventory',state,flush=True)
 assert state['items']==4 and state['rows']==3,f'expected 3 visible rows (2 identical + damaged + different contents) {state}'
 assert page.locator('[data-inv-member-select]').count()==1
 assert page.locator('[data-inv-member-select] option').count()==2
 assert page.locator('.inv-ledger-table tbody tr').first.locator('td').nth(1).inner_text().strip()=='2',state
 page.evaluate('window.__goProvision496()')
 assert page.locator('details.hc-provision-vessel-purchase').count()>=1,errs
 assert page.locator('details.hc-provision-vessel-purchase').first.evaluate('(e)=>e.open') is True
 assert not errs,errs
 print('PASS Chromium v93.496: 4 PC columns, 3 grouped rows with 4 untouched inventory IDs, default-open water acquisition',flush=True)
 browser.close()
