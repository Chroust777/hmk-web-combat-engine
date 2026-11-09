"""v93.791 actual browser regression: travel Skill Test return BELOW the evaluated test, never above the folio."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
ROOT=Path(__file__).resolve().parents[1]
src=(ROOT/'tools/browser_93780_travel_hazards.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93780_travel_hazards.py')};exec(src.split('with sync_playwright() as p:')[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end'];bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1500,'height':1000});page.set_default_timeout(12500);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 for case in ('F','CF'):
  page.evaluate('(c)=>window.__auditHazardSeed("complication-"+c)',case)
  page.locator('[data-shared-window-minutes]').fill('60');page.locator('[data-shared-window-create]').click()
  page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-row-actor]').select_option('a');r=page.locator('[data-shared-plan-card]').last;r.locator('[data-shared-plan-kind]').select_option('travel')
  page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
  assert f.is_visible();f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
  def skill(roll):
   nonlocal_f=None
   task=page.locator('[data-episode-skill-task]').first;assert task.count()
   print('OPEN_SKILL',case,task.get_attribute('data-episode-skill-task'),flush=True)
   task.click();sf=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   location=page.evaluate('''()=>{const btn=document.querySelector('[data-episode-return]');const out=btn?.closest('[data-skill-section]')?.querySelector('[id^=hsk-result-]');return {count:document.querySelectorAll('[data-episode-return]').length,hasTop:!!document.querySelector('.hc-episode-return-top'),inBook:!!btn?.closest('.journal-book--skills'),inRight:!!btn?.closest('.journal-book-page--right'),withinTest:!!btn?.closest('.hsk-test-card'),insideCorrectTest:!!out&&out.nextElementSibling===btn.closest('.hc-episode-skill-handoff'),aboveBook:!!document.querySelector('body > .hc-episode-skill-handoff'),visible:!!btn?.getClientRects().length,text:btn?.textContent?.trim()}}''')
   print('TRAVEL_RETURN_BEFORE_TEST',case,location,flush=True)
   assert location['count']==1 and not location['hasTop'] and location['inBook'] and location['inRight'] and location['withinTest'] and location['insideCorrectTest'] and not location['aboveBook'] and location['visible'],location
   sf.locator('[name=rollA]').fill(str(roll));sf.locator('[type=submit]').first.click()
   after=page.evaluate('''()=>{const btn=document.querySelector('[data-episode-return]');const result=btn?.closest('.hsk-test-card')?.querySelector('[id^=hsk-result-]');return {buttonCount:document.querySelectorAll('[data-episode-return]').length,buttonY:btn?.getBoundingClientRect().top,resultBottom:result?.getBoundingClientRect().bottom,resultText:result?.innerText?.slice(0,70),position:btn?.closest('.hc-episode-skill-handoff')?getComputedStyle(btn.closest('.hc-episode-skill-handoff')).position:null,afterResult:result?.nextElementSibling===btn?.closest('.hc-episode-skill-handoff'),underRightPage:!!btn?.closest('.journal-book-page--right'),inSkills:!!document.querySelector('#skill-value-form'),viewText:document.body.innerText.slice(-180)}}''')
   print('TRAVEL_RETURN_AFTER_TEST',case,after,flush=True)
   assert after['buttonCount']==1 and after['afterResult'] and after['underRightPage'] and after['buttonY']>=after['resultBottom'] and after['position']=='static' and after['resultText'],after
   page.locator('[data-episode-return]').first.click()
  for i in range(50):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   f=page.locator('#hmk-time-episode-form');f.locator('[data-episode-evaluate]').click()
   if page.locator('[data-episode-window-stage]').is_enabled():break
   field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
   print('STEP',case,i,repr(field),msg[:145],flush=True)
   if field=='orientationProofId':skill(95);continue
   if field=='survivalD10':f.locator('[name=survivalD10]').fill('9');continue
   if field=='hazardComplicationSkill':f.locator('[name=hazardComplicationSkill]').select_option('Agility');continue
   if field=='hazardWorkerId':f.locator('[name=hazardWorkerId]').select_option('a');continue
   if field=='hazardAtMinute':
    button=page.locator('[data-episode-jump="hazardAtMinute"]')
    assert button.count()>0, 'Missing exact minute action'
    button.first.click()
    info=page.evaluate('''()=>{const f=document.querySelector('#hmk-time-episode-form'),x=f.elements.namedItem('hazardAtMinute');return {focus:x===document.activeElement,visible:!!x.getClientRects().length,red:x.closest('label').classList.contains('hc-episode-needs-input')}}''')
    print('ACTUAL_MINUTE_BUTTON',case,info,flush=True)
    assert all(info.values()),info
    f.locator('[name=hazardAtMinute]').fill('25');continue
   if field in ('hazardSkillLevel','hazardEvidenceId') or (not field and page.locator('[data-episode-skill-task]').count()):
    f.locator('[name=hazardComplicationSkill]').select_option('Agility');f.locator('[name=hazardWorkerId]').select_option('a')
    if field=='hazardSkillLevel':f.locator('[name=hazardSkillLevel]').select_option(case)
    else:skill(91 if case=='F' else 95)
    continue
   if field=='hazardComplicationRouteChanged':f.locator('[name=hazardComplicationRouteChanged]').check();continue
   if field.startswith('end_'):f.locator('[name="'+field+'"]').fill('5');continue
   if field=='progressD10':
    m=re.search(r'(\d+) samostatn|vyžaduje (\d+) skutečných',msg);n=int(next(x for x in m.groups() if x)) if m else 1
    f.locator('[name=progressD10]').fill(','.join('10' for _ in range(n)));continue
   if field=='directionD10':f.locator('[name=directionD10]').fill('1');continue
   if field in ('precipitationD6','temperatureD10','precipitationD10','encounterD100','encounterD100Sub'):
    f.locator('[name="'+field+'"]').fill('6' if field=='precipitationD6' else '100' if 'encounter' in field else '5');continue
   if not field:
    if not f.locator('[name=hazardComplicationSkill]').input_value():f.locator('[name=hazardComplicationSkill]').select_option('Agility');continue
    if not f.locator('[name=hazardWorkerId]').input_value():f.locator('[name=hazardWorkerId]').select_option('a');continue
    if page.locator('[data-episode-skill-task]').count():skill(91 if case=='F' else 95);continue
   raise AssertionError(('unhandled',case,field,msg,page.locator('[data-episode-checklist]').inner_text()[-850:]))
  else:raise AssertionError('did not complete '+case)
  page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
  result=page.evaluate('window.__auditHazardState()')
  print('COMPLICATION_COMMIT',case,{'minute':result['minute'],'hazards':result['episodes'][0]['hazards'] if result['episodes'] else [],'dialogs':dialogs[-2:]},flush=True)
  assert result['minute']==540 and result['episodes'][0]['hazards'][0]['hazard']=='complication',result
 assert not errors,errors
 print('PASS v93.791: Survival and Complication Agility return located immediately AFTER the result inside right book folio for F/CF, calendar committed once',flush=True)
 browser.close()
