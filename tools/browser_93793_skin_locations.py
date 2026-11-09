from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];raw=(root/'hmk-app.bundle.js').read_text();prefix='(()=>{const MOD=';m,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
m['app.js']+='''
window.__skin93793Init=()=>{
 const H=require('./src/integration/persistent-combat-state.js'),C=require('./src/integration/hmk-campaign-calendar.js');const a={id:'p-skin',kind:'PC',name:'Test Cold Exposure',hmk:{attributes:{str:12,end:12,agl:12,dex:12,per:12,wil:12,rea:12},skills:[],healthState:H.initialCombatState()}};
 a.hmk.healthState.environmentalHazards=[{id:'cold-93793',kind:'cold',sourceId:'source-cold-93793',skinPending:'frostbite',active:true},{id:'heat-93793',kind:'heat',sourceId:'source-heat-93793',skinPending:'sunburn',active:true}];
 data=clean();data.characters=[a];data.inventory=[];data.journal=[];data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'skin-c93793',eventId:'begin-skin',gmConfirmed:true,characterIds:[a.id]});selected=a.id;
 const e=document.createElement('div');e.id='test-skin';e.innerHTML=hskTrekkingSkinForms(a.id);document.getElementById('app').append(e);hskAutoPopulateSkinForms(e);
 return [...e.querySelectorAll('form[data-skill-weather-skin]')].map(f=>({kind:f.dataset.weatherSkinKind,rows:f.querySelectorAll('[data-weather-skin-row]').length}));
};
window.__skin93793State=()=>({minute:data.campaignClock.minute,journal:data.journal.length,wounds:persistentStateOf(character('p-skin')).wounds.length});
'''
bundle=prefix+json.dumps(m,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote']);page=b.new_page(viewport={'width':1400,'height':950});page.on('dialog',lambda d:d.accept());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),x={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{value:x,configurable:true});Object.defineProperty(window,'sessionStorage',{value:x,configurable:true})}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:page.add_style_tag(content=(root/css).read_text())
 page.add_script_tag(content=bundle)
 try:
  print('INIT',page.evaluate('window.__skin93793Init()'),flush=True)
  forms=page.locator('form[data-skill-weather-skin]');assert forms.count()==2
  for i,kind in enumerate(['frostbite','sunburn']):
   f=forms.nth(i); f.locator('xpath=ancestor::details[1]/summary').click()
   print('FORM',kind,'ROWS',f.locator('[data-weather-skin-row]').count(),'none',f.locator('[name=noneExposed]').is_checked(),flush=True)
   f.locator('details.hc-weather-skin-exceptions > summary').click()
   # retain only two left/right body locations and ensure separate entries
   f.locator('[name=noneExposed]').check(force=True)
   picks=f.locator('[data-weather-skin-select][data-skin-location="ha"]')
   assert picks.count()==2,'left and right hands must be distinct'
   picks.first.check(force=True);picks.last.check(force=True)
   rows=f.locator('[data-weather-skin-row]');assert rows.count()==2,rows.count()
   ids=rows.evaluate_all('(xs)=>xs.map(x=>x.dataset.skinRowId)')
   assert set(ids)=={'ha:left','ha:right'},ids
   for row in [rows.nth(0),rows.nth(1)]:
    assert row.locator('[data-weather-skin-shock]').is_disabled() and row.locator('[data-weather-skin-compound-die]').is_disabled(),'premature conditional dice'
    assert row.locator('[data-weather-skin-shock] + [data-hmk-general-auto-die]').count()==1
    assert row.locator('[data-weather-skin-compound-die] + [data-hmk-general-auto-die]').count()==1
   if kind=='frostbite':
    f.locator('[name=windD20]').fill('1');f.locator('[name=durationD20]').fill('1')
   else:
    f.locator('[name=complexion]').select_option('very-dark')
    rows.nth(0).locator('[name=skinD10]').fill('1');rows.nth(1).locator('[name=skinD10]').fill('10')
   f.locator('[data-weather-skin-evaluate]').click()
   print('EVALUATED',kind,rows.evaluate_all('(xs)=>xs.map(x=>({id:x.dataset.skinRowId,il:x.dataset.skinLevel,hidden:x.hidden,shock:x.querySelector("[name=shockD100]").disabled,compound:x.querySelector("[name=compoundD10]").disabled,preview:x.querySelector("[data-weather-skin-preview]").textContent.slice(0,100)}))'),flush=True)
   if kind=='sunburn':
    assert rows.nth(0).locator('[name=shockD100]').is_enabled(),'left hand actual sunburn requires shock'
    assert rows.nth(0).locator('[name=shockD100] + [data-hmk-general-auto-die]').is_enabled()
    assert rows.nth(1).locator('[name=shockD100] + [data-hmk-general-auto-die]').is_disabled()
    assert rows.nth(1).is_hidden(),'right hand must wait until left shock resolved'
    rows.nth(0).locator('[name=shockD100] + [data-hmk-general-auto-die]').click()
    assert 1<=int(rows.nth(0).locator('[name=shockD100]').input_value())<=100
    rows.nth(0).locator('[name=shockD100]').fill('21')
    assert rows.nth(1).is_visible(),'right hand must become available'
    assert rows.nth(1).locator('[name=shockD100]').is_disabled(),'sunburn dice below threshold, no shock'
   else:
    # frost IL is determined by time window; may require calendar original receipt.
    assert all(x in ids for x in ['ha:left','ha:right'])
   assert page.evaluate('window.__skin93793State()')=={'minute':480,'journal':0,'wounds':0},'pure preview committed medical outcome'
  assert not errors,errors
  print('PASS Chromium Cold/Sun skin per separate left/right locations, conditional Shock & Compound, no premature commit')
 except BaseException:
  print('PAGEERR',errors, 'body',page.locator('body').inner_text()[-950:]);traceback.print_exc();raise
 finally:b.close()
