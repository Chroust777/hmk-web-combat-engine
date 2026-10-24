"""Chromium: actual index.html markup, production bundle, visible footer/version.
The restricted runner does not permit file:// or local HTTP navigation, so the
unchanged local index markup is set as a document and the exact production
bundle bytes are inserted as a script. This is not a network smoke test.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
app=(root/'app.js').read_text(encoding='utf-8')
expected='93.453'
assert re.search(r"const APP_VERSION\s*=\s*['\"]"+expected+r"['\"]",app)
assert f'<title>HMK Keeper’s Ledger · v{expected}</title>' in html
assert f'hmk-app.bundle.js?v={expected}-calendar' in html
assert '93.439' not in html
for css in ['styles.css','library.css','skill-workbench.css','book-templates.css']:
 assert f'{css}?v={expected}-calendar' in html
html=re.sub(r'<script defer src="\./hmk-app\.bundle\.js\?v=[^>]+></script>','',html,count=1)
assert 'script defer src' not in html
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
  args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 page=browser.new_page(viewport={'width':1280,'height':800});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 assert page.title()==f'HMK Keeper’s Ledger · v{expected}'
 page.add_script_tag(content=(root/'hmk-app.bundle.js').read_text(encoding='utf-8'))
 page.locator('#app .shell').wait_for(timeout=10000)
 footer=page.locator('footer').first.inner_text()
 assert f'v{expected}' in footer,footer
 assert not errors,errors
 assert page.evaluate('window.__hmkBundled') is True
 assert page.locator('[data-nav="calendar"]').count()>0
 print(f'PASS Chromium v{expected}: genuine index markup, injected production bundle, on-screen footer, no JS errors',flush=True)
 page.close();browser.close()
