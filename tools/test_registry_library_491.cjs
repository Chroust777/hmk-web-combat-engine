'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readFn=(start,end)=>vm.runInNewContext('('+app.slice(app.indexOf('function '+start+'('),app.indexOf('\nfunction '+end+'(')).trim()+')',{esc});
const brief=readFn('libraryBrief','libraryPrintedPages');
const details=readFn('catalogParameters','armourLibraryConsistencyPanel');
let n=0;function ok(v,msg){assert.ok(v,msg);n++;}
function absent(markup,text){ok(!markup.includes(text),`unexpected duplicate: ${text}`)}
const weapon={category:'weapon',properties:{quality:12,heft:14,length:5,zoneDie:'d10',weightLb:4,pricePence:72,defenceModifier:-5,verifiedModes:[{name:'Primary',impactDie:'d6',impactModifier:5,aspect:'b',zoneDie:'d10',length:5}],alternateStrikeModes:[{name:'Swing',impactDie:'d8',impactModifier:2,aspect:'e',zoneDie:'d8'}]}};
const w=brief(weapon),wd=details(weapon);
ok(w[0]==='12','weapon WQ is numeric');absent(wd,'Základní WQ');absent(wd,'Hmotnost (lb)');absent(wd,'Cena (d)');absent(wd,'>Heft<');absent(wd,'>Délka<');
ok(wd.includes('d10'),'weapon zone survives');ok(wd.includes('d8+2'),'alternate mode impact survives');ok(wd.includes('Obranný modifikátor'),'unseen defence modifier survives');
const ranged={category:'weapon',properties:{quality:10,heft:7,length:3,baseRangeFt:210,weightLb:2,pricePence:100,verifiedModes:[{name:'Primary',impactDie:'d8',impactModifier:3,aspect:'p',zoneDie:'d6'}]}};
ok(brief(ranged)[0]==='10','ranged WQ numeric');ok(details(ranged).includes('Heft'),'hidden ranged heft remains accessible');absent(details(ranged),'Základní dostřel (ft)');
const shield={category:'shield',properties:{quality:9,shieldModifier:5,deflect:3,weightLb:5,pricePence:50,heft:4}};
ok(brief(shield)[0]==='9','shield WQ numeric');absent(details(shield),'Základní WQ');absent(details(shield),'Modifikátor štítu');absent(details(shield),'Odklonění (Deflect)');ok(details(shield).includes('Heft'),'unshown shield heft survives');
const armour={category:'armor',properties:{material:'M',encumbrance:1,weightLb:3,pricePence:40,locationProtection:{fa:{b:2,e:8,p:7,f:3},sk:{b:2,e:8,p:7,f:3}},coveredLocations:['fa','sk']}};
absent(details(armour),'Hmotnost (lb)');absent(details(armour),'Cena (d)');absent(details(armour),'>ENC<');ok(details(armour).includes('fa · sk'),'identical location protection represented only by affected locations');
const gear={category:'other',properties:{weightLb:.5,pricePence:6,quality:0,skill:'Survival',volumePints:1}};
ok(brief(gear)[4]==='0.5 lb','other weight retained');absent(details(gear),'Hmotnost (lb)');absent(details(gear),'Cena (d)');ok(details(gear).includes('Volume Pints'),'unshown custom property retained');
ok(app.includes("const requestedKind=preferences.kind==='NPC'?'NPC':'PC'"),'kind normalized for all modes');
ok(app.includes('kind:requestedKind,occupation:'),'kind persisted on creation');
ok(app.includes('t.kind=requestedKind;'),'kind retained at completion');
console.log('PASS',n,'v93.491 catalogue compact fields, nonduplicated details, additional properties and persisted NPC selection');
