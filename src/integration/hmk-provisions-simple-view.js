/** Read-only, campaign-scoped presentation helpers (HMK pp.120, 147, 186).
 * Hours are ration-equivalent units, NOT a per-minute consumption engine.
 * Physical weight changes only through the original append-only custody receipts.
 */
import {characterProvisionsOverview} from './hmk-character-provisions-overview.js';
import {rationStockBalances} from './hmk-physical-ration-ledger.js';
import {availablePhysicalWater} from './hmk-physical-water-ledger.js';
const half=n=>Math.round(n*2)/2;
export function rationEquivalentMinutes(units,dailyNeed=1){
 if(!Number.isFinite(units)||units<0||![0.5,1,2].includes(dailyNeed))return null;
 return Math.round(units/dailyNeed*1440);
}
export function supplyDurationText(minutes){
 if(!Number.isSafeInteger(minutes)||minutes<0)return 'nelze doložit';
 const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
 return [days?days+' d':'',hours?hours+' h':'',mins?mins+' min':''].filter(Boolean).join(' ')||'0 h';
}
export function characterCarryProjection(database,actorId){
 const status=characterProvisionsOverview(database,actorId);
 if(!status.available)return {available:false,reason:status.reason};
 const {minute,campaignId}=status,journal=database.journal||[];
 const foodLots=rationStockBalances(journal,campaignId,actorId,minute).filter(l=>l.minute<=minute&&l.remaining>0);
 const waterLots=availablePhysicalWater(journal,campaignId,actorId,minute).filter(l=>l.remaining>0);
 const carriedFood=half(foodLots.reduce((n,l)=>n+l.remaining,0));
 const carriedWater=half(waterLots.reduce((n,l)=>n+l.remaining,0));
 const edibleFood=half(foodLots.filter(l=>l.expiresAt>=minute).reduce((n,l)=>n+l.remaining,0));
 const foodLb=carriedFood*3,waterLb=carriedWater*10;
 return {available:true,actorId,minute,campaignId,foodLots,waterLots,
  physicalFoodLb:foodLb,physicalWaterLb:waterLb,totalPhysicalLb:foodLb+waterLb,
  carriedFood,carriedWater,edibleFood,
  foodMinutes:rationEquivalentMinutes(edibleFood,status.food.dailyBaseline),
  waterMinutes:rationEquivalentMinutes(carriedWater,status.water.dailyBaseline),
  // No counter reports 'time to starvation'. These are only ration equivalents.
  spoiledFood:half(carriedFood-edibleFood),baselineFoodNeed:status.food.dailyBaseline,
  baselineWaterNeed:status.water.dailyBaseline};
}
export function partyCarryProjection(database,actors=[]){
 const rows=actors.map(c=>({actorId:c.id,name:c.name,...characterCarryProjection(database,c.id)}));
 return {rows,totalFoodLb:rows.reduce((n,r)=>n+(r.physicalFoodLb||0),0),
  totalWaterLb:rows.reduce((n,r)=>n+(r.physicalWaterLb||0),0),
  totalCarriedLb:rows.reduce((n,r)=>n+(r.totalPhysicalLb||0),0)};
}
