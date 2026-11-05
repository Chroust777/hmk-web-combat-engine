from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data/hmk_dev_93723')
raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD='
modules,pos=json.JSONDecoder().raw_decode(raw[len(prefix):]);helper=r'''
window.__weatherUITest={
 inspect:()=>({v:APP_VERSION,autoAV:typeof hmk_weather_area_av_js_1.calculateWeatherAreaAV,autoAftercare:typeof closeWeatherNoEffectAftercare,wound:journalReadableWounds([{location:'fa',severity:'M',level:1},{location:'ft',side:'L',severity:'M',level:1},{location:'nk',severity:'S',level:3}]),name:data.characters[0]?.name,created:data.characters[0]?.hmk?.creation?.status}),
 setup:()=>{
  const patient=data.characters[0];if(!patient)throw Error('No patient');
  const doc=(id,name)=>({id,name,hmk:{attributes:{dex:12},skills:[{name:'Physician',ml:90}],healthState:persistent_combat_state_js_1.initialCombatState()}});
  const d1=doc('DR1','Doctor busy'),d2=doc('DR2','Doctor free');
  data.characters.push(d1,d2);
  patient.hmk.healthState=persistent_combat_state_js_1.initialCombatState();
  patient.hmk.healthState.wounds.push({id:'w1',location:'fa',severity:'M',level:1,aspect:'b',side:'left',bleeding:false,healed:false,nextAdvanceRound:null});
  patient.hmk.healthState.wounds.push({id:'w2',location:'fa',severity:'M',level:1,aspect:'b',side:'right',bleeding:false,healed:false,nextAdvanceRound:null});
  const cc=hmk_campaign_calendar_js_1.createCampaignCalendar({day:1,hour:12,minute:0,label:'QA',eventId:'clock0',gmConfirmed:true,campaignId:'CQA',characterIds:[patient.id,'DR1','DR2']});
  data.campaignClock=cc;
  const form=document.createElement('form');form.id='hmk-treatment-form';form.innerHTML='<div class="hmk-weather-care"><select name="wound"><option value="'+patient.id+'::w1" selected>w1</option></select><select name="healerId"><option value="">choose</option></select><input name="physicianML"><input name="physicianIndex"><input name="physicianRoll"><input name="dexSecondaryModifier"><p data-weather-busy-healers></p><p data-weather-healer-status></p></div>';
  const carePanel=document.createElement('section');carePanel.className='hmk-weather-care';carePanel.appendChild(form);document.body.appendChild(carePanel);
  const proc={formId:'hmk-treatment-form',characterId:patient.id,woundId:'w2',eventId:'EV1',healerId:'DR1',startMinute:cc.minute,endMinute:cc.minute+15,confirmed:true,args:{physicianRoll:20}};
  data.campaignClock=hmk_concurrent_procedures_js_1.startConcurrentProcedure(data.campaignClock,{id:'ST1',procedure:proc});
  const active=busyWeatherHealers();
  const available=weatherHealerChoicesForForm(form).map(x=>x.id);
  syncWeatherHealerFields(form);
  return {now:cc.minute,busy:active.map(x=>x.healerId),available,options:[...form.elements.namedItem('healerId').options].map(x=>x.value),status:form.querySelector('[data-weather-busy-healers]').textContent,selected:form.elements.namedItem('healerId').value};
 },
 avForm:()=>{
  const f=document.createElement('form');f.innerHTML='<label>AV<input name="whAV_cold_'+data.characters[0].id+'" value="99"><small data-weather-av-source="'+data.characters[0].id+'"></small></label>';document.body.appendChild(f);refreshWeatherAreaAVFields(f);
  return {value:f.querySelector('input').value,readonly:f.querySelector('input').readOnly,source:f.querySelector('small').textContent};
 },
 aftercare:()=>{
  const patient=data.characters[0];const clock=data.campaignClock;
  // The confirmed test and completed travel episode are fixtures, not invented rolls.
  const proof={id:'W-PROOF',characterId:patient.id,calendarCampaignId:'CQA',campaignMinute:clock.minute,
   skillTestProof:{type:'secondary-mastery-value-test',skills:['Endurance'],a:{level:'S'}}};
  const ep={id:'W-EP',characterId:patient.id,calendarCampaignId:'CQA',campaignMinute:clock.minute,
   calendarTimeEpisode:{endMinute:clock.minute,weatherAftercare:'external-v93.676',weatherExposure:[{id:patient.id,kind:'cold',exposed:true,proofId:'W-PROOF',coldCondition:'dry'}]}};
  data.journal.push(proof,ep);
  const before=data.journal.length;
  const added=closeWeatherNoEffectAftercare(),again=closeWeatherNoEffectAftercare();
  const entry=data.journal.find(j=>j.skillTestProof?.automaticNoEffect);
  const forms=hskEpisodeWeatherOnsetForms(patient.id);
  return {added,again,before,after:data.journal.length,formCount:(forms.match(/data-skill-weather-onset/g)||[]).length,level:entry?.skillTestProof.report?.originalSL,source:entry?.skillTestProof.sourceId,stateEvents:patient.hmk.healthState.events.filter(x=>x.type==='skill-trekking-weather-hazard').length};
 },
 aftercareAll:()=>{
  const patient=data.characters[0];const clock=data.campaignClock;const begin=JSON.stringify(patient.hmk.healthState);
  const cases=[['cold','CS'],['heat','S'],['heat','CS']];
  for(const [kind,level] of cases){
   const tag=kind+'-'+level;
   data.journal.push({id:'W-PROOF-'+tag,characterId:patient.id,calendarCampaignId:'CQA',campaignMinute:clock.minute,
    skillTestProof:{type:'secondary-mastery-value-test',skills:['Endurance'],a:{level}}});
   data.journal.push({id:'W-EP-'+tag,characterId:patient.id,calendarCampaignId:'CQA',campaignMinute:clock.minute,
    calendarTimeEpisode:{endMinute:clock.minute,weatherAftercare:'external-v93.676',weatherExposure:[{id:patient.id,kind,exposed:true,proofId:'W-PROOF-'+tag,coldCondition:'dry'}]}});
  }
  const first=closeWeatherNoEffectAftercare(),second=closeWeatherNoEffectAftercare();
  const certs=data.journal.filter(j=>j.skillTestProof?.automaticNoEffect);
  return {first,second,certs:certs.length,unchanged:begin===JSON.stringify(patient.hmk.healthState),
   eventIds:new Set(certs.map(x=>x.skillTestProof.sourceId)).size,
   pendingForms:(hskEpisodeWeatherOnsetForms(patient.id).match(/data-skill-weather-onset/g)||[]).length,
   grades:certs.map(x=>x.skillTestProof.report.originalSL)};
 }
};'''
modules['app.js']+='\n'+helper
repacked=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+pos:]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();errors=[];alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 page.goto('about:blank');page.set_content('<div id="app"></div>')
 page.evaluate("""()=>{function mem(){let m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}}}Object.defineProperty(window,'localStorage',{configurable:true,value:mem()});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mem()})}""")
 page.add_script_tag(content=repacked)
 page.locator('[data-action="auto-random-character"]').click()
 f=page.locator('#hmk-random-name-form');f.locator('[name="name"]').fill('Patient')
 f.locator('button[type=submit]').click()
 page.locator('.hmk-auto-generation-overlay').wait_for(state='hidden',timeout=90000)
 r=page.evaluate('window.__weatherUITest.inspect()');print('INSPECT',r,flush=True)
 assert r['v']=='93.723' and r['autoAV']=='function' and 'face' in r['wound'] and 'left foot' in r['wound'] and 'Minor Injury' in r['wound']
 r=page.evaluate('window.__weatherUITest.avForm()');print('AV',r,flush=True)
 assert r['value'].isdigit() and r['value']!='99' and r['readonly'] and 'HMK 133' in r['source']
 r=page.evaluate('window.__weatherUITest.setup()');print('DOCTOR',r,flush=True)
 assert r['busy']==['DR1'] and 'DR1' not in r['available'] and 'DR2' in r['available'] and 'Doctor busy' in r['status'] and 'Patient' in r['status'] and r['selected']=='' and 'face' in r['status']
 r=page.evaluate('window.__weatherUITest.aftercare()');print('AUTO',r,flush=True)
 assert r['added']==1 and r['again']==0 and r['after']==r['before']+1 and r['formCount']==0 and r['level']=='S' and r['stateEvents']==0
 r=page.evaluate('window.__weatherUITest.aftercareAll()');print('AUTO-MULTI',r,flush=True)
 assert r['first']==3 and r['second']==0 and r['certs']==4 and r['unchanged'] and r['eventIds']==4 and r['pendingForms']==0
 print('PASS Chromium UI: journal full location & tooltip, derived AV, busy doctor filtered, 4 idempotent no-effect weather receipts')
 print('errors',errors,'alerts',alerts)
 assert not errors and not alerts
 browser.close()
