from pathlib import Path
import json,sys,traceback
from playwright.sync_api import sync_playwright
root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data/hmk_dev_93720')
raw=(root/'hmk-app.bundle.js').read_text()
prefix='(()=>{const MOD='
assert raw.startswith(prefix)
modules,pos=json.JSONDecoder().raw_decode(raw[len(prefix):])
helper=r'''
window.__fearInstall=()=>{
 data=clean();storageReadOnly=false;data.characters.push({id:'fear-a',name:'Fear A',kind:'PC',hmk:{folk:'Human',attributes:{wil:12,end:12,str:12,dex:12,rea:12,per:12},arcane:{},healthState:persistent_combat_state_js_1.initialCombatState()}});
 data.combatRuntime={timelineId:'fear-seq-1',sequence:encounter_turn_sequence_js_1.createEncounterSequence({timelineId:'fear-seq-1',roster:[{id:'fear-a',name:'Fear A',initiativeML:50,awarenessEML:50}]})};
 const first=JSON.stringify(data);localStorage.setItem(STORAGE,first);storageBaseline=first;
 render=()=>{document.querySelector('#app').innerHTML=hmkFearPanel(data.characters)};
 render();return {html:document.querySelector('#app').innerText.slice(0,250),forms:document.querySelectorAll('form').length};
};
window.__fearResult=()=>({state:data.characters[0].hmk.healthState.fear?.state,origins:(data.characters[0].hmk.healthState.fearSources||[]).map(x=>({event:x.sourceEventId,state:x.state,source:x.sourceId})),psy:data.characters[0].hmk.healthState.morale.psycheStress,debts:{now:data.characters[0].hmk.arcane.pendingPsycheTraitChoice,more:data.characters[0].hmk.arcane.pendingPsycheTraitChoices||[]},receipts:(data.globalActionLedger||[]).map(x=>x.id),stored:localStorage.getItem(STORAGE)===storageBaseline,live:[...document.querySelectorAll('#hmk-fear-safe-form [name="fearRef"] option')].map(x=>x.textContent)});
window.__fearSubmit=(key,roll)=>{
 const f=document.querySelector('#hmk-fear-exposure-form');
 for(const [name,value] of Object.entries({sourceKind:'gm-event',sourceId:'source-'+key,sourceDescription:'Distinct perceived monster '+key,aberrance:'0',d100:String(roll)}))f.elements.namedItem(name).value=value;
 f.elements.namedItem('gmConfirmedSource').checked=true;
 f.elements.namedItem('gmConfirmed').checked=true;
 f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 return window.__fearResult();
};
window.__fearRecover=(part,mins,los)=>{
 const f=document.querySelector('#hmk-fear-safe-form');const sel=f.elements.namedItem('fearRef');
 const target=[...sel.options].find(x=>data.characters[0].hmk.healthState.fearSources.find(z=>z.sourceEventId===JSON.parse(x.value)[1])?.sourceId==='source-'+part);
 if(!target)throw Error('Fear source option is missing: '+part);
 sel.value=target.value;f.elements.namedItem('elapsedMinutes').value=String(mins);f.elements.namedItem('safeFromSource').checked=true;f.elements.namedItem('outOfLOS').checked=los;
 f.elements.namedItem('gmConfirmed').checked=true;
 f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return window.__fearResult();
};
window.__fearReload=()=>{data=JSON.parse(localStorage.getItem(STORAGE));render();return window.__fearResult()};
'''
modules['app.js']+='\n'+helper
repacked=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+pos:]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def on_dialog(d):dialogs.append(d.message);d.accept()
 page.on('dialog',on_dialog)
 page.goto('about:blank');page.set_content('<div id="app"></div>')
 page.evaluate("""()=>{function mem(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear(),key:i=>[...map.keys()][i]||null,get length(){return map.size}}}Object.defineProperty(window,'localStorage',{configurable:true,value:mem()});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mem()})}""")
 page.add_script_tag(content=repacked)
 try:
  initial=page.evaluate('window.__fearInstall()');assert initial['forms']>=2,initial
  a=page.evaluate('window.__fearSubmit("one",71)');print('FEAR ONE',a);assert a['state']=='afraid' and len(a['receipts'])==1 and a['stored'],a
  b=page.evaluate('window.__fearSubmit("two",95)');print('FEAR TWO',b);assert b['state']=='terrified' and len(b['origins'])==2 and len(b['receipts'])==2,b
  assert len(b['live'])==2,b
  c=page.evaluate('window.__fearReload()');assert c['state']=='terrified' and len(c['origins'])==2,c
  d=page.evaluate('window.__fearRecover("two",10,false)');print('RECOVER TWO',d);assert d['state']=='afraid' and len(d['receipts'])==3,d
  e=page.evaluate('window.__fearRecover("one",1,true)');print('RECOVER ONE',e);assert e['state']=='steady' and len(e['receipts'])==4,e
  reload=page.evaluate('window.__fearReload()');assert reload['state']=='steady' and len(reload['receipts'])==4,reload
  assert len(set(reload['receipts']))==4,reload
  assert not errors,errors
  assert not dialogs,dialogs
  print('PASS: Chromium UI two Fear sources, individual recoveries, immutable global receipts, reload')
 except Exception:
  print('PAGE ERRORS',errors[-6:]);print('DIALOGS',dialogs[-6:]);traceback.print_exc();raise
 finally:browser.close()
