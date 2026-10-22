"""Real Chromium: HMK p.268 30-day Alchemy Decay and persistent journal."""
from pathlib import Path
import subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
node=r'''
const fs=require('fs'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('./src/integration/hmk-alchemy-preparation.js'),S=require('./src/integration/hmk-skill-test-engine.js'),D=require('./src/integration/hmk-alchemy-decay.js');
const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:'a',alchemyML:80,elixirName:'Healing',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[2,3,4],timeOrigins:['manual','manual','manual']});
const r=S.resolveSkillTest({ml:80,roll:41,secondaryMLs:[70,65],gmModifier:15,svExtra:1});r.secondarySVBonus=1;
const proof={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:4,tn:5,success:true,sourcePage:268},a:r,gmModifiers:[15],helpers:[],rollOrigins:['manual'],result:r};
const rows=[{id:'start',characterId:'a',calendarCampaignId:'C',campaignMinute:0,title:'Alchemy start',body:'Preparation',createdAt:'2026-10-22T00:00:00Z',calendarAlchemyStart:start},{id:'skill',characterId:'a',calendarCampaignId:'C',campaignMinute:start.dueMinute,title:'Alchemy skill',body:'Certified skill SV',createdAt:'2026-10-22T00:00:00Z',skillTestProof:proof}];
const n=Math.min(5,Math.max(0,r.sv-4));const aug=Array(n).fill(10);
const finish=A.createAlchemyFinish({journal:rows,campaignId:'C',minute:start.dueMinute,actorId:'a',startId:'start',skillId:'skill',gmContinuityConfirmed:true,augmentationD10:aug,augmentationOrigins:aug.map(()=>'manual')});
rows.push({id:'finish',characterId:'a',calendarCampaignId:'C',campaignMinute:start.dueMinute,title:'Alchemy complete',body:'AS6',createdAt:'2026-10-22T00:00:00Z',calendarAlchemyFinish:finish});
console.log(JSON.stringify({rows,first:start.dueMinute+30*1440,finished:start.dueMinute}));
'''
fixture=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
assert fixture['rows'][-1]['calendarAlchemyFinish']['baseAS']==6
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for case,baseRows,minute,dice,expected in [
  ('success',fixture['rows'],fixture['first'],6,5),
  ('failure',fixture['rows'],fixture['first'],10,4),
 ]:
  data={'schemaVersion':1,'characters':[{'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}],
   'items':[],'inventory':[],'trash':[],'journal':baseRows,
   'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Alchemy Decay','characterIds':['a'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM approved thirty days'}]}}
  page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
  assert 'v93.424' in page.locator('#app').inner_text(),('boot',errors,page.locator('#app').inner_text()[:600])
  page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(80)
  if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
  f=page.locator('[data-alchemy-decay]');assert f.count()==1,('form',case,errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  f.locator('input[name="d10"]').fill(str(dice))
  f.locator('input[name="gmConfirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(160)
  assert not errors and not dialogs,(case,errors,dialogs)
  saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
  proofs=[x['calendarAlchemyDecay'] for x in saved['journal'] if x.get('calendarAlchemyDecay')]
  assert len(proofs)==1,(case,'missing decay',saved['journal'][-2:])
  event=proofs[0]
  assert event['asBefore']==6 and event['asAfter']==expected and event['d10']==dice and event['origin']=='manual',event
  assert event['success']==(case=='success'),event
  assert saved['campaignClock']['minute']==minute and not saved['inventory'],(case,'clock/inventory mutated')
  assert page.locator('[data-alchemy-decay]').count()==0,('double-use decay',case)
  assert page.locator('[data-alchemy-decay]').count()==0,('decay no longer due after save',case)
  print('PASS Chromium Alchemy Decay '+case+': authentic completion, physical time 30d, AS '+str(expected)+', immutable proof, no extra inventory or time')
  page.close()
 browser.close()
