/** HMK pp.188,203–204,255: one incident per source CS; no suppression.
 * Uses the genuine original spellstart/campaign fixture from the 461 test.
 */
const fs=require('fs'),assert=require('node:assert/strict'),cp=require('child_process');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const old=require.extensions['.js'];require.extensions['.js']=(m,p)=>{
 if(!p.includes('/src/'))return old(m,p);
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p);
};
const {prepareNeutralTotalReleaseCommit,persistNeutralTotalReleaseCommit}=require('../src/integration/hmk-neutral-total-release-writer.js');
const {validateNeutralTotalReleaseHistory}=require('../src/integration/hmk-neutral-total-release-invariant.js');
const {persistSpellPsycheTraitChoice}=require('../src/integration/hmk-spell-psyche-trait-choice.js');
const {persistVerifiedCombatSnapshot}=require('../src/integration/verified-combat-storage.js');
const fixture=JSON.parse(cp.execFileSync(process.execPath,[require.resolve('./test_neutral_total_release_commit_461.cjs')],
 {encoding:'utf8',env:{...process.env,HMK_TOTAL_RELEASE_UI_FIXTURE:'1'}}));
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};const bad=(f,match)=>{assert.throws(f,match);checks++};
const getStore=before=>({data:JSON.stringify(before),getItem(){return this.data},setItem(_,v){this.data=v}});
function scenario(extraSource){
 const source=structuredClone(fixture.a2);
 if(extraSource){
  const u=source.document.combatRuntime.sequence.spatialUnits.find(u=>u.id==='A1');
  u.x=5;u.y=5.2;
  source.sourceCensus.find(s=>s.x===8).x=5;
  source.sourceCensus.find(s=>s.y===9).y=5.2;
  source.ticks[0].sources=structuredClone(source.sourceCensus);
 }
 // The first canonical specimen at (5,5) is NOT within an origin radius
 // of 2.5 feet. The vortex re-centres on the closest destination (5,5),
 // then its 2.5-foot radius reaches that source; A1 (1,4) is not affected.
 if(extraSource){
  const candidates=source.sourceCensus.map(s=>s.id).sort();
  source.ticks[0].physicalSelectionDie={faces:2,value:candidates.indexOf(source.sourceCensus[0].id)+1,
   origin:'GM-physical-die'};
  source.ticks[0].selectedSourceId=source.sourceCensus[0].id;
 }
 source.ticks[0].rolls=(extraSource?source.sourceCensus:[source.sourceCensus[0]])
  .map(s=>({sourceId:s.id,d100:5}));
 return source;
}
// One physical CS source roll, separate from Misfire PSY3.
const a=scenario(false);const stage=prepareNeutralTotalReleaseCommit(a),sourceId=a.ticks[0].rolls[0].sourceId;
const caster=stage.nextDocument.characters.find(c=>c.id==='Mage');
const receipt=stage.nextDocument.journal.at(-1).calendarNeutralTotalRelease;
const child='fire-460:vortex-cs:'+sourceId;
eq(caster.hmk.combatState.morale.psycheStress,4);
eq(caster.hmk.arcane.pendingPsycheTraitChoice,{sourceEventId:'fire-460',levels:3});
eq(caster.hmk.arcane.pendingPsycheTraitChoices,[{sourceEventId:child,sourceId,levels:1}]);
eq(receipt.vortex.casterPsycheStress,1);
eq(receipt.vortex.additionalPsycheDebts,[{sourceEventId:child,sourceId,levels:1}]);
eq(caster.hmk.combatState.events.some(e=>e.id===child&&e.details?.physicalD100===5),true);
eq(validateNeutralTotalReleaseHistory(stage.nextDocument),true);
const store=getStore(a.document),baseline=store.data;
let res=persistNeutralTotalReleaseCommit({stage,document:a.document,storage:store,key:'campaign',baseline});
eq(res.ok,true);
let document=res.document;const trait1=persistSpellPsycheTraitChoice({document,characterId:'Mage',
 sourceEventId:'fire-460',trait:'Nervous',gmConfirmed:true,storage:store,key:'campaign',baseline:store.data});
eq(trait1.ok,true);
document=trait1.document;
eq(document.characters[0].hmk.arcane.pendingPsycheTraitChoice,{sourceEventId:child,levels:1});
eq(document.characters[0].hmk.arcane.pendingPsycheTraitChoices,[]);
eq(validateNeutralTotalReleaseHistory(document),true);
const trait2=persistSpellPsycheTraitChoice({document,characterId:'Mage',sourceEventId:child,
 trait:'Haunted',gmConfirmed:true,storage:store,key:'campaign',baseline:store.data});
eq(trait2.ok,true);
document=trait2.document;
eq(document.characters[0].hmk.arcane.pendingPsycheTraitChoice,null);
eq(document.characters[0].hmk.arcane.psycheTraumas.length,2);
eq(validateNeutralTotalReleaseHistory(document),true);
const lost=structuredClone(stage.nextDocument);lost.characters[0].hmk.arcane.pendingPsycheTraitChoices=[];
bad(()=>validateNeutralTotalReleaseHistory(lost),/Psyche dluh/);
const forged=structuredClone(stage.nextDocument);forged.journal.at(-1).calendarNeutralTotalRelease.vortex.additionalPsycheDebts=[];
bad(()=>validateNeutralTotalReleaseHistory(forged),/CS zdroje/);
const forgedStress=structuredClone(stage.nextDocument);forgedStress.journal.at(-1).calendarNeutralTotalRelease.vortex.casterPsycheStress=0;
bad(()=>validateNeutralTotalReleaseHistory(forgedStress),/CS zdroje/);
const forgedEvent=structuredClone(stage.nextDocument);forgedEvent.characters[0].hmk.combatState.events.pop();
bad(()=>validateNeutralTotalReleaseHistory(forgedEvent),/CS Psyche důkaz/);
// Two different CS sources MUST produce two distinct new PSY1 debts,
// never an illicit single PSY2 or merging with Total Release PSY3.
const multi=scenario(true),multiStage=prepareNeutralTotalReleaseCommit(multi);
const extra=multiStage.nextDocument.characters[0].hmk.arcane.pendingPsycheTraitChoices;
eq(extra.length,2);
eq(extra.map(x=>x.levels),[1,1]);
eq(new Set(extra.map(x=>x.sourceEventId)).size,2);
eq(multiStage.nextDocument.characters[0].hmk.combatState.morale.psycheStress,5);
eq(validateNeutralTotalReleaseHistory(multiStage.nextDocument),true);
const direct=structuredClone(stage.nextDocument);direct.characters[0].hmk.arcane.pendingPsycheTraitChoices=[];
const store2=getStore(a.document);const denied=persistVerifiedCombatSnapshot({storage:store2,key:'campaign',baseline:store2.data,serialized:JSON.stringify(direct)});
eq(denied.code,'invalid-neutral-total-release');
console.log('PASS Native Vortex CS separate Psyche incident 462:',checks,'checks');
