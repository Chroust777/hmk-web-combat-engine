from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
modules,end=json.JSONDecoder().raw_decode(bundle[len(prefix):]);assert bundle.startswith(prefix)
modules['app.js']+='''
window.__hmkUITest468=(db)=>{data=db;selected=db.characters[0].id;calendarLanding=false;calendarCreating=false;calendarUI=null;activeCalendarSection='overview';view='calendar';render()};
window.__hmkState468=()=>({view,selected,calendarSection:activeCalendarSection,calendarLanding,calendarUI,entries:uiNavigation.length()});
'''
instrumented=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(prefix)+end:]
attrs={k:12 for k in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()}
completed={str(i):True for i in range(1,15)}
actor={'id':'a','name':'Arel','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[],'combatState':{},'creation':{'status':'complete','step':14,'completed':completed,'values':{}}}}
clock={'format':'hmk-campaign-calendar-v1','label':'Test','campaignId':'test','minute':480,'characterIds':['a'],'trOrigin':{'anchorDay':1,'year':720,'month':5,'day':6},'anchors':[],'events':[{'id':'start','type':'init','minute':480,'reason':'GM confirmation'}]}
fixture={'schemaVersion':1,'characters':[actor],'items':[],'inventory':[],'trash':[],'journal':[],'campaignClock':clock,'combatRuntime':None}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.add_style_tag(content=(root/'styles.css').read_text(encoding='utf8'))
 page.add_style_tag(content=(root/'book-templates.css').read_text(encoding='utf8'))
 page.add_script_tag(content=instrumented)
 assert '93.468' in page.locator('.castle-sidebar-footer').inner_text()
 assert page.locator('[data-ui-history="back"]').is_disabled()
 page.evaluate('(d)=>window.__hmkUITest468(d)',fixture)
 geom=page.evaluate('''()=>{const nav=document.querySelector('.nav').getBoundingClientRect();const back=document.querySelector('.hmk-global-history').getBoundingClientRect();const main=document.querySelector('.content').getBoundingClientRect();return {navRight:nav.right,historyLeft:back.left,historyRight:back.right,mainRight:main.right}}''')
 assert geom['historyLeft']>=geom['navRight']+6 and geom['historyRight']<geom['mainRight'],geom
 assert page.locator('.hc-calendar-tabs button').count()==5
 assert not page.locator('.hc-title h2').count()
 assert page.locator('.hc-month-guide .hc-month-guide-trigger').count()==1
 assert page.locator('.hc-month-guide-list li').count()==12
 assert page.locator('.hc-month-guide-list li.hc-month-current').count()==1
 assert page.locator('.hc-calendar h3:has-text("Tuzyn Reckoning · přiřazení skutečného data")').count()==0
 assert page.locator('.hc-provision-grid').count()==0,'duplicated food summary in overview'
 assert page.locator('[data-ui-history="back"]').is_enabled()
 page.locator('.hc-calendar-tabs [data-calendar-section="travel"]').click()
 assert page.evaluate('window.__hmkState468()')['calendarSection']=='travel'
 page.locator('.hc-calendar-tabs [data-calendar-section="provisions"]').click()
 assert page.locator('.hc-provision-grid').count()>0
 page.locator('[data-ui-history="back"]').click()
 assert page.evaluate('window.__hmkState468()')['calendarSection']=='travel'
 page.locator('[data-ui-history="back"]').click()
 assert page.evaluate('window.__hmkState468()')['calendarSection']=='overview'
 page.locator('[data-ui-history="forward"]').click()
 assert page.evaluate('window.__hmkState468()')['calendarSection']=='travel'
 page.locator('.hc-calendar-tabs [data-calendar-section="craft"]').click()
 assert page.evaluate('window.__hmkState468()')['calendarSection']=='craft'
 assert page.locator('[data-ui-history="forward"]').is_disabled(),'new navigation should replace forward branch'
 page.locator('.hc-calendar-tabs [data-calendar-section="overview"]').click()
 page.locator('.hc-month-guide .hc-month-guide-trigger').hover()
 assert page.locator('.hc-month-guide-list').is_visible(),'month directory on hover'
 names=page.locator('.hc-month-guide-list li').all_text_contents()
 assert names[0]=='Núzyæl' and names[-1]=='Morgát',(names[0],names[-1])
 page.evaluate('''()=>{document.querySelector('.content').insertAdjacentHTML('beforeend','<div style="height:2300px"></div>');window.scrollTo(0,1000)}''')
 page.wait_for_timeout(100)
 assert page.evaluate('window.scrollY')>700,'page must scroll for sticky controls test'
 bounds=page.locator('.hmk-global-history').bounding_box()
 assert bounds is not None and 0<=bounds['y']<80,('History not fixed on scroll',bounds)
 page.locator('[data-nav="library"]').click()
 assert page.evaluate('window.__hmkState468()')['view']=='library'
 page.locator('[data-ui-history="back"]').click()
 assert page.evaluate('window.__hmkState468()')['view']=='calendar'
 page.wait_for_timeout(100)
 assert page.locator('.hc-calendar-tabs').count()==1,'calendar restored with its previous tabs'
 page.set_viewport_size({'width':950,'height':800});page.wait_for_timeout(50)
 rect=page.locator('.hmk-global-history').bounding_box()
 assert rect is not None and rect['x']+rect['width']<950,'global controls fit the stacked layout'
 page.set_viewport_size({'width':600,'height':760});page.wait_for_timeout(50)
 rect=page.locator('.hmk-global-history').bounding_box()
 assert rect is not None and rect['x']>=0 and rect['y']+rect['height']<=761,'mobile controls remain visible'
 assert not errors,errors
 print('PASS Chromium: fixed global back/forward, restored calendar subtabs, forwards invalidated on new branch, 12-month hover, hidden duplicate panels',flush=True)
 browser.close()
