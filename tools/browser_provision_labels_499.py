from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(); marker='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(marker):]);mods['app.js']+='''
window.__seed499=(assured=false)=>{
 const actor={id:'a499',name:'Karel',kind:'PC',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,cml:12,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12},skills:[],injuries:[]}};
 data=clean();data.characters=[actor];data.campaignClock={format:'hmk-campaign-calendar-v1',campaignId:'c499',label:'Test',minute:480,characterIds:[actor.id],anchors:[],events:[{id:'init499',type:'init',minute:480,reason:'GM založil kampaň'}]};
 if(assured){const p=require('./src/integration/hmk-nutrition-days.js').createNutritionPolicy({campaignId:'c499',minute:480,actorId:'a499',gmProvisioned:true,autoNeeds:true});data.journal=[{id:'policy499',characterId:actor.id,calendarCampaignId:'c499',campaignMinute:480,createdAt:'now',title:'Test',body:'Test',calendarNutritionPolicy:p}];}
 view='calendar';activeCalendarSection='provisions';calendarLanding=false;provisionScope='person';provisionGuideActorId=actor.id;provisionGuideRoute='have';
 const policies=new Map(require('./src/integration/hmk-nutrition-days.js').activeNutritionPolicies(data.journal,'c499',[actor.id]).map(x=>[x.characterId,x]));
 document.getElementById('app').innerHTML=provisionGuideHTML([actor])+personalProvisionRulebookHTML(actor,policies,[],[],data.campaignClock);
};
window.__inflect499=(n)=>czCount(n,'záznam','záznamy','záznamů');
'''
bundle=marker+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(marker)+end:]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':900});errs=[];dialogs=[];page.on('pageerror',lambda x:errs.append(str(x)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map();const o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for sheet in ('styles.css','book-templates.css'):
  page.add_style_tag(content=(root/sheet).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seed499(false)')
 assert page.locator('[data-provision-assure="yes"]').count()==1
 assert page.locator('[data-provision-assure="no"]').count()==1
 assert page.locator('.hc-provision-choices').count()==1
 assert page.locator('[data-provision-vessel-acquire]').count()==1,'food/water forms visible in No mode'
 assert page.locator('.hc-provision-personal-rules').count()==1
 assert page.locator('label:has-text("Druh potravin")').count()==1
 page.evaluate('window.__seed499(true)')
 assert page.locator('.hc-provision-choices').count()==0,'route options hidden on Yes'
 assert page.locator('[data-provision-vessel-acquire]').count()==0,'water acquisition hidden on Yes'
 assert page.locator('.hc-provision-personal-rules').count()==0,'advanced rules hidden on Yes'
 assert page.locator('[data-provision-assure="no"]').count()==1,'No still accessible'
 assert page.locator('.hc-provision-simple-switch').count()==1,'summary still accessible'
 page.evaluate('window.__seed499(false)')
 assert page.locator('.hc-provision-choices').count()==1,'forms restored when returning to No'
 assert [page.evaluate('(n)=>window.__inflect499(n)',n) for n in (0,1,2,4,5,21)]==['0 záznamů','1 záznam','2 záznamy','4 záznamy','5 záznamů','21 záznamů']
 # Confirm that the actual application handler saves each mode and re-renders the controls.
 page.locator('[data-provision-assure="yes"]').click()
 assert page.locator('.hc-provision-choices').count()==0,(dialogs,errs,page.locator('#app').inner_text()[:1000])
 page.locator('[data-provision-assure="no"]').click()
 assert page.locator('.hc-provision-choices').count()==1,(dialogs,errs)
 assert not errs,errs
 print('PASS Chromium: provisioning Yes hides optional controls, No restores forms, buttons persist, Czech grammar counters')
 browser.close()
