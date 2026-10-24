/** HMK v1.2 pp.198,200–203,251,254–255,270.
 * A conservative READ-ONLY bridge from the existing Shèk-Pvâr creation
 * evidence to an existing alchemical source dossier. Never a spellcaster:
 * no recorded Spellstart, spellfire, dice, fatigue, Ward, LOS or spell
 * histories exist in the current engine. Therefore no result is committed.
 */
import {availableMasteries} from './hmk-skill-test-engine.js';
import {validateStartingPvarSpells} from './hmk-creation-starting-pvar.js';
import {indexOf} from '../rules/tests.js';

const SPELLS=Object.freeze({
 Detect:Object.freeze({id:'Neutral::Detect',complexity:1,time:'2 rounds',los:false,rangeMultiplier:5,sourcePage:251}),
 Reveal:Object.freeze({id:'Neutral::Reveal',complexity:1,time:'1 minute',los:false,rangeMultiplier:1,sourcePage:254}),
 Dispel:Object.freeze({id:'Neutral::Dispel',complexity:2,time:'1 minute',los:true,rangeMultiplier:5,sourcePage:251})
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

/** Feasibility of an intended Neutral incantation, not spellfire adjudication.
 * A range measurement or a GM statement cannot substitute for a successful
 * Detect/Reveal receipt, Ward removal, and a casting/Concentration sequence.
 */
export function alchemyArcaneCastingPreflight({character,target,spell,distanceFeet=null,
 gmLOSConfirmed=false,gmWardAbsentConfirmed=false}={}){
 guard(Object.hasOwn(SPELLS,spell),'povoleny jen kanonické Detect, Reveal, Dispel');
 guard(target&&typeof target.finishId==='string'&&typeof target.campaignId==='string',
  'chybí ověřený cílový dossier');
 const caster=alchemyArcaneCasterDossier(character),spec=SPELLS[spell];
 const blockers=[];
 if(!target.targetable||!['stored','active'].includes(target.phase)||
   !Number.isSafeInteger(target.currentAS)||target.currentAS<1)
  blockers.push('Cíl nemá doložené živé enchantment a aktuální AS');
 if(!caster.verified)blockers.push(caster.reason);
 if(!caster.known.includes(spec.id))blockers.push('Postava nemá původní důkaz znalosti '+spec.id);
 if(!Number.isFinite(distanceFeet)||distanceFeet<0||distanceFeet>1e6)
  blockers.push('Chybí skutečná nezáporná vzdálenost cíle ve stopách');
 const rangeFeet=caster.verified?caster.si*spec.rangeMultiplier:null;
 if(rangeFeet!==null&&Number.isFinite(distanceFeet)&&distanceFeet>rangeFeet)
  blockers.push('Cíl mimo dosah '+spell+' ('+rangeFeet+' ft)');
 if(spec.los&&!gmLOSConfirmed)blockers.push('Chybí potvrzené LOS při spellfire');
 if(!gmWardAbsentConfirmed)blockers.push('Není doloženo, že zdroj nemá aktivní Ward');
 if(spell==='Reveal'||spell==='Dispel')blockers.push('Chybí úspěšný, historicky ověřený Detect stejného zdroje');
 if(spell==='Dispel')blockers.push('Chybí úspěšný, historicky ověřený Reveal stejného zdroje');
 // No executor/receipt exists in this release. Explicitly keep this blocker,
 // even if all advisory geometry and confirmations above are supplied.
 blockers.push('Chybí původní Spellstart, koncentrace, casting d100, Misfire a Fatigue writer');
 const dispelPenalty=spell==='Dispel'&&target.targetable?-5*target.currentAS:0;
 return Object.freeze({format:'hmk-alchemy-arcane-spell-preflight-v1',
  campaignId:target.campaignId,finishId:target.finishId,sourceId:target.sourceId,
  casterId:caster.casterId,spell,known:caster.known.includes(spec.id),
  neutralML:caster.neutralML,si:caster.si,rangeFeet,castingTime:spec.time,
  requiresLOS:spec.los,dispelEMLPenalty:dispelPenalty,
  // This is ONLY the known part of EML; fatigue, environment, skill options
  // and any Ward must not be silently treated as zero modifiers.
  partialEML:caster.neutralML===null?null:caster.neutralML+dispelPenalty,
  complete:false,mayCommit:false,blockers:Object.freeze(blockers),
  sourcePages:Object.freeze([198,200,201,202,spec.sourcePage,270])});
}
