const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const original=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return original(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const {createHallucinogenicTranscendence,createHallucinogenicVeil,createHallucinogenicTranceStart,validateHallucinogenicJournal}=require('../src/integration/hmk-herbal-hallucinogenic.js');
const {createTranscendenceWill,pendingTranscendenceWill,applyTranscendenceWill,requireTranscendenceWillGMTimeMayAdvance,validateTranscendenceWillJournal,assertTranscendenceWillAppendOnly}=require('../src/integration/hmk-herbal-transcendence-will.js');
const {initialCombatState,validateCombatState}=require('../src/integration/persistent-combat-state.js');
const {availableSpellAuralRecoveries,persistSpellAuralRecovery}=require('../src/integration/hmk-spell-aural-recovery.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},ok=x=>{assert.ok(x);n++},bad=(fn,re)=>{assert.throws(fn,re);n++};
const C='WILL-A',B='WILL-B',A='herbalist',X='dreamer',entry=(id,t,type,p,who=X,camp=C)=>({id,calendarCampaignId:camp,campaignMinute:t,characterId:who,createdAt:'2026-10-21T15:00:00Z',title:'test',body:'test',[type]:p});
const admin=entry('dose',10,'calendarHerbPotionAdminister',{herbType:'hallucinogenic',targetId:X,sv:8,bonus:32,hallucinogenicTracked:true});
let j=[admin];
const start=createHallucinogenicTranceStart({journal:j,campaignId:C,applicationId:'dose',minute:10,targetId:X,tranceSkillML:60,consciousConfirmed:true,uninterruptedIntended:true,gmConfirmed:true});j.push(entry('start',10,'calendarHerbHallucinogenicTranceStart',start));
const veil=createHallucinogenicVeil({journal:j,campaignId:C,startId:'start',minute:17,targetId:X,concentrationUninterrupted:true,gmConfirmed:true,transcendenceTracked:true});j.push(entry('veil',17,'calendarHerbHallucinogenicVeil',veil));
const trans=createHallucinogenicTranscendence({journal:j,campaignId:C,veilId:'veil',targetId:X,minute:17,tranceML:60,fatiguePenalty:5,d100:100,gmConfirmed:true,reembodimentTracked:true,willIndex:7,willTracked:true});eq(trans.sl,'CF');eq(trans.requiresWillTest,true);eq(trans.willTracked,true);
j.push(entry('cf',17,'calendarHerbTranscendence',trans));ok(validateHallucinogenicJournal(j));
eq(pendingTranscendenceWill(j,C),[{transcendenceId:'cf',targetId:X,dueMinute:17}]);eq(pendingTranscendenceWill(j,B),[]);
bad(()=>requireTranscendenceWillGMTimeMayAdvance({journal:j,campaignId:C,beforeMinute:17,afterMinute:18}),/Will/);
ok(requireTranscendenceWillGMTimeMayAdvance({journal:j,campaignId:C,beforeMinute:17,afterMinute:17}));
ok(requireTranscendenceWillGMTimeMayAdvance({journal:j,campaignId:B,beforeMinute:17,afterMinute:18}));
const args={journal:j,campaignId:C,transcendenceId:'cf',targetId:X,minute:17,willAttribute:10,gmConfirmed:true};
for(const [die,sl,lvl] of [[100,'CF',2],[90,'CF',2],[75,'CF',2],[54,'F',1],[52,'F',1],[41,'S',0],[5,'CS',0]]){
 const p=createTranscendenceWill({...args,d100:die});eq(p.sl,sl);eq(p.auralShockAdded,lvl);eq(p.weaknessAdded,5*lvl);eq(p.willEML,50);
 const next=applyTranscendenceWill({state:initialCombatState(),arcane:{},round:1,eventId:'astral-'+die,proof:p});
 eq(next.arcane.auralShockLevels,lvl);eq(next.state.fatigue.otherWeakness,5*lvl);eq(next.state.events[0].type,'hmk-astral-transcendence-aural');ok(validateCombatState(next.state));
}
for(const [change,re] of [[{targetId:'other'},/postavy/],[{minute:18},/minuty/],[{campaignId:B},/chybí/],[{transcendenceId:'x'},/chybí/],[{willAttribute:0},/Will attribute/],[{willAttribute:41},/Will attribute/],[{d100:0},/Will attribute/],[{d100:101},/Will attribute/],[{gmConfirmed:false},/GM potvrzení/],[{dieOrigin:'not-real'},/původ/]])bad(()=>createTranscendenceWill({...args,d100:54,...change}),re);
const p=createTranscendenceWill({...args,d100:100});const stored=entry('proof',17,'calendarHerbTranscendenceWill',p);const withProof=[...j,stored];
ok(validateTranscendenceWillJournal(withProof));eq(pendingTranscendenceWill(withProof,C),[]);ok(requireTranscendenceWillGMTimeMayAdvance({journal:withProof,campaignId:C,beforeMinute:17,afterMinute:20}));
bad(()=>createTranscendenceWill({...args,journal:withProof,d100:54}),/již doložen/);
for(const prop of ['d100','sl','auralShockAdded','weaknessAdded','willEML','fatiguePenalty','dieOrigin','targetId','minute']){
 const tampered=structuredClone(withProof);tampered.at(-1).calendarHerbTranscendenceWill[prop]=prop==='sl'?'S':prop==='dieOrigin'?'cryptographic-software-die':prop==='targetId'?'other':123;
 if(prop!=='dieOrigin')bad(()=>validateTranscendenceWillJournal(tampered),/důkaz|Will|nesouhlasí|postava|minuty/);
 bad(()=>assertTranscendenceWillAppendOnly(withProof,tampered),/nelze/);
}
bad(()=>assertTranscendenceWillAppendOnly(withProof,j),/nelze/);
const base=applyTranscendenceWill({state:initialCombatState(),round:1,eventId:'proof',proof:p});
const account={id:X,name:'Dreamer',hmk:{attributes:{wil:10},arcane:base.arcane,combatState:base.state}};
eq(availableSpellAuralRecoveries({characters:[account],combatRuntime:null}).length,1);
eq(availableSpellAuralRecoveries({characters:[{...account,hmk:{...account.hmk,arcane:{auralShockLevels:0}}}],combatRuntime:null}).length,0);
// Existing shock sources combine in the same ledger; no duplicate status or clock change.
const priorState=initialCombatState();priorState.fatigue.otherWeakness=5;
const stackedProof=createTranscendenceWill({...args,d100:100,fatiguePenalty:5});
const stacked=applyTranscendenceWill({state:priorState,arcane:{auralShockLevels:1},round:1,eventId:'stack',proof:stackedProof});eq(stacked.arcane.auralShockLevels,3);eq(stacked.state.fatigue.otherWeakness,15);
bad(()=>applyTranscendenceWill({state:priorState,arcane:{auralShockLevels:1},round:1,eventId:'fake-fatigue',proof:p}),/Fatigue/);
const legacy={...trans};delete legacy.willTracked;const old=[...j.slice(0,-1),entry('old-cf',17,'calendarHerbTranscendence',legacy)];eq(pendingTranscendenceWill(old,C).length,0);ok(requireTranscendenceWillGMTimeMayAdvance({journal:old,campaignId:C,beforeMinute:17,afterMinute:18}));
// Existing Aural Shock Recovery: an actual documented later GM day must reduce
// the new astral-origin Aural levels and corresponding weakness, not merely
// declare the case as eligible in a UI list.
const dayTwo={schemaVersion:1,characters:[account],items:[],inventory:[],trash:[],
 journal:[...withProof],campaignClock:{format:'hmk-campaign-calendar-v1',campaignId:C,minute:17+1440}};
const baseline=JSON.stringify(dayTwo);let contents=baseline;
const storage={getItem:k=>contents,setItem:(k,v)=>{contents=v}};
const recovery=persistSpellAuralRecovery({document:dayTwo,characterId:X,eventId:'recovery-after-day',gameDay:2,
 d100:21,diceOrigin:'manual',gmConfirmed:true,gmConfirmedDayElapsed:true,storage,key:'db',baseline});
eq(recovery.ok,true);eq(recovery.document.characters[0].hmk.arcane.auralShockLevels,1);
eq(recovery.document.characters[0].hmk.combatState.fatigue.otherWeakness,5);
const recovered=recovery.document.characters[0];ok(recovered.hmk.combatState.events.some(e=>e.type==='hmk-aural-shock-recovery'));
console.log('PASS',n,'Transcendence CF → Will → Aural Shock / Weakness / Recovery provenance, campaign isolation, replay and legacy');
