import {resolveStartingChantry} from './hmk-creation-chantries.js';
/** HMK v1.2 p.54, pp.195–205, printed 204-spell catalog p.211.
 * Starting spell and artefact DECISIONS ONLY; no casting/combat mutations. */
export const CREATION_PVAR_SPELLS=Object.freeze({"Fývria": [["Balm", 1], ["Diagnosis", 2], ["Tremor", 2], ["Physique", 3], ["Guardian", 4], ["Animus", 5], ["Beckon", 6], ["Decay", 1], ["Pox", 2], ["Victual", 2], ["Transfer", 3], ["Slumber", 4], ["Balsam", 5], ["Meld", 6], ["Growth", 1], ["Stay", 2], ["Hunger", 3], ["Warp", 3], ["Vine", 4], ["Succour", 5], ["Petrification", 6], ["Shape", 1], ["Syncope", 2], ["Nurture", 3], ["Earthwork", 4], ["Wasting", 4], ["Tunnel", 5], ["Regenesis", 6]], "Jmôrvi": [["Lustre", 1], ["Aspect", 2], ["Tempering", 2], ["Repel", 3], ["Mephitis", 4], ["Hand", 5], ["Assemble", 6], ["Protection", 1], ["Dart", 2], ["Anvil", 3], ["Singing Sword", 3], ["Steel", 4], ["Mould", 5], ["Lance", 6], ["Revelation", 1], ["Foundry", 2], ["Charm", 3], ["Fist", 4], ["Swordbreaker", 4], ["Restoration", 5], ["Screen", 6], ["Sight", 1], ["Magnet", 2], ["Mend", 3], ["Forge", 4], ["Armour", 5], ["Shroud", 5], ["Shatter", 6]], "Pèleáhn": [["Caress", 1], ["Sphere", 1], ["Skin", 2], ["Pyre", 3], ["Fever", 4], ["Immolation", 5], ["Convoke", 6], ["Desiccation", 1], ["Cloak", 2], ["Thirst", 2], ["Shooting Star", 3], ["Wall", 4], ["Meteor", 5], ["Doom Flame", 6], ["Flame", 1], ["Fireworks", 2], ["Brand", 3], ["Conflagration", 4], ["Doom Curtain", 5], ["Seeker", 5], ["Fire Fiend", 6], ["Heat", 1], ["Hastening", 2], ["Eyes", 3], ["Envelope", 4], ["Gauntlet", 5], ["Burn", 6], ["Mantle", 6]], "Lyáhvi": [["Beacon", 1], ["Whisper", 1], ["Sound", 2], ["Image", 3], ["Beam", 4], ["Glamour", 5], ["Call", 6], ["Muffle", 1], ["Flash", 2], ["Voice", 2], ["Prism", 3], ["Curtain", 4], ["Motes", 5], ["Figure", 6], ["Palm", 1], ["Lens", 2], ["Caecity", 3], ["Unveiling", 3], ["Mirror", 4], ["Passage", 5], ["Vapour", 6], ["Stench", 1], ["Pocket", 2], ["Globe", 3], ["View", 3], ["Nightmare", 4], ["Tube", 5], ["Wind", 6]], "Sàvôrya": [["Candour", 1], ["Sensation", 1], ["Fervour", 2], ["Panic", 3], ["Link", 4], ["Aural Blast", 5], ["Host", 6], ["Diversion", 1], ["Solace", 1], ["Insight", 2], ["Quill", 3], ["Obedience", 4], ["Confusion", 5], ["Rupture", 6], ["Enquiry", 1], ["Enrichment", 2], ["Thought", 2], ["Wisdom", 3], ["Probity", 4], ["Enervation", 5], ["Suggestion", 6], ["Harmony", 1], ["Feel", 2], ["Missive", 3], ["Key", 4], ["Recollection", 4], ["Perspective", 5], ["Veil", 6]], "Odívshè": [["Cooling", 1], ["Alchema", 2], ["Sponge", 2], ["Gills", 3], ["Tide", 4], ["Rest", 5], ["Enigma", 6], ["Flotation", 1], ["Dowsing", 2], ["Breath", 3], ["Condensation", 4], ["Calm", 5], ["River", 5], ["Floe", 6], ["Quenching", 1], ["Hush", 2], ["Crystals", 3], ["Pall", 4], ["Gloomweb", 5], ["Wave", 5], ["Snowball", 6], ["Spoon", 1], ["Shadow", 2], ["Freeze", 3], ["Sweat", 4], ["Icewalk", 5], ["Conjure", 6], ["Waterwalk", 6]], "Neutral": [["Absorb", 1], ["Alarm", 2], ["Monitor", 2], ["Fount", 3], ["Resurge", 4], ["Investment", 5], ["Aegis", 1], ["Bane", 2], ["Tap", 2], ["Pool", 3], ["Sanctum", 4], ["Mask", 5], ["Attune", 1], ["Charge", 2], ["Ward", 2], ["Trigger", 3], ["Subvert", 4], ["Reverse", 5], ["Detect", 1], ["Dispel", 2], ["Counter", 3], ["Chain", 4], ["Vessel", 4], ["Bubble", 6], ["Reveal", 1], ["Distort", 2], ["False Soul", 3], ["Converse", 4], ["Well", 4], ["Personality", 6], ["Survey", 1], ["Imbue", 2], ["Focus", 3], ["Resolve", 4], ["Gate", 5], ["Vortex", 6]]});
export const CREATION_PVAR_CONVOCATIONS=Object.freeze(['Fývria','Jmôrvi','Pèleáhn','Lyáhvi','Sàvôrya','Odívshè']);
export const FREE_PVAR_SPELLS=Object.freeze(['Neutral::Detect','Neutral::Reveal','Neutral::Dispel']);
const LEVEL={Primary:0,Secondary:1,Neutral:2,Tertiary:3,Diametric:4};
const optimal={Primary:1,Neutral:2,Secondary:3,Tertiary:4,Diametric:5};
export const PVAR_GUILD_RANKS=Object.freeze(['Mavâr','Satía Mavâr','Shenâva','Vîrán']);
const whole=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
export function convocationAffinity(primary,convocation){
 if(!CREATION_PVAR_CONVOCATIONS.includes(primary))throw Error('Neznámá Primary Convocation');
 if(convocation==='Neutral')return 'Neutral';
 const index=CREATION_PVAR_CONVOCATIONS.indexOf(convocation);
 if(index<0)throw Error('Spell Convocation chybí v HMK p.211');
 const a=CREATION_PVAR_CONVOCATIONS.indexOf(primary),dist=Math.min((index-a+6)%6,(a-index+6)%6);
 return ['Primary','Secondary','Tertiary','Diametric'][dist];
}
export function creationSpellCatalog(){return Object.entries(CREATION_PVAR_SPELLS).flatMap(([convocation,rows])=>rows.map(([name,complexity])=>({id:`${convocation}::${name}`,convocation,name,complexity})));}
const SPELL_MAP=new Map(creationSpellCatalog().map(s=>[s.id,s]));
export function allowedStartingSpell({pvarismML,affinity,naturalAttunement=false,assisted=true}={}){
 if(!whole(pvarismML,0,200)||!Object.hasOwn(LEVEL,affinity))throw Error('Neplatný Pvârism ML / affinity');
 if(assisted){
  return affinity==='Primary'&&pvarismML>=20 || affinity==='Neutral'&&pvarismML>=40 || affinity==='Secondary'&&pvarismML>=70 || affinity==='Tertiary'&&pvarismML>=80 || affinity==='Diametric'&&pvarismML>=90;
 }
 return affinity==='Primary'&&(pvarismML>=70||naturalAttunement&&pvarismML>=10)||affinity==='Secondary'&&pvarismML>=80||affinity==='Tertiary'&&pvarismML>=90||affinity==='Diametric'&&pvarismML>=100;
}
export function validateStartingPvarSpells({occupation,pvarismML,primary,chantryStars,chantryConvocation,homeChantry='',chantryId,guildRank='',attunedObject='',choices=[],artefacts=[],naturalAttunement=false,startingARP}={}){
 const job=String(occupation??'');
 const verifiedChantry=resolveStartingChantry({chantryId,homeChantry,chantryConvocation,chantryStars});
 if(verifiedChantry){homeChantry=verifiedChantry.name;chantryConvocation=verifiedChantry.convocation;chantryStars=verifiedChantry.stars;}
 if(!job.startsWith('Shèk-Pvâr (')||!job.includes(primary+')'))throw Error('Primary Convocation musí odpovídat povolání Shèk-Pvâr');
 if(!whole(pvarismML,0,200)||!whole(chantryStars,1,5)||!(Number.isFinite(startingARP)&&startingARP>=0&&startingARP<=2000&&Math.round(startingARP*4)===startingARP*4))throw Error('Chybí Pvârism ML, ARP nebo doložená hvězdná kvalita chantry');
 if(chantryConvocation===undefined)chantryConvocation=primary; // existing v93.228 saved files remain valid
 if(!CREATION_PVAR_CONVOCATIONS.includes(chantryConvocation))throw Error('Domovská chantry: ověřte její vlastní Primary Convocation (p.197,205)');
 if(guildRank&&!PVAR_GUILD_RANKS.includes(guildRank))throw Error('Neplatný Guild Rank (p.199)');
 if(typeof attunedObject!=='string'||attunedObject.length>160||typeof homeChantry!=='string'||homeChantry.length>160)throw Error('Neplatný popis attunement / chantry');
 if(!Array.isArray(choices)||choices.length>204||!Array.isArray(artefacts)||artefacts.length>8)throw Error('Neplatný seznam kouzel nebo artefaktů');
 const seen=new Set(),known=new Set(pvarismML>=40?FREE_PVAR_SPELLS:[]),purchased=[];
 let spent=0;
 for(const row of choices){
  const id=typeof row==='string'?row:row?.id,assisted=typeof row==='string'?true:row?.assisted!==false;
  const s=SPELL_MAP.get(id);
  if(!s||seen.has(id)||known.has(id))throw Error('Neznámé, duplicitní nebo bezplatné Neutral kouzlo v nákupu ARP');
  const affinity=convocationAffinity(primary,s.convocation);
  if(!allowedStartingSpell({pvarismML,affinity,naturalAttunement,assisted}))throw Error(`Spell ${id} není dostupný pro současný Pvârism ML a typ výzkumu (p.205)`);
  const resourceAffinity=convocationAffinity(chantryConvocation,s.convocation);
  let cost=s.complexity+LEVEL[affinity];
  if(naturalAttunement&&affinity==='Primary')cost/=2;
  if(assisted)cost+=Math.max(0,optimal[resourceAffinity]-chantryStars);
  if(['Neutral::Survey','Neutral::Gate','Neutral::Vortex'].includes(id))cost*=2; // HMK p.249: after Resources Modifier
  spent+=cost;known.add(id);seen.add(id);
  purchased.push({id,assisted,affinity,complexity:s.complexity,arpCost:cost});
 }
 const artifactRows=[];
 for(const a of artefacts){
  if(!a||!['minor','major'].includes(a.kind)||!['S','CS'].includes(a.result)||!['Indefinite','Permanent'].includes(a.duration))throw Error('Artefact: nutno vybrat minor/major, S/CS a duration');
  if(!known.has('Neutral::Vessel'))throw Error('Artefact vyžaduje naučený Vessel (Neutral IV)');
  const enchantments=Array.isArray(a.enchantments)?a.enchantments:(a.enchantment?[a.enchantment]:[]);
  if(enchantments.length<(a.kind==='major'?2:1)||a.kind==='minor'&&enchantments.length!==1||new Set(enchantments).size!==enchantments.length||enchantments.some(x=>!known.has(x)))throw Error('Artefact vyžaduje známá různá kouzla: minor 1, major nejméně 2 (p.54,256)');
  if(a.kind==='major'&&!['Neutral::False Soul','Neutral::Investment','Neutral::Personality'].some(s=>known.has(s)))throw Error('Major artefact vyžaduje False Soul, Investment nebo Personality (p.54)');
  const cost=(a.result==='CS'?10:1)*(a.kind==='major'?2:1);
  spent+=cost;artifactRows.push({kind:a.kind,result:a.result,duration:a.duration,enchantments:[...enchantments],arpCost:cost});
 }
 if(spent>startingARP)throw Error(`Nákupy ARP překročily rozpočet ${spent} > ${startingARP} (p.54)`);
 return {occupation:job,primary,pvarismML,chantryStars,chantryConvocation,homeChantry,...(chantryId?{chantryId,chantryReviewNeeded:verifiedChantry.reviewNeeded}:{}),guildRank,attunedObject,naturalAttunement,startingARP,freeSpells:pvarismML>=40?[...FREE_PVAR_SPELLS]:[],spells:purchased,artefacts:artifactRows,spentARP:spent,remainingARP:startingARP-spent,sourcePages:[54,200,205,211,249]};
}
