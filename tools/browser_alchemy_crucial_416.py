"""Chromium, app UI → Alchemy Crucial Dissolution → persistent Combat/Journal.
Use original GM calendar and *no* invented time advance or combat turn.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json
root=Path(__file__).resolve().parents[1]
node=r'''
const fs=require('fs'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const A=require('./src/integration/hmk-alchemy-preparation.js'),S=require('./src/integration/hmk-skill-test-engine.js');
const start=A.createAlchemyStart({campaignId:'C',minute:0,actorId:'a',alchemyML:80,elixirName:'Healing',sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[2,3,4],timeOrigins:['manual','manual','manual']});
const r=S.resolveSkillTest({ml:80,roll:100,secondaryMLs:[70,65],gmModifier:15,svExtra:0});r.secondarySVBonus=0;
const proof={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:9,tn:5,success:false,sourcePage:268},a:r,gmModifiers:[15],helpers:[],rollOrigins:['manual'],result:r};
const rows=[{id:'start',characterId:'a',calendarCampaignId:'C',campaignMinute:0,title:'Alchemy start',body:'Preparation',createdAt:'2026-10-22T00:00:00Z',calendarAlchemyStart:start},{id:'skill',characterId:'a',calendarCampaignId:'C',campaignMinute:start.dueMinute,title:'Alchemy skill',body:'Certified skill SV',createdAt:'2026-10-22T00:00:00Z',skillTestProof:proof}];
console.log(JSON.stringify({start,rows}));
'''
base=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
start,rows=base['start'],base['rows']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for label,dis,roll,result in [('stunned',5,40,'STN'),('incapacitated',5,42,'INC'),('unconscious',5,98,'UNC'),('dead',5,95,'KIA'),('serious',75,55,'KIA')]:
  fixture={'schemaVersion':1,'characters':[{'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50},{'id':'shock','name':'Shock','ml':65}]}}], 'items':[],'inventory':[],'trash':[],'journal':rows,'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':start['dueMinute'],'label':'Alchemy Crucial', 'characterIds':['a'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':start['dueMinute'],'reason':'GM approved work'}]}}
  page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
  assert 'v93.432' in page.locator('#app').inner_text(),('boot',errors,page.locator('#app').inner_text()[:600])
  page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(80)
  if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
  f=page.locator('[data-alchemy-finish]');assert f.count()==1,('form',label,errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true')
  assert f.get_attribute('data-alchemy-shock-ml')=='65',('Shock ML',label)
  f.locator('input[name="cfWillD10"]').fill('9')
  f.locator('input[name="dissolutionD100"]').fill(str(dis))
  f.locator('input[name="crucialShockD100"]').fill(str(roll))
  f.locator('input[name="gmContinuityConfirmed"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(250)
  assert not errors and not dialogs,(label,errors,dialogs)
  saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
  proofs=[e['calendarAlchemyFinish'] for e in saved['journal'] if e.get('calendarAlchemyFinish')]
  assert len(proofs)==1,(label,'missing finish',saved['journal'][-2:])
  proof=proofs[0];c=saved['characters'][0];clock=saved['campaignClock']
  assert proof['result']=='ruined-by-dissolution' and proof['baseAS'] is None,proof
  assert proof['criticalFailure']['crucialDissolution'] and proof['criticalFailure']['shockRoll']['state']==result,proof
  levels=1 if dis<=60 else 3 if dis<=90 else 5
  assert c['hmk']['arcane']['auralShockLevels']==levels,c
  assert c['hmk']['combatState']['fatigue']['otherWeakness']==5*levels,c
  assert c['hmk']['combatState']['shock']==result,c
  assert c['hmk']['combatState']['lastRound']==0,'created an invented round'
  assert len([a for a in clock['anchors'] if a['kind']=='aural'])==1,clock
  assert c['hmk']['combatState']['events'][-1]['details']['crucialShock']['d100']==roll,c
  if result in ('STN','INC','UNC'):
   assert c['hmk']['combatState']['shockFollowup']['kind']==result,'missing obligatory recovery'
  else:assert c['hmk']['combatState']['shockFollowup'] is None
  assert clock['minute']==start['dueMinute'] and not saved['inventory'],(label,clock,saved['inventory'])
  assert page.locator('[data-alchemy-finish]').count()==0,'duplicate CF finish'
  print('PASS Chromium Crucial '+label+': persisted '+result+', AS ruined, aural/fatigue, recovery/terminal, immutable dice, shared GM clock')
  page.close()
 browser.close()
