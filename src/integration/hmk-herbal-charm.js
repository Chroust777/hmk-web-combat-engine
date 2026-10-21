/** HMK v1.2, p.75: Aromatic boosts a recipient's Charm; Aphrodisiac
 * impairs the INGESTER'S resistance to Charm (seduction), not generic Charm.
 * Both step down once per 240 GM-calendar minutes. Historical doses are
 * immutable; this module is strictly a read-only Skill Workbench projection.
 */
import {herbPotionEffectAt,validateHerbAdministrationJournal} from './hmk-herbal-administration.js';
const need=(v,m)=>{if(!v)throw Error('Charm / byliny: '+m)};
const validMinute=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
export function herbalCharmEvidence({journal=[],campaignId,minute,targetId,mode}={}){
 need(Array.isArray(journal)&&typeof campaignId==='string'&&campaignId&&validMinute(minute)&&
  typeof targetId==='string'&&targetId&&['aromatic','aphrodisiac'].includes(mode),'neplatná kampaň, čas, cíl nebo druh účinku');
 const rows=journal.filter(x=>x.calendarCampaignId===campaignId&&x.campaignMinute<=minute&&
  x.calendarHerbPotionAdminister?.herbType===mode&&x.calendarHerbPotionAdminister.targetId===targetId);
 const none={type:mode,modifier:0,stage:0,sourceIds:[],completeIds:[],sourcePage:75};
 if(!rows.length)return none;
 validateHerbAdministrationJournal(journal);
 const active=[];
 for(const row of rows){
  const p=row.calendarHerbPotionAdminister;
  need(p.campaignId===campaignId&&p.minute===row.campaignMinute&&
   p.method===(mode==='aromatic'?'perfume':'ingested'),'nesoulad aplikace a časového původu');
  const made=journal.find(x=>x.id===p.completeId&&x.calendarCampaignId===campaignId&&
   x.calendarHerbPotionComplete&&x.campaignMinute<=p.minute);
  need(made?.calendarHerbPotionComplete?.usable===true&&
   p.minute<made.calendarHerbPotionComplete.expiryMinute,'neúčinný nebo nedoložený lektvar');
  const effect=herbPotionEffectAt(p,minute);
  if(effect.status==='active')active.push({stage:effect.stage,bonus:effect.bonus,sourceId:row.id,completeId:made.id});
 }
 need(active.length<=1,'více současně účinných dávek téhož typu nemá doložené sčítání; rozhodne GM');
 if(!active.length)return none;
 const p=active[0];return {type:mode,modifier:mode==='aromatic'?p.bonus:-p.bonus,stage:p.stage,
  sourceIds:[p.sourceId],completeIds:[p.completeId],sourcePage:75};
}
/** Only an explicit GM-confirmed Charm(seduction) Opposed Test may apply the
 * ingester's aphrodisiac penalty to side B's resistance. */
export function herbalCharmSkillModifier({journal=[],campaignId,minute,actorId,skill,side='A',
 opposed=false,seductionConfirmed=false,attackerSkill=''}={}){
 const aromatic=skill==='Charm'?herbalCharmEvidence({journal,campaignId,minute,targetId:actorId,mode:'aromatic'}):null;
 const resisting=side==='B'&&opposed&&seductionConfirmed&&attackerSkill==='Charm';
 const aphro=resisting?herbalCharmEvidence({journal,campaignId,minute,targetId:actorId,mode:'aphrodisiac'}):null;
 need(!(aromatic?.modifier&&aphro?.modifier),'současný bonus Aromatic a postih Aphrodisiac nejsou pravidlově rozřešeny – rozhodne GM');
 return aromatic?.modifier?aromatic:aphro?.modifier?aphro:null;
}
/** Import guard for all NEW (marked) Charm evidence. Old skill tests without
 * these fields are preserved; their historical dice are never recomputed. */
export function validateHerbalCharmSkillJournal(journal=[]){
 need(Array.isArray(journal),'historie chybí');
 for(const row of journal){
  const p=row?.skillTestProof;
  if(!p||!p.herbalCharmA&&!p.herbalCharmB)continue;
  need(typeof row.calendarCampaignId==='string'&&validMinute(row.campaignMinute),
   'hod s bylinným účinkem nemá doložený kalendář');
  for(const [side,actorId,skill] of [['A',p.actorId,p.skills?.[0]??p.skill],['B',p.opponentId,p.skills?.[1]]]){
   const saved=p['herbalCharm'+side];
   if(!saved)continue;
   need(typeof actorId==='string'&&actorId&&typeof skill==='string', 'neúplný původ sociálního testu');
   const actual=herbalCharmSkillModifier({journal,campaignId:row.calendarCampaignId,
    minute:row.campaignMinute,actorId,skill,side,opposed:p.type==='opposed-success-test',
    seductionConfirmed:p.seductionConfirmed===true,attackerSkill:p.skills?.[0]});
   need(actual&&JSON.stringify(saved)===JSON.stringify(actual),
    'uložená sociální modifikace neodpovídá původnímu podání');
  }
  need(p.herbalCharmA||p.herbalCharmB,'chybí původ bylinné modifikace');
  need(p.seductionConfirmed!==true||p.type==='opposed-success-test'&&p.skills?.[0]==='Charm',
   'svádění nebylo doloženo jako Opposed Charm');
 }
 return true;
}
