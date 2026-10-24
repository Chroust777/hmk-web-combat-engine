from pathlib import Path
from playwright.sync_api import sync_playwright
import json,copy
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
mods,offset=json.JSONDecoder().raw_decode(bundle[len(prefix):])
mods['app.js']+="""
window.__hmkTest471=(db,mode='calendar')=>{
 const initial=require('./src/integration/persistent-combat-state.js').initialCombatState();
 for(const ch of db.characters){ch.hmk.combatState={...initial,...(ch.hmk.combatState||{}),morale:{...initial.morale,...(ch.hmk.combatState?.morale||{})}};}
 data=db;selected=db.characters[0].id;view=mode;activeSheetSection='notes';calendarLanding=false;calendarCreating=false;activeCalendarSection='provisions';provisionScope='person';provisionGuideActorId=db.characters[0].id;provisionGuideRoute='have';storageReadOnly=false;
 const text=JSON.stringify(db);localStorage.setItem(STORAGE,text);storageBaseline=text;render();
};
"""
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+bundle[len(prefix)+offset:]
fixture=json.loads((Path('/mnt/data/hmk_work_93470')/'test_generated_character_470.json').read_text())
c1=fixture['characters'][0];c2=copy.deepcopy(c1);c2['id']='character-second-471';c2['name']='Borin';fixture['characters']=[c1,c2]
fixture['journal']=[{'id':'personal-471','characterId':c1['id'],'title':'Zapis přesunů a osobních nákupů','body':'Dlouhý popis velmi podrobného osobního záznamu. '*7,'createdAt':'2026-01-01T11:00:00.000Z'},{'id':'combat-471','characterId':c1['id'],'title':'Nepřepisovatelný důkaz hodu v boji','body':'Důkaz historického rollu','createdAt':'2026-01-02T11:00:00.000Z','gmRuleEvidence':'confirmed'}]
fixture['campaignClock']={'format':'hmk-campaign-calendar-v1','label':'Test','campaignId':'c471','minute':480,'characterIds':[c1['id'],c2['id']],'trOrigin':{'anchorDay':1,'year':720,'month':5,'day':6},'anchors':[],'events':[{'id':'ev','type':'init','minute':480,'reason':'GM confirmation'}]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1400,'height':900});errs=[];dialogs=[]
 page.on('pageerror',lambda x:errs.append(str(x)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate("""()=>{const store=new Map();const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}""")
 for style in ['styles.css','book-templates.css']:page.add_style_tag(content=(root/style).read_text())
 page.add_script_tag(content=bundle)
 page.evaluate('(db)=>window.__hmkTest471(db)',fixture)
 assert page.locator('.hc-provision-scope-tabs').count()==1
 assert page.locator('.hc-provision-guide').count()==1
 page.screenshot(path=str(root/'provision_person_471.png'),full_page=True)
 assert page.locator('.hc-provision-dashboard').count()==0
 assert page.locator('[data-foraging-batch-rations]').count()==0
 assert page.locator('[data-provision-actor] option').count()==2
 page.locator('[data-provision-go="evidence"]').click()
 assert page.locator('.hc-provision-personal-rules').evaluate('(e)=>e.open')
 assert page.locator('form[data-nutrition-policy-form][data-provision-scope-actor]').count()==1
 assert page.locator('form[data-provision-scope-actor] input[name=nutritionActorIds]').input_value()==c1['id']
 page.locator('[data-provision-actor]').select_option(c2['id'])
 assert 'Borin' in page.locator('.hc-provision-guide').inner_text()
 assert page.locator('form[data-provision-scope-actor]').get_attribute('data-provision-scope-actor')==c2['id']
 page.locator('[data-provision-scope="party"]').click()
 assert page.locator('.hc-provision-guide').count()==0
 assert page.locator('.hc-provisions-dashboard').count()==1
 assert page.locator('.hc-provision-card').count()==2
 assert page.locator('.hc-provision-rulebook').count()==1
 page.locator('.hc-provision-rulebook').evaluate('(e)=>e.open=true')
 assert page.locator('[data-foraging-batch-rations] [name="rationActorIds"]').count()==2
 assert page.locator('[data-nutrition-policy-form] [name="nutritionActorIds"]').count()==2
 page.locator('[data-provision-scope="person"]').click()
 assert page.locator('.hc-provision-guide').count()==1 and page.locator('.hc-provision-card').count()==1
 assert page.locator('[data-foraging-batch-rations]').count()==0
 state=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 assert state['journal']==fixture['journal'],'switching scopes must not create receipts'
 # Actual individual policy writer must affect ONLY Borin, not the party.
 page.locator('[data-provision-route="forage"]').click()
 page.locator('.hc-provision-personal-rules').evaluate('(e)=>e.open=true')
 page.locator('form[data-provision-scope-actor] [name="foragingOnly"]').check()
 page.locator('form[data-provision-scope-actor] button[type="submit"]').first.click()
 after=json.loads(page.evaluate("localStorage.getItem('hmk-keepers-ledger-v1')"))
 policies=[row for row in after['journal'] if row.get('calendarNutritionPolicy')]
 assert len(policies)==1,(policies,dialogs,errs)
 assert policies[0]['characterId']==c2['id'],policies
 assert policies[0]['calendarNutritionPolicy']['foragingOnly']==True,policies
 assert all(row['characterId']!=c1['id'] for row in policies),policies
 page.evaluate('(db)=>window.__hmkTest471(db,"sheet")',fixture)
 assert page.locator('.journal-log-row--slim').count()==2
 page.screenshot(path=str(root/'logbook_rows_471.png'),full_page=True)
 one=page.locator('[data-journal-entry="personal-471"]')
 b=one.bounding_box()
 btn=one.locator('[data-delete-log]').bounding_box()
 assert btn['y']>=b['y'] and btn['y']+btn['height']<=b['y']+b['height']
 assert one.locator('.journal-log-expand').count()==1
 assert one.locator('.journal-log-expand').evaluate('(el)=>el.open') is False
 assert btn['x']>one.locator('.journal-log-one-line').bounding_box()['x']
 assert not errs,errs
 print('PASS Chromium 93.471: personal actor only, distinct group batch, switches do not record supplies, two-column compact log, no JS errors; dialogs',dialogs)
 browser.close()
