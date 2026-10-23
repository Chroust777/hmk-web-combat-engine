"""Live Chromium combat write+reload: Eruption, Fumebomb, Weakness and CF.
Exercises production app.js, actual UI, original localStorage atomic boundary.
"""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
original=(root/'tools/browser_alchemy_acid_thrown_438.py').read_text().split('with sync_playwright() as p:')[0]
exec(original.replace('v93.438','v93.439'),globals())
node_tmpl=re.search(r"node=r'''\n(.*?)\n'''",(root/'tools/browser_alchemy_decay_417.py').read_text(),re.S).group(1)
node_setup=r'''
const fs=require('fs'),path=require('path');let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createEncounterSequence,startEncounterTurn}=require('./src/integration/encounter-turn-sequence.js');const {initialCombatState}=require('./src/integration/persistent-combat-state.js');
const states={a:initialCombatState(),b:initialCombatState()};
let seq=createEncounterSequence({roster:[{id:'a',name:'Alchemist',isPC:true,initiativeML:85,awarenessEML:60},{id:'b',name:'Target',isPC:true,initiativeML:55,awarenessEML:45}],round:1,timelineId:'alchemy-area-live-440'});
seq.spatialUnits=[{id:'a',x:0,y:0},{id:'b',x:15,y:0}];
seq=startEncounterTurn(seq,states);
process.stdout.write(JSON.stringify({seq,states}));
'''
init=json.loads(subprocess.check_output(['node','-e',node_setup],cwd=root,text=True))
def fixture_for(kind):
 node=node_tmpl.replace("elixirName:'Healing'",f"elixirName:'{kind}'").replace('gmModifier:15','gmModifier:start.sunsignModifier').replace('gmModifiers:[15]','gmModifiers:[start.sunsignModifier]')
 f=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True))
 d=make_data();d['characters'][1]['hmk']['skills'].append({'id':'b-init','name':'Initiative','ml':65});d['journal']=f['rows'];d['campaignClock']['minute']=f['finished'];d['campaignClock']['label']=kind
 d['campaignClock']['events'][-1]['minute']=f['finished']
 for c in d['characters']:
  c['hmk']['combatState']=init['states'][c['id']]
 d['combatRuntime']={'version':1,'timelineId':'alchemy-area-live-440', 'participants':['a','b'],
  'sequence':init['seq'],'clock':{'round':1,'actorId':'a'},'inClosePairs':[]}
 return d
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for kind in ['Fumebomb','Weakness','Eruption']:
  d=fixture_for(kind)
  before=make_data();before['characters'][1]['hmk']['skills'].append({'id':'b-init','name':'Initiative','ml':65});before['journal']=d['journal'];before['campaignClock']=d['campaignClock']
  page,errors,dialogs=new_page(browser,before)
  bind=page.locator('[data-alchemy-vial-bind]');bind.evaluate('e=>e.closest("details").open=true')
  bind.locator('select[name="vialId"]').select_option('vial1')
  for fld in ['confirmed','corkConfirmed',('gasConfirmed' if kind=='Fumebomb' else 'liquidConfirmed')]:bind.locator('input[name="'+fld+'"]').check()
  bind.locator('select[name="material"]').select_option('glass')
  bind.locator('button[type="submit"]').click();page.wait_for_timeout(100)
  d['journal']=saved(page)['journal'];d['inventory']=saved(page)['inventory'];page.close()
  page,errors,dialogs=new_page(browser,d)
  form=page.locator('[data-alchemy-area-thrown]').first;form.evaluate('e=>e.closest("details").open=true')
  for fld,value in [('aimX','15'),('aimY','0'),('centerX','15'),('centerY','0'),('distanceFt','15'),('d100','43')]:form.locator('input[name="'+fld+'"]').fill(value)
  target_rolls={'Fumebomb':{'b':{'shockD100':70,'origin':'manual'}},'Weakness':{'b':{}},'Eruption':{'b':{'shockD100':35}}}[kind]
  form.locator('textarea[name="rollsByTarget"]').fill(json.dumps(target_rolls))
  if kind=='Eruption':
   form.locator('input[name="impactD4"]').fill('1')
   form.locator('textarea[name="threatenedIds"]').fill('["b"]')
   form.locator('textarea[name="moraleByOpponent"]').fill('{"b":{"initiativeD100":29,"origin":"manual","aberrance":0}}')
   form.locator('input[name="threatGeometryConfirmed"]').check()
  form.locator('input[name="confirmed"]').check()
  pre=saved(page)
  page.evaluate('''() => { const s=window.localStorage;const was=s.setItem.bind(s);s.setItem=(k,v)=>{if(k==='hmk-keepers-ledger-v1')throw Error('INJECTED WRITE FAILURE');return was(k,v)};}''')
  form.locator('button[type="submit"]').click();page.wait_for_timeout(175)
  post=saved(page)
  assert post==pre,(kind,'partial state save',post)
  assert dialogs and 'Alchemy Area' in dialogs[-1],(kind,'no failure feedback',dialogs,errors)
  assert not errors,(kind,errors)
  print('PASS Chromium '+kind+' injected save failure: campaign, turn, victim, vial and journal unchanged',flush=True)
  page.close()
 browser.close()
