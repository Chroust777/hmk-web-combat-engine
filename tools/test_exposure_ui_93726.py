from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
import json,shutil,traceback
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
OUT=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True)
raw=(ROOT/'hmk-app.bundle.js').read_text(); prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);assert 'app.js' in mods
mods['app.js']+='''
window.__testExposure93726=(mode='future')=>{
 const Cal=require('./src/integration/hmk-campaign-calendar.js');
 const M=require('./src/integration/hmk-weather-hazard-aftermath.js');
 const State=require('./src/integration/persistent-combat-state.js');
 data=clean();storageReadOnly=false;
 const c={id:'ACTOR',name:'Pepa',kind:'PC',hmk:{attributes:{end:12,wil:12},skills:[],healthState:null}};
 const step=M.prepareTrekkingWeatherTest({state:State.initialCombatState(),sourceId:'wet-one',round:1,kind:'cold',originalSL:'F',coldCondition:'damp',weatherHazardConfirmed:true,gmConfirmed:true});
 c.hmk.healthState=step.state;
 data.characters=[c];
 let cl=Cal.createCampaignCalendar({day:1,hour:8,minute:0,label:'Audit expozice',eventId:'start93726',gmConfirmed:true,campaignId:'audit93726',characterIds:['ACTOR']});
 cl=Cal.anchorCampaignOrigin(cl,{kind:'weather',characterId:'ACTOR',episodeId:step.state.environmentalHazards[0].id,eventId:'weather-anchor93726',gmConfirmed:true});
 if(mode==='due'){
   cl.minute+=240;cl.events.push({id:'advance93726',type:'advance',minute:cl.minute,reason:'Skutečný posun kalendáře v auditu'});
 }
 data.campaignClock=cl;
 data.journal=[{id:'onset93726',characterId:'ACTOR',calendarCampaignId:'audit93726',campaignMinute:480,createdAt:'2026-01-01',title:'Cold exposure',body:'F',skillTestProof:{type:'skill-weather-onset',actorId:'ACTOR',sourceId:'wet-one',report:step.report}}];
 selected='ACTOR';view='sheet';activeSheetSection='hazards';hazardComposer={actorId:'ACTOR',kind:null};
 const agenda=Cal.campaignCalendarAgenda(cl,data.characters,data.journal),html=hskTrekkingWeatherCourseForms(c.id)+hskTrekkingWeatherTreatmentForms(c.id);
 document.getElementById('app').innerHTML='<main class="content-sheet">'+html+'</main>';
 decorateSkillContinuationHelp(document.getElementById('app'));
 return {minute:cl.minute,active:step.state.environmentalHazards[0],due:agenda.all.filter(x=>x.kind==='weather-course'),dom:document.getElementById('app').innerHTML.length};
};
window.__testGM93726=()=>{
 const State=require('./src/integration/persistent-combat-state.js');
 const Cal=require('./src/integration/hmk-campaign-calendar.js');
 data=clean();storageReadOnly=false;storageBaseline=null;localStorage.removeItem(STORAGE);
 data.characters=[{id:'ACTOR',name:'Pepa',kind:'PC',hmk:{attributes:{end:12,wil:12},skills:[],healthState:State.initialCombatState()}}];
 data.campaignClock=Cal.createCampaignCalendar({day:1,hour:8,minute:0,label:'Test Cold Shock',eventId:'seed93726',gmConfirmed:true,campaignId:'gm93726',characterIds:['ACTOR']});
 selected='ACTOR';view='sheet';activeSheetSection='hazards';hazardComposer={actorId:'ACTOR',kind:'cold-water'};
 document.getElementById('app').innerHTML='<main class="content-sheet">'+hskGMImmersionShockForm93726('ACTOR')+'</main>';
 decorateSkillContinuationHelp(document.getElementById('app'));
 return {minute:data.campaignClock.minute,view,form:document.querySelectorAll('form[data-gm-immersion="yes"]').length};
};
window.__state93726=()=>({events:data.characters?.[0]?.hmk?.healthState?.events?.map(e=>({id:e.id,type:e.type})),shock:data.characters?.[0]?.hmk?.healthState?.shock,hr:data.characters?.[0]?.hmk?.healthState?.environmentalHazards?.map(x=>x.hr),journal:data.journal.map(j=>({id:j.id,kind:j.skillTestProof?.type,source:j.skillTestProof?.sourceId})),clock:data.campaignClock?.minute});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
checks=[]
def ck(cond,msg):
 if not cond:raise AssertionError(msg)
 checks.append(msg)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote'])
 page=browser.new_page(viewport={'width':1150,'height':900});page.set_default_timeout(12000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda msg:print('CONSOLE',msg.type,msg.text[:500]) if msg.type=='error' else None);page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map();let store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(ROOT/css).read_text())
 page.add_script_tag(content=bundle)
 print('BOOT errors',errors)
 seed=page.evaluate('window.__testExposure93726("future")');print('FUTURE',seed['minute'],seed['due'])
 ck(seed['due'][0]['minute']==720,'Due at 12:00 after start 08:00')
 ck(page.locator('form[data-skill-weather-course]').count()==0,'Future course input hidden')
 ck(page.get_by_text('Skutečně uběhlý čas').count()==1,'Calendar elapsed display available')
 print('READOUT', repr(page.locator('.hsk-exposure-readout').text_content()));ck('240' in page.locator('.hsk-exposure-readout').text_content(),'Rule interval displayed')
 ck('0 minut' in page.locator('.hsk-exposure-readout').text_content(),'Elapsed zero automatically')
 ck(page.locator('form[data-skill-weather-treatment] [name=removedFromHazard]').count()==1,'Actual removal choice')
 ck(page.locator('form[data-skill-weather-treatment] [name=gmSameMinuteFirst]').count()==0,'Duplicate same-minute checkbox removed')
 ck(len(page.locator('[data-hmk-help]').all())>=4,'Explanations present')
 due=page.evaluate('window.__testExposure93726("due")');print('DUE',due['minute'],due['due'])
 ck(page.locator('form[data-skill-weather-course]').count()==1,'Only due course form')
 ck(page.locator('form[data-skill-weather-course] [name=elapsedMinutes]').count()==0,'No elapsed input')
 ck(page.locator('form[data-skill-weather-course] input[type=checkbox]').count()==0,'No repeat treatment checkboxes')
 ck('240 min' in page.locator('.hsk-exposure-readout').text_content(),'Physical elapsed calculated')
 page.screenshot(path=str(OUT/'exposure_due_93726.png'),full_page=True)
 page.locator('form[data-skill-weather-course] [name=roll]').fill('45')
 page.locator('form[data-skill-weather-course] button[type=submit]').click()
 status=page.locator('form[data-skill-weather-course] output')
 if status.count():print('COURSE STATUS',status.inner_text())
 s=page.evaluate('window.__state93726()');print('COURSE SAVED?',s)
 ck(any(x['kind']=='skill-weather-course' for x in s['journal']),'Course wrote immutable receipt')
 ck(len(s['events'])>=2,'Medical event committed')
 gm=page.evaluate('window.__testGM93726()');print('GM',gm)
 ck(gm['form']==1,'Manual immersion only after GM selects it')
 ck(page.locator('form[data-gm-immersion=yes] [name=sourceId]').input_value().startswith('gm-cold-immersion:'),'Stable unique source')
 f=page.locator('form[data-gm-immersion=yes]')
 f.locator('[name=condition]').select_option('coolWater')
 for i,v in enumerate([2,3,4],1):f.locator(f'[name=d6_{i}]').fill(str(v))
 f.locator('[name=enduranceD100]').fill('22')
 f.locator('button[type=submit]').click()
 if f.count():print('GM STATUS',f.locator('output').text_content())
 print('GM HTML END',page.locator('#app').text_content()[-1200:])
 state=page.evaluate('window.__state93726()');print('GM SAVED?',state)
 ck(any(x['kind']=='skill-cold-water-shock' for x in state['journal']),'Actual GM cold shock recorded')
 ck(len([x for x in state['events'] if x['type']=='skill-cold-water-shock'])==1,'Single medical shock event')
 ck(not errors,'No Chromium runtime errors: '+str(errors))
 page.screenshot(path=str(OUT/'exposure_form_93726.png'),full_page=True)
 browser.close()
print('PASS',len(checks),'Chromium assertions')
