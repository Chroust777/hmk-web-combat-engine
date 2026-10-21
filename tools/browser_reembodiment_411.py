"""Chromium: real Hallucinogenic Transcendence -> Spirit/Trance SR -> persistent Weariness/Shock."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src=(root/'tools/browser_hallucinogenic_409.py').read_text().split('with sync_playwright() as p:')[0].replace("'v93.409'", "'v93.411'")
ns={'__file__':__file__};exec(src,ns)
load_page,fixture,base,store,B=tuple(ns[k] for k in ('load_page','fixture','base','store','B'))
ns['characters'][1]['hmk']['skills'].append({'id':'sk-spirit','name':'Spirit','ml':60})
ns['characters'][1]['hmk']['skills'][0]['ml']=60
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 def run(j,minute,characters=None):
  db=fixture(j,minute)
  if characters is not None:db['characters']=characters
  page,errors,dialogs=load_page(browser,db)
  return page,errors,dialogs
 page,errors,dialogs=run(base,11)
 form=page.locator('[data-herb-admin]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="targetRef"]').select_option(B);form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(120)
 form=page.locator('[data-hallucinogenic-trance-start]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="conscious"]').check();form.locator('[name="uninterrupted"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(120)
 j=store(page)['journal'];assert not errors and not dialogs,(errors,dialogs)
 page.close()
 page,errors,dialogs=run(j,18)
 form=page.locator('[data-hallucinogenic-veil]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="uninterrupted"]').check();form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(100)
 form=page.locator('[data-hallucinogenic-transcendence]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="fatiguePenalty"]').fill('5');form.locator('[name="d100"]').fill('5');form.locator('[name="bonusD3"]').fill('2');form.locator('[name="gmConfirmed"]').check()
 assert form.locator('[name="willIndex"]').count()==1
 form.locator('[type="submit"]').click();page.wait_for_timeout(150)
 after=store(page)
 proof=[x['calendarHerbTranscendence'] for x in after['journal'] if x.get('calendarHerbTranscendence')]
 assert len(proof)==1 and proof[0]['reembodimentTracked'] is True,(proof,errors,dialogs)
 beforeReturn=store(page)
 form=page.locator('[data-hallucinogenic-reembodiment]');assert form.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-900:])
 form.locator('[name="spiritRoundsSpent"]').fill('2');form.locator('[name="d100"]').fill('76');form.locator('[name="tranceD10"]').fill('4')
 for checkbox in ['physicalStateClear','spiritActionsAdjudicated','gmConfirmed']:form.locator('[name="'+checkbox+'"]').check()
 form.locator('[type="submit"]').click();page.wait_for_timeout(220)
 end=store(page)
 returns=[x['calendarHerbReembodiment'] for x in end['journal'] if x.get('calendarHerbReembodiment')]
 assert len(returns)==1,(returns,errors,dialogs,page.locator('#app').inner_text()[-1100:])
 assert returns[0]['baseSL']=='F' and returns[0]['adjustedSL']=='S' and returns[0]['weariness']==5,(returns,errors,dialogs)
 actor=[x for x in end['characters'] if x['id']==B][0]
 assert actor['hmk']['combatState']['fatigue']['weariness']==5,(actor['hmk']['combatState'],errors,dialogs)
 assert actor['hmk']['combatState']['shock']=='NONE'
 assert end['campaignClock']['minute']==18 and not errors and not dialogs,(end['campaignClock'],errors,dialogs)
 assert page.locator('[data-hallucinogenic-reembodiment]').count()==0
 page.screenshot(path=str(root/'browser_reembodiment_411.png'))
 print('PASS Chromium real Trance -> Transcendence CS +d3 -> Spirit d100 F + successful Trance SR => S, Weariness +5, immutable record, original persistent state, unchanged GM clock')
 page.close()
 # Same legitimately pending source, but failed Trance secondary d10 => stunned in the original Shock stream.
 page,errors,dialogs=run(beforeReturn['journal'],18,beforeReturn['characters'])
 form=page.locator('[data-hallucinogenic-reembodiment]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="spiritRoundsSpent"]').fill('2');form.locator('[name="d100"]').fill('76');form.locator('[name="tranceD10"]').fill('10')
 for checkbox in ['physicalStateClear','spiritActionsAdjudicated','gmConfirmed']:form.locator('[name="'+checkbox+'"]').check()
 form.locator('[type="submit"]').click();page.wait_for_timeout(190)
 end=store(page);actor=[x for x in end['characters'] if x['id']==B][0]
 assert actor['hmk']['combatState']['shock']=='STN' and actor['hmk']['combatState']['fatigue']['weariness']==10,(actor,errors,dialogs)
 assert actor['hmk']['combatState']['shockFollowup']['kind']=='STN' and not errors and not dialogs,(actor,errors,dialogs)
 assert end['campaignClock']['minute']==18
 print('PASS Chromium Spirit F + failed Trance SR => physical STN +10 Weariness and original Shock followup, unchanged GM clock')
 page.close();browser.close()
