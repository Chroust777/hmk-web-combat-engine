from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
actor='herbal-actor';campaign='A'
source={'id':'herbs-found','characterId':actor,'calendarCampaignId':campaign,'campaignMinute':0,
'calendarTrekWildernessProof':{'results':[{'herbName':'coagulant','herbDoses':2,'foodDays':0,'waterDays':0}]}}
fixture={'schemaVersion':1,'characters':[{'id':actor,'name':'Herbalist','kind':'PC','hmk':{'attributes':{'str':12,'end':12},'skills':[]}}],
'items':[],'inventory':[],'trash':[],'journal':[],
'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':campaign,'minute':0,'label':'Herbal test',
'characterIds':[actor],'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1500,'height':950});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(200)
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(150)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(150)
 # An empty campaign must show the new herbs workbench without fabricating a find.
 text=page.locator('#app').inner_text()
 assert 'byliny, potence, konzervace a lektvary' in text,text[-1500:]
 assert page.locator('[data-herb-assess]').count()==0
 assert not errors,errors
 print('PASS Chromium: herbs panel loads cleanly without faked Foraging sources; no JS errors')
 page.screenshot(path=str(root/'browser_herbs_393.png'))
 browser.close()
