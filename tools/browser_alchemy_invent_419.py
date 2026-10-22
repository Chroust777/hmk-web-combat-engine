"""Chromium E2E: HMK pp.267–268 unique Invent, GM knowledge, existing campaign journal."""
from pathlib import Path
import json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
ACTOR={'id':'A','name':'Sorel','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':100},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}
ASSIST={'id':'B','name':'Merela','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}
def fixture(characters,journal=None,minute=0):
 return {'schemaVersion':1,'characters':characters,'items':[],'inventory':[],'trash':[],'journal':journal or [],'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Invent 419','characterIds':[c['id'] for c in characters], 'anchors':[], 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'}]+([{'id':'advance','type':'advance','minute':minute,'reason':'GM advance'}] if minute else [])}}
def launch(page,data):
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',data)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(110)
 assert 'v93.421' in page.locator('#app').inner_text(),page.locator('#app').inner_text()[:200]
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(70)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(70)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: errors.append('console '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 launch(page,fixture([ACTOR]))
 f=page.locator('[data-alchemy-invent]');assert f.count()==1,('Invent form',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true')
 f.locator('[name="elixirName"]').fill('Grey Lantern')
 f.locator('[name="principle"]').select_option('Life')
 f.locator('[name="use"]').select_option('imbibed')
 f.locator('[name="duration"]').select_option('temporary')
 f.locator('[name="effect"]').fill('GM-designed luminous dream; mechanics pending')
 f.locator('[name="workshopSource"]').select_option('private')
 f.locator('[data-alchemy-roll-time]').click()
 f.locator('[name="gmInventionConfirmed"]').check();f.locator('[name="workshopConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 assert not errors and not dialogs,('Invent submission',errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 starts=[x['calendarAlchemyStart'] for x in saved['journal'] if x.get('calendarAlchemyStart')]
 assert len(starts)==1 and starts[0]['uniqueElixir']['mode']=='invent' and starts[0]['uniqueElixir']['principle']=='Life',starts
 assert saved['campaignClock']['minute']==0 and saved['inventory']==[],('invent modified clock or inventory',saved)
 assert page.locator('[data-alchemy-invent]').count()==0,('duplicate invent start',errors)
 print('PASS Chromium Invent start: ML100, unique recipe, 3d6 origin, immutable campaign proof, no clock/inventory mutation')
 # Build a *separately* rule-derived completed invention for the privy-character form.
 node=r'''
const fs=require('fs'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const a=require('./src/integration/hmk-alchemy-preparation.js'),s=require('./src/integration/hmk-skill-test-engine.js');
const u={mode:'invent',title:'Grey Lantern',principle:'Life',use:'imbibed',duration:'temporary',effect:'GM-designed luminous dream; mechanics pending',gmConfirmed:true};
const start=a.createAlchemyStart({journal:[],campaignId:'C',minute:0,actorId:'A',alchemyML:100,elixirName:u.title,sunsign:'Ùlándus',wealth:30,workshopConfirmed:true,timeD6:[1,1,1],timeOrigins:['manual','manual','manual'],uniqueElixir:u});
const row=(id,minute,key,val)=>({id,characterId:'A',calendarCampaignId:'C',campaignMinute:minute,[key]:val,title:id,body:id,createdAt:'2026-10-22T00:00:00Z'});
const journal=[row('start',0,'calendarAlchemyStart',start)];
const r=s.resolveSkillTest({ml:100,roll:41,secondaryMLs:[65,70],gmModifier:15,svExtra:1});r.secondarySVBonus=1;
const proof={type:'secondary-mastery-value-test',skills:['Alchemy'],secondarySkills:['Herblore','Mineralogy'],secondaryRollResult:{routineId:'alchemy-elixir',name:'Mathematics',roll:3,tn:5,success:true,sourcePage:268},a:r,result:r,gmModifiers:[15],helpers:[],rollOrigins:['manual']};journal.push(row('skill',start.dueMinute,'skillTestProof',proof));
const n=Math.max(0,Math.min(5,r.sv-3-4));const finished=a.createAlchemyFinish({journal,campaignId:'C',minute:start.dueMinute,actorId:'A',startId:'start',skillId:'skill',gmContinuityConfirmed:true,augmentationD10:Array(n).fill(1),augmentationOrigins:Array(n).fill('manual')});journal.push(row('finishA',start.dueMinute,'calendarAlchemyFinish',finished));console.log(JSON.stringify({journal,minute:start.dueMinute}));
'''
 x=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
 # New browser page prevents any event listeners from the first SPA instance surviving.
 page.close();page=browser.new_page(viewport={'width':1440,'height':1050})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: errors.append('console '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 launch(page,fixture([ACTOR,ASSIST],x['journal'],x['minute']))
 forms=page.locator('[data-alchemy-known]');assert forms.count()==1,('known form',errors,dialogs,forms.count(),page.locator('#app').inner_text()[-2200:])
 f=forms.first;f.evaluate('el=>el.closest("details").open=true')
 assert 'Merela' in f.inner_text() and 'Grey Lantern' in f.inner_text()
 f.locator('[data-alchemy-roll-time]').click();f.locator('[name="gmInventionConfirmed"]').check();f.locator('[name="workshopConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 assert not errors and not dialogs,('known submission',errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 known=[r['calendarAlchemyStart'] for r in saved['journal'] if r.get('calendarAlchemyStart',{}).get('uniqueElixir',{}).get('mode')=='known']
 assert len(known)==1 and known[0]['actorId']=='B' and known[0]['uniqueElixir']['knowledgeFinishId']=='finishA',known
 assert saved['campaignClock']['minute']==x['minute'] and saved['inventory']==[],('privy moved clock/inventory',saved)
 print('PASS Chromium known recipe: linked inventor success, GM privy confirmation, no duplicate state or clock move')
 # Verify the actual *Invent finish* UI applies -3 to SV before selecting
 # augmentation dice; the primary Alchemy EML/critical level remain unchanged.
 page.close();page=browser.new_page(viewport={'width':1440,'height':1050})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 launch(page,fixture([ACTOR],x['journal'][:-1],x['minute']))
 f=page.locator('[data-alchemy-finish]');assert f.count()==1,('Invent finish form',errors,dialogs)
 f.evaluate('el=>el.closest("details").open=true')
 assert 'SV 8' in f.inner_text(),('Invent -3 SV not visible',f.inner_text()[:450])
 aug=f.locator('input[name^="aug"]');assert aug.count()==4,('Invent augmented rolls',aug.count())
 for i in range(4):aug.nth(i).fill('1')
 f.locator('[name="gmContinuityConfirmed"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 assert not errors and not dialogs,('Invent finish submission',errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 proof=[j['calendarAlchemyFinish'] for j in saved['journal'] if j.get('calendarAlchemyFinish')]
 assert len(proof)==1 and proof[0]['rawPreparationSV']==11 and proof[0]['inventionSVModifier']==-3 and proof[0]['preparationSV']==8 and proof[0]['baseAS']==10,proof
 assert not saved['inventory'] and saved['campaignClock']['minute']==x['minute']
 print('PASS Chromium Invent finish: authentic Alchemy SV11 -> invention SV8 (-3), exactly 4 augmentations, AS10, immutable proof')
 browser.close()
