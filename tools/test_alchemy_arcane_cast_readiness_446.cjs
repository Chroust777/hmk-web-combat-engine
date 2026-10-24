'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const orig=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return orig(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const Readiness=require('../src/integration/hmk-alchemy-arcane-casting-readiness.js');
const Catalog=require('../src/integration/hmk-creation-starting-pvar.js');
const Source=require('../src/integration/hmk-alchemy-arcane-targets.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],
 {encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
const {journal,inventory,minute}=fixture;
const target=Source.alchemyArcaneTargetDossier({journal,inventory,campaignId:'C',minute,finishId:'finish1'});
const starting=Catalog.validateStartingPvarSpells({occupation:'Shèk-Pvâr (Fývria)',pvarismML:70,
 primary:'Fývria',chantryStars:5,chantryConvocation:'Fývria',homeChantry:'Known chantry',
 startingARP:350,choices:[],artefacts:[],naturalAttunement:false});
const caster={id:'Mage',occupation:'Shèk-Pvâr (Fývria)',hmk:{startingPvarSpells:starting,
 skills:[{name:'Pvârism',ml:70}]}};
let passed=0;
const eq=(a,b)=>{assert.deepEqual(a,b);passed++};
const yes=(v)=>{assert.ok(v);passed++};
const err=(fn,p)=>{assert.throws(fn,p);passed++};
const plan=(spell,distanceFeet=10,extras={})=>Readiness.alchemyArcaneCastingPreflight({character:caster,target,spell,distanceFeet,...extras});
const ready=Readiness.alchemyArcaneCasterDossier(caster);
eq(ready.verified,true);eq(ready.neutralML,70);eq(ready.si,7);
eq(ready.known.includes('Neutral::Detect'),true);eq(ready.known.includes('Neutral::Reveal'),true);
eq(ready.known.includes('Neutral::Dispel'),true);
const detect=plan('Detect',35,{gmWardAbsentConfirmed:true});
eq(detect.rangeFeet,30);eq(detect.spellML,64);eq(detect.si,6);eq(detect.castingTime,'2 rounds');eq(detect.dispelEMLPenalty,0);
eq(detect.complete,false);eq(detect.mayCommit,false);yes(detect.blockers.some(x=>x.includes('Spellstart')));
const beyond=plan('Detect',31,{gmWardAbsentConfirmed:true});yes(beyond.blockers.some(x=>x.includes('dosah')));
const detectWard=plan('Detect',2);yes(detectWard.blockers.some(x=>x.includes('Ward')));
const reveal=plan('Reveal',7,{gmWardAbsentConfirmed:true});eq(reveal.rangeFeet,6);
yes(reveal.blockers.some(x=>x.includes('Detect')));eq(reveal.requiresLOS,false);
const revealBeyond=plan('Reveal',7);yes(revealBeyond.blockers.some(x=>x.includes('dosah')));
const dispel=plan('Dispel',20,{gmWardAbsentConfirmed:true,gmLOSConfirmed:true});
eq(dispel.dispelEMLPenalty,-30);eq(dispel.partialEML,32);
eq(dispel.spellML,62);eq(dispel.si,6);eq(dispel.castingTime,'1 minute');eq(dispel.requiresLOS,true);
yes(dispel.blockers.some(x=>x.includes('Detect')));yes(dispel.blockers.some(x=>x.includes('Reveal')));
eq(dispel.mayCommit,false);
yes(plan('Dispel',20,{gmWardAbsentConfirmed:true}).blockers.some(x=>x.includes('LOS')));
const unknown=Readiness.alchemyArcaneCasterDossier({id:'None',hmk:{}});eq(unknown.verified,false);
yes(unknown.reason.includes('výběr'));
const unskilled=structuredClone(caster);unskilled.hmk.skills=[];
const without=Readiness.alchemyArcaneCasterDossier(unskilled);eq(without.verified,false);
const tampered=structuredClone(caster);tampered.hmk.startingPvarSpells.freeSpells=['Neutral::Dispel'];
err(()=>Readiness.alchemyArcaneCasterDossier(tampered),/historický/);
const premature=plan('Detect',-1);yes(premature.blockers.some(x=>x.includes('vzdálenost')));
const unknownTarget={...target,targetable:false,phase:'ended',currentAS:null};
yes(Readiness.alchemyArcaneCastingPreflight({character:caster,target:unknownTarget,spell:'Dispel',distanceFeet:2})
 .blockers.some(x=>x.includes('živé enchantment')));
err(()=>plan('Invented'),/kanonické/);
const original=JSON.stringify({journal,inventory,caster});
for(const s of ['Detect','Reveal','Dispel'])for(const ft of [0,5,35,300]){
 const r=plan(s,ft,{gmLOSConfirmed:true,gmWardAbsentConfirmed:true});eq(r.complete,false);eq(r.mayCommit,false);
}
eq(JSON.stringify({journal,inventory,caster}),original);
console.log('PASS native arcane source/caster spell preflight 446:',passed,'checks');
