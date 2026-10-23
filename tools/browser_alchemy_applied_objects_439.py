"""v93.439: genuine Chromium GM calendar integration, inventory, proof replay/reload."""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
old=(root/'tools/browser_alchemy_decay_417.py').read_text()
node=re.search(r"node=r'''\n(.*?)\n'''",old,re.S).group(1)
node=node.replace("elixirName:'Healing'","elixirName:'Mending'").replace('gmModifier:15','gmModifier:start.sunsignModifier').replace('gmModifiers:[15]','gmModifiers:[start.sunsignModifier]')
base=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True));minute=base['finished']
vial={'id':'vial1','characterId':'a','sourceItemId':'hmk:gear:hmk-p121-075','quantity':1,'slot':'carried',
 'snapshot':{'id':'hmk:gear:hmk-p121-075','name':'Vial, 4 oz, 2″ × 5″','category':'other','properties':{'weightLb':0.25,'pricePence':4}}}
actor={'id':'a','name':'Alchemist','kind':'PC','hmk':{'attributes':{'str':12,'end':12,'rea':12,'per':12,'wil':14,'aur':12},'sunsign':'Ùlándus','wealth':30,
'skills':[{'id':'alc','name':'Alchemy','ml':80},{'id':'herb','name':'Herblore','ml':70},{'id':'mine','name':'Mineralogy','ml':65},{'id':'math','name':'Mathematics','ml':50}]}}

def make_data(name):
 newnode=node.replace("elixirName:'Mending'",f"elixirName:'{name}'")
 generated=json.loads(subprocess.check_output(['node','-e',newnode],cwd=root,text=True))
 j=generated['rows'];m=generated['finished']
 if name=='Object Aegis':
  import copy
  source=copy.deepcopy(next(x for x in j if x.get('skillTestProof')))
  source.update({'id':'source-att','title':'Attunement against actual protected object','body':'GM attested original skill outcome; target confirmed separately','campaignMinute':m})
  source['skillTestProof']['skills']=['Attunement']
  source['skillTestProof']['type']='secondary-mastery-test'
  source['skillTestProof']['a']['level']='CS';source['skillTestProof']['a']['roll']=35;source['skillTestProof']['a']['sl']=3
  source['skillTestProof']['result']['level']='CS';source['skillTestProof']['result']['roll']=35;source['skillTestProof']['result']['sl']=3
  # Source is created only AFTER the actual Aegis application; no retroactive effect.
  global witness_attunement
  witness_attunement=source
 inv=[vial,
  {'id':'sword','characterId':'a','sourceItemId':'fixture:sword','quantity':1,'slot':'main_hand','currentWQ':3,
   'snapshot':{'name':'Actual sword','category':'weapon','properties':{'quality':5,'weightLb':2}}},
  {'id':'broken','characterId':'a','quantity':1,'slot':'carried','condition':'broken',
   'snapshot':{'name':'Broken brooch','category':'other','properties':{'weightLb':1}}}]
 return {'schemaVersion':1,'characters':[actor],'items':[],'inventory':inv,'trash':[],'journal':j,
 'campaignClock':{'format':'hmk-campaign-calendar-v1','campaignId':'C','minute':m,'label':'Applied','characterIds':['a'],
 'anchors':[],'events':[{'id':'init','type':'init','minute':0,'reason':'GM start'},{'id':'advance','type':'advance','minute':m,'reason':'GM completion'}]}}
def saved(page):return json.loads(page.evaluate('window.localStorage.getItem("hmk-keepers-ledger-v1")'))
def new_page(browser,fixture):
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html lang="cs"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''fixture=>{const store=new Map([['hmk-keepers-ledger-v1',JSON.stringify(fixture)]]);const mock={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:mock});Object.defineProperty(window,'sessionStorage',{configurable:true,value:mock});}''',fixture)
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text());page.wait_for_timeout(120)
 assert 'v93.439' in page.locator('#app').inner_text(),('boot',errors,dialogs,page.locator('#app').inner_text()[:500])
 page.locator('[data-nav="calendar"]').first.click();page.wait_for_timeout(100)
 if page.locator('[data-calendar-open]').count():page.locator('[data-calendar-open]').first.click();page.wait_for_timeout(80)
 return page,errors,dialogs
def bind(page):
 f=page.locator('[data-alchemy-vial-bind]');assert f.count()==1, ('vial form missing',page.locator('#app').inner_text()[:1500],page.locator('[data-alchemy-vial-bind]').count())
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="vialId"]').select_option('vial1')
 for key in ['confirmed','liquidConfirmed','corkConfirmed']:f.locator('input[name="'+key+'"]').check()
 f.locator('select[name="material"]').select_option('glass');f.locator('button[type="submit"]').click()
 page.wait_for_timeout(130)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page,e,d=new_page(browser,make_data('Mending'));bind(page)
 f=page.locator('[data-alchemy-mending]');assert f.count()==1,('Mending form missing',d,e)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="targetItemId"]').select_option(['sword','broken'])
 f.locator('input[name="accessConfirmed"]').check();f.locator('input[name="confirmed"]').check()
 t=saved(page)['campaignClock']['minute'];f.locator('button[type="submit"]').click();page.wait_for_timeout(160)
 after=saved(page);receipts=[x for x in after['journal'] if x.get('calendarAlchemyMending')]
 assert len(receipts)==1,(d,e,'Mending failed');assert receipts[0]['calendarAlchemyVialEmpty']['vialId']=='vial1'
 assert next(x for x in after['inventory'] if x['id']=='sword')['currentWQ']==5
 assert next(x for x in after['inventory'] if x['id']=='broken')['condition']==''
 assert after['campaignClock']['minute']==t and not e and not d,(e,d)
 again,e2,d2=new_page(browser,after);assert not d2 and not e2,(d2,e2)
 assert next(x for x in saved(again)['inventory'] if x['id']=='sword')['currentWQ']==5
 print('PASS Mending Chromium: 2 original objects repaired, inventory/reload/history/clock')
 again.close();page.close()
 page,e,d=new_page(browser,make_data('Object Aegis'));bind(page)
 f=page.locator('[data-alchemy-aegis-apply]');assert f.count()==1,(e,d)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="targetItemId"]').select_option('broken')
 for key in ['accessConfirmed','confirmed']:f.locator('input[name="'+key+'"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(160)
 after=saved(page);assert len([x for x in after['journal'] if x.get('calendarAlchemyObjectAegis')])==1,(e,d);t=after['campaignClock']['minute']
 # A separately recorded actual source Skill Workbench receipt is appended *after* Aegis.
 # This is a controlled imported witness, not a user-visible ability to rewrite saved proof.
 page.close();after['journal'].append(witness_attunement)
 page,e,d=new_page(browser,after)
 f=page.locator('[data-alchemy-aegis-test]');assert f.count()==1,(e,d)
 f.evaluate('el=>el.closest("details").open=true');f.locator('select[name="kind"]').select_option('Attunement')
 f.locator('select[name="sourceTestId"]').select_option('source-att');f.locator('input[name="d10"]').fill('1')
 for key in ['targetConfirmed','confirmed']:f.locator('input[name="'+key+'"]').check()
 f.locator('button[type="submit"]').click();page.wait_for_timeout(170)
 after=saved(page);test=[x['calendarAlchemyObjectAegisTest'] for x in after['journal'] if x.get('calendarAlchemyObjectAegisTest')]
 assert len(test)==1,(e,d,'Aegis test receipt missing');assert test[0]['originalLevel']=='CS' and test[0]['finalLevel']=='S'
 assert after['campaignClock']['minute']==t and not e and not d,(e,d)
 again,e2,d2=new_page(browser,after);assert not d2 and not e2,(d2,e2)
 assert len([x for x in saved(again)['journal'] if x.get('calendarAlchemyObjectAegisTest')])==1
 print('PASS Object Aegis Chromium: real test linked, CS→S, AS reduced/reload')
 again.close();page.close();browser.close()
