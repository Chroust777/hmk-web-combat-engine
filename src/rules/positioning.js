export const CREATURE_SIZE={
  tiny:{zn:3,rch:-2},small:{zn:6,rch:-1},medium:{zn:10,rch:0},large:{zn:16,rch:1},big:{zn:20,rch:1},huge:{zn:30,rch:2},colossal:{zn:40,rch:4},titanic:{zn:80,rch:6}
};
export function proneEffects({walks=true}={}){
  if(!walks) return {canBecomeProne:false};
  return {canBecomeProne:true,meleeModifier:-20,countsForOpponentOutnumbered:false,opponentsMustStopInEZ:false,standingOpponentMayGetInCloseFreely:true,crawl:{difficult:true,maxRate:'full'},rise:{action:'move',feet:10}};
}
export function proneAimVsStandingHuman({zoneNumber}={}){
  if(zoneNumber===2||zoneNumber===3) return {defaultAim:true,aimPenalty:0,reachAdjustment:0};
  if(zoneNumber===1) return {defaultAim:false,aimPenalty:-10,reachAdjustment:-2};
  return {defaultAim:false,aimPenalty:-10,reachAdjustment:0};
}
export function standingStrikeVsProne({zoneNumberValid=true}={}){ return zoneNumberValid?{defaultAim:true,aimPenalty:0,mayGetInCloseFreely:true}:{defaultAim:false,unavailable:true}; }
export function canOverrun({moverZN,opponentZNs=[]}={}){ return opponentZNs.reduce((a,b)=>a+b,0)<moverZN; }

export function creatureAimVsHuman({size,zoneNumber,flying=false,groundedAs=null,humanUsingPunchOrGrab=false}={}){
 if(flying) return {available:true,aimPenalty:0,reachAdjustment:0,defaultAim:true};
 const s=groundedAs??size;
 if(s==='tiny'){
   if(zoneNumber>=8&&zoneNumber<=10)return {available:true,aimPenalty:0,reachAdjustment:0,defaultAim:true};
   if((zoneNumber===2||zoneNumber===3)&&humanUsingPunchOrGrab)return {available:true,aimPenalty:0,reachAdjustment:0,defaultAim:false};
   return {available:false};
 }
 if(s==='small'){
   if(zoneNumber>=8&&zoneNumber<=10)return {available:true,aimPenalty:0,reachAdjustment:0,defaultAim:true};
   if(zoneNumber>=6&&zoneNumber<=7)return {available:true,aimPenalty:-10,reachAdjustment:0,defaultAim:false};
   if((zoneNumber===2||zoneNumber===3)&&humanUsingPunchOrGrab)return {available:true,aimPenalty:0,reachAdjustment:0,defaultAim:false};
   return {available:false};
 }
 if(s==='medium'){
   if(zoneNumber>=8&&zoneNumber<=10)return {available:true,aimPenalty:0,reachAdjustment:0,defaultAim:true};
   if(zoneNumber>=4&&zoneNumber<=7)return {available:true,aimPenalty:-10,reachAdjustment:0,defaultAim:false};
   if(zoneNumber===2||zoneNumber===3)return humanUsingPunchOrGrab?{available:true,aimPenalty:0,reachAdjustment:0,defaultAim:false}:{available:true,aimPenalty:-10,reachAdjustment:-1,defaultAim:false};
   return {available:false};
 }
 return zoneNumber===1?{available:true,aimPenalty:0,reachAdjustment:0,defaultAim:true}:{available:zoneNumber>=2&&zoneNumber<=10,aimPenalty:-10,reachAdjustment:0,defaultAim:false};
}
export function naturalWeaponReach({baseReach=0,anatomyBonus=0}={}){return baseReach+anatomyBonus;}
export function eludingStrike({zoneDieRoll,targetZN}={}){return {hit:zoneDieRoll<=targetZN,eluded:zoneDieRoll>targetZN};}

export function oversizedTargetZone({optionEnabled=false,zoneZNCount,weaponZDSize}={}){
 const active=!!optionEnabled&&zoneZNCount>=2*weaponZDSize;
 return active?{active:true,locationDie:'d6',placeableWithinLN1to10:true}:{active:false,locationDie:'d10',placeableWithinLN1to10:false};
}
export function hardCoverStrike({locationProtected=false,strikeImpact=0}={}){return {targetImpact:locationProtected?0:strikeImpact,deflectedByCover:!!locationProtected};}
