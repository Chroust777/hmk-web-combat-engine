/** HMK domain contracts. Runtime objects are plain JSON-serialisable data. */
export const SCHEMA_VERSION = 1;
export const uuid = () => crypto.randomUUID();

export function Character({id=uuid(), name, attributes={}, skills={}, handedness='right', notes=''}) {
  return {schemaVersion:SCHEMA_VERSION,id,name,attributes,skills,handedness,notes};
}
export function Skill({id=uuid(), key, name, ml=0, sb=null, group=null}) {
  return {id,key,name,ml,sb,group};
}
export function WeaponDefinition({id=uuid(),name,modes=[],baseWQ=null,weightLb=0,traits=[]}) {
  return {id,name,modes,baseWQ,weightLb,traits};
}
export function WeaponInstance({id=uuid(),definitionId,currentWQ=null,baseWQ=null,ownerId=null,custom={}}) {
  return {id,definitionId,currentWQ,baseWQ,ownerId,custom};
}
export function Shield({id=uuid(),definitionId,currentWQ,baseWQ,shieldMod=0,deflect=0,ownerId=null}) {
  return {id,definitionId,currentWQ,baseWQ,shieldMod,deflect,ownerId};
}
export function ArmourArticle({id=uuid(),definitionId,ownerId=null,locations={},aq=null,destroyed=false}) {
  return {id,definitionId,ownerId,locations,aq,destroyed};
}
export function Injury({id=uuid(),combatantId,location,zone,severity,level,aspect,bleeding=0,impairment=0,amputation=false,treated=false,meta={}}) {
  return {id,combatantId,location,zone,severity,level,aspect,bleeding,impairment,amputation,treated,meta};
}
export function Condition({id=uuid(),combatantId,type,index=null,source=null,expiresAt=null,data={}}) {
  return {id,combatantId,type,index,source,expiresAt,data};
}
export function TimedEvent({id=uuid(),type,dueRound,dueIR=null,combatantId=null,data={}}) {
  return {id,type,dueRound,dueIR,combatantId,data};
}
export function Combatant({id=uuid(),characterId,name,position={x:0,y:0},facing=0,initiativeRank=null,actionState='ready',conditions=[],injuries=[],equipment={}}) {
  return {id,characterId,name,position,facing,initiativeRank,actionState,conditions,injuries,equipment};
}
export function CombatOptions({allies=false,flanking=false,meleeMaximumFoe=false,uniqueInjuryEffects=false,faceLocation=false,metalArmour=false,shieldMissileBlock=false,shieldWall=false,kurbulPlateArmourValue=false,kurbulBreakage=false,quickAreaAV=false,armourMaintenance=false,oversizedTargetZone=false,aberrantMorale=false,attenuatedABE=false,groupABE=false,relativeABE=false,initiativeReactionRoll=false}={}) {
  return {allies,flanking,meleeMaximumFoe,uniqueInjuryEffects,faceLocation,metalArmour,shieldMissileBlock,shieldWall,kurbulPlateArmourValue,kurbulBreakage,quickAreaAV,armourMaintenance,oversizedTargetZone,aberrantMorale,attenuatedABE,groupABE,relativeABE,initiativeReactionRoll};
}
export function GMDecision({id=uuid(),type,combatantIds=[],status='pending',choices=[],selected=null,context={}}) {
  return {id,type,combatantIds,status,choices,selected,context};
}
export function CombatState({id=uuid(),round=1,activeIR=null,combatants=[],relations={},events=[],decisions=[],log=[],options=CombatOptions()}={}) {
  return {schemaVersion:SCHEMA_VERSION,id,round,activeIR,combatants,relations,events,decisions,log,options};
}
export function Campaign({id=uuid(),name='Campaign',characters=[],combats=[],settings={}}={}) {
  return {schemaVersion:SCHEMA_VERSION,id,name,characters,combats,settings};
}
export const pairKey=(a,b)=>[a,b].sort().join('::');
