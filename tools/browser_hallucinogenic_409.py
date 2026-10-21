"""Chromium integration for new p.75,291–292 Hallucinogenic calendar UI."""
from pathlib import Path
import json,subprocess,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src=(root/'tools/browser_herb_admin_394.py').read_text()
js=re.search(r"js=r'''\n(.*?)\n'''",src,re.S).group(1).replace('stimulant','hallucinogenic')
base=json.loads(subprocess.check_output(['node','-e',js],cwd=root,text=True))
A='herbal-actor';B='patient';C='A'
characters=[{'id':A,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'aur':14,'wil':15},'skills':[{'id':'sk-trance','name':'Trance','ml':60}]}},
 {'id':B,'name':'Dreamer','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'aur':15,'wil':12},'skills':[{'id':'sk-trance-p','name':'Trance','ml':55}]}}]
def fixture(journal,minute):
 return {'schemaVersion':1,'characters':characters,'items':[],'inventory':[],'trash':[],'journal':journal,'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':C,'minute':minute,'label':'Dreams','characterIds':[A,B],'anchors':[], 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':minute,'reason':'GM confirmed'}]}}
def load_page(browser,fixture):
 page=browser.new_page(viewport={'width':1450,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(150)
 assert 'v93.409' in page.locator('#app').inner_text(),page.locator('#app').inner_text()[:300]
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 return page,errors,dialogs
def store(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,errors,dialogs=load_page(browser,fixture(base,11))
 forms=page.locator('[data-herb-admin]');assert forms.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-1500:]);
 forms.locator('[name="targetRef"]').select_option(B);forms.locator('[name="gmConfirmed"]').check();forms.locator('[type="submit"]').click();page.wait_for_timeout(180)
 saved=store(page);assert len([j for j in saved['journal'] if j.get('calendarHerbPotionAdminister')])==1,(dialogs,errors)
 assert saved['journal'][-1]['calendarHerbPotionAdminister']['hallucinogenicTracked'] is True
 assert saved['campaignClock']['minute']==11 and not errors and not dialogs,(errors,dialogs)
 assert page.locator('[data-hallucinogenic-trance-start]').count()==1,page.locator('#app').inner_text()[-2000:]
 form=page.locator('[data-hallucinogenic-trance-start]');form.locator('[name="conscious"]').check();form.locator('[name="uninterrupted"]').check();form.locator('button[type="submit"]').click();page.wait_for_timeout(160)
 saved=store(page);assert len([j for j in saved['journal'] if j.get('calendarHerbHallucinogenicTranceStart')])==1,(dialogs,errors)
 assert saved['campaignClock']['minute']==11 and not errors and not dialogs,(errors,dialogs)
 page.screenshot(path=str(root/'browser_hallucinogenic_start_409.png'))
 print('PASS Chromium Hallucinogenic administration + GM-attested Trance start; two append-only proofs, no time change')
 page.close()
 # Due Trance at minute 18 (15-SV=7): verify completion; no fictional astral success.
 page,errors,dialogs=load_page(browser,fixture(saved['journal'],18));t=page.locator('[data-hallucinogenic-veil]')
 assert t.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-1300:]);t.locator('[name="uninterrupted"]').check();t.locator('[name="gmConfirmed"]').check();t.locator('button[type="submit"]').click();page.wait_for_timeout(140)
 after=store(page);v=[x['calendarHerbHallucinogenicVeil'] for x in after['journal'] if x.get('calendarHerbHallucinogenicVeil')]
 assert len(v)==1 and v[0]['transcendenceBonus']==32 and v[0]['astralJourneyResolved'] is False,(v,errors,dialogs)
 assert after['campaignClock']['minute']==18 and not dialogs and not errors,(dialogs,errors)
 print('PASS Chromium Hallucinogenic Trance → GM-attested Lift the Veil at minute 18; Transcendence remains unresolved')
 page.screenshot(path=str(root/'browser_hallucinogenic_veil_409.png'));page.close()
 # Dream d20 is a separate check at minute 21.
 page,errors,dialogs=load_page(browser,fixture(after['journal'],21));form=page.locator('[data-hallucinogenic-dream]')
 assert form.count()==1,(errors,dialogs,page.locator('#app').inner_text()[-1300:]);form.locator('[name="willIndex"]').fill('1');form.locator('[name="d20"]').fill('18');form.locator('[name="gmConfirmed"]').check();form.locator('button[type="submit"]').click();page.wait_for_timeout(150)
 done=store(page);d=[x['calendarHerbLucidDream'] for x in done['journal'] if x.get('calendarHerbLucidDream')]
 assert len(d)==1 and d[0]['tableRounds']==2 and d[0]['dreamRounds']==1 and d[0]['savirisD20Required'],(d,dialogs,errors)
 assert done['campaignClock']['minute']==21 and not dialogs and not errors,(dialogs,errors)
 print('PASS Chromium Hallucinogenic Lucid Dream d20=18, Aura15 => table2 rounds, Will Index1 => 1 round; GM time unchanged')
 page.screenshot(path=str(root/'browser_hallucinogenic_dream_409.png'));page.close()
 browser.close()
