'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(root+path.sep+'src'+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {lastTimeEpisodeDistanceFraction,lastEquipmentSlowCarry,independentTravelDelayCarry,lastEpisodeBefore}=require('../src/integration/hmk-time-episodes.js');
let count=0;function eq(a,b,message){assert.deepEqual(a,b,message);count++}function bad(fn,re){assert.throws(fn,re);count++}
const ep=(id,memberIds,startMinute,minutes,{fraction=0,slow=0,future=0}={})=>({id,calendarCampaignId:'separate',campaignMinute:startMinute,calendarTimeEpisode:{kind:'travel',memberIds,startMinute,endMinute:startMinute+minutes,minutes,distanceFractionOut:fraction,equipmentSlowCarryOut:slow,hazardDetails:future?[{hazard:'complication',automationVersion:'v93.681',result:'long-delay'}]:[],travelDelay:{future}}});
const a=ep('a',['a-guide','a-patient'],480,30,{fraction:0.75,slow:30,future:120});
const b=ep('b',['b-guide'],510,15,{fraction:0.32,slow:0,future:0});
const journal=[a,b];
// Target behavior: no independent group's fractional metres, Slow or genuine obstruction can transfer.
eq(lastTimeEpisodeDistanceFraction(journal,'separate',525,['a-guide']),0.75,'Party A retains its distance fraction');
eq(lastEquipmentSlowCarry(journal,'separate',525,['a-guide']),30,'Party A retains its Slow');
eq(independentTravelDelayCarry(journal,'separate',525,['a-guide']),120,'Party A obstacle cannot be consumed by Party B');
eq(lastTimeEpisodeDistanceFraction(journal,'separate',525,['b-guide']),0.32,'Party B retains its own fraction');
eq(lastEquipmentSlowCarry(journal,'separate',525,['b-guide']),0,'Party B has no inherited Slow');
eq(independentTravelDelayCarry(journal,'separate',525,['b-guide']),0,'Party B has no inherited travel delay');
eq(lastTimeEpisodeDistanceFraction([a],'separate',510,['b-guide']),0,'New unrelated group starts with no fractional metre');
eq(lastEquipmentSlowCarry([a],'separate',510,['b-guide']),0,'No Slow on fresh group');
eq(independentTravelDelayCarry([a],'separate',510,['b-guide']),0,'No blockage on fresh group');
eq(lastEpisodeBefore(journal,'separate',525,['a-guide']).id,'a','Navigation follows the correct group');
eq(lastEpisodeBefore(journal,'separate',525,['b-guide']).id,'b','Other group follows its own latest episode');
// Legacy callers remain unchanged for immutable old replay.
eq(lastTimeEpisodeDistanceFraction(journal,'separate',525),0.32,'Unscoped legacy distance');
eq(lastEquipmentSlowCarry(journal,'separate',525),0,'Unscoped legacy Slow');
eq(independentTravelDelayCarry(journal,'separate',525),105,'Unscoped legacy delay');
// An overlap between old and current party should preserve its own remainder.
eq(lastTimeEpisodeDistanceFraction(journal,'separate',525,['a-guide','new-patient']),0.75,'Party A guide continuity');
bad(()=>lastEquipmentSlowCarry(journal,'separate',525,[]),/účastn|družin|party/i);
bad(()=>lastTimeEpisodeDistanceFraction(journal,'separate',525,['a-guide','a-guide']),/účastn|družin|party/i);
bad(()=>independentTravelDelayCarry(journal,'separate',525,'bogus'),/účastn|družin|party/i);

// Group A's delay only declines when A actually experiences a travel interval; unrelated B's time does not spend it.
const a2=ep('a2',['a-guide','replacement'],525,20,{fraction:0.26,slow:0});
const b2=ep('b2',['b-guide'],545,10,{fraction:0.89,slow:5,future:60});
const longer=[a,b,a2,b2];
eq(independentTravelDelayCarry(longer,'separate',555,['a-guide']),100,'A spends only its own 20 actual minutes');
eq(independentTravelDelayCarry(longer,'separate',555,['b-guide']),60,'B independently owns its obstacle');
eq(independentTravelDelayCarry(longer,'separate',555,['new-party']),0,'Third unrelated party has no penalty');
eq(lastTimeEpisodeDistanceFraction(longer,'separate',555,['a-guide']),0.26,'A keeps own newest fraction');
eq(lastTimeEpisodeDistanceFraction(longer,'separate',555,['b-guide']),0.89,'B keeps own newest fraction');
eq(lastEquipmentSlowCarry(longer,'separate',555,['b-guide']),5,'B retains own Slow');
eq(lastEquipmentSlowCarry(longer,'separate',555,['a-guide']),0,'A no longer has Slow');
eq(lastTimeEpisodeDistanceFraction(longer,'elsewhere',555,['a-guide']),0,'Another campaign starts at zero');
eq(lastEquipmentSlowCarry(longer,'elsewhere',555,['b-guide']),0,'Cross-campaign Slow prohibited');
eq(independentTravelDelayCarry(longer,'elsewhere',555,['a-guide']),0,'Cross-campaign obstacles prohibited');
const unchanged=JSON.stringify(longer);lastTimeEpisodeDistanceFraction(longer,'separate',555,['a-guide']);lastEquipmentSlowCarry(longer,'separate',555,['b-guide']);independentTravelDelayCarry(longer,'separate',555,['a-guide']);eq(JSON.stringify(longer),unchanged,'All party checks are pure and do not mutate history');
bad(()=>lastTimeEpisodeDistanceFraction(longer,'separate',555,['']),/účastn/i);
// Complete production source must supply scope at departure and reproduce it on journal validation.
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),source=fs.readFileSync(path.join(root,'src/integration/hmk-time-episodes.js'),'utf8');
assert.ok(app.includes("result.travelPartyScope='v93.763'"),'new departure proof lacks party tag');count++;
assert.ok(source.includes("const travelScope=e.travelPartyScope==='v93.763'?e.memberIds:null"),'historical replay lacks scoped validation');count++;
assert.ok(app.includes('lastEquipmentSlowCarry(data.journal,campaignKey(clock),clock.minute,members)'),'production app still uses campaign-global equipment slow');count++;
assert.ok(app.includes('independentTravelDelayCarry(data.journal,campaignKey(clock),clock.minute,members)'),'production app still uses campaign-global complication');count++;
console.log('PASS',count,'party-scoped fractional metres, Slow, delays, independent groups, legacy replay, and invalid scope');
