/** HMK v1.2 pp.343–344: exceptional *starting* skill grants.
 * Source-backed, pure. All computed rows live only in the existing
 * calculateSheetSkills projection; no duplicate character skill database.
 */
export function isTribalEmhle(character){
 const h=character?.hmk??{};
 return h.folk==='Human'&&h.society==='Tribal'&&h.nativeLanguage==='Émhlèn'&&
  ['Covenant','Kuélrhyn'].includes(h.pantheon);
}
/** p.344 dagger: SM1; double dagger: SM2 AFTER the fifth skill stage.
 * The non-dagger low/high Doctrine subject is only a blessing, never an SM grant.
 * Lakíse Script is the actual individual Script instance, not a generic Script.
 */
export const COVENANT_OCCUPATIONAL_FLOORS=Object.freeze({
 'Beóna':Object.freeze({'Herblore':2}),
 'Edâryr':Object.freeze({'Seamanship':1,'Piloting':2}),
 'Elarána':Object.freeze({'Tracking':1}),
 'Ylvýr':Object.freeze({'Timbercraft':2}),
 'Zârenor':Object.freeze({'Script (Lakíse)':2})
});
/** Find the free increase needed to REACH, not ADD, printed SM after
 * Family/Background/Occupation. Optional/Veteran/Sunsign contributions are
 * deliberately excluded when deciding the floor. No physical dice are added.
 */
export function covenantPostOccupationGrants(religion,allocations,definitions,stages){
 const floors=COVENANT_OCCUPATIONAL_FLOORS[religion];if(!floors)return {};
 const ritual=`Ritual (${religion})`;
 if(!Object.values(allocations).some(stage=>(stage?.[ritual]??0)>0))return {};
 const grant={};
 for(const [name,floor] of Object.entries(floors)){
  const def=definitions.find(x=>x.name===name)||definitions.find(x=>x.name==='Script'&&name.startsWith('Script ('));
  if(!def)throw Error('HMK p.344: neznámý Doctrine special skill '+name);
  const present=def.baseSM+stages.slice(0,5).reduce((sum,stage)=>sum+(allocations[stage]?.[name]??0),0)
   +(allocations['Native Proficiencies']?.[name]??0)+(allocations['Émhlè Family Ritual']?.[name]??0);
  if(present<floor)grant[name]=floor-present;
 }
 return grant;
}
