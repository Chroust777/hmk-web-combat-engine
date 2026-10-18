/** HMK v1.2 pp.112,117,122. Present load evidence without mistaking an
 * arithmetical lower bound, an inapplicable modifier, or an omitted unknown
 * Bulk penalty for a confirmed zero. This module changes NO dice mathematics.
 */
const signed=n=>n>=0?'+'+n:String(n);
const number=n=>Number.isSafeInteger(n)?String(n):null;
function span(lo,hi){
 const a=number(lo),b=number(hi);
 if(a===null&&b===null)return 'nedoloženo';
 if(a===null)return 'nejvýše '+b;
 return b===null||a===b?a:a+'–'+b;
}
export function skillLoadModifierDisplay(ctx,label,value,primary=false){
 if(primary)return String(value);
 if(label==='ENC'){
  if(ctx?.condition?.applicability?.kind==='not-applicable')return 'netýká se';
  if(ctx?.condition?.enc?.mode==='provisional-unresolved')return 'neurčeno*';
  if(ctx?.condition?.enc?.mode==='provisional-known-components')return signed(value)+' (minimum*)';
 }
 if(label==='Bulk'){
  if(ctx?.trauma?.bulk?.source==='not-an-impaired-test')return 'netýká se';
  if(ctx?.trauma?.bulk?.mode==='provisional-unresolved')return 'neurčeno*';
 }
 if(label==='Zbroj / PER'&&ctx?.trauma?.perception?.mode==='provisional-unresolved')return 'neurčeno*';
 if(label==='Zbroj / PER'&&ctx?.trauma?.perception?.mode==='provisional-known-components')return signed(value)+' (minimum*)';
 return signed(value);
}
export function skillLoadEvidenceHTML(ctx,E=s=>String(s)){
 const d=ctx?.loadEvidence||null,applicability=ctx?.condition?.applicability?.kind;
 const bulk=ctx?.trauma?.bulk;
 const encMode=ctx?.condition?.enc?.mode;
 const hasProblem=ctx?.armourIsProvisional||encMode==='provisional-known-components'||encMode==='provisional-unresolved';
 if(!hasProblem&&(!d||!(d.gearENC||d.armourENC||d.knownArmourENC)))return '';
 const lines=[];
 if(d){
  const armour=span(d.armourENC??d.knownArmourENC,d.armourENC??d.armourUpperBound);
  const gear=number(d.gearENC)??'nedoloženo';
  const str=d.strengthModifier===null?'neověřeno':signed(d.strengthModifier);
  const low=d.modifiedENC??d.knownMinimumENC,high=d.modifiedENC??d.knownMaximumENC;
  lines.push('Výpočet zatížení: Armour ENC '+armour+' + Gear ENC '+gear+' + STR úprava '+str+' ⇒ upravené ENC '+span(low,high)+'.');
  if(applicability==='not-applicable')lines.push('Tato dovednost nepoužívá Agility ve Skill Base: přímý postih ENC do EML se neuplatní. Zatížení může přesto ovlivnit únavu při příslušné činnosti.');
  else if(applicability==='applies'){
   if(d.encReady)lines.push('Skill Base používá Agility: potvrzený postih ENC je '+signed(-(d.modifiedENC??0))+'.');
   else if(Number.isSafeInteger(low)&&Number.isSafeInteger(high))lines.push('Skill Base používá Agility: aritmetický možný postih ENC '+signed(-low)+(low===high?'':' až '+signed(-high))+'. Zatím byl do předběžného EML započten pouze prokazatelný minimální postih.');
   else lines.push('Skill Base používá Agility, ale úplný postih ENC zatím nelze určit.');
  }else lines.push('Vztah dovednosti k ENC není ověřen.');
  if(d.prohibitedOutfit)lines.push('Pozor: některé nasazené vrstvy pravidla zakazují. Uvedené rozpětí ENC je pouze aritmetická informace, nikoli povolení takovou sestavu nosit.');
 }
 if(bulk?.mode==='provisional-unresolved')lines.push('Bulk není ověřen. Hodnota 0 použitá v předběžném EML NENÍ potvrzeným nulovým postihem. Zakázané materiály nelze automaticky nahradit Bulk −5.');
 else if(bulk?.source==='not-an-impaired-test')lines.push('Bulk se na tuto dovednost podle tabulky Impaired Tests nevztahuje.');
 if(ctx?.trauma?.perception?.mode==='provisional-unresolved')lines.push('Postih PER způsobený zbrojí není úplně potvrzen.');
 if(!lines.length)return '';
 return '<div class="hsk-load-evidence" role="note"><b>Kontrola ENC / Bulk · HMK str. 112, 117, 122</b>'+lines.map(x=>'<p>'+E(x)+'</p>').join('')+(ctx?.armourIsProvisional?'<p><strong>* Výsledek je předběžný.</strong> Neověřené postihy nelze pokládat za potvrzené nuly.</p>':'')+'</div>';
}
