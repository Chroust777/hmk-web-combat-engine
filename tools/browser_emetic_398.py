"""Browser test v93.398: actual Emetic administration and real persistent Shock form.
The due-round browser instance uses a replay-valid source + attested Initiative
checkpoint, never an invented Shock roll or overwritten character state.
"""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
base=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",base,re.S).group(1).replace('stimulant','emetic')
make_sequence='''
const fs=require('fs'),path=require('path');let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createEncounterSequence}=require('./src/integration/encounter-turn-sequence.js');
const {initialCombatState}=require('./src/integration/persistent-combat-state.js');
const roster=[{id:'herbal-actor',name:'Herbalist',isPC:true,initiativeML:65,awarenessEML:50},
 {id:'patient',name:'Patient',isPC:true,initiativeML:55,awarenessEML:45}];
const sequence=createEncounterSequence({roster,round:1,timelineId:'fight-emetic-398'});
process.stdout.write(JSON.stringify({sequence,state:initialCombatState()}));
'''
payload=json.loads(subprocess.check_output(['node','-e',make_sequence],cwd=root,text=True))
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
actor='herbal-actor';patient='patient';campaign='A';timeline='fight-emetic-398'
char=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[{'id':'init1','name':'Initiative','ml':65},{'id':'aw1','name':'Awareness','ml':50}]}},
 {'id':patient,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[{'id':'shock','name':'Shock','ml':65},{'id':'init2','name':'Initiative','ml':55},{'id':'aw2','name':'Awareness','ml':45}], 'injuries':[],'combatState':payload['state']}}]
clock={'format':'hmk-campaign-calendar-v1','campaignId':campaign,'minute':11,'label':'Emetic','characterIds':[actor,patient],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}
def fixture(rows,round_number):
 seq=json.loads(json.dumps(payload['sequence']));seq['round']=round_number
 return {'schemaVersion':1,'characters':char,'items':[],'inventory':[],'trash':[],'journal':rows,'campaignClock':clock,
  'combatRuntime':{'version':1,'timelineId':timeline,'participants':[actor,patient],
   'sequence':seq,'clock':{'round':round_number,'actorId':''},'inClosePairs':[]}}
def setup(browser,fix):
 page=browser.new_page(viewport={'width':1500,'height':950});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fix)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 return page,errors,dialogs
def saved(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 # First: genuine browser administration of a completed, proven potion.
 page,errors,dialogs=setup(browser,fixture(journal,1))
 admin=page.locator('[data-herb-admin]');assert admin.count()==1,('No Emetic form',dialogs,errors)
 admin.locator('[name="targetRef"]').select_option(patient)
 admin.locator('[name="emeticOnsetD6"]').fill('3')
 admin.locator('[name="combatAnchorConfirmed"]').check()
 admin.locator('[name="gmConfirmed"]').check()
 admin.locator('[type="submit"]').click();page.wait_for_timeout(350)
 stage=saved(page);admins=[j for j in stage['journal'] if j.get('calendarHerbPotionAdminister')]
 assert len(admins)==1,('Emetic administration missing',dialogs,errors)
 proof=admins[0]['calendarHerbPotionAdminister']
 assert proof['emeticOnsetD6']==3 and proof['combatAnchor']['round']==1,proof
 assert stage['campaignClock']['minute']==11
 assert not errors,(errors,dialogs)
 print('PASS Chromium: actual Emetic administration d6=3, round 1, one permanent source, no GM clock movement')
 page.close()
 # Second: replay same persisted source at a confirmed Initiative checkpoint
 # for the actual due round. Only the test fixture fast-forwards Initiative;
 # the UI itself is tested for the real shock commit and replay validation.
 page,errors,dialogs=setup(browser,fixture(stage['journal'],4))
 form=page.locator('[data-herb-emetic-shock]')
 assert form.count()==1,('No due Shock form',dialogs,errors,page.locator('#app').inner_text()[-1000:])
 form.locator('[name="d100"]').fill('40');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click()
 page.wait_for_timeout(350)
 out=saved(page);shocks=[j for j in out['journal'] if j.get('calendarHerbEmeticShock')]
 assert len(shocks)==1,('No Emetic Shock commit',dialogs,errors)
 assert shocks[0]['calendarHerbEmeticShock']['newShock']=='UNC',shocks
 assert out['characters'][1]['hmk']['combatState']['shock']=='UNC'
 assert out['characters'][1]['hmk']['combatState']['shockFollowup']['dueRound']==124
 assert out['campaignClock']['minute']==11
 assert not errors,(errors,dialogs)
 page.screenshot(path=str(root/'browser_emetic_398.png'))
 print('PASS Chromium: original Shock d100=40, SHK9->UNC; combat state and mandatory recovery stored, single journal proof, GM time unchanged')
 browser.close()
