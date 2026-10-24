"""Live Chromium combat write+reload: Eruption, Fumebomb, Weakness and CF.
Exercises production app.js, actual UI, original localStorage atomic boundary.
"""
from pathlib import Path
import subprocess,json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
original=(root/'tools/browser_alchemy_acid_thrown_438.py').read_text().split('with sync_playwright() as p:')[0]
exec(original.replace('v93.438','v93.446'),globals())
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
  # Bind physical vial outside Initiative, then begin from persisted checkpoint.
  before=make_data();before['characters'][1]['hmk']['skills'].append({'id':'b-init','name':'Initiative','ml':65});before['journal']=d['journal'];before['campaignClock']=d['campaignClock']
  page,errors,dialogs=new_page(browser,before)
  bind=page.locator('[data-alchemy-vial-bind]');assert bind.count()==1,(kind,'binding',dialogs,errors)
  bind.evaluate('e=>e.closest("details").open=true')
  bind.locator('select[name="vialId"]').select_option('vial1')
  for fld in ['confirmed','corkConfirmed',('gasConfirmed' if kind=='Fumebomb' else 'liquidConfirmed')]:bind.locator('input[name="'+fld+'"]').check()
  bind.locator('select[name="material"]').select_option('glass')
  bind.locator('button[type="submit"]').click();page.wait_for_timeout(110)
  saved_before=saved(page);assert not errors and not dialogs,(kind,errors,dialogs)
  page.close()
  d['journal']=saved_before['journal'];d['inventory']=saved_before['inventory']
  page,errors,dialogs=new_page(browser,d)
  forms=page.locator('[data-alchemy-area-thrown]');assert forms.count()==1,(kind,'area form',errors,dialogs,page.locator('#app').inner_text()[-1500:])
  form=forms.first;form.evaluate('e=>e.closest("details").open=true')
  for fld,value in [('aimX','15'),('aimY','0'),('centerX','15'),('centerY','0'),('distanceFt','15'),('d100','43')]:form.locator('input[name="'+fld+'"]').fill(value)
  target_rolls={'Fumebomb':{'b':{'shockD100':70,'origin':'manual'}},'Weakness':{'b':{}},'Eruption':{'b':{'shockD100':35}}}[kind]
  form.locator('textarea[name="rollsByTarget"]').fill(json.dumps(target_rolls))
  if kind=='Eruption':
   form.locator('input[name="impactD4"]').fill('1')
   form.locator('textarea[name="threatenedIds"]').fill('["b"]')
   form.locator('textarea[name="moraleByOpponent"]').fill('{"b":{"initiativeD100":29,"origin":"manual","aberrance":0}}')
   form.locator('input[name="threatGeometryConfirmed"]').check()
  form.locator('input[name="confirmed"]').check()
  pre=saved(page);form.locator('button[type="submit"]').click();page.wait_for_timeout(275)
  post=saved(page);rows=[x for x in post['journal'] if x.get('calendarAlchemyAreaThrown')]
  assert len(rows)==1,(kind,'no area commit',dialogs,errors,page.locator('#app').inner_text()[-1000:])
  assert all(x['id']!='vial1' for x in post['inventory']),(kind,'vial not consumed')
  assert post['campaignClock']['minute']==pre['campaignClock']['minute'],(kind,'GM time moved')
  assert post['combatRuntime']['sequence'].get('pendingEndTurnAction') is not None or post['combatRuntime']['sequence']['cursor']!=0 or not post['combatRuntime']['sequence']['active'],(kind,'turn not consumed')
  if kind=='Weakness':
   b0=next(c for c in pre['characters'] if c['id']=='b')
   b1=next(c for c in post['characters'] if c['id']=='b')
   assert b1['hmk']['attributes']['str'] < b0['hmk']['attributes']['str'],('Weakness did not reduce live STR',b0,b1)
   losses=b1['hmk'].get('alchemyWeaknessLosses',[])
   assert len(losses)==1 and losses[0]['strengthBefore']==b0['hmk']['attributes']['str'] and losses[0]['strengthAfter']==b1['hmk']['attributes']['str'],('Weakness overlay missing',losses)
  if kind=='Fumebomb':
   p=rows[0]['calendarAlchemyAreaThrown']
   assert p['smoke']['blocksLOS'] and p['smoke']['originRound']==p['sourceRound'],('Smoke source absent',p)
   # Independently rehydrate the saved journal into the original LOS consumer.
   los_node=r"""
const fs=require('fs');const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return old(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {assertFumebombLineOfSight}=require('./src/integration/hmk-alchemy-area-los.js');
const d=JSON.parse(fs.readFileSync(0,'utf8'));let blocked=false;
try{assertFumebombLineOfSight({journal:d.journal,sequence:d.combatRuntime.sequence,campaignId:d.campaignClock.campaignId,fromId:'a',toId:'b'})}catch(e){blocked=/blokovaná LOS/.test(e.message);if(!blocked)throw e}
if(!blocked)throw Error('Saved smoke failed to occlude missile LOS');
const later={...d.combatRuntime.sequence,round:d.combatRuntime.sequence.round+1};
if(!assertFumebombLineOfSight({journal:d.journal,sequence:later,campaignId:d.campaignClock.campaignId,fromId:'a',toId:'b'}).clear)throw Error('Smoke did not clear');
"""
   # Campaign identifier is the canonical journal campaign ID, not a label.
   post_for_los=dict(post);post_for_los['campaignClock']=dict(post['campaignClock'],campaignId=rows[0]['calendarCampaignId'])
   subprocess.run(['node','-e',los_node],cwd=root,input=json.dumps(post_for_los),text=True,check=True,capture_output=True)

  if kind=='Eruption':
   p=rows[0]['calendarAlchemyAreaThrown']
   assert len(p['affectedIds'])==1 and 'b' in p['threatenedOpponentIds'],('Eruption AoE and Morale absent',p)
  assert not errors and not dialogs,(kind,errors,dialogs)
  fresh,errors2,dialogs2=new_page(browser,post)
  assert not errors2 and not dialogs2 and 'v93.446' in fresh.locator('#app').inner_text(),(kind,'reopen',errors2,dialogs2)
  assert saved(fresh)['journal'][-1]['calendarAlchemyAreaThrown']==rows[0]['calendarAlchemyAreaThrown'],(kind,'history altered')
  print('PASS Chromium Area Combat '+kind+': attack, inventory, Combat State, rehydrate, history, GM time',flush=True)
  fresh.close();page.close()
 browser.close()
