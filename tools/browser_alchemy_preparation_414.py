"""Chromium smoke: new Alchemy preparation is an append-only GM-clock operation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
A='alchemy-actor';C='alchemy-campaign'
fixture={'schemaVersion':1,'characters':[{'id':A,'name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12},'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}],
'items':[],'inventory':[],'trash':[],'journal':[],
'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':C,'minute':0,'label':'Alchemy test','characterIds':[A], 'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(150)
 assert 'v93.435' in page.locator('#app').inner_text(),('boot',errors,page.locator('#app').inner_text()[:500])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(100)
 form=page.locator('[data-alchemy-start]')
 assert form.count()==1,('start form',errors,dialogs,page.locator('#app').inner_text()[-1300:])
 form.evaluate('el=>el.closest("details").open=true')
 form.locator('select[name="elixirName"]').select_option('Healing')
 form.locator('select[name="workshopSource"]').select_option('private')
 form.locator('[data-alchemy-roll-time]').click()
 times=[int(form.locator(f'[name="timeD6{i}"]').input_value()) for i in range(3)]
 assert all(1<=v<=6 for v in times),times
 form.locator('[name="workshopConfirmed"]').check()
 form.locator('[type="submit"]').click();page.wait_for_timeout(200)
 assert not errors and not dialogs,(errors,dialogs)
 saved=page.evaluate('JSON.parse(window.localStorage.getItem("hmk-keepers-ledger-v1"))')
 starts=[r['calendarAlchemyStart'] for r in saved['journal'] if r.get('calendarAlchemyStart')]
 assert len(starts)==1,(starts,errors,dialogs)
 x=starts[0]
 assert x['elixirName']=='Healing' and x['principle']=='Life' and x['sunsignModifier']==15 and x['durationDays']==10+sum(times),x
 assert x['workshopStars']==5 and all(v=='cryptographic-software-die' for v in x['timeOrigins']),x
 assert saved['campaignClock']['minute']==0,'Alchemist illegally moved GM time'
 assert not saved['inventory'],'Alchemy start created fictional inventory item'
 assert page.locator('[data-alchemy-start]').count()==0,'Same actor may not start second preparation'
 assert 'Alchemy' in page.locator('#app').inner_text()
 print('PASS Chromium: real Alchemy form, 3 cryptographic dice, correct calendar due, provenance, no duplicate start, no GM-clock or inventory mutation')
 browser.close()
