import {skillNarrativeSolo,skillNarrativeOpposed} from './hmk-skill-narrative.js';
/** Read-only presentation of existing Skill Tests evidence.
 * Authoritative: original journal row and skillTestProof, no secondary storage.
 */
export const isCompletedSkillTest = row => Boolean(row?.skillTestProof &&
 ['secondary-mastery-test','secondary-mastery-value-test','success-value-test','success-value-specific','special-secondary-roll','assistance-success-test','opposed-success-test','opposed-tiebreak','success-test','critical-followup','climbing-falling','skill-physical-consequence','balance-nerves-will'].includes(row.skillTestProof.type));
const signed = value => Number.isFinite(value) ? String(value) : '—';
// Presentation-only legacy display: original data and die values never change.
function readableDice(text){
 return String(text).replace(/\b(d(?:100|20|12|10|8|6|4|3|2))\s+(\d{1,3})(?![\d)])/g,'$1 ($2)');
}
function evidenceSections(row,p,body,esc,{fallback=''}={}){
 const oldDelimiter=/\n\nPŘÍBĚH PRO GM(?: \(návrh, bez dalších automatických postihů\))?:\n/i;
 const parts=body.split(oldDelimiter);
 const calculation=readableDice(parts[0]||fallback);
 const actor=body.match(/^A · ([^\n/]+)\s*\//m)?.[1]?.trim()||'';
 const defender=body.match(/^B · ([^\n/]+)\s*\//m)?.[1]?.trim()||'';
 const a=p.a||p.result, b=p.b||null;
 const params={...(p.scene||{})};
 let narration=String(p.gmNarrative||parts.slice(1).join('\n\n')).trim();
 // Old and new records get the same richer read-aloud account on display.
 // Its raw historic original remains in row.body and proof.gmNarrative.
 if(actor&&b&&defender&&p.comparison){
  narration=skillNarrativeOpposed({attackerName:actor,defenderName:defender,primary:p.skills?.[0]||p.skill||'',defenderSkill:p.skills?.[1]||'',action:p.opposedAction||'',comparison:p.comparison,levelA:a?.level||'—',levelB:b.level||'—',...params});
 }else if(actor&&a&&p.type!=='opposed-tiebreak'){
  narration=skillNarrativeSolo({actorName:actor,skill:p.skills?.[0]||p.skill||'',level:a.level,mode:p.type.includes('value')?'value':'success',sv:a.sv,svTier:a.svTier,assistance:p.type==='assistance-success-test',...params});
 }
 return `<div class="hsk-proof-columns"><section class="hsk-proof-calculation"><h5>Pravidlový výpočet a hody</h5><pre>${esc(calculation)}</pre></section>${narration?`<section class="hsk-proof-story"><h5>Vyprávění pro GM</h5><p>${esc(narration)}</p></section>`:''}</div>`;
}

export function skillTestEvidenceHTML(row,esc){
 if(!isCompletedSkillTest(row))return '';
 const p=row.skillTestProof,a=p.a || p.result,b=p.b;
 if(['critical-followup','climbing-falling','skill-physical-consequence','balance-nerves-will'].includes(p.type)){
  const kind=p.type==='balance-nerves-will'?'Balance SV 3–4 → Will (HMK 64)':p.type==='critical-followup'?'Následek '+(p.originalLevel||'Skill Testu'):
    p.type==='climbing-falling'?'Falling / Injury Sequence':'Zdravotní následek Skill Activity';
  const badges=[kind,p.skill||p.kind||'',p.technique||'',p.will?.level||a?.level||'',
   Number.isInteger(p.will?.eml)?'EML '+p.will.eml:Number.isInteger(a?.eml)?'EML '+a.eml:'',Number.isInteger(p.will?.roll)?'d100 ('+p.will.roll+')':Number.isInteger(a?.roll)?'d100 ('+a.roll+')':''].filter(Boolean);
  return `<section class="hsk-saved-proof" data-hmk-skill-proof="${esc(row.id||'')}"><div class="hsk-saved-proof__summary"><strong>${esc(row.title||kind)}</strong><span>${esc(badges.join(' · '))}</span></div><details class="hsk-saved-proof__details"><summary>Pravidlový následek · skutečné hody a zápis pro GM</summary><pre>${esc(String(row.body||p.effect||'Výsledek je doložen původním zdravotním záznamem.'))}</pre></details></section>`;
 }
 const comparison=p.comparison, level=a?.victoryLevel ?? a?.level ?? p.originalLevels?.[0] ?? '—';
 const stars=comparison?.stars ?? p.stars ?? (p.type.includes('value')?a?.svTier?.stars:a?.unopposedStars);
 const outcome=p.type==='opposed-tiebreak' ? 'Rozstřel · vítěz určen'
  :comparison?(comparison.tie?'Remíza':comparison.bothFailed?'Obě strany neuspěly':comparison.winner==='a'?'Vítězí aktivní strana':comparison.winner==='b'?'Vítězí protistrana':'Nerozhodnuto')
  :level;
 const heading=String(row.title||'Skill Test');
 const badges=[`Výsledek ${outcome}`];
 if(Number.isFinite(stars))badges.push(`${stars} ★`);
 if(Number.isInteger(a?.eml))badges.push(`EML ${a.eml}`);
 if(Number.isInteger(a?.roll))badges.push(`d100 ${a.roll}`);
 if(b){badges.push(`Protistrana ${b.victoryLevel||b.level||'—'}`);if(Number.isInteger(b.eml))badges.push(`EML ${b.eml}`);if(Number.isInteger(b.roll))badges.push(`d100 ${b.roll}`);}
 // Every original journal body already contains the witnessed EML computation,
 // dice origin, opposed margin, success levels and GM narrative. Display the
 // source directly; do not re-derive a possibly contradictory second result.
 const body=String(row.body||'');
 const fallback=!body?`Primární výsledek ${signed(a?.level)}; EML ${signed(a?.eml)}; d100 ${signed(a?.roll)}.`:'';
 return `<section class="hsk-saved-proof" data-hmk-skill-proof="${esc(row.id||'')}"><div class="hsk-saved-proof__summary"><strong>${esc(heading)}</strong><span>${esc(badges.join(' · '))}</span></div><details class="hsk-saved-proof__details" open><summary>Pravidlové doklady a vyprávění pro GM</summary>${evidenceSections(row,p,body,esc,{fallback})}</details></section>`;
}
