from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path('/mnt/data/hmk93712_work');raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__t=(i)=>{selected=data.characters[i].id;view='sheet';activeSheetSection='hazards';render()};
window.__s=()=>({minute:data.campaignClock?.minute,chars:data.characters.map(c=>({id:c.id,name:c.name,shock:persistentStateOf(c).shock,wounds:persistentStateOf(c).wounds.map(w=>({id:w.id,location:w.location,severity:w.severity,level:w.level,aspect:w.aspect,healed:w.healed,from:w.fromFrostWoundId,treated:w.healing?.treated,origin:require("./src/integration/hmk-medical-origin.js").medicalOriginOfWound(w,persistentStateOf(c).events)}))})),due:require('./src/integration/hmk-campaign-calendar.js').campaignCalendarAgenda(data.campaignClock,data.characters,data.journal).due.map(x=>({kind:x.kind,sourceId:x.sourceId,characterId:x.characterId})),journal:data.journal.length});
window.__saved=()=>JSON.parse(localStorage.getItem('hmk-keepers-ledger-v1'));
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
records=json.loads(Path('/mnt/data/hmk93712_tests/frost_g_fixture.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=b.new_page(viewport={'width':1420,'height':1100});page.set_default_timeout(7000)
 errors=[];dialogs=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<html><head></head><body><div id="app"></div></body></html>');page.evaluate('''r=>{const m=new Map(Object.entries(r));const a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:a});Object.defineProperty(window,'sessionStorage',{configurable:true,value:a});}''',records)
 for f in ['styles.css','book-templates.css','skill-workbench.css','library.css']:page.add_style_tag(content=(root/f).read_text())
 page.add_script_tag(content=bundle)
 print('initial',page.evaluate('__s()'),flush=True)
 # resolve real immediate Injury Mishap and Morale for every participant, never bypassing the calendar.
 for i in range(2):
  for step in range(8):
   page.evaluate('__t(%d)'%i)
   mishap=page.locator('form[data-weather-injury-mishap]')
   morale=page.locator('form[data-weather-injury-morale]')
   if mishap.count():
    if mishap.locator('[name=roll]').count():mishap.locator('[name=roll]').fill('1')
    if mishap.locator('[name=confirmed]').count():mishap.locator('[name=confirmed]').check()
    mishap.locator('button[type=submit]').click()
   elif morale.count():
    morale.locator('[name=aberrance]').fill('0');morale.locator('[name=roll]').fill('1')
    if morale.locator('[name=confirmed]').count():morale.locator('[name=confirmed]').check()
    morale.locator('button[type=submit]').click()
   else:break
 print('pre-amp',page.evaluate('__s()'), 'errors',errors,flush=True)
 page.evaluate('__t(0)')
 form=page.locator('.hmk-weather-care #hmk-frost-amputation-form');print('FROST_FORM',form.count(),'visible cards',page.locator('[data-weather-care-card]:not([hidden])').all_text_contents()[:1],flush=True)
 assert form.count()==1
 assert form.locator('[name=procedureStartMinute]').count()==0
 print('PREVIEW',form.locator('[data-weather-treatment-timing]').inner_text(),flush=True)
 assert '1 minuta' in form.locator('[data-weather-treatment-timing]').inner_text()
 # Real rule inputs, without any separate GM confirmation checkbox.
 for k,v in {'physicianML':'110','physicianIndex':'10','physicianRoll':'1','locationShock':'4','shockML':'110','shockRoll':'1'}.items():form.locator('[name='+k+']').fill(v)
 form.locator('button[type=submit]').click()
 now=page.evaluate('__s()');print('AFTER AMP',now,'errors',errors,'dialogs',dialogs[-3:],flush=True)
 assert not errors,errors
 assert now['minute']==721,now
 assert len(now['chars'][0]['wounds'])==2
 assert now['chars'][0]['wounds'][0]['healed'] is True
 edge=now['chars'][0]['wounds'][1];assert edge['aspect']=='e' and edge['origin']=='travel-weather',edge
 assert any(x['kind']=='bleeding' and x['sourceId']==edge['id'] for x in now['due']),now['due']
 assert any(x['kind']=='weather-shock' and x['sourceId']==edge['id'] for x in now['due']),now['due']
 saved=page.evaluate('__saved()');assert saved['campaignClock']['minute']==721
 print('PASS Chromium Frost G -> 1m amputation -> weather-origin Edge wound with bleeding and Shock due, no Combat',flush=True)
 b.close()
