"""Requires the isolated server started by node tools/test_chat_94064.mjs --serve."""
import sys
from playwright.sync_api import sync_playwright
url=sys.argv[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def user(name,mobile=False):
  c=b.new_context(viewport={'width':375 if mobile else 1300,'height':800})
  p=c.new_page();p.goto(url);p.fill('#key','test-'+name);p.locator('#login button').click();p.wait_for_selector('#room');return p
 gm=user('gm');a=user('a',True)
 assert a.evaluate('document.documentElement.scrollWidth<=innerWidth')
 def lost(rt):
  if rt.request.method=='POST':rt.fetch();rt.abort()
  else:rt.continue_()
 a.route('**/messages',lost)
 a.fill('#draft','Endurance – d100: 42');a.click('#send');a.wait_for_function("document.querySelector('#draft').readOnly && !document.querySelector('#send').disabled")
 a.unroute('**/messages');a.reload();a.wait_for_selector('#room');assert a.input_value('#draft')=='Endurance – d100: 42'
 a.click('#send');gm.wait_for_selector('li.player:has-text("Endurance – d100: 42")',timeout=12000)
 assert gm.locator('li:has-text("Endurance – d100: 42")').count()==1
 gm.fill('#draft','Potvrzeno GM');gm.click('#send')
 a.wait_for_selector('li.gm:has-text("Potvrzeno GM")',timeout=12000)
 assert not a.locator('li:has-text("Potvrzeno GM") button').count()
 a.once('dialog',lambda d:d.accept('Endurance – oprava'));a.locator('li:has-text("Endurance – d100: 42") button').first.click()
 a.wait_for_selector('li:has-text("Endurance – oprava")')
 a.once('dialog',lambda d:d.accept());a.locator('li:has-text("Endurance – oprava") button').last.click()
 a.locator('li:has-text("Endurance – oprava")').wait_for(state='detached')
 gm.click('#archive');gm.wait_for_selector('#live');assert 0<gm.locator('li').count()<50
 print('PASS two Chromium identities, mobile width, role colors/classes, polling, edit, delete, archive, retry after accepted POST with lost reply and reload.')
