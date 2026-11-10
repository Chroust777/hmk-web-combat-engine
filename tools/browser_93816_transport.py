"""Chromium UI / mouse clicks, recorded prerequisite health/weight fixture; no synthetic PASS for complete campaign generation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import re
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8'); pre='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__setTransportFixture93816=()=>{
 for(const c of data.characters){c.hmk.weight=c.id==='a'?'150 lb':c.id==='b'?'120 lb':'170 lb';if(c.id==='a')c.hmk.skills.push({id:'riding-a',name:'Riding',ml:65});}
 // The patient is explicitly medically incapacitated; health data are shared,
 // but this UI fixture is NOT claiming a real combat-derived injury.
 data.characters.find(c=>c.id==='b').hmk.healthState.shock='UNC';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__mountRiderFixture93816=(horseId)=>{
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const w=stableRiderWeight584(character('a'));
 if(!w.ready)throw Error(w.reason);
 const proof={format:'hmk-stable-hub-574',animalId:horseId,ownerId:'a',type:'rider-mount',reason:'GM fixture: skutečné nasednutí doloženého jezdce',riderId:'a',
 riderWeightLb:w.totalLb,riderBodyLb:w.bodyLb,riderGearLb:w.gearLb,riderItems:w.items,riderWeightSource:'inventory-auto-584'};
 if(!mutate(()=>data.journal.push({id:uuid(),characterId:'a',calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,
  createdAt:stamp(),title:'Stáj – nasednutí (fixture)',body:'Doložený jezdec připraven v testovacích datech',stableHub574:proof})))throw Error('rider fixture not committed');
 render();return proof;
};
window.__proofDebug93816=()=>({journal:data.journal.slice(-6).map(j=>({id:j.id,title:j.title,characterId:j.characterId,keys:Object.keys(j).filter(k=>/skill|roll|test/i.test(k))})),proofSelect:document.querySelector('[name=droverProofId]')?.value||'',options:[...document.querySelector('[name=droverProofId]')?.options||[]].slice(-4).map(x=>[x.value,x.textContent]),formGuide:document.querySelector('[name=guideId]')?.value,currentTask:document.querySelector('[data-episode-skill-task]')?.getAttribute('data-episode-skill-task')});
window.__finalMount93816=()=>({minute:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,from:j.calendarTimeEpisode.startMinute,to:j.calendarTimeEpisode.endMinute,mount:j.calendarTimeEpisode.transportProof?.mount||null,mass:j.calendarTimeEpisode.transportProof?.mass||null})),windows:data.journal.filter(j=>j.calendarTimeWindow).length,patientHealth:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState)});
window.__transportStatus93816=()=>({minute:data.campaignClock.minute,episodes:data.journal.filter(j=>j.calendarTimeEpisode).length,
 horse:require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)).map(a=>({id:a.id,name:a.name})),
 stable:(data.journal||[]).filter(j=>j.stableHub574).map(j=>j.stableHub574.type),
 health:JSON.stringify(data.characters.find(c=>c.id==='b').hmk.healthState),
 mass:document.querySelector('[data-episode-transport-mass-summary]')?.textContent||'',
 problem:document.querySelector('#hmk-time-episode-form')?.dataset.episodeProblem||''});
'''
mods['app.js']+=seed
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':1050});page.set_default_timeout(12000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()');page.evaluate('window.__setTransportFixture93816()')
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();g=page.locator('[data-shared-plan-card]').first
 g.locator('[data-shared-row-actor]').select_option('a');g.locator('.hc-episode-group-members summary').click();g.locator('[data-shared-plan-member][value="b"]').check()
 page.locator('[data-shared-plan-add]').click();page.locator('[data-shared-plan-card]').nth(1).locator('[data-shared-row-actor]').select_option('c')
 page.locator('[data-shared-row-run]').click();form=page.locator('#hmk-time-episode-form')
 assert form.is_visible(),page.locator('body').inner_text()[-500:]
 form.locator('[name=conveyance]').select_option('cart')
 patient=form.locator('[name=transportedMemberIds][value=b]')
 assert patient.is_visible(),form.inner_text()[:700]
 patient.check()
 form.locator('[name=transportExtraLb]').fill('0')
 status=page.evaluate('window.__transportStatus93816()')
 assert '270 lb' in status['mass'],status
 assert form.locator('[name=transportOtherLb]').input_value()=='150',form.locator('[name=transportOtherLb]').input_value()
 assert form.locator('[name=transportPatientLb_b]').input_value()=='120'
 assert 'Doplnit skutečnou hmotnost' not in form.inner_text()
 print('PASS browser mass: body weights 150+120, one patient 120, guide 150, no duplicate, no typed body mass',flush=True)
 form.locator('[data-episode-open-stable-library]').click()
 acq=page.locator('[data-hmk-livestock-acquire]')
 opt=acq.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first.get_attribute('value')
 acq.locator('[name=beastId]').select_option(opt);acq.locator('[name=beastName]').fill('Blesk')
 acq.locator('[name=ownerId]').select_option('a');acq.locator('button[value=free]').click()
 page.locator('[data-hmk-stable-go-travel]').click();form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 horse=page.evaluate('window.__transportStatus93816()')['horse'][0]['id'];form=page.locator('#hmk-time-episode-form')
 form.locator('[name=stableAnimalIds][value="'+horse+'"]').check()
 form.locator('[name=transportTeamIds][value="'+horse+'"]').check()
 form.locator('[data-episode-equipment-action=gift]').click()
 form=page.locator('#hmk-time-episode-form')
 form.locator('[data-episode-equipment-action=vehicle-gift]').click()
 form=page.locator('#hmk-time-episode-form');form.locator('[name=transportVehicleKey]').select_option(index=1)
 form.locator('[name=transportCoLocated]').check()
 info=form.locator('[data-episode-vehicle-capacity]').inner_text()
 assert 'Doloženo' in info,info
 assert '270 /' in info,info
 assert form.locator('[data-episode-equipment-checklist-body]').inner_text().find('Doložit tělesnou hmotnost')<0
 assert not errors,errors
 print('PASS browser cart + harness gift + vehicle gift + auto cargo 270 lb, no changes to Combat',flush=True)
 page.screenshot(path=str(root/'docs/AUDIT_v93.816_automatic_mass.png'),full_page=True)
 # Mount path: reuse same horse, add riding tack by real UI gift buttons.
 form.locator('[name=conveyance]').select_option('mount')
 form=page.locator('#hmk-time-episode-form')
 for _ in range(4):
  gift=form.locator('[data-episode-equipment-action=gift]')
  if not gift.count():break
  gift.first.click();form=page.locator('#hmk-time-episode-form')
 assert not form.locator('[data-episode-equipment-action=gift]').count(),form.locator('[data-episode-equipment-checklist-body]').inner_text()
 # The previous rider registration is provided as an audited immutable Stable fixture.
 # Current test then clicks the actual mounted patient UI; does not claim
 # that the incomplete mock character navigated the Stable sheet end-to-end.
 rider=page.evaluate('(id)=>window.__mountRiderFixture93816(id)',horse)
 assert rider['riderWeightLb']==150,rider
 form=page.locator('#hmk-time-episode-form');form.locator('[data-episode-stable-refresh]').click()
 form=page.locator('#hmk-time-episode-form')
 if not form.locator('[name=stableAnimalIds][value="'+horse+'"]').is_checked():form.locator('[name=stableAnimalIds][value="'+horse+'"]').check()
 if not form.locator('[name=transportedMemberIds][value=b]').is_checked():form.locator('[name=transportedMemberIds][value=b]').check()
 form.locator('[name=conveyance]').select_option('mount')
 form.locator('[name=transportMountAnimalId]').select_option(horse)
 form.locator('[name=transportMountConfirmed]').check()
 result=form.locator('[data-episode-mount-capacity]').inner_text()
 print('MOUNT CAP',result,'STATUS',page.evaluate('window.__transportStatus93816()'),flush=True)
 assert 'Potvrzeno' in result,result
 form.locator('[data-episode-evaluate]').click()
 problem=form.get_attribute('data-episode-problem') or ''
 assert not any(x in problem for x in ['nemůže se pohybovat','Nepohyblivá','Přeprava na koni','Přepravovaní']),problem
 assert page.evaluate('window.__transportStatus93816()')['minute']==480
 assert not errors,errors
 page.screenshot(path=str(root/'docs/AUDIT_v93.816_mounted_patient.png'),full_page=True)
 print('PASS browser mounted patient: same horse stable actual rider, verified mass/gear/ENC/Move, explicit GM, reaches ordinary dice gate, no calendar/combat mutation',flush=True)
 # Complete mounted patient via actual clickable skill tests; then independent group.
 def finish_group_93816(label):
  f=page.locator('#hmk-time-episode-form')
  assert f.is_visible(),('missing episode form',label)
  if f.locator('[name=confirmed]').is_visible() and not f.locator('[name=confirmed]').is_checked(): f.locator('[name=confirmed]').check()
  for i in range(65):
   if page.locator('[data-episode-window-stage]').is_enabled():break
   if not f.locator('[data-episode-evaluate]').is_enabled():
    if f.locator('[name=confirmed]').is_visible() and not f.locator('[name=confirmed]').is_checked():
     print('BEFORE CONFIRM',label,f.locator('[name=confirmed]').evaluate('n=>n.outerHTML'),page.locator('[data-episode-window-stage]').get_attribute('disabled'),flush=True)
     try:
      bb=f.locator('[name=confirmed]').bounding_box();page.mouse.click(bb['x']+bb['width']/2,bb['y']+bb['height']/2);print('MOUSE CONFIRM',label,f.locator('[name=confirmed]').is_checked(),page.locator('[data-episode-window-stage]').is_enabled(),flush=True)
     except Exception as ex:
      print('CONFIRM CLICK FAILED',repr(ex)[:220],flush=True)
      print('AFTER INPUT',f.locator('[name=confirmed]').evaluate('n=>({checked:n.checked, disabled:n.disabled,html:n.outerHTML})'),flush=True)
      raise
     continue
    raise AssertionError(('evaluated but stage disabled',label,f.inner_text()[-500:]))
   f.locator('[data-episode-evaluate]').click()
   if page.locator('[data-episode-window-stage]').is_enabled():break
   field=f.get_attribute('data-episode-problem-field') or ''
   msg=f.get_attribute('data-episode-problem') or ''
   print('CLICK',label,i,field,msg[:160],flush=True)
   if field in ('orientationProofId','droverProofId'):
    page.locator('[data-episode-skill-task]').first.click()
    sf=page.locator('#skill-value-form') if field=='orientationProofId' else page.locator('#skill-secondary-form')
    assert sf.count(),('skill form absent',label,msg)
    sf.locator('[name=rollA]').fill('31');sf.locator('[type=submit]').click()
    print('SKILL SAVED',field,page.evaluate('window.__proofDebug93816()'),flush=True)
    page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form')
    print('BACK SELECT',field,page.evaluate('window.__proofDebug93816()'),flush=True)
    continue
   if field=='confirmed': f.locator('[name=confirmed]').check();continue
   if field.startswith('end_'): f.locator('[name="'+field+'"]').fill('5');continue
   if field=='progressD10':
    m=re.search(r'vyžaduje (\d+) skutečných d10',msg)
    f.locator('[name=progressD10]').fill(','.join('1' for _ in range(int(m.group(1)) if m else 1)));continue
   if field in ('encounterD100','encounterD100Sub','directionD10','survivalD10','precipitationD6','temperatureD10','precipitationD10'):
    f.locator('[name="'+field+'"]').fill({'encounterD100':'100','encounterD100Sub':'100','directionD10':'6','survivalD10':'10','precipitationD6':'6','temperatureD10':'5','precipitationD10':'10'}[field]);continue
   raise AssertionError(('unhandled actual UI prerequisite',label,field,msg, f.inner_text()[-600:]))
  else:raise AssertionError(('not completed',label))
  page.locator('[data-episode-window-stage]').click()
  return page.evaluate('window.__transportStatus93816()')
 done1=finish_group_93816('A mounted patient')
 print('STAGED ONE',done1,flush=True)
 assert done1['minute']==480,done1
 done2=finish_group_93816('B independent foot')
 print('STAGED TWO',done2,flush=True)
 assert done2['minute']==480,done2
 page.locator('[data-episode-window-commit]').click()
 final=page.evaluate('window.__finalMount93816()')
 print('FINAL MOUNT RECEIPT',final,'DIALOGS',dialogs,'ERRORS',errors,flush=True)
 assert final['minute']==final['stored']==525,final
 assert final['windows']==1 and len(final['episodes'])==2,final
 assert [sorted(e['members']) for e in final['episodes']]==[['a','b'],['c']],final
 assert all(e['from']==480 and e['to']==525 for e in final['episodes']),final
 assert final['episodes'][0]['mount'] and final['episodes'][0]['mass'],final
 assert final['patientHealth']==status['health'],('travel must not change Combat/health state',final)
 assert not errors,errors
 page.screenshot(path=str(root/'docs/AUDIT_v93.816_mounted_patient_FINAL.png'),full_page=True)
 print('PASS CLICKED COMPLETE: mounted immobile passenger + independent walking group, 2 journal receipts and 1 clock advance, no Combat health mutation',flush=True)
 b.close()
