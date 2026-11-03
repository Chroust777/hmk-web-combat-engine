/** Shared inventory-instance combat serviceability gate (HMK Equipment Hazard).
 * Damage from a failed Equipment repair must not silently be treated as armour,
 * a readied weapon, or a shield; an irreparable item cannot be equipped.
 * The original snapshot, WQ, proof and repair counter are never changed here.
 */
export function equipmentUnusable(item){
 if(!item||item.destroyed===true)return true;
 const repair=item.hmkEquipmentRepair;
 return repair?.status==='damaged'||repair?.status==='irreparable'||
  /HMK Equipment Hazard:\s*(?:neopravena závada|neopravitelný|čeká na opravu)/i.test(String(item.condition||''));
}
export const equipmentUsable=item=>!equipmentUnusable(item);
