from pathlib import Path
import json,sys,traceback
from playwright.sync_api import sync_playwright
root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data/hmk_dev_93721');raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,pos=json.JSONDecoder().raw_decode(raw[len(prefix):]);
helper=r'''
window.__testStage={
 inspect:()=>({clock:data.campaignClock,doc:data.journal.length,base:JSON.parse(localStorage.getItem(STORAGE)||'null')?.journal?.length,
  side:!!localStorage.getItem(EPISODE_SIDECAR_KEY),pinned:[...episodePinnedSkillFields],last:data.journal.map(j=>j.id).slice(-6),
  receipts:data.globalActionLedger?.length,lock:timeEpisodeMutationLocked(),notice}),
 setup:()=>{
  data=clean();data.characters.push({id:'actor1',name:'Actor One',kind:'PC',hmk:{folk:'Human',attributes:{wil:12,end:12,str:12,dex:12,rea:12,per:12},healthState:persistent_combat_state_js_1.initialCombatState()}});const newClock=hmk_campaign_calendar_js_1.createCampaignCalendar({day:720,hour:9,minute:20,label:'Test',gmConfirmed:true,eventId:'start',campaignId:'C-1',characterIds:['actor1']});data=hmk_calendar_multi_campaign_js_1.beginAdditionalCalendar(data,newClock);const c=data.campaignClock;
  const serial=JSON.stringify(data);localStorage.setItem(STORAGE,serial);storageBaseline=serial;
  episodeDraftEpoch='test-epoch';episodeStageBaseline=null;episodePendingSkillRequest={id:'req1',episodeEpoch:'test-epoch',field:'orientationProofId',skill:'Survival',actorId:'actor1',campaignId:c.campaignId,minute:c.minute,status:'waiting'};
  episodeEvaluationRequested=true;timeEpisodeDraft={minutes:'30',orientationProofId:'skill1'};
  return window.__testStage.inspect();
 },
 stage:()=>{
  const worked=mutate(()=>{data.journal.push({id:'skill1',title:'Staged Survival',body:'actual physical 71',createdAt:stamp(),characterId:'actor1',
    calendarEpisodeSkillLink:{requestId:'req1',episodeEpoch:'test-epoch',field:'orientationProofId',skill:'Survival',actorId:'actor1',campaignId:data.campaignClock.campaignId,minute:data.campaignClock.minute}})
  },{episodeSkillStaging:true});return {worked,...window.__testStage.inspect()};
 },
 independent:()=>{
  const worked=mutate(()=>{data.journal.push({id:'independent',title:'Independent',body:'confirmed result',createdAt:stamp(),characterId:'actor1'})});
  return {worked,...window.__testStage.inspect()};
 },
 secondStage:()=>{
  const worked=mutate(()=>data.journal.push({id:'skill2',title:'Staged Climbing',body:'physical 22',createdAt:stamp(),characterId:'actor1',
    calendarEpisodeSkillLink:{requestId:'req2',episodeEpoch:'test-epoch',field:'hazardProofId',skill:'Climbing',actorId:'actor1',campaignId:data.campaignClock.campaignId,minute:data.campaignClock.minute}}),{episodeSkillStaging:true});
  return {worked,...window.__testStage.inspect()};
 },
 collision:()=>{
  const worked=mutate(()=>data.journal.push({id:'skill1',title:'Illegal same ID',createdAt:stamp(),characterId:'actor1'}));
  return {worked,...window.__testStage.inspect()};
 },
 finish:()=>{
  const worked=mutate(()=>data.journal.push({id:'episode-done',title:'Episode finalized',body:'confirmed',createdAt:stamp(),characterId:'actor1'}),{episodeCommit:true});
  return {worked,...window.__testStage.inspect()};
 },
 cancel:()=>{
  if(episodeStageBaseline){data=structuredClone(episodeStageBaseline);episodeStageBaseline=null;}discardEpisodeDraftSidecar();return window.__testStage.inspect();
 },
 restore:()=>{
  data=JSON.parse(localStorage.getItem(STORAGE));episodeStageBaseline=null;episodePinnedSkillFields.clear();episodeDraftEpoch='newepoch';restoreEpisodeDraftSidecar();return window.__testStage.inspect();
 }
};
'''
modules['app.js']+='\n'+helper;repacked=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+pos:]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();errs=[];dialogs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.goto('about:blank');page.set_content('<div id="app"></div>')
 page.evaluate("""()=>{function mem(){let m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}}}Object.defineProperty(window,'localStorage',{configurable:true,value:mem()});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mem()})}""")
 page.add_script_tag(content=repacked)
 result={}
 for op in ('setup','stage','independent','secondStage','collision','restore','finish'):
  r=page.evaluate(f'window.__testStage.{op}()');result[op]=r
  print(op, {k:v for k,v in r.items() if k in ('worked','doc','base','side','last','receipts')})
 assert result['stage']['worked'] is True and result['stage']['doc']==1 and result['stage']['base']==0
 assert result['independent']['worked'] is True and result['independent']['doc']==2 and result['independent']['base']==1
 assert result['secondStage']['worked'] is True and result['secondStage']['doc']==3 and result['secondStage']['base']==1
 assert result['collision']['worked'] is False and result['collision']['base']==1
 assert result['restore']['doc']==3 and result['restore']['base']==1
 assert result['finish']['worked'] is True and result['finish']['doc']==4 and result['finish']['base']==4 and result['finish']['side'] is False
 page.evaluate('window.__testStage.restore()')
 verify=page.evaluate('window.__testStage.inspect()')
 assert verify['doc']==4 and verify['base']==4 and verify['side'] is False
 print('PASS staged Skill Test x2, independent saved receipt, collision rollback, reload, final commit, reload')
 print('errors',errs,'dialogs',dialogs)
 assert not errs
 browser.close()
