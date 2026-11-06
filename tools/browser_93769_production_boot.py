from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 ctx=browser.new_context(viewport={'width':1280,'height':900})
 def handler(route):
  path=unquote(urlsplit(route.request.url).path).lstrip('/') or 'index.html'
  f=(root/path).resolve()
  if not f.is_relative_to(root) or not f.is_file():route.fulfill(status=404,body='Not found');return
  typ='application/javascript' if path.endswith('.js') else 'text/css' if path.endswith('.css') else 'text/html' if path.endswith('.html') else 'application/octet-stream'
  route.fulfill(status=200,body=f.read_bytes(),content_type=typ)
 ctx.route('https://ledger-test.invalid/**',handler)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 response=page.goto((root/'index.html').as_uri(),wait_until='domcontentloaded',timeout=25000)
 page.locator('.shell').wait_for(timeout=35000)
 print('REAL ESM BOOT',response.status, 'PAGE',page.title(),'SHELL',page.locator('.shell').count(),'ERRORS',errors,flush=True)
 assert response.ok and not errors
 page.reload(wait_until='domcontentloaded',timeout=25000)
 page.locator('.shell').wait_for(timeout=35000)
 print('REAL ESM RELOAD','SHELL',page.locator('.shell').count(),'ERRORS',errors,flush=True)
 assert not errors
 browser.close()
