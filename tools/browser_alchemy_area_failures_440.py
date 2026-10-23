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
  for scenario in ['CF','missing-die']:
   d=fixture_for(kind)
   before=make_data();before['characters'][1]['hmk']['skills'].append({'id':'b-init','name':'Initiative','ml':65});before['journal']=d['journal'];before['campaignClock']=d['campaignClock']
   page,errors,dialogs=new_page(browser,before)
   bind=page.locator('[data-alchemy-vial-bind]');assert bind.count()==1,(kind,'bind')
   bind.evaluate('e=>e.closest("details").open=true')
   bind.locator('select[name="vialId"]').select_option('vial1')
   for fld in ['confirmed','corkConfirmed',('gasConfirmed' if kind=='Fumebomb' else 'liquidConfirmed')]:bind.locator('input[name="'+fld+'"]').check()
   bind.locator('select[name="material"]').select_option('glass')
   bind.locator('button[type="submit"]').click();page.wait_for_timeout(100)
   saved_before=saved(page);assert not errors and not dialogs,(kind,errors,dialogs)
   page.close();d['journal']=saved_before['journal'];d['inventory']=saved_before['inventory']
   page,errors,dialogs=new_page(browser,d)
   form=page.locator('[data-alchemy-area-thrown]').first
   form.evaluate('e=>e.closest("details").open=true')
   for fld,value in [('aimX','15'),('aimY','0'),('centerX','15'),('centerY','0'),('distanceFt','15'),('d100','95' if scenario=='CF' else '43')]:form.locator('input[name="'+fld+'"]').fill(value)
   if scenario=='missing-die' and kind=='Eruption':
    form.locator('input[name="impactD4"]').fill('1')
    form.locator('textarea[name="threatenedIds"]').fill('["b"]')
    form.locator('textarea[name="moraleByOpponent"]').fill('{"b":{"initiativeD100":29,"origin":"manual","aberrance":0}}')
    form.locator('input[name="threatGeometryConfirmed"]').check()
   form.locator('textarea[name="rollsByTarget"]').fill('{}')
   form.locator('input[name="confirmed"]').check()
   pre=saved(page)
   form.locator('button[type="submit"]').click();page.wait_for_timeout(190)
   post=saved(page)
   if scenario=='CF':
    rows=[x for x in post['journal'] if x.get('calendarAlchemyAreaThrown')]
    assert len(rows)==1,(kind,scenario,'no committed CF',dialogs,errors)
    assert any(x['id']=='vial1' for x in post['inventory']),(kind,'CF removed vial')
    assert rows[0]['calendarAlchemyAreaThrown']['throw']['discharged']==False,(kind,'CF discharged')
    assert post['combatRuntime']['sequence']!=pre['combatRuntime']['sequence'],(kind,'CF did not use action')
    assert not errors and not dialogs,(kind,scenario,errors,dialogs)
    fresh,more,moredialogs=new_page(browser,post)
    assert not more and not moredialogs,(kind,'CF reload',more,moredialogs)
    assert saved(fresh)['journal'][-1]['calendarAlchemyAreaThrown']==rows[0]['calendarAlchemyAreaThrown'],(kind,'CF history')
    fresh.close()
   else:
    assert len([x for x in post['journal'] if x.get('calendarAlchemyAreaThrown')])==0,(kind,'partial journal')
    assert pre['inventory']==post['inventory'],(kind,'partially consumed vial')
    assert pre['combatRuntime']==post['combatRuntime'],(kind,'partially consumed turn')
    assert pre['characters']==post['characters'],(kind,'partially changed character')
    assert dialogs and 'Alchemy Area' in dialogs[-1],(kind,scenario,'no error surfaced',dialogs,errors)
   print('PASS Chromium '+kind+' '+scenario+': all-or-nothing, action, inventory, history',flush=True)
   page.close()
 browser.close()
