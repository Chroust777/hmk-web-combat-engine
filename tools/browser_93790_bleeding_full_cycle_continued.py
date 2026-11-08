"""Synthetic medically-valid travel bleeder, tested in production Chromium UI, no code changes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,traceback
ROOT=Path(__file__).resolve().parents[1]
base=(ROOT/'tools/browser_93787_accident_agility_matrix.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93787_accident_agility_matrix.py')}
exec(base.split('with sync_playwright() as p:',1)[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
cr=mods['src/integration/hmk-character-creation.js']
for old,new in [
 ('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),
 ('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),
 ('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert old in cr,old
 cr=cr.replace(old,new)
mods['src/integration/hmk-character-creation.js']=cr
mods['app.js']+='''
window.__seedBleeder93790=()=>{
 window.__seedRows93772();
 const a=data.characters.find(x=>x.id==='a'),state=a.hmk.healthState,source='bleed93790',origin='skill-injury:survival-accident:'+source,woundId='wound:'+origin;
 a.hmk.isFolk=true;a.hmk.folk='human';state.lastRound=1;
 state.wounds.push({id:woundId,originDomain:'travel-accident',location:'ab',severity:'G',level:5,aspect:'b',bleeding:true,nextAdvanceRound:61,recordedRound:1,originEventId:origin,shockSL:'CS',side:null,bodyKind:'human',moralePending:false,healing:{treated:true,untreated:false,healingRate:4,grimWound:false,infected:false,nextHealingDay:6}});
 state.events.push({id:origin,type:'travel-accident-injury',round:1,details:{domain:'travel-accident',woundId,sourceId:source,originMinute:data.campaignClock.minute}});
 synchronizeCombatInjuries(a,state);
 const C=require('./src/integration/hmk-campaign-calendar.js');
 data.campaignClock=C.anchorCampaignOrigin(data.campaignClock,{kind:'wound',characterId:'a',woundId,elapsedMinutes:0,source:'confirmed-health',combatEventId:origin,eventId:'anchor-bleed-93790',gmConfirmed:true});
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__bleedAudit93790=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),A=C.campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory),L=require('./src/integration/hmk-calendar-chronology.js');
 const s=data.characters[0].hmk.healthState;return {minute:data.campaignClock.minute,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,cap:L.mandatoryCalendarWindow({minute:data.campaignClock.minute,agenda:A}).maxAllowed,due:A.due.map(x=>({kind:x.kind,minute:x.minute,id:x.id,characterId:x.characterId})),future:A.future.filter(x=>x.minute<=data.campaignClock.minute+20).map(x=>({kind:x.kind,minute:x.minute})),unknown:A.unknown.map(x=>({kind:x.kind,reason:x.reason})),bleeding:s.wounds.map(w=>({id:w.id,bleeding:w.bleeding,travelBlood:w.travelBlood})),blood:s.bloodLoss,events:s.events.map(e=>e.type).slice(-5),journal:data.journal.length,clockEvents:data.campaignClock.events.length};
};
window.__showBleeder93790=()=>{selected='a';view='sheet';activeSheetSection='hazards';render();};
window.__showCalendar93790=()=>{view='calendar';calendarLanding=false;activeCalendarSection='travel';render();};
window.__reloadBleeder93790=()=>{data=JSON.parse(localStorage.getItem(STORAGE));storageBaseline=localStorage.getItem(STORAGE);episodeStageBaseline=null;sharedTimeWindowDraft=null;sharedTimeWindowQueue=[];sharedTimeWindowSelectedGroupId=null;sharedTimeWindowPlans=[];sharedTimeWindowActivePlanId=null;sharedEpisodeAutoRun93772=false;episodePinnedSkillFields.clear();episodeOutstandingSkillTasks=[];episodeEvaluationRequested=false;restoreEpisodeDraftSidecar();render();return window.__bleedAudit93790();};
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message[:100])),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(ROOT/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedBleeder93790()')
 def state():return page.evaluate('window.__bleedAudit93790()')
 st=state();print('INITIAL',st,flush=True);assert st['minute']==480 and st['cap']==5 and not st['unknown'],st
 assert any(x['kind']=='bleeding' and x['minute']==485 for x in st['future']),st
 # Explicit attempted 10-minute travel should be blocked by mandatory 5-minute health deadline.
 page.locator('[data-shared-window-minutes]').fill('10');page.locator('[data-shared-window-create]').click()
 print('OVERSIZED',state(),'TEXT',page.locator('body').inner_text()[-850:],flush=True)
 assert state()['minute']==480,'Too-long travel silently advanced clock'
 # reset via render, avoid mutating campaign.
 page.evaluate('window.__showCalendar93790()')
 if page.locator('[data-shared-window-create]').is_visible():
  page.locator('[data-shared-window-minutes]').fill('5');page.locator('[data-shared-window-create]').click()
 else:
  print('WINDOW EXISTS - PANELS',page.locator('[data-shared-plan-card]').count(),flush=True)
 page.locator('[data-shared-plan-add]').click();row=page.locator('[data-shared-plan-card]').last
 row.locator('[data-shared-row-actor]').select_option('b');row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('travel')
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
 f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 f.locator('[name=terrain]').select_option('paved-road')
 for i in range(40):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  f.locator('[data-episode-evaluate]').click();field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
  print('TRAVEL_STEP',i,field,msg[:105],flush=True)
  if page.locator('[data-episode-window-stage]').is_enabled():break
  if field=='orientationProofId':
   if i>2:
    print('DIAG',page.locator('[data-episode-checklist]').inner_text()[-650:], 'skilllinks',page.locator('[data-episode-skill-task]').count(), 'errors',errors,'dialogs',dialogs,flush=True);raise RuntimeError('Orientation proof not recognized after multiple UI attempts')
   page.locator('[data-episode-skill-task]').first.click();sf=page.locator('#skill-value-form:visible');assert sf.count()==1
   sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click();print('SKILL_RESULT',sf.locator('output').all_text_contents(),page.locator('body').inner_text()[-420:],flush=True);page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form');continue
  if field.startswith('end_'):f.locator('[name='+field+']').fill('3');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg);f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
  if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','directionD10','survivalD10'):
   f.locator('[name='+field+']').fill(str({'temperatureD10':5,'precipitationD10':5,'precipitationD6':6,'encounterD100':100,'encounterD100Sub':100,'directionD10':6,'survivalD10':10}[field]));continue
  if field=='confirmed':f.locator('[name=confirmed]').check();continue
  raise AssertionError(('UNEXPECTED TRAVEL BLOCK',field,msg,page.locator('[data-episode-checklist]').inner_text()[-650:]))
 else:raise AssertionError('TRAVEL LOOP LIMIT')
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 cur=state();print('AFTER_FIVE_MIN_TREK',cur,flush=True)
 assert cur['minute']==485 and cur['cap']==0 and len([x for x in cur['due'] if x['kind']=='bleeding'])==1,cur
 assert cur['bleeding'][0]['bleeding'] is True
 page.evaluate('window.__showBleeder93790()')
 bc=page.locator('form[data-weather-blood-complete]');assert bc.count()==1,('BLEED FORM NOT VISIBLE',page.locator('body').inner_text()[-900:])
 print('BLOOD_FORM',bc.inner_text()[:550],flush=True)
 bc.locator('[name=strengthRoll]').fill('99');bc.locator('[type=submit]').click()
 cur=state();print('AFTER_UNTREATED_LOSS',cur,'dialogs',dialogs[-5:],'errors',errors,'body',page.locator('body').inner_text()[-400:],flush=True)
 assert cur['minute']==485 and cur['bleeding'][0]['bleeding'] and cur['cap']==5,cur
 assert cur['blood']['bp']>=0 and any(x['kind']=='bleeding' and x['minute']==490 for x in cur['future']),cur
 # Try actual Stoppage method (cauterisation) with healer b, then five more measured minutes.
 page.evaluate('window.__showBleeder93790()')
 bs=page.locator('form[data-weather-blood-start]');assert bs.count()==1
 print('START_FORM_HEALERS',bs.locator('[name=healerId] option').evaluate_all('(es)=>es.map(e=>[e.value,e.textContent])'),flush=True)
 bs.locator('[name=healerId]').select_option('b');bs.locator('[name=method]').select_option('cau');bs.locator('[name=hasHeatedTool]').check();bs.locator('[type=submit]').click()
 cur=state();print('AFTER_START_CARE',cur,flush=True);assert cur['bleeding'][0]['travelBlood']['plan'] and cur['minute']==485,cur
 # Time spent treating: five-minute real common window with a planned rest activity of third person.
 page.evaluate('window.__showCalendar93790()');page.locator('[data-shared-window-minutes]').fill('5');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();row=page.locator('[data-shared-plan-card]').last
 row.locator('[data-shared-row-actor]').select_option('c');row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('rest')
 page.locator('[data-shared-row-run]').click()
 assert page.locator('[data-episode-window-stage]').is_enabled() or page.locator('#hmk-time-episode-form').is_visible()
 if not page.locator('[data-episode-window-stage]').is_enabled():
  for i in range(10):
   ef=page.locator('#hmk-time-episode-form');
   if not ef.locator('[name=confirmed]').is_checked():ef.locator('[name=confirmed]').evaluate('(n)=>n.click()')
   ef.locator('[data-episode-evaluate]').click()
   if page.locator('[data-episode-window-stage]').is_enabled():break
   field=ef.get_attribute('data-episode-problem-field') or ''
   print('REST_BLOCK',field,ef.get_attribute('data-episode-problem'),page.locator('[data-episode-checklist]').inner_text()[-330:],flush=True)
   if field=='confirmed':ef.locator('[name=confirmed]').check();continue
   raise AssertionError('unexpected rest issue '+field)
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 cur=state();print('AFTER_CARE_FIVE_MIN',cur,flush=True);assert cur['minute']==490 and cur['cap']==0,cur
 page.evaluate('window.__showBleeder93790()');bc=page.locator('form[data-weather-blood-complete]');assert bc.count()==1
 bc.locator('[name=physicianRoll]').fill('5')
 bc.locator('[type=submit]').click();cur=state();print('AFTER_CARE_COMPLETE',cur,flush=True)
 assert cur['minute']==490 and cur['bleeding'][0]['bleeding'] is False and not any(x['kind']=='bleeding' for x in cur['due']),cur
 # Final due now is the original Shock Reroll. It must have an actionable form, not a permanent calendar lock.
 assert any(x['kind']=='weather-shock' for x in cur['due']),cur
 page.evaluate('window.__showBleeder93790()')
 shock=page.locator('form[data-weather-shock-followup]')
 print('SHOCK FOLLOWUP FORM',shock.count(),shock.is_visible() if shock.count() else False, shock.inner_text()[:350] if shock.count() else page.locator('body').inner_text()[-700:],flush=True)
 assert shock.count()==1 and shock.is_visible(),'Missing required Shock form for post-bleed reroll'
 assert shock.locator('[name=roll]').is_enabled(),'Due Shock d100 cannot be entered'
 shock.locator('[name=roll]').fill('5')
 shock.locator('[type=submit]').click()
 cur=state();print('AFTER_SHOCK_REROLL',cur,'errors',errors,'dialogs',dialogs[-5:],flush=True)
 assert not any(x['kind']=='weather-shock' for x in cur['due']),cur
 assert cur['minute']==490,'Shock had unexpected imaginary calendar cost'
 assert cur['cap']>=5,'Clock did not unlock after completed shock'
 # After health duty resolves, a second real travel action must again move time once.
 page.evaluate('window.__showCalendar93790()')
 page.locator('[data-shared-window-minutes]').fill('10');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();row=page.locator('[data-shared-plan-card]').last
 row.locator('[data-shared-row-actor]').select_option('b');row=page.locator('[data-shared-plan-card]').last;row.locator('[data-shared-plan-kind]').select_option('travel')
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
 f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 f.locator('[name=terrain]').select_option('paved-road')
 for i in range(40):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  f.locator('[data-episode-evaluate]').click();field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
  print('TRAVEL_STEP',i,field,msg[:105],flush=True)
  if page.locator('[data-episode-window-stage]').is_enabled():break
  if field=='orientationProofId':
   if i>2:
    print('DIAG',page.locator('[data-episode-checklist]').inner_text()[-650:], 'skilllinks',page.locator('[data-episode-skill-task]').count(), 'errors',errors,'dialogs',dialogs,flush=True);raise RuntimeError('Orientation proof not recognized after multiple UI attempts')
   page.locator('[data-episode-skill-task]').first.click();sf=page.locator('#skill-value-form:visible');assert sf.count()==1
   sf.locator('[name=rollA]').fill('21');sf.locator('[type=submit]').click();print('SKILL_RESULT',sf.locator('output').all_text_contents(),page.locator('body').inner_text()[-420:],flush=True);page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form');continue
  if field.startswith('end_'):f.locator('[name='+field+']').fill('3');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg);f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
  if field in ('temperatureD10','precipitationD10','precipitationD6','encounterD100','encounterD100Sub','directionD10','survivalD10'):
   f.locator('[name='+field+']').fill(str({'temperatureD10':5,'precipitationD10':5,'precipitationD6':6,'encounterD100':100,'encounterD100Sub':100,'directionD10':6,'survivalD10':10}[field]));continue
  if field=='confirmed':f.locator('[name=confirmed]').check();continue
  raise AssertionError(('UNEXPECTED TRAVEL BLOCK',field,msg,page.locator('[data-episode-checklist]').inner_text()[-650:]))
 else:raise AssertionError('TRAVEL LOOP LIMIT')
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 post_travel=state();print('AFTER_POST_BLEED_TREK',post_travel,flush=True)
 assert post_travel['minute']==500 and post_travel['stored']==500 and not post_travel['due'],post_travel
 assert post_travel['bleeding'][0]['bleeding'] is False and post_travel['blood']==cur['blood'],post_travel
 again=page.evaluate('window.__reloadBleeder93790()');assert again['bleeding']==cur['bleeding'] and again['blood']==cur['blood'] and again['minute']==500,again
 assert not errors,errors
 print('PASS 93790 Bleeder complete cycle including required immediate Shock Reroll; clock unlocked and another real 10min travel committed to minute 500; no fake time',flush=True)
 b.close()
