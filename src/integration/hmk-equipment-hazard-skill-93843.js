/** Equipment Hazard skill resolution, HMK v1.2 p.148.
 * The printed hazard gives Hideworking (straps/harness/waterskin),
 * Metalcraft (horseshoe), Textilecraft (rope), Woodworking (wheel/axle).
 * For unlisted possessions, use their verified catalog craft skill/material
 * where known; do not claim every inventory item is field-repairable.
 * This only selects an appropriate skill. It NEVER produces an outcome roll.
 */
const skillCodes=Object.freeze({H:'Hideworking',M:'Metalcraft',T:'Textilecraft',W:'Woodworking'});
const skills=new Set(Object.values(skillCodes));
export function equipmentHazardSkill93843(item){
 const p=item?.snapshot?.properties||{},name=String(item?.snapshot?.name||'').trim();
 const category=item?.snapshot?.category||'';
 if(!name||!item?.id)return {skill:null,source:'missing',reason:'Nejprve vyberte skutečný předmět ze skupiny.'};
 // Weapons have the separate HMK Weaponcraft/WQ repair procedure (pp. 88-89),
 // which must not be passed off as an ordinary p.148 four-skill equipment test.
 if(['weapon','shield'].includes(category))return {skill:null,source:'special',reason:'Zbraň nebo štít potřebuje ověřit materiál a samostatná pravidla oprav/WQ; obecný Equipment test zde nelze automaticky nabídnout.'};
 const patterns=[
  [/\b(horseshoe|horseshoes|podkov)/i,'Metalcraft'],
  [/\b(wheel|axle|kolo|náprav)/i,'Woodworking'],
  [/\b(rope|cordage|provaz|lano)\b/i,'Textilecraft'],
  [/\b(harness|strap|waterskin|postroj|řemen|měch)\b/i,'Hideworking']
 ];
 for(const [re,skill] of patterns)if(re.test(name))return {skill,source:'hmk-148-example',reason:'Přímo podle příkladů Equipment Hazard v HMK str. 148.'};
 const raw=String(p.craftSkill??'').trim();
 const fromCatalog=skillCodes[raw]||(skills.has(raw)?raw:null);
 if(fromCatalog)return {skill:fromCatalog,source:'catalog',reason:'Převzato z doložené katalogové dovednosti výroby předmětu; použití na opravu je pravidlově odvozené.'};
 const material=String(p.material||'').toLowerCase();
 const nameMaterial=/^(cloth|padded|quilted|gambeson|linen|wool|silk|textile)\b/i.test(name)?'textile':
  /^(leather|fur|hide|rawhide)\b/i.test(name)?'leather':null;
 const mat=material||nameMaterial;
 if(/cloth|fabric|linen|wool|silk|padded|quilted|gambeson|textile/.test(mat))
  return {skill:'Textilecraft',source:'material',reason:'Textilní materiál předmětu; HMK str. 89 popisuje Textilecraft pro výrobu oděvů.'};
 if(/leather|hide|fur|rawhide|skin/.test(mat))
  return {skill:'Hideworking',source:'material',reason:'Kožený/kožešinový materiál předmětu; dovednost vychází z materiálu.'};
 if(/wood|timber/.test(mat))
  return {skill:'Woodworking',source:'material',reason:'Dřevěný materiál předmětu; dovednost vychází z materiálu.'};
 if(/iron|steel|metal/.test(mat))
  return {skill:'Metalcraft',source:'material',reason:'Kovový materiál předmětu; dovednost vychází z materiálu.'};
 return {skill:null,source:'unknown',reason:'Katalog nedokládá materiál ani vhodnou opravářskou dovednost. Pro opravu zvolte předmět s doloženým materiálem; neházejte náhodnou dovednost.'};
}
