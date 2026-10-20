/** HMK 1.2 p.145. Orienteering is the guide's actual Survival SV,
 * adjusted by separately witnessed situational facts. Neither preparation
 * nor this calculation rolls dice, advances time or changes actor state.
 */
const requireFact=(yes,message)=>{if(!yes)throw Error(message);};
const isBool=x=>typeof x==='boolean';
export const ORIENTEERING_FORMAT='hmk-trek-orienteering-context-v1';
export function createOrienteeringContext({night=false,partySize,familiar=false,
 torchlight=false,fullMoon=false,afterSnowfall=false,conveyance='foot',droverId=null}={}){
 requireFact(Number.isSafeInteger(partySize)&&partySize>=1&&partySize<=10000,'Neplatný počet členů cestovní družiny');
 requireFact([night,familiar,torchlight,fullMoon,afterSnowfall].every(isBool),
  'Neplatné doložené podmínky Orienteering');
 requireFact(['foot','mount','cart','wagon'].includes(conveyance),'Neplatná doprava Orienteering');
 requireFact(conveyance==='foot'?droverId===null:typeof droverId==='string'&&droverId.length>0,
  'Cesta se zvířaty vyžaduje konkrétního drovera ze skupiny');
 // Artificial light, full moon and previous continuous snowfall offset night,
 // but do not confer free bonuses during daylight (printed p.145).
 requireFact(night||!(torchlight||fullMoon||afterSnowfall),
  'Noční zdroje světla lze použít jen při noční hlídce');
 return {format:ORIENTEERING_FORMAT,night,partySize,familiar,torchlight,fullMoon,
  afterSnowfall,conveyance,droverId,sourcePage:145};
}
export function adjustedOrienteeringSV({baseSV,context,droverResult=null}={}){
 requireFact(Number.isSafeInteger(baseSV)&&baseSV>=-100&&baseSV<=100,
  'Chybí skutečný výsledek Survival SV');
 requireFact(context?.format===ORIENTEERING_FORMAT,'Chybí doložené okolnosti Orienteering');
 const c=createOrienteeringContext(context);
 requireFact(JSON.stringify(c)===JSON.stringify(context),'Pozměněný důkaz okolností Orienteering');
 if(c.conveyance==='foot')requireFact(droverResult===null,'Pěší cesta nepotřebuje Drover Test');
 else requireFact(droverResult&&['CF','F','S','CS'].includes(droverResult.level),
   'Cesta se zvířaty vyžaduje propojený Riding/Animalcraft Drover Test');
 const nightPenalty=c.night?-3+Number(c.torchlight)+Number(c.fullMoon)+Number(c.afterSnowfall):0;
 const largePartyPenalty=-Math.floor(c.partySize/10);
 const droverPenalty=droverResult&&['CF','F'].includes(droverResult.level)?-1:0;
 const familiarityBonus=Number(c.familiar);
 const adjustedSV=baseSV+nightPenalty+largePartyPenalty+droverPenalty+familiarityBonus;
 return {baseSV,adjustedSV,nightPenalty,largePartyPenalty,droverPenalty,familiarityBonus,
   advantageModes:adjustedSV>=5?Math.min(5,adjustedSV-4):0,sourcePage:145};
}
/** The low-SV penalties must be explicitly carried in the prepared watch.
 * Forced injury/weariness/rain slows NEVER satisfy the orienteering penalty.
 */
export function assertOrienteeringModes({adjustment,modes}={}){
 requireFact(adjustment&&modes&&Number.isSafeInteger(modes.progress)&&
  Number.isSafeInteger(modes.bearing)&&Number.isSafeInteger(modes.orienteeringSlow)&&
  [0,1].includes(modes.orienteeringSlow)&&isBool(modes.lax),
  'Chybí doložený Lax/Slow režim Orienteering');
 const others={foraging:modes.foraging??0,stalking:modes.stalking??0,vigilance:modes.vigilance??0};
 requireFact(Number.isSafeInteger(others.foraging)&&others.foraging>=0&&others.foraging<=5&&
  Number.isSafeInteger(others.stalking)&&others.stalking>=0&&others.stalking<=1&&
  Number.isSafeInteger(others.vigilance)&&others.vigilance>=0&&others.vigilance<=1,
  'Neplatné Foraging/Stalking/Vigilance Modes');
 const spent=modes.progress+modes.bearing+others.foraging+others.stalking+others.vigilance;
 requireFact(spent<=adjustment.advantageModes,
  `Upravený Orienteering SV ${adjustment.adjustedSV} dovoluje ${adjustment.advantageModes} Progress/Bearing Modes, ale bylo použito ${spent}.`);
 const sv=adjustment.adjustedSV,penalties=Number(modes.lax)+modes.orienteeringSlow;
 if(sv<=0)requireFact(penalties===2,'Orienteering SV ≤ 0 ukládá současně Lax i Slow Mode');
 else if(sv<=2)requireFact(penalties===1,'Orienteering SV 1–2 ukládá právě jeden z Lax nebo Slow Mode');
 else requireFact(penalties===0,'Při Orienteering SV ≥ 3 se Lax/Slow z orientace nepřiděluje');
 return {adjustedSV:sv,spent,available:adjustment.advantageModes,lax:modes.lax,
  orienteeringSlow:modes.orienteeringSlow};
}
