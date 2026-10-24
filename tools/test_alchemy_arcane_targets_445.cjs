'use strict';
// Canonical read-only targeting / Dispel EML — NOT a fabricated spellcasting
// implementation. Fully based on the previously verified physical vial +
// real imbibing source fixtures from the existing campaign journal.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const Arc=require('../src/integration/hmk-alchemy-arcane-targets.js');
const D=require('../src/integration/hmk-alchemy-decay.js');
const I=require('../src/integration/hmk-alchemy-imbibing.js');
const V=require('../src/integration/hmk-alchemy-vial-ledger.js');
const Profiles=require('../src/integration/hmk-alchemy-profusion.js');
const names=require('../src/integration/hmk-creation-starting-elixirs.js').STARTING_ELIXIR_NAMES;
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_alchemy_physic_425.cjs')],
 {encoding:'utf8',env:{...process.env,HMK_PHYSIC_FIXTURE:'1'}}));
const {journal,inventory,minute}=fixture;
const copy=()=>JSON.stringify({journal,inventory});const baseline=copy();
let count=0;
const eq=(a,b)=>{assert.deepEqual(a,b);count++};
const ok=a=>{assert.ok(a);count++};
const fail=(f,re)=>{assert.throws(f,re);count++};
const dossier=(finishId,j=journal,inv=inventory,min=minute,c='C')=>Arc.alchemyArcaneTargetDossier({journal:j,inventory:inv,campaignId:c,minute:min,finishId});
const dark=dossier('finish0'),physic=dossier('finish1');
eq(dark.phase,'active');eq(dark.targetable,true);eq(dark.targetId,'B');eq(dark.sourceId,'dark');
eq(dark.duration,'Temporary');eq(dark.vialId,null);eq(dark.dispelEMLPenalty,-dark.currentAS*5);
eq(physic.phase,'stored');eq(physic.targetable,true);eq(physic.vialId,'vial1');
eq(physic.targetId,'A1');eq(physic.sourceId,'bind1');eq(physic.duration,'Instantaneous');
eq(physic.dispelEMLPenalty,-30);eq(physic.detectCategory,'Elixir');
eq(physic.applicable,['Detect','Reveal','Dispel','Negation']);
ok(dark.requirements.dispel.includes('Detect + Reveal'));
eq(Arc.alchemyArcaneTargetRegister({journal,inventory,campaignId:'C',minute}).filter(x=>x.dossier?.targetable).length,2);
eq(Arc.alchemyArcaneTargetRegister({journal,inventory,campaignId:'OTHER',minute}).length,0);
// A physically missing stored vial must NEVER become a silent arcane source.
fail(()=>dossier('finish1',journal,inventory.filter(x=>x.id!=='vial1')),/fyzická.*chybí/);
const broken=Arc.alchemyArcaneTargetRegister({journal,inventory:inventory.filter(x=>x.id!=='vial1'),campaignId:'C',minute});
ok(broken.some(x=>x.finishId==='finish1'&&x.error&&!x.dossier));
// Unsettled monthly Decay makes a claimed Dispel penalty unreliable.
const due=D.alchemyElixirStrength(journal,'C','finish1',minute).nextDueMinute;
fail(()=>dossier('finish1',journal,inventory,due),/Decay/);
fail(()=>dossier('finish0',journal,inventory,-1),/čas/);
fail(()=>dossier('finish0',journal,inventory,0),/dokončena/);
fail(()=>dossier('finish0',journal,inventory,minute,'OTHER'),/dokončen/);
// Real Physic intake consumes the existing vial: Instantaneous no longer
// offers an arcane target, even though its source AS was positive.
const p=I.createAlchemyPhysicImbibing({journal,inventory,campaignId:'C',minute,actorId:'A1',targetId:'B',finishId:'finish1',testSkill:'Aura',ml:65,d100:42,origin:'manual',emptyId:'e-physic',gmConfirmed:true});
const e=V.createAlchemyVialEmpty({journal,inventory,campaignId:'C',minute,actorId:'A1',finishId:'finish1',reason:'Physic consumed by B',confirmedByGM:true});
const post=[...journal,{id:'e-physic',characterId:'A1',calendarCampaignId:'C',campaignMinute:minute,calendarAlchemyVialEmpty:e},
 {id:'u-physic',characterId:'A1',calendarCampaignId:'C',campaignMinute:minute,calendarAlchemyImbibing:p}];
const exhausted=dossier('finish0',post);eq(exhausted.phase,'ended');eq(exhausted.targetable,false);eq(exhausted.dispelEMLPenalty,null);
const used=dossier('finish1',post);eq(used.phase,'used-instant-or-ended');eq(used.targetable,false);eq(used.currentAS,null);
// All 35 original profiles: store-phase eligibility derives exclusively from
// type + validated physical vial, not arbitrary user-supplied duration.
for(const name of names){
 const j=structuredClone(journal.filter(r=>r.id!=='dark'&&r.id!=='emptydark'));
 const finish=j.find(r=>r.id==='finish1');finish.calendarAlchemyFinish.elixirName=name;
 const x=dossier('finish1',j);eq(x.elixirName,name);
 eq(x.use,Profiles.canonicalProfusionProfile(name).use);
 eq(x.duration,Profiles.canonicalProfusionProfile(name).duration);
 eq(x.dispelEMLPenalty,-30);
}
// History and inventories have not been touched by read-only projections.
eq(copy(),baseline);
console.log('PASS Arcane elixir source eligibility 445:',count,'checks');
