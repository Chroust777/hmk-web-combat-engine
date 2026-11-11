'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {missingPrintedArmourCatalogEntries}=await import('../src/integration/armour-article-catalog.js');
 const {PRINTED_STARTER_GEAR_P120}=await import('../src/integration/hmk-auto-starting-kit.js');
 const {coldCatalogRule,coldInventoryChoices,resolveColdHazardEquipment}=await import('../src/integration/hmk-cold-gear-93740.js');
 const {calculateWeatherAreaAV}=await import('../src/integration/hmk-weather-area-av.js');
 const {evaluateTrekkingWeatherRoll}=await import('../src/integration/hmk-trekking-weather-roll.js');
 const {applyInventoryItemEdit}=await import('../src/integration/hmk-inventory-edit.js');
 let n=0;const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);n++},yes=(v,msg)=>{assert.ok(v,msg);n++};
 const armor=missingPrintedArmourCatalogEntries([]),cloaks=armor.filter(x=>/ Cloak$/.test(x.name));
 const printed=[...PRINTED_STARTER_GEAR_P120,...armor];
 const pick=name=>{const x=printed.find(x=>x.name===name);assert(x,`Missing printed ${name}`);return x};
 const entry=(id,source,slot='carried')=>({id,characterId:'P',quantity:1,slot,sourceItemId:source.id,snapshot:structuredClone(source)});
 for(const [name,bonus] of [['Cloth Cloak',1],['Padded Cloak',2],['Bedroll',1],['Bedroll, heavy',2],['Blanket',1],['Tent, 1-man',2],['Tent, 2-man',2]]){
  const source=pick(name);eq(coldCatalogRule(source)?.av,bonus,`${name}: valid printed rule`);
  const inv=entry(name,source,name.includes('Cloak')?'worn':'carried');eq(coldCatalogRule(inv)?.av,bonus,`${name}: inventory source attested`);
  const fake={...source,id:'gm-copy',builtin:false};eq(coldCatalogRule(fake),null,`${name}: user clone cannot impersonate printed`);
  const counterfeit={...source,id:'gm-copy',builtin:true};eq(coldCatalogRule(counterfeit),null,`${name}: fake builtin flag not enough`);
  const wrongWeight={...source,properties:{...source.properties,weightLb:(source.properties.weightLb??0)+12}};
  eq(coldCatalogRule(wrongWeight),null,`${name}: altered printed weight invalidates identity`);
  const wrongOrigin=entry('bad-'+name,source);wrongOrigin.sourceItemId='gm-copy';eq(coldCatalogRule(wrongOrigin),null,`${name}: source id mismatch`);
  const legacy=entry('legacy-'+name,source);delete legacy.sourceItemId;eq(coldCatalogRule(legacy)?.av,bonus,`${name}: old canonical snapshot without explicit source link retains printed bonus`);
 }
 const padded=entry('cloak',pick('Padded Cloak'),'worn');
 const bedroll=entry('bed',pick('Bedroll, heavy'));
 const shelter=entry('tent',pick('Tent, 1-man'));
 const custom={id:'gm-cloak',characterId:'P',sourceItemId:'gm-cloak',slot:'carried',quantity:1,coldWorn:true,snapshot:{id:'gm-cloak',name:'Padded Cloak',category:'armor',properties:{material:'padded',coldAV:99}}};
 eq(coldInventoryChoices([custom], 'P').automatic.length,0,'GM custom does not get automatic bonus by name');
 eq(resolveColdHazardEquipment({inventory:[custom],actorId:'P'}).gearAV,0,'GM custom does not grant printed protection');
 assert.throws(()=>applyInventoryItemEdit({characters:[{id:'P'}],inventory:[{...custom,snapshot:{...custom.snapshot,category:'other'},coldWorn:false}]},{ownerId:'P',itemId:'gm-cloak',slot:'carried',quantity:1,currentWQ:null,condition:'',coldWorn:true}),/Cold Hazard/);n++;
 eq(resolveColdHazardEquipment({inventory:[padded,bedroll,shelter],actorId:'P'}).gearAV,2,'worn padded cloak granted');
 eq(resolveColdHazardEquipment({inventory:[padded,bedroll,shelter],actorId:'P',gearId:'bed'}).gearAV,2,'GM-selected bedroll requires no second checkbox');
 const bedPlus=resolveColdHazardEquipment({inventory:[bedroll,shelter],actorId:'P',gearId:'bed',shelterId:'tent',usedConfirmed:true});
 eq([bedPlus.gearAV,bedPlus.shelterAV],[2,2],'attested used heavy bedroll plus pitched tent');
 const wornCloth=entry('cloth',pick('Cloth Cloak'),'worn');
 const candidates=['Cloth Cloak','Leather Shoes','Leather Vest','Padded Cap','Leather Bracers','Mail Cowl'];
 const defs=candidates.map(pick);let checked=0,skipped=0;
 for(let mask=0;mask<(1<<defs.length);mask++){
  const inv=defs.filter((_,i)=>mask&(1<<i)).map((d,i)=>entry('m'+mask+'-'+i,d,'worn'));
  const av=calculateWeatherAreaAV({inventory:inv,actorId:'P'});
  if(!av.ready){skipped++;continue;}
  checked++;yes(Number.isInteger(av.value)&&av.value>=0&&av.value<=99,'weighted Area AV is valid');
  const coldGear=resolveColdHazardEquipment({inventory:inv,actorId:'P'});
  const cold=evaluateTrekkingWeatherRoll({kind:'cold',areaAV:av.value,gearAV:coldGear.gearAV,roll:1});
  eq(cold.av,Math.min(av.value,4)+coldGear.gearAV,'cold uses F Area plus automatic cloak');
  const heat=evaluateTrekkingWeatherRoll({kind:'heat',areaAV:av.value,roll:1});
  eq(heat.av,Math.max(av.value,1),'heat uses Area AV but no cold gear');
  // Changing a worn cloak to carried must remove its automatic extra bonus.
  const undressed=inv.map(x=>({...x,slot:x.snapshot.name==='Cloth Cloak'?'carried':x.slot}));
  const w=coldInventoryChoices(undressed,'P');eq(w.automatic.length,0,'undressed cloak has no automatic Cold Gear AV');
  for(const extra of [{gearAV:0,shelterAV:0,fireFS:0},{gearAV:coldGear.gearAV,shelterAV:0,fireFS:0},{gearAV:2,shelterAV:2,fireFS:1}]){
   for(const sleet of [false,true])for(let die=1;die<=(sleet?10:6);die++){
    const x=evaluateTrekkingWeatherRoll({kind:'cold',areaAV:av.value,...extra,continuousSleet:sleet,roll:die});
    eq(x.sides,sleet?10:6,'cold d6 or d10');
    eq(x.exposed,die>(Math.min(av.value,4)+extra.gearAV+extra.shelterAV+extra.fireFS),'cold threshold');
   }
  }
  for(const h of [{resting:false,shadedRest:false,nativeHotClimate:false,sides:4},
   {resting:true,shadedRest:false,nativeHotClimate:false,sides:6},
   {resting:true,shadedRest:true,nativeHotClimate:false,sides:10},
   {resting:false,shadedRest:false,nativeHotClimate:true,sides:6},
   {resting:true,shadedRest:false,nativeHotClimate:true,sides:8},
   {resting:true,shadedRest:true,nativeHotClimate:true,sides:12}])for(let die=1;die<=h.sides;die++){
   const {sides,...flags}=h,x=evaluateTrekkingWeatherRoll({kind:'heat',areaAV:av.value,...flags,roll:die});
   eq(x.sides,sides,'heat d4,d6,d8,d10,d12');
   eq(x.exposed,die<=Math.max(av.value,1),'heat threshold');
   eq(x.gearAV,0,'no cold kit on heat');
  }
 }
 yes(checked>=6,`at least 6 valid wear combinations, got ${checked}`);
 console.log(`PASS ${n} v93.742 provenance and Cold/Heat matrix; ${checked} valid combinations, ${skipped} rejected/unsupported combinations`);
})().catch(e=>{console.error(e);process.exitCode=1});
