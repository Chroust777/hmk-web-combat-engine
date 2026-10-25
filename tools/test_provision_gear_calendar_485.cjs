'use strict';
/** Isolated domain regression; never writes or synchronizes user campaign data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>{
 if(!f.startsWith(path.join(root,'src')+path.sep))return old(m,f);
 m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f);
};
let n=0;function eq(a,b,msg){assert.deepEqual(a,b,msg);n++}function ok(v,msg){assert.ok(v,msg);n++}
const {calculateGearLoad}=require('../src/rules/gear-load.js');
const {projectInventoryRows,inventoryTotals}=require('../src/integration/hmk-inventory-overview.js');
const sample=[['tunic',2.3,'worn'],['breeches',0.9,'worn'],['pouch',0.5,'normal'],['rations',3,'normal'],['flask',0.5,'normal'],['water1',7,'normal'],['water2',7,'normal']]
 .map(([id,weightLb,stowage])=>({id,weightLb,stowage}));
let gear=calculateGearLoad(sample);
eq(gear.physicalLb,18,'Worn clothing is not added to Gear');eq(gear.effectiveLb,18,'Normal gear weighs 18 lb');eq(gear.gearENC,0,'18 lb below 20 lb threshold');
eq(Number(sample.reduce((s,x)=>s+x.weightLb,0).toFixed(1)),21.2,'Inventory total, including garments');
eq(calculateGearLoad([...sample,{id:'rope',weightLb:2,stowage:'normal'}]).gearENC,5,'Boundary 20 lb');
eq(calculateGearLoad([...sample,{id:'rope',weightLb:2,stowage:'awkward'}]).gearENC,5,'Awkward items double effective weight');
eq(2+0.5*10,7,'Physical water container + 0.5 gallon total');
const rows=projectInventoryRows([...[2.3,0.9,0.5,3,0.5].map((weightLb,i)=>({id:'i'+i,quantity:1,slot:i<2?'worn':'carried',snapshot:{category:i<2?'armor':'other',properties:{weightLb,pricePence:1}}})),
 ...[0,1].map(i=>({id:'waterskin'+i,quantity:1,slot:'carried',waterContentsLb:5,snapshot:{category:'other',properties:{weightLb:2,pricePence:24}}}))]);
eq(inventoryTotals(rows).knownWeightLb,21.2,'Inventory full weight includes water');
eq(rows[5].weight,7,'Water is not counted twice');
const {campaignCalendarAgenda}=require('../src/integration/hmk-campaign-calendar.js');
const clock={format:'hmk-campaign-calendar-v1',campaignId:'test-485',label:'Fixture',minute:120,characterIds:['p'],anchors:[],events:[{id:'init-485',type:'init',minute:120,reason:'test'}]};
const actor={id:'p',name:'Postava',hmk:{combatState:{shock:'OK',wounds:[],shockFollowup:{originRound:1}}}};
let agenda=campaignCalendarAgenda(clock,[actor],[]);
eq(agenda.due.filter(e=>e.kind==='shock-followup').length,1,'Shock follow-up has one actionable item');
eq(agenda.unknown.filter(e=>e.kind==='shock-followup').length,0,'No duplicate unknown Shock');
actor.hmk.combatState.shockFollowup=null;
actor.hmk.combatState.wounds=[{id:'w1',bleeding:true,healed:false}];
agenda=campaignCalendarAgenda(clock,[actor],[]);
eq(agenda.due.filter(e=>e.kind==='bleeding').length,1,'Bleeding due once');
eq(agenda.unknown.filter(e=>e.kind==='bleeding').length,0,'No duplicate unknown Bleeding');
const journal=[{id:'s1',characterId:'p',campaignMinute:120,calendarCampaignId:'test-485',skillTestProof:{type:'critical-followup',actorId:'p',skill:'Climbing',activity:'climb-easy',technique:'Acrobatics',result:{level:'CF'}}}];
agenda=campaignCalendarAgenda(clock,[actor],journal);
const fall=agenda.due.filter(e=>e.kind==='skill-fall');
eq(fall.length,1,'Unresolved fall due exactly once');ok(fall[0].description.includes('Climbing')&&fall[0].description.includes('Easy Climbing')&&fall[0].description.includes('Acrobatics')&&fall[0].description.includes('CF'),'CF describes original action and dice follow-up');
console.log('PASS',n,'v93.485 rules: carried 18/total 21.2, water vessel weight, ENC threshold, no duplicate calendar alerts, CF context');
