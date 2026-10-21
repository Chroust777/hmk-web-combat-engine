"""Chromium real UI astral roll after HMK v93.409 Trance/Lucid Dream."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'tools/browser_hallucinogenic_409.py').read_text().split('with sync_playwright() as p:')[0].replace("'v93.409'", "'v93.410'")
scope={'__file__':__file__}
exec(source,scope)
load_page,fixture,base,store,B=tuple(scope[k] for k in ('load_page','fixture','base','store','B'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 def run_page(j,minute):
  page,errors,dialogs=load_page(browser,fixture(j,minute))
  return page,errors,dialogs
 # Dose and pending trance.
 page,errors,dialogs=run_page(base,11)
 form=page.locator('[data-herb-admin]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="targetRef"]').select_option(B);form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(130)
 form=page.locator('[data-hallucinogenic-trance-start]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="conscious"]').check();form.locator('[name="uninterrupted"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(130)
 journal=store(page)['journal'];assert len([x for x in journal if x.get('calendarHerbHallucinogenicTranceStart')])==1,(errors,dialogs)
 assert not errors and not dialogs,(errors,dialogs)
 page.close()
 # New Lift the Veil proof marks required Transcendence at the same GM minute.
 page,errors,dialogs=run_page(journal,18)
 form=page.locator('[data-hallucinogenic-veil]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="uninterrupted"]').check();form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(140)
 after=store(page)
 veil=[x['calendarHerbHallucinogenicVeil'] for x in after['journal'] if x.get('calendarHerbHallucinogenicVeil')]
 assert len(veil)==1 and veil[0].get('transcendenceTracked') is True,(veil,errors,dialogs)
 form=page.locator('[data-hallucinogenic-transcendence]');assert form.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-1600:])
 form.locator('[name="fatiguePenalty"]').fill('5');form.locator('[name="d100"]').fill('5');form.locator('[name="bonusD3"]').fill('2');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(200)
 after=store(page)
 transc=[x['calendarHerbTranscendence'] for x in after['journal'] if x.get('calendarHerbTranscendence')]
 assert len(transc)==1 and transc[0]['sl']=='CS' and transc[0]['bonusSpiritRounds']==2,(transc,errors,dialogs)
 assert after['campaignClock']['minute']==18 and not errors and not dialogs,(errors,dialogs)
 assert page.locator('[data-hallucinogenic-transcendence]').count()==0
 print('PASS Chromium Lift the Veil -> actual d100 5 -> CS, actual d3 2, one immutable proof, GM clock unchanged')
 page.screenshot(path=str(root/'browser_transcendence_410.png'));page.close()
 # New dream d20 then Saviris d20 before its first astral round.
 page,errors,dialogs=run_page(after['journal'],21)
 form=page.locator('[data-hallucinogenic-dream]');assert form.count()==1,(errors,dialogs)
 form.locator('[name="willIndex"]').fill('2');form.locator('[name="d20"]').fill('18');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(140)
 after=store(page)
 dream=[x['calendarHerbLucidDream'] for x in after['journal'] if x.get('calendarHerbLucidDream')]
 assert len(dream)==1 and dream[0]['savirisTracked'] is True and dream[0]['dreamRounds']==2,(dream,errors,dialogs)
 form=page.locator('[data-hallucinogenic-saviris]');assert form.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-1200:])
 form.locator('[name="d20"]').fill('1');form.locator('[name="gmConfirmed"]').check();form.locator('[type="submit"]').click();page.wait_for_timeout(160)
 done=store(page)
 sv=[x['calendarHerbSaviris'] for x in done['journal'] if x.get('calendarHerbSaviris')]
 assert len(sv)==1 and sv[0]['bound'] is True and sv[0]['d20']==1,(sv,errors,dialogs)
 assert done['campaignClock']['minute']==21 and not dialogs and not errors,(dialogs,errors)
 assert page.locator('[data-hallucinogenic-saviris]').count()==0
 print('PASS Chromium Lucid Dream d20 18 -> 2 rounds; actual Saviris d20 1 -> possible binding, one proof, no clock advance')
 page.screenshot(path=str(root/'browser_saviris_410.png'));page.close()
 browser.close()
