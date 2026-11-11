"""Chromium real page navigation/reload with local source files served via Playwright HTTP route.
No real deployment is reached; this checks origin storage and module resolution via an HTTP URL.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import urllib.parse,mimetypes,json,traceback
root=Path(__file__).resolve().parents[1]
seed='''
window.__stableHTTPSeed839=()=>{const C=undefined;};
'''
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1460,'height':980})
 errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def handler(route):
  url=urllib.parse.urlsplit(route.request.url)
  rel=urllib.parse.unquote(url.path.lstrip('/') or 'index.html')
  if '..' in rel.split('/'):return route.fulfill(status=400,body='Invalid path')
  path=root/rel
  requests.append(rel)
  if not path.is_file():return route.fulfill(status=404,body='Missing '+rel)
  typ=mimetypes.guess_type(rel)[0] or ('application/javascript' if rel.endswith('.js') else 'application/octet-stream')
  return route.fulfill(status=200,body=path.read_bytes(),content_type=typ)
 page.route('http://harn.test/**',handler)
 try:
  page.goto('http://harn.test/index.html',wait_until='load',timeout=90000)
  page.wait_for_timeout(1400)
  print('title',page.title(),'calls',len(requests),'errors',errors[:5],'body',page.locator('#app').inner_text()[:200])
  assert 'v93.839' in page.title()
  checks.append('Current version loaded through HTTP URL with module sources')
  assert 'HMK Keeper' in page.locator('body').inner_text() or 'POSTAVY' in page.locator('body').inner_text().upper()
  checks.append('Real page UI visible after HTTP navigation')
  assert not errors,errors
  checks.append('No startup JavaScript exceptions')
  # No seeded characters needed: the reload itself must preserve the same origin state.
  page.evaluate("localStorage.setItem('hmk-http-839-marker','real-reload-check')")
  page.reload(wait_until='load',timeout=90000)
  assert page.evaluate("localStorage.getItem('hmk-http-839-marker')")=='real-reload-check'
  checks.append('Browser localStorage persists through actual page.reload()')
  assert 'v93.839' in page.title()
  checks.append('Version remains accurate after reload')
  print('PASS',len(checks),checks,'requests',len(requests))
  out=root/'tools/evidence_93839';out.mkdir(parents=True,exist_ok=True)
  (out/'BROWSER_ROUTED_HTTP_RELOAD.json').write_text(json.dumps({'status':'PASS','count':len(checks),'checks':checks,'requestCount':len(requests),'pageErrors':errors,'note':'Simulated local HTTP origin through Playwright route; not GitHub Pages deployment'},ensure_ascii=False,indent=2),'utf8')
 except Exception as err:
  out=root/'tools/evidence_93839';out.mkdir(parents=True,exist_ok=True)
  (out/'BROWSER_ROUTED_HTTP_RELOAD.json').write_text(json.dumps({'status':'BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(err) else 'FAIL','error':str(err),'pageErrors':errors,'requestCount':len(requests)},ensure_ascii=False,indent=2),'utf8')
  if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(err):raise
  print('BLOCKED: HTTP URL navigation prevented by Chromium administrator policy')
 finally:b.close()
