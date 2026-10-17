/** HMK v1.2 p.310: twelve named divine aspects and printed descriptors.
 * A Marked character (15–16) or a character granted Grace (17–20)
 * chooses exactly one at creation (p.53,311). */
export const CREATION_DIVINE_ASPECTS=Object.freeze([
 {id:'zem',role:'First',element:'Soul',domain:'Dreams',world:'Stars',psyche:'Acceptance',mode:'Personal'},
 {id:'nav',role:'Last',element:'Death',domain:'Destiny',world:'Darkness',psyche:'Discipline',mode:'Stealth'},
 {id:'kaj',role:'Man',element:'Storms',domain:'Leadership',world:'Sky',psyche:'Freedom',mode:'Vitality'},
 {id:'eon',role:'Mother',element:'Earth',domain:'Fertility',world:'Plants',psyche:'Comfort',mode:'Healing'},
 {id:'ara',role:'Daughter',element:'Order',domain:'Combat',world:'Cities',psyche:'Justice',mode:'Continuity'},
 {id:'zer',role:'Uncle',element:'Mind',domain:'Knowledge',world:'Mountains',psyche:'Wisdom',mode:'Secrets'},
 {id:'hal',role:'Woman',element:'Metal',domain:'Wealth',world:'Body',psyche:'Pleasure',mode:'Luck'},
 {id:'agr',role:'Son',element:'Fire',domain:'Authority',world:'Deserts',psyche:'Conflict',mode:'Power'},
 {id:'ivo',role:'Father',element:'Animals',domain:'Mysticism',world:'Wilderness',psyche:'Cycles',mode:'Creativity'},
 {id:'mor',role:'Outsider',element:'Chaos',domain:'Undeath',world:'Void',psyche:'Absolutes',mode:'Annihilation'},
 {id:'eda',role:'Traveller',element:'Water',domain:'Voyages',world:'Oceans',psyche:'Idealism',mode:'Change'},
 {id:'kyv',role:'Crone',element:'Fungi',domain:'Age',world:'Disease',psyche:'Hate',mode:'Decay'}
].map(a=>Object.freeze(a)));
export function divineAspectFromChoice(grace,aspect){
 if(!grace||!Number.isInteger(grace.roll))throw Error('Divine Aspect vyžaduje původní fyzický Grace d20');
 const needs=grace.marked||grace.grace>0;
 if(!needs){if(aspect)throw Error('HMK p.53: Divine Aspect se volí pouze při Marked nebo Grace');return null;}
 const item=CREATION_DIVINE_ASPECTS.find(a=>a.id===aspect);
 if(!item)throw Error('HMK p.53,310: pro Grace nebo Marked vyberte jeden z 12 Divine Aspects');
 return {...item,sourcePage:310};
}
