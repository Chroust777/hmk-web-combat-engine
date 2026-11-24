import {atlasCartographyPanel,mountAtlasCartography} from './atlas-cartography.js?v=94.081';
/**
 * Hârn Atlas v94.081 — custom markers persist in the existing private GitHub campaign snapshot.
 * Overview: I4–L7 and 16 selectable sectors.
 * Detail: K5 from the user's untouched, vector K5.pdf, rendered on demand using PDF.js.
 * Measurement stays ephemeral. Markers share the existing guarded campaign JSON / GitHub Cloud pipeline.
 */
const OVERVIEW=Object.freeze({
 id:'overview', width:2449,height:2363,margin:48,
 image:'./assets/atlas/harn-I4-L7.webp',
 key:'./assets/atlas/harn-map-key.webp',
 title:'Atlas Hârnu',
 subtitle:'Přehledová mapa I4–L7 · vyberte sektor, pro který je připravena detailní mapa',
 legendTitle:'Legenda hlavní mapy',legendNote:'Originální vysvětlivky HârnWorld',
 legendWidth:647,legendHeight:3254,
 legendAlt:'Vysvětlivky původní mapy HârnWorld: krajiny, lesy, vody, hory, cesty a sídla',
 scaleNote:'1 hex = 5 hârnických lig ≈ 20 km',
 pixelsPerKm:300/2.54/20
});
const DETAIL_K5=Object.freeze({
 id:'K5', width:4172,height:4031,margin:0,
 pdf:'./assets/atlas/k5-detail-map.pdf',
 key:'./assets/atlas/k5-detail-legend.webp',
 title:'Atlas Hârnica · K5',
 subtitle:'Detailní mapa sektoru K5 · originální kresba a všechny místní názvy',
 legendTitle:'Legenda sektoru K5',legendNote:'',
 legendWidth:814,legendHeight:2981,
 legendAlt:'Legenda mapy K5: vegetace, sněhové oblasti, reliéf, brody, cesty, sídla, oblasti a grafické měřítko v ligách',
 scaleNote:'0–5 lig na původní mapě ≈ 0–20 km',
 // The five-league bar measured from PDF vector text positions spans 141.28 pt.
 // The K5 stage reproduces the same source PDF crop at 400/72 screen px per pt.
 pixelsPerKm:141.28*(400/72)/20,
 // Rect in the original PDF's ROTATED, landscape page coordinates (points).
 pdfCrop:Object.freeze({x:340.3,y:31.1,w:750.8,h:725.4})
});
// PDF.js loads only when K5 is opened; no external JS is loaded on the overview.
const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
const MAPS=Object.freeze({overview:OVERVIEW,K5:DETAIL_K5});
const LETTERS=Object.freeze(['I','J','K','L']);
const ROWS=Object.freeze([4,5,6,7]);
export const ATLAS_SECTORS=Object.freeze(ROWS.flatMap(row=>LETTERS.map(column=>Object.freeze({
 id:`${column}${row}`,column,row,detailMap:column==='K'&&row===5?'K5':null
}))));
let currentMapId='overview';

const rememberedByMap={overview:{initialized:false},K5:{initialized:false}};
// Measurement is intentionally ephemeral and independent of campaign/game data.
// Coordinates are in original map pixels, never viewport/screen pixels.
const measurementsByMap={overview:{active:false,points:[]},K5:{active:false,points:[]}};

// Atlas markers are a separate top-level field in the EXISTING campaign JSON.
// The persisted coordinates are source-map pixels; this data does not affect travel,
// time, health, or any other rules module.
const MARKER_TYPES=Object.freeze({party:{label:'Pozice družiny',symbol:'♟'},village:{label:'Vesnice',symbol:'⌂'},camp:{label:'Tábor',symbol:'⚑'},discovery:{label:'Nález',symbol:'✦'},danger:{label:'Nebezpečí',symbol:'!'},other:{label:'Jiné',symbol:'●'}});
const markerDisplayName=item=>item.name||MARKER_TYPES[item.type]?.label||'Značka';
const MARKER_EVENTS=Object.freeze({discovery:'Objeveno',visit:'Navštíveno',departure:'Opuštěno',other:'Poznámka'});
const markersByMap={overview:[],K5:[]};
let markerStoreLoaded=false,markerSequence=0,markerPersistence=null,atlasPartySave=null,atlasMarkerChanged=null;
const cleanMarker=(item,map)=>{
 if(!item||typeof item!=='object'||typeof item.id!=='string'||item.id.length>90)return null;
 if(!Number.isFinite(item.x)||!Number.isFinite(item.y)||item.x<0||item.y<0||item.x>=map.width||item.y>=map.height)return null;
 const type=Object.hasOwn(MARKER_TYPES,item.type)?item.type:'other';
 // Names and notes are optional for ALL types, including the party position.
 const name=typeof item.name==='string'?item.name.trim().slice(0,90):'';
 const description=typeof item.description==='string'?item.description.slice(0,1000):'';
 const events=Array.isArray(item.events)?item.events.slice(0,80).map(e=>({id:String(e.id||'').slice(0,90),kind:Object.hasOwn(MARKER_EVENTS,e.kind)?e.kind:'other',date:typeof e.date==='string'?e.date.slice(0,80):'',note:typeof e.note==='string'?e.note.slice(0,500):''})):[];
 return {id:item.id,x:item.x,y:item.y,name,description,type,events};
};
const atlasEmptyMarkers=()=>({overview:[],K5:[]});
function parseMarkers(document){
 const out=atlasEmptyMarkers();
 for(const mapId of Object.keys(MAPS)){
  const rows=document?.[mapId];
  if(!Array.isArray(rows))continue;
  const ids=new Set();let partySeen=false;
  out[mapId]=rows.slice(0,250).map(row=>cleanMarker(row,MAPS[mapId])).filter(item=>{
   if(!item||ids.has(item.id)||item.type==='party'&&partySeen)return false;
   ids.add(item.id);if(item.type==='party')partySeen=true;return true;
  });
 }
 return out;
}
// Validate rather than silently sanitize a received cloud snapshot. Old snapshots
// without an Atlas field are valid and acquire it only on the next Atlas edit.
export function validateAtlasMarkers(document){
 if(document===undefined)return true;
 if(!document||typeof document!=='object'||Array.isArray(document))throw Error('Atlas: neplatná struktura značek.');
 for(const [mapId,rows] of Object.entries(document)){
  if(!Object.hasOwn(MAPS,mapId)||!Array.isArray(rows)||rows.length>250)throw Error('Atlas: neplatná mapa nebo počet značek.');
  const ids=new Set();let partySeen=false;
  for(const row of rows){
   const marker=cleanMarker(row,MAPS[mapId]);
   if(!marker||!Object.hasOwn(MARKER_TYPES,row.type)||ids.has(marker.id)||marker.type==='party'&&partySeen)
    throw Error('Atlas: poškozená, duplicitní nebo neplatná značka na '+mapId+'.');
   if(row.events!==undefined&&(!Array.isArray(row.events)||row.events.length>80||row.events.some(e=>!e||typeof e.id!=='string'||e.id.length>90||!Object.hasOwn(MARKER_EVENTS,e.kind)||typeof e.date!=='string'||e.date.length>80||typeof e.note!=='string'||e.note.length>500)||JSON.stringify(row.events)!==JSON.stringify(marker.events)))throw Error('Atlas: neplatné časové poznámky u značky.');
   if(row.name!==marker.name||row.description!==marker.description||row.type!==marker.type)
    throw Error('Atlas: nesouhlasí údaje značky na '+mapId+'.');
   ids.add(marker.id);if(marker.type==='party')partySeen=true;
  }
 }
 return true;
}
function replaceMarkersInPlace(document){
 const next=parseMarkers(document);
 for(const mapId of Object.keys(MAPS))markersByMap[mapId].splice(0,markersByMap[mapId].length,...next[mapId]);
}
let lastCommittedMarkers=atlasEmptyMarkers();
function loadAtlasMarkers(){
 // Reload from the authoritative shared campaign whenever a view remounts.
 // A GitHub Cloud refresh may replace the campaign while the app is open.
 const persisted=markerPersistence?.read?.();
 const received=parseMarkers(persisted);
 if(markerStoreLoaded&&JSON.stringify(received)===JSON.stringify(lastCommittedMarkers))return;
 markerStoreLoaded=true;
 replaceMarkersInPlace(persisted);
 lastCommittedMarkers=received;
}
function saveAtlasMarkers(){
 if(!markerPersistence?.write)return false;
 const next=parseMarkers(markersByMap);
 try{
  const oldParty=lastCommittedMarkers[currentMapId]?.find(m=>m.type==='party');
  const newParty=next[currentMapId]?.find(m=>m.type==='party');
  const partyChanged=!!oldParty!==!!newParty||!!newParty&&(!oldParty||oldParty.x!==newParty.x||oldParty.y!==newParty.y);
  if(partyChanged){
   if(atlasPartySave?.(parseMarkers(lastCommittedMarkers),next))return true;
   replaceMarkersInPlace(lastCommittedMarkers);return false;
  }
  const ok=markerPersistence.write(next)===true;
  if(ok){
   const previous=parseMarkers(lastCommittedMarkers);
   lastCommittedMarkers=parseMarkers(next);
   atlasMarkerChanged?.(previous,next);
   return true;
  }
 }catch(err){console.error('Atlas cloud save:',err)}
 // CAS, cloud lock, quota or validation refused: always revert visual markers.
 replaceMarkersInPlace(lastCommittedMarkers);
 return false;
}
const LEAGUE_KM=4; // 1 Hârnic league = 4 km, confirmed by both source map scales.
const formatDistance=(km)=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:km<1?3:2}).format(km);
const formatSegment=(km)=>km<1?`${new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:km<.1?1:0}).format(km*1000)} m`:`${formatDistance(km)} km`;
const pointLabel=index=>{let i=index+1,out='';while(i){i--;out=String.fromCharCode(65+i%26)+out;i=Math.floor(i/26);}return out;};
// Reusable physical-distance calculator in unscaled source-map coordinates.
export function atlasDistanceKm(mapId,a,b){
 const map=MAPS[mapId];if(!map||!a||!b)throw new Error('Atlas: invalid map or points');
 return Math.hypot(b.x-a.x,b.y-a.y)/map.pixelsPerKm;
}
// Returns each consecutive segment and their sum, INDEPENDENT of the viewport zoom.
export function atlasRouteDistancesKm(mapId,points){
 if(!Array.isArray(points))throw new Error('Atlas: points must be an array');
 const segments=points.slice(1).map((p,i)=>atlasDistanceKm(mapId,points[i],p));
 return {segments,totalKm:segments.reduce((total,segment)=>total+segment,0)};
}


const sectorButtons=()=>ATLAS_SECTORS.map(sector=>{
 const ready=!!sector.detailMap;
 return `<button type="button" class="atlas-sector${ready?' atlas-sector--has-detail':''}" data-atlas-sector="${sector.id}" aria-label="Sektor ${sector.id}${ready?', otevřít detailní mapu':' – detailní mapa zatím nepřipojena'}" title="${ready?'Otevřít detailní mapu K5':'Sektor '+sector.id+' · detailní mapa bude přidána později'}" tabindex="0"></button>`;
}).join('');

export function atlasView(){
 const map=MAPS[currentMapId]||OVERVIEW;
 const overview=map.id==='overview';
 const margin=map.margin;
 const stageW=map.width+margin,stageH=map.height+margin;
 const axes=overview?`<div class="atlas-letters" aria-hidden="true" style="left:${margin}px;width:${map.width}px">${LETTERS.map(letter=>`<span>${letter}</span>`).join('')}</div><div class="atlas-numbers" aria-hidden="true" style="top:${margin}px;height:${map.height}px">${ROWS.map(num=>`<span>${num}</span>`).join('')}</div>`:'';
 const grid=overview?`<div class="atlas-sector-grid" aria-label="Mřížka 16 sektorů; K5 otevírá detailní mapu">${sectorButtons()}</div>`:'';
 const hint=overview?'Kliknutím na K5 otevřete podrobnou mapu. Ostatní sektory zatím pouze označíte.':'Vektorové PDF K5 · při změně přiblížení se znovu ostře vykreslí viditelná oblast. Zpět vrací hlavní mapu.';
 return `<section class="atlas-workspace${overview?' atlas-workspace--overview':' atlas-workspace--detail'}" data-atlas-map="${map.id}" aria-label="Atlas Hârnu: ${overview?'přehled sektorů I4–L7':'detail K5'}">
  <header class="atlas-header"><div><p class="atlas-eyebrow">HÂRNWORLD · KARTOGRAFICKÁ KNIHOVNA</p><h1>${map.title}</h1><p>${map.subtitle}</p></div>
  ${overview?'':'<button type="button" class="atlas-back" data-atlas-back>← Zpět na hlavní mapu</button>'}
  </header>
  <div class="atlas-body">
   <aside class="atlas-legend" aria-label="${map.legendTitle}"><h2>${map.legendTitle}</h2>${map.legendNote?`<p class="atlas-legend-note">${map.legendNote}</p>`:''}
    <div class="atlas-legend-scroll"><img src="${map.key}" alt="${map.legendAlt}" width="${map.legendWidth}" height="${map.legendHeight}" draggable="false"></div>
    <div class="atlas-legend-scale"><strong>Originální měřítko</strong><span>${map.scaleNote}</span></div>
   </aside>
   <div class="atlas-map-pane">
    <div class="atlas-toolbar" role="toolbar" aria-label="Ovládání mapy">
     <button type="button" data-atlas-control="minus" aria-label="Oddálit mapu" title="Oddálit">−</button>
     <output class="atlas-zoom-label" data-atlas-zoom aria-live="off">100 %</output>
     <button type="button" data-atlas-control="plus" aria-label="Přiblížit mapu" title="Přiblížit">+</button>
     <button type="button" data-atlas-control="fit" class="atlas-fit" title="Zobrazit celou mapu">Celá mapa</button>
     <button type="button" data-atlas-marker-party class="atlas-party-position" aria-pressed="false" title="Zobrazit nebo umístit pozici družiny">Pozice družiny</button>
     <details class="atlas-toolbar-layers"><summary aria-label="Zobrazit vrstvy mapy">Vrstvy mapy</summary><div data-carto-layers class="atlas-carto-layers"></div></details>
     <div class="atlas-toolbar-help">Kolečko myši nebo dva prsty: přiblížení · tažení: posun</div>
    </div>
    <div class="atlas-viewport" data-atlas-viewport tabindex="0" role="region" aria-label="${overview?'Mapa I4–L7, K5 je klikací sektor':'Mapa K5'}, kolečko myši přibližuje, tažení posouvá, klávesy se šipkami posouvají">
     <div class="atlas-stage" data-atlas-stage style="width:${stageW}px;height:${stageH}px">
      ${axes}
      <div class="atlas-image-layer" style="left:${margin}px;top:${margin}px;width:${map.width}px;height:${map.height}px">
       ${overview?`<img src="${map.image}" data-atlas-image alt="Přehledová mapa Hârnu, sektory I4 až L7" width="${map.width}" height="${map.height}" draggable="false" decoding="async">`:`<div class="atlas-pdf-layer" data-atlas-pdf-layer aria-label="Vektorová detailní mapa K5 z PDF"><span class="atlas-pdf-loading" data-atlas-pdf-loading>Načítám vektorovou mapu K5…</span></div>`}
       ${grid}
      </div>
     </div>
     <svg class="atlas-measure-overlay" data-atlas-measure-overlay aria-hidden="true">
      <path data-atlas-measure-outline class="atlas-measure-line-outline" visibility="hidden"/>
      <path data-atlas-measure-line class="atlas-measure-line" visibility="hidden"/>
      <g data-atlas-measure-segments></g>
      <g data-atlas-measure-markers></g>
     </svg>
     <div class="atlas-custom-marker-overlay" data-atlas-custom-marker-overlay aria-label="Vlastní značky na mapě"></div>
     <svg class="atlas-cartography-overlay" data-atlas-carto-overlay aria-label="Mapové objekty a body trasy družiny"></svg>
     <canvas class="atlas-fog-overlay" data-atlas-fog aria-hidden="true"></canvas>
     <div class="atlas-carto-hover-delete" data-carto-hover-delete hidden><div class="atlas-carto-hover-tip" data-carto-hover-tip hidden></div><div class="atlas-carto-hover-actions"><button type="button" data-carto-hover-edit aria-label="Upravit poznámku nebo body objektu" title="Upravit objekt">✎</button><button type="button" data-carto-hover-remove aria-label="Smazat objekt nebo navazující trasu" title="Smazat">×</button></div></div>
     <div class="atlas-fog-brush-cursor" data-carto-fog-cursor hidden aria-hidden="true"></div>
     <div class="atlas-scale" aria-label="Grafické měřítko mapy"><div data-atlas-scale-line class="atlas-scale-line"></div><span data-atlas-scale-label>≈ 20 km</span></div>
    </div>
    <div class="atlas-status" role="status" aria-live="polite" data-atlas-status>${hint}</div>
   </div>
   <aside class="atlas-tools" aria-label="Nástroje mapy">
    <div class="atlas-tools-head"><h2>✎ Kartografické nástroje</h2><div class="atlas-carto-top" role="group" aria-label="Historie úprav kartografie"><button type="button" data-carto-undo disabled>Zpět</button><button type="button" data-carto-redo disabled>Znovu</button></div></div>
    <details class="atlas-tool-fold"><summary>↝ Měření trasy</summary><section class="atlas-tool-card" aria-label="Měření vzdálenosti">
     <button type="button" class="atlas-tool-action" data-atlas-measure-toggle aria-pressed="false">Zapnout měření</button>
     <div class="atlas-measure-instructions" data-atlas-measure-help role="status" aria-live="polite" hidden></div>
     <div class="atlas-measure-results" data-atlas-measure-result aria-live="polite" hidden>
      <div class="atlas-measure-total-caption">Celková délka trasy</div>
      <div class="atlas-measure-distance" data-atlas-measure-km>—</div>
      <div class="atlas-measure-units"><span data-atlas-measure-m>—</span><span data-atlas-measure-leagues>—</span></div>
      <div class="atlas-measure-segments-title" data-atlas-measure-count>Úseky trasy</div>
      <ol class="atlas-measure-segments-list" data-atlas-measure-segment-list></ol>
     </div>
     <div class="atlas-measure-actions">
      <button type="button" data-atlas-measure-undo disabled>Odebrat poslední bod</button>
      <button type="button" data-atlas-measure-reset disabled>Nové měření</button>
     </div>
     <p class="atlas-tool-footnote">1 hârnická liga ≈ 4 km.</p>
    </section></details>
    <details class="atlas-tool-fold"><summary>⌖ Vlastní značky</summary><section class="atlas-tool-card atlas-custom-section" aria-label="Vlastní značky mapy">
     <div class="atlas-marker-placement-controls">
      <button type="button" class="atlas-tool-action" data-atlas-marker-add aria-pressed="false">Přidat značku</button>
     </div>
     <div class="atlas-marker-editor" data-atlas-marker-editor hidden>
      <form data-atlas-marker-form>
       <h4 data-atlas-marker-form-title>Nová značka</h4>
       <label>Typ značky <select data-atlas-marker-type><option value="party">♟ Pozice družiny</option><option value="village">⌂ Vesnice</option><option value="camp">⚑ Tábor</option><option value="discovery">✦ Nález</option><option value="danger">! Nebezpečí</option><option value="other">● Jiné</option></select></label>
       <label data-atlas-marker-name-wrap>Název značky (volitelné) <input data-atlas-marker-name type="text" maxlength="90" autocomplete="off" placeholder="Např. Opuštěná vesnice"></label>
       <label data-atlas-marker-description-wrap>Popisek <textarea data-atlas-marker-description maxlength="1000" rows="4" placeholder="Co družina na tomto místě objevila…"></textarea></label>
       <div class="atlas-marker-form-actions"><button type="submit">Uložit značku</button><button type="button" data-atlas-marker-cancel>Zrušit</button></div>
      </form>
     </div>
     <details class="atlas-marker-index"><summary>Značky na této mapě (<span data-atlas-marker-count>0</span>)</summary>
      <div class="atlas-marker-list" data-atlas-marker-list aria-label="Seznam značek na aktuální mapě"></div>
     </details>
     <p class="atlas-marker-save-note">Značky jsou součástí společného JSON kampaně. Pro úpravu nebo smazání přejděte přímo na značku na mapě.</p>
    </section></details>
    ${atlasCartographyPanel()}
   </aside>
  </div>
 </section>`;
}

/** Bind per-view ephemeral controls; only Atlas DOM is replaced when K5 opens. */
export function mountAtlasView(root,persistence=null){
 // The application owns persistence. Atlas never receives the GitHub token and
 // cannot write its own unguarded JSON; it uses the existing CAS/cloud writer.
 if(persistence&&typeof persistence.read==='function'&&typeof persistence.write==='function')markerPersistence=persistence;
 const workspace=root.querySelector('.atlas-workspace');
 const viewport=workspace?.querySelector('[data-atlas-viewport]');
 if(!workspace||!viewport)return;
 const mapId=workspace.dataset.atlasMap;
 const map=MAPS[mapId]||OVERVIEW;
 const overview=map.id==='overview';
 const stage=workspace.querySelector('[data-atlas-stage]');
 const zoomLabel=workspace.querySelector('[data-atlas-zoom]');
 const scaleLine=workspace.querySelector('[data-atlas-scale-line]');
 const scaleLabel=workspace.querySelector('[data-atlas-scale-label]');
 const status=workspace.querySelector('[data-atlas-status]');
 const overlay=workspace.querySelector('[data-atlas-measure-overlay]');
 const measureToggle=workspace.querySelector('[data-atlas-measure-toggle]');
 const measureReset=workspace.querySelector('[data-atlas-measure-reset]');
 const measureUndo=workspace.querySelector('[data-atlas-measure-undo]');
 const measureHelp=workspace.querySelector('[data-atlas-measure-help]');
 const measureResult=workspace.querySelector('[data-atlas-measure-result]');
 const measureKm=workspace.querySelector('[data-atlas-measure-km]');
 const measureMeters=workspace.querySelector('[data-atlas-measure-m]');
 const measureLeagues=workspace.querySelector('[data-atlas-measure-leagues]');
 const measureCount=workspace.querySelector('[data-atlas-measure-count]');
 const measureSegmentList=workspace.querySelector('[data-atlas-measure-segment-list]');
 loadAtlasMarkers();
 const measurement=measurementsByMap[map.id];
 const mapMarkers=markersByMap[map.id];
 const customMarkerOverlay=workspace.querySelector('[data-atlas-custom-marker-overlay]');
 const markerAdd=workspace.querySelector('[data-atlas-marker-add]');
 const markerParty=workspace.querySelector('[data-atlas-marker-party]');
 const markerList=workspace.querySelector('[data-atlas-marker-list]');
 const markerCount=workspace.querySelector('[data-atlas-marker-count]');
 const markerEditor=workspace.querySelector('[data-atlas-marker-editor]');
 const markerForm=workspace.querySelector('[data-atlas-marker-form]');
 const markerFormTitle=workspace.querySelector('[data-atlas-marker-form-title]');
 const markerName=workspace.querySelector('[data-atlas-marker-name]');
 const markerType=workspace.querySelector('[data-atlas-marker-type]');
 const markerDescription=workspace.querySelector('[data-atlas-marker-description]');
 const markerNameWrap=workspace.querySelector('[data-atlas-marker-name-wrap]');
 const markerDescriptionWrap=workspace.querySelector('[data-atlas-marker-description-wrap]');
 let pendingMarkerEvents=[];
 const markerNodes=new Map(),markerButtons=new Map();
 let markerPlacement=false,markerPlacementType='village',markerDraft=null,editingMarkerId=null,selectedMarkerId=null;
 let markerDrag=null,suppressMarkerClick=null;
 let atlasCarto=null,cartoPointer=null,restoringMarkerUndo=false;
 const frameW=map.width+map.margin,frameH=map.height+map.margin;
 const pdfLayer=workspace.querySelector('[data-atlas-pdf-layer]');
 let pdfLoading=null, pdfRenderTask=null, pdfRenderTimer=null, pdfEpoch=0, pdfDisposed=false;
 const state={...rememberedByMap[map.id]};
 let fitZoom=1;
 let drag=null;
 let ignoreClick=false;
 const activeTouches=new Map();
 let pinch=null;
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const size=()=>({w:viewport.clientWidth,h:viewport.clientHeight});
 const bounds=()=>{
  const {w,h}=size(),ww=frameW*state.zoom,hh=frameH*state.zoom;
  const limitX=ww<=w?[(w-ww)/2,(w-ww)/2]:[w-ww,0];
  const limitY=hh<=h?[(h-hh)/2,(h-hh)/2]:[h-hh,0];
  state.x=clamp(state.x,...limitX);
  state.y=clamp(state.y,...limitY);
 };
 const remember=()=>{rememberedByMap[map.id]={zoom:state.zoom,x:state.x,y:state.y,initialized:true};};
 const screenPoint=p=>({x:state.x+(map.margin+p.x)*state.zoom,y:state.y+(map.margin+p.y)*state.zoom});
 const inMap=(clientX,clientY)=>{
  const rect=viewport.getBoundingClientRect();
  const x=(clientX-rect.left-state.x)/state.zoom-map.margin;
  const y=(clientY-rect.top-state.y)/state.zoom-map.margin;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>=map.width||y<0||y>=map.height)return null;
  return {x,y};
 };
 const svgNS='http://www.w3.org/2000/svg';
 const svgAdd=(parent,name,attrs,caption)=>{
  const el=document.createElementNS(svgNS,name);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  if(caption!==undefined)el.textContent=caption;
  parent.appendChild(el);return el;
 };
 const linePath=overlay.querySelector('[data-atlas-measure-line]');
 const outlinePath=overlay.querySelector('[data-atlas-measure-outline]');
 const segmentLayer=overlay.querySelector('[data-atlas-measure-segments]');
 const markerLayer=overlay.querySelector('[data-atlas-measure-markers]');
 const paintMeasurement=()=>{
  const pts=measurement.points;
  const positions=pts.map(screenPoint);
  const {segments,totalKm}=atlasRouteDistancesKm(map.id,pts);
  viewport.classList.toggle('is-measuring',measurement.active);
  measureToggle.setAttribute('aria-pressed',String(measurement.active));
  measureToggle.textContent=measurement.active?'Ukončit měření':'Zapnout měření';
  measureReset.disabled=pts.length===0;
  measureUndo.disabled=pts.length===0;
  measureHelp.textContent=measurement.active
   ?(pts.length===0?'Kliknutím na mapu označte bod A. Tažením můžete mapu posouvat.':`Bod ${pointLabel(pts.length-1)} je označen. Klikněte na další místo (${pointLabel(pts.length)}). Libovolný počet bodů, ukončení tlačítkem nahoře.`)
   :'';
  measureHelp.hidden=!measureHelp.textContent;
  markerLayer.replaceChildren();segmentLayer.replaceChildren();
  if(pts.length>=2){
   const path=positions.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
   for(const el of [linePath,outlinePath]){el.setAttribute('d',path);el.setAttribute('visibility','visible');}
   segments.forEach((km,i)=>{
    const a=positions[i],b=positions[i+1];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len<.001)return;
    // Labels remain readable in SCREEN pixels; the actual distances stay in MAP coordinates.
    const offset=16*(i%2===0?-1:1);
    const midX=(a.x+b.x)/2-(dy/len)*offset;
    const midY=(a.y+b.y)/2+(dx/len)*offset;
    const label=formatSegment(km),w=Math.max(47,label.length*7.1+16);
    const group=svgAdd(segmentLayer,'g',{'class':'atlas-measure-segment-label',transform:`translate(${midX.toFixed(2)},${midY.toFixed(2)})`});
    svgAdd(group,'rect',{x:-w/2,y:-12,width:w,height:24,rx:5,ry:5});
    svgAdd(group,'text',{'text-anchor':'middle',dy:'4.5'},label);
   });
   measureKm.textContent=`${formatDistance(totalKm)} km`;
   measureMeters.textContent=`${Math.round(totalKm*1000).toLocaleString('cs-CZ')} m`;
   measureLeagues.textContent=`${formatDistance(totalKm/LEAGUE_KM)} hârnických lig`;
   measureCount.textContent=`Úseky trasy (${segments.length})`;
   measureSegmentList.replaceChildren();
   segments.forEach((km,i)=>{
    const item=document.createElement('li');
    const labels=document.createElement('span');labels.textContent=`${pointLabel(i)} → ${pointLabel(i+1)}`;
    const distance=document.createElement('strong');distance.textContent=formatSegment(km);
    item.append(labels,distance);measureSegmentList.appendChild(item);
   });
   measureResult.hidden=false;
  }else{
   linePath.setAttribute('visibility','hidden');outlinePath.setAttribute('visibility','hidden');
   measureResult.hidden=true;measureSegmentList.replaceChildren();
  }
  positions.forEach((pos,i)=>{
   const label=pointLabel(i),r=Math.max(10,label.length*4+7);
   const group=svgAdd(markerLayer,'g',{'class':'atlas-measure-point',transform:`translate(${pos.x.toFixed(2)},${pos.y.toFixed(2)})`});
   svgAdd(group,'circle',{'class':'atlas-measure-marker-halo',r:r+3});
   svgAdd(group,'circle',{'class':i===0?'atlas-measure-marker-a':'atlas-measure-marker-b',r});
   svgAdd(group,'text',{'text-anchor':'middle',dy:'4.4'},label);
  });
 };
 const recordPoint=(clientX,clientY)=>{
  if(!measurement.active)return false;
  const pt=inMap(clientX,clientY);
  if(!pt){status.textContent='Bod musí být umístěný uvnitř mapy.';return true;}
  measurement.points.push(pt);
  paintMeasurement();
  if(measurement.points.length>=2){
   const {totalKm}=atlasRouteDistancesKm(map.id,measurement.points);
   status.textContent=`Trasa má ${measurement.points.length} bodů a ${measurement.points.length-1} úseků: celkem ${formatDistance(totalKm)} km. Kliknutím přidáte další bod.`;
  }else status.textContent='Bod A je označen. Klikněte na další místo B.';
  return true;
 };
 // Slightly larger at all zoom levels while remaining proportional to the map.
 // Keep a generously sized invisible touch target even for tiny visual pins.
 const markerScale=()=>clamp(.565*Math.sqrt(state.zoom),.31,1.05);
 const refreshMarkerAdd=()=>{
  const partyActive=markerPlacement&&markerPlacementType==='party';
  const genericActive=markerPlacement&&!partyActive;
  markerAdd.textContent=genericActive?'Zrušit umístění':'Přidat značku';
  // This button always identifies/navigates to the party; it is not a 'delete position' toggle.
  markerParty.textContent='Pozice družiny';
  markerParty.disabled=!mapMarkers.some(item=>item.type==='party');
  markerParty.title=markerParty.disabled?'Nejdříve vytvořte značku typu Pozice družiny přes Přidat značku.':'Zobrazit pozici družiny';
  markerAdd.setAttribute('aria-pressed',String(genericActive));
  markerParty.setAttribute('aria-pressed',String(partyActive));
  viewport.classList.toggle('is-marking',markerPlacement);
 };
 const closeMarkerEditor=()=>{
  markerDraft=null;editingMarkerId=null;pendingMarkerEvents=[];markerEditor.hidden=true;markerForm.reset();
  paintCustomMarkers(); // Remove an unsaved preview immediately on cancel/save.
 };
 const syncMarkerFormType=()=>{
  // Name and description are always optional, even for the party icon.
  markerNameWrap.hidden=false;markerDescriptionWrap.hidden=false;
  markerName.required=false;
  paintCustomMarkers(); // The preview icon changes instantly when its type changes.
 };
 markerType.addEventListener('change',syncMarkerFormType);
 const paintCustomMarkers=()=>{
  const present=new Set(mapMarkers.map(item=>item.id));
  for(const [id,node] of markerNodes){if(!present.has(id)){node.remove();markerNodes.delete(id);for(const btn of markerButtons.get(id)||[])btn.remove();markerButtons.delete(id);}}
  for(const item of mapMarkers){
   let node=markerNodes.get(item.id);
   if(!node){
    node=document.createElement('button');node.type='button';node.className='atlas-custom-marker';
    node.dataset.atlasMarker=item.id;
    const pin=document.createElement('span');pin.className='atlas-custom-pin';
    const symbol=document.createElement('span');symbol.className='atlas-custom-symbol';pin.appendChild(symbol);
    const bubble=document.createElement('span');bubble.className='atlas-marker-tooltip';
    const title=document.createElement('strong');title.className='atlas-marker-tooltip-title';
    const details=document.createElement('span');details.className='atlas-marker-tooltip-description';
    bubble.append(title,details);node.append(pin,bubble);
    customMarkerOverlay.appendChild(node);markerNodes.set(item.id,node);
    const modify=document.createElement('button');modify.type='button';modify.className='atlas-marker-map-action atlas-marker-map-edit';modify.textContent='✎';modify.title='Upravit značku';modify.setAttribute('aria-label','Upravit značku');modify.dataset.atlasMarkerEditId=item.id;
    const deleteBtn=document.createElement('button');deleteBtn.type='button';deleteBtn.className='atlas-marker-map-action atlas-marker-map-delete';deleteBtn.textContent='×';deleteBtn.title='Smazat značku';deleteBtn.setAttribute('aria-label','Smazat značku');deleteBtn.dataset.atlasMarkerDeleteId=item.id;
    customMarkerOverlay.append(modify,deleteBtn);markerButtons.set(item.id,[modify,deleteBtn]);
   }
   const pos=screenPoint(item.type==='party'?(atlasCarto?.partyPreview()||item):item);
   node.style.left=`${pos.x}px`;node.style.top=`${pos.y}px`;
   // Actions are BELOW the pin, never above it where the text balloon opens.
   const controls=markerButtons.get(item.id);if(controls){controls[0].style.left=`${pos.x-17}px`;controls[0].style.top=`${pos.y+27}px`;controls[1].style.left=`${pos.x+17}px`;controls[1].style.top=`${pos.y+27}px`;}
   // When relocating a party icon, show the draft in the new location until Save.
   node.style.visibility=editingMarkerId===item.id&&markerDraft?'hidden':'';
   const selected=item.id===selectedMarkerId;
   const iconZoom=markerScale();
   node.style.setProperty('--atlas-pin-scale',String(iconZoom));
   node.style.setProperty('--atlas-pin-selected-scale',String(iconZoom*1.12));
   node.style.setProperty('--atlas-hit-size',`${Math.max(24,Math.round(iconZoom*35))}px`);
   node.classList.toggle('is-party',item.type==='party');
   node.classList.toggle('is-selected',selected);
   node.classList.toggle('is-dragging',markerDrag?.id===item.id&&markerDrag.moved);
   node.setAttribute('aria-expanded',String(selected));
   node.setAttribute('aria-pressed',String(selected));
   node.setAttribute('aria-label',`${MARKER_TYPES[item.type].label}: ${markerDisplayName(item)}${item.description?' – '+item.description:''}`);
   node.querySelector('.atlas-custom-symbol').textContent=MARKER_TYPES[item.type].symbol;
   node.querySelector('.atlas-marker-tooltip-title').textContent=markerDisplayName(item);
   // Legacy event entries are preserved in stored JSON; only their freeform notes
   // remain visible. The event/date editor has been removed from the Atlas UI.
   const oldNotes=(item.events||[]).map(ev=>ev.note||'').filter(Boolean);
   const pointNote=item.type==='party'?atlasCarto?.partyLastNote():'';
   const tooltipText=[item.description,...oldNotes,pointNote].filter(Boolean).join('\n');
   node.querySelector('.atlas-marker-tooltip-description').textContent=tooltipText;
   node.querySelector('.atlas-marker-tooltip-description').hidden=!tooltipText;
   const tipShift=pos.x<125?125-pos.x:pos.x>viewport.clientWidth-125?viewport.clientWidth-125-pos.x:0;
   node.style.setProperty('--atlas-tip-shift',`${tipShift}px`);
  }
  // An unsubmitted marker has its own temporary visual pin. It is NOT stored
  // or listed until Save; cancelling removes it without a trace.
  let draftNode=customMarkerOverlay.querySelector('[data-atlas-marker-draft]');
  if(markerDraft){
   if(!draftNode){
    draftNode=document.createElement('div');
    draftNode.className='atlas-custom-marker atlas-custom-marker--draft';
    draftNode.setAttribute('data-atlas-marker-draft','');
    draftNode.setAttribute('aria-hidden','true');
    const draftPin=document.createElement('span');draftPin.className='atlas-custom-pin';
    const draftSymbol=document.createElement('span');draftSymbol.className='atlas-custom-symbol';
    draftPin.appendChild(draftSymbol);draftNode.appendChild(draftPin);
    customMarkerOverlay.appendChild(draftNode);
   }
   const pos=screenPoint(markerDraft);
   draftNode.style.left=`${pos.x}px`;draftNode.style.top=`${pos.y}px`;
   const iconZoom=markerScale();
   draftNode.style.setProperty('--atlas-pin-scale',String(iconZoom));
   draftNode.style.setProperty('--atlas-hit-size',`${Math.max(24,Math.round(iconZoom*35))}px`);
   draftNode.querySelector('.atlas-custom-symbol').textContent=MARKER_TYPES[markerType.value]?.symbol||MARKER_TYPES.other.symbol;
  }else draftNode?.remove();
 };
 const renderMarkerList=()=>{
  const openGroups=new Set([...markerList.querySelectorAll('.atlas-marker-type-group[open]')].map(group=>group.dataset.atlasMarkerGroup));
  const listed=mapMarkers.filter(item=>item.type!=='party');
  markerCount.textContent=String(listed.length);
  markerList.replaceChildren();
  if(!listed.length){
   const empty=document.createElement('p');empty.className='atlas-marker-empty';
   empty.textContent='Zatím nemáte na této mapě žádné značky.';markerList.appendChild(empty);return;
  }
  // Type-by-type collapsible index. Preserve which groups the GM has opened
  // when a marker is selected or renamed, instead of folding them on every rerender.
  for(const [type,kind] of Object.entries(MARKER_TYPES)){
   if(type==='party')continue; // Party has its own button in the map toolbar.
   const items=listed.filter(item=>item.type===type);
   if(!items.length)continue;
   const group=document.createElement('details');group.className='atlas-marker-type-group';group.dataset.atlasMarkerGroup=type;
   group.open=openGroups.has(type);
   const heading=document.createElement('summary');heading.textContent=`${kind.symbol} ${kind.label} (${items.length})`;
   group.append(heading);
   const entries=document.createElement('div');entries.className='atlas-marker-type-entries';
   for(const item of items){
    const row=document.createElement('div');row.className='atlas-marker-row';row.classList.toggle('is-selected',item.id===selectedMarkerId);
    const nameBtn=document.createElement('button');nameBtn.type='button';nameBtn.className='atlas-marker-list-select';
    nameBtn.dataset.atlasMarkerSelect=item.id;
    nameBtn.textContent=markerDisplayName(item);
    nameBtn.title='Přejít na značku (107 %)';
    row.append(nameBtn);entries.append(row);
   }
   group.append(entries);markerList.append(group);
  }
 };
 const clearMarkerSelection=()=>{
  if(selectedMarkerId===null)return;
  selectedMarkerId=null;revealMarkerActions(null);paintCustomMarkers();renderMarkerList();
 };
 const selectMarker=(id,centerOnMarker=true)=>{
  const item=mapMarkers.find(entry=>entry.id===id);if(!item)return;
  // The list action ALWAYS navigates to the icon at exactly 107% absolute zoom.
  // Clicking an icon on the map still toggles its highlight/description.
  selectedMarkerId=centerOnMarker?id:(selectedMarkerId===id?null:id);
  if(selectedMarkerId&&centerOnMarker){
   state.zoom=1.07;
   state.x=viewport.clientWidth/2-(map.margin+item.x)*state.zoom;
   state.y=viewport.clientHeight/2-(map.margin+item.y)*state.zoom;
  }
  repaint();renderMarkerList();revealMarkerActions(selectedMarkerId);
  status.textContent=selectedMarkerId?`Značka „${markerDisplayName(item)}“ je vybrána.`:'Popisek značky byl zavřen.';
 };
 const openMarkerEditor=(item,position)=>{
  markerPlacement=false;refreshMarkerAdd();
  editingMarkerId=item?.id||null;markerDraft=position||null;
  markerFormTitle.textContent=item?'Upravit značku':'Nová značka';
  markerName.value=item?.name||'';
  markerType.value=item?.type||markerPlacementType;
  markerDescription.value=item?.description||'';
  pendingMarkerEvents=structuredClone(item?.events||[]);
  // The party shortcut now lives in the map toolbar: reveal its editor in the folded sidebar.
  markerEditor.closest('.atlas-tool-fold').open=true;
  markerEditor.hidden=false;
  syncMarkerFormType();
  markerType.focus({preventScroll:true});
 };
 const toggleMarkerPlacement=type=>{
  if(markerPlacement&&markerPlacementType===type){
   markerPlacement=false;closeMarkerEditor();status.textContent='Umísťování značky bylo zrušeno.';
  }else{
   if(atlasCarto?.stop()===false)return;measurement.active=false;measurement.points=[];paintMeasurement();closeMarkerEditor();
   clearMarkerSelection();markerPlacement=true;markerPlacementType=type;
   status.textContent=type==='party'?'Klikněte do mapy a umístěte pozici družiny.':'Klikněte do mapy, kam chcete přidat značku.';
  }
  refreshMarkerAdd();
 };
 markerAdd.addEventListener('click',()=>toggleMarkerPlacement('village'));
 markerParty.addEventListener('click',()=>{
  if(atlasCarto?.mode==='party-edit'){workspace.querySelector('[data-carto-party-section]').open=true;return;}
  const party=mapMarkers.find(item=>item.type==='party');
  if(party){
   if(atlasCarto?.stop()===false)return;measurement.active=false;measurement.points=[];paintMeasurement();
   markerPlacement=false;closeMarkerEditor();refreshMarkerAdd();
   selectMarker(party.id,true);
   status.textContent='Pozice družiny je zobrazena. Chcete-li ji přesunout, přetáhněte značku na mapě a změny uložte klávesou Esc.';
  }
 });
 const placePartyPosition=position=>{
  if(!position)return;
  // One party marker per map. While editing, the existing one is untouched.
  const previous=mapMarkers.find(item=>item.type==='party')||null;
  if(!previous&&mapMarkers.length>=250){status.textContent='Na jednu mapu lze uložit nejvýše 250 značek.';return;}
  openMarkerEditor(previous,position);
  status.textContent='Pozice družiny je připravena. Název i popisek můžete nechat prázdné; dokončete tlačítkem Uložit značku.';
 };
 workspace.querySelector('[data-atlas-marker-cancel]').addEventListener('click',()=>{
  closeMarkerEditor();markerPlacement=false;refreshMarkerAdd();
 });
 markerForm.addEventListener('submit',e=>{
  e.preventDefault();
  const type=markerType.value;
  const name=markerName.value.trim();
  if(!editingMarkerId&&!markerDraft){status.textContent='Nejprve vyberte místo značky na mapě.';return;}
  if(!editingMarkerId&&mapMarkers.length>=250){status.textContent='Na jednu mapu lze uložit nejvýše 250 značek.';return;}
  const existing=editingMarkerId?mapMarkers.find(item=>item.id===editingMarkerId):null;
  if(editingMarkerId&&!existing)return;
  if(type==='party'&&mapMarkers.some(item=>item.type==='party'&&item.id!==existing?.id)){
   status.textContent='Na mapě už je pozice družiny. Zvolte její tlačítko pro úpravu nebo přemístění.';return;
  }
  const position=markerDraft||existing;
  const id=existing?.id||`m-${Date.now().toString(36)}-${(++markerSequence).toString(36)}`;
  const marker=cleanMarker({id,x:position.x,y:position.y,name,description:markerDescription.value,type,events:pendingMarkerEvents},map);
  if(!marker)return;
  if(existing)Object.assign(existing,marker);else mapMarkers.push(marker);
  // Creating or editing never auto-opens a tooltip or leaves a yellow halo.
  selectedMarkerId=null;
  closeMarkerEditor();
  markerNodes.get(marker.id)?.remove();markerNodes.delete(marker.id);for(const btn of markerButtons.get(marker.id)||[])btn.remove();markerButtons.delete(marker.id);
  const saved=saveAtlasMarkers();paintCustomMarkers();renderMarkerList();refreshMarkerAdd();atlasCarto?.refreshParty();
  status.textContent=`Značka „${markerDisplayName(marker)}“ ${existing?'byla upravena':'byla přidána'}.${saved?'':' Zápis do společné kampaně se nezdařil; změna byla vrácena.'}`;
 });
 const removeMarker=id=>{
  const index=mapMarkers.findIndex(entry=>entry.id===id);if(index<0)return;
  const item=mapMarkers[index];mapMarkers.splice(index,1);
  if(selectedMarkerId===id)selectedMarkerId=null;
  if(editingMarkerId===id)closeMarkerEditor();
  const saved=saveAtlasMarkers();paintCustomMarkers();renderMarkerList();refreshMarkerAdd();atlasCarto?.refreshParty();
  status.textContent=`Značka „${markerDisplayName(item)}“ ${saved?'byla odstraněna.':'nebyla odstraněna; cloudový zápis byl odmítnut.'}`;
 };
 markerList.addEventListener('click',e=>{
  const selectId=e.target.closest('[data-atlas-marker-select]')?.dataset.atlasMarkerSelect;
  if(selectId)selectMarker(selectId);
 });
 customMarkerOverlay.addEventListener('pointerdown',e=>{
  if(e.target.closest('[data-atlas-marker-edit-id],[data-atlas-marker-delete-id]'))e.stopPropagation();
 });
 customMarkerOverlay.addEventListener('click',e=>{
  const editId=e.target.closest('[data-atlas-marker-edit-id]')?.dataset.atlasMarkerEditId;
  const removeId=e.target.closest('[data-atlas-marker-delete-id]')?.dataset.atlasMarkerDeleteId;
  if(editId){e.stopPropagation();const item=mapMarkers.find(x=>x.id===editId);if(item){clearMarkerSelection();openMarkerEditor(item);}return;}
  if(removeId){e.stopPropagation();const item=mapMarkers.find(x=>x.id===removeId);if(item&&window.confirm(`Opravdu odstranit značku „${markerDisplayName(item)}“${item.type==='party'?' i celou historii jejího pohybu na této mapě':''}?`))removeMarker(removeId);}
 });
 // The edit/delete pair opens ONLY after clicking the pin (or navigating to
 // it from the type index). Hovering cannot open it. Esc closes the selection.
 let markerActionTimer=null;
 const revealMarkerActions=id=>{for(const [key,buttons] of markerButtons)buttons.forEach(btn=>btn.classList.toggle('atlas-marker-action-visible',key===id));};
 // Marker pointer capture is independent from the map's pan gesture.
 // Drag directly: no 'move' mode, no confirmation, save at pointer release.
 customMarkerOverlay.addEventListener('pointerdown',e=>{
  const node=e.target.closest('[data-atlas-marker]');
  if(pinch||activeTouches.size>1||!node||e.button!==0||measurement.active||markerPlacement||atlasCarto?.active)return;
  const item=mapMarkers.find(entry=>entry.id===node.dataset.atlasMarker);if(!item)return;
  e.stopPropagation();e.preventDefault();
  markerDrag={id:item.id,pointerId:e.pointerId,node,startX:e.clientX,startY:e.clientY,
   x:item.x,y:item.y,moved:false};
  node.setPointerCapture(e.pointerId);
 });
 customMarkerOverlay.addEventListener('pointermove',e=>{
  if(pinch||!markerDrag||markerDrag.pointerId!==e.pointerId)return;
  e.stopPropagation();
  const dx=e.clientX-markerDrag.startX,dy=e.clientY-markerDrag.startY;
  if(!markerDrag.moved&&Math.hypot(dx,dy)<4)return;
  if(!markerDrag.moved){markerDrag.moved=true;clearMarkerSelection();}
  const item=mapMarkers.find(entry=>entry.id===markerDrag.id);if(!item)return;
  item.x=clamp(markerDrag.x+dx/state.zoom,0,map.width-.01);
  item.y=clamp(markerDrag.y+dy/state.zoom,0,map.height-.01);
  paintCustomMarkers();
 });
 const finishMarkerDrag=(e,cancel=false)=>{
  if(!markerDrag||markerDrag.pointerId!==e.pointerId)return;
  e.stopPropagation();
  const gesture=markerDrag;markerDrag=null;
  if(gesture.node.hasPointerCapture(e.pointerId))gesture.node.releasePointerCapture(e.pointerId);
  if(gesture.moved){
   const item=mapMarkers.find(entry=>entry.id===gesture.id);
   if(item){
    if(cancel){item.x=gesture.x;item.y=gesture.y;}
    else{
     suppressMarkerClick={id:gesture.id,at:Date.now()};
     if(item.type==='party'){
      const point={x:item.x,y:item.y};item.x=gesture.x;item.y=gesture.y;
      atlasCarto?.startPartyMove(point);paintCustomMarkers();renderMarkerList();return;
     }
     const saved=saveAtlasMarkers();
     status.textContent=`Značka „${markerDisplayName(item)}“ byla přemístěna.${saved?'':' Zápis do společné kampaně se nezdařil; původní poloha byla obnovena.'}`;
    }
   }
   paintCustomMarkers();renderMarkerList();
  }
 };
 customMarkerOverlay.addEventListener('pointerup',e=>finishMarkerDrag(e));
 customMarkerOverlay.addEventListener('pointercancel',e=>finishMarkerDrag(e,true));
 customMarkerOverlay.addEventListener('click',e=>{
  const pin=e.target.closest('[data-atlas-marker]');if(!pin||measurement.active||markerPlacement||atlasCarto?.active)return;
  e.stopPropagation();
  if(suppressMarkerClick?.id===pin.dataset.atlasMarker&&Date.now()-suppressMarkerClick.at<500){
   suppressMarkerClick=null;return;
  }
  suppressMarkerClick=null;selectMarker(pin.dataset.atlasMarker,false);
 });
 renderMarkerList();refreshMarkerAdd();
 measureToggle.addEventListener('click',()=>{
  if(measurement.active){
   measurement.active=false;measurement.points=[];paintMeasurement();
   status.textContent='Měření ukončeno. Body, spojnice i vzdálenosti byly odstraněny.';
  }else{
   if(atlasCarto?.stop()===false)return;closeMarkerEditor();markerPlacement=false;refreshMarkerAdd();
   measurement.points=[];measurement.active=true;paintMeasurement();
   status.textContent='Měření trasy: kliknutím do mapy označte bod A.';
  }
 });
 measureReset.addEventListener('click',()=>{
  measurement.points=[];measurement.active=true;paintMeasurement();
  status.textContent='Nové měření: označte na mapě bod A.';
 });
 measureUndo.addEventListener('click',()=>{
  const removed=measurement.points.pop();if(!removed)return;
  paintMeasurement();status.textContent=`Poslední bod byl odebrán. Nyní je na mapě ${measurement.points.length} bodů.`;
 });

 // K5: draw only the visible PDF rectangle (+overscan), not a giant canvas.
 // PDF.js keeps the original vector paths and font glyphs, so new zoom levels
 // are independently rasterized at the actual screen pixel density.
 const loadPdf=()=>{
  if(!pdfLoading){
   pdfLoading=(async()=>{
    const pdfjs=await import(PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    const task=pdfjs.getDocument({url:new URL(map.pdf,document.baseURI).href, isEvalSupported:false, useSystemFonts:true});
    const doc=await task.promise;
    const page=await doc.getPage(1);
    return {task,doc,page};
   })();
  }
  return pdfLoading;
 };
 const releasePdf=()=>{
  pdfDisposed=true;
  ++pdfEpoch;
  if(pdfRenderTimer!==null){clearTimeout(pdfRenderTimer);pdfRenderTimer=null;}
  try{pdfRenderTask?.cancel();}catch(_){}
  if(pdfLoading)pdfLoading.then(({doc})=>doc.destroy()).catch(()=>{});
 };
 const drawPdf=async epoch=>{
  if(!pdfLayer||pdfDisposed||!pdfLayer.isConnected)return;
  let loaded;
  try{loaded=await loadPdf();}
  catch(error){
   if(epoch===pdfEpoch&&!pdfDisposed){
    const failure=`K5 PDF nelze načíst: ${error?.message||error}. Zkontrolujte soubor assets/atlas/k5-detail-map.pdf a přístup k PDF.js.`;
    status.textContent=failure;
    pdfLayer.querySelector('[data-atlas-pdf-loading]')?.replaceChildren(document.createTextNode('Nelze načíst PDF mapu K5.'));
   }
   return;
  }
  if(epoch!==pdfEpoch||pdfDisposed||!pdfLayer.isConnected)return;
  const {page}=loaded, pixelRatio=Math.min(window.devicePixelRatio||1,2);
  // Rectangle of the original map which is currently on screen.
  const overscan=100;
  const x0=clamp((-state.x-overscan)/state.zoom,0,map.width);
  const y0=clamp((-state.y-overscan)/state.zoom,0,map.height);
  const x1=clamp((viewport.clientWidth-state.x+overscan)/state.zoom,0,map.width);
  const y1=clamp((viewport.clientHeight-state.y+overscan)/state.zoom,0,map.height);
  if(x1<=x0||y1<=y0)return;
  const surfaceW=Math.ceil((x1-x0)*state.zoom*pixelRatio);
  const surfaceH=Math.ceil((y1-y0)*state.zoom*pixelRatio);
  const canvas=document.createElement('canvas');
  canvas.width=surfaceW;canvas.height=surfaceH;
  canvas.className='atlas-pdf-canvas';
  canvas.style.left=`${x0}px`;canvas.style.top=`${y0}px`;
  canvas.style.width=`${x1-x0}px`;canvas.style.height=`${y1-y0}px`;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  // Source PDF is already rotated to landscape in page.getViewport().
  const pxPerPdfPt=map.width/map.pdfCrop.w;
  const pdfScale=pxPerPdfPt*state.zoom*pixelRatio;
  const pdfViewport=page.getViewport({scale:pdfScale});
  const xOffset=map.pdfCrop.x*pdfScale+x0*state.zoom*pixelRatio;
  const yOffset=map.pdfCrop.y*pdfScale+y0*state.zoom*pixelRatio;
  try{
   pdfRenderTask?.cancel();
  }catch(_){}
  try{
   // Rendering into a NEW canvas avoids conflicts with a cancelled task.
   const task=page.render({canvasContext:ctx,viewport:pdfViewport,
    transform:[1,0,0,1,-xOffset,-yOffset],background:'#f2e7ca'});
   pdfRenderTask=task;
   await task.promise;
   if(epoch!==pdfEpoch||pdfDisposed||!pdfLayer.isConnected)return;
   pdfLayer.querySelectorAll('.atlas-pdf-canvas').forEach(old=>old.remove());
   pdfLayer.appendChild(canvas);
   pdfLayer.querySelector('[data-atlas-pdf-loading]')?.remove();
  }catch(error){
   if(error?.name!=='RenderingCancelledException'&&epoch===pdfEpoch&&!pdfDisposed){
    status.textContent=`PDF K5 nelze vykreslit: ${error?.message||error}`;
   }
  }
 };
 const schedulePdf=(delay=170)=>{
  if(!pdfLayer||pdfDisposed)return;
  const epoch=++pdfEpoch;
  if(pdfRenderTimer!==null)clearTimeout(pdfRenderTimer);
  pdfRenderTimer=setTimeout(()=>{pdfRenderTimer=null;void drawPdf(epoch);},delay);
 };
 const repaint=()=>{
  bounds();
  stage.style.transform=`translate3d(${state.x}px,${state.y}px,0) scale(${state.zoom})`;
  zoomLabel.textContent=`${Math.round(state.zoom*100)} %`;
  const pixelPerKm=map.pixelsPerKm*state.zoom;
  // Choose a real source-scaled length; never let CSS clamp the bar to a misleading length.
  const scales=[.005,.01,.02,.05,.1,.2,.5,1,2,5,10,20,50,100,200,500,1000,2000,5000];
  const maxWidth=Math.max(32,Math.min(165,viewport.clientWidth*.43));
  const candidates=scales.filter(km=>km*pixelPerKm<=maxWidth);
  const labelKm=(candidates.length?candidates:scales).reduce((best,km)=>Math.abs(km*pixelPerKm-Math.min(120,maxWidth))<Math.abs(best*pixelPerKm-Math.min(120,maxWidth))?km:best);
  scaleLine.style.width=`${labelKm*pixelPerKm}px`;
  scaleLabel.textContent=labelKm<1?`≈ ${Math.round(labelKm*1000)} m`:`≈ ${labelKm} km`;
  paintMeasurement();
  paintCustomMarkers();
  atlasCarto?.repaint();
  remember();
  if(pdfLayer)schedulePdf();
 };
 const fullFit=()=>{
  const {w,h}=size();if(!w||!h)return;
  fitZoom=Math.min(w/frameW,h/frameH);
  state.zoom=fitZoom;
  state.x=(w-frameW*fitZoom)/2;
  state.y=(h-frameH*fitZoom)/2;
  repaint();
 };
 const zoomLimits=()=>[Math.max(.06,fitZoom*.7),Math.max(4,fitZoom*8)];
 const zoomAt=(next,cx,cy)=>{
  const rect=viewport.getBoundingClientRect(),px=cx-rect.left,py=cy-rect.top;
  const old=state.zoom;
  state.zoom=clamp(next,...zoomLimits());
  const ratio=state.zoom/old;
  state.x=px-(px-state.x)*ratio;
  state.y=py-(py-state.y)*ratio;
  repaint();
 };
 const center=()=>{const r=viewport.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];};
 const switchTo=(nextMap)=>{
  if(!MAPS[nextMap]||nextMap===currentMapId)return;
  if(atlasCarto?.mode==='party-edit'&&atlasCarto.stop()===false)return;
  // Switching maps ends measurement everywhere and removes all route graphics.
  // Permanent custom markers on each individual map are unaffected.
  for(const entry of Object.values(measurementsByMap)){entry.active=false;entry.points=[];}
  remember();
  if(pdfLayer)releasePdf();
  currentMapId=nextMap;
  workspace.outerHTML=atlasView();
  mountAtlasView(root);
  root.querySelector('[data-atlas-viewport]')?.focus({preventScroll:true});
 };
 const clickSector=id=>{
  const def=ATLAS_SECTORS.find(s=>s.id===id);if(!def||!overview)return;
  if(def.detailMap){switchTo(def.detailMap);return;}
  status.textContent=`Sektor ${id} zatím nemá připojenou detailní mapu. K dispozici je nyní K5.`;
 };
 workspace.querySelector('[data-atlas-back]')?.addEventListener('click',()=>switchTo('overview'));
 workspace.querySelectorAll('[data-atlas-control]').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.atlasControl==='fit')return fullFit();
  const [x,y]=center();zoomAt(state.zoom*(button.dataset.atlasControl==='plus'?1.25:.8),x,y);
 }));
 viewport.addEventListener('wheel',e=>{
  e.preventDefault();
  zoomAt(state.zoom*Math.exp(-clamp(e.deltaY,-350,350)*.00165),e.clientX,e.clientY);
 },{passive:false});
 viewport.addEventListener('dblclick',e=>{e.preventDefault();zoomAt(state.zoom*1.6,e.clientX,e.clientY);});
 // Real two-finger pinch-to-zoom and simultaneous pan around the gesture midpoint.
 // Capture phase also observes touches beginning on a marker. No touch may be
 // interpreted as adding a point/marking a sector after a pinch gesture.
 const startPinch=()=>{
  const [a,b]=[...activeTouches.values()].slice(0,2);
  if(!a||!b)return;
  const rect=viewport.getBoundingClientRect();
  const midX=(a.x+b.x)/2-rect.left,midY=(a.y+b.y)/2-rect.top;
  // Revert a tentative one-finger marker drag before switching to pinch.
  atlasCarto?.cancelGesture();cartoPointer=null;
  if(markerDrag){
   const item=mapMarkers.find(entry=>entry.id===markerDrag.id);
   if(item){item.x=markerDrag.x;item.y=markerDrag.y;}
   try{if(markerDrag.node.hasPointerCapture(markerDrag.pointerId))markerDrag.node.releasePointerCapture(markerDrag.pointerId);}catch(_){}
   markerDrag=null;paintCustomMarkers();
  }
  if(drag){
   try{if(viewport.hasPointerCapture(drag.id))viewport.releasePointerCapture(drag.id);}catch(_){}
   drag=null;viewport.classList.remove('is-dragging');
  }
  pinch={ids:[...activeTouches.keys()].slice(0,2),
   distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),zoom:state.zoom,
   anchorX:(midX-state.x)/state.zoom,anchorY:(midY-state.y)/state.zoom};
  for(const id of pinch.ids){try{viewport.setPointerCapture(id);}catch(_){}}
  ignoreClick=true;
 };
 viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activeTouches.size===2){startPinch();e.preventDefault();}
 },true);
 viewport.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||!activeTouches.has(e.pointerId))return;
  activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!pinch)return;
  const a=activeTouches.get(pinch.ids[0]),b=activeTouches.get(pinch.ids[1]);
  if(!a||!b)return;
  const rect=viewport.getBoundingClientRect();
  const midX=(a.x+b.x)/2-rect.left,midY=(a.y+b.y)/2-rect.top;
  const distance=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
  state.zoom=clamp(pinch.zoom*distance/pinch.distance,...zoomLimits());
  state.x=midX-pinch.anchorX*state.zoom;
  state.y=midY-pinch.anchorY*state.zoom;
  repaint();e.stopPropagation();e.preventDefault();
 },true);
 const finishTouch=e=>{
  if(e.pointerType!=='touch')return;
  if(pinch){ignoreClick=true;e.stopPropagation();}
  activeTouches.delete(e.pointerId);
  if(pinch&&(pinch.ids.includes(e.pointerId)||activeTouches.size<2)){
   pinch=null;
   if(pdfLayer)schedulePdf(30);
  }
 };
 viewport.addEventListener('pointerup',finishTouch,true);
 viewport.addEventListener('pointercancel',finishTouch,true);
 viewport.addEventListener('pointerdown',e=>{
  if(pinch||e.button!==0)return;
  let partyPan=false;
  if(atlasCarto?.active){
   if(e.pointerType==='touch'&&activeTouches.size>1)return;
   const claimed=atlasCarto.pointerStart(e);
   if(atlasCarto.mode==='party-edit'&&!claimed){
    // A tap may append a point; a drag pans instead, without changing the draft.
    partyPan=true;
   }else{
    cartoPointer=e.pointerId;
    try{viewport.setPointerCapture(e.pointerId);}catch(_){}
    return;
   }
  }
  if(!partyPan&&e.target.closest?.('[data-atlas-marker]'))return;
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,initialX:state.x,initialY:state.y,moved:false,partyPan};
  viewport.setPointerCapture(e.pointerId);
  viewport.classList.add('is-dragging');
 });
 viewport.addEventListener('pointermove',e=>{
  if(pinch)return;
  if(cartoPointer===e.pointerId){atlasCarto?.pointerMove(e);return;}
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(!drag.moved)return;
  state.x=drag.initialX+dx;state.y=drag.initialY+dy;repaint();
 });
 const endDrag=e=>{
  if(pinch)return;
  if(cartoPointer===e.pointerId){
   cartoPointer=null;
   if(['draw','arrow','radius','fog-reveal','fog-cover'].includes(atlasCarto?.mode))atlasCarto?.pointerEnd();
   else if(['edit-points','party-edit'].includes(atlasCarto?.mode)){if(!atlasCarto.pointerEnd())atlasCarto.handleClick(e.clientX,e.clientY);}
   else atlasCarto?.handleClick(e.clientX,e.clientY);
   if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
   return;
  }
  if(!drag||drag.id!==e.pointerId)return;
  const {moved:didMove,partyPan}=drag;
  drag=null;
  viewport.classList.remove('is-dragging');
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  if(didMove){ignoreClick=true;if(pdfLayer)schedulePdf(25);return;}
  if(partyPan){if(atlasCarto?.mode==='party-edit')atlasCarto.handleClick(e.clientX,e.clientY);return;}
  if(measurement.active){recordPoint(e.clientX,e.clientY);return;}
  clearMarkerSelection();
  if(markerPlacement){
   const pt=inMap(e.clientX,e.clientY);
   if(pt){if(markerPlacementType==='party')placePartyPosition(pt);else{openMarkerEditor(null,pt);status.textContent='Značka je připravena; název i popisek jsou volitelné.';}}
   else status.textContent='Vyberte místo uvnitř mapy.';
   return;
  }
  if(!overview)return;
  // Native click may be retargeted to viewport by pointer capture.
  const rect=viewport.getBoundingClientRect();
  const localX=(e.clientX-rect.left-state.x)/state.zoom-map.margin;
  const localY=(e.clientY-rect.top-state.y)/state.zoom-map.margin;
  if(localX<0||localX>=map.width||localY<0||localY>=map.height)return;
  const col=LETTERS[Math.floor(localX/map.width*4)];
  const row=ROWS[Math.floor(localY/map.height*4)];
  clickSector(col+row);
 };
 viewport.addEventListener('pointerup',endDrag);
 viewport.addEventListener('pointercancel',e=>{if(cartoPointer===e.pointerId){atlasCarto?.cancelGesture();cartoPointer=null;}if(drag&&drag.id===e.pointerId){drag=null;viewport.classList.remove('is-dragging');}});
 viewport.addEventListener('click',e=>{
  // Only keyboard/programmatic sector activation is handled here. Pointer
  // taps are resolved on pointerup; pinch must never block a later Enter.
  if(e.detail!==0){ignoreClick=false;return;}
  ignoreClick=false;
  const button=e.target.closest?.('[data-atlas-sector]');
  if(button)clickSector(button.dataset.atlasSector);
 });
 // Escape works anywhere inside the Atlas, not only with focus on the map.
 // It dismisses temporary UI without undoing completed/saved map movements.
 const escapeAtlas=()=>{
  let handled=false;
  const layers=workspace.querySelector('.atlas-toolbar-layers');
  if(layers?.open){layers.open=false;handled=true;}
  const markerIndex=workspace.querySelector('.atlas-marker-index');
  if(markerIndex?.open){markerIndex.open=false;handled=true;}
  clearTimeout(markerActionTimer);
  if([...markerButtons.values()].some(buttons=>buttons.some(btn=>btn.classList.contains('atlas-marker-action-visible')))){
   revealMarkerActions(null);handled=true;
  }
  if(markerDrag){
   // Only an unfinished pointer gesture is cancelled. Released moves are preserved.
   const gesture=markerDrag;markerDrag=null;
   const pin=mapMarkers.find(x=>x.id===gesture.id);
   if(pin){pin.x=gesture.x;pin.y=gesture.y;}
   try{if(gesture.node.hasPointerCapture(gesture.pointerId))gesture.node.releasePointerCapture(gesture.pointerId);}catch(_){}
   paintCustomMarkers();handled=true;
  }
  if(cartoPointer!==null){
   atlasCarto?.cancelGesture();
   try{if(viewport.hasPointerCapture(cartoPointer))viewport.releasePointerCapture(cartoPointer);}catch(_){}
   cartoPointer=null;handled=true;
  }
  if(atlasCarto?.escape?.())handled=true;
  if(!markerEditor.hidden||markerDraft){closeMarkerEditor();handled=true;}
  if(markerPlacement){markerPlacement=false;refreshMarkerAdd();handled=true;}
  if(selectedMarkerId){clearMarkerSelection();handled=true;}
  if(measurement.active||measurement.points.length){
   measurement.active=false;measurement.points=[];paintMeasurement();handled=true;
  }
  if(drag){try{if(viewport.hasPointerCapture(drag.id))viewport.releasePointerCapture(drag.id);}catch(_){}
   drag=null;viewport.classList.remove('is-dragging');handled=true;}
  if(handled&&atlasCarto?.mode!=='party-edit')status.textContent='Aktivní ovládání bylo ukončeno. Již uložené změny zůstávají zachované.';
  return handled;
 };
 const escapeListener=new AbortController();
 window.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!workspace.isConnected)return;
  if(escapeAtlas()){e.preventDefault();e.stopImmediatePropagation();}
 },{capture:true,signal:escapeListener.signal});
 viewport.addEventListener('keydown',e=>{
  if(atlasCarto?.active&&(e.key==='Enter'||e.key===' ')&&e.target===viewport){
   e.preventDefault();const [x,y]=center();atlasCarto.handleClick(x,y);return;
  }
  if(measurement.active&&(e.key==='Enter'||e.key===' ')&&e.target===viewport){
   e.preventDefault();const [x,y]=center();recordPoint(x,y);return;
  }
  if(markerPlacement&&(e.key==='Enter'||e.key===' ')&&e.target===viewport){
   e.preventDefault();const [x,y]=center();const pt=inMap(x,y);
   if(pt){if(markerPlacementType==='party')placePartyPosition(pt);else{openMarkerEditor(null,pt);status.textContent='Značka je připravena; název i popisek jsou volitelné.';}}
   return;
  }
  const arrows={ArrowLeft:[75,0],ArrowRight:[-75,0],ArrowUp:[0,75],ArrowDown:[0,-75]};
  if(arrows[e.key]){e.preventDefault();state.x+=arrows[e.key][0];state.y+=arrows[e.key][1];repaint();return;}
  if(['+','=','-'].includes(e.key)){
   e.preventDefault();const [x,y]=center();zoomAt(state.zoom*(e.key==='-'?.8:1.25),x,y);
  }
 });
 viewport.querySelector('[data-atlas-image]')?.addEventListener('error',()=>{
  status.textContent=`Nepodařilo se načíst mapu ${map.id}. Zkontrolujte, zda je na GitHubu soubor ${map.image.replace('./','')}.`;
 });
 const initialize=()=>{
  const {w,h}=size();if(!w||!h)return;
  fitZoom=Math.min(w/frameW,h/frameH);
  if(!state.initialized)fullFit();else repaint();
 };
 initialize();
 atlasCarto=mountAtlasCartography({
  workspace,viewport,map,
  read:()=>markerPersistence?.readCartography?.(),
  write:next=>markerPersistence?.writeCartography?.(next),
  readMarkers:()=>parseMarkers(lastCommittedMarkers),
  writeBundle:(nextMarkers,nextCartography)=>{
   const ok=markerPersistence?.writeBundle?.(nextMarkers,nextCartography)===true;
   if(ok){lastCommittedMarkers=parseMarkers(nextMarkers);replaceMarkersInPlace(nextMarkers);paintCustomMarkers();renderMarkerList();refreshMarkerAdd();}
   return ok;
  },
  onPartyPreview:()=>paintCustomMarkers(),
  screenPoint,inMap,markers:()=>mapMarkers,selectMarker,openSector:clickSector,
  getCamera:()=>({zoom:state.zoom,centerX:(viewport.clientWidth/2-state.x)/state.zoom-map.margin,centerY:(viewport.clientHeight/2-state.y)/state.zoom-map.margin}),
  setCamera:cam=>{
   state.zoom=clamp(cam.zoom,...zoomLimits());
   state.x=viewport.clientWidth/2-(map.margin+cam.centerX)*state.zoom;
   state.y=viewport.clientHeight/2-(map.margin+cam.centerY)*state.zoom;
   repaint();
  },
  zoomTo:(point,zoom)=>{
   state.zoom=clamp(zoom,...zoomLimits());
   state.x=viewport.clientWidth/2-(map.margin+point.x)*state.zoom;
   state.y=viewport.clientHeight/2-(map.margin+point.y)*state.zoom;
   repaint();
  },
  onModeStart:()=>{
   measurement.active=false;measurement.points=[];paintMeasurement();
   markerPlacement=false;closeMarkerEditor();refreshMarkerAdd();clearMarkerSelection();
  },
  onLayersChange:()=>{
   viewport.classList.toggle('atlas-hide-own-markers',atlasCarto?.markersVisible()===false);
  },
  restoreMarkers:items=>{
   restoringMarkerUndo=true;
   const old=parseMarkers(markersByMap);
   replaceMarkersInPlace(items);
   const ok=saveAtlasMarkers();
   if(!ok)replaceMarkersInPlace(old);
   restoringMarkerUndo=false;
   paintCustomMarkers();renderMarkerList();refreshMarkerAdd();return ok;
  },
  status
 });
 paintCustomMarkers();
 atlasPartySave=(before,after)=>atlasCarto?.savePartyMarkerChange(before,after);
 atlasMarkerChanged=(before,after)=>{if(!restoringMarkerUndo)atlasCarto?.recordMarkerChange(before,after);};
 viewport.classList.toggle('atlas-hide-own-markers',atlasCarto?.markersVisible()===false);
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(()=>{
   const {w,h}=size();if(!w||!h)return;
   fitZoom=Math.min(w/frameW,h/frameH);
   if(!state.initialized)fullFit();else repaint();
  });
  observer.observe(viewport);
  const disconnect=new MutationObserver(()=>{
   if(!viewport.isConnected){observer.disconnect();disconnect.disconnect();escapeListener.abort();if(pdfLayer&&!pdfDisposed)releasePdf();}
  });
  disconnect.observe(root,{childList:true,subtree:true});
 }
}
