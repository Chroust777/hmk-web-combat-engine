"""Real Chromium CS resistance, independent Psyche debt and restore."""
from pathlib import Path
import subprocess,os,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture=json.loads(subprocess.check_output(['node',str(root/'tools/test_neutral_total_release_commit_461.cjs')],cwd=root,env=os.environ|{'HMK_TOTAL_RELEASE_UI_FIXTURE':'1'},text=True))
d=fixture['document']; args=fixture['a2']; minute=d['campaignClock']['minute']
args['ticks'][0]['rolls'][0]['d100']=5
d['characters'].append({'id':'A0','name':'A0','hmk':{'skills':[]}})
for c in d['characters']:
 c['kind']='PC';c.setdefault('name',c['id']); c['hmk']['attributes']={'str':12,'end':12,'rea':12,'per':12,'wil':14}
 c['hmk']['sunsign']='Ùlándus';c['hmk']['wealth']=30
 for index,x in enumerate(c['hmk'].get('skills',[])):
  x['id']='skill-'+str(index)
d['campaignClock']={'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':minute,'label':'Total Release audit',
 'characterIds':[c['id'] for c in d['characters']],'anchors':[],
 'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},
 {'id':'adv','type':'advance','minute':minute,'reason':'GM advance'}]}
d.update({'schemaVersion':1,'items':[],'trash':[]})
saved=json.dumps(d,ensure_ascii=False,separators=(',',':'))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(10000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda v:(dialogs.append(v.message),v.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''raw=>{const map=new Map([['hmk-keepers-ledger-v1',raw]]);const db={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:db});Object.defineProperty(window,'sessionStorage',{configurable:true,value:db});}''',saved)
 page.evaluate("window.__errors=[];const old=console.error;console.error=(...a)=>{window.__errors.push(a.map(x=>String(x)).join(' '));old(...a)}")
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text(encoding='utf8'))
 page.locator('[data-nav="encounter"]').first.click()
 f=page.locator('form[data-neutral-spellfire]');assert f.count()==1,(page.locator('body').inner_text()[-2500:],dialogs,errors)
 def fill(name,value):f.locator('[name="'+name+'"]').fill(str(value))
 def check(name):f.locator('[name="'+name+'"]').check()
 fill('distanceFeet',args['distanceFeet']);fill('castingD100',args['castingD100'])
 f.locator('[name="resultFamily"]').select_option('total-release')
 f.locator('details').evaluate('(element)=>{element.open=true}')
 fill('misfireD100',100);fill('spiritD100',args['spiritD100']);fill('spiritLossD6',','.join(map(str,args['spiritLossD6'])))
 fill('spiritModifiers',0);fill('originX',0);fill('originY',0)
 fill('vortexCensus',json.dumps(args['sourceCensus']));fill('vortexTick',json.dumps(args['ticks'][0]));fill('distancesByFinishId','{}')
 for name in ['gmSpiritModifiersVerified','gmFullSourceHistoryConfirmed','gmNoOtherArcaneSourcesConfirmed','gmWardAbsentConfirmed','gmConcentrationConfirmed','gmOrdinaryConditionsConfirmed','gmConfirmed']:check(name)
 f.locator('button[type="submit"]').click()
 raw=page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")');after=json.loads(raw)
 assert len(after['journal'])==len(d['journal'])+1,('not persisted',dialogs[-8:],errors,page.locator('body').inner_text()[-1800:])
 assert after['journal'][-1]['calendarNeutralTotalRelease']['vortex']['ended'] is True
 assert after['characters'][0]['hmk']['skills'][1]['ml']==39
 assert after['characters'][0]['hmk']['combatState']['morale']['psycheStress']==4
 assert after['characters'][0]['hmk']['arcane']['pendingPsycheTraitChoice']['levels']==3
 assert len(after['characters'][0]['hmk']['arcane']['pendingPsycheTraitChoices'])==1
 assert after['journal'][-1]['calendarNeutralTotalRelease']['vortex']['casterPsycheStress']==1
 # Reload from exact committed localStorage; verify historical validation.
 page.set_content('<div id="app"></div>')
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text(encoding='utf8'))
 assert not errors,errors
 assert not any(x.startswith('Neutral casting:') for x in dialogs),dialogs
 print('PASS Chromium v93.462 Neutral Vortex source CS, PSY3+PSY1 independent debts, CAS and reload')
 browser.close()
