/** HMK pp.112–119: printed suits are authored examples, not proven exceptions.
 * Preserve printed statistics as authoritative references; custom layering is
 * subject to p.117 restrictions. No inferred order or Bulk waiver is issued.
 */
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';
import {auditSuitAnatomicalStacks} from './armour-suit-anatomical-audit.js';
import {auditPrintedSuitLayers} from './armour-suit-layer-audit.js';
import {printedSuitLayerPolicy} from './armour-printed-suit-policy.js';
export function classifyPrintedSuitLayerStatus(){
 const anatomical=auditSuitAnatomicalStacks();
 const diagnostics=auditPrintedSuitLayers();
 const byName=new Map(anatomical.results.map(x=>[x.name,x]));
 const byDiagnostic=new Map(diagnostics.results.map(x=>[x.name,x]));
 return PRINTED_ARMOUR_SUITS_P113_116.map(s=>{
  const a=byName.get(s.name), d=byDiagnostic.get(s.name);
  const matched=Boolean(a&&d&&a.matched===a.total&&d.matched===d.articleCount);
  const anatomicalLimitIssues=a?[...a.excessLocations,...a.multipleDQLocations]:['unavailable'];
  const policy=printedSuitLayerPolicy({name:s.name,articles:s.articles});
  return {name:s.name,page:s.page,printedReference:true,printedEnc:s.enc,
   printedWeightLb:s.weightLb,articleCrosswalkComplete:matched,
   anatomicalLimitIssues,unverifiedLayerWarnings:d?.warnings??[],
   orderProven:false,bulkExceptionProven:false,
   // HMK does not explicitly exempt the 12 suits from p.117 in the source text.
   explicitPrintedSuitWaiver:false,appLevelPrintedPresetException:policy.exempt,layerValidationMode:policy.mode,
   status:matched&&anatomicalLimitIssues.length===0?'printed-reference-anatomy-checked':'needs-review',
   customOutfitCertified:false,combatReady:false};
 });
}
