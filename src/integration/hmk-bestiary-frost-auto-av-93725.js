/** HMK v1.2, pp.117–119, 133, 185, 244, 261.
 * A beast's printed Frost AV is natural, not the worn-armour AV of its owner.
 * The current bestiary catalogue does not supply a verified mapping from
 * human p118 armour locations to a beast's a–m anatomy. Do not treat such
 * equipment as AV 0, and never allow a typed value to bypass this gap.
 */
export function resolveBestiaryFrostAV93725({profile,inventory,beastId,ownerAnimalId=null}={}){
 const native=profile?.combat?.av?.f;
 if(!Number.isSafeInteger(native)||native< -100||native>100)
  return {ready:false,reason:'Chybí ověřená přirozená Frost AV z profilu tvora.'};
 if(!Array.isArray(inventory)||typeof beastId!=='string'||!beastId)
  return {ready:false,reason:'Nelze ověřit nasazenou výstroj tvora.'};
 const ids=new Set([beastId]);
 if(typeof ownerAnimalId==='string'&&ownerAnimalId)ids.add(ownerAnimalId);
 const worn=inventory.filter(x=>ids.has(x.characterId)&&x.slot==='worn');
 if(worn.length)return {ready:false,reason:'Tvor má nasazenou výstroj, ale chybí ověřené mapování jejích lokací na zvířecí anatomii. AV se nesmí odhadnout ani zadat ručně.',wornIds:worn.map(x=>x.id)};
 return {ready:true,value:Math.max(0,native),source:'bestiary-printed-natural-frost',wornCount:0};
}

/** No AV column is accepted: a client cannot spoof the protection by typing
 * another number. The server-side-in-app writer supplies a fresh source AV. */
export function parseBestiaryFrostSites93725(siteText,protection){
 if(!protection?.ready||!Number.isSafeInteger(protection.value))throw Error(protection?.reason||'AV není doložené');
 if(typeof siteText!=='string')throw Error('Chybí soupis anatomických lokalit');
 return siteText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
  const cols=line.split(';').map(x=>x.trim());
  if(![4,5].includes(cols.length))throw Error('Lokace musí mít 4 nebo 5 polí: lokace;strana;Shock d100;Fatigue[;subsite]. Ruční AV není přípustné.');
  const loc=cols[0].toLowerCase(),sub=cols[4]||'';
  if(sub&&loc!=='hd'&&!(loc==='wng'&&sub==='wing-limb'))throw Error('Subsite je povolen jen na hlavě nebo jako wing-limb.');
  return {locationId:loc,side:cols[1].toLowerCase(),av:protection.value,
   shockRoll:cols[2]===''?null:Number(cols[2]),fatigue:cols[3]===''?null:Number(cols[3]),
   facialFeature:loc==='hd'?sub:'',wingAsLimbConfirmed:loc==='wng'&&sub==='wing-limb'};
 });
}
