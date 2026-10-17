import { ALERTNESS } from './alertness.js';

export function engagementZoneFeet(reach){
  if(!Number.isFinite(reach)) throw new TypeError('Reach required');
  return Math.max(5,reach);
}
export function engagementZoneSpaces(reach){
  if(!Number.isFinite(reach)||reach<0) throw new TypeError('Non-negative Reach required');
  // p159 map conversion: RCH 0-7 => 1 space, 8-12 => 2, 13-17 => 3, etc.
  return Math.max(1,Math.floor((reach+2)/5));
}

/** p159 Spirit World Initiative: entities inhabiting the spirit world, or lacking
 * Initiative, use Spirit ML for IR. In the astralscape Empathy EML breaks IR ties. */
export function initiativeRankSource({initiativeML=null,spiritML=null,inhabitsSpiritWorld=false}={}){
  if(!inhabitsSpiritWorld&&Number.isFinite(initiativeML)) return {initiativeRank:initiativeML,source:'initiative-ml'};
  if(Number.isFinite(spiritML)) return {initiativeRank:spiritML,source:'spirit-ml'};
  throw new TypeError('Initiative ML or Spirit ML required');
}
export function spiritWorldTieOrder(a,b,{astralscape=false}={}){
  if(!astralscape) return initiativeTieOrder(a,b);
  if(a.empathyEML!==b.empathyEML) return a.empathyEML>b.empathyEML?-1:1;
  if(!!a.isPC!==!!b.isPC) return a.isPC?-1:1;
  return 0;
}
export function exudesEngagementZone({alertness=ALERTNESS.AWARE,helpless=false,concentratingMultiRound=false}={}){
  return alertness===ALERTNESS.AWARE&&!helpless&&!concentratingMultiRound;
}
export function mayThreaten({alertness=ALERTNESS.AWARE,helpless=false,targetInEZ=false,weaponReachImpeded=false,choosesThreat=false,concentratingMultiRound=false}={}){
  return exudesEngagementZone({alertness,helpless,concentratingMultiRound})&&targetInEZ&&!weaponReachImpeded&&choosesThreat;
}
export function mayMeleeStrike({alertness=ALERTNESS.AWARE,readiedWeapon=false,targetThreatened=false}={}){
  return alertness===ALERTNESS.AWARE&&readiedWeapon&&targetThreatened;
}
export function movementOnEnteringThreateningEZ({entered=false,opponentCanThreaten=false,opponentChoosesThreat=false}={}){
  return {mustStop:!!(entered&&opponentCanThreaten&&opponentChoosesThreat)};
}
export function mayLeaveThreateningEZAtTurnStart({atStartOfTurn=false}={}){return !!atStartOfTurn;}

/** IR tie: higher Awareness EML, then PCs before NPCs. Remaining same-side tie is a player/GM choice. */
export function initiativeTieOrder(a,b){
  if(a.awarenessEML!==b.awarenessEML) return a.awarenessEML>b.awarenessEML?-1:1;
  if(!!a.isPC!==!!b.isPC) return a.isPC?-1:1;
  return 0;
}
/** p161 loaded crossbows: aware archers shoot before regular IR, ordered by IR. */
export function openingCrossbowOrder(combatants=[]){
 return combatants.filter(x=>x.aware&&x.loadedCrossbow).sort((a,b)=>(b.initiativeRank??-Infinity)-(a.initiativeRank??-Infinity));
}
