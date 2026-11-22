/**
 * Atlas I4–L7 — independent, read-only cartographic view.
 * Does NOT access combat, travel, calendar, inventory, localStorage or cloud.
 * Source: 5001A-HarnWorld-Map_Chroust.pdf; cropped without changing PDF art.
 * HTML shows one lossless WebP rendered at the source PDF's native 300 DPI;
 * the cropped map is shown directly inside every sector on the Atlas page.
 *
 * Future sector detail pages: change a sector's `detailUrl` from null to a
 * real path. No placeholder/missing links are followed today.
 */
const MAP = Object.freeze({
  width:2449, height:2363,
  image:'./assets/atlas/harn-I4-L7.webp',
  key:'./assets/atlas/harn-map-key.webp',
  // Original legend: One hex (1 cm on the print) = 5 Hârnic leagues ≈ 20 km.
  // Raster was rendered from the cropped PDF at 300 DPI, without rescaling.
  sourceDpi:300,
  kmPerHex:20
});
const MARGIN=48;
const LETTERS=Object.freeze(['I','J','K','L']);
const ROWS=Object.freeze([4,5,6,7]);
export const ATLAS_SECTORS=Object.freeze(ROWS.flatMap(row=>LETTERS.map(column=>Object.freeze({id:`${column}${row}`,column,row,detailUrl:null}))));
let remembered={zoom:0,x:0,y:0,initialized:false};

const sectorButtons=ATLAS_SECTORS.map(s=>
 `<button type="button" class="atlas-sector" data-atlas-sector="${s.id}" aria-label="Sektor ${s.id}. Detailní mapa zatím není připojena." title="Sektor ${s.id} · detailní mapa bude přidána později" tabindex="0"></button>`
).join('');

export function atlasView(){
 return `<section class="atlas-workspace" aria-label="Atlas Hârnu, sektory I4 až L7">
   <header class="atlas-header"><div><p class="atlas-eyebrow">HÂRNWORLD · KARTOGRAFICKÁ KNIHOVNA</p><h1>Atlas Hârnu</h1><p>Mapový podklad I4–L7 přímo v 16 sektorech · kliknutím vyberete sektor pro budoucí detailní mapu</p></div>
   </header>
   <div class="atlas-body">
    <aside class="atlas-legend" aria-label="Legenda původní mapy"><h2>Legenda mapy</h2><p class="atlas-legend-note">Původní značky HârnWorld</p>
      <div class="atlas-legend-scroll"><img src="${MAP.key}" alt="Původní legenda: krajina, lesy, voda, hory, řeky, brody, peřeje, cesty a značení sídel" width="647" height="3254" draggable="false"></div>
      <div class="atlas-legend-scale"><strong>Originální měřítko</strong><span>1 hex (1 cm) = 5 hârnických lig</span><span>≈ 20 km / 12,5 míle</span></div>
    </aside>
    <div class="atlas-map-pane">
     <div class="atlas-toolbar" role="toolbar" aria-label="Ovládání mapy">
      <button type="button" data-atlas-control="minus" aria-label="Oddálit mapu" title="Oddálit">−</button>
      <output class="atlas-zoom-label" data-atlas-zoom aria-live="off">100 %</output>
      <button type="button" data-atlas-control="plus" aria-label="Přiblížit mapu" title="Přiblížit">+</button>
      <button type="button" data-atlas-control="fit" class="atlas-fit" title="Zobrazit celý výřez">Celá mapa</button>
      <div class="atlas-toolbar-help">Kolečko myši: přiblížení · držet levé tlačítko: posun</div>
     </div>
     <div class="atlas-viewport" data-atlas-viewport tabindex="0" role="region" aria-label="Interaktivní mapa sektorů I4 až L7, kolečko myši přibližuje, tažení posouvá, klávesy se šipkami posouvají">
      <div class="atlas-stage" data-atlas-stage style="width:${MAP.width+MARGIN}px;height:${MAP.height+MARGIN}px">
       <div class="atlas-letters" aria-hidden="true" style="left:${MARGIN}px;width:${MAP.width}px">${LETTERS.map(l=>`<span>${l}</span>`).join('')}</div>
       <div class="atlas-numbers" aria-hidden="true" style="top:${MARGIN}px;height:${MAP.height}px">${ROWS.map(n=>`<span>${n}</span>`).join('')}</div>
       <div class="atlas-image-layer" style="left:${MARGIN}px;top:${MARGIN}px;width:${MAP.width}px;height:${MAP.height}px">
        <img src="${MAP.image}" alt="Bezeztrátová mapová kresba regionu Kaldor, Shava Forest, Tashal, Azadmere a okolí ze sektorů I4 až L7" width="${MAP.width}" height="${MAP.height}" draggable="false" decoding="async">
        <div class="atlas-sector-grid" aria-label="Mřížka 16 sektorů připravených pro detailní mapy">${sectorButtons}</div>
       </div>
      </div>
      <div class="atlas-scale" aria-label="Grafické měřítko mapy"><div data-atlas-scale-line class="atlas-scale-line"></div><span data-atlas-scale-label>≈ 20 km</span></div>
     </div>
     <div class="atlas-status" role="status" aria-live="polite" data-atlas-status>Výřez I4–L7. Kliknutí na sektor nyní pouze označí jeho pozici; detailní mapy přidáme později.</div>
    </div>
   </div>
  </section>`;
}

/** Bind ephemeral viewer controls; no state writes outside this module. */
export function mountAtlasView(root){
 const viewport=root.querySelector('[data-atlas-viewport]');
 if(!viewport)return;
 const stage=root.querySelector('[data-atlas-stage]');
 const zoomLabel=root.querySelector('[data-atlas-zoom]');
 const scaleLine=root.querySelector('[data-atlas-scale-line]');
 const scaleLabel=root.querySelector('[data-atlas-scale-label]');
 const status=root.querySelector('[data-atlas-status]');
 const frameW=MAP.width+MARGIN,frameH=MAP.height+MARGIN;
 const state={...remembered};
 let fitZoom=1;
 let drag=null;
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const size=()=>({w:viewport.clientWidth,h:viewport.clientHeight});
 const bounds=()=>{
  const {w,h}=size(),ww=frameW*state.zoom,hh=frameH*state.zoom;
  // Center when fully visible; otherwise allow panning all the way to edges.
  const limitX=ww<=w?[(w-ww)/2,(w-ww)/2]:[w-ww,0];
  const limitY=hh<=h?[(h-hh)/2,(h-hh)/2]:[h-hh,0];
  state.x=clamp(state.x,...limitX);
  state.y=clamp(state.y,...limitY);
 };
 const remember=()=>{remembered={zoom:state.zoom,x:state.x,y:state.y,initialized:true};};
 const repaint=()=>{
  bounds();
  stage.style.transform=`translate3d(${state.x}px,${state.y}px,0) scale(${state.zoom})`;
  zoomLabel.textContent=`${Math.round(state.zoom*100)} %`;
  // Scale is anchored to PDF's printed 1cm/hex at native 300dpi.
  const pixelPerKm=(MAP.sourceDpi/2.54/MAP.kmPerHex)*state.zoom;
  const scales=[5,10,20,40,60,100,200,400,600,1000];
  const labelKm=scales.reduce((best,km)=>Math.abs(km*pixelPerKm-140)<Math.abs(best*pixelPerKm-140)?km:best,20);
  scaleLine.style.width=`${Math.round(labelKm*pixelPerKm)}px`;
  scaleLabel.textContent=`≈ ${labelKm} km`;
  remember();
 };
 const fullFit=()=>{
  const {w,h}=size();
  if(!w||!h)return;
  fitZoom=Math.min(w/frameW,h/frameH);
  state.zoom=fitZoom;
  state.x=(w-frameW*fitZoom)/2;
  state.y=(h-frameH*fitZoom)/2;
  repaint();
 };
 const zoomAt=(next,cx,cy)=>{
  const rect=viewport.getBoundingClientRect();
  const px=cx-rect.left,py=cy-rect.top;
  const old=state.zoom;
  const max=Math.max(4,fitZoom*8);
  state.zoom=clamp(next,Math.max(.12,fitZoom*.7),max);
  const ratio=state.zoom/old;
  state.x=px-(px-state.x)*ratio;
  state.y=py-(py-state.y)*ratio;
  repaint();
 };
 const center=()=>{const r=viewport.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];};
 const clickSector=(id)=>{
  const def=ATLAS_SECTORS.find(s=>s.id===id);if(!def)return;
  viewport.querySelectorAll('.atlas-sector.is-selected').forEach(el=>el.classList.remove('is-selected'));
  viewport.querySelector(`[data-atlas-sector="${id}"]`)?.classList.add('is-selected');
  status.textContent=`Sektor ${id} je připraven pro budoucí samostatnou detailní mapu. Zatím není přiřazen žádný odkaz.`;
  if(def.detailUrl)window.location.assign(def.detailUrl);
 };
 root.querySelectorAll('[data-atlas-control]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.atlasControl;
  if(action==='fit')return fullFit();
  const [x,y]=center();zoomAt(state.zoom*(action==='plus'?1.25:1/1.25),x,y);
 }));
 viewport.addEventListener('wheel',e=>{
  e.preventDefault();
  const factor=Math.exp(-clamp(e.deltaY,-350,350)*.00165);
  zoomAt(state.zoom*factor,e.clientX,e.clientY);
 },{passive:false});
 viewport.addEventListener('dblclick',e=>{e.preventDefault();zoomAt(state.zoom*1.6,e.clientX,e.clientY);});
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,initialX:state.x,initialY:state.y,moved:false};
  viewport.setPointerCapture(e.pointerId);
  viewport.classList.add('is-dragging');
 });
 viewport.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(!drag.moved)return;
  state.x=drag.initialX+dx;state.y=drag.initialY+dy;repaint();
 });
 const endDrag=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const didMove=drag.moved;
  drag=null;
  viewport.classList.remove('is-dragging');
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  if(didMove)return;
  // Pointer capture can retarget a click to the viewport; pick sector by
  // untransformed image coordinates. Axis labels never select a sector.
  const rect=viewport.getBoundingClientRect();
  const localX=(e.clientX-rect.left-state.x)/state.zoom-MARGIN;
  const localY=(e.clientY-rect.top-state.y)/state.zoom-MARGIN;
  if(localX<0||localX>=MAP.width||localY<0||localY>=MAP.height)return;
  const col=LETTERS[Math.floor(localX/MAP.width*4)];
  const row=ROWS[Math.floor(localY/MAP.height*4)];
  clickSector(col+row);
 };
 viewport.addEventListener('pointerup',endDrag);
 viewport.addEventListener('pointercancel',e=>{if(drag&&drag.id===e.pointerId){drag=null;viewport.classList.remove('is-dragging');}});
 viewport.addEventListener('click',e=>{
  // Keyboard accessibility; pointer click is handled by the position above.
  if(e.detail!==0)return;
  const cell=e.target.closest?.('[data-atlas-sector]');if(cell)clickSector(cell.dataset.atlasSector);
 });
 viewport.addEventListener('keydown',e=>{
  const arrows={ArrowLeft:[75,0],ArrowRight:[-75,0],ArrowUp:[0,75],ArrowDown:[0,-75]};
  if(arrows[e.key]){e.preventDefault();state.x+=arrows[e.key][0];state.y+=arrows[e.key][1];repaint();return;}
  if(e.key==='+'||e.key==='='||e.key==='-'){
   e.preventDefault();const [x,y]=center();zoomAt(state.zoom*(e.key==='-'?.8:1.25),x,y);
  }
 });
 const image=viewport.querySelector('.atlas-image-layer img');
 image?.addEventListener('error',()=>{status.textContent='Nepodařilo se načíst mapový obraz. Zkontrolujte soubor assets/atlas/harn-I4-L7.webp.';});
 const initialize=()=>{
  const {w,h}=size();if(!w||!h)return;
  fitZoom=Math.min(w/frameW,h/frameH);
  if(!state.initialized)fullFit();else repaint();
 };
 initialize();
 // Late sizing on narrow screens. Avoid attaching an observer to the entire app.
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(()=>{
   const {w,h}=size();if(!w||!h)return;
   fitZoom=Math.min(w/frameW,h/frameH);
   if(!state.initialized)fullFit();else repaint();
  });
  observer.observe(viewport);
  // Auto-disconnect when navigating; the old viewer is detached on render.
  const disconnect=new MutationObserver(()=>{if(!viewport.isConnected){observer.disconnect();disconnect.disconnect();}});
  disconnect.observe(root,{childList:true});
 }
}
