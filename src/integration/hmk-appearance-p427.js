/** Appendix III · Character Detail, HMK v1.2 pp.427–428.
 * OPTIONAL physical detail, generated only after validated completion.
 * Store dice as evidence. Do not invent absent/undefined table values.
 * The 14×6×3 Character Build base-height/weight matrix is transcribed
 * from the printed table in Appendix III (STR before Folk modifier).
 */
const CHARACTER_BUILD = {"5":[[[56,82],[53,70],[42,61]],[[57,84],[54,73],[43,63]],[[58,86],[55,75],[44,65]],[[59,88],[56,77],[45,67]],[[60,90],[57,79],[46,69]],[[61,92],[58,81],[47,71]]],"6":[[[58,91],[55,79],[44,69]],[[59,93],[56,82],[45,71]],[[60,95],[57,84],[46,73]],[[61,97],[58,86],[47,75]],[[62,99],[59,88],[48,77]],[[63,101],[60,90],[49,79]]],"7":[[[60,100],[57,87],[46,77]],[[61,102],[58,89],[47,78]],[[62,104],[59,90],[48,80]],[[63,107],[60,92],[49,82]],[[64,109],[61,94],[50,84]],[[65,111],[62,96],[51,86]]],"8":[[[62,111],[59,97],[48,85]],[[63,114],[60,99],[49,87]],[[64,117],[61,101],[50,89]],[[65,120],[62,104],[51,91]],[[66,123],[63,107],[52,93]],[[67,126],[64,109],[53,95]]],"9":[[[64,122],[61,106],[50,92]],[[65,125],[62,109],[51,94]],[[66,128],[63,112],[52,96]],[[67,131],[64,115],[53,98]],[[68,134],[65,118],[54,100]],[[69,137],[66,121],[55,103]]],"10":[[[66,132],[63,116],[52,98]],[[67,135],[64,119],[53,100]],[[68,138],[65,122],[54,102]],[[69,141],[66,125],[55,105]],[[70,144],[67,128],[56,108]],[[71,147],[68,131],[57,111]]],"11":[[[67,138],[64,122],[53,103]],[[68,142],[65,125],[54,105]],[[69,146],[66,128],[55,108]],[[70,150],[67,131],[56,111]],[[71,154],[68,135],[57,114]],[[72,158],[69,139],[58,117]]],"12":[[[68,146],[65,129],[54,108]],[[69,150],[66,132],[55,111]],[[70,154],[67,135],[56,114]],[[71,158],[68,139],[57,117]],[[72,162],[69,143],[58,120]],[[73,166],[70,147],[59,123]]],"13":[[[69,154],[66,136],[55,114]],[[70,158],[67,139],[56,117]],[[71,162],[68,143],[57,120]],[[72,166],[69,147],[58,123]],[[73,170],[70,151],[59,126]],[[74,174],[71,154],[60,129]]],"14":[[[70,162],[67,143],[56,120]],[[71,166],[68,147],[57,123]],[[72,170],[69,151],[58,126]],[[73,174],[70,155],[59,129]],[[74,178],[71,158],[60,132]],[[75,182],[72,161],[61,135]]],"15":[[[71,172],[68,152],[57,126]],[[72,175],[69,156],[58,129]],[[73,179],[70,160],[59,132]],[[74,183],[71,163],[60,135]],[[75,187],[72,167],[61,138]],[[76,191],[73,171],[62,141]]],"16":[[[72,180],[69,161],[58,132]],[[73,184],[70,165],[59,135]],[[74,188],[71,168],[60,138]],[[75,192],[72,172],[61,141]],[[76,196],[73,176],[62,144]],[[77,200],[74,180],[63,147]]],"17":[[[73,190],[70,171],[59,139]],[[74,195],[71,174],[60,142]],[[75,200],[72,178],[61,145]],[[76,205],[73,182],[62,148]],[[77,210],[74,186],[63,151]],[[78,215],[75,190],[64,154]]],"18":[[[74,201],[71,180],[60,146]],[[75,206],[72,184],[61,149]],[[76,211],[73,188],[62,152]],[[77,216],[74,192],[63,155]],[[78,221],[75,196],[64,158]],[[79,226],[76,200],[65,161]]]};
const RANGES = [[1,15],[16,35],[36,55],[56,75],[76,90],[91,100]];
const inBand=(n,b)=>n>=b[0]&&n<=b[1];
const roll=(die,sides)=>{const n=die(sides);if(!Number.isInteger(n)||n<1||n>sides)throw Error('Neplatný výsledek Appearance d'+sides);return n;};
const normalized=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const ELRHIN=['sinai','sidhe','nadi'].map(normalized);
const REGION_LATITUDES={
 'altor':'high','ivinia':'high','harbaal':'high',
 'azeryan':'mid','byria':'mid','emelrene':'mid','harn':'mid','hurisea':'mid','palithane':'mid','quarphor':'mid','shorkyne':'mid','trierzon':'mid',
 'dalkesh':'low','hacherdad':'low','hepekeria':'low','karejia':'low','ketarh':'low','beshakan':'low','reksyni':'mid','reksyna':'mid','ketarh & beshakan':'low',
 'chogoro & mafan':'equa','chogoro':'equa','mafan':'equa','northern anzeloria':'equa','thonia':'equa','umelria':'equa'
};
// Printed d100 tables, 00 represented by 100. Each column is exhaustive.
const COMPLEXION={
 high:[[6,'Very Light'],[94,'Light'],[99,'Medium'],[100,'Dark']],
 mid:[[1,'Very Light'],[27,'Light'],[73,'Medium'],[100,'Dark']],
 low:[[1,'Very Light'],[3,'Light'],[17,'Medium'],[99,'Dark'],[100,'Very Dark']],
 equa:[[6,'Medium'],[62,'Dark'],[100,'Very Dark']],
 elrhin:[[97,'Light'],[99,'Medium'],[100,'Dark']],
 kuzhai:[[73,'Very Light'],[90,'Light'],[99,'Medium'],[100,'Dark']]
};
const HAIR={
 light:[[5,'Black'],[40,'Brown'],[45,'Red'],[55,'Auburn'],[70,'Dark Blonde'],[95,'Blonde'],[100,'White / Silver']],
 medium:[[15,'Black'],[55,'Brown'],[58,'Red'],[65,'Auburn'],[80,'Dark Blonde'],[95,'Blonde'],[100,'White / Silver']],
 dark:[[45,'Black'],[85,'Brown'],[86,'Red'],[90,'Auburn'],[93,'Dark Blonde'],[95,'Blonde'],[100,'White / Silver']],
 verydark:[[65,'Black'],[95,'Brown'],[96,'Auburn'],[97,'Dark Blonde'],[98,'Blonde'],[100,'White / Silver']],
 elrhin:[[25,'Black'],[48,'Brown'],[50,'Auburn'],[65,'Dark Blonde'],[90,'Blonde'],[100,'White / Silver']],
 kuzhai:[[5,'Black'],[45,'Brown'],[55,'Red'],[70,'Auburn'],[75,'Dark Blonde'],[80,'Blonde'],[100,'White / Silver']]
};
const EYES={
 light:[[5,'Brown'],[10,'Hazel'],[50,'Blue'],[85,'Grey'],[99,'Green'],[100,'Violet']],
 medium:[[45,'Brown'],[55,'Hazel'],[75,'Blue'],[95,'Grey'],[99,'Green'],[100,'Violet']],
 dark:[[80,'Brown'],[90,'Hazel'],[95,'Blue'],[98,'Grey'],[99,'Green'],[100,'Violet']],
 elrhin:[[8,'Brown'],[15,'Hazel'],[35,'Blue'],[85,'Grey'],[90,'Green'],[100,'Violet']]
};
const HAND={
 human:[[85,'Right'],[95,'Left'],[100,'Ambidextrous']],
 elrhin:[[80,'Right'],[90,'Left'],[100,'Ambidextrous']],
 malakta:[[35,'Right'],[70,'Left'],[100,'Ambidextrous']],
 kuzhai:[[75,'Right'],[85,'Left'],[100,'Ambidextrous']]
};
const fromTable=(table,n)=>{const hit=table?.find(([max])=>n<=max);if(!hit)throw Error('Appearance: výsledek mimo tabulku');return hit[1];};
const hairColumn=(complexion)=>['Very Light','Light'].includes(complexion)?'light':complexion==='Medium'?'medium':complexion==='Dark'?'dark':'verydark';
export function appearanceBaseBuild(str,d100,folk='Human'){
 if(!Number.isInteger(str)||!Number.isInteger(d100)||d100<1||d100>100)return null;
 const ix=RANGES.findIndex(x=>inBand(d100,x));const band=CHARACTER_BUILD[str]?.[ix];if(!band)return null;
 const code=normalized(folk);const column=code==='kuzhai'?2:ELRHIN.includes(code)?1:0;
 const [heightIn,baseWeightLb]=band[column];
 return {heightIn,baseWeightLb,bonusNadi:code==='nadi'?10:0,tableSTR:str,buildD100:d100,sourcePage:428};
}
/** roll is injected so tests can use deterministic dice; does not mutate the character. */
export function generateAppearance(character,die){
 const h=character?.hmk||{},creation=h.creation||{},rawSTR=creation.attributeProof?.str?.adultMinimum;
 const folk=h.folk||creation.values?.folk||'Human',code=normalized(folk),elrhin=ELRHIN.includes(code),kuzhai=code==='kuzhai',malakta=code==='malakta',nadi=code==='nadi';
 const result={source:'HMK Appendix III pp.427–428',version:1,folk,rolls:{},values:{},warnings:[]};
 const d=(label,sides)=>{const n=roll(die,sides);result.rolls[label]=n;return n};
 if(!nadi){
  const latitude=malakta?'equa':elrhin?'elrhin':kuzhai?'kuzhai':REGION_LATITUDES[normalized(h.birthRegion||creation.values?.birthRegion)];
  if(latitude){result.values.complexion=fromTable(COMPLEXION[latitude],d('complexionD100',100));result.latitude=latitude;}
  else result.warnings.push('Chybí doložená zeměpisná šířka domovského regionu: Complexion není automaticky určena.');
 }else result.warnings.push('Nâdi nemají Complexion; popis srsti zůstává volbou hráče / GM.');
 const hColumn=kuzhai?'kuzhai':elrhin?'elrhin':result.values.complexion?hairColumn(result.values.complexion):null;
 if(hColumn){result.hairColumn=hColumn;result.values.hair=fromTable(HAIR[hColumn],d('hairD100',100));}
 const eColumn=elrhin?'elrhin':malakta?'dark':result.values.complexion?hairColumn(result.values.complexion):null;
 if(eColumn){result.eyeColumn=eColumn==='verydark'?'dark':eColumn;result.values.eyes=fromTable(EYES[result.eyeColumn],d('eyesD100',100));}
 const hd=malakta?'malakta':kuzhai?'kuzhai':elrhin?'elrhin':'human';result.handColumn=hd;
 result.values.handedness=fromTable(HAND[hd],d('handD100',100));
 if(Number.isSafeInteger(rawSTR)){
  const build=appearanceBaseBuild(rawSTR,d('buildD100',100),folk);
  if(build){const extra=[d('weightD6_1',6),d('weightD6_2',6),d('weightD6_3',6)];result.values.height=build.heightIn+' in';result.values.weight=(build.baseWeightLb+build.bonusNadi+extra.reduce((a,b)=>a+b,0))+' lb';result.build={...build,weightDice:extra,finalWeightLb:build.baseWeightLb+build.bonusNadi+extra.reduce((a,b)=>a+b,0)};}
  else result.warnings.push('STR před modifikátorem Folk je mimo tištěnou tabulku 5–18; výška a váha vyžadují rozhodnutí GM.');
 }else result.warnings.push('Chybí původní STR před modifikátorem Folk; výšku a váhu nelze doložit.');
 return result;
}
/** Verify generated evidence without rerolling or trusting copied display fields. */
export function verifyAppearance(character){
 const p=character?.hmk?.appearanceProof;if(!p)return {ok:false,issues:['Chybí Appearance důkaz']};
 const h=character.hmk,errors=[];
 const requireTable=(key,col,rollKey,tables)=>{if(!col)return;if(!Number.isInteger(p.rolls?.[rollKey]))errors.push('Chybí '+rollKey);else if(p.values[key]!==fromTable(tables[col],p.rolls[rollKey]))errors.push('Rozpor '+key);};
 if(p.latitude)requireTable('complexion',p.latitude,'complexionD100',COMPLEXION);
 if(p.hairColumn)requireTable('hair',p.hairColumn,'hairD100',HAIR);
 if(p.eyeColumn)requireTable('eyes',p.eyeColumn,'eyesD100',EYES);
 requireTable('handedness',p.handColumn,'handD100',HAND);
 if(p.build){const proof=appearanceBaseBuild(h.creation?.attributeProof?.str?.adultMinimum,p.rolls.buildD100,p.folk);const wd=p.build.weightDice;
  if(!proof||JSON.stringify([proof.heightIn,proof.baseWeightLb,proof.bonusNadi])!==JSON.stringify([p.build.heightIn,p.build.baseWeightLb,p.build.bonusNadi])||!Array.isArray(wd)||wd.length!==3||wd.some(x=>!Number.isInteger(x)||x<1||x>6)||p.values.height!==proof.heightIn+' in'||p.values.weight!==(proof.baseWeightLb+proof.bonusNadi+wd.reduce((a,b)=>a+b,0))+' lb')errors.push('Nesouhlasí Body Build s Appendix III');
 }
 for(const [key,value]of Object.entries(p.values||{}))if(h[key]!==value)errors.push('Profil nesouhlasí s Appearance: '+key);
 return {ok:!errors.length,issues:errors};
}
