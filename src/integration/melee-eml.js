/** Auditable EML assembly. Modifiers are supplied by GM; this module does not infer situational rules. */
export function assembleMeleeEML({baseML,modifiers=[]}={}){
 if(!Number.isSafeInteger(baseML)||baseML<0||baseML>200)return {ok:false,reason:'invalid-base-ML'};
 if(!Array.isArray(modifiers)||modifiers.some(m=>!m||typeof m.label!=='string'||!m.label.trim()||!Number.isSafeInteger(m.value)||Math.abs(m.value)>200))return {ok:false,reason:'invalid-EML-modifier'};
 const total=modifiers.reduce((s,m)=>s+m.value,baseML);
 if(!Number.isSafeInteger(total))return {ok:false,reason:'EML-overflow'};
 return {ok:true,baseML,modifiers:modifiers.map(m=>({label:m.label,value:m.value})),rawEML:total,effectiveEML:Math.max(5,Math.min(95,total)),clamped:total<5||total>95};
}
