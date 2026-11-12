"""Chromium UI audit for documented party + unregistered Stable draught animal.
Uses the FULL bundle and a deterministic setup fixture; no invented Skill dice.
The case tests the safety gate, not full Injury Sequence or time commitment.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'tools'/'evidence_93846';out.mkdir(exist_ok=True)
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__auditAccidentPoolFixture=(registered)=>{
 const H=require('./src/integration/persistent-combat-state.js');
 const C=require('./src/integration/hmk-campaign-calendar.js');
 data=clean();const attrs={str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12};
 const member=id=>({id,name:id,kind:'PC',hmk:{attributes:attrs,skills:[{name:'Survival',ml:75}],healthState:H.initialCombatState()}});
 data.characters=[member('guide'),member('tracker')];
 if(registered){data.characters.push({id:'ox-a',name:'Táhnoucí vůl',kind:'Animal',hmk:{verifiedMountedBreed:'bovine',attributes:attrs,healthState:H.initialCombatState()}})}
 data.campaignClock=C.createCampaignCalendar({day:1,hour:9,minute:0,campaignId:'audit-accident-pool',label:'Evidence',eventId:'initial',gmConfirmed:true,characterIds:data.characters.map(x=>x.id)});
 const cid=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 const skill={id:'survival-source',characterId:'guide',calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,calendarEpisodeSkillLink:{field:'orientationProofId'},skillTestProof:{type:'secondary-mastery-value-test',actorId:'guide',skills:['Survival'],a:{level:'CF'}}};
 const ep={id:'travel-accident',characterId:'guide',calendarCampaignId:cid,campaignMinute:data.campaignClock.minute,calendarTimeEpisode:{kind:'travel',startMinute:data.campaignClock.minute-60,endMinute:data.campaignClock.minute,memberIds:['guide','tracker'],settings:{stableAnimalIds:['ox-a'],animalIds:[],conveyance:'wagon'},orientation:{skillId:skill.id},hazardDetails:[{hazard:'accident',externalMedicalPending:true,hazardD10:5}]}};
 data.journal=[skill,ep];
 const dom=document.getElementById('audit-pool')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'audit-pool'}));
 dom.innerHTML=hskSkillPhysicalImpactForm(skill);
 return {html:dom.innerHTML,animalRegistered:registered,skillRows:data.journal.filter(x=>x.skillTestProof).length,minute:data.campaignClock.minute};
};
window.__auditPoolState=()=>({minute:data.campaignClock.minute,journal:data.journal.length,characters:data.characters.length});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1300,'height':850})
 errors=[]; page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div><div id="audit-pool"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)||null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 pre=page.evaluate('(x)=>window.__auditAccidentPoolFixture(x)',False)
 assert page.locator('[data-hsk-accident-pool-blocked]').count()==1, 'Missing veterinary safety notice'
 notice=page.locator('[data-hsk-accident-pool-blocked]').inner_text()
 assert 'ox-a' in notice and 'zdravotní' in notice,notice
 assert page.locator('#audit-pool [data-hsk-random-victim]').is_disabled(),'unsafe victim draw allowed'
 assert page.locator('#audit-pool [name=targetId]').is_disabled(),'unsafe manual victim assignment allowed'
 assert page.evaluate('window.__auditPoolState()')=={'minute':540,'journal':2,'characters':2},'unsafe mutation before proof'
 page.screenshot(path=str(out/'ACCIDENT_OX_WITHOUT_HEALTH_PROFILE_BLOCKED.png'),full_page=True)
 post=page.evaluate('(x)=>window.__auditAccidentPoolFixture(x)',True)
 assert page.locator('[data-hsk-accident-pool-blocked]').count()==0,'Registered animal still blocked: '+str(page.locator('[data-hsk-accident-pool-blocked]').all_inner_texts())
 assert page.locator('[data-hsk-random-victim]').is_enabled()
 opts=page.locator('#audit-pool [name=targetId] option').evaluate_all('(xs)=>xs.map(x=>x.value)')
 assert opts==['','guide','tracker','ox-a'],opts
 page.locator('#audit-pool [name=targetId]').select_option('ox-a')
 assert page.locator('#audit-pool [name=targetId]').input_value()=='ox-a'
 assert page.evaluate('window.__auditPoolState()')=={'minute':540,'journal':2,'characters':3},'unconfirmed selection wrote data'
 page.screenshot(path=str(out/'ACCIDENT_OX_REGISTERED_ELIGIBLE.png'),full_page=True)
 assert not errors,errors
 (out/'ACCIDENT_POOL_BROWSER.json').write_text(json.dumps({'status':'PASS','checks':10,'notes':'DOM buttons and selection tested in Chromium; no Injury Sequence or time commit performed','unregisteredNotice':notice,'registeredOptions':opts,'before':{k:v for k,v in pre.items() if k!='html'},'after':{k:v for k,v in post.items() if k!='html'},'pageErrors':errors},ensure_ascii=False,indent=2),'utf8')
 print('PASS Chromium Accident animal victim eligibility, 10 checks, no premature write')
 browser.close()
