"""Actual production Chromium UI Neutral Spellstart / concentration / Spellfire.
Only supported ordinary casts; Total Release and Ward are deliberately blocked.
"""
from pathlib import Path
import subprocess,json,os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=json.loads(subprocess.check_output(['node',str(root/'tools/test_alchemy_neutral_spellfire_failed_449.cjs')],cwd=root,env=os.environ|{'HMK_NEUTRAL_PRECAST':'1'},text=True))
characters=[{'id':x,'name':x,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}} for x in ['A0','A1','B']]
mage=raw['characters'][0];mage.update({'kind':'PC'});mage['hmk']['attributes']={'str':12,'end':12,'rea':12,'per':12,'wil':14};mage['hmk']['sunsign']='Ùlándus';mage['hmk']['wealth']=30;mage['hmk']['skills']=[{'id':'pv','name':'Pvârism','ml':70}];characters.append(mage)
minute=raw['campaignClock']['minute']
clock={'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Neutral UI audit','characterIds':['A0','A1','B','Mage'],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'adv','type':'advance','minute':minute,'reason':'GM advance'}]}
db={'schemaVersion':1,'characters':characters,'items':[],'inventory':raw['inventory'],'trash':[],'journal':raw['journal'],'campaignClock':clock,'combatRuntime':raw['combatRuntime']}
bundle=(root/'hmk-app.bundle.js').read_text();saved=json.dumps(db,ensure_ascii=False,separators=(',',':'))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(5000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''json=>{const map=new Map([['hmk-keepers-ledger-v1',json]]);const mock={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',saved)
 page.add_script_tag(content=bundle)
 page.locator('[data-nav="encounter"]').first.click()
 assert page.locator('form[data-neutral-spellstart]').count()==1,('no start form',page.locator('body').inner_text()[-1800:],dialogs)
 f=page.locator('form[data-neutral-spellstart]')
 f.locator('[name="spell"]').select_option('Detect')
 f.locator('[name="finishId"]').select_option('finish1')
 f.locator('[name="distanceFeet"]').fill('5')
 for x in ['gmCantGestureConfirmed','gmOrdinaryConditionsConfirmed','gmWardAbsentConfirmed','gmConfirmed']:f.locator('[name="'+x+'"]').check()
 f.locator('button[type="submit"]').click()
 s=json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
 assert len(s['journal'])==len(db['journal'])+1,('start not saved',dialogs,errors,page.locator('body').inner_text()[-1600:])
 assert s['journal'][-1]['combatProof']['spell']=='Detect'
 def state():return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
 def next_round():
  print('NEXT ROUND from',state()['combatRuntime']['sequence']['round'],flush=True)
  page.locator('[data-action="initiative-next-round"]').first.click()
  assert state()['combatRuntime']['sequence']['active']==False,('next failed',dialogs[-3:])
 def hold():
  print('HOLD',state()['combatRuntime']['sequence']['round'],flush=True)
  page.locator('[data-action="initiative-start-turn"]').first.click()
  page.locator('#combat-initiative-finish-form select[name="action"]').select_option('concentrate-hold')
  page.locator('#combat-initiative-finish-form button[type="submit"]').click()
  print('HOLD RESULT',state()['combatRuntime']['sequence']['round'],state()['combatRuntime']['sequence']['cursor'],state()['combatRuntime']['sequence']['active'],'dialogs',dialogs[-3:],flush=True)
 def start(spell):
  print('START',spell,state()['combatRuntime']['sequence']['round'],flush=True)
  page.locator('[data-action="initiative-start-turn"]').first.click()
  f=page.locator('form[data-neutral-spellstart]')
  assert f.count()==1,('no start',spell,dialogs[-5:],state()['combatRuntime']['sequence'])
  f.locator('[name="spell"]').select_option(spell)
  f.locator('[name="finishId"]').select_option('finish1')
  f.locator('[name="distanceFeet"]').fill('5')
  for x in ['gmCantGestureConfirmed','gmOrdinaryConditionsConfirmed','gmWardAbsentConfirmed','gmConfirmed']:f.locator('[name="'+x+'"]').check()
  f.locator('button[type="submit"]').click()
  assert state()['journal'][-1].get('combatProof',{}).get('spell')==spell,('start failed',spell,dialogs[-5:])
 def fire(spell,die):
  print('FIRE',spell,state()['combatRuntime']['sequence']['round'],flush=True)
  f=page.locator('form[data-neutral-spellfire]')
  assert f.count()==1,('no fire',spell,dialogs[-5:],state()['combatRuntime']['sequence'])
  f.locator('[name="distanceFeet"]').fill('5');f.locator('[name="castingD100"]').fill(str(die))
  f.locator('[name="resultFamily"]').select_option('success')
  for x in ['gmConcentrationConfirmed','gmOrdinaryConditionsConfirmed','gmWardAbsentConfirmed','gmConfirmed']:f.locator('[name="'+x+'"]').check()
  if spell=='Detect':
   f.locator('[name="distancesByFinishId"]').fill('{"finish0":40,"finish1":5}')
   f.locator('[name="otherSources"]').fill('[{"sourceId":"external-talisman","category":"Artefact enchantment","distanceFeet":4}]')
   original=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
   f.locator('button[type="submit"]').click()
   assert page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==original,'Missing all-sources confirmation partially committed'
   assert any('všechny magické zdroje' in x or 'magické zdroje' in x for x in dialogs),('wrong rejection',dialogs[-3:])
   f.locator('[name="gmAllSourcesConfirmed"]').check()
  if spell=='Dispel':f.locator('[name="gmLOSConfirmed"]').check()
  f.locator('button[type="submit"]').click()
  result=state()['journal'][-1].get('calendarAlchemyNeutralCast')
  assert result and result['spell']==spell,('fire failed',spell,dialogs[-5:],errors[-3:])
  return result
 # Detect has casting time 2 rounds from start, followed by spellfire in round 3.
 next_round();hold();next_round();detect=fire('Detect',20)
 assert detect['castingSL']=='CS',detect
 print('PASS UI Detect CS, round',state()['combatRuntime']['sequence']['round'])
 next_round();start('Reveal')
 for _ in range(5):next_round();hold()
 next_round();reveal=fire('Reveal',76)
 assert reveal['castingSL']=='S' and reveal['detectCSBonus']==20,reveal
 print('PASS UI Reveal S +20, round',state()['combatRuntime']['sequence']['round'])
 next_round();start('Dispel')
 for _ in range(5):next_round();hold()
 next_round();dispel=fire('Dispel',23)
 assert dispel['castingSL']=='S' and dispel['dispel']['asAfter']==0,dispel
 assert state()['campaignClock']['minute']==minute,'GM clock moved during cast'
 assert state()['inventory']==db['inventory'],'Physical vial unexpectedly consumed'
 final_bytes=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 reload=browser.new_page(viewport={'width':1440,'height':1000});reload.set_default_timeout(8000)
 reload_errors=[];reload.on('pageerror',lambda e:reload_errors.append(str(e)))
 reload.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 reload.evaluate('''json=>{const map=new Map([['hmk-keepers-ledger-v1',json]]);const mock={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',final_bytes)
 reload.add_script_tag(content=bundle)
 assert 'v93.455' in reload.locator('body').inner_text() and 'POZOR: Původní data se nepodařilo načíst' not in reload.locator('body').inner_text(),('reload failed',reload.locator('body').inner_text()[-1000:])
 reload.locator('[data-nav="calendar"]').first.click()
 if reload.locator('[data-calendar-open]').count():reload.locator('[data-calendar-open]').first.click()
 assert reload.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')==final_bytes,'Reload altered immutable history'
 assert not errors and not reload_errors,(errors,reload_errors)
 reload.close()
 print('PASS actual Chromium UI Detect CS → Reveal S → Dispel S (2+6+6), missing input rollback, new browser reload, AS0, inventory, preserved GM time/history')

 browser.close()
