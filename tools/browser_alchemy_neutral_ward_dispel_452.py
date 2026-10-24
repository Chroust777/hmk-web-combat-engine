"""Actual interactive Ward-source Detect→Reveal→Dispel (2+6+6 rounds).
Starts with a separately proved and saved 60-round Ward; uses production UI.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json,os
root=Path(__file__).resolve().parents[1]
raw=json.loads(subprocess.check_output(['node',str(root/'tools/test_alchemy_neutral_ward_451.cjs')],cwd=root,env=os.environ|{'HMK_WARD_POSTCAST':'1'},text=True))
characters=[{'id':x,'name':x,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}} for x in ['A0','A1','B']]
mage=raw['characters'][0];mage.update({'kind':'PC'});mage['hmk']['attributes']={'str':12,'end':12,'rea':12,'per':12,'wil':14};mage['hmk']['sunsign']='Ùlándus';mage['hmk']['wealth']=30;mage['hmk']['skills']=[{'id':'pv','name':'Pvârism','ml':70}];characters.append(mage)
minute=raw['campaignClock']['minute']
clock={'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Ward Dispel audit','characterIds':['A0','A1','B','Mage'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'adv','type':'advance','minute':minute,'reason':'GM advance'}]}
db={'schemaVersion':1,'characters':characters,'items':[],'inventory':raw['inventory'],'trash':[],'journal':raw['journal'],'campaignClock':clock,'combatRuntime':raw['combatRuntime']}
saved=json.dumps(db,ensure_ascii=False,separators=(',',':'))
bundle=(root/'hmk-app.bundle.js').read_text()
mock_js='''json=>{const m=new Map([['hmk-keepers-ledger-v1',json]]),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:x});Object.defineProperty(window,'sessionStorage',{configurable:true,value:x});}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1400,'height':1000});page.set_default_timeout(8500);dialogs=[];errors=[]
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()));page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');page.evaluate(mock_js,saved);page.add_script_tag(content=bundle)
 page.locator('[data-nav="encounter"]').first.click()
 state=lambda:json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
 def next_round():page.locator('[data-action="initiative-next-round"]').first.click()
 def hold():
  page.locator('[data-action="initiative-start-turn"]').first.click()
  page.locator('#combat-initiative-finish-form select[name="action"]').select_option('concentrate-hold')
  page.locator('#combat-initiative-finish-form button[type="submit"]').click()
 def start(spell):
  next_round();page.locator('[data-action="initiative-start-turn"]').first.click()
  f=page.locator('form[data-neutral-spellstart]');assert f.count()==1,('no spellstart',spell,dialogs[-3:])
  f.locator('[name="spell"]').select_option(spell);f.locator('[name="finishId"]').select_option('finish1')
  f.locator('[name="targetKind"]').select_option('Ward');f.locator('[name="distanceFeet"]').fill('5')
  for name in ['gmCantGestureConfirmed','gmOrdinaryConditionsConfirmed','gmWardTargetConfirmed','gmConfirmed']:f.locator(f'[name="{name}"]').check()
  f.locator('button[type="submit"]').click()
  assert state()['journal'][-1]['combatProof']['targetKind']=='Ward',('Ward targeting failed',spell,dialogs[-4:],errors[-4:])
 def fire(spell,die):
  f=page.locator('form[data-neutral-spellfire]');assert f.count()==1,('no fire form',spell,dialogs[-3:])
  f.locator('[name="distanceFeet"]').fill('5');f.locator('[name="castingD100"]').fill(str(die));f.locator('[name="resultFamily"]').select_option('success')
  for name in ['gmConcentrationConfirmed','gmOrdinaryConditionsConfirmed','gmWardTargetConfirmed','gmConfirmed']:f.locator(f'[name="{name}"]').check()
  if spell=='Detect':
   f.locator('[name="distancesByFinishId"]').fill('{"finish0":40,"finish1":5}')
   f.locator('[name="otherSources"]').fill('[]')
   f.locator('[name="gmAllSourcesConfirmed"]').check()
  if spell=='Dispel':f.locator('[name="gmLOSConfirmed"]').check()
  f.locator('button[type="submit"]').click()
  c=state()['journal'][-1].get('calendarAlchemyNeutralCast');assert c and c['spell']==spell and c['targetKind']=='Ward',('Ward cast failed',spell,dialogs[-4:],errors[-4:]);return c
 # Spellfire of original Ward happened at own IR round 61, held campaign time.
 start('Detect')
 next_round();hold();next_round();d=fire('Detect',20)
 assert d['castingSL']=='CS' and d['detectedSources'][0]['spell']=='Ward'
 start('Reveal')
 for _ in range(5):next_round();hold()
 next_round();r=fire('Reveal',76)
 assert r['castingSL']=='S' and r['detectCSBonus']==20 and r['revealed']['wardLevel']==5
 start('Dispel')
 for _ in range(5):next_round();hold()
 next_round();p=fire('Dispel',23)
 assert p['castingSL']=='S' and p['castingEML']==27 and p['dispel']['removed'] is True
 assert state()['inventory']==db['inventory'] and state()['campaignClock']['minute']==minute
 final=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 reload=browser.new_page();reload.set_default_timeout(9000);reload_err=[];reload.on('pageerror',lambda e:reload_err.append(str(e)))
 reload.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 reload.evaluate(mock_js,final);reload.add_script_tag(content=bundle)
 assert 'v93.452' in reload.locator('body').inner_text() and 'POZOR: Původní data se nepodařilo načíst' not in reload.locator('body').inner_text(),reload.locator('body').inner_text()[-1600:]
 assert reload.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==final
 assert not errors and not reload_err,(errors,reload_err)
 print('PASS Chromium Ward-origin Detect CS → Reveal S → Dispel S over 2+6+6 clicked rounds, WL penalty -50, original vial, reload, no GM clock change',flush=True)
 reload.close();browser.close()
