/** HMK v1.2 printed p.197, Major Lýthian Chantries.
 * Canonical name/realm/quality by convocation. Arcane Lore guild chapters
 * are explicitly NOT assigned a fabricated Pvâric convocation.  Minor
 * chantries exist (p.197) but have no exhaustive named listing.
 * Separate rows for homonymous chantries of different convocations. */
const TABLE=Object.freeze({
 'Fývria':`Ázeryàn|Féslium|3
Býria|Dáriam|3
Diramóa|Mâkjin|3
Emélrenè|Beréma|4
Emélrenè|Hedégu|4
Hácherdad|Hácherdad|3
Homôra|Dénqua|5
Karéjia|Kólomîr|2
Mèlderýn|Gelímo|4
Molkûra|Kotýn|5
Quârphor|Orlét|3`,
 'Jmôrvi':`Ázeryàn|Berónè|3
Chogôro|Mokôra|4
Emélrenè|Beréma|3
Emélrenè|Hedégu|3
Falâna|Silgôra|5
Hácherdad|Hácherdad|3
Hârn|Gwàéryn|3
Ivínia|Beléka|2
Jánkor|Bekúa|3
Karéjia|Phanósia|3
Mèlderýn|Glenóth|4
Melûria|Mokóno|3
Molkûra|Kotýn|4
Shóju|´Ydei|4`,
 'Pèleáhn':`Ázeryàn|Lysâra|4
Dalkésh|Zerûla|5
Diramóa|Ain Rhit|3
Emélrenè|Beréma|4
Emélrenè|Hedégu|3
Falâna|Thúbeliz|3
Hácherdad|Hácherdad|3
Káneum|Zeréxa|3
Mèlderýn|Chérafir|3
Molkûra|Kotýn|3
Réthem|Shóstim|3`,
 'Lyáhvi':`Ázeryàn|Reshâna|4
Dalkésh|Mánquideh|4
Diramóa|Ain Chemú|3
Emélrenè|Beréma|4
Emélrenè|Hedégu|2
Hácherdad|Hácherdad|3
Káneum|Zeréxa|4
Mèlderýn|Núrisel|3
Molkûra|Kotýn|4
Thónia|Árlanto|2
Tríerzòn|Tengéla|3
Ûmélria|Lekûria|5`,
 'Sàvôrya':`Ázeryàn|Meókolis|3
Dalkésh|Zerúla|4
Diramóa|Ain Dao|4
Emélrenè|Beréma|4
Emélrenè|Hedégu|3
Hácherdad|Hácherdad|3
Hèpekéria|Xêrium|3
Káneum|Úlebed|3
Karéjia|Helás|3
Mafán|Ídepan|3
Mèlderýn|Chérafir|5
Molkûra|Kotýn|4
Pechósu|Gýenku|2`,
 'Odívshè':`Ázeryàn|Gôris|3
Ázeryàn|Pòrosúa|2
Emélrenè|Beréma|4
Emélrenè|Hedégu|3
Hácherdad|Hácherdad|3
Ivínia|Jârehm|2
Mafán|Ídepan|3
Mèlderýn|Chýrefal|4
Molkûra|Kotýn|3
Pechósu|Gýenku|3
Shóju|Amûrghi|3`,
 'Arcane Lore':`Áltôr|Amlácht|2
Argóla|Abdéga|3
Ázeryàn|Kesâra|3
Ázeryàn|Meókolis|3
Ázeryàn|Púrimal|3
Býria|Ínri|3
Chogôro|Mokôra|4
Chomsún|Suth|4
Dalánya|Vítho|3
Dalkésh|Nátha|3
Diramóa|Ain Dao|3
Diramóa|Ain Kyâmu|3
Emélrenè|Beréma|5
Emélrenè|Hedégu|5
Falâna|Silgôra|3
Hácherdad|Hácherdad|3
Hârbáal|Ífanè|3
Hèpekéria|Isýnen|3
Homôra|Dénqua|3
Ivínia|Fûhreling|4
Jánkor|´Yling|4
Kandáy|Aléath|3
Káneum|Jebánta|3
Karéjia|Arkéth|4
Karéjia|Livélis|3
Lankôrium|Lankôrium|4
Mafán|Ídepan|3
Mèlderýn|Chérafir|4
Molkûra|Kotýn|5
Pechósu|Búrsa|4
Pechósu|Dârbo|3
Reksýna|Ekýnè|3
Shóju|Néshaga|2
Shôrkýnè|Kâremus|3
Thârda|Côranan|2
Tríerzòn|Àreshómes|3
Tríerzòn|Ubárian|2`
});
export const MAJOR_CHANTRIES=Object.freeze(Object.entries(TABLE).flatMap(([convocation,txt])=>txt.split('\n').map(row=>{
 const [realm,name,starText]=row.split('|');const stars=Number(starText);
 return Object.freeze({id:`${convocation}::${realm}::${name}`,realm,name,convocation,stars,sourcePage:197,pvaric:convocation!=='Arcane Lore'});
})));
const LOOKUP=new Map(MAJOR_CHANTRIES.map(x=>[x.id,x]));
if(LOOKUP.size!==MAJOR_CHANTRIES.length||MAJOR_CHANTRIES.some(x=>!Number.isInteger(x.stars)||x.stars<1||x.stars>5))throw Error('HMK chantry catalog invalid');
export const NAMED_PVAR_CHANTRIES=Object.freeze(MAJOR_CHANTRIES.filter(x=>x.pvaric));
export const UNLISTED_CHANTRY_ID='UNLISTED_MINOR';
export function majorChantryById(id){return LOOKUP.get(id)??null;}
/** Fill name, convocation and quality from one authoritative source. An unlisted
 * minor chantry or private proxy must be substantiated externally (p.197,205). */
export function resolveStartingChantry({chantryId,homeChantry='',chantryConvocation,chantryStars}={}){
 if(chantryId===undefined||chantryId==='')return null; // legacy saved games, not a new verified selection
 if(chantryId===UNLISTED_CHANTRY_ID){
  if(!String(homeChantry).trim()||!Number.isInteger(chantryStars)||chantryStars<1||chantryStars>5||!chantryConvocation)throw Error('Nezapsaná chantry vyžaduje jméno, konvokaci a doložené stars (p.197,205)');
  return {id:UNLISTED_CHANTRY_ID,name:homeChantry,convocation:chantryConvocation,stars:chantryStars,reviewNeeded:true};
 }
 const row=majorChantryById(chantryId);
 if(!row||!row.pvaric)throw Error('Vyberte konkrétní konvokační chantry z HMK p.197, případně nedoloženou chantry');
 if(homeChantry&&homeChantry!==row.name||chantryConvocation&&chantryConvocation!==row.convocation||chantryStars!==undefined&&chantryStars!==row.stars)throw Error('Název, kvalita a konvokace chantry musí odpovídat jedinému záznamu HMK p.197');
 return {id:row.id,name:row.name,convocation:row.convocation,stars:row.stars,reviewNeeded:false};
}
