'use strict';
// HMK v1.2 pp.269–274: all 35 canonical use/duration classifications.
// Unsupported imbibing effects must not disappear from the Profusion cohort.
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const P=require('../src/integration/hmk-alchemy-profusion.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js');
const {STARTING_ELIXIR_NAMES}=require('../src/integration/hmk-creation-starting-elixirs.js');
let count=0;
function eq(a,b){assert.deepEqual(a,b);count++}
function fail(f,re){assert.throws(f,re);count++}
const applied=['Acid','Eruption','Fumebomb','Mending','Object Aegis','Weakness'];
const instant=['Dreamwalk','Healing','Mindsalve','Physic','Poison','Sustenance','Wakefulness'];
const exempt=['Quiescence','Physic','Poison'];
eq(Object.keys(P.CANONICAL_PROFUSION_PROFILE).length,35);
for(const name of STARTING_ELIXIR_NAMES){
 const p=P.canonicalProfusionProfile(name);
 eq(p.name,name);eq(p.use,applied.includes(name)?'Applied':'Imbibed');
 eq(p.duration,applied.includes(name)||instant.includes(name)?'Instantaneous':'Temporary');
 eq(p.exempt,applied.includes(name)||exempt.includes(name));
 eq(P.contributesProfusion(name,p.use,p.duration,p.duration==='Temporary'),!p.exempt && p.duration==='Temporary');
 if(p.duration==='Instantaneous')eq(P.contributesProfusion(name,p.use,p.duration,false),false);
}
fail(()=>P.canonicalProfusionProfile('Made-Up Tonic'),/Profusion/);
fail(()=>P.canonicalProfusionProfile('__proto__'),/Profusion/);
eq(P.contributesProfusion('Acid','Imbibed'),false);
eq(P.contributesProfusion('Fumebomb','Imbibed'),false);
eq(P.contributesProfusion('Healing'),true);
eq(P.contributesProfusion('Healing','Imbibed','Temporary'),false);
eq(P.contributesProfusion('Healing','Imbibed','Instantaneous',false),false);
eq(P.contributesProfusion('Unique-without-proof'),false);
const j=(name,{time=100,campaign='C',target='B',finalAS=6}={})=>({id:`src-${name}-${time}`,calendarCampaignId:campaign,campaignMinute:time,
 calendarAlchemyImbibing:{elixirName:name,targetId:target,finalAS,temporary:!instant.includes(name)}});
const specimen=j('Healing');
fail(()=>I.activeAlchemyProfusionCohort([specimen],'C','B',100),/Profusion.*Healing/);
fail(()=>I.activeAlchemyProfusionCohort([j('Airtap')],'C','B',100),/Profusion.*Airtap/);
eq(I.activeAlchemyProfusionCohort([specimen],'C','A',100),[]);
eq(I.activeAlchemyProfusionCohort([specimen],'X','B',100),[]);
eq(I.activeAlchemyProfusionCohort([specimen],'C','B',99),[]);
eq(I.activeAlchemyProfusionCohort([j('Physic'),j('Poison'),j('Quiescence')],'C','B',100),[]);
eq(I.activeAlchemyProfusionCohort([j('Healing',{finalAS:0})],'C','B',100),[]);
fail(()=>I.activeAlchemyProfusionCohort([j('Fumebomb')],'C','B',100),/Applied/);
const before=JSON.stringify([specimen]);
fail(()=>I.activeAlchemyProfusionCohort([specimen],'C','B',100),/Profusion/);
eq(JSON.stringify([specimen]),before);
for(let n=0;n<7;n++)for(const d of [81,82,83,84,85,86,87,88,89,90]){
 const x=P.classifyProfusionImbibing(d,60,n);
 eq(x.original,'CF'===x.original?'CF':'F');
 if(n>=4)eq(x.adjusted,'CF');
}
console.log('PASS Profusion canonical catalogue 441: '+count+' assertions');
