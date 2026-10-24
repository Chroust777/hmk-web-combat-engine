'use strict';
// HMK v1.2 pp.270,273: Profusion exemption is NOT immunity to Physic.
// A sourced but unimplemented Poison/Quiescence enchantment must never be
// silently ignored, or cause the physical Physic vial to be consumed.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)
};
const I=require('../src/integration/hmk-alchemy-imbibing.js'),P=require('../src/integration/hmk-alchemy-profusion.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],{encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
const {journal,inventory,minute}=fixture;const base=structuredClone(journal);
const options={journal,inventory,campaignId:'C',minute,actorId:'A1',targetId:'B',finishId:'finish1',
 testSkill:'Aura',ml:65,d100:42,origin:'manual',emptyId:'empty-new-physic',gmConfirmed:true};
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},fail=(f,re)=>{assert.throws(f,re);n++};
const original=I.activeAlchemyPhysicTargets(journal,'C','B',minute);
eq(original.map(x=>x.elixirName),['Darkvision']);
eq(original[0].state.currentAS,original[0].finalAS);
eq(I.createAlchemyPhysicImbibing(options).physicEffects.map(x=>x.sourceUseId),['dark']);
const witness=(name,overrides={})=>({id:'legacy-'+name,calendarCampaignId:'C',campaignMinute:minute,
 characterId:'A0',calendarAlchemyImbibing:{elixirName:name,targetId:'B',finalAS:6,...overrides}});
for(const name of ['Poison','Quiescence','Healing','Mindsalve','Dreamwalk','Wakefulness','Sustenance','Iceshield','Airtap']){
 const j=[...journal,witness(name)]; const before=JSON.stringify(j),stocks=JSON.stringify(inventory);
 if(['Poison','Quiescence'].includes(name))eq(P.contributesProfusion(name),false);
 if(['Poison','Quiescence'].includes(name))eq(I.activeAlchemyProfusionCohort(j,'C','B',minute).length,1);
 fail(()=>I.activeAlchemyPhysicTargets(j,'C','B',minute),/Physic.*trvání účinku/);
 fail(()=>I.createAlchemyPhysicImbibing({...options,journal:j}),/Physic.*trvání účinku/);
 eq(JSON.stringify(j),before);eq(JSON.stringify(inventory),stocks);
 // Another campaign, other target, later minute: never affect this recipient.
 for(const muted of [{calendarCampaignId:'OTHER'},{campaignMinute:minute+1},
   {calendarAlchemyImbibing:{elixirName:name,targetId:'OTHER',finalAS:6}}]){
  const data=[...journal,{...witness(name),...muted}];
  eq(I.activeAlchemyPhysicTargets(data,'C','B',minute).map(x=>x.useId),['dark']);
 }
 // Already unenchanted, cannot be assumed to affect the current imbiber.
 eq(I.activeAlchemyPhysicTargets([...journal,witness(name,{finalAS:0})],'C','B',minute).length,1);
}
// Supported sources do not become Physic targets after their original enchantment
// is dispelled: the appended proof is replayed, not retroactively modified.
const asBefore=JSON.stringify(base),p=I.createAlchemyPhysicImbibing(options);
const e={id:'empty-new-physic',calendarCampaignId:'C',characterId:'A1',campaignMinute:minute,
 calendarAlchemyVialEmpty:{finishId:'finish1',vialId:p.vialId}};
const used={id:'used-new-physic',calendarCampaignId:'C',characterId:'A1',campaignMinute:minute,calendarAlchemyImbibing:p};
eq(I.activeAlchemyPhysicTargets([...journal,e,used],'C','B',minute).length,p.physicEffects[0].asAfter>0?1:0);
eq(JSON.stringify(base),asBefore);
for(const args of [['C','',minute],['C','B',-1],['', 'B',minute]])
 fail(()=>I.activeAlchemyPhysicTargets(journal,...args),/Physic.*kontext/);
console.log('PASS Alchemy Physic all-source safety 443:',n,'assertions');
