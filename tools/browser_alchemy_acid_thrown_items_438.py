"""Chromium: shattering thrown Acid hits real WQ / AV, one first contact and history survives reload."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
original=(root/'tools/browser_alchemy_acid_thrown_438.py').read_text()
exec(original.split('with sync_playwright() as p:')[0],globals())
sword={'id':'sword','characterId':'b','sourceItemId':'fixture:sword','quantity':1,'slot':'main_hand','currentWQ':4,
 'snapshot':{'id':'fixture:sword','name':'Sword','category':'weapon','properties':{'quality':5,'weightLb':2}}}
armour={'id':'cuirass','characterId':'b','quantity':1,'slot':'worn','layerOrder':0,
 'sourceItemId':'hmk:armour:p118:verified:hmk118-kurbul-cuirass',
 'snapshot':{'id':'hmk:armour:p118:verified:hmk118-kurbul-cuirass','name':'Cuirass','category':'armor',
  'properties':{'coverageVerified':True,'material':'K','coveredLocations':['tx','ab'],
   'locationProtection':{'tx':{'b':4,'e':6,'p':5,'f':4},'ab':{'b':4,'e':6,'p':5,'f':4}},
   'coverageMarkers':{'tx':'rigid','ab':'rigid'},'directionRestriction':'none','rigid':True,
   'layerZoneByLocation':{'tx':'torso','ab':'torso'},'weightLb':9.1}}}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for kind,item in [('weapon',sword),('armour',armour)]:
  fx=make_data();fx['inventory'].append(item)
  page,errors,dialogs=new_page(browser,fx)
  b=page.locator('[data-alchemy-vial-bind]');b.evaluate('el=>el.closest("details").open=true')
  b.locator('select[name="vialId"]').select_option('vial1')
  for k in ['confirmed','liquidConfirmed','corkConfirmed']:b.locator('input[name="'+k+'"]').check()
  b.locator('select[name="material"]').select_option('glass')
  b.locator('button[type="submit"]').click();page.wait_for_timeout(125)
  form=page.locator('[data-alchemy-acid-thrown]');form.evaluate('el=>el.closest("details").open=true')
  form.locator('input[name="d100"]').fill('43');form.locator('input[name="distanceFt"]').fill('20')
  form.locator('select[name="targetKind"]').select_option(kind)
  form.locator('select[name="targetItemId"]').select_option(item['id'])
  if kind=='armour':form.locator('select[name="location"]').select_option('tx')
  form.locator('input[name="contactD10"]').fill('1')
  for k in ['firm','geometry','confirmed']:form.locator('input[name="'+k+'"]').check()
  form.locator('button[type="submit"]').click();page.wait_for_timeout(250)
  a=saved(page);th=[r for r in a['journal'] if r.get('calendarAlchemyAcidThrown')]
  assert len(th)==1,(kind,dialogs,errors)
  assert th[0]['calendarAlchemyAcidThrown']['hit']==True
  assert not any(i['id']=='vial1' for i in a['inventory'])
  the_item=next(x for x in a['inventory'] if x['id']==item['id'])
  if kind=='weapon':assert the_item['currentWQ']==3,(kind,the_item,dialogs)
  else:assert the_item['acidAVDamageByLocation']['tx']==1,(kind,the_item,dialogs)
  assert len([r for r in a['journal'] if r.get('calendarAlchemyAcid'+('Weapon' if kind=='weapon' else 'Armour')+'Round')])==1
  reread,e2,d2=new_page(browser,a)
  assert not e2 and not d2,(kind,'reload',e2,d2)
  assert any(r.get('calendarAlchemyAcidThrown') for r in saved(reread)['journal'])
  assert not any(i['id']=='vial1' for i in saved(reread)['inventory'])
  print('PASS Chromium throw onto',kind,'real inventory, damage, broken vial, reload, history')
  reread.close();page.close()
 browser.close()
