import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
mods['app.js']+=r'''
window.__auditSeed833=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();
 const A=(id,name,kind,tracking)=>({id,name,kind,hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'survival',name:'Survival',ml:70},{id:'endurance',name:'Endurance',ml:65},...(tracking?[{id:'tracking',name:'Tracking',ml:tracking}]:[])],healthState:H.initialCombatState()}});
 data.characters=[A('a','Cestovatel A','PC',0),A('b','Stopař B','PC',65)];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit',eventId:'start',gmConfirmed:true,characterIds:['a','b']});
 data.items.push({id:'audit-rope',name:'Rope',category:'other',properties:{weightLb:1}});
 data.inventory.push({id:'audit-inv',characterId:'a',sourceItemId:'audit-rope',snapshot:{id:'audit-rope',name:'Rope',category:'other',properties:{weightLb:1}},slot:'carried',quantity:1,condition:'good'});
 storageReadOnly=false;selected='a';view='calendar';calendarLanding=false;activeCalendarSection='overview';
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditNPC833=()=>mutate(()=>{const copy=structuredClone(character('a'));copy.id='n';copy.name='Nové NPC';copy.kind='NPC';data.characters.push(copy);data.campaignClock.characterIds.push(copy.id);});
window.__auditRoute833=(section,actorId='a')=>{selected=actorId;view='calendar';calendarLanding=false;activeCalendarSection=section;if(section==='provisions')provisionGuideActorId=actorId;render()};
window.__auditSnap833=(actorId='a')=>{const S=require('./src/integration/hmk-pc-sheltered-stay-93730.js'),N=require('./src/integration/hmk-nutrition-days.js');const id=data.campaignClock.campaignId;
 return {journal:data.journal.length,game:JSON.stringify(data),shelter:S.pcShelteredStayAt(data.journal,id,actorId,data.campaignClock.minute),supply:N.gmProvisionedAt(data.journal,id,actorId,data.campaignClock.minute),effective:N.effectivelyProvisionedAt(data.journal,id,actorId,data.campaignClock.minute),receipts:data.journal.filter(x=>x.characterId===actorId&&x.calendarPCShelteredStay).map(x=>x.calendarPCShelteredStay.enabled),switches:data.journal.filter(x=>x.characterId===actorId&&x.calendarNutritionProvisionSwitch).map(x=>x.calendarNutritionProvisionSwitch.provisioned)};
};
window.__auditPlanner833=()=>{
 const C=require('./src/integration/hmk-shared-time-window-93767.js');
 sharedTimeWindowDraft=C.startSharedTimeWindow93767({campaignId:'audit',windowId:'audit-window',startMinute:data.campaignClock.minute,minutes:60});
 sharedTimeWindowPlans=[{id:'p1',groupId:'p1',groupNumber:1,kind:'rest',memberIds:['a'],actorId:'a',weatherId:'',minutes:60,episodeRowV:3,done:false},{id:'p2',groupId:'p2',groupNumber:2,kind:'rest',memberIds:['b'],actorId:'b',weatherId:'',minutes:60,episodeRowV:3,done:false}];
 view='calendar';calendarLanding=false;activeCalendarSection='travel';render();
 return {data:sharedTimeWindowDraft,plans:sharedTimeWindowPlans};
};
window.__auditOption833=(id)=>episodeTrackingOption93833(id,'tracking','Tracking',false);
window.__auditReload833=()=>{data=validate(JSON.parse(localStorage.getItem(STORAGE)));storageBaseline=JSON.stringify(data);render();};
window.__auditStale833=()=>{const p=sharedTimeWindowPlans.find(x=>x.id==='p1');p.kind='tracking';const out=sharedPlanState93771().errors.filter(x=>x.id==='p1');p.kind='rest';return out;};
'''
creation=mods['src/integration/hmk-character-creation.js']
for orig,inj in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(["a","b","n"].includes(character?.id))return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(["a","b","n"].includes(character?.id))return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(["a","b","n"].includes(character?.id))return true;')]:
 assert orig in creation;creation=creation.replace(orig,inj)
mods['src/integration/hmk-character-creation.js']=creation
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 pg=b.new_page(viewport={'width':1440,'height':1000});errs=[];dialogs=[]
 pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 pg.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const m=new Map(),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:x});Object.defineProperty(window,'sessionStorage',{configurable:true,value:x});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  pg.add_style_tag(content=(root/css).read_text())
 pg.add_script_tag(content=bundle)
 pg.evaluate('window.__auditSeed833()')
 assert pg.evaluate('window.__auditNPC833()')
 snap=pg.evaluate("window.__auditSnap833('n')")
 assert snap['shelter'] and snap['effective'],('NPC default absent',snap)
 print('PASS NPC creation default without extra button')
 pg.evaluate("window.__auditRoute833('overview')")
 checks=pg.locator('[data-calendar-pc-shelter]')
 assert checks.count()==3,checks.count()
 assert pg.locator('[data-calendar-pc-shelter-confirm-all]').count()==1
 assert pg.locator('[data-calendar-pc-shelter-confirm],[data-calendar-seed-npc-shelter]').count()==0
 assert pg.locator('[data-calendar-pc-shelter="n"]').is_checked()
 before=pg.evaluate('window.__auditSnap833()')
 pg.locator('[data-calendar-pc-shelter="a"]').check()
 pg.locator('[data-calendar-pc-shelter="n"]').uncheck()
 after_draft=pg.evaluate('window.__auditSnap833()')
 assert before['game']==after_draft['game'], 'checkbox change wrote document'
 pg.locator('[data-calendar-pc-shelter-confirm-all]').click()
 afterA=pg.evaluate('window.__auditSnap833()');afterN=pg.evaluate("window.__auditSnap833('n')")
 assert afterA['shelter'] and not afterN['shelter'] and afterA['journal']-before['journal']==2, (afterA,afterN,before['journal'])
 print('PASS batch A ON, NPC OFF in one click; exactly 2 receipts')
 pg.locator('[data-calendar-pc-shelter-confirm-all]').click()
 assert pg.evaluate('window.__auditSnap833().journal')==afterA['journal'], 'no-op batch created receipts'
 pg.locator('[data-calendar-pc-shelter="a"]').uncheck()
 pg.locator('[data-calendar-pc-shelter="n"]').check()
 assert pg.evaluate('window.__auditSnap833().journal')==afterA['journal'], 'second draft wrote early'
 pg.locator('[data-calendar-pc-shelter-confirm-all]').click()
 assert not pg.evaluate('window.__auditSnap833().shelter') and pg.evaluate("window.__auditSnap833('n').shelter")
 print('PASS batch reversal + no-op prevention')
 pg.evaluate("window.__auditRoute833('provisions','a')")
 init=pg.locator('[data-provision-init-nutrition="a"]')
 if init.count():init.click()
 supply_before=pg.evaluate('window.__auditSnap833()')
 pg.locator('[data-provision-assure="yes"][data-actor-id="a"]').click()
 supply_after=pg.evaluate('window.__auditSnap833()')
 assert supply_after['supply'] and supply_after['effective'] and not supply_after['shelter'], (supply_before,supply_after)
 assert dialogs, 'YES confirmation dialogue missing'
 print('PASS independent provision YES while shelter is OFF; native GM confirmation')
 pg.locator('[data-provision-assure="no"][data-actor-id="a"]').click()
 assert not pg.evaluate('window.__auditSnap833().effective') and not pg.evaluate('window.__auditSnap833().shelter')
 print('PASS independent provision YES -> NO outside shelter')
 # Reproduce scenario: YES, shelter on, shelter off resets NO, then YES independently re-enabled.
 pg.locator('[data-provision-assure="yes"][data-actor-id="a"]').click()
 pg.evaluate("window.__auditRoute833('overview')");pg.locator('[data-calendar-pc-shelter="a"]').check();pg.locator('[data-calendar-pc-shelter-confirm-all]').click()
 pg.locator('[data-calendar-pc-shelter="a"]').uncheck();pg.locator('[data-calendar-pc-shelter-confirm-all]').click()
 assert not pg.evaluate('window.__auditSnap833().shelter') and not pg.evaluate('window.__auditSnap833().effective')
 pg.evaluate("window.__auditRoute833('provisions','a')");pg.locator('[data-provision-assure="yes"][data-actor-id="a"]').click()
 assert not pg.evaluate('window.__auditSnap833().shelter') and pg.evaluate('window.__auditSnap833().supply')
 print('PASS sheltered OFF resets supply NO; subsequent YES can be explicitly reactivated')
 before_reload=pg.evaluate('window.__auditSnap833()')
 pg.evaluate('window.__auditReload833()')
 after_reload=pg.evaluate('window.__auditSnap833()')
 assert before_reload['game']==after_reload['game'], 'state not preserved through persisted reload'
 assert after_reload['supply'] and not after_reload['shelter']
 print('PASS persisted reload retains independently GM-provisioned person outside shelter')
 # Trigger missing-ML case from actual planner options.
 print('TRACKING_OPTION_ZERO',pg.evaluate("window.__auditOption833('a')"))
 assert 'disabled' in pg.evaluate("window.__auditOption833('a')")
 assert 'disabled' not in pg.evaluate("window.__auditOption833('b')")
 print('PASS Tracking ML0 disabled / learned skill enabled in plan-option renderer')
 pg.evaluate('window.__auditPlanner833()')
 print('PLANNER_NUM',pg.locator('[data-shared-plan-kind]').count())
 assert pg.locator('[data-shared-plan-kind="p1"] option[value="tracking"]').is_disabled(), 'ML0 should disable Tracking in actual planner'
 assert not pg.locator('[data-shared-plan-kind="p2"] option[value="tracking"]').is_disabled(), 'ML65 should permit Tracking in actual planner'
 before_kind=pg.locator('[data-shared-plan-kind="p1"]').input_value()
 try:
  pg.locator('[data-shared-plan-kind="p1"]').select_option('tracking',timeout=600)
 except Exception:pass
 assert pg.locator('[data-shared-plan-kind="p1"]').input_value()==before_kind
 pg.locator('[data-shared-plan-kind="p2"]').select_option('tracking')
 assert pg.locator('[data-shared-plan-kind="p2"]').input_value()=='tracking', 'learned skill selection failed'
 print('PASS actual planner ML0 cannot choose Tracking; ML65 can select')
 bad=pg.evaluate('window.__auditStale833()')
 assert any('Tracking ML 0' in row['message'] for row in bad),bad
 print('PASS stale invalid plan rejected prior to tests')
 assert not errs,errs[:5]
 print('ALL_TARGETED_BROWSER_ASSERTIONS_PASS',{'pageErrors':errs,'dialogs':len(dialogs),'finalJournal':pg.evaluate('window.__auditSnap833().journal')})
 b.close()
