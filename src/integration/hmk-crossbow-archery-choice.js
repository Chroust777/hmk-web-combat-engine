/** HMK World of Kèthîra, printed pp.45–46, 163.
 * Crossbow shooters may choose Archery ML or the test at Archery SB × 3.
 * Both come from verified character records; no GM-calculated EML or die.
 */
const requireValue=(ok,msg)=>{if(!ok)throw Error(msg)};
export function resolveCrossbowArcheryChoice({character,archerySkill,basis}={}){
 requireValue(basis==='ml'||basis==='sb3',
  'HMK str.163: střelec musí výslovně zvolit Archery ML nebo Archery SB × 3');
 requireValue(String(archerySkill?.name??'').trim().toLowerCase()==='archery'&&
  Number.isSafeInteger(archerySkill.ml)&&archerySkill.ml>=0&&archerySkill.ml<=200,
  'Kuše vyžaduje doloženou dovednost Archery');
 const per=character?.hmk?.attributes?.per,dex=character?.hmk?.attributes?.dex;
 const hasSB=Number.isSafeInteger(per)&&per>=1&&per<=200&&
  Number.isSafeInteger(dex)&&dex>=1&&dex<=200;
 requireValue(basis==='ml'||hasSB,
  'Archery SB × 3 nelze odvodit bez skutečného PER a DEX');
 const sb=hasSB?(per>dex?Math.ceil((per+dex)/2):Math.floor((per+dex)/2)):null;
 const sb3=sb===null?null:sb*3;
 return {basis,skill:'Archery',archeryML:archerySkill.ml,archerySB:sb,
  sb3,baseML:basis==='ml'?archerySkill.ml:sb3,
  source:basis==='ml'?'Archery ML':'Archery SB × 3',
  rules:'HMK World of Kèthîra pp.45–46,163'};
}
