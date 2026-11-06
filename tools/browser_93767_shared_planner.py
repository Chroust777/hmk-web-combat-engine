"""Interactive Chromium check of the pure v93.767 draft coordinator.
This is a planning harness, NOT the HMK application's integrated commit UI.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
mod=(root/'src/integration/hmk-shared-travel-window-93767.js').read_text(encoding='utf8')
# Browser ESM import from a single JS string via importmap is unnecessary:
# transform named exports into normal declarations; only a self-contained pure helper.
import re
mod=re.sub(r'^export (const|function) ',r'\1 ',mod,flags=re.M)
mod+='\nwindow.SHARED={open:openSharedTravelWindow93767,group:addSharedTravelGroup93767,activity:addSharedTravelActivity93767,budget:sharedTravelWindowBudget93767,verify:validateSharedTravelWindow93767};'
html='''<!doctype html><html lang="cs"><head><meta charset="utf-8"/>
<style>body{background:#ece2ca;color:#2e322c;font:16px Georgia,serif;max-width:820px;margin:40px auto}main{padding:28px;border:2px solid #8c7352;border-radius:12px;background:#f5ebd7}h1{font-size:26px}button{margin:5px;padding:8px 12px;background:#26456d;color:white;border:0;border-radius:5px}article{border:1px solid #bdb092;padding:12px;margin:10px 0}.bad{color:#9b2424;font-weight:bold}.good{color:#225c34}</style></head><body><main><h1>Společné časové okno – izolovaná ověřovací sonda</h1><p>Čas kampaně <strong id="clock">08:00</strong> (žádný zápis). Nejbližší povinný termín: 08:40.</p><label>Plánované minuty <input id="planned" type="number" value="60" min="1" max="10080"></label><button id="open">Založit časové okno</button><section id="view"></section><p id="error" class="bad"></p></main></body></html>'''
script='''const e=document.getElementById.bind(document), C=window.SHARED;let w=null,serial=0;
const run=f=>{try{f();e('error').textContent='';render();}catch(err){e('error').textContent=err.message;}};
function render(){if(!w)return;e('view').innerHTML='<h2>08:00–08:'+String(w.endMinute%60).padStart(2,'0')+' · '+w.minutes+' min</h2>'+ (w.shortened?'<p class="bad">Zkráceno na povinný termín.</p>':'') + w.groups.map(g=>{const b=C.budget(w,g.groupId);return '<article><strong>'+g.name+'</strong> · '+g.memberIds.join(', ')+'<p>Zbývá <b>'+b.remainingMinutes+'</b> min</p>'+g.activities.map(a=>'<p>'+a.kind+' '+a.minutes+' min · '+a.startMinute+'–'+a.endMinute+'</p>').join('')+'</article>'}).join('');}
e('open').onclick=()=>run(()=>{w=C.open({campaignId:'camp',windowId:'one',startMinute:480,requestedMinutes:Number(e('planned').value),maxAllowedMinutes:40,limitMinute:520});});
window.addG=(id,name,members)=>run(()=>{w=C.group(w,{groupId:id,name,memberIds:members});});
window.addA=(groupId,kind,minutes)=>run(()=>{w=C.activity(w,{groupId,activityId:'activity-'+(++serial),kind,minutes});});
window.plannerStatus=()=>({window:w,clock:e('clock').textContent,error:e('error').textContent,geographicFields:document.querySelectorAll('input[name*=Location],input[name*=latitude]').length});
'''
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1080,'height':950})
    errors=[];page.on('pageerror',lambda error: errors.append(str(error)))
    page.set_content(html)
    page.add_script_tag(content=mod)
    page.add_script_tag(content=script)
    page.locator('#open').click()
    assert 'Zkráceno' in page.locator('#view').inner_text()
    page.evaluate('window.addG("g1","Skupina A",["PC A","PC B"])')
    page.evaluate('window.addG("g2","Skupina B",["PC C"])')
    page.evaluate('window.addA("g1","travel",20)')
    page.evaluate('window.addA("g1","forage",10)')
    page.evaluate('window.addA("g2","travel",30)')
    assert 'Zbývá 10 min' in page.locator('#view').inner_text()
    page.evaluate('window.addG("g3","Duplikát",["PC A"])')
    assert 'jiné souběžné skupině' in page.locator('#error').inner_text()
    page.evaluate('window.addA("g2","rest",20)')
    assert 'přesáhla' in page.locator('#error').inner_text()
    status=page.evaluate('window.plannerStatus()')
    assert len(status['window']['groups'])==2
    assert len(status['window']['groups'][0]['activities'])==2
    assert len(status['window']['groups'][1]['activities'])==1
    assert status['clock']=='08:00' and status['geographicFields']==0
    assert not errors,errors
    screenshot=root/'docs/AUDIT_v93.767_shared_planning_probe.png'
    page.screenshot(path=str(screenshot),full_page=True)
    evidence={'test':'isolated planner GUI, NOT integrated production confirmation','windowMinutes':status['window']['minutes'],
      'originalMinutes':status['window']['requestedMinutes'],'groups':status['window']['groups'],
      'clock':status['clock'],'geoFields':status['geographicFields'], 'unhandledErrors':errors,
      'result':'PASS','screenshot':screenshot.name}
    (root/'docs/AUDIT_v93.767_browser_probe.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf8')
    print('PASS Chromium interactive planning probe: 2 groups / 3 activities / medical cap / remaining minutes / duplicate denial / no clock mutation')
    b.close()
