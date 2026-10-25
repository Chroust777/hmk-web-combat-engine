"""Isolated Chromium regression. Only memory-backed storage; no GitHub activity.
Tests UI preview vs commit, anatomical display, CF repeat, dice provenance,
and acquisition route control. These test characters are never synchronized.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(bundle[len(prefix):])
modules['app.js']+='''
window.__hmkSeed484=()=>{
 const actor=data.characters[0], initial=require('./src/integration/persistent-combat-state.js').initialCombatState();
 actor.hmk.skills=(actor.hmk.skills||[]).filter(x=>!['acrobatics','jumping','shock'].includes(String(x.name).toLowerCase()));
 actor.hmk.skills.push({id:'skill-acro484',name:'Acrobatics',ml:90},{id:'skill-jump484',name:'Jumping',ml:90},{id:'skill-shock484',name:'Shock',ml:90});
 actor.hmk.combatState=initial;
 data.inventory=[];data.campaignClock={format:'hmk-campaign-calendar-v1',campaignId:'browser484',label:'Test 484',minute:480,characterIds:[actor.id],anchors:[],events:[{id:'test-init484',type:'init',minute:480,reason:'Testovací začátek kampaně'}]};
 data.journal.push({id:'test-source484',characterId:actor.id,calendarCampaignId:'browser484',campaignMinute:480,createdAt:'test',title:'Climbing CF',body:'Nepovedený Climbing',skillTestProof:{type:'critical-followup',actorId:actor.id,skill:'Climbing',activity:'climb-easy',result:{level:'CF'}}});
 selected=actor.id;view='sheet';activeSheetSection='status';storageReadOnly=false;const raw=JSON.stringify(data);localStorage.setItem(STORAGE,raw);storageBaseline=raw;render();
};
window.__hmkSee484=()=>({state:structuredClone(data.characters[0].hmk.combatState),journal:structuredClone(data.journal),clock:structuredClone(data.campaignClock),inventory:structuredClone(data.inventory)});
window.__hmkRehydrate484=()=>{data=JSON.parse(localStorage.getItem(STORAGE));selected=data.characters[0].id;view='sheet';activeSheetSection='status';render()};
window.__hmkProvisions484=(route)=>{view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=data.characters[0].id;provisionGuideRoute=route;render()};
'''
bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(prefix)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1650,'height':1000});errs=[];dialog=[]
 page.on('pageerror',lambda err:errs.append(str(err)))
 page.on('dialog',lambda d:(dialog.append(d.message),d.accept()))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ('styles.css','skill-workbench.css','book-templates.css','library.css'):page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 page.locator('[data-action="auto-random-character"]').click();page.locator('#hmk-random-name-form [name="name"]').fill('Testovací cestovatel');page.locator('#hmk-random-name-form button[type=submit]').click()
 start=time.monotonic()
 while page.locator('.hmk-auto-generation-overlay').count() and time.monotonic()-start<40:page.wait_for_timeout(100)
 assert not page.locator('.hmk-auto-generation-overlay').count(),dialog
 page.evaluate('window.__hmkSeed484()')
 assert page.locator('form[data-climbing-fall-form]').count()==1,(errs,page.locator('#app').inner_text()[-1800:])
 pre=page.evaluate('window.__hmkSee484()');form=page.locator('form[data-climbing-fall-form]')
 form.locator('[name=heightFt]').fill('6')
 first=form.locator('[data-climb-fall-row]').first
 first.locator('[name="technique"]').select_option('Acrobatics')
 for key,value in [('impactD10','5'),('zoneD10','2'),('locationD10','4'),('fallingD100','95'),('shockD100','10')]:first.locator(f'[name={key}]').fill(value)
 assert 'CF: přidejte další CELÝ dopad' in form.locator('[data-climb-fall-guide]').inner_text(),form.locator('[data-climb-fall-guide]').inner_text()
 css=page.locator('.hsk-fall-warning').first.evaluate('(el)=>getComputedStyle(el).color')
 assert css=='rgb(33, 26, 17)',('CF warning contrast',css)
 assert page.evaluate('window.__hmkSee484()')==pre,'CF preview must not commit any partial result'
 form.locator('button[type=submit]').click()
 assert len(page.evaluate('window.__hmkSee484().state.wounds'))==0,'an incomplete CF repeat saved injury'
 assert 'CF v testu dopadu' in form.locator('output').inner_text(),form.locator('output').inner_text()
 form.locator('[data-climb-fall-add]').click()
 second=form.locator('[data-climb-fall-row]').last
 assert form.locator('[data-climb-fall-row]').count()==2
 for key in ('impactD10','zoneD10','locationD10','fallingD100'):
  assert second.locator(f'[name={key}]').evaluate('(el)=>el.nextElementSibling?.dataset.hmkGeneralAutoDie')=='true',(key,second.inner_text())
 second.locator('[name="technique"]').select_option('Acrobatics')
 for key,value in [('impactD10','2'),('zoneD10','4'),('locationD10','1'),('fallingD100','11')]:second.locator(f'[name={key}]').fill(value)
 assert 'Všechny povinné hody jsou doložené' in form.locator('[data-climb-fall-guide]').inner_text(),form.locator('[data-climb-fall-guide]').inner_text()
 assert page.evaluate('window.__hmkSee484()')==pre,'two CF rows preview mutated stored state'
 form.locator('button[type=submit]').click()
 done=page.evaluate('window.__hmkSee484()')
 assert len(done['state']['wounds'])>=1,('CF chain not committed',form.locator('output').inner_text() if form.count() else '',dialog)
 assert len(done['clock']['anchors'])==len(done['state']['wounds']),('CF wound anchors wrong',done['clock']['anchors'])
 proofs=[j['skillTestProof'] for j in done['journal'] if j.get('skillTestProof',{}).get('type')=='climbing-falling']
 assert len(proofs)==1 and len(proofs[0]['proofs'])==2,proofs
 assert proofs[0]['proofs'][0]['level']=='CF' and proofs[0]['proofs'][1]['level']=='S',proofs
 assert done['state']['wounds'][0]['id'] in {a['woundId'] for a in done['clock']['anchors']},'missing exact wound anchor'
 assert page.locator('form[data-climbing-fall-form]').count()==0
 page.locator('[data-sheet-section="overview"]').click()
 wound=done['state']['wounds'][0]
 row=page.locator('.journal-anatomy-table tbody tr').filter(has=page.locator('td.journal-injuries')).filter(has_text=wound['location'].upper()).first
 assert wound['severity']+str(wound['level']) in row.inner_text(),'CF wound invisible on anatomical row'
 page.locator('[data-sheet-section="status"]').click()
 page.evaluate('window.__hmkRehydrate484()')
 assert page.evaluate('window.__hmkSee484()')==done,'Rehydrate lost CF chain'
 # Acquisition routes: shopping-only purchase and own supplies only free (no selector).
 page.evaluate('window.__hmkProvisions484("buy")')
 buy=page.locator('form[data-provision-vessel-acquire]')
 assert buy.count()==1,(errs,page.locator('#app').inner_text()[-1700:])
 assert buy.locator('[name="acquisition"]').count()==0
 assert 'Zakoupit nádobu na pitnou vodu' in page.locator('.hc-provision-vessel-purchase>summary').inner_text()
 assert 'Hotovost:' in page.locator('.hc-provision-vessel-purchase>summary').inner_text()
 page.evaluate('window.__hmkProvisions484("have")')
 own=page.locator('form[data-provision-vessel-acquire]')
 assert own.count()==1 and own.locator('[name="acquisition"]').count()==0
 assert 'Převzít zdarma' in own.locator('button[type=submit]').text_content() and 'Hotovost:' not in page.locator('.hc-provision-vessel-purchase>summary').inner_text()
 assert not errs,(errs,dialog)
 print('PASS Chromium CF: missing repeated impact blocks save, two real impacts saved atomically, black CF warnings, dynamic dice controls, authoritative anatomy/calendar, rehydrate, buy/free provenance')
 browser.close()
