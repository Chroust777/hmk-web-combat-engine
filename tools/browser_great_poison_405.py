"""Great Poison v93.405: real browser administration and due-round onset; documented checkpoint."""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",source,re.S).group(1).replace('stimulant','poison')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
prep='''
const fs=require('fs'),path=require('path');let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createEncounterSequence}=require('./src/integration/encounter-turn-sequence.js');
const {initialCombatState}=require('./src/integration/persistent-combat-state.js');
const roster=[{id:'herbal-actor',name:'Herbalist',isPC:true,initiativeML:65,awarenessEML:50},
 {id:'patient',name:'Patient',isPC:true,initiativeML:55,awarenessEML:45}];
process.stdout.write(JSON.stringify({seq:createEncounterSequence({roster,round:1,timelineId:'fight-great-405'}),state:initialCombatState()}));
'''
payload=json.loads(subprocess.check_output(['node','-e',prep],cwd=root,text=True))
camp='A';actor='herbal-actor';target='patient';timeline='fight-great-405'
characters=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[{'id':'init1','name':'Initiative','ml':65},{'id':'aw1','name':'Awareness','ml':50}]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'wil':12},'skills':[{'id':'init2','name':'Initiative','ml':55},{'id':'aw2','name':'Awareness','ml':45}],
  'injuries':[],'combatState':payload['state']}}]
clock={'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':11,'label':'Great Poison','characterIds':[actor,target],
 'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}
def fixture(rows,round_num):
 seq=json.loads(json.dumps(payload['seq']));seq['round']=round_num
 return {'schemaVersion':1,'characters':characters,'items':[],'inventory':[],'trash':[],'journal':rows,'campaignClock':clock,
  'combatRuntime':{'version':1,'timelineId':timeline,'participants':[actor,target],
   'sequence':seq,'clock':{'round':round_num,'actorId':''},'inClosePairs':[]}}
def setup(browser,fix):
 print('new page',flush=True);page=browser.new_page(viewport={'width':1450,'height':1050});errors=[];dialogs=[]
 page.set_default_timeout(3500);page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fix)
 print('add bundle',flush=True);page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(160);print('bundle done',flush=True)
 assert 'v93.405' in page.locator('#app').inner_text(),(errors,dialogs,page.locator('#app').inner_text()[-1000:])
 print('calendar click',flush=True);page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(90)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 return page,errors,dialogs
def saved(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=setup(browser,fixture(journal,1))
 print('admin form',flush=True);admin=page.locator('[data-herb-admin]')
 assert admin.count()==1,(errors,dialogs,'No Great potion',page.locator('#app').inner_text()[-1200:])
 assert 'Great Poison HR4' in admin.inner_text(),admin.inner_text()
 admin.locator('[name="targetRef"]').select_option(target)
 admin.locator('[name="combatAnchorConfirmed"]').check();admin.locator('[name="gmConfirmed"]').check()
 # onset dice are confirmed later, when the symptoms actually begin.
 admin.locator('[type="submit"]').click();page.wait_for_timeout(250)
 a=saved(page);application=[j for j in a['journal'] if j.get('calendarHerbPotionAdminister')]
 assert len(application)==1,(application,dialogs,errors)
 src=application[0]['calendarHerbPotionAdminister']
 assert src['poisonGreatTracked'] is True and src['combatAnchor']['round']==1,src
 assert not any(j.get('calendarHerbGreatPoisonOnset') for j in a['journal'])
 assert not a['characters'][1].get('hmk',{}).get('combatState',{}).get('toxinCourses'), 'Premature toxin'
 assert a['campaignClock']['minute']==11
 assert not errors and not dialogs,(errors,dialogs)
 due=1+15-src['sv'];print('PASS Chromium Great Poison: real consumed dose, anchored to round 1, future onset round',due,'no premature toxin, no clock shift')
 page.close()
 # Strictly test the REAL due-round UI against a persisted, replay-valid source.
 page,errors,dialogs=setup(browser,fixture(a['journal'],due))
 form=page.locator('[data-herb-great-poison-onset]')
 assert form.count()==1,('No due form',dialogs,errors,page.locator('#app').inner_text()[-1800:])
 form.locator('[name="periodMinutes"]').fill('20')
 for i,k in enumerate((1,2,3,4),1):form.locator(f'[name="symptom{i}"]').fill(str(k))
 form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(300)
 b=saved(page);proof=[j for j in b['journal'] if j.get('calendarHerbGreatPoisonOnset')]
 assert len(proof)==1,('No onset proof',dialogs,errors,b['journal'][-3:])
 row=proof[0]['calendarHerbGreatPoisonOnset'];assert row['dueRound']==due and row['initialHR']==4,row
 state=b['characters'][1]['hmk']['combatState'];course=state['toxinCourses'][0]
 assert course['status']=='active' and course['initialHR']==4 and course['onsetMinutes']==0,course
 assert len([x for x in state['events'] if x['type']=='poison-onset'])==1,state['events']
 assert b['campaignClock']['minute']==11,'Moved clock'
 assert not errors and not dialogs,(errors,dialogs)
 page.screenshot(path=str(root/'browser_great_poison_405.png'))
 print('PASS Chromium Great Poison: due round',due,'-> original HR4 Poison Course ACTIVE + real provenance, no extra dice or GM time')
 browser.close()
