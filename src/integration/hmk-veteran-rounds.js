/** HMK v1.2 p.49: Veteran Development is one source, with two separate
 * five-point rounds for Old / Ælrhin / Kúzhai, one for Mature, none for Young.
 * The printed per-round cap depends on all points gained BEFORE each round.
 * No physical dice and no second persistence path. */
export function veteranRoundCount(folk,ageGroup){return ['Kúzhai','Sinái'].includes(folk)||ageGroup==='Old'?2:ageGroup==='Mature'?1:0;}
export function sumRound(o){return Object.values(o??{}).reduce((n,x)=>n+x,0)}
export function veteranRoundsProof(character,rounds,definitions,stages,{complete=false,priorPoints=null}={}){
 const c=character?.hmk?.creation??{},folk=character?.hmk?.folk,age=character?.hmk?.ageGroup;
 const count=veteranRoundCount(folk,age);
 if(!Array.isArray(rounds)||rounds.length!==count)throw Error('Veteran: počet samostatných kol neodpovídá věku/Folk');
 const result={};
 for(let i=0;i<rounds.length;i++){
  const round=rounds[i];if(!round||typeof round!=='object'||Array.isArray(round))throw Error('Veteran: neplatné kolo');
  const sum=sumRound(round);if(sum>5||(complete&&sum!==5))throw Error('Veteran: každé kolo musí mít přesně 5 DP, prozatím nejvýše 5');
  for(const [name,dp] of Object.entries(round)){
   const def=definitions(character,name);
   if(!def||!Number.isSafeInteger(dp)||dp<0||dp>(name.startsWith('Language (')?5:2))throw Error('Veteran: chybně zvolený Skill nebo počet DP');
   const earlier=(priorPoints?priorPoints(name):stages.slice(0,6).reduce((n,s)=>n+(c.skillDP?.[s]?.[name]??0),0))+rounds.slice(0,i).reduce((n,r)=>n+(r[name]??0),0);
   if(!name.startsWith('Language (')&&dp>(earlier>0?1:2))throw Error('Veteran: limit 1 DP již vyvinuté Skill / 2 DP nové Skill v každém kole');
   if(def.group==='Esoterica'&&def.baseSM+stages.slice(0,6).reduce((n,s)=>n+(c.skillDP?.[s]?.[name]??0),0)<1)throw Error('Veteran: Esoterica musí být otevřena před Veteran Skills');
   result[name]=(result[name]??0)+dp;
  }
 }
 return result;
}
