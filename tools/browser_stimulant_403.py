"""Real Chromium smoke test of the existing Skill Workbench with a genuine Stimulant."""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",source,re.S).group(1)
js=js.replace('process.stdout.write(JSON.stringify(j));', '''const {createHerbPotionAdministration}=require('./src/integration/hmk-herbal-administration.js');
const p=createHerbPotionAdministration({journal:j,campaignId:c,minute:11,actorId:a,completeId:'completed',targetId:'patient',method:'ingested',gmConfirmed:true,memberIds:[a,'patient']});
j.push(row('stimulant-given',11,'calendarHerbPotionAdminister',p));
process.stdout.write(JSON.stringify(j));''')
journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
camp='A';actor='herbal-actor';target='patient'
chars=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'agl':12},'skills':[]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'agl':12,'per':12,'wil':12,'rea':12},
 'skills':[{'id':'initiative-1','name':'Initiative','ml':52},{'id':'aware-1','name':'Awareness','ml':63}]}}]
fixture={'schemaVersion':1,'characters':chars,'items':[],'inventory':[],'trash':[],'journal':journal,
'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':11,'label':'Stimulant','characterIds':[actor,target],
'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'gm','type':'advance','minute':11,'reason':'GM'}]}}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=b.new_page(viewport={'width':1480,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 assert 'v93.403' in page.locator('#app').inner_text(),page.locator('#app').inner_text()[-1000:]
 print('NAV',page.locator('[data-nav]').evaluate_all('(els)=>els.map(x=>x.getAttribute("data-nav"))'))
 page.locator('[data-nav="skills"]').first.click();page.wait_for_timeout(150)
 print('SKILL FIELDS',page.locator('[data-skill-actor]').count(),page.locator('#skill-secondary-form').count())
 if page.locator('[data-skill-actor]').count():page.locator('[data-skill-actor]').first.select_option(target);page.wait_for_timeout(140)
 print('SKILL TEXT',page.locator('#app').inner_text()[-900:])
 print('FORM OPTIONS',page.locator('#skill-secondary-form [name="primary"]').evaluate_all('(els)=>els.map(x=>x.innerText.slice(0,800))'))
 # Workbench preview must include exact +32 source-backed current modifier.
 frm=page.locator('#skill-secondary-form')
 assert frm.count(),('No original skill workbench',errors,dialogs)
 frm.locator('[name="primary"]').select_option('Initiative');page.wait_for_timeout(130)
 text=frm.inner_text()
 assert 'Stimulant' in text and '+32' in text,('Initiative did not receive medication',text[-1500:],errors)
 # Awareness uses the same dose; it is not an independent second potion.
 frm.locator('[name="primary"]').select_option('Awareness');page.wait_for_timeout(100)
 text=frm.inner_text();assert 'Stimulant' in text and '+32' in text,('Awareness did not receive medication',text[-1500:],errors)
 # Commit a physical GM d100 using the original Workbench, not a second tester.
 frm.locator('[name="primary"]').select_option('Initiative');page.wait_for_timeout(100)
 frm.locator('[name="rollA"]').fill('68')
 frm.locator('[type="submit"]').last.click();page.wait_for_timeout(180)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 proofs=[r['skillTestProof'] for r in saved['journal'] if r.get('skillTestProof',{}).get('stimulantA')]
 assert len(proofs)==1,('Workbench failed to save source-backed skill proof',errors,dialogs,page.locator('#app').inner_text()[-1100:])
 assert proofs[0]['a']['rawEML']>=84 and proofs[0]['stimulantA']['sourceIds']==['stimulant-given'],proofs[0]
 assert not errors,(errors,dialogs)
 # Workbench preview and the committed roll do not advance the GM clock.
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 assert saved['campaignClock']['minute']==11
 assert len(saved['journal'])==len(journal)+1
 page.screenshot(path=str(root/'browser_stimulant_403.png'))
 print('PASS Chromium: physical Initiative d100 with Stimulant +32, Awareness preview, source-backed immutable skill proof; GM minute unchanged')
 # Opening the original encounter setup must consume exactly this source-backed
 # current Stimulant, never permanently mutate the patient's skill ML.
 page.locator('[data-nav="encounter"]').first.click();page.wait_for_timeout(160)
 page.locator('[data-encounter-character="'+target+'"]').check();page.wait_for_timeout(110)
 page.locator('[data-encounter-character="'+actor+'"]').check();page.wait_for_timeout(130)
 setup=page.locator('#combat-initiative-setup-form')
 assert setup.count()==1,('No Initiative setup',errors,dialogs)
 assert 'Stimulant +32' in setup.inner_text(),setup.inner_text()[-800:]
 # All inputs remain BASIC ML/EML in the form; the combat sorter adds +32.
 setup.locator('[name="ir_'+actor+'"]').fill('50')
 setup.locator('[name="aw_'+actor+'"]').fill('50')
 setup.locator('[name="gmConfirmed"]').check()
 setup.locator('[type="submit"]').click();page.wait_for_timeout(250)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 seq=saved.get('combatRuntime',{}).get('sequence') if saved.get('combatRuntime') else None
 assert seq,('Initiative setup did not commit',errors,dialogs,page.locator('#app').inner_text()[-1500:])
 patient=next(x for x in seq['roster'] if x['id']==target)
 assert patient['rank']==84 and patient['awarenessEML']==95,patient
 assert seq['stimulantInitiativeSnapshot']['proofs'][0]['sourceIds']==['stimulant-given']
 histories=[row for row in saved['journal'] if row.get('calendarHerbStimulantInitiative')]
 assert len(histories)==1,histories
 assert saved['campaignClock']['minute']==11
 assert not errors,(errors,dialogs)
 print('PASS Chromium: verified Initiative setup ranks 52→84 and Awareness 63→95, same source, immutable journal proof, unchanged GM minute')
 b.close()
