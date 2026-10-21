'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createMundaneHerbalCraft,mundaneCraftCandidates,validateMundaneHerbalJournal,assertMundaneHerbalAppendOnly,MUNDANE_CRAFT_SKILLS}=require('../src/integration/hmk-herbal-mundane.js');
const {createHerbPotency,createHerbPreservation,validateHerbalJournal}=require('../src/integration/hmk-herbal-concoctions.js');
const {createSupplyUse,validateSupplyJournal}=require('../src/integration/hmk-foraging-supply-ledger.js');
const {historicalHMKCalendarEntries}=require('../src/integration/hmk-calendar-history.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=v=>{assert.ok(v);n++},fail=(f,re)=>{assert.throws(f,re);n++};
const C='camp-1',A='crafter',row=(id,minute,field,p,c=C,actor=A)=>({id,calendarCampaignId:c,campaignMinute:minute,characterId:actor,[field]:p});
const skills={};const journal=[];
for(let i=0;i<4;i++){
 const craft=MUNDANE_CRAFT_SKILLS[i],sourceId='forage-'+i,assessId='potency-'+i,reserveId='reserve-'+i;
 journal.push(row(sourceId,0,'calendarTrekWildernessProof',{results:[{herbDoses:1,herbName:craft+' herbs'}]}));
 const roll=[1,7,10,7][i];const proof=createHerbPotency({journal,campaignId:C,minute:0,sourceId,resultIndex:0,actorId:A,doses:[{potencyRoll:roll,origin:'manual',decayRolls:[[6,6],[6,6],[6,6]]}]});
 journal.push(row(assessId,0,'calendarHerbPotency',proof));
 const reserve=createSupplyUse({journal,campaignId:C,minute:1,sourceId,resultIndex:0,actorId:A,unit:'herbDoses',quantity:1,disposition:'ingredient-reserved',purpose:craft+' test'});
 journal.push(row(reserveId,1,'calendarForagingSupplyUse',reserve));
 const hlId='herblore-'+i,skillId='craft-'+i;
 journal.push(row(hlId,10,'skillTestProof',{type:'secondary-mastery-value-test',skills:['Herblore'],a:{ml:72,sv:7,roll:41,level:'S'}}));
 journal.push(row(skillId,20,'skillTestProof',{type:'secondary-mastery-value-test',skills:[craft],secondarySkills:['Herblore'],a:{ml:81,sv:8,roll:48,level:'S',secondary:[{index:7,modifier:10}]}}));
 skills[craft]={reserveId,hlId,skillId};
}
const standard=({craft='Brewing',j=journal,minute=20,c=C,actor=A,recipeName='Verified HMK recipe',gmLaborConfirmed=true}={})=>({journal:j,campaignId:c,minute,actorId:actor,
 reserveId:skills[craft].reserveId,herbloreSkillId:skills[craft].hlId,craftSkillId:skills[craft].skillId,
 recipeName,gmLaborConfirmed});
eq(mundaneCraftCandidates(journal,C,20).length,4);
for(const [i,craft] of MUNDANE_CRAFT_SKILLS.entries()){
 const p=createMundaneHerbalCraft(standard({craft}));
 eq(p.craftSkill,craft);eq(p.baseSV,8);eq(p.potencySV,[0,1,2,1][i]);eq(p.finalSV,[8,9,10,9][i]);
 eq(p.herbloreML,72);eq(p.herbloreModifier,10);eq(p.physicalOutput,'not-created');eq(p.campaignId,C);
 journal.push(row('completed-'+i,20,'calendarMundaneHerbalCraft',p));
}
eq(mundaneCraftCandidates(journal,C,20).length,0);eq(validateMundaneHerbalJournal(journal),true);
eq(validateHerbalJournal(journal),true);eq(validateSupplyJournal(journal),true);
fail(()=>createMundaneHerbalCraft(standard()),/již byla použita/);
fail(()=>createMundaneHerbalCraft(standard({c:'other'})),/rezervovaná|kampaně/);
fail(()=>createMundaneHerbalCraft(standard({actor:'other'})),/rezervovaná/);
fail(()=>createMundaneHerbalCraft(standard({j:journal.filter(r=>!r.calendarMundaneHerbalCraft),minute:19})),/SV\/d100|minutě|aktuální/);
fail(()=>createMundaneHerbalCraft(standard({j:journal.filter(r=>!r.calendarMundaneHerbalCraft),gmLaborConfirmed:false})),/GM/);
fail(()=>createMundaneHerbalCraft(standard({j:journal.filter(r=>!r.calendarMundaneHerbalCraft),recipeName:'x'})),/recept/);
const removeLast=structuredClone(journal);removeLast.pop();fail(()=>assertMundaneHerbalAppendOnly(journal,removeLast),/nelze odstranit/);
const changed=structuredClone(journal);changed.at(-1).calendarMundaneHerbalCraft.finalSV=200;fail(()=>validateMundaneHerbalJournal(changed),/pozměněný/);
const changedMinute=structuredClone(journal);changedMinute.at(-1).campaignMinute=21;fail(()=>validateMundaneHerbalJournal(changedMinute),/původ/);
const old=structuredClone(journal),copy=structuredClone(journal);eq(assertMundaneHerbalAppendOnly(old,copy),true);
const clk={campaignId:C,minute:20,characterIds:[A]};const history=historicalHMKCalendarEntries(clk,[{id:A,name:'Crafter'}],journal);
eq(history.filter(x=>x.kind==='herb-mundane-craft').length,4);
yes(history.some(x=>x.note.includes('SV 8 + 2 = 10')));
// Nonmatching HerbML secondary, unsupported ingredient, premature consumption, other campaign.
const before=journal.filter(j=>!j.calendarMundaneHerbalCraft);
const mismatch=structuredClone(before);mismatch.find(r=>r.id==='craft-0').skillTestProof.a.secondary[0].modifier=5;
fail(()=>createMundaneHerbalCraft(standard({j:mismatch})),/Secondary Modifier/);
const noSec=structuredClone(before);delete noSec.find(r=>r.id==='craft-0').skillTestProof.secondarySkills;
fail(()=>createMundaneHerbalCraft(standard({j:noSec})),/Secondary Modifier/);
const other=structuredClone(before);other.find(r=>r.id==='forage-0').calendarTrekWildernessProof.results[0].herbName='coagulant';
fail(()=>createMundaneHerbalCraft(standard({j:other})),/rezervace|Rezervace|Nález musí být/);
const consumed=structuredClone(before);consumed.push(row('used',10,'calendarHerbPotionStart',{reserveId:'reserve-0'}));
fail(()=>createMundaneHerbalCraft(standard({j:consumed})),/již byla použita/);
const reversed=structuredClone(before);reversed.find(r=>r.id==='herblore-0').campaignMinute=21;
fail(()=>createMundaneHerbalCraft(standard({j:reversed})),/SV\/d100 pro Herblore|Herblore musí/);
const noD100=structuredClone(before);delete noD100.find(r=>r.id==='craft-0').skillTestProof.a.roll;
fail(()=>createMundaneHerbalCraft(standard({j:noD100})),/SV\/d100/);
const duplicate=structuredClone(before);const craft=structuredClone(duplicate.find(r=>r.id==='craft-0'));craft.id='copy-skill';duplicate.push(craft);
// Same reserve cannot be used twice, even with different craft SV evidence.
const proof=createMundaneHerbalCraft(standard({j:duplicate}));duplicate.push(row('first-craft',20,'calendarMundaneHerbalCraft',proof));
fail(()=>createMundaneHerbalCraft({...standard({j:duplicate}),craftSkillId:'copy-skill'}),/již byla použita/);
// No craft receipt for a herb that has exhausted its potency.
const gone=structuredClone(before);gone.find(r=>r.id==='potency-0').calendarHerbPotency.doses[0].decayRolls=[[1,1],[1,1],[1,1]];
fail(()=>createMundaneHerbalCraft(standard({j:gone,minute:20*1440})),/pozbyla|aktuální/);
console.log('PASS',n,'mundane Brewing/Cookery/Embalming/Perfumery, secondary mastery, potency SV, campaign audits');
