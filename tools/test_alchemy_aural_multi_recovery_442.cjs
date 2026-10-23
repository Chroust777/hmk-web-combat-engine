'use strict';
/** HMK pp.190,269–270: alchemy Aural Shock from three distinct source
 * events shares one Combat State and one existing daily Will recovery.
 */
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const ext=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return ext(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {availableSpellAuralRecoveries,persistSpellAuralRecovery}=require('../src/integration/hmk-spell-aural-recovery.js');
let tests=0;const eq=(a,b)=>{assert.deepEqual(a,b);tests++};const yes=x=>{assert.ok(x);tests++};
const initial=initialCombatState();initial.fatigue.otherWeakness=15;
for(const [i,type] of ['hmk-alchemy-erudition-aural','hmk-alchemy-footpad-aural','hmk-alchemy-egosight-aural'].entries())
 initial.events.push({id:'source-'+i,type,round:1,details:{auralShock:1,weaknessAdded:5}});
const person={id:'B',name:'Recipient',hmk:{attributes:{wil:14},arcane:{auralShockLevels:3},combatState:initial}};
const original={schemaVersion:1,characters:[person],items:[],inventory:[],trash:[],journal:[],campaignClock:{minute:2880}};
let stored=JSON.stringify(original);
const storage={getItem:k=>k==='ledger'?stored:null,setItem:(k,v)=>{if(k==='ledger')stored=String(v)}};
eq(availableSpellAuralRecoveries(original).map(x=>x.levels),[3]);
const first=persistSpellAuralRecovery({document:original,characterId:'B',eventId:'aural-day2',gameDay:2,
 d100:20,gmConfirmed:true,gmConfirmedDayElapsed:true,storage,key:'ledger',baseline:stored});
eq(first.ok,true);eq(first.document.characters[0].hmk.arcane.auralShockLevels,1);
eq(first.document.characters[0].hmk.combatState.fatigue.otherWeakness,5);
eq(first.document.journal.filter(x=>x.combatProof?.actionKind==='aural-shock-recovery').length,1);
eq(first.document.campaignClock.minute,2880);
const stale=persistSpellAuralRecovery({document:original,characterId:'B',eventId:'aural-day2-stale',gameDay:2,
 d100:20,gmConfirmed:true,gmConfirmedDayElapsed:true,storage,key:'ledger',baseline:JSON.stringify(original)});
eq(stale.ok,false);eq(stale.code,'concurrent-change');
let date2=structuredClone(first.document);date2.campaignClock.minute=4320;stored=JSON.stringify(date2);
const second=persistSpellAuralRecovery({document:date2,characterId:'B',eventId:'aural-day3',gameDay:3,
 d100:21,gmConfirmed:true,gmConfirmedDayElapsed:true,storage,key:'ledger',baseline:stored});
eq(second.ok,true);eq(second.document.characters[0].hmk.arcane.auralShockLevels,0);
eq(second.document.characters[0].hmk.combatState.fatigue.otherWeakness,0);
eq(availableSpellAuralRecoveries(second.document),[]);
eq(second.document.characters[0].hmk.combatState.events.filter(e=>e.id.startsWith('source-')).length,3);
eq(second.document.journal.length,2);
const changed=JSON.parse(stored);eq(changed.journal,second.document.journal);
yes(first.document.journal.every(x=>x.combatProof?.physicalDice?.[0]?.value===20));
console.log('PASS Alchemy three-source shared Aural recovery 442:',tests,'assertions');
