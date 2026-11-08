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
window.__diceAuditSignature=()=>JSON.stringify(data);
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
 page=b.new_page(viewport={'width':1450,'height':900});page.set_default_timeout(12000);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=bundle)
 page.evaluate('window.__diceAuditSeed()')
 jobs=[('sheet','status'),('sheet','hazards'),('sheet','inventory'),('sheet','provisions'),('calendar','overview'),('calendar','travel'),('calendar','provisions'),('calendar','craft'),('calendar','administration'),('encounter',''),('skills','secondary'),('skills','assistance'),('skills','situational')]
 results=[];total=0
 for v,d in jobs:
  page.evaluate('([v,d])=>window.__diceAuditNavigate(v,d)',[v,d]);page.wait_for_timeout(50)
  if v=='skills' and d!='secondary':
   btn=page.locator('button[data-skill-tab="'+d+'"]');btn.click()
  before=page.evaluate('window.__diceAuditSignature()')
  r=page.evaluate('''()=>{
   let count=0,unexpected=[];
   const buttons=[...document.querySelectorAll('#app [data-hmk-general-auto-die]')];
   for(const b of buttons){
    const x=b.previousElementSibling;
    if(!(x instanceof HTMLInputElement)||x.disabled||x.readOnly)continue;
    const faces=Number(b.dataset.hmkDieFaces);if(x.max!==''&&Number(x.max)!==faces){unexpected.push('max mismatch '+x.name);continue;}
    b.click();const roll=Number(x.value);
    if(!Number.isInteger(roll)||roll<1||roll>faces)unexpected.push(x.name+' d'+faces+' = '+x.value);
    if(!x.isConnected)unexpected.push('dynamic replacement '+x.name);
    count++;
   }
   // Only explicitly labeled, enabled number fields with a legal dX are
   // expected to acquire a general or dedicated adjacent generator.
   const absent=[];
   for(const x of document.querySelectorAll('#app form input[type=number]')){
    if(x.disabled||x.readOnly||x.closest('#campaign-expedition-form'))continue;
    const label=x.closest('label');if(!label)continue;
    const text=label.textContent||'',match=/(?:^|[^a-zA-Z0-9])d(4|6|8|10|12|20|30|100)(?![0-9])/i.exec(text);
    if(!match||x.max===''||Number(x.max)!==Number(match[1])||Number(x.min||1)>1)continue;
    const visible=x.getClientRects().length>0;
    if(!visible)continue;
    const sibling=x.nextElementSibling;
    const dedicated=!!(label.querySelector('[data-episode-die]')||
     sibling?.matches('button')&&/⚄|d\d+|generovat|hodit/i.test(sibling.textContent||'')||
     [...(x.form?.querySelectorAll('button')||[])].some(b=>(b.closest('label')===label||b.previousElementSibling===label)&&/⚄|generovat|hodit/i.test(b.textContent||'')));
    if(!dedicated)absent.push({name:x.name,label:text.slice(0,90),max:x.max});
   }
   return {count,absent,unexpected,forms:document.querySelectorAll('#app form').length};
  }''')
  after=page.evaluate('window.__diceAuditSignature()')
  assert before==after, 'unsaved dice click mutated persistent state '+v+' '+d
  assert not r['unexpected'],(v,d,r['unexpected'])
  assert not r['absent'],(v,d,r['absent'])
  results.append([v,d,r]);total+=r['count'];print('PASS',v,d,r,flush=True)
 # Specific rules for dynamic Secondary Roll d10: proven in another browser test.
 assert not errors,errors
 assert total>=15,('too few real dice controls',total)
 print('PASS generator matrix:',len(jobs),'routes',total,'numbered generators; no persistent mutations; no missing active labeled dX; no JS errors',flush=True)
 (root/'docs/AUDIT_DICE_BROWSER_MATRIX_93783.json').write_text(json.dumps({'routes':results,'generatedDiceFields':total},ensure_ascii=False,indent=2),encoding='utf-8')
 b.close()
