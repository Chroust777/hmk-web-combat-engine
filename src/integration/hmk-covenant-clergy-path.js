/** HMK v1.2 pp.343–344. An Émhlè cleric is a Ritual-derived calling,
 * not a fictional Priest entry in the tribal occupation d100 table. */
import {VERIFIED_COVENANT_DOCTRINES} from './hmk-creation-doctrine.js';
import {calculateSheetSkills} from './hmk-character-creation.js';
export function covenantClergyPath(character){
 const rows=calculateSheetSkills(character).filter(row=>/^Ritual \(.+\)$/.test(row.name)&&Object.hasOwn(VERIFIED_COVENANT_DOCTRINES,row.name.slice(8,-1)));
 if(!rows.length)return {available:false,reason:'Nejsou vyvinuty konkrétní Ritualy některého z deseti kultů Covenant.'};
 rows.sort((a,b)=>(b.ml||0)-(a.ml||0));const best=rows[0],faith=best.name.slice(8,-1),ml=best.ml||0;
 const circle=ml>=60?3:ml>=30?2:ml>=1?1:0;
 return {available:true,religion:faith,ritualSkill:best.name,ml,circle,role:circle===3?'Kněz Covenant (Clergy)':circle===2?'Bojový řád Covenant (Fighting Order)':circle===1?'Laik Covenant (Laity)':'Zatím bez církevního stupně',sourcePage:343};
}
