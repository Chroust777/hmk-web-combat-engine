/** HMK v1.2 p.40 and p.47. Pure calculation of GM's PHYSICAL d20/d100 rolls.
 * No RNG, no storage, no invented Talent options. */
export const TALENT_NAMES=Object.freeze(['Amplification','Clairvoyance','Disembodiment','Elemental Bolt','Enthral','Extratemporality','Healing','Hex','Medium','Natural Attunement','Negation','Prescience','Psychometry','Sensitivity','Telekinesis','Telepathy','Transference','Transmutation','Visnomy']);
// d100 ranges for Ælrhin, Kúzhai, other folk, in printed p.40 order.
const ENDS=Object.freeze({
 aelrhin:[3,11,14,15,19,21,26,27,35,55,61,71,74,82,83,90,93,94,100],
 kuzhai:[1,12,13,14,15,16,21,27,30,40,62,66,80,94,95,96,97,98,100],
 other:[2,10,12,20,23,25,31,34,42,44,53,62,68,82,84,92,94,96,100]
});
export function generationFolkColumn(folk){return ['Sinái','Sidhé'].includes(folk)?'aelrhin':folk==='Kúzhai'?'kuzhai':'other'}
const roll=(v,max)=>{if(!Number.isSafeInteger(Number(v))||!/^\d+$/.test(String(v))||Number(v)<1||Number(v)>max)throw Error('Fyzický hod musí být celé číslo 1–'+max);return Number(v)};
export function talentFromD100(folk,value){const n=roll(value,100),ends=ENDS[generationFolkColumn(folk)];return TALENT_NAMES[ends.findIndex(x=>n<=x)]}
// Columns correspond to Aura 1–9, 10–12, 13–14, 15, 16, 17, 18, 19, 20, 21+.
// '.' no talent; S1/S2 Spirit only; D-/D0 one dormant talent;
// T1..T8 number of talents (each rolled d100 adds +1 Talent DP).
const MATRIX=[
 ['.','.','.','.','S1','S1','S1','S2','S2','S2'],
 ['.','.','.','S1','S1','S1','S2','S2','S2','D-'],
 ['.','.','S1','S1','S1','S2','S2','S2','D-','D0'],
 ['.','S1','S1','S1','S2','S2','S2','D-','D0','T1'],
 ['S1','S1','S1','S2','S2','S2','D-','D0','T1','T2'],
 ['S1','S1','S2','S2','S2','D-','D0','T1','T2','T3'],
 ['S1','S2','S2','S2','D-','D0','T1','T2','T3','T4'],
 ['S2','S2','S2','D-','D0','T1','T2','T3','T4','T5'],
 ['S2','S2','D-','D0','T1','T2','T3','T4','T5','T6'],
 ['S2','D-','D0','T1','T2','T3','T4','T5','T6','T7'],
 ['D-','D0','T1','T2','T3','T4','T5','T6','T7','T8']
];
const rowFor=n=>n===1?0:n<=5?1:n<=10?2:n<=12?3:n<=14?4:n===15?5:n===16?6:n===17?7:n===18?8:n===19?9:10;
const colFor=a=>a<=9?0:a<=12?1:a<=14?2:a-12;
export function arcaneTalentFromPhysical({aura,folk,ageGroup,d20,d100s=[]}){
 const a=Number(aura),r=roll(d20,20);
 if(!Number.isSafeInteger(a)||a<1)throw Error('Arcane Talent vyžaduje kladnou celočíselnou ověřenou Aura');
 if(!Array.isArray(d100s))throw Error('Arcane Talent: očekáván seznam fyzických d100');
 const code=MATRIX[rowFor(r)][Math.min(9,colFor(a))],n=code[0]==='T'?Number(code.slice(1)):code[0]==='D'?1:0;
 if(d100s.length!==n)throw Error('Talent Possession d20 vyžaduje právě '+n+' fyzických Talent Generation d100');
 const rolls=d100s.map(x=>roll(x,100));
 const names=rolls.map(x=>talentFromD100(folk,x));
 const grants={};
 const spirit=code[0]==='S'?Number(code[1]):n?2:0;
 if(spirit)grants.Spirit=spirit;
 const base=['Kúzhai','Sinái','Sidhé'].includes(folk)||ageGroup==='Old'?4:ageGroup==='Mature'?3:ageGroup==='Young'?2:null;
 if(n&&base===null)throw Error('Arcane Talent vyžaduje platnou věkovou skupinu');
 const dormancy=code==='D-'?-1:0;
 for(const name of names){const key='Talent ('+name+')';if(!Object.hasOwn(grants,key))grants[key]=base+dormancy;else if(dormancy!==0)throw Error('Neplatná duplicitní dormance');
  if(code[0]==='T')grants[key]+=1;
 }
 return {aura:a,folk,ageGroup,d20:r,d100s:rolls,column:generationFolkColumn(folk),result:code,dormancy,generated:names,grants};
}

/** HMK v1.2 p.42, Invoker Occupation footnote: for an Invoker PARENT,
 * the child makes FOUR physical Talent Possession d20 rolls, keeping the
 * highest.  This is not four automatic Talents, nor four free DP pools.
 * The highest follows exactly the ordinary p.40 d100/Talent procedure.
 * No random generator, persistence, or second talent calculation.
 */
export function parentInvokerTalentFromPhysical({aura,folk,ageGroup,d20s,d100s=[]}){
 if(!Array.isArray(d20s)||d20s.length!==4)throw Error('Parent Invoker: právě čtyři fyzické d20 (HMK p.42)');
 const dice=d20s.map(x=>roll(x,20)),highest=Math.max(...dice);
 const base=arcaneTalentFromPhysical({aura,folk,ageGroup,d20:highest,d100s});
 return {...base,familyInvoker:true,d20s:dice,sourcePage:42};
}
