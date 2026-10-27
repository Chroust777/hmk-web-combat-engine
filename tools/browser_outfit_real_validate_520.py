from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();head='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(head):]);
modules['app.js']+='''
window.__seedOutfit520=()=>{
 const uuid='3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a',b='4e19e0cd-2e9a-433a-9a42-76c1a5552207';
 const attr={str:12,end:11,dex:11,agl:12,per:12,cml:10,aur:10,wil:12,rea:11,cre:12,emp:12,elo:12};
 const completed=Object.fromEntries(Array.from({length:14},(_,i)=>[String(i+1),true]));
 const initial=require('./src/integration/persistent-combat-state.js').initialCombatState();
 const makeCreation=require('./src/integration/hmk-character-creation.js').defaultCreation;
 const actor=(id,name)=>({id,name,kind:'PC',occupation:'Farmer',hmk:{attributes:attr,skills:[],combatState:structuredClone(initial),creation:{...makeCreation(),status:'complete',step:14,completed,reviewRequired:false}}});
 const catalog=require('./src/integration/armour-article-catalog.js').missingPrintedArmourCatalogEntries([]);
 const piece=(material,name,id,owner=uuid,slot='carried')=>{
  const entry=catalog.find(x=>x.properties.material===material&&x.name.toLowerCase().endsWith(' '+name.toLowerCase()));
  if(!entry)throw Error('Missing '+material+' '+name);
  return {id,sourceItemId:entry.id,characterId:owner,quantity:1,snapshot:structuredClone(entry),slot,layerOrder:slot==='worn'?0:null,layerSlot:null,bulkExceptionZones:[],condition:'',gearStowage:'normal'};
 };
 data=clean();data.characters=[actor(uuid,'Jaroslav'),actor(b,'Petr')];
 data.inventory=[piece('cloth','Cap','cap'),piece('cloth','Shirt','shirt'),piece('mail','Cowl','mail'),piece('leather','Vest','leather'),piece('leather','Shoes','shoes'),piece('cloth','Breeches','chest',uuid,'chest'),piece('padded','Mittens','other',b)];
 data.journal=[];data.campaignClock=null;selected=uuid;view='sheet';activeSheetSection='inventory';storageReadOnly=false;
 const json=JSON.stringify(data);localStorage.setItem(STORAGE,json);storageBaseline=json;render();
};
window.__removeCreation520=()=>{for(const c of data.characters)delete c.hmk.creation;window.__mountBare520();};
window.__mountBare520=()=>{view='sheet';activeSheetSection='inventory';document.getElementById('app').innerHTML=armourLoadoutPanel(data.inventory.filter(x=>x.characterId===selected),data.characters.find(c=>c.id===selected));};
window.__getOutfit520=()=>({view,selected,items:data.inventory.map(x=>({id:x.id,slot:x.slot,owner:x.characterId,layerOrder:x.layerOrder})),persisted:JSON.parse(localStorage.getItem(STORAGE)).inventory.map(x=>({id:x.id,slot:x.slot}))});
window.__changeView520=(v)=>{if(v==='calendar'){view='calendar';calendarLanding=true;}else if(v==='combat'){view='encounter';}else if(v==='character'){view='characters';}else if(v==='inventory'){view='sheet';activeSheetSection='inventory';}render();};
'''
bundle=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(head)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[];dialogs=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const store=new Map();const a={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css','library.css','skill-workbench.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedOutfit520()')
 page.evaluate('window.__removeCreation520()')
 assert page.locator('[data-outfit-action]').count()==3,(page.locator('body').inner_text()[:1700],errors)
 assert '3fc8b3a2' not in page.locator('#app').inner_text()
 page.locator('[data-outfit-action="armour"]').click()
 first=page.evaluate('window.__getOutfit520()')
 print('AFTER ARMOUR',first,'dialogs',dialogs,flush=True)
 assert any(x['slot']=='worn' for x in first['items'])
 assert first['items']==[{'id':x['id'],'slot':x['slot'],'owner':x['owner'],'layerOrder':x['layerOrder']} for x in first['items']]
 assert next(x for x in first['items'] if x['id']=='chest')['slot']=='chest'
 assert next(x for x in first['items'] if x['id']=='other')['slot']=='carried'
 page.evaluate('window.__mountBare520()')
 page.locator('[data-outfit-action="clothing"]').click()
 second=page.evaluate('window.__getOutfit520()')
 assert next(x for x in second['items'] if x['id']=='mail')['slot']=='carried',second
 assert next(x for x in second['items'] if x['id']=='shoes')['slot']=='worn',second
 page.evaluate('window.__mountBare520()')
 page.locator('[data-outfit-action="undress"]').click()
 third=page.evaluate('window.__getOutfit520()')
 assert all(x['slot']!='worn' for x in third['items'])
 for view in ('calendar','combat','character'):
  page.evaluate('(v)=>window.__changeView520(v)',view)
  text=page.locator('#app').inner_text()
  assert '3fc8b3a2' not in text and '4e19e0cd' not in text,(view,text[:600])
 print('PASS Chromium: 3 equip/undress clicks, inventory persists, foreign/chest untouched, UUID hidden on 3 views',len(dialogs),'dialogs',errors,flush=True)
 assert not errors,errors
 browser.close()
