'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../repo'));
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const original=require.extensions['.js'];
require.extensions['.js']=(mod,p)=>p.startsWith(root+'/src/')?mod._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,p):original(mod,p);
const {resolveBestiaryFrostAV93725:av,parseBestiaryFrostSites93725:sites}=require(root+'/src/integration/hmk-bestiary-frost-auto-av-93725.js');
let n=0;const eq=(a,b)=>{assert.deepEqual(a,b);n++},yes=(x,m)=>{assert.ok(x,m);n++},bad=(f,re)=>{assert.throws(f,re);n++};
const beast={combat:{av:{f:3}}},noArmour=[];
const native=av({profile:beast,inventory:noArmour,beastId:'wolf',ownerAnimalId:'stable1'});
eq(native.value,3);yes(native.ready);eq(native.wornCount,0);
eq(sites('flg;left;22;10\nflg;right;;\nhd;none;15;0;nose',native),[
 {locationId:'flg',side:'left',av:3,shockRoll:22,fatigue:10,facialFeature:'',wingAsLimbConfirmed:false},
 {locationId:'flg',side:'right',av:3,shockRoll:null,fatigue:null,facialFeature:'',wingAsLimbConfirmed:false},
 {locationId:'hd',side:'none',av:3,shockRoll:15,fatigue:0,facialFeature:'nose',wingAsLimbConfirmed:false}]);
for(const value of [0,1,3,4,17,100]){
 const proof=av({profile:{combat:{av:{f:value}}},inventory:[],beastId:'beast'});
 yes(proof.ready);eq(proof.value,value);eq(sites('flg;left;25;10',proof)[0].av,value);
}
const foreign=[{id:'cloth',characterId:'fighter',slot:'worn',snapshot:{category:'armor'}}];
eq(av({profile:beast,inventory:foreign,beastId:'wolf'}).value,3);
for(const id of ['wolf','stable1']){const w=[...foreign,{id:'tack',characterId:id,slot:'worn',snapshot:{category:'armor'}}];const p=av({profile:beast,inventory:w,beastId:'wolf',ownerAnimalId:'stable1'});eq(p.ready,false);bad(()=>sites('flg;left;25;0',p),/mapování|doložen|výstroj/);}
eq(av({profile:{combat:{av:{f:4}}},inventory:[],beastId:'wolf'}).value,4);
for(const malformed of ['flg;left;3;15;0','flg;left;5','flg;left;2;15;0;extra','abc;none;99;0;bad'])bad(()=>sites(malformed,native),/formát|polí|Subsite|5/);
bad(()=>sites('flg;left;10;0',{ready:false,reason:'missing'}),/missing/);
eq(av({profile:{combat:{av:{f:null}}},inventory:[],beastId:'beast'}).ready,false);
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
yes(!app.includes('name="locationAV"'),'no manually typed beast locationAV');
yes(!app.includes('name="magicAreaAV"'),'no manually typed beast magicAreaAV');
yes(app.includes('sites=parseBestiaryFrostSites93725(String(v.sites||\'\'),frostAV)'),'active Frost sequence reads verified AV');
yes(app.includes('areaAV:frostAV.value,zoneNumber:Number(v.magicZN)'),'no forged magic area AV');
yes(app.includes('calculateWeatherAreaAV({inventory:data.inventory,actorId:actor.id})'),'Weather uses worn inventory');
yes(app.includes('resolveLiveCombatArmour({inventory:data.inventory,targetId:target.id'),'Combat uses worn inventory');
const helper=app.match(/function combatActorLocked93725\(\.\.\.ids\)\{[\s\S]*?\n\}/)?.[0];yes(!!helper);
function locks(seq,stored,ids){const c={combatInitiativeSequence:seq,data:{combatRuntime:{sequence:stored}}};vm.runInNewContext(helper+'\nresult=combatActorLocked93725(...testIds);',{...c,testIds:ids,result:false});return vm.runInNewContext(helper+'\ncombatActorLocked93725(...testIds)',{...c,testIds:ids});}
eq(locks({order:['fighter']},null,['bystander']),false);eq(locks({order:['fighter']},null,['fighter']),true);eq(locks({order:['fighter']},null,['bystander','fighter']),true);
eq(locks(null,{order:['fighter']},['fighter']),true);eq(locks(null,{order:['fighter']},['bystander']),false);
const scopes=['[data-inv-bulk-action]','inventory-chest-outfit-form','[data-hmk-commit-hand-597]','[data-fill-water]','water-transfer-form','[data-chest-move]','inventory-edit-form','[data-loss-ration]','[data-loss-water]','[data-transfer-inv]','inventory-transfer-form','inventory-loss-form'];
for(const scope of scopes)yes(app.includes(scope),'active UI scope exists: '+scope);
yes((app.match(/combatActorLocked93725\(/g)||[]).length>=35,'participant-specific guards installed across inventory flows');
for(const original of ["if(combatInitiativeSequence)return alert('Předání je během Initiative zablokováno.')", "if(combatInitiativeSequence)return alert('Nelze měnit Truhlici během Initiative.')", "if(combatInitiativeSequence)return alert('Ztrátu během Initiative řeší Combat akce.')"])
 yes(!app.includes(original),'obsolete global inventory lock removed');
yes(app.includes("const recipientActorId=data.inventory.find(i=>i.id===f.get('recipientItemId'))?.characterId;"),'water recipient must be checked by inventory owner');
yes(app.includes('combatActorLocked93725(selected,recipientActorId)'),'water transfer protects actual recipient');
yes(app.includes('combatActorLocked93725(selected,new FormData(e.target).get(\'recipientId\'))'),'item/food transfer protects recipient');
yes(app.includes('assertLegacyMutationDoesNotChangeCombat(previous,data'), 'authoritative fighter invariants still enabled');
yes(app.includes('assertGlobalActionLedgerAppendOnly(previous,data'),'append-only ledger still enabled');
yes(app.includes('assertScheduledHitCanCommit('),'combat turn order still enforced');
const additionalIndependent=[
 ['Talisman', 'combatActorLocked93725(shaman.id,recipient?.id)'],
 ['Recorded Skill Result', 'combatActorLocked93725(selected))throw Error(\'Následek SR'],
 ['Trance', 'combatActorLocked93725(targetId))throw Error(\'Zahájení Trance'],
 ['Reembodiment', 'combatActorLocked93725(targetId))throw Error(\'Reembodiment'],
 ['Herbal vial discard', 'Ztráta obsahu u účastníka Initiative patří do Combat.'],
 ['Herbal vial binding', 'Plnění lahvičky účastníka Initiative patří do Combat.'],
 ['Herbal poison', 'combatActorLocked93725(actorId,targetId))throw Error(\'Poison účastníka Initiative'],
 ['Alchemy vial', 'combatActorLocked93725(v.actorId))throw Error(\'Nádoba účastníka Initiative'],
 ['Library acquisition', 'combatActorLocked93725(receiver.id))throw Error(\'Nákup účastníka Initiative']
];
for (const [label,snippet] of additionalIndependent)yes(app.includes(snippet),label+' participant scoping');
console.log(`PASS ${n} v93.725 combined AV/Combat independent-write assertions`);
