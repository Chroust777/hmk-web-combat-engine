/** HârnMaster: Roleplaying in the World of Kèthîra, printed pp.161–162,167–170.
 * Human body location symbols are transcribed from the original p167 graphic.
 * No rules from other HârnMaster editions are used.
 */
import {SL,successLevel} from '../rules/tests.js';
import {amputationTestML,resolveAmputation} from '../rules/injury.js';
import {injuryMishap} from '../rules/injury-effects.js';
import {moraleEML,moraleResult,combineMoraleState,moraleActionPolicy} from '../rules/morale.js';

const LOCATIONS={
 nk:{triangle:20,bleeds:3,zone:'head'},neck:{triangle:20,bleeds:3,zone:'head'},
 ua:{triangle:0,bleeds:0,zone:'arm'},'upper arm':{triangle:0,bleeds:0,zone:'arm'},
 el:{triangle:0,bleeds:0,zone:'arm'},elbow:{triangle:0,bleeds:0,zone:'arm'},
 fo:{triangle:0,bleeds:0,zone:'arm'},forearm:{triangle:0,bleeds:0,zone:'arm'},
 ha:{triangle:-20,bleeds:0,zone:'arm'},hand:{triangle:-20,bleeds:0,zone:'arm'},
 th:{triangle:20,bleeds:1,zone:'legs'},thigh:{triangle:20,bleeds:1,zone:'legs'},
 kn:{triangle:0,bleeds:0,zone:'legs'},knee:{triangle:0,bleeds:0,zone:'legs'},
 ca:{triangle:0,bleeds:0,zone:'legs'},calf:{triangle:0,bleeds:0,zone:'legs'},
 ft:{triangle:0,bleeds:0,zone:'legs'},foot:{triangle:0,bleeds:0,zone:'legs'},
 sk:{triangle:null,bleeds:0,zone:'head'},skull:{triangle:null,bleeds:0,zone:'head'},
 fa:{triangle:null,bleeds:1,zone:'head'},face:{triangle:null,bleeds:1,zone:'head'},
 sh:{triangle:null,bleeds:1,zone:'arm'},shoulder:{triangle:null,bleeds:1,zone:'arm'},
 tx:{triangle:null,bleeds:1,zone:'torso'},thorax:{triangle:null,bleeds:1,zone:'torso'},
 ab:{triangle:null,bleeds:3,zone:'torso'},abdomen:{triangle:null,bleeds:3,zone:'torso'},
 pv:{triangle:null,bleeds:1,zone:'torso'},pelvis:{triangle:null,bleeds:1,zone:'torso'},
 area:{triangle:null,bleeds:0,zone:'head'}
};
export function hmkHumanLocationSymbols(location){const v=LOCATIONS[String(location??'').trim().toLowerCase()];return v?{...v}:null;}
const edge=a=>['e','edge'].includes(String(a??'').toLowerCase());
export function hmkAmputationAssessment({location,aspect,level,severity,strengthML,roll,isFolk=true}={}){
 const sym=hmkHumanLocationSymbols(location);
 if(!sym)throw Error('Neznámá anatomická lokace; rozhodnutí GM podle HMK str.167');
 const eligible=level===5&&severity==='G'&&edge(aspect)&&sym.triangle!==null;
 if(!eligible)return {eligible:false,severed:false,forceBleeder:false,dead:false,shockTestModifier:0,triangleModifier:sym.triangle};
 if((isFolk&&(!Number.isSafeInteger(strengthML)||strengthML<0||strengthML>200))||!Number.isSafeInteger(roll)||roll<1||roll>100)
  throw Error('G5 Edge s trojúhelníkem vyžaduje skutečný Strength ML a hod d100');
 const rawEML=amputationTestML({strengthML,triangleModifier:sym.triangle,isFolk});
 const sl=successLevel(roll,rawEML);
 const injury={location:['nk','neck'].includes(String(location).toLowerCase())?'neck':location,level:5,severity:'G',aspect:'edge'};
 const result=resolveAmputation({injury,triangleModifier:sym.triangle,strengthSL:sl,locationNormallyBleeds:sym.bleeds>0});
 return {...result,triangleModifier:sym.triangle,strengthML,roll,rawEML,slName:Object.keys(SL).find(k=>SL[k]===sl)};
}
export function hmkInjuryMishaps(location,severity){const sym=hmkHumanLocationSymbols(location);if(!sym)throw Error('Neznámá lokace pro Injury Mishap');return injuryMishap({severity,zone:sym.zone,location:String(location).toLowerCase()==='pv'?'pelvis':String(location).toLowerCase()});}
export function hmkInjuryMoraleEML({initiativeML,fatigue=0,aberrance=0,brave=false}={}){
 for(const x of [initiativeML,fatigue,aberrance])if(!Number.isSafeInteger(x)||x<0||x>200)throw Error('Morale potřebuje platné Initiative ML, Fatigue a Aberrance');
 return moraleEML({initiativeML,aberrance,brave})-fatigue;
}
export function hmkMoraleTransition({initiativeML,fatigue=0,aberrance=0,brave=false,roll,current='steady'}={}){
 if(!Number.isSafeInteger(roll)||roll<1||roll>100)throw Error('Morale vyžaduje skutečný d100');
 const rawEML=hmkInjuryMoraleEML({initiativeML,fatigue,aberrance,brave});
 const sl=successLevel(roll,rawEML),result=moraleResult({sl,roll});
 return {rawEML,slName:Object.keys(SL).find(k=>SL[k]===sl),roll,result,state:combineMoraleState(current,result.state),actionPolicy:moraleActionPolicy(combineMoraleState(current,result.state))};
}
export function hmkMishapTransition({kind,roll=null,baseML=null,hasDEX=null,actionUsesDEX=null,hasLegs=null,
 fatigue=0,injuryImpairment=0,stunned=false,forcedCF=false}={}){
 if(!['fumble-roll','stumble-roll','automatic-fumble','automatic-stumble'].includes(kind))throw Error('Neznámý Injury Mishap');
 if(typeof hasDEX!=='boolean'||typeof actionUsesDEX!=='boolean'||typeof hasLegs!=='boolean')throw Error('Mishap: anatomie a použití DEX musí být doloženy, nikoliv předpokládány');
 if(!Number.isSafeInteger(fatigue)||fatigue<0||!Number.isSafeInteger(injuryImpairment)||injuryImpairment<0||typeof stunned!=='boolean'||typeof forcedCF!=='boolean')throw Error('Mishap: neověřené modifikátory');
 const fumble=kind.includes('fumble')&&hasDEX&&actionUsesDEX;
 const type=fumble?'fumble':'stumble';
 const automatic=kind.startsWith('automatic-');
 if(!automatic&&(!Number.isSafeInteger(roll)||roll<1||roll>100||!Number.isSafeInteger(baseML)||baseML<0||baseML>200))throw Error('Injury Mishap vyžaduje ověřené ML a skutečný d100');
 const rawEML=automatic?null:baseML-fatigue-injuryImpairment;
 const originalSL=automatic?SL.CF:forcedCF?SL.CF:successLevel(roll,rawEML);
 const sl=automatic?SL.CF:stunned?Math.max(SL.CF,originalSL-1):originalSL;
 const failed=sl===SL.CF||sl===SL.F;
 return {kind,type,automatic,failed,roll:automatic?null:roll,baseML:automatic?null:baseML,
  rawEML,fatigue,injuryImpairment,stunned,forcedCF,slName:automatic?'AUTO':Object.keys(SL).find(k=>SL[k]===sl),
  effect:failed?(type==='fumble'?'drop-item':hasLegs?'prone':'pass-next-turn'):'none'};
}
