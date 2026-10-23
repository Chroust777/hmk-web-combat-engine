'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const orig=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return orig(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const LOS=require('../src/integration/hmk-alchemy-area-los.js');
let n=0;const eq=(a,b)=>{assert.deepStrictEqual(a,b);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const source={kind:'Fumebomb',timelineId:'fight',sourceRound:5,sourceId:'potion-blast',
 throw:{discharged:true},smoke:{blocksLOS:true,originRound:5,throughRound:5,center:{x:5,y:0},radiusFt:5}};
const row={calendarCampaignId:'C',calendarAlchemyAreaThrown:source};
const base={journal:[row],campaignId:'C',sequence:{active:true,round:5,timelineId:'fight',order:['a','b','c'],
 spatialUnits:[{id:'a',x:0,y:0},{id:'b',x:15,y:0},{id:'c',x:0,y:15}]}};
eq(LOS.activeFumebombCircles(base).length,1);
bad(()=>LOS.assertFumebombLineOfSight({...base,fromId:'a',toId:'b'}),/blokovaná LOS/);
eq(LOS.assertFumebombLineOfSight({...base,fromId:'a',toId:'c'}).clear,true);
bad(()=>LOS.assertFumebombLineOfSight({...base,fromId:'a',toPoint:{x:11,y:0}}),/blokovaná LOS/);
bad(()=>LOS.assertFumebombLineOfSight({...base,fromId:'a',toPoint:{x:5,y:0}}),/blokovaná LOS/);
eq(LOS.assertFumebombLineOfSight({...base,fromId:'b',toId:'c'}).clear,true);
eq(LOS.activeFumebombCircles({...base,sequence:{...base.sequence,round:6}}),[]);
eq(LOS.assertFumebombLineOfSight({...base,sequence:{...base.sequence,round:6},fromId:'a',toId:'b'}).clear,true);
eq(LOS.activeFumebombCircles({...base,sequence:{...base.sequence,timelineId:'new-fight'}}),[]);
eq(LOS.activeFumebombCircles({...base,campaignId:'D'}),[]);
eq(LOS.activeFumebombCircles({...base,sequence:{...base.sequence,active:false}}).length,1);
bad(()=>LOS.assertFumebombLineOfSight({...base,sequence:{...base.sequence,active:false},fromId:'a',toId:'b'}),/blokovaná LOS/);
bad(()=>LOS.assertFumebombLineOfSight({...base,sequence:{...base.sequence,spatialUnits:null},fromId:'a',toId:'b'}),/souřadnice/);
bad(()=>LOS.assertFumebombLineOfSight({...base,fromId:'a',toId:'missing'}),/známé body/);
bad(()=>LOS.assertFumebombLineOfSight({...base,journal:[{...row,calendarAlchemyAreaThrown:{...source,smoke:{...source.smoke,throughRound:6}}}],fromId:'a',toId:'b'}),/neplatný trvalý důkaz/);
eq(LOS.activeFumebombCircles({...base,journal:[{...row,calendarAlchemyAreaThrown:{...source,throw:{discharged:false}}}]}),[]);
// Multiple smoke sources share a line and never form a second system.
const twice={...row,calendarAlchemyAreaThrown:{...source,sourceId:'another',smoke:{...source.smoke,center:{x:12,y:0}}}};
eq(LOS.activeFumebombCircles({...base,journal:[row,twice]}).length,2);
bad(()=>LOS.assertFumebombLineOfSight({...base,journal:[row,twice],fromId:'a',toId:'b'}),/potion-blast, another/);
console.log('PASS Alchemy Fumebomb LOS:',n,'assertions');
