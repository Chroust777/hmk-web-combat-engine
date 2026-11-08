from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedNutrition782=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),H=require('./src/integration/persistent-combat-state.js');
 const N=require('./src/integration/hmk-nutrition-days.js'),M=require('./src/integration/hmk-malnutrition-medical.js');
 data=clean();let actor={id:'a',kind:'PC',name:'Pacient podvýživy',hmk:{attributes:{end:12,wil:12,str:12,dex:12,agl:12,per:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[],healthState:H.initialCombatState()}};
 data.characters=[actor];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'audit-nutr782',eventId:'init-nutr782',gmConfirmed:true,characterIds:['a']});
 let i=1,uid=()=>`nutr782-${i++}`;data.journal.push({id:uid(),title:'Zajištění výživy',body:'Doklad režimu stravování',characterId:'a',calendarCampaignId:'audit-nutr782',campaignMinute:data.campaignClock.minute,calendarNutritionPolicy:N.createNutritionPolicy({campaignId:'audit-nutr782',minute:data.campaignClock.minute,actorId:'a',autoNeeds:true,inventoryRations:true,inventoryWater:true})});
 const step=minute=>{data.campaignClock=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:minute-data.campaignClock.minute,eventId:uid(),reason:'Potvrzený průchod celým dnem',gmConfirmed:true,characters:data.characters,journal:data.journal});N.finishDueNutritionDays(data,{idFactory:uid,stamp:uid});M.applyDueMalnutritionOnsets(data,{idFactory:uid,stamp:uid});};
 step(1920);step(3360);for(const j of data.journal)j.createdAt??='test-created';
 view='calendar';calendarLanding=false;activeCalendarSection='overview';storageReadOnly=false;cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__nutrition782Tab=(tab)=>{activeCalendarSection=tab;if(tab==='provisions')provisionScope='party';render();};
window.__invalidNutritionJournal782=()=>data.journal.filter(j=>typeof j.body!=='string'||!data.characters.some(c=>c.id===j.characterId)).map(j=>({id:j.id,type:Object.keys(j).filter(k=>k.startsWith('calendar')),body:j.body}));
window.__nutrition782=()=>({minute:data.campaignClock.minute,episodes:JSON.stringify(data.characters[0].hmk.healthState.malnutritionEpisodes),
 due:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).due.map(x=>({kind:x.kind,id:x.id})),
 deferred:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).deferred.length,
 clockEvents:data.campaignClock.events.filter(e=>e.type==='gm-defer').length,menu:view,combat:!!combatInitiativeSequence,
 savedMinute:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute});
window.__advanceNutrition782=()=>{const C=require('./src/integration/hmk-campaign-calendar.js');return mutate(()=>{data.campaignClock=C.advanceCampaignCalendar(data.campaignClock,{deltaMinutes:1,eventId:'after-gm-nutr782',reason:'Doložená jedna minuta',gmConfirmed:true,characters:data.characters,journal:data.journal,inventory:data.inventory});},{gmClockAdvance:true});};
'''
cr=mods['src/integration/hmk-character-creation.js']
for orig,add in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert orig in cr
 cr=cr.replace(orig,add)
mods['src/integration/hmk-character-creation.js']=cr
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1430,'height':900});page.set_default_timeout(12000);errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append((d.type,d.message)),d.accept('Povinný hod žízně nelze v tomto klientovi provést.') if d.type=='prompt' else d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 page.add_script_tag(content=bundle);page.evaluate('window.__seedNutrition782()');before=page.evaluate('window.__nutrition782()');print('BEFORE',before,flush=True)
 assert before['minute']==3360 and len(before['due'])==1 and before['due'][0]['kind']=='malnutrition-course'
 print('MALFORMED JOURNAL',page.evaluate('window.__invalidNutritionJournal782()'),flush=True)
 # A manual d100 field must have a generated-die button; generating is not resolving.
 page.evaluate("window.__nutrition782Tab('provisions')")
 assert page.locator('form[data-malnutrition-course] [name=roll]').count()>0
 assert page.locator('form[data-malnutrition-course] [data-malnutrition-die]').count()>0
 page.locator('form[data-malnutrition-course] [data-malnutrition-die]').first.click()
 generated=int(page.locator('form[data-malnutrition-course] [name=roll]').first.input_value())
 assert 1<=generated<=100
 assert page.evaluate('window.__nutrition782()')['episodes']==before['episodes']
 page.evaluate("window.__nutrition782Tab('overview')")
 assert page.locator('[data-cal-emergency-defer]').count()==1
 page.locator('[data-cal-emergency-defer]').click();after=page.evaluate('window.__nutrition782()');print('DEFER',after,'DIALOGS',dialogs[-10:],'ERRORS',errors,flush=True)
 assert len(after['due'])==0 and after['deferred']==1 and after['episodes']==before['episodes']
 result=page.evaluate('window.__advanceNutrition782()');next_state=page.evaluate('window.__nutrition782()');print('ADVANCE',result,next_state,'dialog',dialogs[-5:],'errors',errors,flush=True)
 assert result is True and next_state['minute']==3361 and next_state['savedMinute']==3361 and not next_state['combat']
 assert next_state['deferred']==1 and not errors
 print('PASS browser v93.782 real thirst/starvation emergency defer + actual mutate calendar forward + persistent storage',flush=True)
 b.close()
