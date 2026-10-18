import {PRINTED_ARMOUR_ARTICLES_P118} from '../rules/armour-articles-printed.js';
import {PRINTED_ARMOUR_SUITS_P113_116} from '../rules/armour-suit-printed.js';

// Name normalization is for identification only. It never authorizes equipping.
const MATERIALS={cloth:'cloth',leather:'leather',padded:'padded',quilted:'quilted',gambeson:'gambeson',kurbul:'kurbul',scale:'scale',mail:'mail',plate:'plate'};
function normalize(s){return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/û/g,'u').replace(/¾/g,'three quarter').toLowerCase().replace(/\bslvd\b\.?/g,'sleeved').replace(/\bsleeved tunic\b/g,'tunic sleeved').replace(/\bthree quarter helm\b/g,'three quarter helm').replace(/[^a-z0-9]+/g,' ').trim();}
export function reconcileSuitArticles({suits=PRINTED_ARMOUR_SUITS_P113_116,articles=PRINTED_ARMOUR_ARTICLES_P118}={}){
 const index=new Map();for(const a of articles){const k=normalize(`${a.material} ${a.name}`);if(!index.has(k))index.set(k,[]);index.get(k).push(a);}
 const entries=[];for(const suit of suits){for(const label of suit.articles){const n=normalize(label);const candidates=index.get(n)||[];
  // The PDF suit shorthand "Great Helm" means Plate Great helm; do not guess any other material.
  const resolved=candidates.length?candidates:(n==='great helm'?(index.get('plate great helm')||[]):[]);
  entries.push(Object.freeze({suit:suit.name,page:suit.page,label,status:resolved.length===1?'matched':resolved.length===0?'unmatched':'ambiguous',articleId:resolved.length===1?resolved[0].id:null}));
 }}
 return {suits:suits.length,parts:entries.length,matched:entries.filter(e=>e.status==='matched').length,unmatched:entries.filter(e=>e.status==='unmatched'),ambiguous:entries.filter(e=>e.status==='ambiguous'),entries};
}
