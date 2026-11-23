/** Hârn Atlas cartography v94.077. Independent annotations only, no rules engine linkage. */
const MAP_IDS=['overview','K5'];
const FEATURE_TYPES=['route','area','radius','draw','arrow','text'];
const LAYERS=['route','area','radius','draw','arrow','text','markers','partyHistory','fog'];
const VISIBLE_LAYER_TOGGLES=LAYERS.filter(key=>key!=='fog');
const DEFAULT_LAYERS=Object.freeze(Object.fromEntries(LAYERS.map(key=>[key,true])));
const COLORS=['#a03b24','#246d83','#547036','#724b94','#bb7622','#473629'];
const MAX_ITEMS=400,MAX_POINTS=750,MAX_FOG=1400;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validPoint=(p,map)=>p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.y>=0&&p.x<=map.width&&p.y<=map.height;
const makeId=()=>`a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeText=(s,max)=>typeof s==='string'?s.slice(0,max):'';
const blankMap=()=>({features:[],bookmarks:[],partyHistory:[],fog:{enabled:false,strokes:[]},layers:{...DEFAULT_LAYERS}});
export const atlasCartographyEmpty=()=>({version:1,maps:{overview:blankMap(),K5:blankMap()}});
// Reject corrupted cloud snapshots rather than silently deleting records.
export function validateAtlasCartography(value,maps){
 if(value===undefined)return true;
 if(!value||value.version!==1||!value.maps||typeof value.maps!=='object')throw Error('Atlas: neplatné kartografické údaje.');
 for(const [id,mapData] of Object.entries(value.maps)){
  const map=maps[id];if(!map||!mapData||typeof mapData!=='object')throw Error('Atlas: neplatná mapa kartografie.');
  const {features,bookmarks,partyHistory,fog,layers}=mapData;
  if(!Array.isArray(features)||features.length>MAX_ITEMS||!Array.isArray(bookmarks)||bookmarks.length>150||!Array.isArray(partyHistory)||partyHistory.length>1000||!fog||typeof fog.enabled!=='boolean'||!Array.isArray(fog.strokes)||fog.strokes.length>MAX_FOG||!layers||typeof layers!=='object')throw Error('Atlas: neplatný počet či struktura mapových objektů.');
  for(const [k,v] of Object.entries(layers))if(!LAYERS.includes(k)||typeof v!=='boolean')throw Error('Atlas: neplatná vrstva.');
  for(const feature of features){
   if(!feature||typeof feature.id!=='string'||feature.id.length>90||!FEATURE_TYPES.includes(feature.type)||typeof feature.title!=='string'||feature.title.length>120||typeof feature.note!=='string'||feature.note.length>1500||typeof feature.date!=='string'||feature.date.length>80||!COLORS.includes(feature.color)||!Array.isArray(feature.points)||feature.points.length>MAX_POINTS||feature.points.some(p=>!validPoint(p,map))||!['route','area','draw','arrow'].includes(feature.type)&&!validPoint(feature.points[0],map))throw Error('Atlas: neplatný uložený objekt.');
   if(['route','area','draw','arrow'].includes(feature.type)&&feature.points.length<(feature.type==='area'?3:2))throw Error('Atlas: objekt má příliš málo bodů.');
   if(feature.opacity!==undefined&&(!finite(feature.opacity)||feature.opacity<.05||feature.opacity>.8))throw Error('Atlas: neplatná průhlednost.');
   if(feature.type==='radius'&&(!finite(feature.radiusKm)||feature.radiusKm<=0||feature.radiusKm>20000))throw Error('Atlas: chybná kružnice.');
  }
  for(const b of bookmarks)if(typeof b.id!=='string'||typeof b.title!=='string'||b.title.length>120||!finite(b.x)||!finite(b.y)||!finite(b.zoom)||b.zoom<=0||!validPoint({x:b.x,y:b.y},map))throw Error('Atlas: neplatná záložka.');
  for(const h of partyHistory)if(typeof h.id!=='string'||!validPoint(h,map)||typeof h.date!=='string'||h.date.length>80||typeof h.note!=='string'||h.note.length>500)throw Error('Atlas: neplatná historie družiny.');
  for(const s of fog.strokes)if(!s||!['reveal','cover'].includes(s.action)||!finite(s.radiusKm)||s.radiusKm<=0||s.radiusKm>10000||!Array.isArray(s.points)||s.points.length>MAX_POINTS||s.points.some(p=>!validPoint(p,map)))throw Error('Atlas: neplatná mlha války.');
  for(const arr of [features,bookmarks,partyHistory])if(new Set(arr.map(x=>x.id)).size!==arr.length)throw Error('Atlas: duplicitní identifikátory.');
 }
 return true;
}
export function normalizeAtlasCartography(value,maps){
 const result=atlasCartographyEmpty();
 if(value===undefined)return result;
 validateAtlasCartography(value,maps);
 for(const id of MAP_IDS){if(!value.maps[id])continue;const src=value.maps[id];result.maps[id]={...structuredClone(src),layers:{...DEFAULT_LAYERS,...src.layers}};}
 return result;
}
const formatKm=km=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(km);
const formatRouteSegment=km=>km<1?`${Math.round(km*1000).toLocaleString('cs-CZ')} m`:`${formatKm(km)} km`;

const distance=(a,b,map)=>Math.hypot(a.x-b.x,a.y-b.y)/map.pixelsPerKm;
const routeLength=(pts,map)=>pts.slice(1).reduce((acc,p,i)=>acc+distance(pts[i],p,map),0);
const polygonArea=(pts,map)=>Math.abs(pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p.x*q.y-p.y*q.x;},0))/(2*map.pixelsPerKm**2);
const names={route:'Trasa',area:'Oblast',radius:'Dosah',draw:'Kresba',arrow:'Šipka',text:'Text'};
export function atlasCartographyPanel(){
 return `<section class="atlas-tool-card atlas-cartography" aria-label="Kartografické nástroje" data-atlas-carto>
 <details class="atlas-tool-fold"><summary>Trasy, oblasti a kreslení</summary>
  <label>Nástroj<select data-carto-mode><option value="">— Vyberte nástroj —</option><option value="route">Zakreslit trasu</option><option value="area">Zakreslit oblast / změřit plochu</option><option value="radius">Kružnice dosahu (tažením)</option><option value="draw">Kreslení od ruky</option><option value="arrow">Šipka</option><option value="text">Text na mapě</option></select></label>
  <div class="atlas-carto-fields" data-carto-fields hidden>
   <label data-carto-for="route area radius draw arrow text">Název / text<input data-carto-title maxlength="120" placeholder="Volitelný název objektu"></label>
   <label data-carto-for="route area radius draw arrow text">Poznámka<textarea data-carto-note maxlength="1500" rows="2" placeholder="Zobrazí se po najetí na mapový objekt"></textarea></label>
   <label data-carto-for="route area radius draw arrow text">Barva<select data-carto-color>${COLORS.map((c,i)=>`<option value="${c}">${['Červená','Modrá','Zelená','Fialová','Zlatá','Hnědá'][i]}</option>`).join('')}</select></label>
   <label data-carto-for="area radius">Průhlednost vyplnění<select data-carto-opacity><option value="0.10">10 %</option><option value="0.18" selected>18 %</option><option value="0.35">35 %</option><option value="0.50">50 %</option></select></label>
  </div>
  <p class="atlas-carto-hint" data-carto-hint>Vyberte nástroj. Kružnici vytvoříte přímo tažením od středu k okraji; její dosah se při kreslení zobrazuje na mapě.</p>
  <div class="atlas-carto-actions"><button type="button" data-carto-save-meta hidden>Uložit změny</button><button type="button" data-carto-delete-route hidden>Odebrat celou trasu</button><button data-carto-finish type="button" hidden disabled>Dokončit objekt</button><button data-carto-point-undo type="button" hidden disabled>Odebrat bod</button></div>
 </details>
 <details class="atlas-tool-fold" data-carto-fog-section><summary>Zakrytí mapy</summary><p class="atlas-carto-hint">Držte tlačítko myši a přejíždějte štětcem po mapě. Velikost kruhu štětce je při pohybu vidět na mapě.</p>
  <label>Poloměr štětce mlhy (km)<input type="number" data-carto-fog-radius min="0.01" max="500" step="0.1" value="5"></label>
  <div class="atlas-carto-actions"><button type="button" data-carto-fog-brush="fog-reveal">Odhalovat</button><button type="button" data-carto-fog-brush="fog-cover">Vrátit mlhu</button></div>
  <div class="atlas-carto-actions"><button type="button" data-carto-fog-toggle>Zapnout mlhu</button></div>
  <details class="atlas-fog-advanced" data-carto-fog-advanced><summary>Další možnosti zakrytí</summary>
   <div class="atlas-carto-actions"><button type="button" data-carto-fog-reset>Úplně zahalit</button><button type="button" data-carto-fog-clear>Odstranit mlhu</button></div>
  </details>
 </details>
 <div class="atlas-fog-gate" data-carto-fog-gate hidden role="dialog" aria-modal="true" aria-labelledby="atlas-fog-gate-title">
  <form data-carto-fog-gate-form class="atlas-fog-gate-box" autocomplete="off">
   <h3 id="atlas-fog-gate-title">Zakrytí mapy – přístupové heslo</h3>
   <label>Heslo <input type="password" data-carto-fog-password autocomplete="off" spellcheck="false" required></label>
   <p data-carto-fog-gate-error class="atlas-fog-gate-error" role="status" aria-live="polite"></p>
   <div class="atlas-carto-actions"><button type="submit">Odemknout</button><button type="button" data-carto-fog-gate-cancel>Zrušit</button></div>
  </form>
 </div>
 </section>`;
}

/** The caller owns the map view and the EXISTING guarded campaign persistence. */
export function mountAtlasCartography({workspace,viewport,map,read,write,screenPoint,inMap,getCamera,setCamera,zoomTo,markers,selectMarker,openSector,status,onModeStart,onLayersChange,restoreMarkers}){
 const area=workspace.querySelector('[data-atlas-carto]');
 const svg=workspace.querySelector('[data-atlas-carto-overlay]');
 const fogCanvas=workspace.querySelector('[data-atlas-fog]');
 const hoverDelete=workspace.querySelector('[data-carto-hover-delete]');
 const brushCursor=workspace.querySelector('[data-carto-fog-cursor]');
 if(!area||!svg||!fogCanvas)return null;
 let snapshot,corrupt=false;try{snapshot=normalizeAtlasCartography(read?.(),{overview:{width:2449,height:2363},K5:{width:4172,height:4031}});}catch(e){console.error('Atlas cartography:',e);snapshot=atlasCartographyEmpty();corrupt=true;status.textContent='Atlas: uložená kartografie je neplatná. Zápisy jsou zablokovány, aby se nepřepsala původní data.';}
 const local=snapshot.maps[map.id],undo=[],redo=[];
 const loadSnapshot=source=>{const copy=structuredClone(source);Object.assign(local,copy.maps[map.id]);snapshot=copy;snapshot.maps[map.id]=local;};
 let mode='',draft=[],painting=false,currentBrush=null,highlightId=null,editingFeatureId=null,editVertex=null,editOriginal=null,editStartClient=null,routeExtendEndpoint=null;
 const $=selector=>area.querySelector(selector);
 const undoBtn=workspace.querySelector('[data-carto-undo]');
 const redoBtn=workspace.querySelector('[data-carto-redo]');
 const modeField=$('[data-carto-mode]'),title=$('[data-carto-title]'),note=$('[data-carto-note]'),color=$('[data-carto-color]'),opacity=$('[data-carto-opacity]');
 const fogRadius=$('[data-carto-fog-radius]'),layerArea=workspace.querySelector('[data-carto-layers]');
 // Per-map default brush size (km); the user can still change it during this view.
 const defaultFogRadius=map.id==='K5'?0.2:5;
 fogRadius.value=String(defaultFogRadius);
 const fogSection=$('[data-carto-fog-section]'),fogGate=$('[data-carto-fog-gate]');
 const fogAdvanced=$('[data-carto-fog-advanced]');
 const fogPassword=$('[data-carto-fog-password]'),fogError=$('[data-carto-fog-gate-error]');
 const dismissFogGate=()=>{fogGate.hidden=true;fogPassword.value='';fogError.textContent='';};
 // Every attempted expansion requires the password again. This is an interface
 // gate, not authentication: all browser-side source code is public.
 fogSection.querySelector('summary').addEventListener('click',event=>{
  if(fogSection.open){return;}
  event.preventDefault();fogPassword.value='';fogError.textContent='';fogGate.hidden=false;
  fogPassword.focus({preventScroll:true});
 });
 fogSection.addEventListener('toggle',()=>{
  if(!fogSection.open){fogAdvanced.open=false;if(mode.startsWith('fog-'))clearMode();}
 });
 $('[data-carto-fog-gate-form]').addEventListener('submit',event=>{
  event.preventDefault();
  if(fogPassword.value==='anakin'){dismissFogGate();fogSection.open=true;}
  else{fogError.textContent='Nesprávné heslo.';fogPassword.value='';fogPassword.focus({preventScroll:true});}
 });
 $('[data-carto-fog-gate-cancel]').addEventListener('click',dismissFogGate);
 const getFogRadius=()=>Math.max(.01,Math.min(500,Number(fogRadius.value)||defaultFogRadius));
 let draftRadiusKm=0;
 let hovered=null,selectedHit=null,hoverTimer=null,suppressHover=false;
 const hitMatches=(a,kind,id,index)=>!!a&&a.kind===kind&&a.id===id&&a.index===index;
 const hideHover=()=>{
  hovered=null;selectedHit=null;clearTimeout(hoverTimer);
  if(hoverDelete){hoverDelete.hidden=true;hoverDelete.classList.remove('is-party-history','atlas-carto-tip-only');}
 };
 const showHover=(kind,id,index,clientX,clientY)=>{
  if(suppressHover||mode&&mode!=='edit-points')return;
  // Hover can show an object's textual note, never the edit/delete controls.
  // A clicked selection stays fixed even when the pointer moves off the hit area.
  const chosen=hitMatches(selectedHit,kind,id,index);
  if(selectedHit&&!chosen)return;
  const same=hitMatches(hovered,kind,id,index);
  clearTimeout(hoverTimer);hovered={kind,id,index};if(!hoverDelete)return;
  if(!same){
   const rect=viewport.getBoundingClientRect(),w=rect.width,h=rect.height;
   const x=clientX-rect.left,y=clientY-rect.top;
   hoverDelete.style.left=`${Math.max(48,Math.min(w-48,x))}px`;
   hoverDelete.style.top=`${Math.max(4,Math.min(h-84,y+12))}px`;
  }
  const f=(kind==='feature'||kind==='vertex')?local.features.find(f=>f.id===id):null;
  hoverDelete.classList.toggle('is-party-history',kind==='history');
  hoverDelete.classList.toggle('atlas-carto-tip-only',!chosen);
  const tip=hoverDelete.querySelector('[data-carto-hover-tip]');
  // A text object needs no duplicate tooltip. Other objects retain their hover note.
  if(tip){const hasTip=!!f?.note&&f.type!=='text';tip.textContent=hasTip?`${f.title||names[f.type]}: ${f.note}`:'';tip.hidden=!hasTip;}
  // On a saved route vertex, offer BOTH editing (pencil) and shortening (cross).
  const edit=hoverDelete.querySelector('[data-carto-hover-edit]');if(edit)edit.hidden=!chosen||!(kind==='feature'||kind==='vertex'&&f?.type==='route');
  const del=hoverDelete.querySelector('[data-carto-hover-remove]');if(del){
   const isWholeRoute=kind==='feature'&&f?.type==='route';
   del.hidden=!chosen||isWholeRoute;
   del.title=kind==='history'?'Smazat trasu od tohoto bodu po pozici družiny':kind==='vertex'?'Zkrátit trasu k tomuto bodu':'Odstranit mapový objekt';
  }
  hoverDelete.hidden=!chosen&&!tip?.textContent;
 };
 const refreshBrushCursor=(clientX,clientY)=>{
  if(!brushCursor)return;
  if(!mode.startsWith('fog-')||!local.fog.enabled||clientX===null||!inMap(clientX,clientY)){brushCursor.hidden=true;return;}
  const r=getFogRadius()*map.pixelsPerKm*getCamera().zoom,rect=viewport.getBoundingClientRect();
  brushCursor.style.left=`${clientX-rect.left}px`;brushCursor.style.top=`${clientY-rect.top}px`;
  brushCursor.style.width=`${2*r}px`;brushCursor.style.height=`${2*r}px`;brushCursor.hidden=false;
 };
 const showStatus=s=>{status.textContent=s;};
 const save=(before,description='Změna')=>{
  const state=structuredClone(snapshot);
  let ok=false;try{if(!corrupt)ok=write?.(state)===true;}catch(e){console.error(e)}
  if(ok){undo.push({kind:'carto',snapshot:before});if(undo.length>30)undo.shift();redo.length=0;showStatus(`${description} byla uložena do kampaně.`);}
  else{loadSnapshot(before);showStatus('Atlas: cloudový zápis se nezdařil. Změna byla vrácena.');}
  redraw();return ok;
 };
 const commit=(change,label)=>{const before=structuredClone(snapshot);change();return save(before,label);};
 const applySnapshot=(target,to,redoAction=false)=>{
  const entry=target.pop();if(!entry)return;
  if(entry.kind==='markers'){
   if(!corrupt&&restoreMarkers?.(redoAction?entry.after:entry.before)){
    to.push(entry);showStatus('Změna vlastní značky byla vrácena/obnovena.');
   }else{target.push(entry);showStatus('Značku nebylo možné obnovit v cloudu.');}
   redraw();return;
  }
  const current=structuredClone(snapshot),next=entry.snapshot;
  let ok=false;try{if(!corrupt)ok=write?.(structuredClone(next))===true;}catch(e){console.error(e)}
  if(ok){to.push({kind:'carto',snapshot:current});loadSnapshot(next);showStatus('Změna Atlasu byla vrácena/obnovena.');}
  else{target.push(entry);showStatus('Atlas: vrácení nebylo možné uložit.');}
  redraw();
 };
 const paintSvg=()=>{
  svg.replaceChildren();const ns='http://www.w3.org/2000/svg';
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;svg.appendChild(el);return el;};
  const path=(points,close=false)=>points.map((p,i)=>`${i?'L':'M'}${screenPoint(p).x.toFixed(1)},${screenPoint(p).y.toFixed(1)}`).join(' ')+(close?' Z':'');
  const draw=(f,temporary=false)=>{
   const pts=f.points||[];if(!pts.length)return;
   const c=f.color||'#a03b24',sel=highlightId===f.id,sw=sel?5:temporary?3:2.6;
   if(f.type==='radius'){
    const p=screenPoint(pts[0]);const r=(f.radiusKm||0)*map.pixelsPerKm*getCamera().zoom;
    add('circle',{cx:p.x,cy:p.y,r,stroke:c,'stroke-width':sw,fill:c,'fill-opacity':f.opacity??'.10','stroke-dasharray':'7 5'});
    add('text',{x:p.x+10,y:p.y-9,fill:c,'font-size':'12','font-weight':'bold'},`${formatKm(f.radiusKm)} km`);
   }else if(f.type==='text'){
    const p=screenPoint(pts[0]);add('text',{x:p.x+6,y:p.y-7,fill:c,'font-size':'14','font-weight':'bold',stroke:'#f6e8cc','stroke-width':'3','paint-order':'stroke'},f.title||'Text');
   }else{
    if(pts.length<2)return;
    add('path',{d:path(pts,f.type==='area'),stroke:c,'stroke-width':sw,'stroke-linejoin':'round','stroke-linecap':'round',fill:f.type==='area'?c:'none','fill-opacity':f.opacity??'.18','stroke-dasharray':temporary?'4 3':'none'});
    if(f.type==='arrow'){
     const a=screenPoint(pts[pts.length-2]),b=screenPoint(pts[pts.length-1]);const ang=Math.atan2(b.y-a.y,b.x-a.x),sz=13;
     const q1={x:b.x-sz*Math.cos(ang-.53),y:b.y-sz*Math.sin(ang-.53)},q2={x:b.x-sz*Math.cos(ang+.53),y:b.y-sz*Math.sin(ang+.53)};
     add('path',{d:`M${q1.x} ${q1.y} L${b.x} ${b.y} L${q2.x} ${q2.y}`,fill:'none',stroke:c,'stroke-width':sw});
    }
    const center=screenPoint(pts[Math.floor(pts.length/2)]);
    const label=f.type==='route'?(f.title?`${f.title} · `:'')+`${formatKm(routeLength(pts,map))} km`:f.type==='area'?`${f.title||'Oblast'} · ${formatKm(polygonArea(pts,map))} km²`:f.title;
    if(label)add('text',{x:center.x+8,y:center.y-21,fill:c,'font-size':'12','font-weight':'bold',stroke:'#f6e8cc','stroke-width':'3','paint-order':'stroke','pointer-events':'none'},label.slice(0,76));
    if(f.type==='route'){
     // Vertex dots and independent live segment lengths, also for drafts and edits.
     // Distances come from map coordinates, so moving a vertex recalculates them.
     pts.forEach((pt,i)=>{
      const sp=screenPoint(pt);
      add('circle',{cx:sp.x,cy:sp.y,r:3.9,fill:'#fff5db',stroke:c,'stroke-width':'2','pointer-events':'none'});
      if(i===0)return;
      const a=screenPoint(pts[i-1]),dx=sp.x-a.x,dy=sp.y-a.y,len=Math.hypot(dx,dy);
      if(len<1)return;
      const offset=14*((i%2)?-1:1),mx=(a.x+sp.x)/2-dy/len*offset,my=(a.y+sp.y)/2+dx/len*offset;
      const label=formatRouteSegment(distance(pts[i-1],pt,map));
      const width=Math.max(42,label.length*6.3+11);
      add('rect',{x:mx-width/2,y:my-10,width,height:20,rx:4,fill:'#fff3db','fill-opacity':'.96',stroke:c,'stroke-width':'.9','pointer-events':'none'});
      add('text',{x:mx,y:my+3.5,'text-anchor':'middle',fill:'#443026','font-size':'11','font-weight':'bold','pointer-events':'none'},label);
     });
    }
   }
   if(!temporary){
    const hitAttrs={'data-carto-hit':'feature','data-carto-id':f.id,'class':'atlas-carto-hit',fill:'transparent',stroke:'transparent','stroke-width':Math.max(18,sw+12),'pointer-events':'stroke'};
    if(f.type==='radius'){
     const center=screenPoint(pts[0]);add('circle',{...hitAttrs,cx:center.x,cy:center.y,r:f.radiusKm*map.pixelsPerKm*getCamera().zoom,fill:'none'});
     // A broad center target makes even very large circles easy to select.
     add('circle',{'data-carto-hit':'feature','data-carto-id':f.id,'class':'atlas-carto-hit',cx:center.x,cy:center.y,r:17,stroke:'transparent',fill:'transparent','pointer-events':'all'});
    }else if(f.type==='text'){
     const p=screenPoint(pts[0]);add('rect',{...hitAttrs,x:p.x,y:p.y-26,width:Math.max(28,Math.min(230,(f.title||'Text').length*9)),height:33,fill:'transparent','pointer-events':'all'});
    }else add('path',{...hitAttrs,d:path(pts,f.type==='area'),fill:f.type==='area'?'transparent':'none','pointer-events':f.type==='area'?'all':'stroke'});
    if(f.type==='route'){
     // The saved route's nodes must be clickable BEFORE opening its editor.
     // Hit disks are placed AFTER the wide route hit path so the line's pencil
     // cannot intercept the node's shorten-route cross.
     pts.forEach((pt,i)=>{
      const p=screenPoint(pt),chosen=selectedHit?.kind==='vertex'&&selectedHit.id===f.id&&selectedHit.index===i;
      add('circle',{'data-carto-hit':'vertex','data-carto-id':f.id,'data-carto-index':i,
       'class':'atlas-carto-hit atlas-carto-route-vertex',cx:p.x,cy:p.y,r:chosen?13:12,
       fill:'transparent',stroke:'transparent','pointer-events':'all',cursor:'pointer'});
      if(chosen)add('circle',{cx:p.x,cy:p.y,r:6.7,fill:'#e9ca72',stroke:c,'stroke-width':2,'pointer-events':'none'});
     });
    }
   }
  };
  for(const f of local.features)if(local.layers[f.type]&&!(mode==='edit-points'&&editingFeatureId===f.id))draw(f);
  if(mode==='edit-points'&&editingFeatureId){
   const f=local.features.find(x=>x.id===editingFeatureId);
   if(f){const points=draft.length?draft:f.points;draw({...f,points,radiusKm:f.type==='radius'?draftRadiusKm:f.radiusKm},true);
    points.forEach((pt,i)=>{const sp=screenPoint(pt),chosen=selectedHit?.kind==='vertex'&&selectedHit.id===f.id&&selectedHit.index===i;
     add('circle',{cx:sp.x,cy:sp.y,r:chosen?10:8,fill:chosen?'#e9ca72':'#fff6e5',stroke:'#b73520','stroke-width':2,'pointer-events':'all',cursor:'grab', 'data-carto-hit':'vertex','data-carto-id':f.id,'data-carto-index':i});
    });
    if(f.type==='radius'){const center=screenPoint(points[0]);add('circle',{cx:center.x+draftRadiusKm*map.pixelsPerKm*getCamera().zoom,cy:center.y,r:9,fill:'#fff8e4',stroke:'#1c5e78','stroke-width':3,'pointer-events':'all',cursor:'ew-resize'});}
   }
  }
  if(local.layers.partyHistory&&local.partyHistory.length){
   const pts=local.partyHistory;
   add('path',{d:path(pts),stroke:'#33694e','stroke-width':'2.5','stroke-dasharray':'5 5',fill:'none'});
   pts.forEach((p,i)=>{const s=screenPoint(p);add('circle',{cx:s.x,cy:s.y,r:selectedHit?.kind==='history'&&selectedHit.index===i?7.2:4.5,fill:selectedHit?.kind==='history'&&selectedHit.index===i?'#e5c766':'#33694e',stroke:'#fff4db','stroke-width':selectedHit?.kind==='history'&&selectedHit.index===i?2.4:1.5});add('circle',{cx:s.x,cy:s.y,r:12,fill:'transparent',stroke:'none','pointer-events':'all','class':'atlas-carto-hit','data-carto-hit':'history','data-carto-index':i});});
  }
  if(draft.length&&mode!=='edit-points')draw({type:mode==='fog-reveal'||mode==='fog-cover'?'draw':mode,points:draft,color:color.value,title:'',radiusKm:draftRadiusKm,opacity:Number(opacity.value)},true);
 };
 // An opaque fog texture is rendered once per viewport size. A single binary
 // coverage mask controls exposure; repainting a covered area cannot stack fog.
 const fogTexture=document.createElement('canvas'),fogMask=document.createElement('canvas');
 let fogTextureWidth=0,fogTextureHeight=0;
 const paintFog=()=>{
  const ctx=fogCanvas.getContext('2d');if(!ctx)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;
  const bw=Math.round(w*dpr),bh=Math.round(h*dpr);
  if(fogCanvas.width!==bw||fogCanvas.height!==bh){fogCanvas.width=bw;fogCanvas.height=bh;}
  fogCanvas.style.width=`${w}px`;fogCanvas.style.height=`${h}px`;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,bw,bh);
  if(!local.fog.enabled){refreshBrushCursor(null,null);return;}
  if(fogTextureWidth!==bw||fogTextureHeight!==bh){
   fogTextureWidth=bw;fogTextureHeight=bh;fogTexture.width=bw;fogTexture.height=bh;
   const t=fogTexture.getContext('2d');t.setTransform(dpr,0,0,dpr,0,0);
   const base=t.createLinearGradient(0,0,w,h);base.addColorStop(0,'#626a72');base.addColorStop(.45,'#424d58');base.addColorStop(1,'#313d49');
   t.fillStyle=base;t.fillRect(0,0,w,h); // Fully opaque: no details are visible underneath.
   // Subtle cloudy, non-repeating highlights and shadow eddies.
   for(let i=0;i<65;i++){
    const xx=(Math.sin(i*127.1+17.7)*43758.5453%1+1)%1*w;
    const yy=(Math.sin(i*91.7+72.3)*12745.239%1+1)%1*h;
    const r=Math.max(24,Math.min(w,h)*(.13+(i%7)*.045));
    const g=t.createRadialGradient(xx,yy,0,xx,yy,r);
    g.addColorStop(0,i%3===0?'rgba(225,233,232,.18)':'rgba(20,29,36,.12)');g.addColorStop(1,'rgba(160,170,177,0)');
    t.fillStyle=g;t.fillRect(xx-r,yy-r,2*r,2*r);
   }
  }
  if(fogMask.width!==bw||fogMask.height!==bh){fogMask.width=bw;fogMask.height=bh;}
  const m=fogMask.getContext('2d');m.setTransform(dpr,0,0,dpr,0,0);m.globalCompositeOperation='source-over';m.clearRect(0,0,w,h);
  // Fog belongs ONLY to the cartographic image, not to the brown viewport,
  // row/column coordinate strips, or empty space exposed by zooming out.
  // Clip the actual coverage mask, including all cover/reveal brush strokes,
  // to the map image's projected rectangle in viewport coordinates.
  const camera=getCamera(),mapOrigin=screenPoint({x:0,y:0});
  m.save();m.beginPath();m.rect(mapOrigin.x,mapOrigin.y,map.width*camera.zoom,map.height*camera.zoom);m.clip();
  m.fillStyle='#000';m.fillRect(0,0,w,h);
  const applyStroke=stroke=>{
   const r=stroke.radiusKm*map.pixelsPerKm*getCamera().zoom;
   m.globalCompositeOperation=stroke.action==='reveal'?'destination-out':'source-over';
   m.strokeStyle='#000';m.fillStyle='#000';m.lineWidth=2*r;m.lineJoin='round';m.lineCap='round';
   if(!stroke.points.length)return;
   const path=stroke.points.map(screenPoint);
   m.beginPath();m.moveTo(path[0].x,path[0].y);
   for(let i=1;i<path.length;i++)m.lineTo(path[i].x,path[i].y);
   if(path.length>1)m.stroke();
   // Single-click stroke must erase/fill one complete circular brush footprint.
   for(const pt of [path[0],...(path.length>1?[path[path.length-1]]:[])]){m.beginPath();m.arc(pt.x,pt.y,r,0,Math.PI*2);m.fill();}
  };
  for(const stroke of local.fog.strokes)applyStroke(stroke);
  if(painting&&currentBrush)applyStroke(currentBrush);
  m.restore(); // End map-only clip before composing the texture with the mask.
  ctx.drawImage(fogTexture,0,0);
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(fogMask,0,0);ctx.globalCompositeOperation='source-over';
 };
 const list=(selector,items)=>{$(selector).replaceChildren();items.forEach(el=>$(selector).appendChild(el));};
 const button=(label,action,id)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.cartoAction=action;b.dataset.cartoId=id;return b;};
 const entry=(heading,actions,description='')=>{const row=document.createElement('div');row.className='atlas-carto-row';const label=document.createElement('div');label.textContent=heading;label.className='atlas-carto-row-title';row.append(label);if(description){const sub=document.createElement('small');sub.textContent=description;row.append(sub);}const controls=document.createElement('div');controls.className='atlas-carto-row-actions';for(const a of actions)controls.appendChild(button(a[0],a[1],a[2]));row.appendChild(controls);return row;};
 const centerAt=p=>zoomTo(p,1.07);
 const objectPoint=f=>f.points[Math.floor(f.points.length/2)];
 const redrawList=()=>{
  undoBtn.disabled=undo.length===0;redoBtn.disabled=redo.length===0;
  const editing=editingFeatureId?local.features.find(f=>f.id===editingFeatureId):null;
  const kind=editing?.type||mode;
  const fields=$('[data-carto-fields]');fields.hidden=!FEATURE_TYPES.includes(kind);
  fields.querySelectorAll('[data-carto-for]').forEach(el=>{el.hidden=!el.dataset.cartoFor.split(' ').includes(kind);});
  const saveMeta=$('[data-carto-save-meta]');saveMeta.hidden=!editing;saveMeta.disabled=!editing;
  const deleteRoute=$('[data-carto-delete-route]');deleteRoute.hidden=!(editing?.type==='route');deleteRoute.disabled=!(editing?.type==='route');
  const finish=$('[data-carto-finish]');finish.hidden=!(['route','area'].includes(mode));finish.disabled=!(draft.length>=(mode==='area'?3:2));
  const pointUndo=$('[data-carto-point-undo]');pointUndo.hidden=!(['route','area'].includes(mode));pointUndo.disabled=!draft.length;
  const hint=$('[data-carto-hint]');
  hint.textContent=editing?(editing.type==='route'?(routeExtendEndpoint!==null?`Prodlužování trasy: dalším kliknutím do mapy přidáte nový bod ${routeExtendEndpoint==='start'?'na začátek':'na konec'}. Body lze i přetahovat; Esc zachová uložené změny.`:'Body trasy lze pouze přemisťovat tažením. Nový úsek připojíte tužkou na prvním nebo posledním bodu. Kliknutí do prázdné mapy zde nový bod nevytvoří.'):'Vybraný objekt: tažením změňte polohu jeho bodů, kliknutím na mapu můžete přidat další bod. Změnu popisu uložte tlačítkem. Esc ukončí úpravy.'):mode==='radius'?'Stiskněte na mapě střed kružnice, táhněte k okraji a pusťte. Velikost i vzdálenost kruhu jsou vidět během tažení.':mode==='route'||mode==='area'?'Klikáním označte body. Nakonec stiskněte „Dokončit objekt“.':mode==='draw'||mode==='arrow'?'Držte tlačítko myši, nakreslete objekt a pusťte.':'Vyberte typ objektu. Jeho poznámku můžete kdykoliv upravit tužkou přímo na mapě.';
  $('[data-carto-fog-toggle]').textContent=local.fog.enabled?'Vypnout mlhu':'Zapnout mlhu';
  area.querySelectorAll('[data-carto-fog-brush]').forEach(btn=>btn.setAttribute('aria-pressed',String(mode===btn.dataset.cartoFogBrush)));
  if(layerArea){layerArea.replaceChildren();for(const key of VISIBLE_LAYER_TOGGLES){
   const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=local.layers[key];input.dataset.cartoLayer=key;
   label.append(input,document.createTextNode(' '+({route:'Trasy',area:'Oblasti',radius:'Kružnice dosahu',draw:'Volné kreslení',arrow:'Šipky',text:'Texty',markers:'Vlastní značky',partyHistory:'Historie družiny',fog:'Mlha války'}[key])));layerArea.appendChild(label);
  }}
 };
 const redraw=()=>{paintSvg();paintFog();redrawList();onLayersChange?.();};
 const clearMode=()=>{mode='';routeExtendEndpoint=null;draft=[];draftRadiusKm=0;painting=false;currentBrush=null;editingFeatureId=null;highlightId=null;editVertex=null;editOriginal=null;editStartClient=null;modeField.value='';viewport.classList.remove('is-cartographing');hideHover();refreshBrushCursor(null,null);redraw();};
 const setMode=value=>{if(value)onModeStart?.();mode=value;routeExtendEndpoint=null;draft=[];draftRadiusKm=0;painting=false;currentBrush=null;hideHover();editingFeatureId=null;highlightId=null;modeField.value=mode.startsWith('fog-')?'':value;viewport.classList.toggle('is-cartographing',!!mode);if(mode.startsWith('fog-')&&!local.fog.enabled){commit(()=>{local.fog.enabled=true;},'Zakrytí mapy');}refreshBrushCursor(null,null);redraw();};
 modeField.addEventListener('change',()=>setMode(modeField.value));
 const featureFromDraft=()=>({id:makeId(),type:mode,title:safeText(title.value,120),note:safeText(note.value,1500),date:'',color:color.value,opacity:Number(opacity.value),points:structuredClone(draft),...(mode==='radius'?{radiusKm:draftRadiusKm}:{})});
 const finishFeature=()=>{
  if(!draft.length)return;
  if(['route','area','draw','arrow'].includes(mode)&&draft.length<(mode==='area'?3:2))return;
  if(mode==='radius'&&draftRadiusKm<.01)return;
  if(local.features.length>=MAX_ITEMS){showStatus('Atlas: dosažen limit mapových objektů.');return;}
  const obj=featureFromDraft();
  if(commit(()=>{local.features.push(obj);},'Mapový objekt'))clearMode();
 };
 const addPoint=pt=>{
  if(!mode||!pt)return false;
  if(mode==='edit-points'){
   const f=local.features.find(x=>x.id===editingFeatureId);if(!f||f.points.length>=MAX_POINTS)return true;
   const pts=structuredClone(f.points);
   let insert=pts.length;
   // A saved route is extendable ONLY from one of its two endpoints.
   // Editing a middle vertex (or the line itself) must never add a branch
   // or insert an extra node by clicking on an empty part of the map.
   if(f.type==='route'){
    if(routeExtendEndpoint===null)return true;
    insert=routeExtendEndpoint==='start'?0:pts.length;
   }else{
    // Non-route polygons retain their existing closest-segment insertion.
    let best=Infinity;
    for(let i=0;i<pts.length-(f.type==='area'?0:1);i++){
     const a=pts[i],b=pts[(i+1)%pts.length],dx=b.x-a.x,dy=b.y-a.y;
     const t=Math.max(0,Math.min(1,((pt.x-a.x)*dx+(pt.y-a.y)*dy)/(dx*dx+dy*dy||1)));
     const d=Math.hypot(pt.x-a.x-dx*t,pt.y-a.y-dy*t);if(d<best){best=d;insert=i+1;}
    }
   }
   pts.splice(insert,0,pt);
   const id=f.id;
   const ok=commit(()=>{f.points=pts;},f.type==='route'?'Prodloužení trasy':'Nový vrchol');
   // Always restore the draft from the authoritative snapshot, including on
   // failed cloud writes, which may replace the feature object on rollback.
   draft=structuredClone(local.features.find(item=>item.id===id)?.points||[]);
   if(ok)hideHover();redraw();return true;
  }
  if(['fog-reveal','fog-cover'].includes(mode)){
   if(!currentBrush){if(local.fog.strokes.length>=MAX_FOG){showStatus('Atlas: limit štětcových tahů.');return true;}currentBrush={action:mode==='fog-reveal'?'reveal':'cover',radiusKm:getFogRadius(),points:[]};}
   const prev=currentBrush.points.at(-1),step=currentBrush.radiusKm*map.pixelsPerKm*.45;
   if(prev&&Math.hypot(pt.x-prev.x,pt.y-prev.y)<step)return true;
   if(prev){const count=Math.min(30,Math.floor(Math.hypot(pt.x-prev.x,pt.y-prev.y)/Math.max(2,step)));for(let i=1;i<count;i++)currentBrush.points.push({x:prev.x+(pt.x-prev.x)*i/count,y:prev.y+(pt.y-prev.y)*i/count});}
   currentBrush.points.push(pt);if(currentBrush.points.length>MAX_POINTS)currentBrush.points.splice(0,currentBrush.points.length-MAX_POINTS);paintFog();return true;
  }
  if(mode==='radius'){if(!draft.length){draft=[pt];draftRadiusKm=0;}else{draftRadiusKm=distance(draft[0],pt,map);finishFeature();}paintSvg();return true;}
  if(mode==='text'){draft=[pt];finishFeature();return true;}
  if(draft.length<MAX_POINTS){draft.push(pt);paintSvg();redrawList();}return true;
 };
 const pointerStart=(e)=>{
  if(!mode||e.button!==0)return false;
  const pt=inMap(e.clientX,e.clientY);if(!pt)return false;
  if(mode==='edit-points'){
   const f=local.features.find(x=>x.id===editingFeatureId);if(!f)return true;
   const points=draft.length?draft:f.points;
   let nearest=-1,dist=Infinity;
   points.forEach((p,i)=>{const v=screenPoint(p),d=Math.hypot(v.x-(e.clientX-viewport.getBoundingClientRect().left),v.y-(e.clientY-viewport.getBoundingClientRect().top));if(d<dist){dist=d;nearest=i;}});
   if(f.type==='radius'){
    const center=screenPoint(points[0]),handleX=center.x+draftRadiusKm*map.pixelsPerKm*getCamera().zoom;
    const pointerX=e.clientX-viewport.getBoundingClientRect().left,pointerY=e.clientY-viewport.getBoundingClientRect().top;
    if(Math.hypot(handleX-pointerX,center.y-pointerY)<=22){editVertex='radius';editOriginal=f.radiusKm;painting=true;return true;}
   }
   if(dist<=19){
    hideHover();editVertex=nearest;editOriginal=structuredClone(f.points);draft=structuredClone(f.points);
    editStartClient={x:e.clientX,y:e.clientY};painting=true;
   }
   return true;
  }
  if(mode==='radius'){if(!draft.length)draft=[pt];painting=true;draftRadiusKm=Math.max(0,distance(draft[0],pt,map));paintSvg();return true;}
  if(!['draw','arrow','fog-reveal','fog-cover'].includes(mode))return true;
  painting=true;
  if(['draw','arrow'].includes(mode))draft=[pt];else{currentBrush=null;addPoint(pt);}
  return true;
 };
 const pointerMove=e=>{
  if(!painting)return false;
  const pt=inMap(e.clientX,e.clientY);if(!pt)return true;
  if(mode==='edit-points'&&editVertex!==null){
   if(editStartClient&&Math.hypot(e.clientX-editStartClient.x,e.clientY-editStartClient.y)<4)return true;
   editStartClient=null;
   if(editVertex==='radius')draftRadiusKm=Math.max(.01,distance(draft[0],pt,map));else draft[editVertex]=pt;
   paintSvg();return true;
  }
  if(mode==='radius'){draftRadiusKm=distance(draft[0],pt,map);paintSvg();return true;}
  if(['draw','arrow'].includes(mode)){
   if(draft.length<MAX_POINTS&&(draft.length===0||Math.hypot(draft.at(-1).x-pt.x,draft.at(-1).y-pt.y)>2/getCamera().zoom)){draft.push(pt);paintSvg();}
  }else if(mode.startsWith('fog-'))addPoint(pt);
  return true;
 };
 const pointerEnd=()=>{
  if(!painting)return false;painting=false;
  if(mode==='edit-points'&&editVertex!==null){
   const f=local.features.find(x=>x.id===editingFeatureId),vertex=editVertex,start=editStartClient;
   editVertex=null;editStartClient=null;
   if(f&&start&&f.type==='route'&&Number.isInteger(vertex)){
    // No movement: select one vertex and offer a small, anchored delete control.
    selectedHit={kind:'vertex',id:f.id,index:vertex};
    const pt=screenPoint(f.points[vertex]),rect=viewport.getBoundingClientRect();
    showHover('vertex',f.id,vertex,rect.left+pt.x,rect.top+pt.y);
    paintSvg();return true;
   }
   if(f&&vertex==='radius'&&Math.abs(f.radiusKm-draftRadiusKm)>.00001){const next=draftRadiusKm;commit(()=>{f.radiusKm=next;},'Změna poloměru kružnice');}
   else if(f&&vertex!=='radius'&&JSON.stringify(f.points)!==JSON.stringify(draft)){const next=structuredClone(draft);commit(()=>{f.points=next;},'Přemístění vrcholu');}
   return true;
  }
  if(mode==='radius'){if(draftRadiusKm>=.01)finishFeature();else{paintSvg();}return true;}
  if(mode.startsWith('fog-')){
   const brush=currentBrush;currentBrush=null;
   if(brush?.points.length)commit(()=>{local.fog.strokes.push(brush);},'Tah mlhy');
  }else if(['draw','arrow'].includes(mode))finishFeature();
  return true;
 };
 $('[data-carto-finish]').addEventListener('click',finishFeature);
 $('[data-carto-point-undo]').addEventListener('click',()=>{
  if(mode==='edit-points'){
   const f=local.features.find(x=>x.id===editingFeatureId),min=f?.type==='area'?3:2;
   if(f&&f.points.length>min){commit(()=>{f.points.pop();},'Odebrání vrcholu');draft=structuredClone(f.points);}else return;
  }else draft.pop();redraw();
 });
 $('[data-carto-save-meta]').addEventListener('click',()=>{
  const f=local.features.find(x=>x.id===editingFeatureId);if(!f)return;
  const newTitle=title.value.slice(0,120),newNote=note.value.slice(0,1500),newColor=COLORS.includes(color.value)?color.value:COLORS[0];
  const newOpacity=Number(opacity.value);
  if(commit(()=>{f.title=newTitle;f.note=newNote;f.color=newColor;f.opacity=newOpacity;},'Popis mapového objektu'))clearMode();
 });
 $('[data-carto-delete-route]').addEventListener('click',()=>{
  const f=local.features.find(x=>x.id===editingFeatureId);
  if(!f||f.type!=='route')return;
  if(!window.confirm(`Opravdu odebrat celou trasu „${f.title||'Trasa'}“?`))return;
  if(commit(()=>{local.features.splice(local.features.indexOf(f),1);},'Odstranění celé trasy'))clearMode();
 });
 undoBtn.addEventListener('click',()=>applySnapshot(undo,redo));
 redoBtn.addEventListener('click',()=>applySnapshot(redo,undo,true));
 layerArea?.addEventListener('change',e=>{const key=e.target.dataset.cartoLayer;if(LAYERS.includes(key)){commit(()=>{local.layers[key]=e.target.checked;},'Viditelnost vrstvy');paintSvg();paintFog();onLayersChange?.();}});
 const addHistory=pt=>{
  if(!pt||local.partyHistory.length>=1000)return false;
  return commit(()=>{local.partyHistory.push({id:makeId(),x:pt.x,y:pt.y,date:'',note:''});},'Pohyb družiny');
 };
 $('[data-carto-fog-toggle]').addEventListener('click',()=>{if(mode.startsWith('fog-'))clearMode();commit(()=>{local.fog.enabled=!local.fog.enabled;},'Viditelnost mlhy');});
 area.querySelectorAll('[data-carto-fog-brush]').forEach(btn=>btn.addEventListener('click',()=>{const next=mode===btn.dataset.cartoFogBrush?'':btn.dataset.cartoFogBrush;setMode(next);}));
 fogRadius.addEventListener('input',()=>refreshBrushCursor(null,null));
 $('[data-carto-fog-reset]').addEventListener('click',()=>{if(window.confirm('Znovu zakrýt celou mapu a odstranit předchozí odhalení?'))commit(()=>{local.fog.enabled=true;local.fog.strokes=[];},'Zakrytí mapy');});
 $('[data-carto-fog-clear]').addEventListener('click',()=>{if(window.confirm('Odstranit všechno odhalování a vypnout mlhu?'))commit(()=>{local.fog.enabled=false;local.fog.strokes=[];},'Zakrytí mapy');});
 const openFeatureEditor=(f,argumentsVertex=null)=>{
  if(!f)return;
  clearMode();editingFeatureId=f.id;highlightId=f.id;mode='edit-points';draft=structuredClone(f.points);draftRadiusKm=f.type==='radius'?f.radiusKm:0;
  // Only the first and last route vertices may extend the route.
  // A middle vertex opens movement-only edit mode (no click-to-insert).
  routeExtendEndpoint=f.type==='route'&&Number.isInteger(argumentsVertex)
   ?(argumentsVertex===0?'start':argumentsVertex===f.points.length-1?'end':null):null;
  title.value=f.title;note.value=f.note;color.value=f.color;opacity.value=String(f.opacity??.18);
  modeField.closest('details').open=true;viewport.classList.add('is-cartographing');
  showStatus('Vybraný objekt: body upravíte přímo na mapě a poznámku vpravo. Esc ukončí úpravu.');
  redraw();
 };
 const deleteHovered=()=>{
  if(!hovered)return;
  const h=hovered;
  if(h.kind==='vertex'){
   const f=local.features.find(item=>item.id===h.id);
   // A route can be shortened by selecting one of its visible nodes directly,
   // whether or not its detailed editor is currently open.
   if(!f||f.type!=='route'||(mode&&!(mode==='edit-points'&&editingFeatureId===f.id)))return;
   const index=h.index;
   if(!Number.isInteger(index)||index<0||index>=f.points.length)return;
   // Keep the chosen vertex and all preceding segments. At the last vertex,
   // remove that terminal vertex/segment instead; never persist an invalid 1-point route.
   const keep=index===f.points.length-1?index:index+1;
   if(keep<2){showStatus('Trasa musí mít alespoň dva body. Pro odstranění celé trasy použijte tlačítko vpravo.');hideHover();paintSvg();return;}
   if(keep>=f.points.length){hideHover();return;}
   if(!window.confirm(`Opravdu zkrátit trasu „${f.title||'Trasa'}“ k vybranému bodu?`))return;
   hideHover();const remaining=f.points.slice(0,keep);
   commit(()=>{f.points=remaining;},'Zkrácení trasy');
   const latest=local.features.find(item=>item.id===f.id);if(latest)draft=structuredClone(latest.points);
   paintSvg();return;
  }
  if(h.kind==='feature'){
   const f=local.features.find(f=>f.id===h.id);
   if(!f||!window.confirm(`Opravdu odstranit ${names[f.type].toLowerCase()} „${f.title||names[f.type]}“ z mapy?`))return;
   hideHover();
   if(f)commit(()=>{local.features.splice(local.features.indexOf(f),1);if(highlightId===f.id)highlightId=null;if(editingFeatureId===f.id){editingFeatureId=null;clearMode();}},'Odstranění objektu');
  }else if(h.kind==='history'){
   if(Number.isInteger(h.index)&&h.index>=0&&h.index<local.partyHistory.length&&window.confirm('Opravdu smazat trasu družiny od tohoto bodu až do její aktuální polohy?')){
    hideHover();commit(()=>{local.partyHistory.splice(h.index);},'Zkrácení trasy družiny');
   }
  }
 };
 hoverDelete?.querySelector('[data-carto-hover-remove]')?.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();deleteHovered();});
 hoverDelete?.querySelector('[data-carto-hover-edit]')?.addEventListener('click',e=>{
  e.stopPropagation();e.preventDefault();
  const selected=hovered?{...hovered}:null;
  const f=local.features.find(item=>item.id===selected?.id);
  if(f){hideHover();openFeatureEditor(f,selected?.kind==='vertex'?selected.index:null);
   // Do not open the mobile soft keyboard when the user wants to extend a route.
   if(selected?.kind!=='vertex')note.focus({preventScroll:true});}
 });
 hoverDelete?.addEventListener('pointerenter',()=>clearTimeout(hoverTimer));
 hoverDelete?.addEventListener('pointerleave',()=>{hoverTimer=setTimeout(hideHover,600);});
 hoverDelete?.addEventListener('pointerdown',e=>e.stopPropagation());
 svg.addEventListener('pointerover',e=>{
  const hit=e.target.closest?.('[data-carto-hit]');if(!hit||(mode&&mode!=='edit-points'))return;
  showHover(hit.dataset.cartoHit,hit.dataset.cartoId,Number(hit.dataset.cartoIndex??-1),e.clientX,e.clientY);
 });
 svg.addEventListener('pointermove',e=>{
  suppressHover=false; // A real new pointer movement can show a note again after Esc.
  const hit=e.target.closest?.('[data-carto-hit]');if(!hit||(mode&&mode!=='edit-points'))return;
  showHover(hit.dataset.cartoHit,hit.dataset.cartoId,Number(hit.dataset.cartoIndex??-1),e.clientX,e.clientY);
 });
 svg.addEventListener('pointerout',e=>{
  if(selectedHit||!e.target.closest?.('[data-carto-hit]'))return;
  clearTimeout(hoverTimer);hoverTimer=setTimeout(hideHover,350);
 });
 svg.addEventListener('pointerdown',e=>{
  const hit=e.target.closest?.('[data-carto-hit]');if(!hit||(mode&&mode!=='edit-points'))return;
  if(mode==='edit-points'&&hit.dataset.cartoHit==='vertex')return; // keep draggable vertices
  e.preventDefault();e.stopPropagation();
  const kind=hit.dataset.cartoHit,id=hit.dataset.cartoId,index=Number(hit.dataset.cartoIndex??-1);
  suppressHover=false;
  if(hitMatches(selectedHit,kind,id,index)){hideHover();}
  else{selectedHit={kind,id,index};hovered=null;showHover(kind,id,index,e.clientX,e.clientY);}
  paintSvg(); // The clicked party-history dot grows slightly until dismissed.
 });
 viewport.addEventListener('pointerdown',e=>{
  if(selectedHit&&!e.target.closest?.('[data-carto-hit],.atlas-carto-hover-delete')){hideHover();paintSvg();}
 },true);
 const trackBrush=e=>{if(!mode.startsWith('fog-')||e.pointerType==='touch')return;refreshBrushCursor(e.clientX,e.clientY);};
 viewport.addEventListener('pointermove',trackBrush);
 viewport.addEventListener('pointerleave',()=>refreshBrushCursor(null,null));
 redraw();
 return {
  get active(){return !!mode;},
  get mode(){return mode;},
  pointerStart,pointerMove,pointerEnd,
  cancelGesture(){painting=false;currentBrush=null;if(['draw','arrow','radius'].includes(mode)){draft=[];draftRadiusKm=0;}redraw();},
  handleClick(clientX,clientY){return !!mode&&addPoint(inMap(clientX,clientY));},
  repaint(){paintSvg();paintFog();refreshBrushCursor(null,null);},
  stop:clearMode,
  escape(){
   let handled=false;
   if(!fogGate.hidden){dismissFogGate();handled=true;}
   if(mode||painting||editingFeatureId){
    painting=false;currentBrush=null;editVertex=null;clearMode();handled=true;
   }
   if(hovered||!hoverDelete.hidden){suppressHover=true;hideHover();clearTimeout(hoverTimer);paintSvg();handled=true;}
   if(fogSection.open){fogSection.open=false;handled=true;}
   return handled;
  },
  // Atlas markers are stored separately; layers hide them without touching the record.
  markersVisible(){return local.layers.markers;},
  recordPartyMove(item){if(item?.type==='party')addHistory(item);},
  discardPartyHistory(){local.partyHistory=[];snapshot.maps[map.id].partyHistory=[];undo.length=0;redo.length=0;hideHover();redraw();},
  recordMarkerChange(before,after){undo.push({kind:'markers',before:structuredClone(before),after:structuredClone(after)});if(undo.length>30)undo.shift();redo.length=0;redrawList();},
  onLayerChange:()=>{onLayersChange?.();}
 };
}
