"""Real Chromium Pochod UI tests for independent Advantage Modes, after Saved Survival SV."""
from pathlib import Path
import json,re,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'tools/browser_93780_survival.py').read_text();ns={'__file__':str(ROOT/'tools/browser_93780_survival.py')}
exec(source.split('with sync_playwright() as p:')[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
mods['app.js']+='''window.__modeOutcome93818=()=>({minute:data.campaignClock.minute,events:data.campaignClock.events.length,
 rows:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({id:j.id,mode:j.calendarTimeEpisode.orientation,kind:j.calendarTimeEpisode.kind,distance:j.calendarTimeEpisode.distanceMeters,forage:j.calendarTimeEpisode.forageResult})),
 sources:data.journal.filter(j=>j.skillTestProof).map(j=>({type:j.skillTestProof.type,result:j.skillTestProof.a,link:j.calendarEpisodeSkillLink})),windows:data.journal.filter(j=>j.calendarTimeWindow).length});'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
case=sys.argv[1] if len(sys.argv)>1 else 'pace'
assert case in ('pace','forage','stealth','vigilance','bearing')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1600,'height':1000});page.set_default_timeout(13000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(ROOT/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('(label)=>window.__auditHazardSeed(label)','adv-'+case)
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last
 r.locator('[data-shared-row-actor]').select_option('a');r.locator('[data-shared-plan-kind]').select_option('travel')
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form');f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 if case!='bearing':
  f.locator('[data-episode-section="skills"] summary').click()
  f.locator('[name=orientationPriority]').select_option(case)
  if case=='stealth':
   f.locator('[name=trackingUse]').select_option('new')
   f.locator('[name=trackingTrail]').fill('Stopa divoké zvěře')
   print('TRACKING OPT-IN USER SELECTED',f.locator('[name=trackingUse]').input_value(),flush=True)
 else:
  f.locator('[data-episode-section="skills"] summary').click()
  f.locator('[name=orientationAllocation]').select_option('manual')
  f.locator('[name=mode_bearing]').fill('1');f.locator('[name=mode_progress]').fill('3')
 for i in range(65):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  f.locator('[data-episode-evaluate]').click()
  if page.locator('[data-episode-window-stage]').is_enabled():break
  field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
  print('STEP',case,i,field,msg[:200],flush=True)
  if field=='trackingProofId':
   assert f.locator('[name=trackingUse]').input_value()=='new'
   assert f.locator('[name=trackingTrail]').input_value()=='Stopa divoké zvěře'
   print('PASS TRACKING OPT-IN BLOCKS UNTIL REAL TRACKING SKILL PROOF',flush=True)
   b.close();raise SystemExit(0)
  if field=='orientationProofId':
   page.locator('[data-episode-skill-task]').first.click()
   sf=page.locator('#skill-value-form:visible');assert sf.is_visible()
   sf.locator('[name=rollA]').fill('10');sf.locator('[type=submit]').click()
   page.locator('[data-episode-return]').first.click()
   f=page.locator('#hmk-time-episode-form')
   if case=='bearing':
    if f.locator('[data-episode-section="skills"]').get_attribute('open') is None:f.locator('[data-episode-section="skills"] summary').click()
    f.locator('[name=orientationAllocation]').select_option('manual')
    f.locator('[name=mode_bearing]').fill('1');f.locator('[name=mode_progress]').fill('3')
   print('ALLOC',f.locator('[data-episode-allocated-modes]').inner_text()[:400],flush=True)
   continue
  if field.startswith('end_'):f.locator('[name='+field+']').fill('5');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných',msg);n=int(m.group(1)) if m else 1
   f.locator('[name=progressD10]').fill(','.join(['10']*n));continue
  if field in ('directionD10','survivalD10','precipitationD6','encounterD100','encounterD100Sub'):
   f.locator('[name='+field+']').fill('100' if 'encounter' in field else '6' if field=='precipitationD6' else '1');continue
  if field.startswith('travelForageD10_'):
   f.locator('[name='+field+']').fill('2');continue
  if field=='travelHabitat':
   print('FORAGE UI',page.evaluate('''()=>{const n=document.querySelector('[name=travelHabitat]');return {fieldHidden:n.closest('[data-episode-trek-foraging]')?.hidden,parent:n.closest('[data-episode-trek-foraging]')?.parentElement?.outerHTML.slice(0,350),details:[...document.querySelectorAll('details')].filter(x=>x.contains(n)).map(x=>({open:x.open,class:x.className,summary:x.querySelector('summary')?.textContent.slice(0,80)}))}}'''),flush=True)
   f.locator('[name=travelHabitat]').select_option('mixed-forest');continue
  if field=='trackingTrail':
   f.locator('[name=trackingUse]').select_option('none');continue
  if field=='confirmed':f.locator('[name=confirmed]').check();continue
  raise RuntimeError(('UNHANDLED',case,field,msg))
 else:raise RuntimeError('Not ready')
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 state=page.evaluate('window.__modeOutcome93818()')
 print('FINAL',case,{'minute':state['minute'],'mode':state['rows'][0]['mode'] if state['rows'] else None,'windows':state['windows']},flush=True)
 assert state['minute']==525 and len(state['rows'])==1 and state['windows']==1,state
 assert not errors,errors
 page.screenshot(path='/mnt/data/hmk_93818_logs/advantage_'+case+'_full_pass.png',full_page=True)
 print('PASS full click Pochod mode',case,flush=True)
 b.close()
