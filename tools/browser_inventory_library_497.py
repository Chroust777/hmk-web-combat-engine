from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();mark='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(mark):]);modules['app.js']+='''
window.__seed497=()=>{
 const pc={id:'ch1',name:'Testovací postava',kind:'PC',occupation:'Cestovatel',description:'',portrait:'',hmk:{attributes:{str:12,end:11,dex:11,agl:12,per:12,cml:10,aur:10,wil:12,rea:11,cre:12,emp:12,elo:12},skills:[],injuries:[]}};
 const gear=(id,opts={})=>({id,characterId:'ch1',sourceItemId:'testwaterskin',snapshot:{id:'testwaterskin',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2,pricePence:24}},quantity:1,slot:'carried',currentWQ:12,condition:'',...opts});
 data=clean();data.characters=[pc];data.inventory=[gear('initial',{condition:'Počáteční výbava'}),gear('purchase'),gear('chest',{slot:'chest',waterContentsLb:5}),gear('damaged',{currentWQ:8,condition:'poškozeno'})];data.campaignClock=null;
 selected='ch1';view='sheet';activeSheetSection='inventory';
 document.getElementById('app').innerHTML=characterInventoryOverview(pc,data.inventory);
};
window.__snapshot497=()=>({items:data.inventory.length,ids:data.inventory.map(x=>x.id),rows:[...document.querySelectorAll('.inv-ledger-table tbody tr')].map(r=>r.innerText.replace(/\\s+/g,' ').slice(0,220)),weight:document.querySelector('.inv-footer-totals')?.innerText});
window.__showChron497=()=>{document.getElementById('app').innerHTML=characterJournalHero(data.characters[0],data.inventory);};
window.__showProvision497=()=>{document.getElementById('app').innerHTML=provisionCardHTML(data.characters[0],true);};
window.__showLibrary497=()=>{view='library';libraryTab='ranged';query='';libraryPage=0;document.getElementById('app').innerHTML=libraryView();};
window.__debugHelp497=(key)=>libraryFieldHelp(key);
'''
bundle=mark+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1700,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const store=new Map();const a={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css','library.css','skill-workbench.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed497()')
 state=page.evaluate('window.__snapshot497()')
 print('GEAR:',state,flush=True)
 assert state['items']==4 and state['ids']==['initial','purchase','chest','damaged'],state
 assert len(state['rows'])==2,'Expected same-name / same-WQ together despite provenance and chest'
 assert any('Více umístění 3 12' in r for r in state['rows']) and any('Neseno 1 8' in r for r in state['rows']),state['rows']
 assert page.locator('[data-inv-member-select]').count()==1
 assert page.locator('[data-inv-member-select] option').count()==3
 assert '13.0' in state['weight'],state
 page.evaluate('window.__showChron497()')
 assert page.locator('.hc-provision-card').count()==0,'Chronicle no food/water card'
 assert page.get_by_text('Melee Weapons').count()>=1
 page.evaluate('window.__showProvision497()')
 assert page.locator('.hc-provision-card').count()==1,'Provision still has the summary'
 page.evaluate('window.__showLibrary497()')
 print('LIB HEADER',page.locator('.folio-catalog-field dt').all_text_contents()[:12], 'TABLES',page.locator('th.catalog-parameter-tip').all_text_contents()[:12],flush=True)
 heading=page.locator('.folio-catalog-field dt').filter(has_text='Dostřel / střela').first
 assert heading.count()==1,'Ranged header must carry help'
 help=heading.get_attribute('data-hmk-help')
 assert help and 'Base Range' in help,help
 heading.hover(force=True)
 value=page.locator('.folio-catalog-field dd[data-hmk-help]').first
 assert value.count()>0 and value.get_attribute('data-hmk-help'),'visible value carries help'
 assert 'Pull' in page.evaluate('window.__debugHelp497("Draw")')
 details=page.locator('.catalog-parameters summary').first
 details.click(force=True)
 assert page.locator('.catalog-parameters-inner').first.is_visible(),'expand catalog parameters'
 assert not errors,errors
 print('PASS Chromium: item stacking, individual actions, weights, Chronicle removal, Provision preservation, library tooltips and expanded details',flush=True)
 browser.close()
