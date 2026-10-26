from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();mark='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(mark):]);modules['app.js']+='''
window.__seed498=(filled=false)=>{
 const pc={id:'hero',name:'Hrdina',kind:'PC',occupation:'Poutník',description:'',portrait:'',hmk:{attributes:{str:12,end:11,dex:11,agl:12,per:12,cml:10,aur:10,wil:12,rea:11,cre:12,emp:12,elo:12},skills:[],injuries:[]}};
 const make=(id,name='Waterskin, 2 quart',wq=12)=>({id,characterId:'hero',sourceItemId:'hmk:gear:hmk-p120-040',snapshot:{id:'hmk:gear:hmk-p120-040',name,category:'other',properties:{weightLb:2,pricePence:24}},quantity:1,slot:'carried',currentWQ:wq,condition:''});
 data=clean();data.characters=[pc];data.inventory=[make('a'),make('b'),make('c','Waterskin, 2 quart',8)];data.campaignClock=null;
 if(filled){data.campaignClock={campaignId:'example',minute:100,characterIds:['hero'],events:[]};data.journal=[{id:'f',characterId:'hero',calendarCampaignId:'example',campaignMinute:50,calendarInventoryWaterFill:{itemId:'a',quantity:0.5,minute:50}}];}
 selected='hero';view='sheet';activeSheetSection='inventory';
 document.getElementById('app').innerHTML=characterInventoryOverview(pc,data.inventory);
};
window.__make498=()=>{data.items=[{id:'test-sword',name:'Test Sword',category:'weapon',description:'',properties:{quality:12,weightLb:3,pricePence:100}}];document.getElementById('app').innerHTML=journalAddInventoryForm();};
window.__library498=()=>{view='library';libraryTab='melee';query='';libraryPage=0;document.getElementById('app').innerHTML=libraryView();};
window.__audit498=()=>({records:data.inventory.map(x=>({id:x.id,wq:x.currentWQ,quantity:x.quantity})),count:document.querySelectorAll('.inv-ledger-table tbody tr').length});
'''
bundle=mark+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(mark)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1700,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(print('DIALOG',d.message,flush=True),d.dismiss()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const store=new Map();const a={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css','library.css','skill-workbench.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed498(false)')
 assert page.locator('.inv-ledger-table tbody tr').count()==3,'separate per original record'
 assert page.locator('.inv-ledger-table thead').get_by_text('Ks').count()==0,'no Ks header'
 assert page.locator('tr').filter(has_text='(prázdná)').count()>=3,'empty water state follows name'
 assert page.locator('[data-inv-member-select]').count()==0,'no stacked item selector'
 before=page.evaluate('window.__audit498()')
 assert before['count']==3 and len(before['records'])==3,before
 page.evaluate('window.__seed498(true)')
 labels=page.locator('.inv-ledger-table tbody tr th').all_text_contents()
 assert '(plná vody)' in labels[0] and '(prázdná)' in labels[1],labels
 page.evaluate('window.__seed498(false)')
 page.evaluate('window.__make498()')
 assert page.locator('#add-inventory input[name="currentWQ"]').count()==1
 assert page.locator('#add-inventory input[name="currentWQ"]').input_value()==''
 page.select_option('#add-inventory select[name="itemId"]','test-sword')
 page.locator('#add-inventory input[name="currentWQ"]').fill('7')
 page.locator('#add-inventory button[type="submit"]').click()
 assert any(r['wq']==7 for r in page.evaluate('window.__audit498()')['records']),'manual WQ retained when assigned'
 page.evaluate('window.__make498()')
 page.select_option('#add-inventory select[name="itemId"]','test-sword')
 page.locator('#add-inventory button[type="submit"]').click()
 assert any(r['wq']==12 for r in page.evaluate('window.__audit498()')['records']),'empty WQ uses catalog default'
 page.evaluate('window.__make498()')
 page.select_option('#add-inventory select[name="itemId"]','test-sword')
 page.locator('#add-inventory input[name="currentWQ"]').fill('0')
 page.locator('#add-inventory button[type="submit"]').click()
 assert any(r['wq']==0 for r in page.evaluate('window.__audit498()')['records']),'zero is a legitimate deliberate WQ override'
 page.evaluate('window.__library498()')
 help_cell=page.locator('.folio-catalog-field dt[data-hmk-help]').filter(has_text='WQ').first
 assert help_cell.count(), 'library contains label with rules help'
 help_cell.hover(force=True)
 assert help_cell.get_attribute('title') is None,'native tooltip disabled'
 assert page.locator('.hmk-journal-floating-tooltip:not([hidden])').count()==1,'custom rules tooltip remains'
 assert not errors,errors
 print('PASS Chromium: individual inventory rows, no Ks, full/empty water proof, WQ input, single tooltip',flush=True)
 browser.close()
