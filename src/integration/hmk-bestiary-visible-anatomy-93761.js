/** v93.761. Read-only Bestiary anatomy for the printed HMK v1.2 sources.
 * A creature without a fixed physical Body Location table must NOT inherit
 * an invented human or animal hit grid. Values below are ONLY ZN / LN / LOC;
 * AV and other combat mechanics remain in their original source modules.
 */
import {animalAnatomyTable566} from './hmk-bestiary-anatomy-566.js';
const human=[
 ['1','1–5 Skull; 6–8 Face; 9–10 Neck'],
 ['2–3','1–3 Shoulder; 4–6 Upper arm; 7 Elbow; 8–9 Forearm; 10 Hand'],
 ['4–7','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],
 ['8–10','1–4 Thigh; 5 Knee; 6–8 Calf; 9–10 Foot']
];
const malak=[
 ['1','1–5 Skull; 6–8 Face; 9–10 Neck'],
 ['2–3','1–3 Shoulder; 4–6 Upper arm; 7 Elbow; 8–9 Forearm; 10 Hand'],
 ['4–7','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],
 ['8–10','1–4 Thigh; 5 Knee; 6–8 Calf; 9–10 Foot']
];
const undead=[
 ['1','1–8 Head; 9–10 Neck'],
 ['2–3','1–5 Upper arm; 6–8 Lower arm; 9–10 Hand'],
 ['4–7','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],
 ['8–10','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']
];
const gargun=[
 ['1–2','1–2 Head; 3 Neck; 4–7 Upper arm; 8–9 Lower arm; 10 Hand'],
 ['3–4','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],
 ['5–6','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']
];
// Each record uses page-specific printed ZN / Location Die ranges.
const special={
 'aklash-373':{page:373,rows:[['1–2','1–8 Head; 9–10 Neck'],['3–6','1–5 Upper arm; 6–8 Lower arm; 9–10 Hand'],['7–12','1–5 Thorax; 6–8 Abdomen; 9–10 Pelvis'],['13–16','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']]},
 'domorser-373':{page:373,rows:[['1','1–6 Head; 7–10 Neck'],['2–3','1–10 Foreleg'],['4–8','1–5 Thorax; 6–8 Abdomen; 9–10 Pelvis'],['9–10','1–9 Hind leg; 10 Tail']]},
 'hru-374':{page:374,rows:[['1–4','1–8 Head; 9–10 Neck'],['5–12','1–5 Upper arm; 6–8 Lower arm; 9–10 Hand'],['13–28','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],['29–40','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']]},
 'nolah-374':{page:374,rows:[['1','1–8 Head; 9–10 Neck'],['2–3','1–5 Upper arm; 6–8 Lower arm; 9–10 Hand'],['4–7','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],['8–10','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']]},
 'vlasta-375':{page:375,rows:[['1','1–6 Head; 7–8 Neck; 9–10 Arm'],['2','1–10 Torso'],['3','1–5 Leg; 6–10 Tail']]},
 'young-dragon-388':{page:388,rows:[['1–4','1–3 Head; 4–10 Neck'],['5–8','1–7 Foreleg; 8–10 Forefoot'],['9–11','1–10 Wing'],['12–15','1–7 Thorax; 8–10 Abdomen'],['16–18','1–10 Wing'],['19–22','1–7 Hind leg; 8–10 Hind foot'],['23–25','1–10 Tail']]},
 'mature-dragon-388':{page:388,rows:[['1–8','1–3 Head; 4–10 Neck'],['9–16','1–7 Foreleg; 8–10 Forefoot'],['17–22','1–10 Wing'],['23–30','1–7 Thorax; 8–10 Abdomen'],['31–36','1–10 Wing'],['37–44','1–7 Hind leg; 8–10 Hind foot'],['45–50','1–10 Tail']]},
 'old-dragon-388':{page:388,rows:[['1–16','1–3 Head; 4–10 Neck'],['17–32','1–7 Foreleg; 8–10 Forefoot'],['33–44','1–10 Wing'],['45–60','1–7 Thorax; 8–10 Abdomen'],['61–72','1–10 Wing'],['73–88','1–7 Hind leg; 8–10 Hind foot'],['89–100','1–10 Tail']]},
 'gryphon-griffin-marenu-390':{page:390,rows:[['1–2','1–4 Head; 5–10 Neck'],['3','1–10 Foreleg'],['4–5','1–10 Wing'],['6–8','1–6 Thorax; 7–10 Abdomen'],['9–10','1–10 Wing'],['11–12','1–3 Quarter; 4–9 Hind leg; 10 Tail']]},
 'hirenu-hippogriff-390':{page:390,rows:[['1–3','1–7 Head; 8–10 Neck'],['4','1–10 Foreleg'],['5–8','1–10 Wing'],['9–11','1–7 Thorax; 8–10 Abdomen'],['12–15','1–10 Wing'],['16–20','1–5 Quarter; 6–9 Hind leg; 10 Tail']]},
 'unicorn-ermael-391':{page:391,rows:[['1–3','1–3 Head; 4 Horn; 5–10 Neck'],['4–5','1–10 Foreleg'],['6–12','1–6 Flank; 7–10 Abdomen'],['13–16','1–5 Quarter; 6–9 Hind leg; 10 Tail']]},
 'warg-dire-wolf-391':{page:391,rows:[['1–2','1–6 Head; 7–10 Neck'],['3','1–10 Foreleg'],['4–8','1–5 Thorax; 6–8 Abdomen; 9–10 Pelvis'],['9–10','1–8 Hind leg; 9–10 Tail']]},
 'wyre-wyvern-392':{page:392,rows:[['1–4','1–4 Head; 5–10 Neck'],['5–7','1–10 Wing'],['8–11','1–6 Thorax; 7–10 Abdomen'],['12–14','1–10 Wing'],['15–20','1–3 Leg; 4–5 Foot; 6–10 Tail']]},
 'yelgri-harpy-392':{page:392,rows:[['1–2','1–3 Head; 4 Neck; 5–8 Arm; 9–10 Hand'],['3','1–10 Wing'],['4–5','1–6 Thorax; 7–10 Abdomen'],['6','1–10 Wing'],['7–8','1–6 Leg; 7–8 Foot; 9–10 Tail']]},
};
const vhir={
 a:[['1–2','1–7 Head; 8–10 Neck'],['3–5','1–5 Upper arm; 6–8 Lower arm; 9–10 Hand'],['6','1–10 Wing'],['7–10','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],['11','1–10 Wing'],['12–16','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']],
 b:[['1','1–7 Head; 8–10 Neck'],['2–3','1–5 Upper arm; 6–8 Lower arm; 9–10 Hand'],['4','1–10 Wing'],['5–7','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],['8','1–10 Wing'],['9–12','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']],
 c:[['1–2','1–2 Head; 3 Neck; 4–7 Upper arm; 8–9 Lower arm; 10 Hand'],['3','1–10 Wing'],['4–5','1–4 Thorax; 5–7 Abdomen; 8–10 Pelvis'],['6','9–10 Wing (LN 1–8 not assigned in printed table)'],['7–8','1–5 Upper leg; 6–8 Lower leg; 9–10 Foot']]
};
const needsGM='Pravidla nedávají tomuto obecnému profilu jednu pevnou fyzickou anatomii. GM musí nejprve rozhodnout konkrétní podobu nebo inkarnaci; žádná lidská či zvířecí zásahová tabulka se automaticky nepřiřazuje.';
export function creatureVisibleAnatomy93761(entry){
 if(!entry)return null;
 const g=entry.group||'', id=entry.id;
 if(g.startsWith('Animals')){
  const a=animalAnatomyTable566(entry.combat?.bodyTable);
  return a?{kind:'table',page:a.sourcePage,label:'Zvířecí zásahová tabulka '+a.id,rows:a.rows.map(r=>[r.znMin===r.znMax?String(r.znMin):`${r.znMin}–${r.znMax}`,`${r.lnMin===r.lnMax?r.lnMin:`${r.lnMin}–${r.lnMax}`} ${r.name} (${r.id}), SHK ${r.shock}`])} : {kind:'conditional',page:entry.page,reason:needsGM};
 }
 if(special[id])return {kind:'table',page:special[id].page,label:'Druhová anatomie',rows:special[id].rows};
 if(g==='Folk')return {kind:'table',page:id==='malak-368'?368:167,label:id==='malak-368'?'Malák – zvláštní humanoidní lokace a druhová ochrana na str. 368':'Základní humanoidní lokace HMK',rows:id==='malak-368'?malak:human};
 if(g==='Gârgún')return {kind:'table',page:371,label:'Gârgún jako cíl (nikoliv tabulka útoku Gârgún proti člověku)',rows:gargun};
 if(g==='Môrvrin')return {kind:'table',page:id.includes('printed-example')?383:167,label:'Humanoidní lokace; speciální ochrana a undead účinky podle profilu',rows:id.includes('printed-example')?undead:human};
 if(g==='Spirits'&&entry.combat?.bodyTable&&vhir[entry.combat.bodyTable])return {kind:'table',page:400,label:'V’hîr – vlastní anatomie '+entry.combat.bodyTable+' (není zvířecí tabulka)',rows:vhir[entry.combat.bodyTable]};
 if(g==='Spirits'&&id==='asir-air-sprite-394')return {kind:'special',page:394,reason:'Inkarnovaný Asîr: dvě zásahové zóny (ZN 1–2), bez běžně rozdělených tělesných lokalit; zásah působí podle výslovného pravidla Spirit/dissolution.'};
 if(g==='Ívashù'&&id==='umbath-375')return {kind:'special',page:375,reason:'Umbáth: ZN 1–3, tabulka rozlišuje Spirit místo obyčejných tělesných lokalit.'};
 return {kind:'conditional',page:entry.page,reason:needsGM};
}
