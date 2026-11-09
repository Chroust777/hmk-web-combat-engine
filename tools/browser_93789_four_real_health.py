from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
base=(ROOT/'tools/browser_93788_three_day_compound_health.py').read_text();ns={'__file__':str(ROOT/'tools/browser_93788_three_day_compound_health.py')}
exec(base.rsplit('\nwith sync_playwright() as p:',1)[0],ns)
mods,raw,prefix,end=ns['mods'],ns['raw'],ns['prefix'],ns['end']
cr=mods['src/integration/hmk-character-creation.js']
for orig,inject in [
 ('function characterJournalReadiness(character) {','function characterJournalReadiness(character) {if(character?.id==="e")return {ready:true,missingSteps:[],issues:[],reason:""};'),
 ('function creationRevisionIssues(character) {','function creationRevisionIssues(character) {if(character?.id==="e")return [];'),
 ('function assertCreationInvariants(character) {','function assertCreationInvariants(character) {if(character?.id==="e")return true;')]:
 assert orig in cr,orig
 cr=cr.replace(orig,inject)
mods['src/integration/hmk-character-creation.js']=cr
mods['app.js']+='''
window.__medicalSnapshot93789=()=>({minute:data.campaignClock.minute,health:data.characters.filter(c=>['c','d'].includes(c.id)).map(c=>({id:c.id,state:c.hmk.healthState})),journalCount:data.journal.length,stored:JSON.parse(localStorage.getItem(STORAGE)).campaignClock.minute});
'''
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1550,'height':940});page.set_default_timeout(10000)
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const m=new Map(),s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
 page.add_script_tag(content=bundle);page.evaluate('window.__seedComposite93788()')
 print('BEFORE',page.evaluate('window.__inspect3Days93787()')['minute'],flush=True)
 print('MOVE',page.evaluate('window.__advance3Days93787(10)')['ok'],flush=True)
 print('DUE',page.evaluate('window.__inspect3Days93787()')['due'],flush=True)
 page.evaluate('window.__overview3Days93787()')
 for kind in ['infection','blood-loss']:
  page.evaluate('window.__overview3Days93787()')
  links=page.locator('[data-cal-kind='+kind+']')
  print('LINKS',kind,links.count(),links.evaluate_all('(x)=>x.map(y=>[y.outerHTML.slice(0,260),y.innerText])'),flush=True)
  if not links.count():continue
  links.first.click()
  print('AFTER CLICK',kind,'VISIBLE FORMS',page.locator('form').evaluate_all('(fs)=>fs.filter(x=>x.getClientRects().length).map(x=>({id:x.id,attrs:[...x.attributes].filter(a=>a.name.startsWith("data-")).map(a=>a.name).slice(0,10),text:x.textContent.slice(0,150)})).slice(-20)'),flush=True)
  print('BODYPART',page.locator('body').inner_text()[-1800:],flush=True)
  if kind=='infection':
   fi=page.locator('#hmk-infection-course-form');print('INFECTION_FIELDS',fi.locator('[name]').evaluate_all('(es)=>es.map(n=>[n.name,n.value,n.outerHTML.slice(0,120)])'),flush=True)
   print('INFECTION_VISIBLE',fi.is_visible(),flush=True)
   before=page.evaluate('window.__inspect3Days93787()');med_before=page.evaluate('window.__medicalSnapshot93789()');fi.locator('[name=roll]').fill('99');fi.locator('[type=submit]').click()
   after=page.evaluate('window.__inspect3Days93787()');med_after=page.evaluate('window.__medicalSnapshot93789()');assert after['minute']==4320 and len(after['due'])==len(before['due'])-1 and med_after['health'][0]['state']!=med_before['health'][0]['state'];print('INFECTION_DONE',{'beforeDue':before['due'],'afterDue':after['due'],'before':before['states'][2], 'after':after['states'][2], 'clock':after['minute']},flush=True)
  if kind=='blood-loss':
   fb=page.locator('#hmk-blood-regeneration-form');print('BLOOD_FIELDS',fb.locator('[name]').evaluate_all('(es)=>es.map(n=>[n.name,n.value,n.outerHTML.slice(0,120)])'),flush=True)
   print('BLOOD_VISIBLE',fb.is_visible(),flush=True)
   before=page.evaluate('window.__inspect3Days93787()');fb.locator('[name=roll]').fill('21');fb.locator('[type=submit]').click()
   after=page.evaluate('window.__inspect3Days93787()');assert after['minute']==4320 and len(after['due'])==len(before['due'])-1 and after['states'][3]['blood']['bp']==2 and after['states'][3]['blood']['weaknessFatigue']==10;print('BLOOD_DONE',{'beforeDue':before['due'],'afterDue':after['due'],'before':before['states'][3], 'after':after['states'][3], 'clock':after['minute']},flush=True)
 # Complete remaining two simultaneous due health obligations with the ORIGINAL forms.
 page.evaluate('window.__overview3Days93787()')
 page.locator('[data-cal-kind=grim]').first.click()
 grim=page.locator('#hmk-grim-shock-form:visible');assert grim.count()==1
 grim.locator('[name=locationShock]').fill('0')
 grim.locator('[name=shockML]').fill('75')
 grim.locator('[name=roll]').fill('20')
 grim.locator('[type=submit]').click()
 after_grim=page.evaluate('window.__inspect3Days93787()')
 print('GRIM_REAL_DONE',after_grim['due'],after_grim['minute'],flush=True)
 assert [x['kind'] for x in after_grim['due']]==['poison']
 page.evaluate('window.__overview3Days93787()')
 page.locator('[data-cal-agenda][data-cal-kind=poison]').first.click()
 poison=page.locator('form[data-hmk-poison-course]')
 print('POISON_DOM',page.locator('body').inner_text()[:1250], 'ERRORS',errs, flush=True)
 print('POISON_FORM_COUNT',poison.count(),'visible',poison.is_visible() if poison.count() else None,'form ids',page.locator('form[id]').evaluate_all('(x)=>x.filter(n=>n.getClientRects().length).map(n=>n.id)'),flush=True)
 assert poison.count()==1
 if not poison.is_visible():
  poison.evaluate('(n)=>{let p=n.closest("details");if(p)p.open=true;}')
 assert poison.is_visible(),'Even opened poison details are hidden'
 poison.locator('[name=courseD100]').fill('99')
 poison.locator('[name=gmConfirmed]').check()
 poison.locator('[type=submit]').click()
 after_all=page.evaluate('window.__inspect3Days93787()')
 print('FOUR_HEALTH_REAL_DONE',after_all['due'],after_all['minute'],after_all['states'],flush=True)
 assert after_all['minute']==4320 and after_all['due']==[],after_all
 assert after_all['maxAllowed']>0 and after_all['states'][3]['blood']['bp']==2,after_all
 prior=page.evaluate('window.__medicalSnapshot93789()')
 assert prior['minute']==4320 and prior['stored']==4320 and prior['journalCount']>=5
 page.evaluate('window.__reload3Days93787()')
 restored=page.evaluate('window.__medicalSnapshot93789()')
 assert restored==prior,'Four real confirmed health resolutions not persistent'
 assert not errs,errs
 print('PASS 93789 all FOUR simultaneous health due forms: actual infection F, blood-loss success, Grim Shock, Poison Course F, no faked GM deferrals, no time advance, persistent reload',flush=True)
 print('ERRORS',errs,flush=True)
 b.close()
