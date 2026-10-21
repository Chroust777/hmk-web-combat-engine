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
const wilderness=createWildernessProof({source,journal:j,campaignId:c,minute:0,habitat:'mixed-forest',rolls:[5,5],targets:[{target:'herbs',herbName:'stimulant'},{target:'herbs',herbName:'stimulant'}],origin:'manual'});
j.push(row('source',0,'calendarTrekWildernessProof',wilderness));
validateTrekkingJournalEvidence({journal:j});validateWildernessJournal(j);
const assessed=createHerbPotency({journal:j,campaignId:c,minute:0,sourceId:'source',resultIndex:0,actorId:a,doses:[{potencyRoll:10,origin:'manual',decayRolls:[[6,6],[6,6],[6,6]]}]});j.push(row('assessed',0,'calendarHerbPotency',assessed));
const reserve=createSupplyUse({journal:j,campaignId:c,minute:0,sourceId:'source',resultIndex:0,unit:'herbDoses',quantity:1,actorId:a,disposition:'ingredient-reserved',purpose:'stimulant'});j.push(row('reserved',0,'calendarForagingSupplyUse',reserve));
const started=createHerbPotionStart({journal:j,campaignId:c,minute:0,actorId:a,reserveId:'reserved',herbType:'stimulant'});j.push(row('started',0,'calendarHerbPotionStart',started));
j.push(row('skill',10,'skillTestProof',{type:'secondary-mastery-value-test',skills:['Herblore'],a:{ml:70,sv:8,level:'S'}}));
const done=createHerbPotionComplete({journal:j,campaignId:c,minute:10,actorId:a,startId:'started',skillId:'skill',shelfD6:4});j.push(row('completed',10,'calendarHerbPotionComplete',done));
process.stdout.write(JSON.stringify(j));
'''
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
fixture={'schemaVersion':1,'characters':[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},{'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}}],
'items':[],'inventory':[],'trash':[],'journal':journal,'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':campaign,'minute':11,'label':'Potions','characterIds':[actor,target],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}}
fixture['inventory']=[{'id':'vial-real','characterId':actor,'sourceItemId':'hmk:gear:hmk-p121-075','snapshot':{'name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}},'quantity':1,'slot':'carried'}]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':1000});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}""",fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(140)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(140)
 form=page.locator('[data-herb-vial]');assert form.count()==1,('bottle form missing',dialogs,errors,page.locator('#app').inner_text()[-1800:])
 assert form.locator('[name="vialId"] option').count()==1
 form.locator('[name="confirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(300)
 assert not errors,errors;assert not dialogs,dialogs
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 bindings=[x for x in saved['journal'] if x.get('calendarHerbVialBinding')];assert len(bindings)==1,bindings
 assert bindings[0]['calendarHerbVialBinding']['vialId']=='vial-real'
 assert len(saved['inventory'])==1 and saved['inventory'][0]['quantity']==1
 assert saved['campaignClock']['minute']==11
 assert page.locator('[data-herb-vial]').count()==0,'Double bottle form still visible'
 discard=page.locator('[data-herb-vial-discard]');assert discard.count()==1,('missing discard',dialogs,errors)
 discard.locator('[name="reason"]').fill('Potion spilled on ground')
 discard.locator('[name="confirmed"]').check();discard.locator('[type="submit"]').click();page.wait_for_timeout(300)
 assert not errors,errors;assert not dialogs,dialogs
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 events=[x for x in saved['journal'] if x.get('calendarHerbVialDiscard')]
 assert len(events)==1,events
 assert not [x for x in saved['journal'] if x.get('calendarHerbPotionAdminister')]
 assert saved['inventory'][0]['id']=='vial-real'
 assert page.locator('[data-herb-admin]').count()==0,'Discarded dose should not be offered'
 assert saved['campaignClock']['minute']==11
 print('PASS Chromium: discard contents with GM reason, intact empty vial, no administration, no GM time movement')
 browser.close()
