'use strict';
// Regression guard: no copied 'Strength status' ledger and no stale ML/impact/ENC.
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prev=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return prev(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {availableMasteries}=require('../src/integration/hmk-skill-test-engine.js');
const {strengthImpactModifier,heftPenalty}=require('../src/rules/weapon-modes.js');
const {strengthEncumbranceModifier,modifiedEncumbrance}=require('../src/rules/encumbrance.js');
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
let n=0;const eq=(a,b)=>{assert.deepStrictEqual(a,b);n++};
function char(str){return {id:'target',hmk:{attributes:{str,end:11,dex:12,agl:11,per:12,cml:10,aur:12,wil:12,rea:12,cre:12,emp:12,elo:12},skills:[{name:'Shock',ml:65},{name:'Throwing',ml:60}],combatState:initialCombatState()}}}
for(const [original,as] of [[14,4],[12,6],[9,2],[5,2]]){
 const who=char(original),delta=Math.round(as/2);const before=structuredClone(who),b=original-delta;
 // One real character is reduced; all rule readers receive its new STR.
 who.hmk.attributes.str=b;
 who.hmk.alchemyWeaknessLosses=[{sourceId:'physical-vial-throw',round:1,strengthBefore:original,strengthAfter:b,decrease:delta}];
 eq(availableMasteries(who).find(s=>s.name==='Strength').ml,b*5);
 eq(availableMasteries(before).find(s=>s.name==='Strength').ml,original*5);
 eq(availableMasteries(who).find(s=>s.name==='Shock').ml,65); // torpor: no extra Shock penalty
 eq(strengthImpactModifier(who.hmk.attributes.str),strengthImpactModifier(b));
 eq(strengthEncumbranceModifier(who.hmk.attributes.str),strengthEncumbranceModifier(b));
 eq(modifiedEncumbrance({armourENC:10,gearENC:5,str:who.hmk.attributes.str}),modifiedEncumbrance({armourENC:10,gearENC:5,str:b}));
 eq(heftPenalty({str:who.hmk.attributes.str,hft:12}),heftPenalty({str:b,hft:12}));
 eq(before.hmk.attributes.str,original);
}
console.log('PASS Weakness live-STR derived ML, Shock guard, Impact, Heft, ENC:',n,'assertions');
