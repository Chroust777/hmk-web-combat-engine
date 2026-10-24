"""Real click-through for two distinct Wards on a single elixir; old immutable proof retained."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,subprocess
root=Path(__file__).resolve().parents[1]
raw=json.loads(subprocess.check_output(['node',str(root/'tools/test_alchemy_neutral_ward_supersede_452.cjs')],cwd=root,env=os.environ|{'HMK_SUPERSEDE_PRECAST':'1'},text=True))
chars=[{'id':x,'name':x,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}} for x in ['A0','A1','B']]
for c in raw['characters']:
 c['kind']='PC';c['hmk']['attributes']={'str':12,'end':12,'rea':12,'per':12,'wil':14};c['hmk']['sunsign']='Ùlándus';c['hmk']['wealth']=30;c['hmk']['skills']=[{'id':'pv','name':'Pvârism','ml':next(x['ml'] for x in c['hmk']['skills'] if x['name']=='Pvârism')}];chars.append(c)
minute=raw['campaignClock']['minute']
clock={'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Ward supersession 452','characterIds':[c['id'] for c in chars],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'adv','type':'advance','minute':minute,'reason':'GM advance'}]}
db={'schemaVersion':1,'characters':chars,'items':[],'inventory':raw['inventory'],'trash':[],'journal':raw['journal'],'campaignClock':clock,'combatRuntime':raw['combatRuntime']}
saved=json.dumps(db,ensure_ascii=False,separators=(',',':'))
old=[x for x in raw['journal'] if x.get('calendarAlchemyNeutralCast',{}).get('spell')=='Ward'][-1]
assert old['calendarAlchemyNeutralCast']['ward']['level']==3
mock='''json=>{const m=new Map([['hmk-keepers-ledger-v1',json]]),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:x});Object.defineProperty(window,'sessionStorage',{configurable:true,value:x});}'''
bundle=(root/'hmk-app.bundle.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1400,'height':950});page.set_default_timeout(6500);dialogs=[];errors=[]
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()));page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');page.evaluate(mock,saved);page.add_script_tag(content=bundle)
 page.locator('[data-nav="encounter"]').first.click()
 state=lambda:json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
 f=page.locator('form[data-neutral-spellstart]');assert f.count()==1,('missing start form',dialogs[-5:],errors)
 f.locator('[name="spell"]').select_option('Ward');f.locator('[name="finishId"]').select_option('finish1');f.locator('[name="distanceFeet"]').fill('0')
 for name in ['gmCantGestureConfirmed','gmOrdinaryConditionsConfirmed','gmTouchConfirmed','gmConfirmed']:f.locator(f'[name="{name}"]').check()
 before=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 f.locator('button[type="submit"]').click()
 assert page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==before,'missing GM supersede changed state'
 f.locator('[name="gmSupersedeWardConfirmed"]').check();f.locator('button[type="submit"]').click()
 assert state()['journal'][-1]['combatProof']['priorWardProofId']==old['id'],('no second start',dialogs[-5:],errors[-3:])
 for _ in range(59):
  page.locator('[data-action="initiative-next-round"]').first.click()
  page.locator('[data-action="initiative-start-turn"]').first.click()
  page.locator('#combat-initiative-finish-form select[name="action"]').select_option('concentrate-hold')
  page.locator('#combat-initiative-finish-form button[type="submit"]').click()
 page.locator('[data-action="initiative-next-round"]').first.click()
 f=page.locator('form[data-neutral-spellfire]');assert f.count()==1,('missing fire form',dialogs[-5:],errors)
 f.locator('[name="distanceFeet"]').fill('0');f.locator('[name="castingD100"]').fill('23');f.locator('[name="resultFamily"]').select_option('success')
 for name in ['gmConcentrationConfirmed','gmOrdinaryConditionsConfirmed','gmTouchConfirmed','gmConfirmed']:f.locator(f'[name="{name}"]').check()
 prior=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 f.locator('button[type="submit"]').click()
 assert page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==prior,'missing fire GM supersede changed state'
 f.locator('[name="gmSupersedeWardConfirmed"]').check();f.locator('button[type="submit"]').click()
 result=state();new=result['journal'][-1]['calendarAlchemyNeutralCast']
 assert new['spell']=='Ward' and new['ward']['level']==5 and new['ward']['supersedesWardProofId']==old['id'],(dialogs[-7:],errors[-5:])
 assert result['journal'][raw['journal'].index(old)]==old,'old proof mutated'
 assert result['inventory']==db['inventory'] and result['campaignClock']['minute']==minute
 final=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 reload=browser.new_page();reload_err=[];reload.on('pageerror',lambda e:reload_err.append(str(e)))
 reload.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');reload.evaluate(mock,final);reload.add_script_tag(content=bundle)
 assert 'v93.452' in reload.locator('body').inner_text() and 'POZOR: Původní data se nepodařilo načíst' not in reload.locator('body').inner_text()
 assert reload.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==final
 assert not errors and not reload_err,(errors,reload_err)
 print('PASS Chromium: real Ward WL3 -> WL5 supersession, 60 clicked rounds, rollback, original proof, reload')
 reload.close();browser.close()
