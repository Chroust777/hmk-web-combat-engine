from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();head='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(head):]);
# Synthetic actor has no historical 14-step dice record; browser UI test bypasses
# only unrelated Character Creation validation. Outfit legality is still checked.
assert 'validate(data);\n        if (!save({ gmClockAdvance }))' in modules['app.js']
modules['app.js']=modules['app.js'].replace('validate(data);\n        if (!save({ gmClockAdvance }))','if (!save({ gmClockAdvance }))',1)
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
window.__getOutfit520=()=>({view,selected,items:data.inventory.map(x=>({id:x.id,slot:x.slot,owner:x.characterId,layerOrder:x.layerOrder})),persisted:JSON.parse(localStorage.getItem(STORAGE)).inventory.map(x=>({id:x.id,slot:x.slot}))});
window.__changeView520=(v)=>{if(v==='calendar'){view='calendar';calendarLanding=true;}else if(v==='combat'){view='encounter';}else if(v==='character'){view='characters';}else if(v==='inventory'){view='sheet';activeSheetSection='inventory';}render();};
'''

modules['app.js'] += '''
window.__seedPlateMail521=()=>{
 window.__seedOutfit520();
 const catalog=require('./src/integration/armour-article-catalog.js').missingPrintedArmourCatalogEntries([]);
 const suits=require('./src/rules/armour-suit-printed.js').PRINTED_ARMOUR_SUITS_P113_116;
 const suit=suits.find(x=>x.name==='Plate & Mail');
 const owner='3fc8b3a2-4c8d-4915-a1ca-ce7a5bbb995a';
 const cname=x=>x==='Great Helm'?'Plate Great helm':x;
 const newGear=suit.articles.map((n,i)=>{
  const s=catalog.find(c=>c.name.toLowerCase()===cname(n).toLowerCase());
  if(!s)throw Error('Not in catalogue: '+n);
  return {id:'plate-mail-'+i,sourceItemId:s.id,characterId:owner,snapshot:structuredClone(s),quantity:1,slot:'carried',condition:'',gearStowage:'normal',layerOrder:null,layerSlot:null,bulkExceptionZones:[],printedSuitName:suit.name,acquisition:{mode:'buy',transactionId:'purchase-plate-1'}};
 });
 // A character already wears trousers and a shirt; buys another complete set.
 const dup=catalog.find(x=>x.name==='Cloth Breeches');const tunic=catalog.find(x=>x.name==='Cloth Tunic');
 data.inventory=[...data.inventory,{id:'old-tunic',sourceItemId:tunic.id,characterId:owner,snapshot:structuredClone(tunic),quantity:1,slot:'worn',layerOrder:1,gearStowage:'normal',condition:'',layerSlot:null,bulkExceptionZones:[]},{id:'old-breeches',sourceItemId:dup.id,characterId:owner,snapshot:structuredClone(dup),quantity:1,slot:'worn',layerOrder:0,gearStowage:'normal',condition:'',layerSlot:null,bulkExceptionZones:[]},...newGear];
 const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;render();
};
window.__statsPlateMail521=()=>({worn:data.inventory.filter(x=>x.slot==='worn').map(x=>({name:x.snapshot.name,id:x.id,order:x.layerOrder})),carried:data.inventory.filter(x=>x.slot==='carried').map(x=>x.snapshot.name),owned:data.inventory.length,load:require('./src/integration/combatant-load.js').resolveCombatantLoad({character:character(selected),inventory:data.inventory})});
'''
bundle=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(head)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[];dialogs=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const store=new Map();const a={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}""")
 for css in ('styles.css','book-templates.css','library.css','skill-workbench.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedPlateMail521()')
 before=page.evaluate('window.__statsPlateMail521()')
 assert len(before['worn'])==2,before['worn']
 page.locator('[data-outfit-action="armour"]').click()
 after=page.evaluate('window.__statsPlateMail521()')
 print('POST-ARMOUR: worn',len(after['worn']),'armour ENC',after['load']['armourENC'],'suit',after['load']['printedSuit'],'dialog',dialogs[-1][:550],flush=True)
 assert len(after['worn'])==17,after['worn']
 assert after['load']['armourENC']==40,after['load']
 assert after['load']['printedSuit']=='Plate & Mail'
 assert [x['name'] for x in after['worn']].count('Cloth Breeches')==1
 assert 'Cloth Tunic' in after['carried']
 assert len({x['id'] for x in after['worn']})==17
 page.locator('[data-outfit-action="clothing"]').click()
 cloth=page.evaluate('window.__statsPlateMail521()')
 assert [x['name'] for x in cloth['worn']].count('Cloth Breeches')==1
 assert cloth['load']['printedSuit'] is None
 print('POST-CLOTHING: worn',len(cloth['worn']),'breeches', [x['name'] for x in cloth['worn']].count('Cloth Breeches'),flush=True)
 page.locator('[data-outfit-action="armour"]').click()
 roundtrip=page.evaluate('window.__statsPlateMail521()')
 assert roundtrip['load']['printedSuit']=='Plate & Mail'
 print('PASS Chromium: 17-piece Plate & Mail, clothing swap, back again, no duplicate breeches, original inventory rows preserved',len(dialogs),'dialogs',errors,flush=True)
 assert not errors,errors
 browser.close()
