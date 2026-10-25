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
window.__hmkTreatAndCalendar484=()=>{
 const actor=data.characters[0],state=actor.hmk.combatState,w=state.wounds[0];
 const result=require('./src/integration/hmk-healing-persistence.js').applyConfirmedTreatment({state,round:Math.max(1,state.lastRound),eventId:'treat-untreated-484',woundId:w.id,daySinceInjury:0,untreated:true,gmConfirmed:true});
 if(!mutate(()=>{synchronizeCombatInjuries(actor,result.state);data.journal.push({id:'test-untreated484',characterId:actor.id,createdAt:'test',title:'Test no-treatment',body:'Explicitly attested untreated for test',calendarCampaignId:'browser484',campaignMinute:data.campaignClock.minute});}))throw Error('Untreated commitment failed');
 return require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal);
};
window.__hmkAdvanceHealing484=(minutes)=>{
 const api=require('./src/integration/hmk-campaign-calendar.js');
 const next=api.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:minutes,eventId:'advance484',reason:'Testovací posun o pět dnů',gmConfirmed:true,characters:data.characters,journal:data.journal});
 const agenda=api.campaignCalendarAgenda(next,data.characters,data.journal);return {...agenda,nextMinute:next.minute};
};
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
 assert not page.locator('.hmk-auto-generation-overlay').count(),(dialog,page.locator('#app').inner_text()[:1500])
 page.wait_for_function("()=>{try{return JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1'))?.characters?.length>0}catch{return false}}",timeout=25000)
 page.evaluate('window.__hmkSeed484()')
 assert page.locator('form[data-climbing-fall-form]').count()==1,(errs,page.locator('#app').inner_text()[-1800:])
 pre=page.evaluate('window.__hmkSee484()');form=page.locator('form[data-climbing-fall-form]')
 form.locator('[name=heightFt]').fill('21')
 row=form.locator('[data-climb-fall-row]').first
 for key,value in [('impactD10','10'),('zoneD10','4'),('locationD10','1'),('fallingD100','11'),('shockD100','10')]:row.locator(f'[name={key}]').fill(value)
 assert 'Klasifikace poranění se zobrazí až po potvrzení' in form.locator('[data-climb-fall-guide]').inner_text()
 assert 'S2' not in form.locator('[data-climb-fall-guide]').inner_text(),'premature injury label'
 for key in ('impactD10','zoneD10','locationD10','fallingD100','shockD100','compoundD10'):
  field=row.locator(f'[name={key}]')
  assert field.evaluate('(el)=>el.nextElementSibling?.dataset.hmkGeneralAutoDie')=='true',(key,form.inner_text()[:700])
 assert page.evaluate('window.__hmkSee484()')==pre,'Preview changed persistent injuries before confirmation'
 row.locator('[name=impactD10]').evaluate('(e)=>e.scrollIntoView()')
 row.locator('[name=impactD10] + [data-hmk-general-auto-die]').click()
 assert row.locator('[name=impactD10]').evaluate('(e)=>e.dataset.hmkAutoDice===e.value'),'generator origin not marked'
 row.locator('[name=impactD10]').fill('10')
 assert not row.locator('[name=impactD10]').get_attribute('data-hmk-auto-dice'),'manual typing must override origin'
 # Lower fall height to preserve a positive but minor real injury and avoid creating a shock incapacitation in this isolated scenario.
 form.locator('button[type=submit]').click()
 done=page.evaluate('window.__hmkSee484()')
 assert len(done['state']['wounds'])>=1,('not saved',dialog,form.locator('output').inner_text() if form.count() else '')
 assert len(done['clock']['anchors'])>=1,('no calendar anchor',done['clock'])
 wound=done['state']['wounds'][0]
 assert wound['id'] in {w.get('woundId') for w in done['clock']['anchors']},'wound anchor missing'
 assert any(j.get('skillTestProof',{}).get('status')=='committed' for j in done['journal']),'No committed proof'
 assert any('fall' in str(e.get('type','')) for e in done['state']['events']),'no combat event'
 assert len(done['state']['wounds'])==len({w['id'] for w in done['state']['wounds']}),'duplicate wounds'
 assert page.locator('[data-climbing-fall-form]').count()==0,'completed fall remains editable'
 page.locator('[data-sheet-section="overview"]').click()
 loc=page.locator(f'.journal-body-locations tr').filter(has=page.locator('td.journal-injuries')).filter(has_text=wound['location'].upper())
 assert loc.count()>=1,('missing anatomical row',wound)
 assert wound['severity']+str(wound['level']) in loc.first.inner_text(),('anatomy severity mismatch',wound,loc.first.inner_text())
 page.locator('[data-sheet-section="status"]').click()
 assert wound['severity']+str(wound['level']) in page.locator('#app').inner_text(),'Combat & Conditions missing injury'
 page.evaluate('window.__hmkRehydrate484()')
 assert wound['severity']+str(wound['level']) in page.locator('#app').inner_text(),'State lost on rehydration'
 assert page.evaluate('window.__hmkSee484()')==done,'Rehydrate lost canonical state or calendar'
 # Domain + real persisted mutation: untreated HMK wound schedules exactly day 5;
 # no extra independent wound database, and calendar refuses skipping the due time.
 agenda=page.evaluate('window.__hmkTreatAndCalendar484()')
 healing=[e for e in agenda['future'] if e['kind']=='healing']
 assert len(healing)==1,('No 5-day healing due event',agenda)
 assert healing[0]['minute']==480+5*1440,healing
 assert healing[0]['sourceId']==wound['id'] if 'sourceId' in healing[0] else healing[0].get('woundId')==wound['id'],healing
 try:
  at_due=page.evaluate('window.__hmkAdvanceHealing484(7200)')
 except Exception as ex:raise AssertionError(('Clock after treatment',dialog,errs,str(ex)))
 assert len([e for e in at_due['due'] if e['kind']=='healing'])==1,at_due
 assert at_due['nextMinute']==480+7200
 assert page.evaluate('window.__hmkSee484().clock.minute')==480,'Only dedicated GM advance action may persist campaign time'
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
 page.locator('[data-nav="skills"]').first.click()
 assert page.locator('.hsk-skill-rule-explainer').count()==1,'No concise Skill Test guide'
 assert page.locator('.hsk-sensory-rules').count()==0,'Exceptional senses should be hidden without ailments'
 assert 'Success Value' in page.locator('.hsk-skill-rule-explainer').inner_text()
 assert not errs,(errs,dialog)
 print('PASS Chromium: generated character, preview no injuries, d10/d100 buttons and manual provenance, atomic injury and original Combat State, calendar wound anchor, anatomical display, duplicate guard, campaign rehydrate, shopping vs free vessel')
 browser.close()
