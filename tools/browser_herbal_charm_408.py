"""Chromium: real Charm and seduction-resistance skills from a real Foraging -> Herblore -> potion chain."""
from pathlib import Path
import re,subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src=(root/'tools/browser_herb_admin_394.py').read_text()
template=re.search(r"js=r'''\n(.*?)\n'''",src,re.S).group(1)
actor='herbal-actor';target='patient';camp='A'
chars=[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'agl':12,'emp':12,'wil':12,'rea':12},'skills':[{'id':'charm-a','name':'Charm','ml':52},{'id':'intrigue-a','name':'Intrigue','ml':55}]}},
 {'id':target,'name':'Patient','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'agl':12,'emp':12,'wil':12,'rea':12},'skills':[{'id':'charm-b','name':'Charm','ml':52},{'id':'intrigue-b','name':'Intrigue','ml':55}]}}]

def fixture_for(kind):
 js=template.replace('stimulant',kind)
 js=js.replace('process.stdout.write(JSON.stringify(j));',"""const {createHerbPotionAdministration}=require('./src/integration/hmk-herbal-administration.js');
 const entry=createHerbPotionAdministration({journal:j,campaignId:c,minute:11,actorId:a,completeId:'completed',targetId:'patient',method:'METHOD',gmConfirmed:true,memberIds:[a,'patient']});
 j.push(row('charm-dose',11,'calendarHerbPotionAdminister',entry));
 process.stdout.write(JSON.stringify(j));""".replace('METHOD','perfume' if kind=='aromatic' else 'ingested'))
 journal=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
 return {'schemaVersion':1,'characters':chars,'items':[],'inventory':[],'trash':[],'journal':journal,
 'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':camp,'minute':11,'label':'Charm Herbs','characterIds':[actor,target],
 'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':11,'reason':'GM'}]}}

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for kind in ['aromatic','aphrodisiac']:
  page=browser.new_page(viewport={'width':1450,'height':1000})
  errors=[];dialogs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
  page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
  page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture_for(kind))
  page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(150)
  assert 'v93.408' in page.locator('#app').inner_text(), page.locator('#app').inner_text()[-1200:]
  page.locator('[data-nav="skills"]').first.click();page.wait_for_timeout(180)
  page.locator('[data-skill-actor]').first.select_option(target if kind=='aromatic' else actor);page.wait_for_timeout(180)
  frm=page.locator('#skill-secondary-form');assert frm.count()==1,(kind,errors,dialogs)
  frm.locator('[name="primary"]').select_option('Charm');page.wait_for_timeout(150)
  if kind=='aromatic':
   assert 'Aromatic' in frm.inner_text() and '+32' in frm.inner_text(),frm.inner_text()[-2000:]
   frm.locator('[name="rollA"]').fill('68')
  else:
   frm.locator('[name="opposed"]').check();page.wait_for_timeout(140)
   frm.locator('[name="opponentId"]').select_option(target);page.wait_for_timeout(130)
   frm.locator('[name="opponentSkill"]').select_option('Intrigue');page.wait_for_timeout(100)
   assert 'Aphrodisiac · odolání svádění' not in frm.inner_text(),'Aphrodisiac leaked to unspecified social resistance'
   frm.locator('[name="seductionConfirmed"]').check();page.wait_for_timeout(160)
   assert 'Aphrodisiac' in frm.inner_text() and '-32' in frm.inner_text(),frm.inner_text()[-2000:]
   frm.locator('[name="rollA"]').fill('20');frm.locator('[name="rollB"]').fill('50')
  frm.locator('button[type="submit"]').last.click();page.wait_for_timeout(240)
  assert not errors,(kind,errors,dialogs)
  assert not dialogs,(kind,dialogs,frm.inner_text()[-1300:])
  saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
  proofs=[r['skillTestProof'] for r in saved['journal'] if r.get('skillTestProof',{}).get('herbalCharmA') or r.get('skillTestProof',{}).get('herbalCharmB')]
  assert len(proofs)==1,(kind,frm.inner_text()[-1700:],errors)
  if kind=='aromatic':
   assert proofs[0]['herbalCharmA']['modifier']==32 and proofs[0]['a']['rawEML']==84,proofs[0]
  else:
   assert proofs[0]['herbalCharmB']['modifier']==-32 and proofs[0]['b']['rawEML']==23,proofs[0]
   assert proofs[0]['seductionConfirmed'] is True
  assert saved['campaignClock']['minute']==11,'Skill test shifted GM time'
  page.screenshot(path=str(root/f'browser_herbal_charm_{kind}_408.png'))
  print('PASS Chromium',kind,'real source-backed Charm d100, EML, persisted proof, GM minute unchanged')
  page.close()
 browser.close()
