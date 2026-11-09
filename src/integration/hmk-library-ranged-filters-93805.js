/** Read-only 93.805 catalogue filter. Printed bows/crossbows/slings and
 * their projectiles are missile equipment; explicitly thrown weapon modes
 * are thrown equipment. The catalogue's original definitions are not mutated.
 */
import {libraryTabsForItem} from './hmk-library-tabs.js';

export function rangedCategories93805(item){
 if(!libraryTabsForItem(item).includes('ranged'))return [];
 const p=item?.properties||{};
 if(p.projectileKind||p.projectileType||String(item?.id||'').startsWith('hmk:projectile:'))return ['missile'];
 if(item?.category!=='weapon')return ['missile'];
 const modes=[String(p.missileType||'').toLowerCase(),
   ...(Array.isArray(p.verifiedModes)?p.verifiedModes.map(m=>String(m?.missileType||'').toLowerCase()):[])];
 const thrown=!!p.printedThrowingMode||modes.includes('thrown');
 const missile=modes.some(t=>t&&t!=='thrown')||(!thrown&&p.baseRangeFt!=null);
 // Ranged is independently verified by the existing catalogue classifier.
 // Unknown old/custom ranged records remain under 'all', not guessed.
 return [ ...(missile?['missile']:[]), ...(thrown?['thrown']:[]) ];
}
export function filterRangedCatalogue93805(items,kind='all'){
 if(kind==='all')return items;
 if(!['missile','thrown'].includes(kind))throw Error('Neznámý filtr střelných / vrhacích zbraní');
 return items.filter(item=>!libraryTabsForItem(item).includes('ranged')||rangedCategories93805(item).includes(kind));
}
