/** v93.845 GM-managed Equipment Hazard: immutable event / live damaged item.
 * HMK p.148 supplies the result, not a forced app-generated repair calendar.
 * Only WQ-bearing inventory instances receive WQ 0. No dice or time are invented.
 */
export function equipmentCurrentWQ93845(item){
 const direct=item?.currentWQ;
 if(Number.isSafeInteger(direct)&&direct>=0)return direct;
 const printed=item?.snapshot?.properties?.quality;
 if(Number.isSafeInteger(printed)&&printed>=0)return printed;
 if(typeof printed==='string'&&/^\d+$/.test(printed.trim()))return Number(printed);
 return null;
}
export function applyEquipmentDamage93845(item,{result,sourceEpisodeId,repairProofId=null,repairActorId=null}={}){
 if(!item||!['ignored','long-delay','irreparable'].includes(result)||!sourceEpisodeId)
  throw Error('Equipment: neplatný podklad poškození.');
 const originalWQ=equipmentCurrentWQ93845(item);
 const previous=item.hmkEquipmentRepair?.originalWQ;
 const wqToRestore=Number.isSafeInteger(previous)?previous:originalWQ;
 const status=result==='irreparable'?'irreparable':'damaged';
 item.hmkEquipmentRepair={format:'hmk-inventory-equipment-repair-v1',status,
  sourceEpisodeId,repairProofId,repairActorId,
  gmManaged:true,outcome:result,
  ...(wqToRestore===null?{}:{originalWQ:wqToRestore})};
 if(wqToRestore!==null)item.currentWQ=0;
 const previousCondition=String(item.condition||'').replace(/\s*·?\s*HMK Equipment Hazard:\s*(?:neopravena závada|neopravitelný|čeká na opravu|rozbitý)[^·]*/gi,'').trim();
 item.condition=[previousCondition,status==='irreparable'?'HMK Equipment Hazard: neopravitelný':'HMK Equipment Hazard: rozbitý'].filter(Boolean).join(' · ');
 if(['main_hand','off_hand','worn'].includes(item.slot)){
  item.slot='carried';item.layerOrder=null;item.layerSlot=null;item.bulkExceptionZones=[];
 }
 item.coldWorn=false;
 return item;
}
