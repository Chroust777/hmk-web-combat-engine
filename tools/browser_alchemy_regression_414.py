"""Real Chromium UI: verified Foraging → Herb Potency → reserved herb →
secondary Herblore + Brewing SV → one append-only mundane craft, no GM time change.
"""
from pathlib import Path
import re,json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",source,re.S).group(1)
js=js.replace("herbName:'stimulant'", "herbName:'Brewing herbs'")
js=js[:js.index('const assessed=')]+r'''
const {resolveSkillTest}=require('./src/integration/hmk-skill-test-engine.js');
const assessed=createHerbPotency({journal:j,campaignId:c,minute:0,sourceId:'source',resultIndex:0,actorId:a,doses:[{potencyRoll:10,origin:'manual',decayRolls:[[6,6],[6,6],[6,6]]}]});
j.push(row('assessed',0,'calendarHerbPotency',assessed));
const reserve=createSupplyUse({journal:j,campaignId:c,minute:0,sourceId:'source',resultIndex:0,unit:'herbDoses',quantity:1,actorId:a,disposition:'ingredient-reserved',purpose:'scented brewing recipe'});
j.push(row('reserved',0,'calendarForagingSupplyUse',reserve));
j.push(row('herblore-proof',9,'skillTestProof',{type:'secondary-mastery-value-test',skills:['Herblore'],a:resolveSkillTest({ml:72,roll:41})}));
j.push(row('craft-proof',11,'skillTestProof',{type:'secondary-mastery-value-test',skills:['Brewing'],secondarySkills:['Herblore'],a:resolveSkillTest({ml:81,roll:48,secondaryMLs:[72]})}));
process.stdout.write(JSON.stringify(j));
'''
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
actor='herbal-actor';campaign='A'
fixture={'schemaVersion':1,'characters':[{'id':actor,'name':'Brewer','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12},'skills':[{'id':'herb','name':'Herblore','ml':72},{'id':'brew','name':'Brewing','ml':81}]}}],
'items':[],'inventory':[],'trash':[],'journal':journal,'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':campaign,'minute':11,'label':'Mundane','characterIds':[actor],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1450,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 assert 'v93.416' in page.locator('#app').inner_text(),page.locator('#app').inner_text()[:800]
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(120)
 frm=page.locator('[data-mundane-herbal-craft]');assert frm.count()==1,('missing form',errors,dialogs,page.locator('#app').inner_text()[-2000:])
 assert frm.locator('button[type="submit"]').is_enabled(),(errors,dialogs,frm.inner_text())
 frm.evaluate('el=>el.closest("details").open=true')
 frm.locator('[name="recipeName"]').fill('Scented ale test');frm.locator('[name="gmLaborConfirmed"]').check()
 frm.locator('button[type="submit"]').click();page.wait_for_timeout(280)
 assert not errors and not dialogs,(errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 done=[r['calendarMundaneHerbalCraft'] for r in saved['journal'] if r.get('calendarMundaneHerbalCraft')]
 assert len(done)==1,(done,errors,dialogs)
 assert done[0]['craftSkill']=='Brewing' and done[0]['herbPotency']==3 and done[0]['finalSV']==10,done
 assert saved['campaignClock']['minute']==11,'Craft event shifted GM calendar'
 assert len([r for r in saved['journal'] if r.get('calendarHerbPotionComplete')])==0,'Fictitious exotic potion'
 assert page.locator('[data-mundane-herbal-craft]').count()==0,'Spent herb remains eligible'
 page.screenshot(path=str(root/'browser_mundane_concoctions_413.png'))
 print('PASS Chromium: physical Foraging herbs -> secondary Herblore + Brewing SV -> craft audited once, no inventory/time fabrication')
 browser.close()
