import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text();pre='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(pre):])
fixture = r"""
window.__auditSeed=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 data=clean();const a={id:'audit-a',name:'Auditní postava',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[{id:'survival',name:'Survival',ml:70},{id:'tracking',name:'Tracking',ml:65},{id:'endurance',name:'Endurance',ml:65}],healthState:H.initialCombatState()}};
 data.characters=[a];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit',eventId:'start',gmConfirmed:true,characterIds:['audit-a']});
 data.items.push({id:'audit-rope',name:'Rope',category:'other',properties:{weightLb:1}});
 data.inventory.push({id:'audit-inv',characterId:'audit-a',sourceItemId:'audit-rope',snapshot:{id:'audit-rope',name:'Rope',category:'other',properties:{weightLb:1}},slot:'carried',quantity:1,condition:'good'});
 storageReadOnly=false;selected='audit-a';view='characters';localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__auditRoute=(v,section)=>{view=v; if(v==='library'){libraryTab=section||'melee';libraryPage=0;}if(v==='sheet')activeSheetSection=section||'overview';if(v==='calendar'){calendarLanding=false;activeCalendarSection=section||'overview';}if(v==='skills')activeSkillTab=section||'value';overlay=null;render();};
"""
mods['app.js']+=fixture+'''
const __vshelter=require('./src/integration/hmk-pc-sheltered-stay-93730.js');
const __vnutrition=require('./src/integration/hmk-nutrition-days.js');
window.__v832CreateNPC=()=>mutate(()=>{const npc=structuredClone(character('audit-a'));npc.id='audit-npc';npc.name='Nově vytvořené NPC';npc.kind='NPC';data.characters.push(npc);data.campaignClock.characterIds.push(npc.id);});
window.__v832Snap=(id='audit-a')=>({journal:data.journal.length,game:JSON.stringify(data),view,section:activeCalendarSection,
  shelter:__vshelter.pcShelteredStayAt(data.journal,data.campaignClock.campaignId,id,data.campaignClock.minute),
  supply:__vnutrition.gmProvisionedAt(data.journal,data.campaignClock.campaignId,id,data.campaignClock.minute),
  effective:__vnutrition.effectivelyProvisionedAt(data.journal,data.campaignClock.campaignId,id,data.campaignClock.minute),
  switches:data.journal.filter(j=>j.characterId===id&&j.calendarNutritionProvisionSwitch).map(j=>j.calendarNutritionProvisionSwitch.provisioned),
  receipts:data.journal.filter(j=>j.characterId===id&&j.calendarPCShelteredStay).map(j=>j.calendarPCShelteredStay.enabled),notice});
'''
creation=mods['src/integration/hmk-character-creation.js']
for orig,inject in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(["audit-a","audit-npc"].includes(character?.id))return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(["audit-a","audit-npc"].includes(character?.id))return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(["audit-a","audit-npc"].includes(character?.id))return true;')]:
 assert orig in creation;creation=creation.replace(orig,inject)
mods['src/integration/hmk-character-creation.js']=creation
bundle=pre+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(pre)+end:]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 pg=b.new_page(viewport={'width':1440,'height':1000});errs=[];dialogs=[]
 pg.on('pageerror',lambda e:errs.append(str(e)))
 def accept(d):
  dialogs.append(d.message);d.accept()
 pg.on('dialog',accept)
 pg.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 pg.evaluate('''()=>{const m=new Map(),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:x});Object.defineProperty(window,'sessionStorage',{configurable:true,value:x});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:pg.add_style_tag(content=(root/css).read_text())
 pg.add_script_tag(content=bundle)
 pg.evaluate('window.__auditSeed()')
 init=pg.evaluate('window.__v832Snap()')
 print('INIT',{'shelter':init['shelter'],'supply':init['supply']})
 created=pg.evaluate('window.__v832CreateNPC()')
 print('NPC_CREATION_COMMIT',created)
 npc=pg.evaluate("window.__v832Snap('audit-npc')")
 assert created and npc['shelter'] is True and npc['effective'] is True,('NPC not sheltered after creation',npc)
 pg.evaluate("window.__auditRoute('calendar','overview')")
 npcBox=pg.locator('[data-calendar-pc-shelter="audit-npc"]')
 assert npcBox.is_checked(), 'NPC checkbox not checked'
 assert pg.locator('[data-calendar-seed-npc-shelter]').count()==0, 'unexpected redundant NPC default button'
 # Choose original PC, explicitly start nutrition, then GM assures resources using existing Yes+confirm.
 pg.evaluate("window.__auditRoute('calendar','provisions')")
 pg.locator('[data-provision-actor]').select_option('audit-a')
 btn=pg.locator('[data-provision-init-nutrition="audit-a"]')
 if btn.count():btn.click()
 pg.locator('[data-provision-assure="yes"]').click()
 after_yes=pg.evaluate('window.__v832Snap()')
 assert after_yes['supply'] is True and after_yes['effective'] is True,after_yes
 assert dialogs, 'Existing yes/no button lost confirmation dialog'
 pg.evaluate("window.__auditRoute('calendar','overview')")
 before=pg.evaluate('window.__v832Snap()')
 pcBox=pg.locator('[data-calendar-pc-shelter="audit-a"]')
 pcBox.check()
 draft=pg.evaluate('window.__v832Snap()')
 assert draft['game']==before['game'],'Checkbox wrongly committed state'
 pg.locator('[data-calendar-pc-shelter-confirm="audit-a"]').click()
 sheltered=pg.evaluate('window.__v832Snap()')
 assert sheltered['shelter'] is True and sheltered['effective'] is True,sheltered
 pg.evaluate("window.__auditRoute('calendar','provisions')")
 yes=pg.locator('[data-provision-assure="yes"]')
 assert yes.get_attribute('aria-pressed')=='true' and yes.is_disabled(), 'shelter should force YES'
 pg.evaluate("window.__auditRoute('calendar','overview')")
 pcBox=pg.locator('[data-calendar-pc-shelter="audit-a"]')
 pcBox.uncheck()
 draft2=pg.evaluate('window.__v832Snap()')
 assert draft2['game']==sheltered['game'],'Uncheck must not write before button'
 pg.locator('[data-calendar-pc-shelter-confirm="audit-a"]').click()
 exited=pg.evaluate('window.__v832Snap()')
 print('AFTER_EXIT',{'shelter':exited['shelter'],'gmSupply':exited['supply'],'effective':exited['effective'],'switches':exited['switches'],'receipts':exited['receipts'],'journalDelta':exited['journal']-draft2['journal']})
 assert exited['shelter'] is False and exited['supply'] is False and exited['effective'] is False
 assert exited['switches']==[False] if len(exited['switches'])==1 else exited['switches'][-2:]==[True,False],exited['switches']
 pg.evaluate("window.__auditRoute('calendar','provisions')")
 assert pg.locator('[data-provision-assure="no"]').get_attribute('aria-pressed')=='true'
 # Re-click no: no extra write, even though native confirm remains for actual changes.
 j=pg.evaluate('window.__v832Snap().journal');pg.locator('[data-provision-assure="no"]').click();assert pg.evaluate('window.__v832Snap().journal')==j
 # A different NPC born on action remains covered and UI correct after tab switch.
 pg.locator('[data-provision-actor]').select_option('audit-npc')
 assert pg.locator('[data-provision-assure="yes"]').get_attribute('aria-pressed')=='true'
 # Tracking explanation lives in UI and no Awareness/Perception bypass is offered as a Tracking receipt.
 pg.evaluate("window.__auditRoute('calendar','travel')")
 txt=pg.locator('[data-episode-tracking]').first.inner_text()
 assert 'Awareness' in txt and 'Perception' in txt and 'není' in txt or 'nenahr' in txt or 'nesmí' in txt,txt[:200]
 assert not errs,errs
 print('PASS NPC default; PC shelter button; YES/NO dialog; atomic exit supply reset; Tracking explanatory UX; no page errors. DIALOGS',len(dialogs))
 b.close()
