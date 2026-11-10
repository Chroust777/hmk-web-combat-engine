"""Actual purchase followed by legacy stable health registration; assert no PC/NPC draft."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__openStable93813=()=>{view='library';libraryTab='stable';render();};
window.__ownerStableLive93813=()=>{const html=characterStableView(character('a'));return {showsAnimal:html.includes('Blesk'),showsMedical:html.includes('Autoritativní Health State'),hasStable:html.includes('Stáj')};};
window.__realOldHealth93813=()=>{
 const animal=verifiedLivestock(data,campaignKey(data.campaignClock)).find(x=>x.name==='Blesk');
 if(!animal)throw Error('Purchase missing');
 const cid=campaignKey(data.campaignClock),minute=data.campaignClock.minute;
 const module=require('./src/integration/hmk-stable-animal-health-registration-93759.js');
 const args={data,campaignId:cid,minute,animalId:animal.id,examinedHealthy:true,examNote:'Historická kontrola před cestou',gmConfirmed:true,proofId:uuid()};
 const before=JSON.stringify(data);
 const r=module.prepareStableAnimalHealthRegistration93759(args);
 const ok=mutate(()=>{
  const saved=module.prepareStableAnimalHealthRegistration93759({...args,data});
  data.characters.push(saved.actor);
  if(!data.campaignClock.characterIds.includes(saved.actor.id)){
   data.campaignClock.characterIds.push(saved.actor.id);
   data.campaignClock.events.push({id:uuid(),type:'membership',minute,reason:'GM potvrdil historický profil zvířete '+saved.actor.name});
  }
  data.journal.push({id:args.proofId,characterId:saved.proof.ownerId,calendarCampaignId:cid,campaignMinute:minute,createdAt:stamp(),title:'Stáj · starší ověřený zdravotní stav '+saved.actor.name,
   body:'Zdravotní doklad · '+saved.proof.examNote,animalHealthRegistration93759:saved.proof});
 });
 return {saved:ok,animalId:animal.id,ownerId:animal.ownerId,profile:character(animal.id),now:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,
  registry:registryCounts93813(data.characters),stillInStable:verifiedLivestock(data,cid).some(x=>x.id===animal.id),journalProof:data.journal.some(x=>x.animalHealthRegistration93759?.animalId===animal.id)};
};
window.__stableRealCheck93813=()=>({
 all:data.characters.length,animals:verifiedLivestock(data,campaignKey(data.campaignClock)).map(x=>({id:x.id,name:x.name})),
 registry:registryCounts93813(data.characters),health:data.characters.filter(x=>x.hmk?.verifiedMountedBreed).map(x=>({id:x.id,shock:x.hmk.healthState?.shock,owner:x.hmk.livestockOwnerId})),
 animalDocs:data.journal.filter(j=>j.animalHealthRegistration93759).length,
 time:data.campaignClock.minute,stored:JSON.parse(storageBaseline).campaignClock.minute,
});
'''
seed=seed.replace('verifiedLivestock(data,',"require('./src/integration/hmk-livestock-562.js').verifiedLivestock(data,")
seed=seed.replace('campaignKey(data.campaignClock)',"require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock)")
seed=seed.replace("require('./src/integration/hmk-calendar-multi-campaign.js').require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey","require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey")
seed=seed.replace('registryCounts93813(data.characters)',"require('./src/integration/hmk-character-registry-separation-93813.js').registryCounts93813(data.characters)")
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':1000});page.set_default_timeout(18000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle);page.evaluate('window.__seedRows93772()')
 page.evaluate('window.__openStable93813()')
 form=page.locator('[data-hmk-livestock-acquire]')
 assert form.count(),page.locator('body').inner_text()[-1200:]
 option=form.locator('[name=beastId] option').filter(has_text='Palfrey, cart horse').first
 form.locator('[name=beastId]').select_option(option.get_attribute('value'))
 form.locator('[name=beastName]').fill('Blesk');form.locator('[name=ownerId]').select_option('a')
 form.locator('button[value=free]').click()
 print('BOUGHT',page.evaluate('window.__stableRealCheck93813()'),flush=True)
 result=page.evaluate('window.__realOldHealth93813()')
 print('LEGACY HEALTH RESULT',str(result)[:1000],flush=True)
 assert result['saved'] and result['journalProof'] and result['stillInStable'],result
 assert result['registry']=={'people':3,'animals':1},result
 assert result['now']==result['stored']==480,result
 # Return to PC/NPC registrar: no new NPC or draft for Blesk.
 page.locator('[data-nav=characters]').first.click()
 assert page.locator('.character-card').count()==3
 assert page.locator('.character-card').filter(has_text='Blesk').count()==0
 assert page.locator('.castle-character').count()==3
 # Actual Stable still sees the purchased animal and canonical health-state link.
 page.evaluate('window.__openStable93813()')
 owned=page.evaluate('window.__ownerStableLive93813()')
 print('OWNER STABLE',owned,flush=True)
 assert owned['showsAnimal'] and owned['showsMedical'],owned
 assert page.evaluate('window.__stableRealCheck93813()')['health'][0]['shock']=='NONE'
 assert not errors,errors
 print('PASS Chromium v93.813: real free purchase, legacy real medical registration, atomic save, human registry hidden, Stable and health unchanged, clock unchanged.',flush=True)
 b.close()
