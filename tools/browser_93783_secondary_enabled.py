"""Read-only dynamic inventory of dice inputs across major HMK forms (v93.782+)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf-8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__diceAuditSeed=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean(); const c={id:'audit-pc',kind:'PC',name:'Tester',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'survival',name:'Survival',ml:70},{id:'physician',name:'Physician',ml:65},{id:'tracking',name:'Tracking',ml:60},{id:'riding',name:'Riding',ml:60},{id:'climbing',name:'Climbing',ml:70},{id:'endurance',name:'Endurance',ml:65}],healthState:H.initialCombatState()}};
 data.characters=[c];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit93783',eventId:'start-93783',gmConfirmed:true,characterIds:['audit-pc']});
 storageReadOnly=false;calendarLanding=false;selected='audit-pc';view='sheet';activeSheetSection='status';render();
};
window.__diceAuditNavigate=(kind,detail)=>{
 view=kind;
 if(kind==='sheet')activeSheetSection=detail||'status';
 if(kind==='skills')activeSkillTab=detail||'secondary';
 if(kind==='calendar'){calendarLanding=false;activeCalendarSection=detail||'overview';}
 if(kind==='library')libraryTab=detail||'melee';
 render();
};
window.__diceAuditCounts=()=>({v:view,skill:activeSkillTab,section:activeSheetSection,clock:data.campaignClock.minute,combat:!!combatInitiativeSequence});
'''
creation=mods['src/integration/hmk-character-creation.js']
for orig,add in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="audit-pc")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="audit-pc")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="audit-pc")return true;')]:
 if orig not in creation: raise ValueError(orig)
 creation=creation.replace(orig,add)
mods['src/integration/hmk-character-creation.js']=creation
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
JS='''()=>[...document.querySelectorAll('#app form input')].flatMap(x=>{
 if(x.type!=='number'&&x.type!=='text')return[];
 const label=x.closest('label'); const labelText=(label?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,140);
 const name=x.name||'',max=x.getAttribute('max')||'',min=x.getAttribute('min')||'';
 const faces=/(?:^|[^a-z0-9])d(3|4|6|8|10|12|20|30|100)(?![0-9])/i.exec(labelText)?.[1];
 const roll=/(?:roll|die|dice|d100|d10|d20|d6|d4)/i.test(name);
 if(!roll&&!faces)return[];
 const form=x.form,buttons=[...(form?.querySelectorAll('button')||[])];
 const nearby=buttons.filter(b=>b!==x&&((label&&label.contains(b))||(label&&b.parentElement===label.parentElement&&b.previousElementSibling===label)|| b.previousElementSibling===x));
 const any=buttons.filter(b=>(b.dataset&&Object.keys(b.dataset).some(k=>/die|dice|roll|generat/i.test(k)))||/⚄|generovat.*d|hodit.*d/i.test(b.textContent||''));
 return [{name,typ:x.type,max,min,faces,form:form?.id||form?.dataset?Object.keys(form?.dataset||{}).filter(x=>/roll|health|course|wizard|weather|dice|skill|followup|calendar|fear|combat|episode|shock|wound|bleed|gm|trek|hmk|hsk/.test(x)).map(k=>k+':'+form.dataset[k]).join(';').slice(0,75):'', disabled:x.disabled,label:labelText,local:nearby.map(b=>b.textContent.trim().slice(0,55)),formDice:any.length,genSibling:!!x.nextElementSibling?.matches?.('button[data-hmk-general-auto-die],button[data-hmk-calendar-auto-die]')}]
})'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1450,'height':900});page.set_default_timeout(15000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message)),d.accept()))
 page.set_content('<!doctype html><html><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=bundle)
 page.evaluate('window.__diceAuditSeed()')
 page.evaluate('window.__diceAuditNavigate("skills","secondary")')
 page.locator('button[data-skill-tab="value"]').click()
 page.locator('[data-hmk-sv-choice-type=ordinary]').select_option('Climbing')
 page.locator('[data-hmk-sv-open-595=ordinary]').click()
 form=page.locator('#skill-value-form')
 primary=form.locator('select[name="primary"]')
 print('CHOICES',len(primary.locator('option').all_text_contents()),flush=True)
 
 primary.select_option('Climbing')
 page.wait_for_timeout(150)
 sr=form.locator('select[name="srActivityA"]')
 print('sr',sr.locator('option').all_text_contents(),flush=True)
 sr.select_option('climbing-difficult')
 page.wait_for_timeout(250)
 die=form.locator('input[name="roll10A"]')
 print('enabled',die.is_enabled(),'button',form.locator('button[data-hmk-general-auto-die]').count(),'attrs',form.locator('button[data-hmk-general-auto-die]').evaluate_all('(a)=>a.map(b=>[b.dataset.hmkDieFaces,b.parentElement.textContent.slice(0,50)])'),flush=True)
 assert die.is_enabled(), 'secondary d10 never enabled'
 assert die.locator('xpath=following-sibling::button[@data-hmk-general-auto-die]').count()==1,'secondary d10 lacks adjacent button'
 before=page.evaluate('window.__diceAuditCounts()')
 die.locator('xpath=following-sibling::button[@data-hmk-general-auto-die]').click()
 value=int(die.input_value());after=page.evaluate('window.__diceAuditCounts()')
 assert 1<=value<=10 and before==after,(value,before,after)
 die.fill('10');assert die.evaluate('(n)=>!n.dataset.hmkAutoDice'),'typing must invalidate software die provenance'
 sr.select_option('');page.wait_for_timeout(60)
 assert not die.is_enabled() and die.input_value()=='' and not die.evaluate('(n)=>!!n.dataset.hmkAutoDice')
 sr.select_option('climbing-difficult');page.wait_for_timeout(60)
 assert die.is_enabled() and die.input_value()=='' and die.locator('xpath=following-sibling::button[@data-hmk-general-auto-die]').count()==1
 page.locator('button[data-skill-tab="secondary"]').click()
 page.locator('button[data-skill-tab="value"]').click()
 page.locator('[data-hmk-sv-choice-type=ordinary]').select_option('Endurance');page.locator('[data-hmk-sv-open-595=ordinary]').click();page.wait_for_timeout(140)
 form=page.locator('#skill-value-form');primary=form.locator('select[name=primary]');sr=form.locator('select[name=srActivityA]')
 
 assert not form.locator('input[name="roll10A"]').is_enabled()
 
 page.locator('[data-hmk-sv-choice-type=ordinary]').select_option('Climbing');page.locator('[data-hmk-sv-open-595=ordinary]').click();page.wait_for_timeout(180)
 form=page.locator('#skill-value-form');sr=form.locator('select[name=srActivityA]');sr.select_option('climbing-difficult');page.wait_for_timeout(200)
 assert form.locator('input[name="roll10A"]').is_enabled()
 assert form.locator('input[name="roll10A"]').locator('xpath=following-sibling::button[@data-hmk-general-auto-die]').count()==1
 print('PASS secondary d10 enabled on demand, generator adjacent, roll 1..10, manual overrides and repeat selection stable. errors:',errors,'dialogs:',dialogs,flush=True)
 assert not errors,errors
 b.close()
