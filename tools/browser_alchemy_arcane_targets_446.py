"""Real Chromium production UI: read-only Arcane target register restored from
physical-vial / actual imbibing journal, no synthetic magic casts. The bundle
is injected because navigation to localhost/file is unavailable in runner.
"""
from pathlib import Path
import subprocess,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads(subprocess.check_output(['node',str(root/'tools/test_alchemy_physic_425.cjs')],cwd=root,
 text=True,env=__import__('os').environ|{'HMK_PHYSIC_FIXTURE':'1'}))
now=fixture['minute']
characters=[{'id':id,'name':id,'kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},
 'sunsign':'Ùlándus','wealth':30,'skills':[{'id':'alc','name':'Alchemy','ml':80}]}} for id in ['A0','A1','B']]
characters.append({'id':'Mage','name':'Mage','kind':'PC','occupation':'Shèk-Pvâr (Fývria)',
 'hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14},
 'skills':[{'id':'pvar','name':'Pvârism','ml':70}],
 'startingPvarSpells':{'occupation':'Shèk-Pvâr (Fývria)','primary':'Fývria','pvarismML':70,
 'chantryStars':5,'chantryConvocation':'Fývria','homeChantry':'Known chantry',
 'guildRank':'','attunedObject':'','naturalAttunement':False,'startingARP':350,
 'freeSpells':['Neutral::Detect','Neutral::Reveal','Neutral::Dispel'],
 'spells':[],'artefacts':[],'spentARP':0,'remainingARP':350,'sourcePages':[54,200,205,211,249]}}})
db={'schemaVersion':1,'characters':characters,'items':[],'inventory':fixture['inventory'],'trash':[],
 'journal':fixture['journal'],'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':now,
 'label':'Arcane source audit','characterIds':['A0','A1','B','Mage'],'anchors':[],
 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'adv','type':'advance','minute':now,'reason':'GM advance'}]}}
bundle=(root/'hmk-app.bundle.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
  args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('CONSOLE:'+m.text) if m.type=='error' else None)
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',db)
 page.add_script_tag(content=bundle)
 page.locator('[data-nav="calendar"]').first.click(timeout=20000)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click()
 # Inspect text directly from DOM: parent calendar accordion may be closed, but
 # its child Arcane accordion exists as a real user-visible expandable control.
 ui=page.locator('details > summary').filter(has_text='Arcane · Detect / Reveal / Dispel / Negation').first.locator('..')
 assert ui.count()==1,('Arcane read-only panel missing',errors,dialogs,page.locator('#app').inner_text()[-1400:])
 ui.evaluate('el=>{el.open=true;el.parentElement.open=true}')
 text=ui.inner_text()
 assert 'Darkvision' in text and 'Dispel EML -30' in text,text
 assert 'Physic' in text and 'uložený fyzický kus' in text,text
 assert 'Detect i Reveal' in text,text
 assert 'Mage' in text and 'Pvârism 70' in text and 'SI 7' in text,text
 assert 'Detect 35 ft / Reveal 7 ft / Dispel 35 ft' in text,text
 before=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 ui.locator('summary').first.click();ui.locator('summary').first.click()
 after=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")')
 assert before==after,'Read-only spell dossier mutated campaign'
 assert not errors and not dialogs,(errors,dialogs)
 print('PASS Chromium v93.446: real calendar spell dossier, stored+active sources, Dispel EML, no journal mutation',flush=True)
 page.close();browser.close()
