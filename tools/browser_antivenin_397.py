from pathlib import Path
import json,os,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
actor='herbal-actor';target='patient';campaign='A'
# A genuine replay-valid potion completion from the existing proof engine.
js=r'''
const fs=require('fs'),path=require('path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotency,createHerbPotionStart,createHerbPotionComplete}=require('./src/integration/hmk-herbal-concoctions.js');
const {createSupplyUse}=require('./src/integration/hmk-foraging-supply-ledger.js');
const {createOrienteeringContext}=require('./src/integration/hmk-trekking-orienteering.js');
const {trekWeatherDay,trekWeatherWatch,trekWatchMovement,trekHazards,trekEncounterCheck,validateTrekkingJournalEvidence}=require('./src/integration/hmk-trekking-routine.js');
const {trekkingSkillLinkForNewProof}=require('./src/integration/hmk-trekking-handoff.js');
const {createWildernessProof,validateWildernessJournal}=require('./src/integration/hmk-trekking-wilderness-tasks.js');
const c='A',a='herbal-actor';const row=(id,m,field,p)=>({id,characterId:a,calendarCampaignId:c,campaignMinute:m,createdAt:'2026-10-20T00:00:00.000Z',title:'Verified HMK test',body:'Doložený původ testu', [field]:p});
let j=[];
const context=createOrienteeringContext({partySize:1,stationaryForaging:true});
const weatherDay=trekWeatherDay({season:'summer',climate:'cool',landscape:'flat',alpine:false,aridDesert:false,temperatureD10:5,precipitationD10:10});
const weatherWatch=trekWeatherWatch(weatherDay,{night:false,pavedRoad:false});
const modes={progress:0,bearing:0,foraging:2,stalking:0,vigilance:0,lax:false,orienteeringSlow:0,manualSlow:0,slow:0,loaded:false,doubleTime:false,progressD10:[],directionD10:[],environ:'wilderness',wildernessNightWatches:0};
const movement=trekWatchMovement({stationaryForaging:true,topography:'flat',terrain:'mixed-forest',conveyance:'foot',progress:0,slow:0,loaded:false,bearing:0,progressD10:[],doubleTime:false,continuousPrecipitation:false});
const hazards=trekHazards({bearingDeficit:movement.bearingDeficit,directionD10:[]});
const encounter=trekEncounterCheck({environ:'wilderness',night:false,roll:10,elapsedWildernessNightWatches:0});
const trek={format:'hmk-trekking-watch-evidence-v1',campaignMinute:0,dayIndex:0,area:'Forest',landscape:'flat',climate:'cool',season:'summer',alpine:false,aridDesert:false,dayAlready:false,night:false,
 terrain:'mixed-forest',conveyance:'foot',orienteeringContext:context,weatherDay,weatherWatch,modes,movement,hazards,encounter,rolls:[{faces:10,label:'Daily Temperature',value:5,origin:'manual'},{faces:10,label:'Daily Precipitation',value:10,origin:'manual'},{faces:10,label:'Random Encounter',value:10,origin:'manual'}]};
const source=row('trek',0,'calendarTrekProof',trek);j.push(source);
const skillProof={type:'secondary-mastery-value-test',skills:['Survival'],a:{ml:80,sv:5,level:'S'}};
const link=trekkingSkillLinkForNewProof({pending:{sourceId:'trek',hazard:'survival'},source,actorId:a,campaignId:c,minute:0,proof:skillProof});
if(!link)throw Error('No linked Survival');j.push({...row('orienteering',0,'skillTestProof',skillProof),calendarTrekSkillSource:link});
const wilderness=createWildernessProof({source,journal:j,campaignId:c,minute:0,habitat:'mixed-forest',rolls:[5,5],targets:[{target:'herbs',herbName:'antivenin'},{target:'herbs',herbName:'antivenin'}],origin:'manual'});
j.push(row('source',0,'calendarTrekWildernessProof',wilderness));
validateTrekkingJournalEvidence({journal:j});validateWildernessJournal(j);
const assessed=createHerbPotency({journal:j,campaignId:c,minute:0,sourceId:'source',resultIndex:0,actorId:a,doses:[{potencyRoll:10,origin:'manual',decayRolls:[[6,6],[6,6],[6,6]]}]});j.push(row('assessed',0,'calendarHerbPotency',assessed));
const reserve=createSupplyUse({journal:j,campaignId:c,minute:0,sourceId:'source',resultIndex:0,unit:'herbDoses',quantity:1,actorId:a,disposition:'ingredient-reserved',purpose:'antivenin'});j.push(row('reserved',0,'calendarForagingSupplyUse',reserve));
const started=createHerbPotionStart({journal:j,campaignId:c,minute:0,actorId:a,reserveId:'reserved',herbType:'antivenin'});j.push(row('started',0,'calendarHerbPotionStart',started));
j.push(row('skill',10,'skillTestProof',{type:'secondary-mastery-value-test',skills:['Herblore'],a:{ml:70,sv:8,level:'S'}}));
const done=createHerbPotionComplete({journal:j,campaignId:c,minute:10,actorId:a,startId:'started',skillId:'skill',shelfD6:4});j.push(row('completed',10,'calendarHerbPotionComplete',done));
const {initialCombatState}=require('./src/integration/persistent-combat-state.js');
const {preparePoisonStart,preparePoisonOnset}=require('./src/integration/hmk-poison-course.js');
const poisoned={id:'patient',hmk:{attributes:{end:12,wil:10}}};let state=initialCombatState();
state=preparePoisonStart({actor:poisoned,state,sourceId:'venom-1',transmission:'vector',onsetMinutes:10,periodMinutes:10,initialHR:4,symptomD10s:[1,2,3,4],round:1,actualExposureConfirmed:true,gmConfirmed:true}).state;
state=preparePoisonOnset({actor:poisoned,state,sourceId:'venom-1',elapsedMinutes:10,round:1,gmConfirmed:true}).state;
process.stdout.write(JSON.stringify({journal:j,state}));
'''
payload=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True));journal=payload['journal']
fixture={'schemaVersion':1,'characters':[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},{'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'wil':10},'skills':[],'combatState':payload['state']}}],
'items':[],'inventory':[],'trash':[],'journal':journal,'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':campaign,'minute':15,'label':'Potions','characterIds':[actor,target],'anchors':[{'kind':'poison','characterId':target,'minute':0,'source':'confirmed-combat','eventId':'poison-anchored','combatEventId':'poison:venom-1'}],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':15,'reason':'GM'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':950});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: errors.append('console: '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(250)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(150)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(150)
 admin=page.locator('[data-herb-admin]')
 assert admin.count()==1,('missing form',page.locator('#app').inner_text()[-1500:],dialogs,errors)
 admin.locator('[name="targetRef"]').select_option(target+'::venom-1')
 admin.locator('[name="gmConfirmed"]').check()
 admin.locator('[type="submit"]').click();page.wait_for_timeout(400)
 assert not errors,errors
 assert not dialogs,dialogs
 assert page.locator('[data-herb-admin]').count()==0,'A previously administered potion remains available'
 text=page.locator('#app').inner_text();assert 'Patient' in text and 'antivenin' in text
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 events=[j for j in saved['journal'] if 'calendarHerbPotionAdminister' in j]
 assert len(events)==1,len(events)
 assert events[0]['calendarHerbPotionAdminister']['targetId']==target
 assert events[0]['calendarHerbPotionAdminister']['poisonSourceId']=='venom-1'
 assert saved['campaignClock']['minute']==15,'Administration advanced GM time'
 print('PASS Chromium: prepared Antivenin -> selected Poison episode; single audit proof, no JS errors, no GM clock change')
 page.screenshot(path=str(root/'browser_antivenin_397.png'))
 browser.close()
