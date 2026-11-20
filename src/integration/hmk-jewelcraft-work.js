/** HMK 76. Finished value and the price of the base material are distinct. */
export const JEWELLERY_D_PER_OZ=Object.freeze({
 Amber:50,'Bone/Horn':1,Brass:1,'Bronze/Copper':1,Glass:6,Gold:1200,Ivory:16,Jade:500,Pewter:1,Truesilver:7500,Silver:60
});
export const GEM_D=Object.freeze({
 Agate:10,Amber:2,Diamond:800,Emerald:700,Opal:80,Pearl:10,Quartz:5,Ruby:1000,Sapphire:900,'Topaz (yellow)':600
});
const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function jewelcraftWork994({material,ounces,gems,days,daysDice}){
 if(!Object.hasOwn(JEWELLERY_D_PER_OZ,material)||!Number.isFinite(ounces)||ounces<=0||ounces>10000||
  !Array.isArray(gems)||gems.length>6||gems.some(x=>!Object.hasOwn(GEM_D,x.type)||!Number.isFinite(x.carats)||x.carats<=0||x.carats>1000)||
  !whole(days,1,10000)||!Array.isArray(daysDice)||daysDice.length&&
  (daysDice.length!==3||daysDice.some(d=>!whole(d,1,6))||daysDice.reduce((sum,d)=>sum+d,0)!==days))
  throw Error('Jewelcraft: ověř materiál, hmotnost, drahokamy a dobu práce.');
 const baseValue=ounces*JEWELLERY_D_PER_OZ[material];
 const gemValue=gems.reduce((sum,g)=>sum+g.carats*g.carats*GEM_D[g.type],0);
 return {material,ounces,gems:gems.map(g=>({type:g.type,carats:g.carats})),days,daysDice:[...daysDice],
  baseMaterialCostD:baseValue/3,gemValueD:gemValue,saleValueD:baseValue+gemValue};
}
