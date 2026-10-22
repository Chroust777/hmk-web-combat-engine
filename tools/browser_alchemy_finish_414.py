"""Chromium loaded persistent campaign with a genuine Skill Workbench-shaped witness."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json
root=Path(__file__).resolve().parents[1]
node=r'''
const fs=require('fs'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('./src/integration/hmk-alchemy-preparation.js'),S=require('./src/integration/hmk-skill-test-engine.js');
const start=A.createAlchemyStart({journal:[],campaignId:'C',minute:0,actorId:'a',alchemyML:80,elixirName:'Healing',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[2,3,4],timeOrigins:['manual','manual','manual']});
const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:15,svExtra:1});r.secondarySVBonus=1;
const proof={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[15],helpers:[],rollOrigins:['manual'],result:r};
const rows=[{id:'start',characterId:'a',calendarCampaignId:'C',campaignMinute:0,title:'Alchemy start',body:'Preparation',createdAt:'2026-10-22T00:00:00Z',calendarAlchemyStart:start},{id:'skill',characterId:'a',calendarCampaignId:'C',campaignMinute:start.dueMinute,title:'Alchemy skill',body:'Certified skill SV',createdAt:'2026-10-22T00:00:00Z',skillTestProof:proof}];
console.log(JSON.stringify({start,rows}));
'''
generated=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
start,rows=generated['start'],generated['rows']
fixture={'schemaVersion':1,'characters':[{'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}],
'items':[],'inventory':[],'trash':[],'journal':rows,
'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':start['dueMinute'],'label':'Alchemy finish','characterIds':['a'], 'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':start['dueMinute'],'reason':'GM approved work'}]}}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda msg:errors.append('console: '+msg.text) if msg.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 assert 'v93.416' in page.locator('#app').inner_text(),('boot',errors,page.locator('#app').inner_text()[:600])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(120)
 f=page.locator('[data-alchemy-finish]')
 assert f.count()==1,('finish form',errors,dialogs,page.locator('#app').inner_text()[-1600:])
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('[data-alchemy-roll-augment]').click()
 assert f.locator('input[name^="aug"]').count()==5
 f.locator('input[name="gmContinuityConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(200)
 assert not errors and not dialogs,(errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 proofs=[x['calendarAlchemyFinish'] for x in saved['journal'] if x.get('calendarAlchemyFinish')]
 assert len(proofs)==1,('finish missing',errors,dialogs)
 proof=proofs[0]
 assert proof['baseAS']==6+sum(x<=5 for x in proof['augmentationD10']),proof
 assert all(x=='cryptographic-software-die' for x in proof['augmentationOrigins']),proof
 assert saved['campaignClock']['minute']==start['dueMinute'],'Result moved GM time'
 assert not saved['inventory'],'Result invented item without ½lb vial'
 assert page.locator('[data-alchemy-finish]').count()==0,'Same roll can complete more than once'
 print('PASS Chromium: 5 actual Augmentation d10 dice, authentic cached Skill Workbench SV, AS derived, replayed immutable campaign record, no duplicated inventory or GM time')
 b.close()
