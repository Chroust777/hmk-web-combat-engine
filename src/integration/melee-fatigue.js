/** HMK printed p.176: fatigue is a test penalty, measured in increments of five.
 * The caller supplies accumulated fatigue; this module does not infer accrual. */
export function fatigueEMLModifier(fatigue){
 if(!Number.isSafeInteger(fatigue)||fatigue<0||fatigue>1000||fatigue%5!==0)return {ok:false,reason:'invalid-fatigue-multiple-of-five'};
 return {ok:true,label:'Fatigue (HMK p.176)',value:-fatigue};
}
