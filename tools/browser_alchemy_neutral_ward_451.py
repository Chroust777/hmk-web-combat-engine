"""Full interactive Chromium Ward S/CS with 60 real Initiative rounds and reload.
Uses actual built app and actual stored spell history; not a local HTTP test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json,os
root=Path(__file__).resolve().parents[1]
raw=json.loads(subprocess.check_output(['node',str(root/'tools/test_alchemy_neutral_ward_451.cjs')],cwd=root,env=os.environ|{'HMK_WARD_PRECAST':'1'},text=True))
characters=[{'id':x,'name':x,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}} for x in ['A0','A1','B']]
mage=raw['characters'][0];mage.update({'kind':'PC'});mage['hmk']['attributes']={'str':12,'end':12,'rea':12,'per':12,'wil':14};mage['hmk']['sunsign']='Ùlándus';mage['hmk']['wealth']=30;mage['hmk']['skills']=[{'id':'pv','name':'Pvârism','ml':70}];characters.append(mage)
minute=raw['campaignClock']['minute']
clock={'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Ward 451 audit','characterIds':['A0','A1','B','Mage'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'adv','type':'advance','minute':minute,'reason':'GM advance'}]}
db={'schemaVersion':1,'characters':characters,'items':[],'inventory':raw['inventory'],'trash':[],'journal':raw['journal'],'campaignClock':clock,'combatRuntime':raw['combatRuntime']}
saved=json.dumps(db,ensure_ascii=False,separators=(',',':'))
bundle=(root/'hmk-app.bundle.js').read_text()
mock_js='''json=>{const m=new Map([['hmk-keepers-ledger-v1',json]]),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:x});Object.defineProperty(window,'sessionStorage',{configurable:true,value:x});}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1380,'height':900});page.set_default_timeout(6000);dialogs=[];errors=[]
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()));page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate(mock_js,saved);page.add_script_tag(content=bundle)
 page.locator('[data-nav="encounter"]').first.click()
 state=lambda:json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
 f=page.locator('form[data-neutral-spellstart]');assert f.count()==1,('no Ward UI',dialogs,errors)
 f.locator('[name="spell"]').select_option('Ward');f.locator('[name="finishId"]').select_option('finish1');f.locator('[name="distanceFeet"]').fill('0')
 for name in ['gmCantGestureConfirmed','gmOrdinaryConditionsConfirmed','gmTouchConfirmed','gmConfirmed']:f.locator(f'[name="{name}"]').check()
 pre=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 f.locator('[name="gmTouchConfirmed"]').uncheck();f.locator('button[type="submit"]').click()
 assert page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==pre,'Missing Ward touch changed campaign'
 f.locator('[name="gmTouchConfirmed"]').check();f.locator('button[type="submit"]').click()
 assert state()['journal'][-1]['combatProof']['spell']=='Ward',('Ward start failed',dialogs[-4:],errors)
 assert state()['combatRuntime']['sequence']['commitments']['Mage']['durationRounds']==60
 for k in range(59):
  page.locator('[data-action="initiative-next-round"]').first.click()
  page.locator('[data-action="initiative-start-turn"]').first.click()
  page.locator('#combat-initiative-finish-form select[name="action"]').select_option('concentrate-hold')
  page.locator('#combat-initiative-finish-form button[type="submit"]').click()
 page.locator('[data-action="initiative-next-round"]').first.click()
 assert state()['combatRuntime']['sequence']['round']==61
 f=page.locator('form[data-neutral-spellfire]');assert f.count()==1,('no Ward fire UI',dialogs[-3:],errors)
 f.locator('[name="distanceFeet"]').fill('0');f.locator('[name="castingD100"]').fill('40');f.locator('[name="resultFamily"]').select_option('success')
 for name in ['gmConcentrationConfirmed','gmOrdinaryConditionsConfirmed','gmTouchConfirmed','gmConfirmed']:f.locator(f'[name="{name}"]').check()
 f.locator('button[type="submit"]').click()
 result=state();ward=result['journal'][-1].get('calendarAlchemyNeutralCast')
 assert ward and ward['spell']=='Ward' and ward['ward']['level']==5,('Ward fire failed',dialogs[-5:],errors)
 assert result['inventory']==db['inventory'] and result['campaignClock']['minute']==minute
 final=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 reload=browser.new_page();reload.set_default_timeout(10000);reload_errors=[];reload.on('pageerror',lambda e:reload_errors.append(str(e)))
 reload.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 reload.evaluate(mock_js,final);reload.add_script_tag(content=bundle)
 assert 'v93.451' in reload.locator('body').inner_text() and 'POZOR: Původní data se nepodařilo načíst' not in reload.locator('body').inner_text(),reload.locator('body').inner_text()[-1600:]
 assert reload.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==final
 assert not errors and not reload_errors,(errors,reload_errors)
 print('PASS Chromium Ward: 60 clicked Initiative rounds, real CS spellfire WL5, missing-touch rollback, original vial and GM time, saved-history reload',flush=True)
 reload.close();browser.close()
