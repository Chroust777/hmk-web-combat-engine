from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,sys
KIND=sys.argv[1] if len(sys.argv)>1 else 'rest';HAZARD=sys.argv[2] if len(sys.argv)>2 else 'cold'
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
seed=(root/'tools/browser_93807_switch.py').read_text(encoding='utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed=seed.replace("view='calendar';", "data.inventory=[{id:'item-a',characterId:'a',sourceItemId:'rope',snapshot:{id:'rope',name:'Testovací řemen',category:'other',properties:{weightLb:2,pricePence:3}},quantity:1,slot:'carried',condition:''}];view='calendar';")
if HAZARD=='cold':
 seed=seed.replace("season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5","season:'winter',climate:'subpolar',temperatureD10:1,precipitationD10:1").replace("season:'spring',climate:'cool',landscape:'flat'","season:'winter',climate:'subpolar',landscape:'flat'")
else:
 seed=seed.replace("season:'spring',climate:'cool',temperatureD10:5,precipitationD10:5","season:'summer',climate:'wet-tropical',temperatureD10:10,precipitationD10:10").replace("season:'spring',climate:'cool',landscape:'flat'","season:'summer',climate:'wet-tropical',landscape:'flat'")
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
KIND=sys.argv[1] if len(sys.argv)>1 else 'rest';HAZARD=sys.argv[2] if len(sys.argv)>2 else 'cold'
print('CASE',KIND,HAZARD,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1500,'height':1000});page.set_default_timeout(12000)
 errors=[];dialogs=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seed93807()')
 page.locator('[data-shared-window-minutes]').fill('40');page.locator('[data-shared-window-create]').click();page.locator('[data-shared-plan-add]').click()
 row=page.locator('[data-shared-plan-card]').first;row.locator('[data-shared-row-actor]').select_option('a')
 if KIND!='travel':page.locator('[data-shared-plan-card]').first.locator('[data-shared-plan-kind]').select_option(KIND)
 assert page.locator('[data-shared-row-run]').is_enabled(),page.evaluate('window.__get93807()')
 page.locator('[data-shared-row-run]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[name=confirmed]').evaluate('(n)=>n.click()')
 for j in range(40):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  form=page.locator('#hmk-time-episode-form')
  form.locator('[data-episode-evaluate]').click()
  field=form.get_attribute('data-episode-problem-field') or ''
  msg=form.get_attribute('data-episode-problem') or ''
  if page.locator('[data-episode-window-stage]').is_enabled():break
  print('STEP',j,field,msg[:175],flush=True)
  if not field and page.locator('[data-episode-jump^=whRoll_]').count():
   jump=page.locator('[data-episode-jump^=whRoll_]').first; key=jump.get_attribute('data-episode-jump');jump.click()
   form.locator('[name="'+key+'"]').fill('6' if HAZARD=='cold' else '1');continue
  if not field and page.locator('[data-episode-skill-task][data-episode-skill-field^=whProof_]').count():
   task=page.locator('[data-episode-skill-task][data-episode-skill-field^=whProof_]').first
   task.click()
   skill=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   skill.locator('[name=rollA]').fill('95');skill.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click();continue
  if not field and 'Hazard · equipment' in page.locator('[data-episode-checklist]').inner_text():
   jump=page.locator('[data-episode-jump=hazardItemId]')
   if jump.count():jump.first.click();assert form.locator('[name=hazardItemId]').evaluate('(n)=>document.activeElement===n')
   form.locator('[name=hazardItemId]').select_option('item-a')
   form.locator('[name=hazardEquipmentDisposition]').select_option('abandon')
   continue
  if not field and 'Hazard · complication' in page.locator('[data-episode-checklist]').inner_text():
   form.locator('[name=hazardComplicationDecision]').select_option('reroute');continue
  if field.startswith('whRoll_'):
   form.locator('[name="'+field+'"]').fill('6' if HAZARD=='cold' else '1');continue
  if field.startswith('whProof_'):
   task=page.locator('[data-episode-skill-task]').first; assert task.count(),(field,'no skill task')
   task.click()
   skill=page.locator('#skill-value-form:visible') if page.locator('#skill-value-form:visible').count() else page.locator('#skill-secondary-form:visible')
   skill.locator('[name=rollA]').fill('95');skill.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   continue
  if field in ('orientationProofId','trackingProofId','trackingAwarenessProofId','hazardCompProof_a','hazardEvidenceId','hazardDirectionProofId'):
   skillTask=page.locator('[data-episode-skill-task]').first
   if skillTask.count()<=0:raise AssertionError(('skill button missing',field,page.locator('[data-episode-checklist]').inner_text()[-1000:]))
   skillTask.click()
   skill=page.locator('#skill-value-form')
   if skill.count() and skill.is_visible():
    skill.locator('[name=rollA]').fill('95' if (field in ('orientationProofId','trackingProofId') and HAZARD!='0') else '31')
    skill.locator('[type=submit]').click()
   else:
    skill=page.locator('#skill-secondary-form');print('SECONDARY',skill.locator('input').count(),flush=True)
    if skill.locator('[name=rollA]').count():skill.locator('[name=rollA]').fill('95')
    skill.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   continue
  if field.startswith('end_'):
   form.locator('[name="'+field+'"]').fill('5');continue
  if field in ['survivalD10','precipitationD6','forageD10','encounterD100','encounterD100Sub','progressD10','directionD10','hazardAtMinute','hazardDelayNow','hazardVictimD','hazardAccidentD6','hazardAccidentZD10','hazardDirectionD10']:
   defaults={'survivalD10':'7','precipitationD6':'6','forageD10':'5','encounterD100':'100','encounterD100Sub':'100','progressD10':'1','directionD10':'10','hazardAtMinute':'40','hazardDelayNow':'0','hazardVictimD':'1','hazardAccidentD6':'6','hazardAccidentZD10':'5','hazardDirectionD10':'10'}
   el=form.locator('[name="'+field+'"]'); assert el.count(),('missing input',field)
   el.fill(','.join('1' for _ in range(int(re.search(r'(\d+) skutečných d10',msg).group(1))))) if field=='progressD10' and re.search(r'(\d+) skutečných d10',msg) else el.fill(defaults[field]);continue
  if field=='habitat':form.locator('[name=habitat]').select_option('mixed-forest');continue
  if field=='trackingTrail':form.locator('[name=trackingTrail]').fill('stopa zvěře');continue
  if field=='confirmed':form.locator('[name=confirmed]').evaluate('(n)=>n.click()');continue
  if field=='trackingUse':form.locator('[name=trackingUse]').select_option('new');continue
  if field=='encounterResolution':form.locator('[name=encounterResolution]').select_option('no-consequence');continue
  if field=='hazardEquipmentDisposition':form.locator('[name=hazardEquipmentDisposition]').select_option('abandoned');continue
  if field=='hazardComplicationDecision':form.locator('[name=hazardComplicationDecision]').select_option('reroute');continue
  if field=='hazardComplicationRouteChanged':form.locator('[name=hazardComplicationRouteChanged]').check();continue
  if field=='hazardWorkerId':form.locator('[name=hazardWorkerId]').select_option('a');continue
  if field=='hazardSkillLevel':form.locator('[name=hazardSkillLevel]').select_option('CF');continue
  if field=='hazardAgility':form.locator('[name=hazardAgility]').select_option('CF');continue
  raise AssertionError(('unknown field',KIND,HAZARD,field,msg,page.locator('[data-episode-checklist]').inner_text()[-1500:],dialogs,errors))
 assert page.locator('[data-episode-window-stage]').is_enabled(),('NOT_STAGED',KIND,HAZARD,dialogs,errors)
 page.locator('[data-episode-window-stage]').click()
 assert page.locator('[data-episode-window-commit]').is_enabled(),('NOT_COMMIT_READY',KIND,HAZARD)
 page.locator('[data-episode-window-commit]').click()
 status=page.evaluate('window.__get93807()'); print('END',status,'dialogs',dialogs,'errors',errors,flush=True)
 assert status['stored']==520 and status['events']==2,(KIND,HAZARD,status)
 assert not errors,errors
 print('PASS',KIND,HAZARD,'steps',j,flush=True)
 b.close()
