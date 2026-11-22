/**
 * Hârn Atlas v94.053 — two-level stand-alone viewer.
 * Overview: I4–L7 and 16 selectable sectors.
 * Detail: K5 from the user's K5.pdf, shown as a single lossless WebP.
 * No storage, campaign, calendar, travel, inventory, cloud or combat access.
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
 image:'./assets/atlas/k5-detail-map.webp',
 key:'./assets/atlas/k5-detail-legend.webp',
 title:'Atlas Hârnica · K5',
 subtitle:'Detailní mapa sektoru K5 · originální kresba a všechny místní názvy',
 legendTitle:'Legenda sektoru K5',legendNote:'Značky, vrstevnice, sídla, cesty a hranice z K5.pdf',
 legendWidth:814,legendHeight:2981,
 legendAlt:'Legenda mapy K5: vegetace, sněhové oblasti, reliéf, brody, cesty, sídla, oblasti a grafické měřítko v ligách',
 scaleNote:'0–5 lig na původní mapě ≈ 0–20 km',
 // PDF's printed distance rule: 5 leagues span approximately 140 points;
 // image rendered at 400 dpi (400/72 px per PDF point).
 pixelsPerKm:140*(400/72)/20
});
const MAPS=Object.freeze({overview:OVERVIEW,K5:DETAIL_K5});
const LETTERS=Object.freeze(['I','J','K','L']);
const ROWS=Object.freeze([4,5,6,7]);
export const ATLAS_SECTORS=Object.freeze(ROWS.flatMap(row=>LETTERS.map(column=>Object.freeze({
 id:`${column}${row}`,column,row,detailMap:column==='K'&&row===5?'K5':null
}))));
let currentMapId='overview';
let selectedSector=null;
const rememberedByMap={overview:{initialized:false},K5:{initialized:false}};

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
 const hint=overview?'Kliknutím na K5 otevřete podrobnou mapu. Ostatní sektory zatím pouze označíte.':'Detailní mapa K5 · tlačítkem Zpět na hlavní mapu se vrátíte do stejného výřezu I4–L7.';
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
       <img src="${map.image}" data-atlas-image alt="${overview?'Přehledová mapa Hârnu, sektory I4 až L7':'Podrobná barevná mapa K5 včetně místních jmen, sídel, cest a terénních vrstevnic'}" width="${map.width}" height="${map.height}" draggable="false" decoding="async">
       ${grid}
      </div>
     </div>
     <div class="atlas-scale" aria-label="Grafické měřítko mapy"><div data-atlas-scale-line class="atlas-scale-line"></div><span data-atlas-scale-label>≈ 20 km</span></div>
    </div>
    <div class="atlas-status" role="status" aria-live="polite" data-atlas-status>${hint}</div>
   </div>
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
 const frameW=map.width+map.margin,frameH=map.height+map.margin;
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
 const repaint=()=>{
  bounds();
  stage.style.transform=`translate3d(${state.x}px,${state.y}px,0) scale(${state.zoom})`;
  zoomLabel.textContent=`${Math.round(state.zoom*100)} %`;
  const pixelPerKm=map.pixelsPerKm*state.zoom;
  const scales=[1,2,5,10,20,40,60,100,200,400,600,1000];
  const labelKm=scales.reduce((best,km)=>Math.abs(km*pixelPerKm-140)<Math.abs(best*pixelPerKm-140)?km:best,20);
  scaleLine.style.width=`${Math.round(labelKm*pixelPerKm)}px`;
  scaleLabel.textContent=`≈ ${labelKm} km`;
  remember();
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
  if(didMove){ignoreClick=true;return;}
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
   if(!viewport.isConnected){observer.disconnect();disconnect.disconnect();}
  });
  disconnect.observe(root,{childList:true,subtree:true});
 }
}
