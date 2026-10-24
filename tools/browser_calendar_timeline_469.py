from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
bundle=(root/'hmk-app.bundle.js').read_text(encoding='utf8');prefix='(()=>{const MOD='
assert bundle.startswith(prefix)
modules,end=json.JSONDecoder().raw_decode(bundle[len(prefix):]);
modules['app.js']+='''
window.__hmkUITest469=(db,target='calendar')=>{data=db;selected=db.characters[0].id;calendarLanding=false;calendarCreating=false;calendarUI=null;activeCalendarSection='overview';activeSheetSection='notes';view=target;render()};
'''
instrumented=prefix+json.dumps(modules,ensure_ascii=False,separators=(',',':'))+bundle[len(prefix)+end:]
attrs={k:12 for k in 'str end agl aur emp cre elo rea per wil eye hrg sml dex'.split()};completed={str(i):True for i in range(1,15)}
actor={'id':'a','name':'Arel','kind':'PC','occupation':'Farmer','hmk':{'attributes':attrs,'skills':[],'combatState':{},'creation':{'status':'complete','step':14,'completed':completed,'values':{}}}}
actor['hmk']['coinsPence']=200; actor['hmk']['wealth']=20
actor['hmk']['campaignCashAccounts']={'test':{'format':'hmk-campaign-cash-v1','campaignId':'test','openingPence':200,'openedAtMinute':480,'forkedFromCampaignId':None,
 'purchases':[{'kind':'library-purchase','id':'purchase-1','campaignId':'test','campaignMinute':480,'at':'2026-01-16T10:00:00.000Z','amountPence':30,'inventoryIds':['i1'],'label':'Meč','purchasedItems':[{'inventoryId':'i1','sourceItemId':'sword','quantity':1,'snapshot':{'name':'Meč'}}]}],
 'adjustments':[{'kind':'gm-coin-adjustment','id':'adjust-1','campaignId':'test','campaignMinute':480,'at':'2026-01-17T10:00:00.000Z','deltaPence':5,'reason':'Nález pokladu'}]}}
clock={'format':'hmk-campaign-calendar-v1','label':'Test','campaignId':'test','minute':480,'characterIds':['a'],'trOrigin':{'anchorDay':1,'year':720,'month':5,'day':6},'anchors':[],'events':[{'id':'start','type':'init','minute':480,'reason':'GM confirmation'}], 'plans':[{'id':'arrival','title':'Příjezd posla','note':'původ 200a32bd-18a9-4b40-foo','place':'Brána','characterId':'a','minute':480,'endMinute':480,'destination':'skills','requiresAction':True,'trigger':'start'}]}
notes=[{'id':f'log-{i}','characterId':'a','calendarCampaignId':'test','campaignMinute':480,'title':f'Běžný zápis {i}','body':f'Účetní operace {i}', 'createdAt':f'2026-01-{i:02d}T10:00:00.000Z'} for i in range(1,15)]
# An old, committed combat consequence is a world event and needs an archived deep link.
notes[0]['combatProof']={'actionKind':'shock'};notes[0]['title']='Staré bojové trauma'
# An ordinary chest transfer can be browsed in the notes, not the calendar.
notes[1]['calendarChestTransfer']={'quantity':1,'place':'Truhlice'}
fixture={'schemaVersion':1,'characters':[actor],'items':[],'inventory':[],'trash':[],'journal':notes,'campaignClock':clock,'combatRuntime':None}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.add_style_tag(content=(root/'styles.css').read_text(encoding='utf8'))
 page.add_style_tag(content=(root/'book-templates.css').read_text(encoding='utf8'))
 page.add_script_tag(content=instrumented)
 assert '93.469' in page.locator('.castle-sidebar-footer').inner_text()
 page.evaluate('(d)=>window.__hmkUITest469(d)',fixture)
 assert page.locator('.hc-week-tabs details').count()==2
 text=page.locator('.content-calendar').inner_text()
 assert 'Příjezd posla' in text
 assert 'Běžný zápis 2' not in text, 'private inventory should not appear on calendar'
 assert '200a32bd-18a9' not in text, 'internal audit IDs should not clutter timeline'
 page.locator('[data-cal-day="1"]').click()
 page.locator('[data-cal-hour="8"]').click()
 card=page.locator('.hc-entry--compact'); assert card.count()>=2,card.count()
 assert page.locator('.hc-event-line').count()==2*card.count(),'exact two lines per event'
 assert page.locator('.hc-entry--compact [data-cal-history-id="log-1"]').count()==1, page.locator('.hc-entry--compact').all_inner_texts()
 assert page.locator('.hc-entry--compact:has-text("Běžný zápis 2")').count()==0
 old=page.locator('.hc-entry--compact [data-cal-history-id="log-1"]');assert old.count()==1
 page.screenshot(path=str(root/"calendar_93469_preview.png"),full_page=False)
 old.click()
 assert page.locator('details.journal-log-archive[open]').count()==1,'archive auto-expands for deep links'
 assert page.locator('details.journal-log-archive [data-journal-entry="log-1"].calendar-history-focus').count()==1
 assert page.locator('.journal-log-row').count()==16
 assert page.locator('[data-journal-entry="cash-purchase:purchase-1"]').count()==1
 assert page.locator('[data-journal-entry="cash-adjustment:adjust-1"]').count()==1
 assert page.locator('[data-journal-entry="cash-adjustment:adjust-1"] [data-edit-log]').count()==0
 assert page.locator('.journal-log-row:not(.journal-log-archive .journal-log-row)').count()>=0
 assert 'Archiv · 6 starších záznamů' in page.locator('.journal-log-archive summary').inner_text()
 assert not errors,errors
 print('PASS Chromium: compact GM+world timeline, no private transactions or raw IDs, preserved historic combat link opens archived Notes & Logbook',flush=True)
 browser.close()
