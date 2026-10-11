/** HMK p56 combat Move derivation for human-sized folk / Kuzhai. */
export function movementAttributeAverage({agility,strength}={}){
 if(!Number.isFinite(agility)||!Number.isFinite(strength)) throw new TypeError('AGL and STR required');
 const raw=(agility+strength)/2;
 return agility>strength?Math.ceil(raw):Math.floor(raw);
}
export function moveModifierFromAverage(avg){
 if(!Number.isFinite(avg)) throw new TypeError('Average required');
 if(avg<4||avg>23) throw new RangeError('p56 Move table covers average 4..23');
 if(avg<=5) return -15;
 if(avg<=7) return -10;
 if(avg<=9) return -5;
 if(avg<=11) return 0;
 if(avg<=13) return 5;
 if(avg<=15) return 10;
 if(avg<=17) return 15;
 if(avg<=19) return 20;
 if(avg<=21) return 25;
 return 30;
}
export function baseMove({agility,strength,folk='human-sized'}={}){
 const avg=movementAttributeAverage({agility,strength});
 const base=folk==='kuzhai'?30:50;
 return {average:avg,modifier:moveModifierFromAverage(avg),move:base+moveModifierFromAverage(avg)};
}
export function evasionFromDodgeEML(dodgeEML){
 if(!Number.isFinite(dodgeEML)) throw new TypeError('Dodge EML required');
 return Math.floor(dodgeEML/10)*5;
}
