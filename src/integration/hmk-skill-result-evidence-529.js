import {skillNarrativeSolo,skillNarrativeOpposed} from './hmk-skill-narrative.js';
/** Journal presentation only: never changes the original test, rolls or event. */
export const isCompletedSkillTest = row => Boolean(row?.skillTestProof &&
 ['secondary-mastery-test','secondary-mastery-value-test','success-value-test','success-value-specific','special-secondary-roll','assistance-success-test','opposed-success-test','opposed-tiebreak','success-test','critical-followup','climbing-falling','skill-physical-consequence','balance-nerves-will'].includes(row.skillTestProof.type));
const signed = value => Number.isFinite(value) ? String(value) : '—';
const oldDelimiter=/\n\nPŘÍBĚH PRO GM(?: \(návrh, bez dalších automatických postihů\))?:\n/i;
// Readability filter: the stored evidentiary record and provenance remain untouched.
export function readableSkillEvidence(text){
 return String(text??'')
  .replace(/\b(d(?:100|20|12|10|8|6|4|3|2))\s+(\d{1,3})(?![\d)])/g,'$1 ($2)')
  .replace(/\s*\[(?:manually-entered|automatic|auto-generated|cryptographic-software-die)\]/gi,'')
  .replace(/\s*\((?:manually-entered|automatic)\)/gi,'')
  .replace(/^Rozstřel: dostupný jen[^\n]*(?:\n|$)/gmi,'')
  .replace(/^Rozstřel lze použít jen[^\n]*(?:\n|$)/gmi,'')
  .trim();
}
function parseName(text,side){
 const match=String(text||'').match(new RegExp('^'+side+' · ([^\\n/]+)\\s*\\/','m'));
 return match?.[1]?.trim()||'';
}
function participantName(p,side,body,nameById){
 const id=side==='a'?p.actorId:p.opponentId;
 return (id&&typeof nameById==='function'?nameById(id):'')||parseName(body,side.toUpperCase())||'';
}
function sections(row,p,{nameById}={}){
 const body=String(row.body||'');
 const parts=body.split(oldDelimiter);
 const a=p.a||p.result, b=p.b||null;
 const actor=participantName(p,'a',body,nameById);
 const opponent=participantName(p,'b',body,nameById);
 const scene={...(p.scene||{})};
 let narration=String(p.gmNarrative||parts.slice(1).join('\n\n')).trim();
 // Legacy logs retain their historical text; their display uses the same
 // contemporary account as new logs, without fabricating new game effects.
 if(actor&&b&&opponent&&p.comparison){
  narration=skillNarrativeOpposed({attackerName:actor,defenderName:opponent,primary:p.skills?.[0]||p.skill||'',defenderSkill:p.skills?.[1]||'',action:p.opposedAction||'',comparison:p.comparison,levelA:a?.level||'—',levelB:b.level||'—',...scene});
 }else if(actor&&a&&p.type!=='opposed-tiebreak'){
  narration=skillNarrativeSolo({actorName:actor,skill:p.skills?.[0]||p.skill||'',level:a.level,mode:p.type.includes('value')?'value':'success',sv:a.sv,svTier:a.svTier,assistance:p.type==='assistance-success-test',...scene});
 }
 if(!narration){
  // Several specialised Secondary Rolls have no GM prose: keep their recorded
  // description visible rather than hiding the entire event inside evidence.
  narration=readableSkillEvidence(p.explanation||parts[0]).split('\n').filter(Boolean).slice(0,3).join(' · ');
 }
 return {narration,calculation:readableSkillEvidence(parts[0]),actor,opponent};
}
function proofLayout(esc,{narration,calculation},heading){
 return `${narration?`<div class="hsk-saved-proof__story"><p>${esc(narration)}</p></div>`:''}<details class="hsk-saved-proof__details"><summary>${esc(heading)}</summary><pre>${esc(calculation||'Žádný další pravidlový doklad není uložen.')}</pre></details>`;
}
/** Present permanent record contents and collapse ONLY supplementary rules. */
export function skillTestEvidenceHTML(row,esc,options={}){
 if(!isCompletedSkillTest(row))return '';
 const p=row.skillTestProof,a=p.a||p.result,b=p.b;
 if(['critical-followup','climbing-falling','skill-physical-consequence','balance-nerves-will'].includes(p.type)){
  const kind=p.type==='balance-nerves-will'?'Balance SV 3–4 → Will (HMK 64)':p.type==='critical-followup'?'Následek '+(p.originalLevel||'Skill Testu'):
   p.type==='climbing-falling'?'Falling / Injury Sequence':'Zdravotní následek Skill Activity';
  const badges=[kind,p.skill||p.kind||'',p.technique||'',p.will?.level||a?.level||'',
   Number.isInteger(p.will?.eml)?'EML '+p.will.eml:Number.isInteger(a?.eml)?'EML '+a.eml:'',Number.isInteger(p.will?.roll)?'d100 ('+p.will.roll+')':Number.isInteger(a?.roll)?'d100 ('+a.roll+')':''].filter(Boolean);
  const body=readableSkillEvidence(String(row.body||p.effect||'Výsledek je doložen původním zdravotním záznamem.'));
  const description=readableSkillEvidence(String(p.effect||row.body||'').split('\n')[0]);
  return `<section class="hsk-saved-proof" data-hmk-skill-proof="${esc(row.id||'')}"><div class="hsk-saved-proof__summary"><strong>${esc(row.title||kind)}</strong><span>${esc(badges.join(' · '))}</span></div>${proofLayout(esc,{narration:description,calculation:body},'Pravidlové doklady · skutečné hody a návaznosti')}</section>`;
 }
 const comparison=p.comparison,level=a?.victoryLevel??a?.level??p.originalLevels?.[0]??'—';
 const stars=comparison?.stars??p.stars??(p.type.includes('value')?a?.svTier?.stars:a?.unopposedStars);
 const {narration,calculation,actor,opponent}=sections(row,p,options);
 const winner=p.type==='opposed-tiebreak'? (p.winnerId&&typeof options.nameById==='function'?options.nameById(p.winnerId):'')||'':
   comparison?.winner==='a'?actor:comparison?.winner==='b'?opponent:'';
 const outcome=p.type==='opposed-tiebreak'?`Rozstřel · vítěz ${winner||'neuveden'}`:
   comparison?(comparison.tie?'Remíza':comparison.bothFailed?(winner?'Převaha: '+winner:'Oba neuspěli'):winner?'Vítězí '+winner:'Nerozhodnuto'):level;
 const badges=[`Výsledek: ${outcome}`];
 if(Number.isFinite(stars))badges.push(`${stars} ★`);
 if(Number.isInteger(a?.eml))badges.push(`EML ${a.eml}`);
 if(Number.isInteger(a?.roll))badges.push(`d100 (${a.roll})`);
 if(b){badges.push(`Oponent${opponent?' '+opponent:''}: ${b.victoryLevel||b.level||'—'}`);
  if(Number.isInteger(b.eml))badges.push(`EML ${b.eml}`);
  if(Number.isInteger(b.roll))badges.push(`d100 (${b.roll})`);}
 const fallback=!calculation?`Primární výsledek ${signed(a?.level)}; EML ${signed(a?.eml)}; d100 (${signed(a?.roll)}).`:calculation;
 return `<section class="hsk-saved-proof" data-hmk-skill-proof="${esc(row.id||'')}"><div class="hsk-saved-proof__summary"><strong>${esc(row.title||'Skill Test')}</strong><span>${esc(badges.join(' · '))}</span></div>${proofLayout(esc,{narration,calculation:fallback},'Pravidlové doklady · výpočet a hody')}</section>`;
}
