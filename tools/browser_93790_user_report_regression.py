"""v93.790 focused true-Chromium regression of user-reported Travel UI failures.
Uses the existing synthetic seeded two-character test campaign; no edits to production data.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'tools/browser_93780_travel_hazards.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93780_travel_hazards.py')}
exec(source.split('with sync_playwright() as p:')[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
mods['app.js']+='''
window.__audit93790Items=()=>{data.inventory.push({id:'item-b',characterId:'b',snapshot:{name:'Plášť postavy B',category:'other',properties:{weightLb:1}},quantity:1,slot:'carried'},
{id:'item-chest-a',characterId:'a',snapshot:{name:'V truhle',category:'other',properties:{weightLb:1}},quantity:1,slot:'chest'},
{id:'item-zero-a',characterId:'a',snapshot:{name:'Nulový kus',category:'other',properties:{weightLb:1}},quantity:0,slot:'carried'});
 storageBaseline=JSON.stringify(data);localStorage.setItem(STORAGE,storageBaseline);render();};
window.__audit93790ForceReturn=()=>{episodePendingSkillRequest={id:'synthetic-ui-return',episodeEpoch:episodeDraftEpoch,field:'hazardEvidenceId',skill:'Agility',actorId:'a',campaignId:require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock),minute:data.campaignClock.minute,status:'waiting'};
 episodeSkillReturnPending=true;selected='a';view='skills';activeSkillTab='secondary';render();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1500,'height':1000});page.set_default_timeout(15000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(ROOT/f).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__auditHazardSeed("report93790")');page.evaluate('window.__audit93790Items()')
 page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last
 r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('travel')
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
 assert f.is_visible()
 # Ownership and physical possession: only active actor's carried equipment.
 options=f.locator('[name=hazardItemId] option').evaluate_all('(a)=>a.map(x=>({value:x.value,text:x.textContent}))')
 print('ITEMS_A',options,flush=True)
 assert {x['value'] for x in options}=={'','item-a'},options
 # Moving guide changes the available inventory IDs, cannot keep item A selected.
 f.evaluate("f=>{f.querySelector('[name=memberIds][value=a]').checked=false;f.querySelector('[name=memberIds][value=b]').checked=true;const g=f.elements.namedItem('guideId');g.value='b';g.dispatchEvent(new Event('change',{bubbles:true}));}")
 opt_b=f.locator('[name=hazardItemId] option').evaluate_all('(a)=>a.map(x=>x.value)')
 print('ITEMS_B',opt_b,flush=True)
 assert set(opt_b)=={'','item-b'},opt_b
 f.evaluate("f=>{f.querySelector('[name=memberIds][value=a]').checked=true;f.querySelector('[name=memberIds][value=b]').checked=false;const g=f.elements.namedItem('guideId');g.value='a';g.dispatchEvent(new Event('change',{bubbles:true}));}")
 opt_a=f.locator('[name=hazardItemId] option').evaluate_all('(a)=>a.map(x=>x.value)')
 assert set(opt_a)=={'','item-a'},opt_a
 # Reproduce old dead button: placeholder hazard minute is initially inaccessible.
 f.evaluate('''f=>{f.elements.namedItem('survivalD10').value='9';
 f.querySelector('[data-episode-section="rolls"]').hidden=true;
 f.querySelector('[data-episode-hazard-details]').hidden=true;
 for(const n of f.querySelectorAll('[data-hazard-minute]'))n.hidden=true;}''')
 page.evaluate('''()=>{const x=document.createElement('button');x.type='button';x.textContent='Zadat přesnou minutu';x.dataset.episodeJump='hazardAtMinute';document.body.appendChild(x)}''')
 page.locator('body > button[data-episode-jump]').click()
 state=page.evaluate('''()=>{const f=document.querySelector('#hmk-time-episode-form'),el=f.elements.namedItem('hazardAtMinute');return {focused:document.activeElement===el,fieldVisible:!!el.getClientRects().length,red:el.closest('label').classList.contains('hc-episode-needs-input'),rollsHidden:f.querySelector('[data-episode-section="rolls"]').hidden,hazardHidden:f.querySelector('[data-episode-hazard-details]').hidden}}''')
 print('COMPLICATION_MINUTE_JUMP',state,flush=True)
 assert state=={'focused':True,'fieldVisible':True,'red':True,'rollsHidden':False,'hazardHidden':False},state
 f.locator('[name=hazardAtMinute]').fill('35');assert f.locator('[name=hazardAtMinute]').input_value()=='35'
 # The original tooltip must include all printed p.149 skills with useful contexts.
 hint=f.locator('[name=hazardComplicationSkill]').locator('xpath=..').locator('[data-hmk-help]').get_attribute('data-hmk-help')
 assert all(x in hint for x in ['Agility','Animalcraft','Climbing','Timbercraft','Swimming']),hint
 print('COMPLICATION_TOOLTIP_PASS',hint[:125],flush=True)
 f.locator('[data-hazard-complication]').evaluate_all('(xs)=>xs.forEach(x=>x.hidden=false)');f.locator('[data-hazard-complication] [data-hmk-help]').first.evaluate("x=>{for(let n=x;n&&n.tagName!=='FORM';n=n.parentElement){n.hidden=false;if(n.tagName==='DETAILS')n.open=true}}");f.locator('[data-hazard-complication] [data-hmk-help]').first.hover();page.mouse.move(1,1);f.locator('[data-hazard-complication] [data-hmk-help]').first.hover();tip=page.locator('.hmk-journal-floating-tooltip:visible');print('TIP_DIAG',page.evaluate('''()=>({tip:[...document.querySelectorAll('.hmk-journal-floating-tooltip')].map(x=>[x.hidden,x.textContent.slice(0,40)]),hover:document.querySelector('[name=hazardComplicationSkill]').previousElementSibling.matches(':hover'),context:!!document.querySelector('[name=hazardComplicationSkill]').closest('.journal-book')})'''),flush=True);assert tip.count() and 'Animalcraft' in tip.inner_text();print('TOOLTIP_HOVER_PASS',flush=True)
 # Real rendered weather panels: full-width cold equipment area and aligned checkbox.
 f.evaluate('''f=>{const block=f.querySelector('[data-episode-weather-details]');block.hidden=false;const c=f.querySelector('[data-episode-weather-kind="cold"]');c.hidden=false;const a=c.querySelector('[data-episode-weather-actor]');a.hidden=false;a.open=true;for(let x=block;x&&x!==f;x=x.parentElement){x.hidden=false;if(x.tagName==='DETAILS')x.open=true;}}''')
 weather=page.evaluate('''()=>{const f=document.querySelector('#hmk-time-episode-form'),kit=f.querySelector('.hc-cold-kit'),container=kit.closest('.hc-weather-step-grid'),check=kit.querySelector('.hc-check'),rc=x=>x.getBoundingClientRect();return {kitWidth:rc(kit).width,gridWidth:rc(container).width,checkWidth:rc(check).width,kitDisplay:getComputedStyle(kit).display,checkDisplay:getComputedStyle(check).display,checkDirection:getComputedStyle(check).flexDirection}}''')
 print('COLD_UI',weather,flush=True)
 print('COLD_ANCESTORS',page.evaluate('''()=>{let x=document.querySelector('.hc-cold-kit'),r=[];for(;x&&r.length<13;x=x.parentElement)r.push([x.tagName,x.className,x.hidden,getComputedStyle(x).display,x.getBoundingClientRect().width]);return r}'''),flush=True)
 assert weather['kitWidth']>300 and weather['kitWidth']<=weather['gridWidth']+4 and weather['checkDirection']=='row',weather
 page.locator('.hc-cold-kit').first.screenshot(path=str(ROOT/'tools/93790_cold_layout_test.png'));page.set_viewport_size({'width':420,'height':900});narrow=page.evaluate('''()=>{const e=document.querySelector('.hc-cold-kit');return {client:e.clientWidth,scroll:e.scrollWidth,cols:getComputedStyle(e).gridTemplateColumns}}''');print('COLD_NARROW',narrow,flush=True);assert narrow['scroll']<=narrow['client']+2,narrow;page.set_viewport_size({'width':1500,'height':1000})
 # Navigational control for an Agility Skill Test must be permanently visible, not inside hidden folio.
 page.evaluate('window.__audit93790ForceReturn()')
 route=page.locator('[data-episode-return]');print('SKILL_RETURN_BUTTONS',route.count(),flush=True)
 eml=page.evaluate('''()=>{const x=document.querySelector('.hsk-eml-chip b');return x?Number.parseFloat(getComputedStyle(x).fontSize):null}''');print('EML_FONT_SIZE',eml,flush=True);assert eml is None or eml<=17,eml
 assert route.count()>=1 and route.first.is_visible()
 route.first.click()
 assert page.locator('#hmk-time-episode-form').count(), 'Return did not open Travel'
 assert not errors,errors
 print('PASS v93.790 Chromium: carried owner filtering, item change; Complication exact-minute jump visible focus red; p149 tooltip; Cold layout; Agility return',flush=True)
 browser.close()
