"""Real Chromium: thrown Acid inside guided Initiative must spend actual Attack turn and write through combat authority."""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
original=(root/'tools/browser_alchemy_acid_thrown_438.py').read_text()
exec(original.split('with sync_playwright() as p:')[0], globals())
prep=r'''
const fs=require('fs'),path=require('path');let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.startsWith(path.join(root,'src')+path.sep))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createEncounterSequence,startEncounterTurn}=require('./src/integration/encounter-turn-sequence.js');const {initialCombatState}=require('./src/integration/persistent-combat-state.js');
const states={a:initialCombatState(),b:initialCombatState()};
let seq=createEncounterSequence({roster:[{id:'a',name:'Alchemist',isPC:true,initiativeML:85,awarenessEML:60},{id:'b',name:'Target',isPC:true,initiativeML:55,awarenessEML:45}],round:1,timelineId:'acid-438-combat'});
seq=startEncounterTurn(seq,states);
process.stdout.write(JSON.stringify({seq,states}));
'''
init=json.loads(subprocess.check_output(['node','-e',prep],cwd=root,text=True))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
 for case in ['hit','cf']:
  fx=make_data()

  page,errors,dialogs=new_page(browser,fx)
  bind=page.locator('[data-alchemy-vial-bind]');assert bind.count()==1,(case,'binding',errors,dialogs)
  bind.evaluate('el=>el.closest("details").open=true')
  bind.locator('select[name="vialId"]').select_option('vial1')
  for fld in ['confirmed','liquidConfirmed','corkConfirmed']:bind.locator('input[name="'+fld+'"]').check()
  bind.locator('select[name="material"]').select_option('glass')
  bind.locator('button[type="submit"]').click();page.wait_for_timeout(200)
  fx=saved(page);page.close()
  for c in fx['characters']:c['hmk']['combatState']=init['states'][c['id']]
  fx['combatRuntime']={'version':1,'timelineId':'acid-438-combat','participants':['a','b'], 'sequence':init['seq'],'clock':{'round':1,'actorId':'a'},'inClosePairs':[]}
  page,errors,dialogs=new_page(browser,fx)
  f=page.locator('[data-alchemy-acid-thrown]');assert f.count()==1,(case,'form',errors,dialogs)
  f.evaluate('el=>el.closest("details").open=true');f.locator('input[name="distanceFt"]').fill('20')
  f.locator('input[name="d100"]').fill('43' if case=='hit' else '100')
  if case=='hit':
   f.locator('select[name="targetKind"]').select_option('flesh');f.locator('select[name="targetId"]').select_option('b')
   f.locator('select[name="location"]').select_option('sk');f.locator('input[name="humanConfirmed"]').check()
   f.locator('input[name="zoneD"]').fill('1');f.locator('input[name="locationD10"]').fill('1')
   f.locator('input[name="contactD10"]').fill('1');f.locator('input[name="shockD100"]').fill('41')
  for fld in ['firm','geometry','confirmed']:f.locator('input[name="'+fld+'"]').check()
  f.locator('button[type="submit"]').click();page.wait_for_timeout(300)
  saved_data=saved(page);throws=[r for r in saved_data['journal'] if r.get('calendarAlchemyAcidThrown')]
  assert len(throws)==1,(case,'missing thrown',dialogs,errors,page.locator('#app').inner_text()[-1000:])
  proof=throws[0];assert proof['combatProof']['actionKind']=='thrown-acid',proof
  seq=saved_data['combatRuntime']['sequence']
  assert seq.get('pendingEndTurnAction') is not None or seq['cursor']!=0 or not seq['active'],(case,'did not spend turn',seq)
  assert (not any(i['id']=='vial1' for i in saved_data['inventory']))==(case=='hit')
  assert saved_data['campaignClock']['minute']==fx['campaignClock']['minute']
  assert not errors and not dialogs,(case,errors,dialogs)
  print('PASS Chromium combat acid thrown',case,'Attack turn + combatProof + shatter/CF + GM minute',flush=True)
  page.close()
 browser.close()
