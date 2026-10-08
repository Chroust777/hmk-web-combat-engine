import { SL, opposed } from './tests.js';

const valid=sl=>[SL.CF,SL.F,SL.S,SL.CS].includes(sl);
export function nativeSoulDefenceSL(sl,{nativeSoul=false}={}){
  if(!valid(sl)) throw new RangeError('Valid Spirit success level required');
  return nativeSoul?Math.min(SL.CS,sl+1):sl;
}
/** p296 Spirit Conflict: tied successes break; tied failures do nothing. */
export function spiritConflict({attacker,defender,defenderNativeSoul=false,finalD10Attacker=null,finalD10Defender=null,loserKind=null}={}){
  if(!attacker||!defender||!valid(attacker.sl)||!valid(defender.sl)) throw new RangeError('Two valid Spirit tests required');
  const d={...defender,sl:nativeSoulDefenceSL(defender.sl,{nativeSoul:defenderNativeSoul})};
  let result;
  if(attacker.sl===d.sl && attacker.sl<SL.S) result={winner:null,stars:0,bothFailed:true};
  else result=opposed({a:attacker,b:d,tie:'break',finalD10A:finalD10Attacker,finalD10B:finalD10Defender});
  const fatigue={attacker:0,defender:defenderNativeSoul?5:0};
  if(!result.winner) return {...result,defenderSL:d.sl,fatigue,dissolution:null};
  const loser=result.winner==='a'?'defender':'attacker';
  const kind=loserKind&&typeof loserKind==='object'?(loserKind[loser]??null):loserKind;
  const stars=result.stars;
  let dissolution={loser,stars,kind};
  if(kind==='spirit') dissolution={...dissolution,durationDays:stars,auralShock:0,reembody:false};
  else if(kind==='astral') dissolution={...dissolution,durationDays:null,auralShock:stars,reembody:true,reembodyResult:SL.CF};
  else if(kind==='physical') dissolution={...dissolution,durationDays:null,auralShock:stars,reembody:false};
  else dissolution={...dissolution,pending:{type:'loser-soul-kind',choices:['spirit','astral','physical']}};
  return {...result,defenderSL:d.sl,fatigue,dissolution};
}

/** p297 possession opportunity following a natural spirit's victory. */
export function possessionAfterSpiritConflict({conflict,initiatorIsNaturalSpirit=false,sameAstralLocale=false,sameTurn=false,initiatorSoulActive=true,initiatorIncarnating=false,initiatorBoundToEnergy=false,targetDematerialised=false,choosePossess=null}={}){
  const eligible=!!conflict&&conflict.winner==='a'&&initiatorIsNaturalSpirit&&sameAstralLocale&&sameTurn&&initiatorSoulActive&&!initiatorIncarnating&&!initiatorBoundToEnergy&&!targetDematerialised;
  if(!eligible) return {eligible:false,possessed:false,pending:null};
  if(choosePossess==null) return {eligible:true,possessed:false,pending:{type:'possession-choice'}};
  if(!choosePossess) return {eligible:true,possessed:false,pending:null,opportunityLost:true};
  return {eligible:true,possessed:true,pending:null,possessorPerspective:'physical',possessorSoul:'dormant',possessedPersonality:'mute'};
}

/** p190 recovery conflict consequence after an awakened possessed being fights back. */
export function possessionRecoveryConflictOutcome({conflict,possessedSide='a'}={}){
  if(!conflict?.winner) return {resolved:false,possessed:true,pending:{type:'spirit-conflict-continuation'}};
  const possessedWon=conflict.winner===possessedSide;
  return possessedWon
    ?{resolved:true,possessed:false,bodyControl:'restored',possessorDissolved:true}
    :{resolved:true,possessed:true,bodyControl:'possessor',possessedSoulDissolved:true,auralShock:conflict.stars,restartPossession:true};
}
