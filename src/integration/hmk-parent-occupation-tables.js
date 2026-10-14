/** HMK v1.2 pp. 26–28. Feudal/Imperial occupations, measured in d100.
 * This module transcribes the printed interval endpoints (00 = 100).
 * Physical rolls supplied by GM only; no randomness and no persistence.
 * The City-State table explicitly inherits Imperial occupations (p.28).
 */
const spec = {
 Feudal: {
  Unfree:`4|Slave|subroll\n90|Farmer|0\n98|Servant, Domestic|0\n100|Tenant Officer|0`,
  Free:`1|Animal Trainer|75\n6|Beggar|95\n7|Cartographer/Artist|90\n8|Cook|80\n33|Farmer|0\n44|Fisher|50\n45|Gaoler|90\n49|Herder|0\n55|Hunter or Trapper|10\n56|Invoker|10\n57|Jester|50\n65|Labourer, Farm|0\n68|Labourer, Semi-skilled|90\n79|Labourer, Unskilled|95\n81|Longshoreman|100\n84|Prostitute|75\n86|Ratter|70\n87|Scholar|80\n88|Scribe|90\n90|Servant, Domestic|80\n91|Teamster|90\n92|Thatcher|5\n93|Toymaker|75\n95|Woodcutter|40\n96|Yeoman (Archer)|0\n99|Yeoman (Foot)|0\n100|Yeoman (Horse)|0`,
  Guilded:`1|Alchemist|90\n2|Apothecary|90\n3|Astrologer|90\n5|Chandler|95\n7|Charcoaler|10\n10|Clothier|95\n11|Courtesan|99\n13|Embalmer|95\n15|Glassworker|90\n17|Harper|80\n19|Herald|80\n25|Hideworker|40\n29|Innkeeper|35\n31|Jeweller|99\n33|Lexigrapher|95\n36|Lìa-Kaváir|75\n37|Litigant|95\n38|Locksmith|95\n40|Mason|60\n47|Mercantyler|90\n57|Metalsmith|15\n65|Miller|10\n68|Miner|1\n70|Ostler|75\n72|Perfumer|95\n73|Physician|75\n74|Pilot|95\n78|Potter|85\n79|Runemaster|90\n81|Salter|30\n84|Seaman|95\n85|Shèk-Pvâr|90\n86|Shipwright|90\n87|Tentmaker|95\n88|Thespian|70\n90|Timberwright|10\n92|Weaponcrafter|75\n100|Woodcrafter|30`,
  Military:`2|Gladiator|95\n62|Man-at-arms|50\n67|Man-at-arms (Archer)|50\n68|Man-at-arms (Sapper)|50\n98|Mercenary|90\n100|Swordmaster|80`,
  Priestly:`100|Priest|65`,
  Noble:`1|Gentry: Arcanist|90\n2|Gentry: Cartographer|90\n6|Gentry: Courtier|50\n7|Gentry: Forester|10\n8|Gentry: Harper|80\n9|Gentry: Herald|80\n10|Gentry: Litigant|95\n11|Gentry: Mercantyler|90\n12|Gentry: Mercenary|90\n13|Gentry: Physician|75\n14|Gentry: Pilot|95\n16|Gentry: Priest|65\n17|Gentry: Scholar|80\n45|Knight Bachelor|50\n68|Manor Lord, Appointed|5\n97|Manor Lord, Enfeoffed|0\n100|Tenant-in-chief|100`
 },
 Imperial: {
  Unfree:`55|Slave|subroll\n90|Farmer|0\n100|Servant, Domestic|0`,
  Free:`1|Animal Trainer|75\n2|Beggar|95\n3|Cartographer/Artist|90\n4|Cook|80\n57|Farmer|0\n61|Fisher|50\n62|Gaoler|90\n63|Herder|0\n64|Hunter or Trapper|10\n65|Invoker|10\n66|Jester|50\n85|Labourer, Farm|0\n87|Labourer, Semi-skilled|90\n90|Labourer, Unskilled|95\n91|Longshoreman|100\n92|Prostitute|75\n93|Ratter|70\n94|Scholar|80\n95|Scribe|90\n96|Servant, Domestic|80\n97|Teamster|90\n98|Thatcher|5\n99|Toymaker|75\n100|Woodcutter|40`,
  Guilded:`1|Alchemist|90\n2|Apothecary|90\n3|Astrologer|90\n5|Chandler|95\n7|Charcoaler|10\n10|Clothier|95\n11|Courtesan|99\n13|Embalmer|95\n15|Glassworker|90\n17|Harper|80\n19|Herald|80\n24|Hideworker|40\n28|Innkeeper|35\n30|Jeweller|99\n32|Lexigrapher|95\n35|Lìa-Kaváir|75\n36|Litigant|95\n37|Locksmith|95\n40|Mason|60\n46|Mercantyler|90\n55|Metalsmith|15\n63|Miller|10\n66|Miner|1\n69|Ostler|75\n72|Perfumer|95\n73|Physician|75\n74|Pilot|95\n78|Potter|85\n79|Runemaster|90\n81|Salter|30\n84|Seaman|95\n85|Shèk-Pvâr|90\n86|Shipwright|90\n87|Tentmaker|95\n88|Thespian|70\n90|Timberwright|10\n92|Weaponcrafter|75\n100|Woodcrafter|30`,
  Military:`2|Gladiator|95\n80|Legionnaire|90\n83|Man-at-arms (Archer)|50\n85|Man-at-arms (Cavalry)|90\n86|Man-at-arms (Sapper)|50\n98|Mercenary|90\n100|Swordmaster|80`,
  Priestly:`30|Bureaucrat|95\n100|Priest|65`,
  Noble:`95|Patrician (Minor)|95\n100|Patrician (Major)|95`
 }
};
/** Further printed parent-occupation tables, HMK v1.2 pp.29–32.
 * The original Feudal/Imperial rows stay unchanged; subtype inheritance below
 * resolves to these same authoritative rows (not copied parallel tables). */
Object.assign(spec,{
 'Tribal':{
  Unfree:`100|Slave (Domestic)|0`,
  Priestly:`10|Invoker|0\n100|Shaman|0`,
  Noble:`100|Chieftain|0`
 },
 'Tribal-Settled':{
  Unfree:`5|Slave (Craft)|90\n15|Slave (Domestic)|90\n65|Slave (Farming)|0\n90|Slave (Fishing)|50\n100|Slave (Herding)|0`,
  Guilded:`1|Alchemist|90\n2|Apothecary|90\n3|Astrologer|90\n20|Clothier|95\n24|Embalmer|95\n33|Harper|80\n63|Hideworker|40\n77|Mercantyler|90\n83|Metalsmith|15\n84|Ostler|75\n89|Physician|75\n93|Potter|85\n94|Salter|30\n95|Shèk-Pvâr|90\n96|Tentmaker|95\n97|Thespian|70\n98|Timberwright|10\n99|Weaponcrafter|75\n100|Woodcrafter|30`
 },
 Tributary:{
  Unfree:`3|Slave|subroll\n99|Farmer (Thrall)|0\n100|Servant, Domestic|0`,
  Free:`1|Animal Trainer|75\n3|Beggar|95\n4|Cartographer/Artist|90\n5|Cook|80\n64|Farmer|0\n73|Fisher|50\n74|Gaoler|90\n75|Herder|0\n78|Hunter or Trapper|10\n79|Invoker|10\n80|Jester|50\n84|Labourer, Farm|0\n86|Labourer, Semi-skilled|90\n90|Labourer, Unskilled|95\n91|Longshoreman|100\n92|Prostitute|75\n93|Ratter|70\n94|Scholar|80\n95|Scribe|90\n96|Servant, Domestic|80\n97|Teamster|90\n98|Thatcher|5\n99|Toymaker|75\n100|Woodcutter|40`,
  Guilded:`1|Alchemist|90\n2|Apothecary|90\n3|Astrologer|90\n5|Chandler|95\n7|Charcoaler|10\n10|Clothier|95\n11|Courtesan|99\n13|Embalmer|95\n15|Glassworker|90\n18|Harper/Skald|80\n19|Herald|80\n25|Hideworker|40\n29|Innkeeper|35\n31|Jeweller|99\n33|Lexigrapher|95\n35|Lìa-Kaváir|75\n36|Litigant|95\n37|Locksmith|95\n39|Mason|60\n47|Mercantyler|90\n56|Metalsmith|15\n63|Miller|10\n66|Miner|1\n67|Ostler|75\n69|Perfumer|95\n70|Physician|75\n72|Pilot|95\n76|Potter|85\n78|Runemaster|90\n80|Salter|30\n84|Seaman|95\n85|Shèk-Pvâr|90\n86|Shipwright|90\n87|Tentmaker|95\n88|Thespian|70\n90|Timberwright|10\n92|Weaponcrafter|75\n100|Woodcrafter|30`,
  Military:`14|Huscarl|50\n20|Man-at-arms (Archer)|50\n23|Man-at-arms (Sapper)|50\n97|Mercenary|90\n100|Swordmaster|80`,
  Priestly:`100|Priest|65`,
  Noble:`95|Clanhead (Minor)|95\n100|Clanhead (Major)|95`
 },
 'Kúzhan':{
  Larkuz:`1|Labourer, Semi-skilled|99\n10|Labourer, Unskilled|99\n100|Miner|10`,
  Tolkuz:`10|Chandler|100\n20|Charcoaler|50\n95|Mason|99\n100|Woodcrafter|95`,
  Azkuz:`10|Clothier|100\n15|Hideworker|99\n55|Jeweller|100\n65|Locksmith|100\n95|Metalsmith|80\n100|Potter|100`,
  Erkuz:`10|Alchemist|100\n18|Apothecary|100\n34|Cook|100\n41|Hunter|25\n43|Miller|25\n58|Physician|100\n69|Salter|90\n91|Servant|100\n96|Teamster|100\n98|Tentmaker|100\n100|Timberwright|25`,
  Zerkuz:`1|Astrologer|100\n3|Embalmer|100\n6|Glassworker|100\n8|Herald|100\n16|Harper/Skald|100\n23|Innkeeper|95\n31|Lexigrapher|100\n32|Litigant|100\n74|Mercantyler|100\n75|Priest|99\n76|Runemaster|100\n89|Scholar|100\n93|Scribe|100\n98|Shèk-Pvâr (Jmôrvi)|100\n99|Shèk-Pvâr (Fývria)|100\n100|Thespian|100`,
  Konkuz:`25|Man-at-arms|99\n35|Man-at-arms (Sapper)|100\n39|Mercenary|100\n40|Swordmaster|100\n100|Weaponcrafter|100`,
  Yankuz:`100|Clanhead (Royal)|100`
 },
 'Malák':{
  Military:`90|Mercenary|0\n100|Swordmaster|0`
 },
 'Mizúni':{
  Free:`55|Herder|0\n56|Invoker|0\n65|Man-at-arms|0\n70|Shaman|0\n100|Hunter|0`,
  Crafter:`1|Alchemist|0\n2|Apothecary|0\n3|Astrologer|0\n20|Clothier|0\n22|Glassworker|0\n23|Harper|0\n28|Hideworker|0\n30|Jeweller|0\n32|Lexigrapher|0\n33|Locksmith|0\n43|Mason|0\n48|Mercantyler|0\n63|Metalsmith|0\n73|Miner|0\n74|Physician|0\n81|Potter|0\n83|Salter|0\n84|Shèk-Pvâr|0\n85|Tentmaker|0\n86|Thespian|0\n88|Timberwright|0\n90|Weaponcrafter|0\n100|Woodcrafter|0`,
  Noble:`100|Chieftain|0`
 },
 'Sináin':{
  Free:`1|Animal Trainer|40\n2|Cartographer/Artist|60\n3|Cook|50\n8|Fisher|30\n88|Hunter or Trapper|5\n89|Invoker|5\n93|Scholar|50\n95|Scribe|60\n96|Servant, Domestic|50\n97|Teamster|60\n98|Thatcher|1\n99|Toymaker|50\n100|Woodcutter|25`,
  Crafter:`2|Alchemist|60\n4|Apothecary|60\n6|Astrologer|60\n7|Chandler|60\n8|Charcoaler|5\n13|Clothier|60\n14|Embalmer|60\n16|Glassworker|60\n25|Harper|50\n27|Herald|50\n37|Hideworker|25\n40|Innkeeper|25\n49|Jeweller|65\n52|Lexigrapher|60\n53|Lìa-Kaváir|50\n54|Locksmith|60\n59|Mason|40\n61|Mercantyler|60\n66|Metalsmith|10\n67|Miller|5\n68|Miner|1\n70|Ostler|50\n71|Perfumer|60\n73|Physician|50\n74|Pilot|60\n76|Potter|55\n77|Salter|20\n78|Seaman|60\n80|Shèk-Pvâr (Fývria)|60\n86|Shèk-Pvâr|60\n88|Shipwright|60\n89|Tentmaker|60\n91|Thespian|50\n93|Timberwright|5\n96|Weaponcrafter|50\n100|Woodcrafter|20`,
  Military:`35|Man-at-arms|60\n50|Man-at-arms (Archer)|30\n55|Man-at-arms (Cavalry)|30\n70|Mercenary|60\n100|Swordmaster|50`,
  Valpalen:`10|Arcanist|60\n11|Artist|60\n56|Forester|5\n59|Harper|50\n60|Herald|50\n61|Mercantyler|60\n62|Mercenary|60\n63|Physician|50\n64|Pilot|60\n65|Priest (Siém)|0\n70|Scholar|80\n90|Knight Bachelor|30\n100|Tenant-in-chief|60`
 }
});
function parseRows(rows){const parsed=rows.split('\n').map(line=>{const [hi,name,urban]=line.split('|');return Object.freeze({max:Number(hi),name,urbanChance:urban==='subroll'?null:Number(urban)});});let prev=0;for(const row of parsed){if(!Number.isInteger(row.max)||row.max<=prev||row.max>100||!row.name||row.urbanChance!==null&&(!Number.isInteger(row.urbanChance)||row.urbanChance<0||row.urbanChance>100))throw Error('Invalid source-backed occupation table');prev=row.max;}if(prev!==100)throw Error('Incomplete occupation table');return Object.freeze(parsed)}
export const PARENT_OCCUPATION_TABLES=Object.freeze(Object.fromEntries(Object.entries(spec).map(([s,classes])=>[s,Object.freeze(Object.fromEntries(Object.entries(classes).map(([k,v])=>[k,parseRows(v)])))])));
const slavery={Feudal:[[1,'Craft',90],[2,'Domestic',90],[12,'Farming',0],[18,'Fishing',50],[20,'Herding',0]],Imperial:[[1,'Craft',90],[2,'Domestic',90],[11,'Farming',0],[17,'Fishing',50],[18,'Gladiator',95],[20,'Herding',0]],Tributary:[[1,'Craft',90],[2,'Domestic',90],[12,'Farming',0],[19,'Fishing',50],[20,'Herding',0]]};
function physical(n,sides,label){if(!/^\d+$/.test(String(n))||!Number.isSafeInteger(Number(n))||Number(n)<1||Number(n)>sides)throw Error(`${label}: fyzický d${sides} musí být 1–${sides}`);return Number(n)}
export function parentOccupationFromRoll({society,socialClass,roll,classRoll,classDie=100,subRoll,specialRoll,convocationRoll,allowLegacyIncomplete=false}={}){
 const die=physical(roll,100,'Parent Occupation');
 let tableSociety=({'City-State':'Imperial','Viking':'Tributary','Chélemby':'Tributary','Tribal-Settled':'Tribal-Settled'})[society]??society;
 if(society==='Tribal-Settled'&&['Free','Priestly','Noble'].includes(socialClass))tableSociety='Tribal';
 if(society==='Feudal/Imperial'){
  if(socialClass!=='Noble')tableSociety='Feudal';
  else {const classValue=physical(classRoll,Number(classDie),'Feudal/Imperial Noble Class');tableSociety=classValue%2?'Feudal':'Imperial';}
 }
 const table=PARENT_OCCUPATION_TABLES[tableSociety]?.[socialClass];if(!table)throw Error('Nepřevedená Parent Occupation tabulka pro Society / Class');
 const found=table.find(x=>die<=x.max);let name=found.name,urbanChance=found.urbanChance,subtype=null;
 if(found.name==='Slave'){
  if(subRoll===undefined||String(subRoll).trim()==='')throw Error('Slave: vyžaduje doplňující fyzický d20 (HMK str.27–28)');
  const sr=physical(subRoll,20,'Slave type'),s=slavery[tableSociety].find(x=>sr<=x[0]);subtype=s[1];name=`Slave (${subtype})`;urbanChance=s[2];
 }else if(found.name==='Tenant Officer'){
  // Feudal p.27 footnote 2: the SAME additional physical d20 slot as
  // Slave type, but a different printed OFFICE table, never a GM guess.
  if(subRoll===undefined||String(subRoll).trim()==='')throw Error('Tenant Officer: povinný fyzický d20 pro office (HMK str.27)');
  const sr=physical(subRoll,20,'Tenant Officer office');
  subtype=sr<=4?'Beadle':sr<=7?'Herder':sr<=15?'Reeve':'Woodward';
  name=`Tenant Officer (${subtype})`;
 }else if(subRoll!==undefined&&String(subRoll).trim()!=='')throw Error('Doplňkový d20 není pro tuto Parent Occupation určen');
 const isArcanist=found.name==='Gentry: Arcanist'||found.name==='Arcanist';
 let arcanistType=null,primaryConvocation=null,specialDie=null;
 if(isArcanist){
  specialDie=20;
  if(!allowLegacyIncomplete&&(specialRoll===undefined||String(specialRoll).trim()===''))throw Error('Arcanist: povinný fyzický d20 pro podtyp (HMK str.27/32)');
  const sr=allowLegacyIncomplete&&String(specialRoll??'').trim()===''?null:physical(specialRoll,20,'Arcanist subtype');
  const limits=tableSociety==='Sináin'?[4,7,20]:[7,14,20];
  if(sr!==null){arcanistType=sr<=limits[0]?'Alchemist':sr<=limits[1]?'Astrologer':'Shèk-Pvâr';name=`${found.name} (${arcanistType})`;}
 }else if(specialRoll!==undefined&&String(specialRoll).trim()!=='')throw Error('Arcanist d20 není pro toto Parent Occupation povolen');
 const needsConvocation=found.name==='Shèk-Pvâr'||(isArcanist&&arcanistType==='Shèk-Pvâr');
 if(needsConvocation){
  if(!allowLegacyIncomplete&&(convocationRoll===undefined||String(convocationRoll).trim()===''))throw Error('Shèk-Pvâr: povinný fyzický d6 Primary Convocation (HMK str.195)');
  if(String(convocationRoll??'').trim()!=='')primaryConvocation=['Fývria','Jmôrvi','Pèleáhn','Lyáhvi','Sàvôrya','Odívshè'][physical(convocationRoll,6,'Primary Convocation')-1];
  if(primaryConvocation)name+=` (${primaryConvocation})`;
 }else if(convocationRoll!==undefined&&String(convocationRoll).trim()!=='')throw Error('Primary Convocation d6 není pro toto povolání určen');
 const secondaryRollRequired=['Manor Lord, Appointed','Tenant-in-chief','Patrician (Major)','Clanhead (Major)'].includes(found.name);
 return {name,urbanChance,society,socialClass,roll:die,tableSociety,subRoll:subtype?Number(subRoll):null,subtype,...(arcanistType?{specialRoll:Number(specialRoll),arcanistType}:{}),...(primaryConvocation?{convocationRoll:Number(convocationRoll),primaryConvocation}:{}),secondaryRollRequired,sourcePage:tableSociety==='Feudal'?27:tableSociety==='Imperial'?28:tableSociety==='Tribal'||tableSociety==='Tribal-Settled'?29:tableSociety==='Tributary'?30:tableSociety==='Kúzhan'?31:['Malák','Mizúni'].includes(tableSociety)?423:32};
}
export function parentTitleFromBackground(occupation,backgroundRoll,{society=null}={}){const n=physical(backgroundRoll,100,'Background / Noble Title');
 const rows=occupation==='Manor Lord, Appointed'?[[3,'Constable'],[5,'Sheriff'],[15,'Bailiff (Hundred)'],[100,'Bailiff']]:occupation==='Tenant-in-chief'?(society==='Sináin'?[[10,'King'],[30,'Earl/Count'],[100,'Baron']]:[[5,'King/Duke'],[30,'Earl/Count'],[100,'Baron']]):occupation==='Patrician (Major)'?[[5,'Royalty'],[100,'Great House']]:occupation==='Clanhead (Major)'?[[5,'Royalty'],[100,'Great Clan']]:null;
 return rows?rows.find(([max])=>n<=max)[1]:null;
}
