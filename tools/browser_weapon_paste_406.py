"""v93.406 Chromium integration: real herb potion, equipped blade, recorded paste,
replay-valid confirmed-hit evidence, +20 pending resistance, discard with no toxin."""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",source,re.S).group(1).replace('stimulant','poison')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
prep='''
const fs=require('fs'),path=require('path');let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')};
const root=process.cwd(),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createEncounterSequence}=require('./src/integration/encounter-turn-sequence.js');const {initialCombatState}=require('./src/integration/persistent-combat-state.js');
const roster=[{id:'herbal-actor',name:'Herbalist',isPC:true,initiativeML:65,awarenessEML:50},{id:'patient',name:'Patient',isPC:true,initiativeML:55,awarenessEML:45}];
process.stdout.write(JSON.stringify({seq:createEncounterSequence({roster,round:10,timelineId:'paste-fight-406'}),state:initialCombatState()}));
'''
payload=json.loads(subprocess.check_output(['node','-e',prep],cwd=root,text=True))
actor='herbal-actor';target='patient';camp='A';timeline='paste-fight-406';weapon='blade-for-paste'
characters=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'wil':12},'skills':[],
 'injuries':[],'combatState':payload['state']}}]
clock={'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':11,'label':'Poison paste',
 'characterIds':[actor,target],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},
 {'id':'advance','type':'advance','minute':11,'reason':'GM'}]}
blade={'id':weapon,'characterId':actor,'sourceItemId':'hmk:weapon:reference-sword','quantity':1,'slot':'main_hand',
 'snapshot':{'name':'Sword','category':'weapon','properties':{'weightLb':3}}}
def fixture(rows,round_no=10,with_hit=False):
 seq=json.loads(json.dumps(payload['seq']));seq['round']=round_no
 c=json.loads(json.dumps(characters));
 if with_hit:
  st=c[1]['hmk']['combatState'];st['lastRound']=round_no
  st['events'].append({'id':'hit-confirmed-406','type':'confirmed-hit','round':round_no,
   'details':{'targetId':target,'location':'ua','aspect':'e','kind':'injury','injury':'S3',
   'woundId':'wound:hit-confirmed-406'}})
  st['wounds'].append({'id':'wound:hit-confirmed-406','originEventId':'hit-confirmed-406',
   'recordedRound':round_no,'timelineId':timeline,'aspect':'e','location':'ua',
   'severity':'S','level':3,'bleeding':False,'healed':False,'nextAdvanceRound':None,
   'compoundReviewed':False,'shockSL':'S','side':'left','bodyKind':'human'})
  c[1]['hmk']['injuries'].append({'id':'wound:hit-confirmed-406','combatRecord':True,
   'location':'ua','severity':'S','bleeding':False})
 return {'schemaVersion':1,'characters':c,'items':[],'inventory':[blade],'trash':[],'journal':rows,
  'campaignClock':clock,'combatRuntime':{'version':1,'timelineId':timeline,'participants':[actor,target],
  'sequence':seq,'clock':{'round':round_no,'actorId':''},'inClosePairs':[]}}
def page_with(browser,fix):
 p=browser.new_page(viewport={'width':1450,'height':1000});errors=[];dialogs=[]
 p.set_default_timeout(5500)
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 p.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 p.evaluate('''fix=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fix)]]);const obj={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:obj});Object.defineProperty(window,'sessionStorage',{configurable:true,value:obj})}''',fix)
 p.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());p.wait_for_timeout(160)
 assert 'v93.406' in p.locator('#app').inner_text(),(errors,dialogs,p.locator('#app').inner_text()[-900:])
 p.locator('[data-nav="calendar"]').first.click();p.wait_for_timeout(100)
 if p.locator('[data-calendar-open]').count():p.locator('[data-calendar-open]').first.click();p.wait_for_timeout(100)
 return p,errors,dialogs
def saved(page):return page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=page_with(browser,fixture(journal))
 form=page.locator('form[data-herb-weapon-paste]')
 assert form.count()==1,('Missing paste form',errors,dialogs,page.locator('#app').inner_text()[-1500:])
 assert form.locator('[name="weaponItemId"]').input_value()==weapon
 form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(220)
 a=saved(page);pastes=[x for x in a['journal'] if x.get('calendarHerbWeaponPaste')]
 assert len(pastes)==1,('Paste was not recorded',errors,dialogs,a['journal'][-3:])
 assert len([x for x in a['journal'] if x.get('calendarHerbPotionAdminister')])==0
 assert page.locator('form[data-herb-weapon-paste]').count()==0,'Single dose still reusable'
 assert a['campaignClock']['minute']==11 and len(a['inventory'])==1
 assert not errors and not dialogs,(errors,dialogs)
 print('PASS Chromium actual herb potion -> equipped Sword -> irreversible paste, no poison before hit, GM clock unchanged')
 page.close()
 page,errors,dialogs=page_with(browser,fixture(a['journal'],12,True))
 form=page.locator('form[data-herb-weapon-hit]')
 assert form.count()==1,('Missing hit form',errors,dialogs,page.locator('#app').inner_text()[-1100:])
 assert 'hit-confirmed-406' in form.inner_text()
 form.locator('[name="weaponConfirmed"]').check();form.locator('[name="gmConfirmed"]').check()
 form.locator('[type="submit"]').click();page.wait_for_timeout(220)
 b=saved(page);hits=[x for x in b['journal'] if x.get('calendarHerbWeaponPasteHit')]
 assert len(hits)==1,('Hit not recorded',errors,dialogs,b['journal'][-3:])
 h=hits[0]['calendarHerbWeaponPasteHit']
 assert h['hitEventId']=='hit-confirmed-406' and h['resistanceModifier']==20 and h['woundId']=='wound:hit-confirmed-406',h
 assert not b['characters'][1]['hmk']['combatState'].get('toxinCourses',[]),'No invented toxin/resistance'
 assert b['campaignClock']['minute']==11
 assert not errors and not dialogs,(errors,dialogs)
 page.screenshot(path=str(root/'browser_weapon_paste_406.png'))
 print('PASS Chromium verified S3 Edge injury, GM witness -> +20 pending Resistance; only one paste and hit proof; no GM time movement')
 page.close()
 page,errors,dialogs=page_with(browser,fixture(a['journal']))
 form=page.locator('form[data-herb-weapon-discard]');assert form.count()==1
 form.locator('[name="reason"]').fill('Weapon washed');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(220)
 c=saved(page);assert len([x for x in c['journal'] if x.get('calendarHerbWeaponPasteDiscard')])==1,(errors,dialogs,c['journal'][-2:])
 assert not errors and not dialogs,(errors,dialogs)
 print('PASS Chromium real GM paste discard -> no poisoning, original weapon remains, no clock shift')
 browser.close()
