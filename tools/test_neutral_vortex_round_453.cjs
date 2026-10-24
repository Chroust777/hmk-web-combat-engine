'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const before=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return before(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{
  fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const V=require('../src/integration/hmk-neutral-vortex-round-preflight.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++};
const yes=a=>{assert.ok(a);n++};const bad=(f,re)=>{assert.throws(f,re);n++};
const ml=V.neutralVortexSpecialML;
for(const [input,expected] of [
 [{category:'Active spell',complexityLevel:3,duration:'Temporary'},15],
 [{category:'Active spell',complexityLevel:3,duration:'Indefinite'},30],
 [{category:'Active spell',spell:'Ward',wardLevel:4,duration:'Indefinite'},40],
 [{category:'Active talent',talentIndex:3,duration:'Temporary'},8],
 [{category:'Active talent',talentIndex:5,duration:'Indefinite'},25],
 [{category:'Artefact enchantment',complexityLevel:4},40],
 [{category:'Artefact enchantment',complexityLevel:4,activeLatent:true,duration:'Temporary'},20],
 [{category:'Artefact enchantment',complexityLevel:4,activeLatent:true,duration:'Permanent'},40],
 [{category:'Elixir',currentAS:6},30],
 [{category:'Raw Principle'},60],
 [{category:'Rune object',runecraftSI:8},40]])eq(ml(input),expected);
for(const o of [{category:'Elixir',currentAS:0},
 {category:'Active spell',complexityLevel:2},
 {category:'Active talent',talentIndex:3},
 {category:'Rune object'},
 {category:'Active spell',spell:'Ward',wardLevel:4,duration:'Temporary'},
 {category:'Unverified energy',ml:100}])bad(()=>ml(o),/Neutral Vortex/);
const src=(id,category,x,y,rest={})=>({id,category,x,y,verified:true,...rest});
const ward=src('ward','Active spell',5,0,{spell:'Ward',wardLevel:3,duration:'Indefinite',protectsSourceId:'elixir'});
const elixir=src('elixir','Elixir',5,0,{currentAS:6,protectedByWardId:'ward'});
const rune=src('rune','Rune object',6,0,{runecraftSI:5});
const talent=src('talent','Active talent',7,0,{talentIndex:4,duration:'Temporary'});
const sources=[ward,elixir,rune,talent];
const base={spellCL:2,roundOffset:0,origin:{x:0,y:0},radiusFeet:2.5,sources,
 selectedSourceId:'elixir',selectionProof:'GM dice and target witness #01',
 gmRandomSelectionConfirmed:true,gmCompleteCensusConfirmed:true};
const affected=V.neutralVortexRoundPreflight({...base,rolls:[
 {sourceId:'ward',d100:86,d20:4},{sourceId:'elixir',d100:24},
 {sourceId:'rune',d100:95,d20:9},{sourceId:'talent',d100:91,d20:11}]});
eq(affected.centre,{x:5,y:0});eq(affected.inRadiusSourceIds,['ward','elixir','rune','talent']);
eq(affected.outcomes.map(o=>o.targetML),[30,30,25,10]);
eq(affected.outcomes.map(o=>o.successLevel),['F','S','CF','F']);
eq(affected.radiusBeforeFeet,2.5);eq(affected.radiusNextFeet,7.5);
eq(affected.outcomes[0].duration,4);eq(affected.outcomes[0].unit,'rounds');
eq(affected.outcomes[2].duration,9);eq(affected.outcomes[2].unit,'hours');
eq(affected.outcomes[1].permanentASLoss,0);eq(affected.mayCommit,false);
const protectedRolls=[
 {sourceId:'ward',d100:30},{sourceId:'rune',d100:15},{sourceId:'talent',d100:5}];
const protectedCase=V.neutralVortexRoundPreflight({...base,rolls:protectedRolls});
eq(protectedCase.wardBlockedSourceIds,['elixir']);
eq(protectedCase.outcomes.map(o=>o.successLevel),['CS','CS','CS']);
eq(protectedCase.radiusNextFeet,2.5);eq(protectedCase.casterPsycheStress,3);
for(const [opts,re] of [
 [{gmCompleteCensusConfirmed:false},/úplný/],
 [{gmRandomSelectionConfirmed:false},/náhodný/],
 [{selectionProof:null},/náhodný/],
 [{selectedSourceId:'not-in-world'},/náhodný/],
 [{sources:[...sources,elixir]},/neunikátní/],
 [{sources:[...sources,{...src('x','Active spell',3,0),complexityLevel:1,duration:'Temporary',verified:false}]},/neunikátní/],
 [{rolls:[{sourceId:'elixir',d100:22},{sourceId:'ward',d100:80,d20:4},...affected.outcomes.slice(2).map(o=>({sourceId:o.sourceId,d100:90,d20:2}))]},/nejprve/],
 [{rolls:[{sourceId:'ward',d100:86,d20:4},{sourceId:'elixir',d100:24},{sourceId:'rune',d100:98,d20:9}]},/chybí povinný/],
 [{rolls:[{sourceId:'ward',d100:30},...protectedRolls]},/právě jednomu/],
 [{rolls:[...protectedRolls,{sourceId:'elixir',d100:40,d20:5}]},/nejprve/],
 [{rolls:[{sourceId:'ward',d100:85},{sourceId:'elixir',d100:25},{sourceId:'rune',d100:95,d20:9},{sourceId:'talent',d100:91,d20:11}]},/d20/],
 [{rolls:[{sourceId:'ward',d100:85,d20:4},{sourceId:'elixir',d100:25,d20:10},{sourceId:'rune',d100:95,d20:9},{sourceId:'talent',d100:91,d20:11}]},/d20/],
 [{sources:[{...ward,protectsSourceId:'wrong'},elixir,rune,talent]},/Ward/],
 [{radiusFeet:25},/geometrie/],
 [{radiusFeet:6},/geometrie/],
 [{radiusFeet:7.5},/geometrie/],
 [{roundOffset:2},/fáze/]
])bad(()=>V.neutralVortexRoundPreflight({...base,...opts,rolls:opts.rolls??protectedRolls}),re);
const empty=V.neutralVortexRoundPreflight({spellCL:1,roundOffset:0,origin:{x:0,y:0},
 sources:[src('far','Elixir',100,100,{currentAS:2})],gmCompleteCensusConfirmed:true,rolls:[]});
eq(empty.centre,{x:0,y:0});eq(empty.outcomes.length,0);eq(empty.radiusNextFeet,2.5);
const cap=V.neutralVortexRoundPreflight({spellCL:3,roundOffset:2,origin:{x:0,y:0},
 radiusFeet:7.5,sources:[src('near','Elixir',0,0,{currentAS:5})],
 gmCompleteCensusConfirmed:true,gmRandomSelectionConfirmed:true,
 selectedSourceId:'near',selectionProof:'GM random roll #07',rolls:[{sourceId:'near',d100:95,d20:20}]});
eq(cap.radiusNextFeet,12.5);eq(cap.outcomes[0].unit,'hours');
// Six distinct categories in one area must all receive their own real roll,
// not merely the randomly selected centre. A crucial success is PSY1 to caster.
const allSix=[
 src('a','Active spell',0,0,{complexityLevel:2,duration:'Temporary'}),
 src('b','Active talent',0,0,{talentIndex:2,duration:'Indefinite'}),
 src('c','Artefact enchantment',0,0,{complexityLevel:2}),
 src('d','Elixir',0,0,{currentAS:4}),
 src('e','Raw Principle',0,0),
 src('f','Rune object',0,0,{runecraftSI:4})];
const six=V.neutralVortexRoundPreflight({spellCL:3,roundOffset:1,origin:{x:0,y:0},
 sources:allSix,selectedSourceId:'a',selectionProof:'GM witnessed random #11',
 gmCompleteCensusConfirmed:true,gmRandomSelectionConfirmed:true,rolls:[
 {sourceId:'a',d100:50,d20:2},{sourceId:'b',d100:10},
 {sourceId:'c',d100:14},{sourceId:'d',d100:26,d20:4},
 {sourceId:'e',d100:60},{sourceId:'f',d100:99,d20:3}]});
eq(six.outcomes.length,6);
eq(six.outcomes.map(r=>r.targetML),[10,10,20,20,60,20]);
eq(six.outcomes.map(r=>r.successLevel),['CF','CS','S','F','CS','F']);
eq(six.radiusNextFeet,7.5);eq(six.casterPsycheStress,2);
yes(six.outcomes.every(r=>r.permanentASLoss===0&&r.sourceId));
bad(()=>V.neutralVortexRoundPreflight({spellCL:3,roundOffset:1,origin:{x:0,y:0},
 sources:allSix,selectedSourceId:'a',selectionProof:'GM random #12',
 gmCompleteCensusConfirmed:true,gmRandomSelectionConfirmed:true,
 rolls:[{sourceId:'a',d100:50,d20:2}]}),/chybí povinný/);
console.log('PASS Neutral Vortex full-category one-round preflight 453:',n,'checks');
