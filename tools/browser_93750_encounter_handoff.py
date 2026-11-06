"""Detailed positive Encounter in isolated, real local Chromium. All dice synthetic test fixtures."""
from pathlib import Path
import json,re,sys,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');marker='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(marker):]);mod=modules['app.js']
mod+='''
window.__auditSeed749=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),state=require('./src/integration/persistent-combat-state.js');
 const actor={id:'pc-a',name:'Průvodce',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12},skills:[{id:'skill-sur',name:'Survival',ml:70},{id:'skill-end',name:'Endurance',ml:60},{id:'skill-aware',name:'Awareness',ml:65}],healthState:state.initialCombatState()}};
 const clock=C.createCampaignCalendar({day:1,hour:8,minute:0,label:'Encounter 749 E2E',eventId:'seed',gmConfirmed:true,campaignId:'audit749',characterIds:[actor.id]});
 data=clean();data.characters=[actor];data.inventory=[];data.campaignClock=clock;data.journal=[];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='travel';
 calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditSyncSurprise749=(form)=>episodeSyncSurpriseAvailability(form);
window.__auditTamperWitness749=()=>{
 const time=require('./src/integration/hmk-time-episodes.js');
 const altered=JSON.parse(JSON.stringify(data.journal));
 const episode=altered.find(x=>x.calendarTimeEpisode)?.calendarTimeEpisode;
 if(!episode?.encounterDetails?.[0]?.surprise?.partyEvidence)return false;
 episode.encounterDetails[0].surprise.partyEvidence.roll=95;
 try{time.validateTimeEpisodes(altered);return false;}catch{return true;}
};
window.__auditState749=()=>({clock:data.campaignClock.minute,storedClock:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute,
 journalCount:data.journal.length,storedJournalCount:JSON.parse(localStorage.getItem(STORAGE)).journal.length,
 episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>j.calendarTimeEpisode),
 combatRuntime:JSON.stringify(data.combatRuntime||{}),
 sidecar:!!localStorage.getItem(EPISODE_SIDECAR_KEY)});
'''
mod+="\nwindow.__auditOpenSheet750=()=>{document.querySelector('#app').innerHTML=hmkTravelEncounterHintHTML(character('pc-a'));};window.__auditDebug750=()=>({hint:require('./src/integration/hmk-travel-encounter-context-93750.js').travelEncounterCharacterHint({journal:data.journal,campaignId:campaignKey(data.campaignClock),minute:data.campaignClock.minute,actorId:'pc-a'})});\n"
modules['app.js']=mod
bundle=marker+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
scenario=sys.argv[1] if len(sys.argv)>1 else 'opposed'
assert scenario in ('opposed','unopposed'),scenario
trace=[]
with sync_playwright() as p:
 print('DEBUG start chromium',flush=True);b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1500,'height':960});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 print('DEBUG injecting',flush=True);page.add_script_tag(content=bundle);print('DEBUG seeding',flush=True);page.evaluate('window.__auditSeed749()');print('DEBUG seeded',flush=True)
 def state():return page.evaluate('window.__auditState749()')
 def f():return page.locator('#hmk-time-episode-form')
 def field():return (f().get_attribute('data-episode-problem-field') or '')
 def issue():return (f().get_attribute('data-episode-problem') or '')
 def fill(name,value):
  jump=page.locator('[data-episode-jump="'+name+'"]')
  if jump.count():
   jump.first.click(timeout=3500)
   if name.startswith('ev'):
    visible=f().locator('[name="'+name+'"]').first
    assert page.evaluate('e=>!!e.closest("label")?.classList.contains("hc-episode-needs-input")',visible.element_handle()),'navigate must highlight red input '+name
  f().locator('[name="'+name+'"]').fill(str(value),timeout=3500)
 def skill(roll=31):
  task=page.locator('[data-episode-skill-task]').first;role=task.get_attribute('data-episode-skill-task');task.click(timeout=6000)
  assert page.locator('#skill-value-form').count()==1
  sf=page.locator('#skill-value-form');sf.locator('[name="rollA"]').fill(str(roll));before=state()
  sf.locator('[type="submit"]').click();assert state()['storedClock']==before['storedClock']
  page.locator('[data-episode-return]').first.click();trace.append({'skill':role,'d100':roll})
 try:
  print('DEBUG begin form',flush=True);form=f();assert form.count()==1
  form.locator('[name="kind"]').select_option('travel');form.locator('[name="minutes"]').fill('60');form.locator('[name="memberIds"][value="pc-a"]').check()
  form.locator('[name="weatherSource"]').select_option('local');form.locator('[name="area"]').fill('E2E Encounter');form.locator('[name="climate"]').select_option('subtropical')
  before=state();print('DEBUG click evaluate',flush=True);form.locator('[data-episode-evaluate]').click(timeout=3500);print('DEBUG evaluated',flush=True)
  # Synthetic deterministic positive encounter receipt, replacing the automatically sampled
  # cryptographic d100 ONLY inside isolated QA fixture (not the production UI flow).
  page.evaluate('''()=>{const f=document.querySelector('#hmk-time-episode-form');
    for(const [name,val] of [['encounterD100','98'],['encounterD100Sub','70']]){
      const el=f.elements.namedItem(name);el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}));
    }}''')
  print('DEBUG encounter forced',flush=True)
  # The first error is under-defined weather/orientation; encounter row should still populate.
  assert f().locator('[data-episode-encounter-row]').count()==1,('positive not rendered',issue(),field())
  # Try intentionally missing occurrence minute; the checklist must route to precise red field.
  for iteration in range(60):
   print('DEBUG iteration',iteration,flush=True);current=field();problem=issue();final=page.locator('[data-episode-finalize]');print('DEBUG field',current,problem[:80],flush=True)
   if final.is_enabled():break
   trace.append({'iteration':iteration,'field':current,'issue':problem[:210]})
   if current in ['orientationProofId','trackingProofId'] or current.startswith('whProof_'):
    skill();continue
   elif current=='temperatureD10':val=5
   elif current=='precipitationD10':val=10
   elif current=='precipitationD6':val=6
   elif current=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',problem);val=','.join('1' for _ in range(int(m.group(1)) if m else 1))
   elif current=='directionD10':val=6
   elif current.startswith('end_'):val=5
   elif current.startswith('whRoll_cold_'):val=1
   elif current.startswith('whRoll_heat_'):val=1
   elif current=='encounterResolution' or (not current and 'Encounter · rozhodnutí GM' in page.locator('[data-episode-checklist]').inner_text()):
    button=page.locator('[data-episode-jump="encounterResolution"]');assert button.count()==1;button.first.click(timeout=5000)
    sel=f().locator('[name="encounterResolution"]');assert sel.is_visible();sel.select_option('detailed');continue
   elif current=='evOffset_0':val=15
   elif current=='evD4_0':
    # the explicit data-episode die button exists and has the shared style
    btn=f().locator('[data-episode-die="evD4_0"]');assert btn.count()==1 and not btn.is_disabled()
    val=2
   elif current=='evTerrain_0':
    f().locator('[name="evTerrain_0"]').select_option('mixed-forest');continue
   elif current=='evFoeWatchfulness_0':
    # Isolated UI contract: Automatic Surprise (Lax vs Alert) permits no rolls.
    # Exercise the exact production availability helper without committing any fixture.
    page.evaluate('''()=>{const f=document.querySelector('#hmk-time-episode-form');
      const old=f.dataset.episodeOrientationModes;
      f.dataset.episodeOrientationModes=JSON.stringify({lax:1});
      f.elements.namedItem('evFoeWatchfulness_0').value='alert';
      window.__auditSyncSurprise749(f);
      if(!['Party','Foe'].every(s=>['Skill','D100','EML'].every(k=>f.elements.namedItem('ev'+s+k+'_0').disabled)))
       throw Error('Automatic Surprise still offers a manual roll');
      if(!['Party','Foe'].every(s=>f.querySelector('[data-episode-die="ev'+s+'D100_0"]').disabled))
       throw Error('Automatic Surprise still offers blue dice');
      f.dataset.episodeOrientationModes=old;
      f.elements.namedItem('evFoeWatchfulness_0').value='normal';
    }''')
    f().locator('[name="evFoeWatchfulness_0"]').select_option('lax' if scenario=='unopposed' else 'normal');
    if scenario=='unopposed':
     assert f().locator('[name="evFoeD100_0"]').is_disabled() and f().locator('[data-episode-die="evFoeD100_0"]').is_disabled(),'unavailable opposing d100 must be disabled';
    continue
   elif current=='evPartySkill_0':
    f().locator('[name="evPartySkill_0"]').select_option('Awareness');continue
   elif current=='evPartyD100_0':val=31
   elif current=='evPartyEML_0':val=65
   elif current=='evFoeSkill_0':
    f().locator('[name="evFoeSkill_0"]').select_option('Awareness');continue
   elif current=='evFoeD100_0':val=81
   elif current=='evFoeEML_0':val=65
   elif current=='evDecision_0':
    f().locator('[name="evDecision_0"]').select_option('observe');continue
   elif current=='confirmed':f().locator('[name="confirmed"]').check();continue
   elif not current and 'Potvrzení GM' in page.locator('[data-episode-checklist]').inner_text():
    f().locator('[name="confirmed"]').check();continue
   else:raise AssertionError(f'Unhandled field {current!r}: {problem!r}; checklist {page.locator("[data-episode-checklist]").inner_text()[:500]}')
   fill(current,val)
  else:raise AssertionError('iteration exceeded')
  assert final.is_enabled(),(field(),issue())
  all_done=state();assert before['storedClock']==all_done['storedClock'] and before['storedJournalCount']==all_done['storedJournalCount'], 'premature commit'
  assert f().locator('[name="evD4_0"]').input_value()=='2'
  assert f().locator('[data-episode-encounter-readout]').count()==1
  final.click();after=state()
  assert after['clock']==before['clock']+60 and after['storedClock']==after['clock'],after
  assert after['storedJournalCount']==after['journalCount'] and len(after['episodes'])==1
  e=after['episodes'][0]['encounterDetails'][0];assert e['distance']['d4']==2 and e['surprise']['verified'] and e['surprise']['winner']=='party' and e['surprise']['partyEvidence']['roll']==31 and (e['surprise'].get('foeEvidence') is None if scenario=='unopposed' else e['surprise']['foeEvidence']['roll']==81) and e['surprise']['decision']=='observe',e
  assert after['combatRuntime']==before['combatRuntime'],'Encounter created Combat state!'
  assert page.evaluate('window.__auditTamperWitness749()'),'history replay must reject altered witnessed Surprise d100'
  page.screenshot(path=str(root/('docs/AUDIT_v93.750_encounter_confirm_'+scenario+'.png')),full_page=False)
  # Render the original profile section in isolated DOM. This synthetic character
  # is not fully Character-Creation completed, so full Character Sheet navigation is gated.
  page.evaluate('window.__auditOpenSheet750()')
  hint=page.locator('[data-hmk-travel-alertness="pc-a"]')
  assert hint.count()==1,'confirmed Surprise has no temporary Character Sheet readout'
  summary=hint.inner_text()
  assert 'Watchfulness' in summary and 'Aware' in summary and 'Confused' not in summary[:45],summary
  assert state()['combatRuntime']==after['combatRuntime'],'Character readout created Combat state'
  page.screenshot(path=str(root/('docs/AUDIT_v93.750_encounter_handoff_'+scenario+'.png')),full_page=False)
  print('PASS v93.750 Encounter read-only profile section rendered in Chromium, no Combat',summary[:120])
  print('PASS interactive confirmed positive Encounter '+scenario,e['distance']['sightingFeet'],'feet',e['surprise']['procedure'], 'time',before['clock'],'->',after['clock'])
 except Exception as x:
  print('FAIL',type(x).__name__,str(x)[:2000]);traceback.print_exc();print('LAST',trace[-8:],'ERR',errs[:5],flush=True)
  try:page.screenshot(path=str(root/'docs/AUDIT_v93.750_encounter_failure.png'),full_page=False)
  except:pass
  sys.exit(1)
 finally:
  (root/('docs/AUDIT_v93.750_encounter_trace_'+scenario+'.json')).write_text(json.dumps({'trace':trace,'pageerrors':errs},ensure_ascii=False,indent=2),encoding='utf8')
  b.close()
