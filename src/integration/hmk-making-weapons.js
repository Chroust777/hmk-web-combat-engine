/** HMK 1.2 pp. 88, 93, 99–106. Material expense and retail value are distinct. */
export const WEAPON_WORKSHOP_PROJECTS=Object.freeze({
 weaponcraft:{label:'Výroba zbraní · Weaponcraft · HMK 88',primary:'Weaponcraft'},
 weaponWoodwork:{label:'Výroba zbraní · Woodworking · HMK 88',primary:'Woodworking'},
 weaponMetalwork:{label:'Výroba zbraní · Metalcraft · HMK 88',primary:'Metalcraft'},
 weaponTextile:{label:'Výroba sítí · Textilecraft · HMK 88',primary:'Textilecraft'},
 weaponHidework:{label:'Výroba bičů · Hideworking · HMK 88',primary:'Hideworking'}
});
const methods={
 weaponcraft:{kind:'weaponcraft',secondary:['Metalcraft','Mineralogy']},
 wood:{kind:'weaponWoodwork',secondary:[]},
 metal:{kind:'weaponMetalwork',secondary:['Woodworking']},
 textile:{kind:'weaponTextile',secondary:['Metalcraft']},
 hide:{kind:'weaponHidework',secondary:[]}
};
const table=[
 ['Ball & Chain',6,120,12,72],
 ['Bastard Sword',14,360,12,184],
 ['Battleaxe',9,190,12,108],
 ['Battlesword',22,450,13,240],
 ['Broadsword',12,240,12,156],
 ['Buckler',7,30,9,30],
 ['Club',4,10,9,12,'wood'],
 ['Dagger',3,35,11,24],
 ['Estoc',11,250,12,168],
 ['Falcastra',8,70,9,42],
 ['Falchion',10,230,12,120],
 ['Glaive',10,90,11,60],
 ['Grainflail',6,25,9,16,'metal'],
 ['Handaxe',12,110,11,84],
 ['Hatchet',3,10,9,6,'metal'],
 ['Javelin',4,60,10,36],
 ['Jousting Pole',2,80,8,40],
 ['Kéltan',4,70,12,36],
 ['Kite Shield',16,100,11,72],
 ['Knife',3,10,10,6,'metal'],
 ['Knight’s Shield',14,100,11,60],
 ['Lance',9,220,11,120],
 ['Longknife',5,200,13,96],
 ['Mace',6,140,12,108],
 ['Máng',8,220,10,108],
 ['Mankar',6,170,11,84],
 ['Maul',10,8,12,96,'wood'],
 ['Maul',10,8,12,96,'metal'],
 ['Morningstar',9,60,11,48],
 ['Net',22,80,9,48,'textile'],
 ['Pickaxe',12,20,9,18,'metal'],
 ['Pike',15,160,12,96],
 ['Pitchfork',4,10,9,9,'metal'],
 ['Poleaxe',14,70,11,96],
 ['Roundshield',8,60,10,48],
 ['Shôrkána',5,90,10,48],
 ['Scimitar',11,270,12,184],
 ['Shortsword',7,170,12,96],
 ['Sickle',3,20,9,10,'metal'],
 ['Spear',10,80,11,60],
 ['Staff',1,50,11,24,'wood'],
 ['Stick',1,10,8,6,'wood'],
 ['Tabûri',3,30,10,20],
 ['Tower Shield',20,130,11,96],
 ['Trident',10,120,12,72],
 ['Warflail',5,110,11,60],
 ['Warhammer',12,150,11,84],
 ['Whip',4,25,9,12,'hide'],
 ['Wood Axe',9,10,9,12,'metal']
];
export const MAKING_WEAPON_ITEMS=Object.freeze(Object.fromEntries(table.map(([name,costD,hours,wq,priceD,method='weaponcraft'])=>{
 const slug=name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z]+/g,'-');
 const key='weapon-'+slug+(name==='Maul'?'-'+method:'');
 const title=name==='Maul'?name+' · '+WEAPON_WORKSHOP_PROJECTS[methods[method].kind].primary:name;
 return [key,Object.freeze({...methods[method],name:title,costD,hours,wq,priceD,meleeWeapon:true})];
})));

export function weaponWorkshopTN(plan){
 return plan.workshop+Math.min(plan.workshop,plan.toolQuality);
}

export function weaponWorkResult(item,plan,proof,timeStars,rolls,dueMinute){
 const successes=rolls.filter(roll=>roll<=weaponWorkshopTN(plan)).length;
 const applied=Math.min(Math.max(0,item.wq-8),successes);
 const flaw=Math.max(0,3-proof.a.sv);
 const qualityDelta=Math.ceil(applied/2)-flaw;
 const impactDelta=item.name==='Net'?null:Math.floor(applied/2)-flaw;
 const faerieLongknife=item.name==='Longknife'&&proof.secondaryRollResult?.success===true;
 return {timeStars,rolls:[...rolls],successes,applied,flaw,qualityDelta,impactDelta,finalWQ:item.wq+qualityDelta,
  valueMultiplier:applied+1,salePriceD:flaw?null:item.priceD*(applied+1),dueMinute,faerieLongknife};
}
