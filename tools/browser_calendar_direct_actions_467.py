from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8')
head='(()=>{const MOD='; assert bundle.startswith(head)
modules,end=json.JSONDecoder().raw_decode(bundle[len(head):]);modules['app.js']+='''
window.__hmkUITest467=function(d){let init=require('./src/integration/persistent-combat-state.js').initialCombatState();d.characters[0].hmk.combatState={...init,...d.characters[0].hmk.combatState,morale:{...init.morale,...(d.characters[0].hmk.combatState.morale||{})}};data=d;selected=d.characters[0].id;calendarLanding=false;calendarCreating=false;calendarUI=null;activeCalendarSection='overview';view='calendar';render()};
window.__hmkView467=()=>({view,selected,notice});
window.__hmkDiceProbe467=()=>{const f=document.querySelector('form[data-hmk-calendar-psyche-roll]');const w=calendarRecoveryGenerated.get(f);return w?{...w}:null};
window.__hmkDiceTest467=()=>{document.getElementById('app').insertAdjacentHTML('beforeend','<form data-hmk-calendar-psyche-roll>'+calendarDiceControls(6)+'</form>');};
'''
instrumented=head+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(head)+end:]
attrs={k:12 for k in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()};completed={str(i):True for i in range(1,15)}
actor={'id':'a','name':'Arel','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[],'combatState':{},'creation':{'status':'complete','step':14,'completed':completed,'values':{}}}}
clock={'format':'hmk-campaign-calendar-v1','label':'Test','campaignId':'test','minute':480,'characterIds':['a'],'anchors':[],'events':[{'id':'start','type':'init','minute':480,'reason':'GM confirmation'}]}
def fixture(state=None):
 c=json.loads(json.dumps(actor));c['hmk']['combatState']=state or {}
 return {'schemaVersion':1,'characters':[c],'items':[],'inventory':[],'trash':[],'journal':[],'campaignClock':json.loads(json.dumps(clock)),'combatRuntime':None}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');page.add_script_tag(content=instrumented)
 state={'wounds':[{'id':'w1','healed':False,'bleeding':False,'location':'sk','level':1,'severity':'M','aspect':'e','nextAdvanceRound':None}]}
 page.evaluate('(d)=>window.__hmkUITest467(d)',fixture(state))
 button=page.locator('.hc-calendar-linked-row [data-cal-kind="treatment"]')
 assert button.count()==1,'Expected treatment due at current calendar minute'
 assert button.get_attribute('data-cal-link')=='a'
 assert button.get_attribute('data-cal-source')=='w1'
 button.click()
 assert page.locator('#hmk-treatment-form').count()==1,'A due wound should reach original Treatment form'
 assert page.locator('#hmk-treatment-form select[name="wound"]').input_value().endswith('::w1')
 treatment_field=page.locator('#hmk-treatment-form input[name="physicianRoll"]')
 assert treatment_field.count()==1
 assert page.locator('#hmk-treatment-form [data-hmk-calendar-auto-die]').count()==1
 assert page.locator('#hmk-treatment-form [data-hmk-general-auto-die]').count()==0
 page.locator('#hmk-treatment-form [data-hmk-calendar-auto-die]').click()
 assert 1<=int(treatment_field.input_value())<=100
 treatment_field.fill('42')
 # A scheduled future healing must never allow execution before its due minute.
 future=fixture({'wounds':[{'id':'w1','healed':False,'bleeding':False,'location':'sk','level':1,'severity':'M','aspect':'e','nextAdvanceRound':None,'healing':{'treated':True,'healingRate':4,'nextHealingDay':5,'infectionPossible':True}}]})
 future['campaignClock']['anchors']=[{'kind':'wound','characterId':'a','woundId':'w1','minute':480,'source':'gm-attested','eventId':'anch1'}]
 page.evaluate('(d)=>window.__hmkUITest467(d)',future)
 future_button=page.locator('.hc-calendar-linked-row [data-cal-kind="healing"]')
 assert future_button.count()==1
 assert 'čeká' in future_button.inner_text().lower()
 future_button.click()
 state=page.evaluate('window.__hmkView467()')
 assert state['view']=='sheet' and 'před splatností' in state['notice'],state
 assert page.locator('#hmk-healing-roll-form').count()==0
 # The embedded dice component keeps exactly one source-aware generated origin.
 page.evaluate('window.__hmkDiceTest467()')
 form=page.locator('form[data-hmk-calendar-psyche-roll]')
 assert form.locator('input[name="die"]').count()==1
 assert form.locator('[data-hmk-recovery-generate]').count()==1
 assert form.locator('select[name="diceOrigin"]').count()==0
 form.locator('[data-hmk-recovery-generate]').click()
 value=form.locator('input[name="die"]').input_value();assert 1<=int(value)<=6
 assert page.evaluate('window.__hmkDiceProbe467()')['value']==int(value)
 form.locator('input[name="die"]').fill('3')
 assert page.evaluate('window.__hmkDiceProbe467()') is None
 assert not errors,errors
 print('PASS Chromium: due treatment event links to exact character/wound; manual field + lower software die; hand edit revokes software provenance; no errors')
 browser.close()
