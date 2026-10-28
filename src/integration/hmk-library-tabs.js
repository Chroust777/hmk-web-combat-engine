/** Presentation-only categorisation of existing HMK catalogue definitions.
 * No inventory creation, prices or printed combat rules are altered here. */
export const LIBRARY_TABS=Object.freeze([
 {id:'melee',name:'Zbraně zblízka'},
 {id:'ranged',name:'Střelné / vrhací'},
 {id:'shields',name:'Štíty'},
 {id:'armour',name:'Části zbroje'},
 {id:'suits',name:'Hotové komplety'},
 {id:'other',name:'Ostatní vybavení'},
 {id:'bestiary',name:'Bestiář a encountery'},
 {id:'rules',name:'Pravidla a audit'}
]);
export const LIBRARY_PAGE_SIZE=24;
export function libraryTabsForItem(item){
 const cat=item?.category,p=item?.properties||{};
 if(cat==='armor')return ['armour'];
 if(cat==='shield')return ['shields'];
 if(p.projectileKind||p.projectileType||String(item?.id||'').startsWith('hmk:projectile:'))return ['ranged'];
 if(cat==='weapon'){
  const type=String(p.missileType||'').toLowerCase();
  const ranged=!!type||Array.isArray(p.verifiedModes)&&p.verifiedModes.some(m=>!!m.missileType);
  if(type==='thrown'||p.printedThrowingMode)return ['melee','ranged'];
  return ranged?['ranged']:['melee'];
 }
 return ['other'];
}
export function libraryVisiblePage(items,tab,search='',status='all',isReady=()=>true,page=0){
 const term=String(search).trim().toLocaleLowerCase('cs');
 const rows=items.filter(i=>libraryTabsForItem(i).includes(tab)&&
  (!term||[i.name,i.description,i.source,i.properties?.missileType,i.properties?.material].join(' ').toLocaleLowerCase('cs').includes(term))&&
  (status==='all'||(status==='ready'?isReady(i):!isReady(i))))
  .sort((a,b)=>a.name.localeCompare(b.name,'cs'));
 const pages=Math.max(1,Math.ceil(rows.length/LIBRARY_PAGE_SIZE));
 const current=Math.min(Math.max(0,Math.trunc(Number(page)||0)),pages-1);
 return {total:rows.length,pages,page:current,rows:rows.slice(current*LIBRARY_PAGE_SIZE,(current+1)*LIBRARY_PAGE_SIZE)};
}
// Match reference suit components to owned-copy-capable catalog definitions. A
// normalized name alone is NEVER enough: material, printed price and mass
// must also agree and exactly one catalog definition must match.
export function normalizeArmourLabel(value){
 return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/¾/g,'three quarter')
  .toLowerCase().replace(/\bslvd\b\.?/g,'sleeved').replace(/\bsleeved tunic\b/g,'tunic sleeved')
  .replace(/\bthree quarter helm\b/g,'three quarter helm').replace(/[^a-z0-9]+/g,' ').trim();
}
const MATERIAL_CODES=Object.freeze({C:'cloth',L:'leather',D:'padded',Q:'quilted',G:'gambeson',K:'kurbul',S:'scale',M:'mail',P:'plate'});
export function resolveSuitCatalogParts(suit,crosswalk,printedArticles,catalog){
 const links=crosswalk.entries.filter(e=>e.suit===suit.name);
 if(links.length!==suit.articles.length)return {ok:false,reason:'Neshoda seznamu součástí s tištěným kompletem',parts:[]};
 const parts=[];
 for(let i=0;i<links.length;i++){
  const link=links[i];if(link.status!=='matched'||!link.articleId)return {ok:false,reason:`Nepřiřazená součást: ${link.label}`,parts:[]};
  const printed=printedArticles.find(a=>a.id===link.articleId);
  if(!printed)return {ok:false,reason:`Nedoložená tisková součást: ${link.label}`,parts:[]};
  const expected=normalizeArmourLabel(`${printed.material} ${printed.name}`);
  const matches=catalog.filter(c=>c.category==='armor'&&c.builtin===true&&
   normalizeArmourLabel(c.name)===expected&&
   (MATERIAL_CODES[c.properties?.material]||String(c.properties?.material||'').toLowerCase())===printed.material&&
   Number(c.properties?.pricePence)===printed.priceD&&
   Math.abs(Number(c.properties?.weightLb)-printed.weightLb)<0.0001);
  if(matches.length!==1)return {ok:false,reason:`Součást ${link.label}: ${matches.length?'nejednoznačná':'chybějící'} katalogová definice`,parts:[]};
  parts.push(matches[0]);
 }
 return {ok:true,parts};
}
