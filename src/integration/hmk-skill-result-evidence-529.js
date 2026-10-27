/** Read-only presentation of existing Skill Tests evidence.
 * Authoritative: original journal row and skillTestProof, no secondary storage.
 */
export const isCompletedSkillTest = row => Boolean(row?.skillTestProof &&
 ['secondary-mastery-test','secondary-mastery-value-test','success-value-test','assistance-success-test','opposed-success-test','opposed-tiebreak','success-test'].includes(row.skillTestProof.type));
const signed = value => Number.isFinite(value) ? String(value) : '—';
export function skillTestEvidenceHTML(row,esc){
 if(!isCompletedSkillTest(row))return '';
 const p=row.skillTestProof,a=p.a || p.result,b=p.b;
 const comparison=p.comparison, level=a?.level ?? p.originalLevels?.[0] ?? '—';
 const stars=comparison?.stars ?? p.stars ?? (p.type.includes('value')?a?.svTier?.stars:a?.unopposedStars);
 const outcome=p.type==='opposed-tiebreak' ? 'Rozstřel · vítěz určen'
  :comparison?(comparison.tie?'Remíza':comparison.bothFailed?'Obě strany neuspěly':comparison.winner==='a'?'Vítězí aktivní strana':comparison.winner==='b'?'Vítězí protistrana':'Nerozhodnuto')
  :level;
 const heading=String(row.title||'Skill Test');
 const badges=[`Výsledek ${outcome}`];
 if(Number.isFinite(stars))badges.push(`${stars} ★`);
 if(Number.isInteger(a?.eml))badges.push(`EML ${a.eml}`);
 if(Number.isInteger(a?.roll))badges.push(`d100 ${a.roll}`);
 if(b){badges.push(`Protistrana ${b.level||'—'}`);if(Number.isInteger(b.eml))badges.push(`EML ${b.eml}`);if(Number.isInteger(b.roll))badges.push(`d100 ${b.roll}`);}
 // Every original journal body already contains the witnessed EML computation,
 // dice origin, opposed margin, success levels and GM narrative. Display the
 // source directly; do not re-derive a possibly contradictory second result.
 const body=String(row.body||'');
 const fallback=!body?`Primární výsledek ${signed(a?.level)}; EML ${signed(a?.eml)}; d100 ${signed(a?.roll)}.`:'';
 const narrative=!body&&p.gmNarrative?`\nPro GM: ${p.gmNarrative}`:'';
 return `<section class="hsk-saved-proof" data-hmk-skill-proof="${esc(row.id||'')}"><div class="hsk-saved-proof__summary"><strong>${esc(heading)}</strong><span>${esc(badges.join(' · '))}</span></div><details class="hsk-saved-proof__details"><summary>Úplný doložený výpočet, hody a popis pro GM</summary><pre>${esc(body||fallback+narrative)}</pre></details></section>`;
}
