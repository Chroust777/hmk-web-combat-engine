"""Chromium integration: attested Curative -> original Injury Healing Roll; GM-only time."""
from pathlib import Path
import re, subprocess, json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
text=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",text,re.S).group(1).replace('stimulant','curative')
js=js.replace('process.stdout.write(JSON.stringify(j));', '''
const {createHerbPotionAdministration}=require('./src/integration/hmk-herbal-administration.js');
const proof=createHerbPotionAdministration({journal:j,campaignId:c,minute:11,actorId:a,completeId:'completed',targetId:'patient',method:'poultice',woundId:'w-1',gmConfirmed:true,memberIds:[a,'patient']});
j.push(row('admin',11,'calendarHerbPotionAdminister',proof));
process.stdout.write(JSON.stringify(j));''')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
combat={'format':'hmk-persistent-combat-v1','shock':'NONE','bloodLoss':{'bp':0,'weaknessFatigue':0},'fatigue':{'windedness':0,'weariness':0,'otherWeakness':0},'wounds':[{'id':'w-1','location':'abdomen','severity':'S','level':2,'aspect':'e','bleeding':False,'nextAdvanceRound':None,'healed':False,'healing':{'treated':True,'healingRate':4,'nextHealingDay':5,'infectionPossible':True}}],'events':[],'lastRound':0,'shockOriginRound':None,'shockFollowup':None,'extendedShock':None,'coma':None,'bloodShockPending':False,'morale':{'state':'steady','psycheStress':0,'braveSince':None,'braveTimelineId':None},'mishaps':[],'posture':{'prone':False,'dropPending':False,'passNextTurn':False}}
clock={'format':'hmk-campaign-calendar-v1','campaignId':'A','minute':7200,'label':'Curative test','characterIds':['herbal-actor','patient'],'anchors':[{'kind':'wound','characterId':'patient','woundId':'w-1','minute':0,'source':'gm-attested','eventId':'origin-w'}],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'origin-w','type':'anchor','minute':0,'reason':'GM proved original injury minute'},{'id':'jump5','type':'advance','minute':7200,'reason':'GM advanced five days'}]}
fixture={'schemaVersion':1,'characters':[{'id':'herbal-actor','name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}},{'id':'patient','name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':13,'wil':13},'combatState':combat,'injuries':[{'id':'w-1','location':'abdomen','severity':'S','level':2,'bleeding':False,'combatRecord':True}], 'skills':[]}}],'items':[],'inventory':[],'trash':[],'journal':journal,'campaignClock':clock}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':950});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: errors.append('console: '+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(350)
 page.locator('[data-nav="encounter"]').first.click();page.wait_for_timeout(200)
 print('BEFORE',page.locator('#app').inner_text()[:450], 'ERR',errors);
 if page.locator('[data-action="encounter-all"]').count() and page.locator('[data-action="encounter-all"]').first.is_enabled():page.locator('[data-action="encounter-all"]').first.click();page.wait_for_timeout(250)
 body=page.locator('#app').inner_text()
 assert 'Curative · Patient / w-1: automatický +32' in body, ('missing Curative hint',body[-1800:],errors)
 form=page.locator('#hmk-healing-roll-form');assert form.count()==1
 form.locator('[name="wound"]').select_option('patient::w-1');form.locator('[name="daySinceInjury"]').fill('5');form.locator('[name="endurance"]').fill('13');form.locator('[name="will"]').fill('13');form.locator('[name="roll"]').fill('61');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(350)
 assert not errors,errors
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 patient=next(c for c in saved['characters'] if c['id']=='patient')
 events=patient['hmk']['combatState']['events']
 assert len(events)==1,('missing healing event',events,dialogs)
 detail=events[0]['details'];assert detail['herbalBonus']==32,detail
 assert detail['rawEML']==84,detail
 assert detail['herbalSourceIds']==['admin'],detail
 assert detail['roll']==61,detail
 assert patient['hmk']['combatState']['wounds'][0]['level']==1
 assert saved['campaignClock']['minute']==7200,'Healing advanced GM clock'
 print('PASS Chromium Curative -> original healing: EML84, SV source admin, d100=61, no GM-time movement')
 page.screenshot(path=str(root/'browser_curative_healing_395.png'))
 browser.close()
