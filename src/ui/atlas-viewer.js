/**
 * Hârn Atlas v94.055 — PDF vector zoom and independent two-point distance ruler.
 * Overview: I4–L7 and 16 selectable sectors.
 * Detail: K5 from the user's untouched, vector K5.pdf, rendered on demand using PDF.js.
 * Only in-memory map measurement; no storage, campaign, calendar, travel, inventory, cloud or combat access.
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
 legendTitle:'Legenda sektoru K5',legendNote:'Značky, vrstevnice, sídla, cesty a hranice z K5.pdf',
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
let selectedSector=null;
const rememberedByMap={overview:{initialized:false},K5:{initialized:false}};
// Measurement is intentionally ephemeral and independent of campaign/game data.
// Coordinates are in original map pixels, never viewport/screen pixels.
const measurementsByMap={overview:{active:false,points:[]},K5:{active:false,points:[]}};
const LEAGUE_KM=4; // 1 Hârnic league = 4 km, confirmed by both source map scales.
const formatDistance=(km)=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:km<1?3:2}).format(km);
// Reusable physical-distance calculator in unscaled source-map coordinates.
export function atlasDistanceKm(mapId,a,b){
 const map=MAPS[mapId];if(!map||!a||!b)throw new Error('Atlas: invalid map or points');
 return Math.hypot(b.x-a.x,b.y-a.y)/map.pixelsPerKm;
}


const sectorButtons=()=>ATLAS_SECTORS.map(sector=>{
 const ready=!!sector.detailMap;
 return `<button type="button" class="atlas-sector${ready?' atlas-sector--has-detail':''}${selectedSector===sector.id?' is-selected':''}" data-atlas-sector="${sector.id}" aria-label="Sektor ${sector.id}${ready?', otevřít detailní mapu':' – detailní mapa zatím nepřipojena'}" title="${ready?'Otevřít detailní mapu K5':'Sektor '+sector.id+' · detailní mapa bude přidána později'}" tabindex="0"></button>`;
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
   <aside class="atlas-legend" aria-label="${map.legendTitle}"><h2>${map.legendTitle}</h2><p class="atlas-legend-note">${map.legendNote}</p>
    <div class="atlas-legend-scroll"><img src="${map.key}" alt="${map.legendAlt}" width="${map.legendWidth}" height="${map.legendHeight}" draggable="false"></div>
    <div class="atlas-legend-scale"><strong>Originální měřítko</strong><span>${map.scaleNote}</span></div>
   </aside>
   <div class="atlas-map-pane">
    <div class="atlas-toolbar" role="toolbar" aria-label="Ovládání mapy">
     <button type="button" data-atlas-control="minus" aria-label="Oddálit mapu" title="Oddálit">−</button>
     <output class="atlas-zoom-label" data-atlas-zoom aria-live="off">100 %</output>
     <button type="button" data-atlas-control="plus" aria-label="Přiblížit mapu" title="Přiblížit">+</button>
     <button type="button" data-atlas-control="fit" class="atlas-fit" title="Zobrazit celou mapu">Celá mapa</button>
     <div class="atlas-toolbar-help">Kolečko myši: přiblížení · podržet levé tlačítko: posun</div>
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
      <line data-atlas-measure-outline class="atlas-measure-line-outline" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>
      <line data-atlas-measure-line class="atlas-measure-line" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>
      <g data-atlas-measure-marker="A" visibility="hidden"><circle class="atlas-measure-marker-halo" r="13"/><circle class="atlas-measure-marker-a" r="10"/><text text-anchor="middle" dy="4.4">A</text></g>
      <g data-atlas-measure-marker="B" visibility="hidden"><circle class="atlas-measure-marker-halo" r="13"/><circle class="atlas-measure-marker-b" r="10"/><text text-anchor="middle" dy="4.4">B</text></g>
     </svg>
     <div class="atlas-scale" aria-label="Grafické měřítko mapy"><div data-atlas-scale-line class="atlas-scale-line"></div><span data-atlas-scale-label>≈ 20 km</span></div>
    </div>
    <div class="atlas-status" role="status" aria-live="polite" data-atlas-status>${hint}</div>
   </div>
   <aside class="atlas-tools" aria-label="Nástroje mapy">
    <h2>Nástroje mapy</h2><p class="atlas-tools-subtitle">Práce přímo nad mapou · ${overview?'I4–L7':'K5'}</p>
    <section class="atlas-tool-card" aria-label="Měření vzdálenosti">
     <h3><span aria-hidden="true">↔</span> Měření vzdálenosti</h3>
     <p class="atlas-tool-help">Přímá vzdálenost mezi dvěma místy podle měřítka právě otevřené mapy.</p>
     <button type="button" class="atlas-tool-action" data-atlas-measure-toggle aria-pressed="false">Zapnout měření</button>
     <div class="atlas-measure-instructions" data-atlas-measure-help role="status" aria-live="polite">Zapněte měření. Potom na mapě označte bod A a bod B.</div>
     <div class="atlas-measure-results" data-atlas-measure-result aria-live="polite" hidden>
      <div class="atlas-measure-distance" data-atlas-measure-km>—</div>
      <div class="atlas-measure-units"><span data-atlas-measure-m>—</span><span data-atlas-measure-leagues>—</span></div>
     </div>
     <div class="atlas-measure-actions">
      <button type="button" data-atlas-measure-reset disabled>Nové měření</button>
      <button type="button" data-atlas-measure-clear disabled>Odstranit body</button>
     </div>
     <p class="atlas-tool-footnote">1 hârnická liga ≈ 4 km. Měří se vzdušnou čarou, ne skutečná délka cesty.</p>
    </section>
    <div class="atlas-tools-future"><strong>Další nástroje</strong><p>Poznámky, vlastní značky a měření tras doplníme později.</p></div>
   </aside>
  </div>
 </section>`;
}

/** Bind per-view ephemeral controls; only Atlas DOM is replaced when K5 opens. */
export function mountAtlasView(root){
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
 const measureClear=workspace.querySelector('[data-atlas-measure-clear]');
 const measureHelp=workspace.querySelector('[data-atlas-measure-help]');
 const measureResult=workspace.querySelector('[data-atlas-measure-result]');
 const measureKm=workspace.querySelector('[data-atlas-measure-km]');
 const measureMeters=workspace.querySelector('[data-atlas-measure-m]');
 const measureLeagues=workspace.querySelector('[data-atlas-measure-leagues]');
 const measurement=measurementsByMap[map.id];
 const frameW=map.width+map.margin,frameH=map.height+map.margin;
 const pdfLayer=workspace.querySelector('[data-atlas-pdf-layer]');
 let pdfLoading=null, pdfRenderTask=null, pdfRenderTimer=null, pdfEpoch=0, pdfDisposed=false;
 const state={...rememberedByMap[map.id]};
 let fitZoom=1;
 let drag=null;
 let ignoreClick=false;
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
 const paintMeasurement=()=>{
  const pts=measurement.points;
  viewport.classList.toggle('is-measuring',measurement.active);
  measureToggle.setAttribute('aria-pressed',String(measurement.active));
  measureToggle.textContent=measurement.active?'Ukončit měření':'Zapnout měření';
  measureReset.disabled=pts.length===0;
  measureClear.disabled=pts.length===0;
  const messages=[
   'Zapněte měření. Potom na mapě označte bod A a bod B.',
   'Klikněte na mapu a označte bod A. Tažením myší lze dál posouvat.',
   'Bod A je označen. Kliknutím na mapu zvolte bod B.',
   'Vzdálenost A–B je změřena. „Nové měření“ umožní označit jiné body.'
  ];
  measureHelp.textContent=measurement.active?messages[pts.length+1]:pts.length===2?'Měření je dokončené. Opětovným zapnutím můžete začít nové.':messages[0];
  for(const [i,label] of ['A','B'].entries()){
   const marker=overlay.querySelector(`[data-atlas-measure-marker="${label}"]`);
   if(pts[i]){const p=screenPoint(pts[i]);marker.setAttribute('transform',`translate(${p.x},${p.y})`);marker.setAttribute('visibility','visible');}
   else marker.setAttribute('visibility','hidden');
  }
  const ln=overlay.querySelector('[data-atlas-measure-line]');
  const outline=overlay.querySelector('[data-atlas-measure-outline]');
  if(pts.length===2){
   const a=screenPoint(pts[0]),b=screenPoint(pts[1]);
   for(const el of [ln,outline]){
    el.setAttribute('x1',a.x);el.setAttribute('y1',a.y);
    el.setAttribute('x2',b.x);el.setAttribute('y2',b.y);
    el.setAttribute('visibility','visible');
   }
   const km=atlasDistanceKm(map.id,pts[0],pts[1]);
   measureKm.textContent=`${formatDistance(km)} km`;
   measureMeters.textContent=`${Math.round(km*1000).toLocaleString('cs-CZ')} m`;
   measureLeagues.textContent=`${formatDistance(km/LEAGUE_KM)} hârnických lig`;
   measureResult.hidden=false;
  }else{
   ln.setAttribute('visibility','hidden');outline.setAttribute('visibility','hidden');measureResult.hidden=true;
  }
 };
 const recordPoint=(clientX,clientY)=>{
  if(!measurement.active)return false;
  const pt=inMap(clientX,clientY);
  if(!pt){status.textContent='Bod musí být umístěný uvnitř mapy.';return true;}
  // After the second point, starting a new measurement replaces both old points.
  if(measurement.points.length===2)measurement.points=[];
  measurement.points.push(pt);
  paintMeasurement();
  if(measurement.points.length===2)status.textContent=`Naměřeno ${measureKm.textContent} (přímá vzdálenost).`;
  else status.textContent='Bod A je označen. Klikněte na druhé místo B.';
  return true;
 };
 measureToggle.addEventListener('click',()=>{
  measurement.active=!measurement.active;
  if(measurement.active&&measurement.points.length===2)measurement.points=[];
  paintMeasurement();
  status.textContent=measurement.active?'Měření vzdálenosti: klikněte na bod A a potom na bod B.':'Měření vypnuto; mapou můžete procházet jako obvykle.';
 });
 measureReset.addEventListener('click',()=>{
  measurement.points=[];measurement.active=true;paintMeasurement();
  status.textContent='Nové měření: označte na mapě bod A.';
 });
 measureClear.addEventListener('click',()=>{
  measurement.points=[];paintMeasurement();status.textContent='Body A a B byly odstraněny.';
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
 const zoomAt=(next,cx,cy)=>{
  const rect=viewport.getBoundingClientRect(),px=cx-rect.left,py=cy-rect.top;
  const old=state.zoom;
  state.zoom=clamp(next,Math.max(.06,fitZoom*.7),Math.max(4,fitZoom*8));
  const ratio=state.zoom/old;
  state.x=px-(px-state.x)*ratio;
  state.y=py-(py-state.y)*ratio;
  repaint();
 };
 const center=()=>{const r=viewport.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];};
 const switchTo=(nextMap)=>{
  if(!MAPS[nextMap]||nextMap===currentMapId)return;
  remember();
  if(pdfLayer)releasePdf();
  currentMapId=nextMap;
  workspace.outerHTML=atlasView();
  mountAtlasView(root);
  root.querySelector('[data-atlas-viewport]')?.focus({preventScroll:true});
 };
 const clickSector=id=>{
  const def=ATLAS_SECTORS.find(s=>s.id===id);if(!def||!overview)return;
  selectedSector=id;
  viewport.querySelectorAll('.atlas-sector.is-selected').forEach(el=>el.classList.remove('is-selected'));
  viewport.querySelector(`[data-atlas-sector="${id}"]`)?.classList.add('is-selected');
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
  if(didMove){ignoreClick=true;if(pdfLayer)schedulePdf(25);return;}
  if(measurement.active){recordPoint(e.clientX,e.clientY);return;}
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
 viewport.addEventListener('pointercancel',e=>{if(drag&&drag.id===e.pointerId){drag=null;viewport.classList.remove('is-dragging');}});
 viewport.addEventListener('click',e=>{
  // Keyboard-triggered button click. Pointer clicks are handled above.
  if(ignoreClick){ignoreClick=false;return;}
  if(e.detail!==0)return;
  const button=e.target.closest?.('[data-atlas-sector]');
  if(button)clickSector(button.dataset.atlasSector);
 });
 viewport.addEventListener('keydown',e=>{
  if(measurement.active&&(e.key==='Enter'||e.key===' ')&&e.target===viewport){
   e.preventDefault();const [x,y]=center();recordPoint(x,y);return;
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
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(()=>{
   const {w,h}=size();if(!w||!h)return;
   fitZoom=Math.min(w/frameW,h/frameH);
   if(!state.initialized)fullFit();else repaint();
  });
  observer.observe(viewport);
  const disconnect=new MutationObserver(()=>{
   if(!viewport.isConnected){observer.disconnect();disconnect.disconnect();if(pdfLayer&&!pdfDisposed)releasePdf();}
  });
  disconnect.observe(root,{childList:true,subtree:true});
 }
}
