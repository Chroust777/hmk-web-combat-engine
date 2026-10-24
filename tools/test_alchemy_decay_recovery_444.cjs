'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}})();
const prev=require.extensions['.js'];require.extensions['.js']=(m,p)=>{if(!p.includes('/src/'))return prev(m,p);m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,p)};
const D=require('../src/integration/hmk-alchemy-decay.js');
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++},ok=x=>{assert.ok(x);checks++},fail=(f,regex)=>{assert.throws(f,regex);checks++};
const PERIOD=D.ALCHEMY_DECAY_PERIOD_MINUTES;const row=(id,minute,key,proof,c='C',actor='A')=>({id,characterId:actor,calendarCampaignId:c,campaignMinute:minute,[key]:proof});
const finished={result:'completed',baseAS:6,elixirName:'Darkvision',campaignId:'C',minute:100};
const original=[row('f',100,'calendarAlchemyFinish',finished)];
const snapshot=structuredClone(original),due=100+PERIOD,now=100+PERIOD*3+100;
const independent=row('other',due+20,'calendarNutritionDay',{sourceId:'independent'},'C');
const journal=[...original,independent];
const create=(d10,extra={})=>D.createAlchemyDecay({journal,campaignId:'C',minute:D.alchemyElixirStrength(journal,'C','f').nextDueMinute,recordedMinute:now,actorId:'A',finishId:'f',d10,origin:'manual',gmConfirmed:true,gmMissedConfirmed:true,...extra});
eq(D.pendingAlchemyDecay(journal,'C',now)[0].nextDueMinute,due);
fail(()=>create(3,{gmMissedConfirmed:false}),/výslovně potvrdit/);
fail(()=>create(3,{recordedMinute:due-1}),/nutná kampaň/);
fail(()=>create(0),/doložený hod/);
fail(()=>create(11),/doložený hod/);
fail(()=>create(3,{origin:'unknown'}),/doložený hod/);
const expected=[4,2,0];
for(let i=0;i<expected.length;i++){
 const p=create(10);
 eq(p.period,i+1);eq(p.asBefore,i===0?6:expected[i-1]);eq(p.asAfter,expected[i]);
 eq(p.minute,due+i*PERIOD);eq(p.recordedMinute,now);eq(p.dueMinute,p.minute);
 eq(p.reconstructed,true);eq(p.gmMissedConfirmed,true);eq(p.gmConfirmed,true);
 journal.push(row('retro'+i,now,'calendarAlchemyDecay',p));
 ok(D.validateAlchemyDecayJournal(journal));
 eq(D.pendingAlchemyDecay(journal,'C',now).length,i<2?1:0);
}
eq(D.alchemyElixirStrength(journal,'C','f').currentAS,0);
eq(D.alchemyElixirStrength(journal,'C','f').nextDueMinute,null);
eq(journal[0],snapshot[0]);eq(journal[1],independent);
ok(D.assertAlchemyDecayAppendOnly(journal,structuredClone(journal)));
// Earlier historical snapshots are not stealth-edited by present-day evidence.
eq(D.alchemyElixirStrength(journal,'C','f',due+10).currentAS,6);
const wrong=structuredClone(journal);wrong.at(-1).calendarAlchemyDecay.recordedMinute=now+1;
fail(()=>D.validateAlchemyDecayJournal(wrong),/kontext|nesouhlasí/);
const wrongDue=structuredClone(journal);wrongDue.at(-1).calendarAlchemyDecay.dueMinute++;
fail(()=>D.validateAlchemyDecayJournal(wrongDue),/nesouhlasí|historický důkaz/);
const wrongAS=structuredClone(journal);wrongAS.at(-1).calendarAlchemyDecay.asAfter=2;
fail(()=>D.validateAlchemyDecayJournal(wrongAS),/nesouhlasí|historický důkaz/);
fail(()=>D.assertAlchemyDecayAppendOnly(journal,wrongAS),/nelze změnit/);
const moved=structuredClone(journal);moved.at(-1).campaignMinute=due+3*PERIOD;
fail(()=>D.validateAlchemyDecayJournal(moved),/kontext/);
// A consumed dose, dependent use, or physically changed vial blocks any backfill.
const active=[...original,row('empty',due-100,'calendarAlchemyVialEmpty',{finishId:'f'})];
fail(()=>D.createAlchemyDecay({journal:active,campaignId:'C',minute:due,recordedMinute:now,actorId:'A',finishId:'f',d10:2,origin:'manual',gmConfirmed:true,gmMissedConfirmed:true}),/dosud nepoužitý|přesně v termínu/);
const follow=[...original,row('use',due+1,'calendarAlchemyVialBinding',{finishId:'f',vialId:'v'})];
fail(()=>D.createAlchemyDecay({journal:follow,campaignId:'C',minute:due,recordedMinute:now,actorId:'A',finishId:'f',d10:2,origin:'manual',gmConfirmed:true,gmMissedConfirmed:true}),/závislý důkaz/);
const unrelatedCampaign=[...original,row('foreign-use',due+1,'calendarAlchemyVialBinding',{finishId:'f'},'X')];
ok(D.createAlchemyDecay({journal:unrelatedCampaign,campaignId:'C',minute:due,recordedMinute:now,actorId:'A',finishId:'f',d10:1,origin:'manual',gmConfirmed:true,gmMissedConfirmed:true}));
// Current exact-time cases preserve original v1 byte shape.
const normal=D.createAlchemyDecay({journal:original,campaignId:'C',minute:due,actorId:'A',finishId:'f',d10:5,origin:'manual',gmConfirmed:true});
ok(!('recordedMinute' in normal));ok(!('reconstructed' in normal));ok(!('gmMissedConfirmed' in normal));
const normalJournal=[...original,row('normal',due,'calendarAlchemyDecay',normal)];ok(D.validateAlchemyDecayJournal(normalJournal));
fail(()=>D.createAlchemyDecay({journal:normalJournal,campaignId:'C',minute:due,actorId:'A',finishId:'f',d10:2,origin:'manual',gmConfirmed:true}),/přesně v termínu/);
console.log('PASS',checks,'HMK Decay: overdue stored-dose backfill, per-month rolls, strict history, no retroactive actor/inventory damage, terminal expiry, legacy proof');
