'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),orig=require.extensions['.js'];
require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):orig(m,p);
const {assertLegacyMutationDoesNotChangeCombat}=require(path.join(root,'src/integration/active-combat-write-boundary.js'));
let checks=0;
function yes(x){assert.ok(x);checks++}function bad(f,match){assert.throws(f,match);checks++}
const baseline={characters:[{id:'fighter',name:'Bojovnik',hmk:{injuries:[],healthState:{shock:'NONE'}}},{id:'civilian',name:'Civilista',hmk:{injuries:[],healthState:{shock:'NONE'}}}],inventory:[{id:'sword',characterId:'fighter',quantity:1},{id:'water',characterId:'civilian',quantity:1}],journal:[{id:'combat-hit-1',characterId:'fighter',combatProof:{id:'hit-1',roll:37},title:'Original immutable hit'}],items:[],combatRuntime:{sequence:{timelineId:'battle',round:2,order:['fighter']}}};
const args={sequence:baseline.combatRuntime.sequence,participantIds:['fighter']};
const edits=[
 d=>{d.inventory.find(i=>i.id==='water').quantity=2},
 d=>{d.characters.find(c=>c.id==='civilian').name='Civilista (poznámka)'},
 d=>{d.journal.push({id:'civilian-note',characterId:'civilian',title:'Note',body:'independent action'})},
 d=>{d.items.push({id:'new-catalog-item',name:'Herb'})}
];
function perm(arr){return arr.length?arr.flatMap((x,i)=>perm(arr.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]]}
for(const order of perm([0,1,2,3])){
 const a=structuredClone(baseline);
 for(const index of order){edits[index](a);yes(assertLegacyMutationDoesNotChangeCombat(baseline,a,args));}
 assert.equal(a.journal.find(j=>j.id==='combat-hit-1').combatProof.roll,37);checks++;
}
const tamper=[
 [d=>d.inventory.find(i=>i.id==='sword').quantity++,/Inventář účastníků/],
 [d=>d.characters.find(c=>c.id==='fighter').name='Modified fighter',/Účastníka Initiative/],
 [d=>d.characters.find(c=>c.id==='fighter').hmk.healthState.shock='KIA',/Účastníka Initiative/],
 [d=>{d.combatRuntime.sequence.round=3},/Kontrolní bod Initiative/],
 [d=>{d.journal[0].combatProof.roll=12},/Potvrzený bojový důkaz/],
 [d=>{d.journal.splice(0,1)},/Potvrzený bojový důkaz/],
 [d=>{d.journal.push({id:'fake-hit',combatProof:{roll:11}})},/Nový Combat důkaz/],
];
for(const [edit,error] of tamper){const d=structuredClone(baseline);edit(d);bad(()=>assertLegacyMutationDoesNotChangeCombat(baseline,d,args),error)}
console.log('PASS '+checks+' Combat write-boundary assertions, 24 permutations, nonparticipant allowed and original initiative proofs preserved');
