const LIMB_ZONES=new Set(['left-arm','right-arm','arm','left-leg','right-leg','leg','arms','legs']);
const HEAD_ZONES=new Set(['head','skull','face','neck']);
export function kurbulPlateAVAdjustment({material,zone,optionEnabled=false}={}){
 if(!optionEnabled||!['kurbul','plate'].includes(material)) return 0;
 if(LIMB_ZONES.has(zone)) return -1;
 if(HEAD_ZONES.has(zone)) return 1;
 return 0;
}
export function armourMaintenanceEffect(aq){
 if(aq<=-4) return {usable:false,destroyed:true,avModifier:-1};
 if(aq<=-3) return {usable:false,destroyed:false,avModifier:-1};
 if(aq<=-2) return {usable:true,destroyed:false,avModifier:-1};
 return {usable:true,destroyed:false,avModifier:0};
}
export function quickAreaAV(thoraxFireFrostAV){return thoraxFireFrostAV-1;}
export function kurbulBreakage({ordinalExcess,currentAQ=0,d10}={}){
 if(!Number.isInteger(ordinalExcess)||ordinalExcess<1) throw new RangeError('ordinalExcess >= 1 required');
 if(!Number.isInteger(d10)||d10<1||d10>10) throw new RangeError('d10 required');
 const adjustedRoll=d10+currentAQ; return {tn:ordinalExcess,adjustedRoll,destroyed:adjustedRoll<=ordinalExcess};
}

const MATERIAL_AV={cloth:{b:0,e:1,p:0,f:1},leather:{b:1,e:2,p:1,f:3},padded:{b:2,e:2,p:1,f:2},quilted:{b:4,e:3,p:2,f:3},gambeson:{b:6,e:5,p:4,f:5},kurbul:{b:4,e:6,p:5,f:4},scale:{b:4,e:8,p:5,f:5},mail:{b:2,e:8,p:7,f:3},plate:{b:6,e:11,p:9,f:5}};
/** Compose location AV from actual armour layers while applying the optional
 * Kurbul/Plate zone thickness and Armour Maintenance rules before summing. */
export function locationArmourValue({layers=[],zone,aspect,options={}}={}){
 const a=aspect==='blunt'?'b':aspect==='edge'?'e':aspect==='point'?'p':aspect==='fire'||aspect==='frost'?'f':aspect;
 if(!['b','e','p','f'].includes(a)) throw new RangeError('Armour aspect required');
 let total=0,rigid=false,hasScaleOrMail=false,hasPlate=false,metalArmour=false;
 const resolved=[];
 for(const layer of layers){
   if(layer?.destroyed) continue;
   const material=String(layer.material??'').toLowerCase().replace('û','u');
   const base=layer.av?.[a]??MATERIAL_AV[material]?.[a]; if(!Number.isFinite(base)) throw new Error(`Missing AV for ${material||'armour layer'}`);
   const maintenance=options.armourMaintenance?armourMaintenanceEffect(layer.aq??0):{usable:true,avModifier:0};
   if(!maintenance.usable) continue;
   const thickness=kurbulPlateAVAdjustment({material,zone,optionEnabled:!!options.kurbulPlateArmourValue});
   const av=Math.max(0,base+thickness+maintenance.avModifier); total+=av;
   const isMetal=['scale','mail','plate'].includes(material); rigid=rigid||!!layer.rigid;
   hasScaleOrMail=hasScaleOrMail||material==='scale'||material==='mail'; hasPlate=hasPlate||material==='plate'; metalArmour=metalArmour||isMetal;
   resolved.push({material,av,thicknessAdjustment:thickness,maintenanceAdjustment:maintenance.avModifier});
 }
 return {av:total,rigid,hasScaleOrMail,hasPlate,metalArmour,layers:resolved};
}
export function resolvedAreaArmourValue({thoraxLayers=[],thoraxFireFrostAV=null,quickOption=false,weightedAreaAV=null,options={}}={}){
 if(quickOption){
   const thorax=thoraxFireFrostAV??locationArmourValue({layers:thoraxLayers,zone:'torso',aspect:'f',options}).av;
   return {areaAV:quickAreaAV(thorax),method:'quick-thorax-minus-1'};
 }
 if(!Number.isFinite(weightedAreaAV)) return {areaAV:null,pending:{type:'weighted-area-av'}};
 return {areaAV:Math.round(weightedAreaAV),method:'weighted-coverage'};
}
