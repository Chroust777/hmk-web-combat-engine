/** Source-supported opposed pair suggestions; never an automatic opponent die.
 * HMK v1.2 pp.61,66,76–77,82,84,93,138. All other skills are available for
 * an explicit GM-chosen opposing Skill, not assigned an invented fixed pair.
 * Combat maneuvers are owned by Combat, NOT simulated here.
 */
export const HMK_OPPOSED_ACTIONS=Object.freeze({
 Charm:[['Seduction','Will',138]],
 Command:[['Authority','Will',138],['Intimidation','Initiative',138]],
 Discourse:[['Immediate persuasive argument (not the extended SV debate)','Discourse',138]],
 Guile:[['Bluffing / lying','Intrigue',138]],
 Theatrics:[['Acting','Intrigue',138],['Disguise','Awareness',138],['Mimicry','Awareness',138]],
 Stealth:[['Alert observer','Awareness',84],['Active observer','Perception',93],['Encounter surprise: both guides Stalking','Stealth',150]],
 Awareness:[['Detect Stealth','Stealth',66],['Notice sleight of hand','Legerdemain',77],['Recognize disguise / mimicry','Theatrics',138],['Encounter surprise: both guides Normal / Vigilance','Awareness',150]],
 Perception:[['Notice active Stealth','Stealth',82]],
 Legerdemain:[['Sleight of hand / pickpocket','Awareness',77]],
 Intrigue:[['Detect Guile','Guile',138],['Detect Theatrics','Theatrics',138]],
 Will:[['Resist seduction / Charm','Charm',138],['Resist authority / Command','Command',138]],
 Initiative:[['Resist intimidation','Command',138]],
 Melee:[['Block (use Combat module)','Melee',61],['Dodge (use Combat module)','Dodge',61]],
 Eloquence:[['Opposed speech','Eloquence',61]]
});
export function opposedActionOptions(name){
 const skill=String(name||'');
 if(HMK_OPPOSED_ACTIONS[skill])return HMK_OPPOSED_ACTIONS[skill];
 const base=skill.match(/^([^(:]+?)(?:\s*\(|\s*:|$)/)?.[1]?.trim()||skill;
 return HMK_OPPOSED_ACTIONS[base]||[];
}
export function opposedPairIsPrinted(name,defender){
 return opposedActionOptions(name).some(row=>row[1]===defender);
}

/** Exact defender ML evidence is required: no fabricated untrained skill.
 * Some saved characters contain a SINGLE verified subskill (e.g. Awareness
 * (sight)) instead of an unsuffixed Skill. Never silently choose between
 * multiple specialisations, and never retain a stale defender selection.
 */
export function resolveOpposedDefenderMastery(requested,masteries=[]){
 const skill=String(requested||'').trim(),all=Array.isArray(masteries)?masteries:[];
 if(!skill)return {status:'missing',name:'',matches:[]};
 const full=all.filter(x=>String(x?.name||'')===skill&&Number.isSafeInteger(x.ml)&&x.ml>0);
 if(full.length===1)return {status:'exact',name:full[0].name,matches:[full[0].name]};
 const variants=all.filter(x=>Number.isSafeInteger(x?.ml)&&x.ml>0&&
  (String(x.name).startsWith(skill+' (')||String(x.name).startsWith(skill+':')));
 if(variants.length===1)return {status:'specialised',name:variants[0].name,matches:[variants[0].name]};
 if(variants.length>1)return {status:'ambiguous',name:'',matches:variants.map(x=>x.name)};
 return {status:'untrained',name:'',matches:[]};
}
/** Exhaustively expose the source-backed possibilities, without inventing
 * valid ML for the currently selected opponent. */
export function opposedAvailabilityMatrix(skills,masteries){
 return skills.map(name=>({skill:name,actions:opposedActionOptions(name).map(([action,defender,page])=>({
  action,defender,page,...resolveOpposedDefenderMastery(defender,masteries)}))}));
}
