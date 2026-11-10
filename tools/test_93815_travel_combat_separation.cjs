'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),prior=require.extensions['.js'];
require.extensions['.js']=(m,p)=>p.startsWith(path.join(root,'src')+path.sep)?
 m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p):prior(m,p);
const {initialCombatState}=require('../src/integration/persistent-combat-state.js');
const {resolveTrekAnimalReadiness93815,trekRegisteredAnimalHealth,assertNoActiveBestiaryTravelConflict93815}=require('../src/integration/hmk-trekking-animal-health.js');
let count=0;
function yes(fn){assert.ok(fn());count++;}
function equal(a,b){assert.deepStrictEqual(a,b);count++;}
function bad(fn,re){assert.throws(fn,re);count++;}
function animal(id,breed='palfrey',name='Blesk'){
 return {id,name,kind:'NPC',hmk:{verifiedMountedBreed:breed,healthState:initialCombatState()}};
}
function read({stable=[],legacy=[],profiles=[],active=[]}){
 return resolveTrekAnimalReadiness93815({stableAnimals:stable,legacyAnimals:legacy,registeredProfiles:profiles,activeProfileIds:active});
}
const pony=animal('st-01'),own={id:pony.id,breed:'palfrey',name:pony.name};
const baseline=structuredClone(pony);
equal(read({stable:[own]}),[]); // Stáj ownership does not fabricate a healthy record
// Real health record: read only, one snapshot; identity from the Stable.
equal(read({stable:[own],profiles:[pony],active:[pony.id]}).length,1);
equal(pony,baseline);
// Same label is not an identity. Both animals remain independent.
const pony2=animal('st-02','palfrey','Blesk');
equal(read({stable:[own,{id:pony2.id,breed:'palfrey',name:'Blesk'}],profiles:[pony,pony2],active:[pony.id,pony2.id]}).length,2);
// A stable animal must never enter via both the Stable and legacy profile.
bad(()=>read({stable:[own],legacy:[pony],profiles:[pony],active:[pony.id]}),/dvakrát/);
// Health of another unselected animal can never change current travel.
const sick=animal('other');sick.hmk.healthState.fatigue.weariness=40;
equal(read({stable:[own],profiles:[pony,sick],active:[pony.id,sick.id]}).length,1);
// Confirmed true fatigue and severe shocks do constrain actual movement.
pony.hmk.healthState.fatigue.weariness=20;
equal(read({stable:[own],profiles:[pony],active:[pony.id]})[0].fatigue,20);
pony.hmk.healthState.fatigue.weariness=40;
bad(()=>read({stable:[own],profiles:[pony],active:[pony.id]}),/Fatigue/);
pony.hmk.healthState.fatigue.weariness=0;
pony.hmk.healthState.shock='INC';
bad(()=>read({stable:[own],profiles:[pony],active:[pony.id]}),/Shock/);
pony.hmk.healthState.shock='NONE';
// A partially-linked health profile must not be silently dropped.
bad(()=>read({stable:[own],profiles:[pony],active:[]}),/není aktivní/);
pony.hmk.verifiedMountedBreed='bovine';
bad(()=>read({stable:[own],profiles:[pony],active:[pony.id]}),/jiné nebo nedoložené plemeno/);
pony.hmk.verifiedMountedBreed='palfrey';
pony.hmk.healthState=null;
bad(()=>read({stable:[own],profiles:[pony],active:[pony.id]}),/úplný/);
pony.hmk.healthState=initialCombatState();
// Never accept same ID for human/profile duplicate; never adopt same-name animal.
bad(()=>read({stable:[own],profiles:[pony,pony],active:[pony.id]}),/duplicitní ID/);
bad(()=>read({stable:[own,own],profiles:[pony],active:[pony.id]}),/dvakrát/);
// Historic actor, not registered in Stable, still has a separate explicit path.
const old=animal('legacy-01');equal(read({legacy:[old],profiles:[old],active:[old.id]})[0].actorId,old.id);
bad(()=>read({legacy:[old],profiles:[old],active:[]}),/aktivní/);
// Unit purity – changing the *returned* transport snapshot cannot mutate Combat.
const asFound=read({legacy:[old],profiles:[old],active:[old.id]});
asFound[0].fatigue=999;
equal(trekRegisteredAnimalHealth(old).fatigue,0);
// A previously linked Bestiary encounter is another source of true trauma.
// This split ledger must never silently pass a wounded animal as healthy.
const birth={id:'journal-1',bestiaryEncounter:{action:'create',id:'enc-1',campaignId:'test',ownerAnimalId:'st-01',ownerId:'pc-1'}};
const trauma={id:'journal-2',bestiaryTrauma:{format:'hmk-bestiary-trauma-567-v1',kind:'hit',campaignId:'test',targetId:'enc-1',minute:100,shock:{incoming:'none'},woundId:'wound-b',location:{id:'lf',name:'Left Foreleg'},aspect:'b',injury:{level:3},bleeding:false}};
yes(()=>assertNoActiveBestiaryTravelConflict93815({journal:[],campaignId:'test',animalIds:['st-01']}));
yes(()=>assertNoActiveBestiaryTravelConflict93815({journal:[birth],campaignId:'test',animalIds:['st-01']}));
yes(()=>assertNoActiveBestiaryTravelConflict93815({journal:[birth,trauma],campaignId:'test',animalIds:['unselected']}));
bad(()=>assertNoActiveBestiaryTravelConflict93815({journal:[birth,trauma],campaignId:'test',animalIds:['st-01']}),/Bestiář eviduje aktivní zdravotní následek/);
// Owner transfer must not hide the preceding unresolved wound.
const newOwner={id:'journal-3',bestiaryEncounter:{...birth.bestiaryEncounter,id:'enc-2',ownerId:'pc-2'}};
bad(()=>assertNoActiveBestiaryTravelConflict93815({journal:[birth,trauma,newOwner],campaignId:'test',animalIds:['st-01']}),/Bestiář eviduje aktivní zdravotní následek/);
const oldFormat={id:'journal-4',bestiaryTrauma:{...trauma.bestiaryTrauma,format:'hmk-unknown-medical-format'}};
bad(()=>assertNoActiveBestiaryTravelConflict93815({journal:[birth,oldFormat],campaignId:'test',animalIds:['st-01']}),/neověřený zdravotní formát/);
equal([birth,trauma,newOwner],[structuredClone(birth),structuredClone(trauma),structuredClone(newOwner)]);
console.log('PASS',count,'travel/combat ownership identity, readable health, no synthetic state, no duplicate roster, mismatched/inactive registrations fail closed, and proof isolation');
