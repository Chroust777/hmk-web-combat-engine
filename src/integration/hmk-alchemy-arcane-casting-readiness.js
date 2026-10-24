/** HMK v1.2 pp.198,200–203,251,254–255,270.
 * A conservative READ-ONLY bridge from the existing Shèk-Pvâr creation
 * evidence to an existing alchemical source dossier. Never a spellcaster:
 * no recorded Spellstart, spellfire, dice, fatigue, Ward, LOS or spell
 * histories exist in the current engine. Therefore no result is committed.
 */
import {availableMasteries} from './hmk-skill-test-engine.js';
import {validateStartingPvarSpells} from './hmk-creation-starting-pvar.js';
import {indexOf,successLevel} from '../rules/tests.js';
import {classifySpellMisfire} from './hmk-spell-misfire-effects.js';
import {neutralChaosStormGeometry} from './hmk-neutral-arcane-exceptions.js';
import {combatFatigueTotals,validateCombatState} from './persistent-combat-state.js';

const SPELLS=Object.freeze({
 Detect:Object.freeze({id:'Neutral::Detect',complexity:1,time:'2 rounds',timeRounds:2,los:false,rangeMultiplier:5,sourcePage:251}),
 Reveal:Object.freeze({id:'Neutral::Reveal',complexity:1,time:'1 minute',timeRounds:6,los:false,rangeMultiplier:1,sourcePage:254}),
 Dispel:Object.freeze({id:'Neutral::Dispel',complexity:2,time:'1 minute',timeRounds:6,los:true,rangeMultiplier:5,sourcePage:251}),
 Ward:Object.freeze({id:'Neutral::Ward',complexity:2,time:'10 minutes',timeRounds:60,los:false,rangeMultiplier:0,sourcePage:255})
});
const guard=(test,message)=>{if(!test)throw Error('Alchemy Arcane Casting: '+message)};

/** Existing starting research is proof of KNOWN spells, not proof of casts.
 * The contemporaneous Pvârism ML is taken from original live Skill projection,
 * not guessed from historical starting ML (which may have since increased).
 */
export function alchemyArcaneCasterDossier(character){
 guard(character&&typeof character.id==='string'&&character.id,'chybí skutečný aktér');
 const starting=character.hmk?.startingPvarSpells;
 if(!starting)return Object.freeze({casterId:character.id,known:[],neutralML:null,si:null,
  verified:false,reason:'Postava nemá původní doložený výběr kouzel Shèk-Pvâr'});
 const input={occupation:starting.occupation,pvarismML:starting.pvarismML,
  primary:starting.primary,chantryStars:starting.chantryStars,
  choices:starting.spells?.map(x=>({id:x.id,assisted:x.assisted})),
  artefacts:starting.artefacts,naturalAttunement:starting.naturalAttunement,
  chantryConvocation:starting.chantryConvocation,homeChantry:starting.homeChantry,
  chantryId:starting.chantryId,guildRank:starting.guildRank,
  attunedObject:starting.attunedObject,startingARP:starting.startingARP};
 const reconstructed=validateStartingPvarSpells(input);
 guard(JSON.stringify(reconstructed)===JSON.stringify(starting),
  'historický výběr výzkumu kouzel nesouhlasí s originálními pravidly');
 guard(character.occupation===starting.occupation,'aktuální povolání odporuje doloženému Pvârism');
 const known=[...starting.freeSpells,...starting.spells.map(x=>x.id)];
 const projected=availableMasteries(character).find(s=>s.name==='Pvârism'&&s.kind==='skill');
 const neutralML=projected?.ml??null;
 if(!Number.isSafeInteger(neutralML)||neutralML<1)return Object.freeze({
  casterId:character.id,known:Object.freeze(known),neutralML:null,si:null,verified:false,
  reason:'Chybí současný ověřený Pvârism ML; historická počáteční hodnota jej nenahrazuje'});
 return Object.freeze({casterId:character.id,known:Object.freeze(known),
  neutralML,si:indexOf(neutralML),verified:true,sourcePages:Object.freeze([54,198,211])});
}

/** Every Neutral spell has a Sunsign Modifier of 0 and CD=2 (pp.198,200).
 * Pvârism ML is the Convocation ML, NOT the Spell ML. SI is specific to
 * each spell's calculated ML. This is shared arithmetic, not spellfire.
 */
export function neutralSpellMastery(pvarismML,spell){
 guard(Object.hasOwn(SPELLS,spell),'neznámé Neutral kouzlo');
 guard(Number.isSafeInteger(pvarismML)&&pvarismML>=1&&pvarismML<=1000,
  'chybí ověřený současný Pvârism ML');
 const spec=SPELLS[spell],convocationDegree=2;
 const difficulty=spec.complexity+convocationDegree;
 const spellML=pvarismML-2*difficulty;
 const spellSI=indexOf(spellML);
 return Object.freeze({spell,convocation:'Neutral',convocationDegree,
  sunsignModifier:0,convocationML:pvarismML,complexity:spec.complexity,
  difficulty,spellML,spellSI,
  rangeFeet:spellSI*spec.rangeMultiplier,sourcePages:Object.freeze([198,200,spec.sourcePage])});
}

/** HMK pp.160,200–202: six 10-second combat rounds per minute. Casting
 * starts using an Incant action, then requires uninterrupted concentration.
 * No duration is inferred from the campaign clock or a GUI text field.
 */
export function neutralCastingTimeRounds(spell,{quicken=false}={}){
 guard(Object.hasOwn(SPELLS,spell),'neznámé Neutral kouzlo');
 guard(quicken===false,'Quicken musí mít zvláštní -20 EML a ověřený spellstart; zde není podporován');
 return SPELLS[spell].timeRounds;
}

/** Canonical, intentionally bounded CURRENT casting EML. This calculation is
 * limited to ordinary spoken cant, gesture with a KNOWN ENC and a confirmed
 * quiet place; anything needing unavailable item, wound, joined, grimoire,
 * focus or alternate-method proof fails rather than accepting a claimed EML.
 * A complete arithmetic breakdown does not itself authorize a cast.
 */
export function neutralOrdinaryCastingEML({character,spell,target=null,
 cant='spoken',gesture='normal',noise='quiet',otherModifiersConfirmedAbsent=false,
 encumbrance=null,gmConfirmed=false}={}){
 guard(gmConfirmed===true&&otherModifiersConfirmedAbsent===true,
  'GM musí doložit nepřítomnost nedoložených casting modifikátorů');
 guard(cant==='spoken'&&gesture==='normal'&&noise==='quiet',
  'Tato větev nepodporuje silent/still, hlučné místo ani jiné techniky');
 const caster=alchemyArcaneCasterDossier(character);
 guard(caster.verified&&caster.known.includes(SPELLS[spell]?.id),
  'chybí ověřená znalost Neutral kouzla a současné Pvârism');
 const state=validateCombatState(character?.hmk?.combatState);
 guard(state.shock==='NONE'&&!state.coma?.active&&
  !['withdrawing','routed','catatonic'].includes(state.morale?.state)&&
  !state.wounds.some(w=>w.healed!==true)&&
  !character.hmk.arcane?.auralShockLevels&&
  !character.hmk.arcane?.activeMisfireWarp&&
  !character.hmk.arcane?.pendingPsycheTraitChoice&&
  !(character.hmk.arcane?.misfireLostSpells??[]).includes(SPELLS[spell].id),
  'Shock, Aural Shock, zranění, psychický následek nebo Crucial Misfire vyžaduje zvláštní posouzení');
 guard(Number.isSafeInteger(encumbrance)&&encumbrance>=0&&encumbrance<=200&&
  character.hmk.arcane?.verifiedGestureEncumbrance===encumbrance,
  'Encumbrance musí odpovídat živému ověřenému výpočtu v původní postavě');
 const mastery=neutralSpellMastery(caster.neutralML,spell);
 guard(mastery.spellML>=1,'Spell ML nedovoluje kouzlit');
 const fatigue=combatFatigueTotals(state).total;
 const elixirPenalty=spell==='Dispel'?
  (target?.targetKind==='Ward'&&target?.targetable===true&&
   Number.isSafeInteger(target.wardLevel)&&target.wardLevel>=0?
   -10*target.wardLevel:
   target?.targetable===true&&Number.isSafeInteger(target.currentAS)&&target.currentAS>=1?
   -5*target.currentAS:null):0;
 guard(Number.isSafeInteger(elixirPenalty),
  'Dispel vyžaduje doloženou současnou AS konkrétního cíle');
 const eml=mastery.spellML-fatigue-encumbrance+elixirPenalty;
 return Object.freeze({format:'hmk-neutral-ordinary-casting-eml-v1',
  spell,spellML:mastery.spellML,spellSI:mastery.spellSI,
  castingTimeRounds:neutralCastingTimeRounds(spell),
  fatiguePenalty:-fatigue,gesturePenalty:-encumbrance,
  objectPenalty:0,elixirPenalty,noisePenalty:0,cantPenalty:0,
  eml,castingTestEML:Math.max(0,Math.min(100,eml)),
  sourcePages:Object.freeze([160,200,201,202,251,254])});
}

/** Pure spellfire adjudication of the *known* Casting Roll / fatigue portion
 * (pp.200–203). Requires an independently verified CURRENT full casting EML.
 * This does not assert that spellstart, uninterrupted concentration, ward,
 * target, LOS, initiative or fatigue payments have been fulfilled.
 * A CF without its mandatory Misfire d100 is never reported as complete.
 * Total Release additionally requires Spirit and Raw Principle adjudication.
 */
export function neutralSpellfireDice({spell,fullEML,castingD100,misfireD100=null}={}){
 guard(Object.hasOwn(SPELLS,spell),'neznámé Neutral kouzlo');
 guard(Number.isSafeInteger(fullEML)&&fullEML>=-1000&&fullEML<=1000,
  'chybí doložený úplný Casting EML');
 guard(Number.isSafeInteger(castingD100)&&castingD100>=1&&castingD100<=100,
  'chybí fyzický Casting d100');
 // The original tests.js is authoritative for S/CS/F/CF and EML clamping.
 // Reuse its SL result, never classify CF from a new local dice system.
 const sl=successLevel(castingD100,fullEML);
 const level=['CF','F','S','CS'][sl];
 const complexity=SPELLS[spell].complexity;
 const complexityFatigue=complexity<=2?0:complexity<=4?5:10;
 const baseFatigue={CF:10,F:5,S:5,CS:0}[level];
 const misfire=level==='CF'&&Number.isSafeInteger(misfireD100)&&misfireD100>=1&&misfireD100<=100?
  classifySpellMisfire(misfireD100,complexity):null;
 guard(misfireD100===null||level==='CF'&&Number.isSafeInteger(misfireD100)&&misfireD100>=1&&misfireD100<=100,
  'Misfire d100 se vyhodnocuje pouze po Casting CF');
 const misfireRequired=level==='CF'&&misfire===null;
 const otherPending=misfire?.totalRelease===true;
 return Object.freeze({format:'hmk-neutral-spellfire-dice-v1',spell,complexity,
  fullEML,castingD100,castingSL:level,castingFatigue:baseFatigue+complexityFatigue,
  ...(misfire?{misfireD100,misfire}:{}),
  additionalMisfireFatigue:misfire?.extraFatigue??0,
  totalFatigue:baseFatigue+complexityFatigue+(misfire?.extraFatigue??0),
  misfireRequired,totalReleaseNeedsSpiritAndRawPrinciple:otherPending,
  ...(otherPending?{rawPrincipleGeometry:neutralChaosStormGeometry(complexity),
   requiredEvidence:Object.freeze(['current Spirit ML and modifiers','Spirit d100',
    '2d6/4d6/6d6 Spirit loss when applicable','all Vortex targets and random centre',
    'separate d100/d20 source rolls','Ward resolution before protected source',
    'ongoing round-by-round neutral storm history'])}:{}),
  mayCommit:false,complete:false,diceComplete:!misfireRequired&&!otherPending,
  sourcePages:Object.freeze([200,202,203])});
}

/** Feasibility of an intended Neutral incantation, not spellfire adjudication.
 * A range measurement or GM statement cannot substitute for prior receipts.
 */
export function alchemyArcaneCastingPreflight({character,target,spell,distanceFeet=null,
 gmLOSConfirmed=false,gmWardAbsentConfirmed=false}={}){
 guard(Object.hasOwn(SPELLS,spell),'povoleny jen kanonické Detect, Reveal, Dispel');
 guard(target&&typeof target.finishId==='string'&&typeof target.campaignId==='string',
  'chybí ověřený cílový dossier');
 const caster=alchemyArcaneCasterDossier(character),spec=SPELLS[spell];
 const rules=caster.verified?neutralSpellMastery(caster.neutralML,spell):null;
 const blockers=[];
 if(!target.targetable||!['stored','active'].includes(target.phase)||
   !Number.isSafeInteger(target.currentAS)||target.currentAS<1)
  blockers.push('Cíl nemá doložené živé enchantment a aktuální AS');
 if(!caster.verified)blockers.push(caster.reason);
 if(!caster.known.includes(spec.id))blockers.push('Postava nemá původní důkaz znalosti '+spec.id);
 const lost=character?.hmk?.arcane?.misfireLostSpells??[];
 if(Array.isArray(lost)&&(lost.includes(spec.id)||lost.includes(spell)))
  blockers.push('Crucial Misfire: kouzlo je ztracené, chybí nové Spell Research');
 if((character?.hmk?.arcane?.auralShockLevels??0)>0)
  blockers.push('Aural Shock znemožňuje sesílat kouzla (HMK 203)');
 if(rules&&rules.spellML<1)blockers.push('Skutečné Spell ML nedovoluje seslat kouzlo');
 if(!Number.isFinite(distanceFeet)||distanceFeet<0||distanceFeet>1e6)
  blockers.push('Chybí skutečná nezáporná vzdálenost cíle ve stopách');
 const rangeFeet=rules?.rangeFeet??null;
 if(rangeFeet!==null&&Number.isFinite(distanceFeet)&&distanceFeet>rangeFeet)
  blockers.push('Cíl mimo dosah '+spell+' ('+rangeFeet+' ft)');
 if(spec.los&&!gmLOSConfirmed)blockers.push('Chybí potvrzené LOS při spellfire');
 if(!gmWardAbsentConfirmed)blockers.push('Není doloženo, že zdroj nemá aktivní Ward');
 if(spell==='Reveal'||spell==='Dispel')blockers.push('Chybí úspěšný, historicky ověřený Detect stejného zdroje');
 if(spell==='Dispel')blockers.push('Chybí úspěšný, historicky ověřený Reveal stejného zdroje');
 blockers.push('Chybí původní Spellstart, koncentrace, casting d100, Misfire a Fatigue writer');
 const dispelPenalty=spell==='Dispel'&&target.targetable?-5*target.currentAS:0;
 return Object.freeze({format:'hmk-alchemy-arcane-spell-preflight-v2',
  campaignId:target.campaignId,finishId:target.finishId,sourceId:target.sourceId,
  casterId:caster.casterId,spell,known:caster.known.includes(spec.id),
  neutralML:caster.neutralML,si:rules?.spellSI??null,spellML:rules?.spellML??null,
  complexity:spec.complexity,convocationDegree:2,rangeFeet,castingTime:spec.time,castingTimeRounds:spec.timeRounds,
  requiresLOS:spec.los,dispelEMLPenalty:dispelPenalty,
  // Spell ML plus the known Dispel AS penalty is NOT full EML (p.201).
  partialEML:rules===null?null:rules.spellML+dispelPenalty,
  complete:false,mayCommit:false,blockers:Object.freeze(blockers),
  sourcePages:Object.freeze([198,200,201,202,spec.sourcePage,270])});
}
