/** HMK v1.2 p.269 and pp.271-274. STARTING elixirs, not a new inventory system. */
export const STARTING_ELIXIR_NAMES=Object.freeze(["Acid", "Airtap", "Aqua", "Darkvision", "Dreamwalk", "Egosight", "Equipoise", "Erudition", "Eruption", "Exsiccation", "Fireshield", "Footpad", "Formfix", "Fumebomb", "Ghostsight", "Healing", "Iceshield", "Mending", "Might", "Mindsalve", "Object Aegis", "Passion", "Physic", "Poison", "Quiescence", "Shadowbreath", "Shout", "Soulbuffer", "Soulcloak", "Sustenance", "Traumashield", "Verity", "Wakefulness", "Warmth", "Weakness"]);
export function validateStartingElixirs({alchemyML,choices=[]}={}){
 if(!Number.isInteger(alchemyML)||alchemyML<0)throw Error('Alchemy ML musí pocházet z aktuální dovednosti');
 const index=Math.floor(alchemyML/10),expected=alchemyML>=60?Math.floor(index/2):0;
 if(!Array.isArray(choices)||choices.length!==expected)throw Error(`Alchemy p.269: právě ${expected} počátečních elixírů (Alchemy ML ${alchemyML})`);
 const elixirs=choices.map((name,i)=>{
  if(!STARTING_ELIXIR_NAMES.includes(name))throw Error('Počáteční elixír musí být jeden z 35 kanonických (p.271–274)');
  return {name,alchemicalStrength:index-i};
 });
 return {alchemyML,index,count:expected,elixirs,sourcePage:269};
}
