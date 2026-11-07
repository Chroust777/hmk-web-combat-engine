const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),cache={};function load(k){if(cache[k])return cache[k].exports;const src=fs.readFileSync(path.join(root,k),'utf8');const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod={exports:{}};cache[k]=mod;new Function('module','exports','require',out)(mod,mod.exports,r=>load(path.posix.normalize(path.posix.join(path.posix.dirname(k),r.endsWith('.js')?r:r+'.js'))));return mod.exports;}
const {planEpisodeRows93772:plan,rowMaximum93772:max}=load('src/integration/hmk-episode-rows-93772.js');
const {startSharedTimeWindow93767:start}=load('src/integration/hmk-shared-time-window-93767.js');
let tests=0;function ok(v,label){tests++;if(!v)throw Error('FAILED '+label);}
const w=start({campaignId:'c',startMinute:480,minutes:40,windowId:'w'});
const row=(id,actorId,kind,minutes,weatherId='sun')=>({id,actorId,kind,minutes,weatherId});
const a=row('1','a','travel',20),b=row('2','a','forage',30),c=row('3','b','rest',30);
let v=plan(w,[a,b,c],['sun']);ok(v.errors.length>0,'40-20-30 rejected');ok(v.errors.some(e=>e.id==='2'),'offending row');
b.minutes=20;v=plan(w,[a,b,c],['sun']);ok(v.errors.length===0,'same actor 20+20 and other concurrently');ok(v.scheduled[1].startMinute===500&&v.scheduled[1].endMinute===520,'A continuity');ok(v.scheduled[2].startMinute===480&&v.scheduled[2].endMinute===510,'B simultaneous');
ok(max(w,[a,b,c],'2','a')===20,'max 20 for second A');ok(max(w,[a,b,c],'3','b')===40,'max 40 for B');
ok(plan(w,[a,b,{...c,weatherId:'void'}],['sun']).errors.some(e=>e.id==='3'),'not confirmed weather');
ok(plan(w,[{...a,actorId:''}],['sun']).errors.length===1,'missing actor');
ok(plan(w,[{...a,minutes:0}],['sun']).errors.length===1,'zero blocked');
ok(plan(w,[a,{...a}],['sun']).errors.length>=1,'duplicate blocked');
ok(plan(w,[{...a,minutes:41}],['sun']).errors.length>0,'window maximum blocked');
ok(plan(w,[a,{...b,actorId:'b'},c],['sun']).errors.length>0,'other participant over cap');
ok(plan(w,[],['sun']).errors.length===0,'empty planning allowed for editing');
const midnight=start({campaignId:'c',startMinute:1420,minutes:20,windowId:'night'});
ok(plan(midnight,[row('t','a','watch',20)],['sun']).errors.length===0,'end at 00:00 allowed');
ok(plan(midnight,[row('t','a','watch',21)],['sun']).errors.length>0,'past midnight rejected');
console.log('PASS '+tests+' new episode-row planning checks');
