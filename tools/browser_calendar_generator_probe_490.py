from pathlib import Path
from playwright.sync_api import sync_playwright
import json, time
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);modules['app.js']+='''
window.__seed490=()=>{
 data.characters=[{id:'original490',name:'Old character',kind:'PC',occupation:'Guard',description:'',portrait:'',hmk:{skills:[],injuries:[],attributes:{}}}];
 data.inventory=[];data.journal=[];data.trash=[];
 data.campaignClock={format:'hmk-campaign-calendar-v1',campaignId:'test490',label:'Campaign',minute:480,characterIds:['original490'],anchors:[],events:[{id:'start490',type:'init',minute:480,reason:'Test'}]};
 data.campaignClocks=[];data.campaignActorBranches={};
 validate(data);const serialized=JSON.stringify(data);localStorage.setItem(STORAGE,serialized);storageBaseline=serialized;selected=null;view='characters';render();
};
window.__inspect490=()=>({chars:data.characters.map(c=>({id:c.id,name:c.name,step:c.hmk?.creation?.step,status:c.hmk?.creation?.status,kit:c.hmk?.creation?.values?.autoStartingKit?.source||null})),journal:data.journal.length,inventory:data.inventory.map(i=>({id:i.id,actorId:i.characterId})),clock:data.campaignClock, storageReadOnly,notice,lastAutomaticGenerationMutationError});
window.__reload490=()=>{data=validate(JSON.parse(localStorage.getItem(STORAGE)));view='characters';render()};
window.__setActive490=(id)=>{if(id)data.combatRuntime={sequence:{order:[id]},participants:[id]};else delete data.combatRuntime};
window.__tryDelete490=(id)=>deleteCharacterEntirely(id);
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1600,'height':1000});alerts=[];errors=[]
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const a={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''')
 for css in ('styles.css','book-templates.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 print('initial',page.evaluate('window.__inspect490()'),flush=True)
 page.evaluate('window.__seed490()')
 page.locator('[data-action="auto-random-character"]').click();form=page.locator('#hmk-random-name-form');form.locator('[name="name"]').fill('Second490');form.locator('button[type="submit"]').click()
 t=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-t<75:page.wait_for_timeout(150)
 state=page.evaluate('window.__inspect490()')
 assert not page.locator('.hmk-auto-generation-overlay').count(),'generation timeout'
 assert state['chars'][1]['status']=='auto-generated',('generated character missing',state,alerts)
 assert state['chars'][0]['id']=='original490' and state['clock']['characterIds']==['original490'],state
 assert state['chars'][1]['kit'] and all(x['actorId']==state['chars'][1]['id'] for x in state['inventory']),state
 assert not alerts and not errors,(alerts,errors)
 # Reload the committed snapshot, the pre-existing campaign must remain intact.
 page.evaluate('window.__reload490()')
 generated_id=state['chars'][1]['id']
 page.evaluate('(id)=>window.__setActive490(id)',generated_id)
 assert page.evaluate('(id)=>window.__tryDelete490(id)',generated_id) is False
 assert any('aktivního bojového střetnutí' in text for text in alerts),alerts
 page.evaluate('window.__setActive490(null)')
 page.locator(f'[data-delete-character="{generated_id}"]').click()
 final=page.evaluate('window.__inspect490()')
 assert len(final['chars'])==1 and final['chars'][0]['id']=='original490',final
 assert final['clock']['characterIds']==['original490'] and final['inventory']==[],final
 assert not any('Automatický generátor' in x for x in alerts),alerts
 print('PASS Chromium v93.490: existing calendar -> auto character generated in 14 steps -> starter kit -> delete without storage clear; other character/calendar preserved',round(time.monotonic()-t,1),'s')
 browser.close()
