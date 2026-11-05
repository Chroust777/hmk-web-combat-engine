/** HMK pp.145,147,150: Wilderness Mode results and actual Surprise gateway.
 * Neither stalking nor vigilance rolls a fictional enemy or encounter. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),old=require.extensions['.js'];
require.extensions['.js']=(m,f)=>f.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f):old(m,f);
const {trekWatchfulness,trekSurpriseProcedure,trackingOutcome,foragingDie}=require('../src/integration/hmk-trekking-wilderness-tasks.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const plain=trekWatchfulness({modes:{},conveyance:'foot'});eq(plain.effective,'normal');eq(plain.skills,['Awareness']);
const watch=trekWatchfulness({modes:{vigilance:1},conveyance:'foot'});eq(watch.effective,'alert');eq(watch.skills,['Awareness']);
const stalk=trekWatchfulness({modes:{stalking:1},conveyance:'foot'});eq(stalk.effective,'alert');eq(stalk.skills,['Stealth']);
const both=trekWatchfulness({modes:{stalking:1,vigilance:1},conveyance:'foot'});eq(both.skills,['Stealth','Awareness']);
for(const conveyance of ['mount','cart','wagon']){const v=trekWatchfulness({modes:{stalking:1,vigilance:1},conveyance});eq(v.effective,'normal');eq(v.demoted,true);}
const surprised=trekSurpriseProcedure({party:both,foe:'lax'});eq(surprised.kind,'automatic');eq(surprised.automaticWinner,'party');eq(surprised.foeSkills,['Awareness']);
const equal=trekSurpriseProcedure({party:both,foe:'alert'});eq(equal.kind,'opposed');eq(equal.automaticWinner,null);
const intermediate=trekSurpriseProcedure({party:watch,foe:'normal'});eq(intermediate.kind,'unopposed');eq(intermediate.automaticWinner,null);
bad(()=>trekSurpriseProcedure({party:both,foe:'unknown'}),/bdělost|Surprise/);
bad(()=>trekWatchfulness({modes:{vigilance:1},conveyance:'flying'}),/prostředek/);
const tracking=trackingOutcome(6);eq(tracking.spoorStars,2);eq(tracking.awarenessNeeded,false);
const trackingAmbiguous=trackingOutcome(3);eq(trackingAmbiguous.awarenessNeeded,true);
const forage=foragingDie({habitat:'mixed-forest',season:'summer',roll:10,target:'food-water'});eq(forage.foodDays>0,true);eq(forage.waterDays>0,true);
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');eq(app.includes('latest.trekWatchfulness'),true);eq(app.includes('latest.trackingMemory'),true);eq(app.includes('Bez dalšího fiktivního hodu Tracking.'),true);
console.log('PASS',n,'Stalking/Vigilance: foot/mount/cart/watch state, automatic/contested Surprise, no inferred encounter');
