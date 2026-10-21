"""Chromium: real Hallucinogenic CF -> Will -> original Aural Shock/Fatigue."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src=(root/'tools/browser_hallucinogenic_409.py').read_text().split('with sync_playwright() as p:')[0].replace("'v93.409'", "'v93.412'")
ns={'__file__':__file__};exec(src,ns)
load_page,fixture,base,store,B=tuple(ns[k] for k in ('load_page','fixture','base','store','B'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=load_page(browser,fixture(base,11))
 form=page.locator('[data-herb-admin]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="targetRef"]').select_option(B);form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(120)
 form=page.locator('[data-hallucinogenic-trance-start]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="conscious"]').check();form.locator('[name="uninterrupted"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(120)
 j=store(page)['journal'];assert not errors and not dialogs,(errors,dialogs);page.close()
 page,errors,dialogs=load_page(browser,fixture(j,18))
 form=page.locator('[data-hallucinogenic-veil]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="uninterrupted"]').check();form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(120)
 form=page.locator('[data-hallucinogenic-transcendence]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="fatiguePenalty"]').fill('5');form.locator('[name="d100"]').fill('100');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(180)
 pre=store(page);trans=[x['calendarHerbTranscendence'] for x in pre['journal'] if x.get('calendarHerbTranscendence')]
 assert len(trans)==1 and trans[0]['sl']=='CF' and trans[0]['willTracked'] is True,(trans,errors,dialogs)
 form=page.locator('[data-hallucinogenic-astral-will]');assert form.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-1600:])
 form.locator('[name="d100"]').fill('76');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(240)
 after=store(page);proof=[x['calendarHerbTranscendenceWill'] for x in after['journal'] if x.get('calendarHerbTranscendenceWill')]
 assert len(proof)==1 and proof[0]['sl']=='F' and proof[0]['auralShockAdded']==1,(proof,errors,dialogs)
 actor=next(x for x in after['characters'] if x['id']==B)
 assert actor['hmk']['arcane']['auralShockLevels']==1 and actor['hmk']['combatState']['fatigue']['otherWeakness']==5,(actor,errors,dialogs)
 assert actor['hmk']['combatState']['events'][-1]['id']==next(x['id'] for x in after['journal'] if x.get('calendarHerbTranscendenceWill'))
 assert after['campaignClock']['minute']==18 and not errors and not dialogs,(after['campaignClock'],errors,dialogs)
 assert page.locator('[data-hallucinogenic-astral-will]').count()==0
 page.screenshot(path=str(root/'browser_transcendence_will_412.png'))
 print('PASS Chromium Trance -> CF Transcendence -> Will F d100 76 -> original Aural Shock1/Weakness5, immutable proof, same GM minute')
 page.close()
 # Independent same earlier source, critical Will failure -> Aural Shock2 / Weakness10.
 page,errors,dialogs=load_page(browser,fixture(pre['journal'],18))
 form=page.locator('[data-hallucinogenic-astral-will]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="d100"]').fill('100');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(180)
 end=store(page);actor=next(x for x in end['characters'] if x['id']==B)
 assert actor['hmk']['arcane']['auralShockLevels']==2 and actor['hmk']['combatState']['fatigue']['otherWeakness']==10,(actor,errors,dialogs)
 assert end['campaignClock']['minute']==18 and not errors and not dialogs,(errors,dialogs)
 print('PASS Chromium Will CF d100 100 -> Aural Shock2/Weakness10; no clock advance')
 page.close();browser.close()
