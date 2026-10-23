/** HMK v1.2 pp.269–274: printed CF Ill Effect *profiles*, not a new
 * health engine. All active effects must still be implemented and settled
 * through the existing Combat State, Exposure Healing and GM Calendar.
 * These profiles are deliberately inert for elixirs that cannot yet be
 * imbibed. A complete table must not grant permission to consume them.
 */
import {STARTING_ELIXIR_NAMES} from './hmk-creation-starting-elixirs.js';
import {canonicalProfusionProfile} from './hmk-alchemy-profusion.js';
const WEAR5=['Airtap','Aqua','Fireshield','Iceshield','Shadowbreath','Soulcloak','Sustenance','Warmth'];
const WEAR10=['Soulbuffer','Traumashield'];
const AURAL1=['Egosight','Erudition','Exsiccation','Footpad','Physic','Verity','Wakefulness'];
const AURAL3=['Ghostsight'];
const AURAL5=['Equipoise','Formfix'];
const APPLIED=['Acid','Eruption','Fumebomb','Mending','Object Aegis','Weakness'];
const table={};
for(const name of APPLIED)table[name]={kind:'not-imbibed'};
for(const name of ['Poison','Quiescence'])table[name]={kind:'none'};
for(const name of WEAR5)table[name]={kind:'weariness',multiplier:5};
for(const name of WEAR10)table[name]={kind:'weariness',multiplier:10};
for(const name of AURAL1)table[name]={kind:'aural-shock',levels:1};
for(const name of AURAL3)table[name]={kind:'aural-shock',levels:3};
for(const name of AURAL5)table[name]={kind:'aural-shock',levels:5};
table.Dreamwalk={kind:'aural-shock',levels:3,trigger:'after-reembodiment'};
table.Darkvision={kind:'exposure-penalty',attribute:'vision',multiplier:2.5,hp:'d6-days',hr:5};
table.Might={kind:'exposure-penalty',attribute:'shock-roll',multiplier:2.5,hp:'d6-days',hr:5};
table.Shout={kind:'exposure-penalty',attribute:'hearing-per-awareness',multiplier:2.5,hp:'d6-days',hr:5};
table.Healing={kind:'weakness',multiplier:5,removal:'healing-routine'};
table.Mindsalve={kind:'weakness',multiplier:5,removal:'mindsalve-routine'};
table.Passion={kind:'psyche-impulse',multiplier:.5};
if(STARTING_ELIXIR_NAMES.length!==35||new Set(STARTING_ELIXIR_NAMES).size!==35||
 Object.keys(table).length!==35||STARTING_ELIXIR_NAMES.some(name=>!Object.hasOwn(table,name)))
 throw Error('Alchemy Ill Effects: kanonický katalog není úplný (35/35)');
export const CANONICAL_ALCHEMY_ILL_EFFECTS=Object.freeze(Object.fromEntries(
 STARTING_ELIXIR_NAMES.map(name=>[name,Object.freeze({...table[name],sourcePage:
  ['Acid','Airtap','Aqua','Darkvision','Dreamwalk','Egosight','Equipoise','Erudition','Eruption','Exsiccation'].includes(name)?271:
  ['Fireshield','Footpad','Formfix','Fumebomb','Ghostsight','Healing'].includes(name)?272:
  ['Iceshield','Mending','Might','Mindsalve','Object Aegis','Passion','Physic','Poison','Quiescence'].includes(name)?273:274})])));
export function canonicalAlchemyIllEffect(name){
 if(!Object.hasOwn(CANONICAL_ALCHEMY_ILL_EFFECTS,name))
  throw Error('Alchemy Ill Effects: neznámý kanonický elixír');
 return CANONICAL_ALCHEMY_ILL_EFFECTS[name];
}
/** Plan only. Does not add fatigue, change health, or bypass missing mandatory
 * rolls. For Aural Shock, fatigue is exactly 5 per level (HMK p.190).
 * Base AS is the stored AS *before* adjusting the Imbibing Roll (p.270).
 */
export function planAlchemyIllEffect({elixirName,baseAS,stage='on-cf'}={}){
 const printed=canonicalProfusionProfile(elixirName),profile=canonicalAlchemyIllEffect(elixirName);
 if(printed.use!=='Imbibed'||profile.kind==='not-imbibed')
  throw Error('Alchemy Ill Effects: Applied elixír nemá Imbibing CF Ill Effect');
 if(!Number.isSafeInteger(baseAS)||baseAS<1||baseAS>11)
  throw Error('Alchemy Ill Effects: chybí původní doložené base AS');
 if(!['on-cf','after-reembodiment'].includes(stage))
  throw Error('Alchemy Ill Effects: neznámá fáze účinku');
 if(profile.trigger&&profile.trigger!==stage)return Object.freeze({kind:'deferred',trigger:profile.trigger,sourcePage:profile.sourcePage});
 if(profile.kind==='none')return Object.freeze({kind:'none',sourcePage:profile.sourcePage});
 if(profile.kind==='aural-shock')return Object.freeze({kind:'aural-shock',levels:profile.levels,weakness:profile.levels*5,
  recoveryPending:true,sourcePage:profile.sourcePage});
 if(profile.kind==='weariness'||profile.kind==='weakness')return Object.freeze({kind:profile.kind,
  amount:baseAS*profile.multiplier,...(profile.removal?{removal:profile.removal}:{}),sourcePage:profile.sourcePage});
 if(profile.kind==='exposure-penalty')return Object.freeze({kind:profile.kind,attribute:profile.attribute,
  penalty:Math.round(baseAS*profile.multiplier),healingPeriod:profile.hp,healingRate:profile.hr,sourcePage:profile.sourcePage});
 if(profile.kind==='psyche-impulse')return Object.freeze({kind:profile.kind,psyche:Math.round(baseAS*profile.multiplier),
  gmTraitChoiceRequired:true,sourcePage:profile.sourcePage});
 throw Error('Alchemy Ill Effects: dosud neimplementovaný pravidlový typ');
}
/** Used by the four ACTUALLY IMPLEMENTED imbibed source types only.
 * Historical proofs retain their v93.441 fields and ordering; this function
 * checks that the emitted source-specific shape is still canonical.
 */
export function supportedAlchemyConcurrentIllEffect(source){
 const name=source?.elixirName,baseAS=source?.asBefore;
 if(!['Darkvision','Erudition','Footpad','Egosight'].includes(name)||
  typeof source?.useId!=='string'||!source.useId)
  throw Error('Alchemy Ill Effects: aktivní zdroj nelze mechanicky doložit');
 const plan=planAlchemyIllEffect({elixirName:name,baseAS});
 if(name==='Darkvision')return {sourceUseId:source.useId,kind:'vision-light-penalty',
  baseAS,penalty:plan.penalty};
 if(plan.kind!=='aural-shock'||plan.levels!==1)
  throw Error('Alchemy Ill Effects: zdroj nemá očekávaný Aural Shock');
 return {sourceUseId:source.useId,kind:'aural-shock',levels:plan.levels,
  weakness:plan.weakness,...(['Footpad','Egosight'].includes(name)?{sourceElixir:name}:{})};
}
