from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
mods['app.js']+='''
window.__auditWounds93793=()=>{
 const H=require('./src/integration/persistent-combat-state.js'),G=require('./src/integration/hmk-gm-health-override.js');
 const c={id:'pc-journal',name:'Journal Test',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12},skills:[],healthState:H.initialCombatState(),injuries:[]}};
 const reason='GM skutečně ověřil odlišnou anatomickou lokalitu';
 for(const [loc,id] of [['ha','gm-ha-93793'],['fo','gm-fo-93793'],['ha','gm-ha2-93793']]){
  const r=G.prepareGMHealthOverride({state:c.hmk.healthState,action:'add',eventId:id,reason,gmConfirmed:true,location:loc,side:'left',level:1,aspect:'blunt'});c.hmk.healthState=r.state;
 }
 const [w1,w2,w3]=c.hmk.healthState.wounds;
 // Mirror of an authoritative injury with the SAME ID is not another wound.
 c.hmk.injuries=[{id:w1.id,location:w1.location,side:w1.side,severity:w1.severity,level:w1.level,aspect:w1.aspect,description:'legacy echo'}];
 data=clean();data.characters=[c];data.inventory=[];selected=c.id;
 const html=journalBodyLocationsHTML(c);const mount=document.createElement('div');mount.id='journal-proof-93793';mount.innerHTML=html;document.body.append(mount);
 return {ids:c.hmk.healthState.wounds.map(w=>w.id),locations:c.hmk.healthState.wounds.map(w=>w.location),healthCount:c.hmk.healthState.wounds.length,legacyCount:c.hmk.injuries.length,rendered:mount.querySelectorAll('.journal-wound-meaning').length,visible:mount.querySelectorAll('.journal-injuries').length};
};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote']);page=b.new_page(viewport={'width':1600,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{value:x,configurable:true});Object.defineProperty(window,'sessionStorage',{value:x,configurable:true})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 try:
  actual=page.evaluate('window.__auditWounds93793()');print('IDENTITY',actual,flush=True)
  assert actual['healthCount']==3 and actual['legacyCount']==1 and len(set(actual['ids']))==3,actual
  assert actual['rendered']==3,'Original mirror with same wound ID was rendered twice: '+str(actual)
  assert actual['locations']==['ha','fo','ha'],'Unexpected actual wounds'
  entries=page.locator('#journal-proof-93793 .journal-wound-meaning');assert entries.count()==3
  # Two different same-location wounds must not be silently merged.
  assert page.locator('#journal-proof-93793 .journal-injuries').count()>=15
  assert not errors,errors
  print('PASS Chromium journal anatomy: 3 real IDs including 2 same-location wounds, 1 legacy mirror ID ignored, none duplicated',flush=True)
 except BaseException:
  print('ERROR',errors);traceback.print_exc();raise
 finally:b.close()
