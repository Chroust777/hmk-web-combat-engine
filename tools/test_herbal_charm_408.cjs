const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHerbPotionAdministration}=require('../src/integration/hmk-herbal-administration.js');
const {herbalCharmEvidence,herbalCharmSkillModifier,validateHerbalCharmSkillJournal}=require('../src/integration/hmk-herbal-charm.js');
const {resolveSkillTest}=require('../src/integration/hmk-skill-test-engine.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const C='campaign-A',M='maker',A='hero',B='resister';
const mk=(type,potency=3,sv=8,id='one',at=10,recipient=A)=>{
 const made={id:'made-'+id,calendarCampaignId:C,campaignMinute:1,characterId:M,
  calendarHerbPotionComplete:{format:'hmk-herb-potion-complete-v1',campaignId:C,minute:1,actorId:M,
   herbType:type,potency,sv,usable:true,expiryMinute:2000}};
 const p=createHerbPotionAdministration({journal:[made],campaignId:C,minute:at,actorId:M,completeId:made.id,
  targetId:recipient,method:type==='aromatic'?'perfume':'ingested',gmConfirmed:true,memberIds:[M,recipient]});
 return [made,{id:'given-'+id,characterId:M,calendarCampaignId:C,campaignMinute:at,calendarHerbPotionAdminister:p}];
};
const j=[...mk('aromatic',3,8,'aroma'),...mk('aphrodisiac',2,7,'aphro',10,B)];
const aromatic=(minute=10,other={})=>herbalCharmEvidence({journal:j,campaignId:C,minute,targetId:A,mode:'aromatic',...other});
const aphro=(minute=10,other={})=>herbalCharmEvidence({journal:j,campaignId:C,minute,targetId:B,mode:'aphrodisiac',...other});
for(const [minute,arBonus,arStage,aphroPen,aphroStage] of [
 [9,0,0,0,0],[10,32,3,-14,2],[249,32,3,-14,2],[250,16,2,-7,1],
 [489,16,2,-7,1],[490,8,1,0,0],[729,8,1,0,0],[730,0,0,0,0]]){
 eq(aromatic(minute).modifier,arBonus);eq(aromatic(minute).stage,arStage);
 eq(aphro(minute).modifier,aphroPen);eq(aphro(minute).stage,aphroStage);
}
eq(aromatic(10).sourceIds,['given-aroma']);eq(aromatic(10).completeIds,['made-aroma']);
eq(aphro(10).sourceIds,['given-aphro']);eq(aromatic(10,{targetId:'other'}).modifier,0);
eq(aphro(10,{targetId:A}).modifier,0);eq(aromatic(10,{campaignId:'other'}).modifier,0);
eq(aphro(10,{campaignId:'other'}).modifier,0);
for(const [pot,sv,bonus] of [[1,2,2],[2,6,12],[3,8,32]]){
 const rows=mk('aromatic',pot,sv,'dose-'+pot);
 eq(herbalCharmEvidence({journal:rows,campaignId:C,minute:10,targetId:A,mode:'aromatic'}).modifier,bonus);
}
const modifier=(targetId,skill='Charm',side='A',other={})=>herbalCharmSkillModifier({journal:j,campaignId:C,minute:10,actorId:targetId,skill,side,...other});
eq(modifier(A).modifier,32);eq(modifier(A,'Discourse'),null);eq(modifier(B,'Will','B'),null);
eq(modifier(B,'Will','B',{opposed:true,attackerSkill:'Charm'}),null);
eq(modifier(B,'Will','B',{opposed:true,attackerSkill:'Charm',seductionConfirmed:true}).modifier,-14);
eq(modifier(B,'Will','B',{opposed:true,attackerSkill:'Guile',seductionConfirmed:true}),null);
eq(modifier(B,'Will','A',{opposed:true,attackerSkill:'Charm',seductionConfirmed:true}),null);
eq(modifier(B,'Will','B',{opposed:false,attackerSkill:'Charm',seductionConfirmed:true}),null);
const before=resolveSkillTest({ml:52,roll:68}),after=resolveSkillTest({ml:52,roll:68,gmModifier:32});
eq(before.rawEML,52);eq(after.rawEML,84);eq(after.ml,52);
const resisted=resolveSkillTest({ml:55,roll:50,gmModifier:-14});eq(resisted.rawEML,41);eq(resisted.ml,55);
const end=mk('aromatic',3,8,'duplicate',12);bad(()=>herbalCharmEvidence({journal:[...j,...end],campaignId:C,minute:12,targetId:A,mode:'aromatic'}),/více současně/);
const corrupt=structuredClone(j);corrupt[1].calendarHerbPotionAdminister.bonus=200;
bad(()=>herbalCharmEvidence({journal:corrupt,campaignId:C,minute:10,targetId:A,mode:'aromatic'}),/neodpovídá/);
const wrongMethod=structuredClone(j);wrongMethod[1].calendarHerbPotionAdminister.method='ingested';
bad(()=>herbalCharmEvidence({journal:wrongMethod,campaignId:C,minute:10,targetId:A,mode:'aromatic'}),/neodpovídá|aplikace|Nepovolená metoda/);
bad(()=>aromatic(2.5),/Charm/);bad(()=>aphro(-1),/Charm/);bad(()=>aromatic(10,{mode:'other'}),/Charm/);
const proof={type:'opposed-success-test',actorId:A,opponentId:B,skills:['Charm','Will'],
 herbalCharmA:modifier(A),herbalCharmB:modifier(B,'Will','B',{opposed:true,attackerSkill:'Charm',seductionConfirmed:true}),
 seductionConfirmed:true};
const stored=[...j,{id:'skill-event',calendarCampaignId:C,campaignMinute:10,characterId:A,skillTestProof:proof}];
ok(validateHerbalCharmSkillJournal(stored));
const badProof=structuredClone(stored);badProof[4].skillTestProof.herbalCharmA.modifier=100;
bad(()=>validateHerbalCharmSkillJournal(badProof),/neodpovídá/);
const badScope=structuredClone(stored);badScope[4].calendarCampaignId='other';
bad(()=>validateHerbalCharmSkillJournal(badScope),/neodpovídá/);
const badTime=structuredClone(stored);badTime[4].campaignMinute=250;
bad(()=>validateHerbalCharmSkillJournal(badTime),/neodpovídá/);
const badSeduction=structuredClone(stored);badSeduction[4].skillTestProof.seductionConfirmed=false;
bad(()=>validateHerbalCharmSkillJournal(badSeduction),/neodpovídá/);
const noA=structuredClone(stored);noA[4].skillTestProof.herbalCharmA=null;
ok(validateHerbalCharmSkillJournal(noA)); // provenance validation of B does not infer undocumented A
const legacy=[...j,{id:'legacy',characterId:A,calendarCampaignId:C,campaignMinute:10,skillTestProof:{type:'secondary-mastery-test',actorId:A,skills:['Charm'],a:{ml:52}}}];
ok(validateHerbalCharmSkillJournal(legacy));
const plain=[...j,{id:'plain',characterId:A,calendarCampaignId:C,campaignMinute:10,skillTestProof:{type:'secondary-mastery-test',actorId:A,skills:['Discourse'],herbalCharmA:null,herbalCharmB:null}}];
ok(validateHerbalCharmSkillJournal(plain));
const assistance=[...j,{id:'assist',characterId:A,calendarCampaignId:C,campaignMinute:10,skillTestProof:{type:'assistance-success-test',actorId:A,skill:'Charm',herbalCharmA:modifier(A)}}];
ok(validateHerbalCharmSkillJournal(assistance));
console.log('PASS',n,'Aromatic / Aphrodisiac: correct scope, 4h stages, replays, no stacking, original Charm/Resistance rolls');
