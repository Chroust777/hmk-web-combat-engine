"""Visual and event smoke regression for v93.801; no private campaign data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
import json

root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):]);
mods['app.js']+='''
window.__seedWoundSkin801=()=>{
 const H=require('./src/integration/persistent-combat-state.js');
 const C=require('./src/integration/hmk-campaign-calendar.js');
 const G=require('./src/integration/hmk-gm-health-override.js');
 let health=H.initialCombatState();
 for(const [id,location,side,level] of [['first','ha','left',2],['second','ft','right',1]]){
  health=G.prepareGMHealthOverride({state:health,action:'add',eventId:'skin-'+id,reason:'Test game master injury for UI',gmConfirmed:true,location,side,level,aspect:'fire',initialCare:'pending'}).state;
 }
 data=clean();
 data.characters=[{id:'a',kind:'PC',name:'Karel – zkušební postava',hmk:{attributes:{str:12,end:12,dex:12,agl:12,per:12,wil:12,rea:12,cml:12,aur:12,cre:12,emp:12,elo:12},skills:[],healthState:health}}];
 data.campaignClock=C.createCampaignCalendar({day:1,hour:8,minute:0,campaignId:'skin-801',eventId:'start-skin',gmConfirmed:true,characterIds:['a']});
 view='sheet';selected='a';activeSheetSection='overview';sheetEditingId='a';storageReadOnly=false;
 cloudSync={canWrite:()=>true,onLocalWrite:()=>{},refresh:async()=>{},localStorageCleared:false,enabled:false};
 render();
};
window.__stateWoundSkin801=()=>JSON.stringify(data.characters[0].hmk.healthState);
'''
cr=mods['src/integration/hmk-character-creation.js']
for orig,add in [('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="a")return {ready:true,missingSteps:[],issues:[],reason:""};'),('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="a")return [];'),('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="a")return true;')]:
 assert orig in cr, orig
 cr=cr.replace(orig,add)
mods['src/integration/hmk-character-creation.js']=cr
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
style=[(root/name).read_text(encoding='utf8') for name in ('styles.css','skill-workbench.css','library.css','book-templates.css','hmk-global-ui-93741.css')]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,height,label in [(1440,1000,'desktop'),(390,850,'mobile')]:
   page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(10000)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content('<!doctype html><html lang=cs><head><meta charset=utf-8></head><body><div id=app></div></body></html>');page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''');
   for css in style:page.add_style_tag(content=css)
   page.add_script_tag(content=bundle);print('BEFORE SEED',label,'errors=',errors,'seedtype=',page.evaluate('typeof window.__seedWoundSkin801'),flush=True);page.evaluate('window.__seedWoundSkin801()')
   button=page.locator('[data-open-gm-wounds]');assert button.count()==1,button.count()
   baseline=page.evaluate('window.__stateWoundSkin801()');button.click()
   panel=page.locator('.editor-backdrop #hmk-wound-management');assert panel.count()==1
   assert page.locator('#hmk-wound-management .list-row').count()==2
   assert page.locator('[data-gm-wound-editor]').get_attribute('open') is not None
   # Ensure no automatic save merely opening popup.
   assert baseline==page.evaluate('window.__stateWoundSkin801()')
   styles=panel.evaluate('''e=>{const s=getComputedStyle(e),d=getComputedStyle(e.querySelector('details')),f=getComputedStyle(e.querySelector('select')),r=getComputedStyle(e.querySelector('.list-row'));return {bg:s.backgroundImage,ground:s.backgroundColor,ink:s.color,headSize:getComputedStyle(e.querySelector('h3')).fontSize,rowBg:r.backgroundColor,formBg:f.backgroundColor,detailBg:d.backgroundColor}}''')
   assert 'clean_vellum.png' in styles['bg'], styles
   assert '255, 248, 232' not in styles['rowBg'], styles # sanity no garish white row
   assert 'rgb(255, 248, 232)' in styles['formBg'],styles
   assert not errors,errors
   overflow=page.evaluate('''()=>({v:document.documentElement.scrollWidth-document.documentElement.clientWidth,outer:document.querySelector('.editor-dialog').scrollWidth-document.querySelector('.editor-dialog').clientWidth})''')
   assert overflow['v']<=3,overflow
   panel.screenshot(path=f'/mnt/data/HMK_WOUND_DIALOG_v93.801_{label}.png')
   # Changing the action remains interactive; only the skin has changed.
   form=page.locator('#hmk-gm-health-form');form.locator('[name=action]').select_option('resolve')
   assert form.locator('[data-gm-resolve-inputs]').is_visible()
   assert not form.locator('[data-gm-add-inputs]').is_visible()
   form.locator('[name=action]').select_option('add')
   assert form.locator('[data-gm-add-inputs]').is_visible()
   page.locator('[data-action=cancel-editor]').click()
   assert page.locator('.editor-backdrop').count()==0
   assert baseline==page.evaluate('window.__stateWoundSkin801()')
   print('PASS',label,styles,'overflow',overflow,'no-change',True,flush=True)
   page.close()
  browser.close()
finally:
 pass
