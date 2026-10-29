/** Czech, user-oriented diagnostics for HMK printed pp.117–118.
 * A mathematically impossible stack is marked red even when the old inventory
 * has no layerOrder; an unknown but possible order remains explicitly unknown.
 */
import {printedSuitAV} from '../rules/armour-all-suits-fixed.js';
export const HMK_ARMOUR_LOCATIONS=Object.freeze({
 sk:'Lebka',fa:'Obličej',nk:'Krk',sh:'Rameno',ua:'Paže',el:'Loket',fo:'Předloktí',ha:'Ruka',
 tx:'Hrudník',ab:'Břicho',pv:'Pánev',th:'Stehno',kn:'Koleno',ca:'Lýtko',ft:'Chodidlo'
});
export const HMK_ARMOUR_ZONES=Object.freeze({head:'Hlava',arms:'Paže',torso:'Trup',legs:'Nohy'});
export function layerDisplayRows(report,inventory=[],load=null){
 const worn=inventory.filter(x=>x?.slot==='worn'&&x?.snapshot?.category==='armor');
 const byId=new Map(worn.map(x=>[x.id,x]));
 const audited=load?.layeringDetails;
 const feasible=load?.layeringFeasibility?.zones||{};
 const bulk=load?.bulkByZone||{};
 return (report?.rows||[]).map(row=>{
  if(load?.printedSuit&&load?.bulkReady){
   const cells=Object.fromEntries(['b','e','p','f'].map(a=>{
    const r=printedSuitAV(load.printedSuit,row.location,a);
    return [a,r.ok&&r.covered?r.av:0];
   }));
   return {...row,protection:cells,status:'valid',detail:`Ověřený tištěný komplet ${load.printedSuit}: hodnoty ze samostatné tabulky HMK, nikoliv součet překrývajících se jednotlivých článků.`,
    locationName:HMK_ARMOUR_LOCATIONS[row.location]||row.location,names:row.articles.map(a=>a.name).join(', '),zoneNames:'',bulk:null};
  }
  const things=row.articles.map(a=>byId.get(a.id)).filter(Boolean);
  const zones=Object.entries(feasible).filter(([,z])=>z.locations?.[row.location]);
  const provenForbidden=zones.some(([,z])=>z.status==='forbidden');
  const impossibleLocal=zones.some(([,z])=>z.locations[row.location]?.prohibited);
  const locationIssue=(audited?.locationReports||[]).find(x=>x.location===row.location&&x.status==='violation');
  // A shared anatomical location may belong to different p.117 Body Zones.
  // For instance, Cloth Tunic (Torso) and Cloth Breeches (Legs) overlap on
  // Pelvis, but this is NOT an unordered two-article stack within one zone.
  // Likewise, a feasibility proof that EVERY relevant physical order works
  // does not require a player to record a meaningless order for that location.
  const orderDependentHere=zones.length===0||zones.some(([,z])=>
   (z.locations?.[row.location]?.count??0)>1&&!z.orderInvariant);
  const lackingOrder=orderDependentHere&&things.length>1&&things.some(x=>!Number.isSafeInteger(x.layerOrder));
  const forcedBulk=zones.filter(([zone])=>bulk[zone]===-5).map(([zone])=>HMK_ARMOUR_ZONES[zone]);
  const potentialBulk=zones.some(([,z])=>z.status==='bulk-exception-possible');
  const status=provenForbidden||impossibleLocal||locationIssue?'forbidden':row.count>5?'over-limit':
   forcedBulk.length?'bulk':lackingOrder?'unverified':potentialBulk?'unverified':'valid';
  let detail=status==='over-limit'?`Na této lokaci je ${row.count} vrstev; běžný limit je 5 (+${row.count-5}).${forcedBulk.length?' Doložená výjimka Cloth/Padded: Bulk '+(-5*forcedBulk.length)+'.':potentialBulk?' Může jít o výjimku Cloth/Padded; ověřte skutečné pořadí.':' Bez přípustné výjimky je tato sestava zakázaná.'}`:
   status==='forbidden'?`Zakázaná kombinace materiálů nebo více zbrojních kusů v jedné tělesné zóně; nelze ji legalizovat pouhým Bulk.`:
   status==='bulk'?`Povolená dodatečná vrstva C/D, Bulk −5 za zónu ${forcedBulk.join(', ')}.`:
   status==='unverified'?`Položky mají možné pravidlové uspořádání, ale skutečné pořadí zevnitř ven není zaznamenáno.`:
   'Kombinace je přípustná podle pravidel jednotlivých Body Zones; nepovolená vrstva ani Bulk nebyly doloženy.';
  // A zone-level prohibition can exist even if no individual location has >5.
  if(provenForbidden&&row.count<=5)detail='V příslušné tělesné zóně nelze sestavit žádné dovolené pořadí; viz seznam nasazených kusů.';
  return {...row,status,detail,locationName:HMK_ARMOUR_LOCATIONS[row.location]||row.location,
   names:row.articles.map(a=>a.name).join(', '),zoneNames:zones.map(([z])=>HMK_ARMOUR_ZONES[z]).join(' / '),
   bulk:forcedBulk.length?-5*forcedBulk.length:null};
 });
}
export function readableLayerIssues(load,inventory=[]){
 const items=new Map(inventory.filter(Boolean).map(x=>[x.id,x.snapshot?.name||'Neznámý předmět']));
 const output=[];
 const feas=load?.printedSuit?{}:load?.layeringFeasibility?.zones||{};
 for(const [zone,info] of Object.entries(feas)){
  if(info.status==='forbidden')output.push(`${HMK_ARMOUR_ZONES[zone]}: nasazené materiály nelze ani přeuspořádat do pravidlově přípustné sestavy. Odeberte některý kus; automatický náhradní postih HMK nestanoví.`);
  else if(info.status==='bulk-exception-possible'&&!load?.bulkReady)
   output.push(`${HMK_ARMOUR_ZONES[zone]}: je možná jedna výjimka C/D s Bulk −5, ale bez doloženého pořadí nelze potvrdit, zda je skutečně použita.`);
 }
 for(const raw of load?.issues||[]){
  const text=String(raw);
  if(/inner-to-outer layerOrder required|Missing physical order/.test(text)){
   const id=text.split(':')[0];output.push(`U předmětu „${items.get(id)||'některá zbroj'}“ není evidováno pořadí vrstev (zevnitř ven).`);
  } else if(/Unresolved or forbidden armour layers|forbidden material order|exceeds five|More than five/i.test(text)){
   if(!Object.values(feas).some(x=>x.status==='forbidden'))output.push('Vrstvení zatím nelze definitivně ověřit; konkrétní lokace jsou označené v tabulce.');
  } else if(/unknown physical weight|unknown.*weight/i.test(text)){
   output.push('Některá nesená položka nemá ověřenou hmotnost; Gear ENC proto nelze dopočítat.');
  } else if(/Unknown printed article ENC/i.test(text)){
   output.push('Část zbroje nemá ověřenou katalogovou hodnotu ENC.');
  } else if(/Unknown equipment slot|Invalid or duplicate inventory ID/.test(text)){
   output.push('Inventář obsahuje neplatný nebo duplicitní záznam.');
  } else if(/Unknown|Unresolved|Invalid|duplicate|requires|missing|not source-verified/i.test(text)){
   output.push('Některé údaje výbavy nejsou úplné nebo doložené.');
  } else output.push(text);
 }
 return [...new Set(output)];
}
