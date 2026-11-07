const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..');let asserts=0;
const cache={};function load(k){if(cache[k])return cache[k].exports;
 const src=fs.readFileSync(path.join(root,k),'utf8');const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};cache[k]=mod;new Function('module','exports','require',out)(mod,mod.exports,r=>{
 const filepath=path.posix.normalize(path.posix.join(path.posix.dirname(k),r.endsWith('.js')?r:r+'.js'));return load(filepath);
 });return mod.exports;}
const {planSharedWindow93771:plan,sharedDailyWindowLimit93771:midnight}=load('src/integration/hmk-shared-planner-93771.js');
const {startSharedTimeWindow93767:start}=load('src/integration/hmk-shared-time-window-93767.js');
function ok(cond,label){asserts++;if(!cond)throw Error('FAILED '+label);}
const w=start({campaignId:'c',startMinute:480,minutes:40,windowId:'w'});
const a={id:'a1',groupId:'a1',followsGroup:'',kind:'travel',minutes:20,memberIds:['a'],done:true};
let b={id:'a2',groupId:'a1',followsGroup:'a1',kind:'forage',minutes:30,memberIds:['a'],done:false};
let value=plan(w,[a,b]);ok(value.errors.length===1,'40-20-30 must fail');ok(/20 minut/.test(value.errors[0].message),'pre-roll explicit remaining 20');
b={...b,minutes:20};value=plan(w,[a,b]);ok(value.errors.length===0,'20+20 valid');ok(value.scheduled[1].startMinute===500&&value.scheduled[1].endMinute===520,'sequential anchor');
const c={id:'b1',groupId:'b1',followsGroup:'',kind:'rest',minutes:30,memberIds:['b']};value=plan(w,[a,b,c]);ok(value.errors.length===0,'second independent group parallel');ok(value.scheduled[2].startMinute===480,'B start same minute');
let clash={...c,memberIds:['a']};ok(plan(w,[a,b,clash]).errors.length>0,'same member overlaps even from new group');
clash={...b,memberIds:['a','b']};ok(plan(w,[a,clash]).errors.length>0,'continuing group cannot secretly change actors');
clash={...b,minutes:21};ok(plan(w,[a,clash]).errors.length>0,'last-minute overrun refused');
clash={...b,followsGroup:'missing',groupId:'missing'};ok(plan(w,[a,clash]).errors.length>0,'no unknown continuation');
clash={...b,groupId:'a2'};ok(plan(w,[a,clash]).errors.length>0,'group id binding checked');
ok(midnight(23*60+40)===20,'23:40 -> exactly 20 minutes to 00:00 boundary');
ok(midnight(23*60+59)===1,'23:59 -> one last minute');
ok(midnight(1440)===1440,'fresh new day');
ok(midnight(480)===960,'morning');
const wnight=start({campaignId:'c',startMinute:1420,minutes:20,windowId:'n'});
ok(!plan(wnight,[{...a,minutes:20}]).errors.length,'last minute used 23:59, next at 00:00');
console.log('PASS '+asserts+' shared planner overlap/remaining/midnight checks');
