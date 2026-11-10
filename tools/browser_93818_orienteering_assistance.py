"""Chromium click test for HMK p145 two travel-only Orienteering assistants and one saved SV proof."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'tools/browser_93780_survival.py').read_text()
ns={'__file__':str(ROOT/'tools/browser_93780_survival.py')};exec(source.split('with sync_playwright() as p:')[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
mods['app.js']+='''
window.__seedOrient93818=()=>{
 window.__auditHazardSeed('orientation-assist');
 const H=require('./src/integration/persistent-combat-state.js'),attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 data.characters.find(c=>c.id==='a').hmk.skills[0].ml=65;
 data.characters.find(c=>c.id==='b').hmk.skills[0].ml=65;
 data.characters.push({id:'c',name:'Pomocník C',kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-c',name:'Survival',ml:55}],healthState:H.initialCombatState()}});
 const o={id:'d',name:'Mimo skupinu D',kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-d',name:'Survival',ml:80}],healthState:H.initialCombatState()}};
 data.characters.push(o);
 const e={id:'e',name:'Nezpůsobilý E',kind:'PC',hmk:{attributes:attrs,skills:[{id:'survival-e',name:'Survival',ml:20}],healthState:H.initialCombatState()}};
 data.characters.push(e);
 data.campaignClock.characterIds.push('c','d','e');
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__orientContextDebug93818=()=>({context:hskOrienteeringAssistanceContext93818(),request:episodePendingSkillRequest,active:episodeActiveSkillRequestId,epoch:episodeDraftEpoch,selected,view,tab:activeSkillTab,choice:skillSVChoice595,plan:sharedPlanCurrent93771(),valid:episodeSkillAuthorized(selected,'Survival')});
window.__orientProof93818=()=>({minute:data.campaignClock.minute,events:data.campaignClock.events.length,
 skill:data.journal.filter(j=>j.skillTestProof&&j.skillTestProof.orienteeringAssistance).map(j=>({id:j.id,body:j.body,proof:j.skillTestProof})),
 episodes:data.journal.filter(j=>j.calendarTimeEpisode).map(j=>({members:j.calendarTimeEpisode.memberIds,orienteering:j.calendarTimeEpisode.orienteering,from:j.calendarTimeEpisode.startMinute,to:j.calendarTimeEpisode.endMinute})),
 windows:data.journal.filter(j=>j.calendarTimeWindow).length});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1550,'height':1000});page.set_default_timeout(14000)
 errors=[];dialogs=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(ROOT/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedOrient93818()')
 page.locator('[data-shared-window-minutes]').fill('45');page.locator('[data-shared-window-create]').click()
 page.locator('[data-shared-plan-add]').click();r=page.locator('[data-shared-plan-card]').last
 r.locator('[data-shared-row-actor]').select_option('a');r.locator('[data-shared-plan-kind]').select_option('travel')
 r.locator('.hc-episode-group-members summary').click();r.locator('[data-shared-plan-member][value="b"]').check();r.locator('[data-shared-plan-member][value="c"]').check()
 page.locator('[data-shared-row-run]').click();f=page.locator('#hmk-time-episode-form')
 f.locator('[name=confirmed]').evaluate('(n)=>{if(!n.checked)n.click()}')
 print('START',f.locator('[name=memberIds]:checked').evaluate_all('(e)=>e.map(x=>x.value)'),flush=True)
 f.locator('[data-episode-evaluate]').click()
 print('ISSUE',f.get_attribute('data-episode-problem-field'),f.get_attribute('data-episode-problem'),flush=True)
 task=page.locator('[data-episode-skill-task]').first;assert task.count(),f.locator('[data-episode-checklist]').inner_text()
 task.click();sf=page.locator('#skill-value-form:visible');assert sf.is_visible()
 fld=sf.locator('[data-orienteering-sv-helpers]')
 print('FIELD',fld.is_visible(),sf.locator('[name=primary]').input_value(),'DEBUG',page.evaluate('window.__orientContextDebug93818()'),flush=True)
 assert fld.is_visible(),'Orienteering Assistance fieldset was not shown'
 available=sf.locator('[name=orientAssist1] option').evaluate_all('(l)=>l.map(o=>[o.value,o.disabled])')
 print('ELIGIBILITY',available,flush=True)
 assert ['b',False] in available and ['c',False] in available and ['d',True] in available and ['e',True] in available,available
 sf.locator('[name=orientAssist1]').select_option('b');sf.locator('[name=orientAssist2]').select_option('c')
 sf.locator('[name=rollA]').fill('71')
 # Without confirmation, no journal entry may be persisted.
 sf.locator('[type=submit]').click()
 print('WITHOUT_CONFIRM',page.locator('body').inner_text()[-500:],flush=True)
 assert not page.evaluate('window.__orientProof93818().skill'),'Unconfirmed assistance was persisted'
 sf.locator('[name=orientAssistConfirmed]').check()
 sf.locator('[type=submit]').click()
 prior=page.evaluate('window.__orientProof93818()')
 print('SV_RESULT',[(j['proof']['a']['eml'],j['proof']['a']['level'],j['proof']['a']['sv'],j['proof']['orienteeringAssistance']) for j in prior['skill']],flush=True)
 assert len(prior['skill'])==1,('saved skill missing',prior,dialogs[-3:])
 proof=prior['skill'][0]['proof'];orientation=proof['orienteeringAssistance']
 assert orientation['helperIds']==['b','c'] and orientation['emlBonus']==10 and orientation['gmConfirmed'],orientation
 assert proof['a']['index']==6 and proof['a']['eml']==75 and proof['a']['level']=='S' and proof['a']['sv']==6,proof['a']
 page.locator('[data-episode-return]').first.click();f=page.locator('#hmk-time-episode-form')
 print('RETURN',f.get_attribute('data-episode-problem-field'),flush=True)
 for i in range(65):
  if page.locator('[data-episode-window-stage]').is_enabled():break
  f.locator('[data-episode-evaluate]').click()
  if page.locator('[data-episode-window-stage]').is_enabled():break
  field=f.get_attribute('data-episode-problem-field') or '';msg=f.get_attribute('data-episode-problem') or ''
  print('STEP',i,field,msg[:150],flush=True)
  if field=='survivalD10':f.locator('[name=survivalD10]').fill('9');continue
  if field=='directionD10':f.locator('[name=directionD10]').fill('1');continue
  if field in ('encounterD100','encounterD100Sub'):f.locator('[name='+field+']').fill('100');continue
  if field.startswith('end_'):f.locator('[name='+field+']').fill('5');continue
  if field=='progressD10':
   m=re.search(r'vyžaduje (\d+) skutečných d10',msg);f.locator('[name=progressD10]').fill(','.join(['10']*int(m.group(1)) if m else ['10']));continue
  if field=='confirmed':f.locator('[name=confirmed]').check();continue
  if field=='orientationProofId':raise AssertionError('Orienteering proof was not accepted')
  raise AssertionError(('UNHANDLED',field,msg))
 else:raise AssertionError('did not reach stage button')
 page.locator('[data-episode-window-stage]').click();page.locator('[data-episode-window-commit]').click()
 final=page.evaluate('window.__orientProof93818()')
 print('FINAL',{'minute':final['minute'],'events':final['events'],'episodes':final['episodes'],'windows':final['windows'],'proofs':len(final['skill'])},flush=True)
 assert final['minute']==525 and len(final['episodes'])==1 and len(final['skill'])==1 and final['windows']==1,final
 assert not errors,errors
 page.screenshot(path='/mnt/data/hmk_93818_logs/orienteering_assistance_full_pass.png',full_page=True)
 print('PASS real Chromium: two helpers +10 EML, index 6 original, SV6, one evidence and 45-minute episode',flush=True)
 b.close()
