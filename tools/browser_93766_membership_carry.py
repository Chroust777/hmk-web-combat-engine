from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);mod=modules['app.js']
mod+='''
window.__seed93765=()=>{
 const C=require('./src/integration/hmk-campaign-calendar.js'),h=require('./src/integration/persistent-combat-state.js');
 const attrs={str:12,end:12,dex:12,agl:12,per:12,rea:12,wil:12};
 const people=['GM','Wounded NPC','Dead NPC'].map((name,i)=>({id:'char-'+i,name,kind:i?'NPC':'PC',hmk:{attributes:attrs,skills:[],healthState:h.initialCombatState(),injuries:[]}}));
 people[1].hmk.healthState.shock='UNC';people[1].hmk.healthState.fatigue.weariness=35;
 const w={id:'wound-93765',location:'th',severity:'G',level:4,aspect:'b',bleeding:false,nextAdvanceRound:null,
  healing:{treated:true,healingRate:4,nextHealingDay:5,infectionPossible:false}};
 people[1].hmk.healthState.wounds.push(w);people[1].hmk.injuries=[{id:w.id,location:w.location,severity:w.severity,bleeding:false,combatRecord:true}];
 people[2].hmk.healthState.shock='KIA';
 let clock=C.createCampaignCalendar({day:1,hour:8,minute:10,label:'Test GM',eventId:'start-93765',gmConfirmed:true,campaignId:'audit-93765',characterIds:people.map(p=>p.id)});
 clock=C.anchorCampaignOrigin(clock,{kind:'wound',characterId:'char-1',woundId:'wound-93765',eventId:'anchor-w-93765',gmConfirmed:true});
 data=clean();data.characters=people;data.inventory=[];data.campaignClock=clock;
 const ep=require('./src/integration/hmk-time-episodes.js');
 const old=ep.calculateTimeEpisode({minute:400,minutes:13,kind:'travel',memberIds:['char-1'],topography:'flat',terrain:'paved-road',conveyance:'foot',
  progress:0,bearing:0,progressD10:[],directionD10:[],enduranceByActor:{'char-1':12},endRollByActor:{'char-1':10},previousCarry:{'char-1':0}});
 old.minuteCarryRule='fixed-point-240-v93.684';old.travelPartyScope='v93.763';
 data.journal=[{id:'old-ep-766',createdAt:'2026-11-06T10:00:00Z',body:'GM historical trek of NPC',title:'Earlier trek',characterId:'char-1',calendarCampaignId:'audit-93765',campaignMinute:400,calendarTimeEpisode:old}];
 view='calendar';calendarLanding=false;calendarCreating=false;activeCalendarSection='administration';calendarUI={mode:'day',monthShift:0,dayNumber:1,hour:8,prefillMinute:null};storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 localStorage.setItem(STORAGE,JSON.stringify(data));storageBaseline=JSON.stringify(data);render();
};
window.__state93765=()=>({minute:data.campaignClock.minute,members:data.campaignClock.characterIds,
 actors:data.characters.map(c=>({id:c.id,name:c.name,shock:c.hmk.healthState.shock,wounds:c.hmk.healthState.wounds.length,weariness:c.hmk.healthState.fatigue.weariness})),
 due:(require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal,data.inventory).due||[]).map(e=>({actor:e.characterId,kind:e.kind})),
 release:data.journal.filter(j=>j.calendarMemberRelease).map(j=>({id:j.characterId,shock:j.calendarMemberRelease.resultShock})),
 errors:notice});
window.__oldCarry93766=()=>require('./src/integration/hmk-time-episodes.js').lastTimeEpisodeCarry(data.journal,'audit-93765','char-1');
window.__travelFields93765=()=>{activeCalendarSection='travel';render();return {locationInputs:document.querySelectorAll('[name=travelFromLocation],[name=travelToLocation],[name=travelLocationsConfirmed]').length};};
'''
modules['app.js']=mod;bundle=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(7000);errors=[];dialogs=[];refuse=[False]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def dialog(d):
  dialogs.append(d.message)
  if refuse[0]:d.dismiss();refuse[0]=False
  else:d.accept()
 page.on('dialog',dialog)
 page.set_content('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  if (root/css).exists():page.add_style_tag(content=(root/css).read_text(encoding='utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed93765()')
 before=page.evaluate('window.__state93765()')
 initialCarry=page.evaluate('window.__oldCarry93766()')
 assert initialCarry==65,('old fractional carry must exist before release',initialCarry)
 page.locator('#campaign-members-form input[value="char-1"]').uncheck()
 page.locator('#campaign-members-form input[value="char-2"]').uncheck()
 page.locator('#campaign-members-form button[type=submit]').click()
 released=page.evaluate('window.__state93765()')
 print('DBG_RELEASE',released,'carry',page.evaluate('window.__oldCarry93766()'),'dialog',dialogs,'errors',errors,flush=True)
 assert page.evaluate('window.__oldCarry93766()')==0,'GM release failed to end fractional fatigue'
 page.screenshot(path=str(root/'docs/AUDIT_v93.766_membership.png'),full_page=True)
 assert released['members']==['char-0'],released
 assert released['actors'][1]['shock']=='NONE' and released['actors'][1]['weariness']==0,released
 assert released['actors'][2]['shock']=='KIA',released
 assert released['actors'][1]['wounds']==0,released
 assert len(released['release'])==2 and released['minute']==before['minute'],released
 assert any('Wounded NPC' in d and 'Dead NPC' in d and 'KIA' in d for d in dialogs),dialogs
 page.locator('#campaign-members-form input[value="char-1"]').check()
 page.locator('#campaign-members-form button[type=submit]').click()
 added=page.evaluate('window.__state93765()')
 assert page.evaluate('window.__oldCarry93766()')==0,'Rejoined actor inherited cleared fractional fatigue'
 assert 'char-1' in added['members'] and added['actors'][1]['shock']=='NONE' and added['actors'][1]['wounds']==0,added
 assert not any(e['actor']=='char-1' for e in added['due']),added
 page.locator('#campaign-members-form input[value="char-1"]').uncheck()
 refuse[0]=True
 page.locator('#campaign-members-form button[type=submit]').click()
 cancelled=page.evaluate('window.__state93765()')
 assert 'char-1' in cancelled['members'] and len(cancelled['release'])==2,cancelled
 page.evaluate('window.__travelFields93765()')
 location=page.evaluate('window.__travelFields93765()')
 assert location['locationInputs']==0,location
 evidence={'preReleaseFatigueCarry':initialCarry,'postReleaseFatigueCarry':page.evaluate('window.__oldCarry93766()'),'before':before,'released':released,'readded':added,'cancelled':cancelled,'dialog':dialogs,'location':location,'errors':errors}
 (root/'docs/AUDIT_v93.766_browser.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
 print(json.dumps(evidence,ensure_ascii=False)[:2000])
 assert not errors,errors
 b.close()
