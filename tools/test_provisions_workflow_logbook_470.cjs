const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let count=0;function ok(v,msg){assert.ok(v,msg);count++}
(async()=>{
 const v=await import('file://'+path.join(root,'src/integration/hmk-logbook-visibility.js'));
 const note={id:'n1',characterId:'A',title:'Note',body:'Private',createdAt:'2026-01-01'};
 const proof={id:'p1',characterId:'A',createdAt:'2026-01-01',calendarNutritionDay:{foodShortfall:1}};
 const receipt={id:'cash-purchase:1',characterId:'A',cashReceipt:true};
 ok(v.isPersonalNote(note),'ordinary note can be deleted');
 ok(!v.isPersonalNote(proof),'nutrition receipt cannot be deleted');
 ok(!v.isPersonalNote(receipt),'cash receipt cannot be deleted');
 ok(!v.isPersonalNote({...note,combatProof:{}}),'combat proof cannot be deleted');
 ok(!v.isPersonalNote({...note,skillTestProof:{}}),'skill proof cannot be deleted');
 ok(v.isPersonalNote({...note,updatedAt:'2026-01-02'}),'edited ordinary note deletable');
 const data={journal:[note,proof],logbookHiddenEntries:{}};
 ok(v.hiddenLogbookIds(data,'A').size===0,'no hidden initially');
 v.logbookHideEntry(data,'A','p1');
 ok(data.journal.length===2,'hide does not delete authoritative journal');
 ok(v.hiddenLogbookIds(data,'A').has('p1'),'hidden by ID');
 ok(v.visibleLogbookEntries([note,proof],v.hiddenLogbookIds(data,'A')).length===1,'only personal display filtered');
 v.logbookHideEntry(data,'A','p1');
 ok(data.logbookHiddenEntries.A.length===1,'no duplicate');
 ok(v.hiddenLogbookIds(data,'B').size===0,'hidden is per actor');
 v.logbookRestoreEntry(data,'A','p1');
 ok(v.visibleLogbookEntries([note,proof],v.hiddenLogbookIds(data,'A')).length===2,'restore');
 ok(v.validateLogbookVisibility(data),'valid hidden ledger');
 for(const bad of [{logbookHiddenEntries:{A:['x','x']}},{logbookHiddenEntries:{A:[12]}},{logbookHiddenEntries:[]},{logbookHiddenEntries:{A:'x'}}]){
  assert.throws(()=>v.validateLogbookVisibility(bad));count++;
 }
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'book-templates.css'),'utf8');
 for(const key of ['function provisionGuideHTML(participants)','data-provision-actor','data-provision-route','data-provision-go="shop"','data-provision-go="forage"','data-provision-go="evidence"','provisionCardHTML(actor,true)','hc-provision-rulebook','visibleLogbookEntries(logs,hidden)','data-restore-log','data-hide-log','isPersonalNote(row)','validateLogbookVisibility(d)','const APP_VERSION=\'93.472\''])ok(app.includes(key),'app includes '+key);
 ok(!app.includes('if(ask(\'Smazat zápis?\'))mutate(()=>data.journal=data.journal.filter(x=>x.id!==t.dataset.deleteLog))'),'unsafe generic log deletion removed');
 ok(app.includes('if(!isPersonalNote(target))throw Error'),'immutable records cannot be edited in mutation');
 ok(app.includes('if(!isPersonalNote(x))return alert'),'immutable records cannot be edited by dialog');
 ok(app.includes('data-provision-go="calendar"'),'character links to provision guide');
 ok(app.includes('provisionGuideRoute=button.dataset.provisionRoute;render()'),'choice only changes UI');
 ok(app.includes('view=\'library\''),'purchase navigates to existing library');
 ok(app.includes('activeCalendarSection=\'travel\''),'foraging uses existing travel');
 ok(!app.includes('data-nutrition-policy-form><fieldset')===false,'original nutrition form kept');
 ok(app.includes('data-malnutrition-course'),'starvation original writer kept');
 ok(app.includes('calendarNutritionDay'),'original nutrition receipts kept');
 for(const cls of ['.hc-provision-indicators','.hc-provision-choices','.hc-provision-rulebook','.journal-hidden-records'])ok(css.includes(cls),'CSS '+cls);
 console.log('PASS',count,'checks, nutrition guided workflow and immutable logbook visibility');
})().catch(err=>{console.error(err.stack);process.exitCode=1});
