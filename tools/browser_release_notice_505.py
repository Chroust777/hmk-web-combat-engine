"""Chromium regression for release notice with mocked fetch; no network or campaign data."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
index = (root / 'index.html').read_text(encoding='utf-8')
script = next(s for s in re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>', index)
              if 'hmk_release_check' in s)
setup_js = """
window.__remoteVersion='93.505';
window.setInterval=(fn)=>{window.__testPoll=fn;};
window.fetch=async()=>({ok:true,text:async()=>'<title>HMK Keeper’s Ledger · v'+window.__remoteVersion+'</title>'});
"""
fixture = ('<!doctype html><html><head><title>HMK Keeper’s Ledger · v93.505</title></head>'
           '<body><script>'+setup_js+'</script><script>'+script+'</script></body></html>')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.set_content(fixture,wait_until='load')
    assert page.evaluate('document.title')=='HMK Keeper’s Ledger · v93.505'
    for _ in range(4):page.evaluate('async()=>await window.__testPoll()')
    assert page.locator('#hmk-release-notice').count()==0, 'Same release displayed a false update'
    assert page.evaluate('!!window.__hmkOutdatedBuild') is False
    page.evaluate("window.__remoteVersion='93.506'")
    page.evaluate('async()=>await window.__testPoll()')
    assert page.locator('#hmk-release-notice').count()==1, 'Real update should display notice'
    for _ in range(3):page.evaluate('async()=>await window.__testPoll()')
    assert page.locator('#hmk-release-notice').count()==1,'Duplicate update notice'
    assert '93.506' in page.locator('#hmk-release-notice').inner_text()
    print('PASS Chromium: current 93.505 no alert; newer 93.506 alerts once, no duplicates')
    browser.close()
