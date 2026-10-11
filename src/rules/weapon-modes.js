export function strengthImpactModifier(str){
  if(!Number.isInteger(str)||str<1) throw new RangeError('STR must be a positive integer');
  if(str===1)return -10;if(str===2)return -8;if(str===3)return -6;if(str===4)return -4;if(str===5)return -3;
  if(str<=7)return -2;if(str<=9)return -1;if(str<=11)return 0;
  return 1+Math.floor((str-12)/2);
}
export function adjustedStrengthImpact({str,offHand=false,thrown=false}={}){return strengthImpactModifier(str)-(offHand?1:0)-(thrown?1:0);}
export function heftPenalty({str,hft,twoHanded=false,offHand=false,shieldBlockOrPress=false}={}){
  let effectiveHft=hft-(twoHanded?5:0)+((offHand&&!shieldBlockOrPress)?5:0);
  let penalty=-5*Math.max(0,effectiveHft-str); if(Object.is(penalty,-0)) penalty=0;
  if(offHand&&!shieldBlockOrPress) penalty=Math.min(-10,penalty);
  return {effectiveHft,penalty};
}
export function twoHandedImpactBonus({str,listedHft,twoHanded=false,swung=true}={}){return twoHanded&&swung&&str>=listedHft?1:0;}

/** Data-driven transformation of an existing weapon definition into a special Strike Mode. */
export function specialStrikeMode(weapon,mode,{gauntlets=false}={}){
  if(!weapon) throw new Error('Weapon required');
  const group=(weapon.group||'').toLowerCase();
  const traits={...(weapon.traits||{})};
  if(mode==='half-sword'){
    if(group!=='sword') return {allowed:false,reason:'swords-only'};
    return {allowed:true,mode,length:Math.max(3,weapon.length-2),zd:weapon.zd,impact:weapon.impact,aspect:'point',twoHanded:true,traits:{...traits,thrust:true},cfGripInjury:(!gauntlets&&(weapon.name||'').toLowerCase()!=='estoc')?{severity:'M',level:1,aspect:'edge',location:'gripping-hand'}:null};
  }
  if(mode==='handle'){
    if(!['axe','club','flail','knife','sword'].includes(group)||((weapon.name||'').toLowerCase()==='whip')) return {allowed:false,reason:'weapon-group'};
    const block=(group==='knife'||group==='sword')?((traits.block||0)-10):(traits.block??0);
    return {allowed:true,mode,length:1,zd:6,impact:{die:6,modifier:0},aspect:'blunt',twoHanded:false,traits:{...traits,...((group==='knife'||group==='sword')?{block}:{})}};
  }
  if(mode==='shaft'){
    if(group!=='polearm') return {allowed:false,reason:'polearms-only'};
    const out={...traits};delete out.slow;delete out.thrust;
    if((weapon.name||'').toLowerCase()!=='staff') out.melee=(out.melee||0)-5;
    return {allowed:true,mode,length:weapon.length-2,zd:6,impact:{die:6,modifier:1},aspect:'blunt',twoHanded:weapon.twoHanded??false,traits:out};
  }
  throw new RangeError('Unknown special Strike Mode');
}
