"""Isolated Chromium click test for v93.489. No GitHub token/network."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);modules['app.js']+='''
const {createPotableWaterFill,createPhysicalWaterUse}=require('./src/integration/hmk-physical-water-ledger.js');
window.__seed489=()=>{
 const people=[{id:'pc489',name:'Karel',kind:'PC',occupation:'Man-at-arms',description:'',portrait:''},{id:'npc489',name:'Strážný',kind:'NPC',occupation:'Guard',description:'',portrait:''}];
 const i={id:'bottle489',characterId:'pc489',sourceItemId:'hmk:gear:hmk-p120-040',snapshot:{id:'hmk:gear:hmk-p120-040',name:'Waterskin, 2 quart',category:'other',properties:{weightLb:2}},quantity:1,slot:'carried',condition:''};
 const clock={format:'hmk-campaign-calendar-v1',campaignId:'delete489',label:'Testovací kampaň',minute:480,characterIds:people.map(c=>c.id),anchors:[],events:[{id:'init489',type:'init',minute:480,reason:'Test'}]};
 const fill=createPotableWaterFill({inventory:[i],journal:[],campaignId:'delete489',actorId:'pc489',itemId:i.id,minute:480,gmConfirmed:true,waterSource:'Testovací studna'});
 const f={id:'fill489',characterId:'pc489',calendarCampaignId:'delete489',campaignMinute:480,createdAt:'2026-10-26T10:00:00Z',title:'Naplnění vody',body:'Test',calendarInventoryWaterFill:fill};
 const used=createPhysicalWaterUse({journal:[f],campaignId:'delete489',actorId:'pc489',minute:480,fillId:f.id,quantity:0.5});
 const u={id:'use489',characterId:'pc489',calendarCampaignId:'delete489',campaignMinute:480,createdAt:'2026-10-26T10:00:01Z',title:'Spotřeba vody',body:'Test',calendarInventoryWaterUse:used};
 data.characters=people;data.inventory=[i];data.journal=[f,u];data.campaignClock=clock;data.trash=[];data.campaignClocks=[];data.campaignActorBranches={};
 validate(data);
 const ser=JSON.stringify(data);localStorage.setItem(STORAGE,ser);storageBaseline=ser;
 selected=null;view='characters';render();
};
window.__snapshot489=()=>({people:data.characters.map(c=>({id:c.id,kind:c.kind})),journal:data.journal.map(j=>j.id),inv:data.inventory.map(i=>i.id),members:data.campaignClock.characterIds,stored:JSON.parse(localStorage.getItem(STORAGE)).characters.map(c=>c.id)});
window.__tryOrdinaryWaterErase489=()=>mutate(()=>{data.journal=data.journal.filter(j=>j.id!=='fill489')});
window.__reload489=()=>{data=validate(JSON.parse(localStorage.getItem(STORAGE)));view='characters';render()};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=browser.new_page(viewport={'width':1670,'height':1100});errors=[];dialogs=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{for(const k of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,k,{configurable:true,value:{getItem:x=>m.get(x)??null,setItem:(x,v)=>m.set(x,String(v)),removeItem:x=>m.delete(x),key:i=>[...m.keys()][i]??null,get length(){return m.size}}});}}''')
 for css in ('styles.css','skill-workbench.css','book-templates.css','library.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed489()')
 assert page.locator('.character-group-heading').filter(has_text='PC').count() >=1
 assert page.locator('.character-group-heading').filter(has_text='NPC').count() >=1
 assert page.locator('[data-delete-character="pc489"]').count()==1
 page.screenshot(path='/mnt/data/hmk_work/registry_489.png',full_page=True)
 # Ordinary evidence is still immutable, independently of a whole-person delete.
 assert page.evaluate('window.__tryOrdinaryWaterErase489()') is False
 assert 'Doložená naplnění' in dialogs[-1],dialogs
 assert page.evaluate('window.__snapshot489().journal')==['fill489','use489']
 page.locator('[data-delete-character="pc489"]').click()
 state=page.evaluate('window.__snapshot489()')
 assert state['people']==[{'id':'npc489','kind':'NPC'}],(dialogs,state)
 assert state['journal']==[] and state['inv']==[],state
 assert state['members']==['npc489'] and state['stored']==['npc489'],state
 assert not any('Postavu nelze bezpečně smazat' in a for a in dialogs),dialogs
 # Persistence survives an app redraw and the unrelated NPC is retained.
 page.evaluate("window.__reload489()")
 assert page.locator('[data-delete-character="pc489"]').count()==0
 assert page.locator('[data-delete-character="npc489"]').count()==1
 page.locator('[data-delete-character="npc489"]').click()
 state=page.evaluate('window.__snapshot489()')
 assert state['people']==[] and state['members']==[] and state['stored']==[],('last actor deletion',dialogs,state)
 assert page.locator('[data-delete-character]').count()==0
 assert not errors,errors
 print('PASS Chromium v93.489: PC/NPC headings, normal immutable-water guard, full-person deletion after fill/use, surviving NPC and persisted reload',len(dialogs),'dialogs')
 browser.close()
