/** Hârn Atlas cartography v94.064. Independent annotations only, no rules engine linkage. */
const MAP_IDS=['overview','K5'];
const FEATURE_TYPES=['route','area','radius','draw','arrow','text'];
const LAYERS=['route','area','radius','draw','arrow','text','markers','partyHistory','fog'];
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
const distance=(a,b,map)=>Math.hypot(a.x-b.x,a.y-b.y)/map.pixelsPerKm;
const routeLength=(pts,map)=>pts.slice(1).reduce((acc,p,i)=>acc+distance(pts[i],p,map),0);
const polygonArea=(pts,map)=>Math.abs(pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p.x*q.y-p.y*q.x;},0))/(2*map.pixelsPerKm**2);
const names={route:'Trasa',area:'Oblast',radius:'Dosah',draw:'Kresba',arrow:'Šipka',text:'Text'};
export function atlasCartographyPanel(){
 return `<section class="atlas-tool-card atlas-cartography" aria-label="Kartografické nástroje" data-atlas-carto>
 <h3>✎ Kartografické nástroje</h3>
 <div class="atlas-carto-top"><button type="button" data-carto-undo disabled>Zpět</button><button type="button" data-carto-redo disabled>Znovu</button><button type="button" data-carto-stop>Ukončit nástroj</button></div>
 <details open><summary>Trasy, oblasti a kreslení</summary>
  <label>Nástroj<select data-carto-mode><option value="">— Vyberte nástroj —</option><option value="route">Uložit trasu</option><option value="area">Zakreslit oblast a změřit plochu</option><option value="radius">Kružnice dosahu</option><option value="draw">Kreslení od ruky</option><option value="arrow">Šipka</option><option value="text">Textová poznámka na mapě</option><option value="edit-points">Upravit body vybraného objektu</option><option value="fog-reveal">Mlha: odhalovat</option><option value="fog-cover">Mlha: znovu zakrývat</option></select></label>
  <label>Název / text<input data-carto-title maxlength="120" placeholder="Název trasy, oblasti…"></label>
  <label>Poznámka<textarea data-carto-note maxlength="1500" rows="2" placeholder="Volitelná poznámka"></textarea></label>
  <label>Herní datum (volitelné)<input data-carto-date maxlength="80" placeholder="Např. 15. Nolus 720 TR"></label>
  <label>Barva<select data-carto-color>${COLORS.map((c,i)=>`<option value="${c}">${['Červená','Modrá','Zelená','Fialová','Zlatá','Hnědá'][i]}</option>`).join('')}</select></label>
  <label>Průhlednost vyplněných oblastí<select data-carto-opacity><option value="0.10">10 %</option><option value="0.18" selected>18 %</option><option value="0.35">35 %</option><option value="0.50">50 %</option></select></label>
  <label>Dosah / šířka štětce (km)<input type="number" data-carto-radius min="0.01" max="500" step="0.5" value="10"></label>
  <p class="atlas-carto-hint" data-carto-hint>Vyberte nástroj. Vícebodové trasy a oblasti ukončíte tlačítkem Uložit. Při úpravě bodů přetáhněte vrchol; kliknutí mimo vrchol přidá bod.</p>
  <div class="atlas-carto-actions"><button type="button" data-carto-save-meta disabled>Uložit změny popisu</button><button data-carto-finish type="button" disabled>Uložit objekt</button><button data-carto-point-undo type="button" disabled>Zpět bod</button><button data-carto-cancel type="button">Zrušit kreslení</button></div>
 </details>
 <details><summary>Vrstvy mapy</summary><div data-carto-layers class="atlas-carto-layers"></div></details>
 <details><summary>Vyhledávání a rychlý přesun</summary><input data-carto-search placeholder="Název značky, trasy, sektoru…" maxlength="120"><div data-carto-search-results class="atlas-carto-list"></div></details>
 <details><summary>Mapové záložky</summary><div class="atlas-carto-actions"><input data-carto-bookmark-name placeholder="Název záložky" maxlength="120"><button type="button" data-carto-bookmark-add>Uložit pohled</button></div><div data-carto-bookmarks class="atlas-carto-list"></div></details>
 <details><summary>Historie pohybu družiny</summary><p class="atlas-carto-hint">Přesunutí pozice družiny se může zaznamenat do historie. Záznam lze přidat i ručně z aktuální polohy.</p><div class="atlas-carto-actions"><button type="button" data-carto-history-add>Zapsat aktuální polohu</button><button type="button" data-carto-history-clear>Vymazat historii</button></div><div data-carto-history class="atlas-carto-list"></div></details>
 <details><summary>Mlha války</summary><p class="atlas-carto-hint">Samostatná vrstva Atlasu. Zapněte zakrytí mapy a štětcem odhalujte či zakrývejte. Neovlivňuje herní systém.</p><div class="atlas-carto-actions"><button type="button" data-carto-fog-toggle>Zapnout mlhu</button><button type="button" data-carto-fog-reset>Obnovit úplné zakrytí</button><button type="button" data-carto-fog-clear>Odstranit mlhu</button></div></details>
 <details open><summary>Uložené objekty na mapě (<span data-carto-count>0</span>)</summary><div data-carto-objects class="atlas-carto-list"></div></details>
 <p class="atlas-marker-save-note">Mapové poznámky se synchronizují přes společný soukromý GitHub JSON. Zpět/Znovu platí v aktuálně otevřeném Atlasu.</p>
 </section>`;
}

/** The caller owns the map view and the EXISTING guarded campaign persistence. */
export function mountAtlasCartography({workspace,viewport,map,read,write,screenPoint,inMap,getCamera,setCamera,zoomTo,markers,selectMarker,openSector,status,onModeStart,onLayersChange,restoreMarkers}){
 const area=workspace.querySelector('[data-atlas-carto]');
 const svg=workspace.querySelector('[data-atlas-carto-overlay]');
 const fogCanvas=workspace.querySelector('[data-atlas-fog]');
 if(!area||!svg||!fogCanvas)return null;
 let snapshot,corrupt=false;try{snapshot=normalizeAtlasCartography(read?.(),{overview:{width:2449,height:2363},K5:{width:4172,height:4031}});}catch(e){console.error('Atlas cartography:',e);snapshot=atlasCartographyEmpty();corrupt=true;status.textContent='Atlas: uložená kartografie je neplatná. Zápisy jsou zablokovány, aby se nepřepsala původní data.';}
 const local=snapshot.maps[map.id],undo=[],redo=[];
 const loadSnapshot=source=>{const copy=structuredClone(source);Object.assign(local,copy.maps[map.id]);snapshot=copy;snapshot.maps[map.id]=local;};
 let mode='',draft=[],painting=false,currentBrush=null,highlightId=null,editingFeatureId=null,editVertex=null,editOriginal=null;
 const $=selector=>area.querySelector(selector);
 const modeField=$('[data-carto-mode]'), title=$('[data-carto-title]'),note=$('[data-carto-note]'),date=$('[data-carto-date]'),color=$('[data-carto-color]'),opacity=$('[data-carto-opacity]'),radius=$('[data-carto-radius]');
 const getRadius=()=>Math.max(.01,Math.min(500,Number(radius.value)||10));
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
    const p=screenPoint(pts[0]);const r=f.radiusKm*map.pixelsPerKm*getCamera().zoom;
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
    const label=f.type==='route'?`${f.title||'Trasa'} · ${formatKm(routeLength(pts,map))} km`:f.type==='area'?`${f.title||'Oblast'} · ${formatKm(polygonArea(pts,map))} km²`:f.title;
    if(label)add('text',{x:center.x+8,y:center.y-12,fill:c,'font-size':'12','font-weight':'bold',stroke:'#f6e8cc','stroke-width':'3','paint-order':'stroke'},label.slice(0,76));
   }
  };
  for(const f of local.features)if(local.layers[f.type])draw(f);
  if(mode==='edit-points'&&editingFeatureId){
   const f=local.features.find(x=>x.id===editingFeatureId);
   if(f){const points=draft.length?draft:f.points;draw({...f,points},true);
    for(const pt of points){const sp=screenPoint(pt);add('circle',{cx:sp.x,cy:sp.y,r:7,fill:'#fff6e5',stroke:'#b73520','stroke-width':2});}
   }
  }
  if(local.layers.partyHistory&&local.partyHistory.length>1){
   const pts=local.partyHistory;
   add('path',{d:path(pts),stroke:'#33694e','stroke-width':'2.5','stroke-dasharray':'5 5',fill:'none'});
   pts.forEach((p,i)=>{const s=screenPoint(p);add('circle',{cx:s.x,cy:s.y,r:4,fill:'#33694e',stroke:'#fff4db','stroke-width':1.5});});
  }
  if(draft.length&&mode!=='edit-points')draw({type:mode==='fog-reveal'||mode==='fog-cover'?'draw':mode,points:draft,color:color.value,title:''},true);
 };
 const paintFog=()=>{
  const ctx=fogCanvas.getContext('2d');if(!ctx)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;
  fogCanvas.width=Math.round(w*dpr);fogCanvas.height=Math.round(h*dpr);fogCanvas.style.width=`${w}px`;fogCanvas.style.height=`${h}px`;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(!local.fog.enabled||!local.layers.fog)return;
  ctx.fillStyle='rgba(22,20,18,.91)';ctx.fillRect(0,0,w,h);
  for(const stroke of local.fog.strokes){
   ctx.globalCompositeOperation=stroke.action==='reveal'?'destination-out':'source-over';
   const rr=stroke.radiusKm*map.pixelsPerKm*getCamera().zoom;
   ctx.fillStyle=stroke.action==='reveal'?'#000':'rgba(22,20,18,.91)';
   for(const pt of stroke.points){const p=screenPoint(pt);ctx.beginPath();ctx.arc(p.x,p.y,rr,0,Math.PI*2);ctx.fill();}
  }
  if(painting&&currentBrush){ctx.globalCompositeOperation=currentBrush.action==='reveal'?'destination-out':'source-over';ctx.fillStyle=currentBrush.action==='reveal'?'#000':'rgba(22,20,18,.91)';const r=currentBrush.radiusKm*map.pixelsPerKm*getCamera().zoom;for(const pt of currentBrush.points){const p=screenPoint(pt);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();}}
  ctx.globalCompositeOperation='source-over';
 };
 const list=(selector,items)=>{$(selector).replaceChildren();items.forEach(el=>$(selector).appendChild(el));};
 const button=(label,action,id)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.cartoAction=action;b.dataset.cartoId=id;return b;};
 const entry=(heading,actions,description='')=>{const row=document.createElement('div');row.className='atlas-carto-row';const label=document.createElement('div');label.textContent=heading;label.className='atlas-carto-row-title';row.append(label);if(description){const sub=document.createElement('small');sub.textContent=description;row.append(sub);}const controls=document.createElement('div');controls.className='atlas-carto-row-actions';for(const a of actions)controls.appendChild(button(a[0],a[1],a[2]));row.appendChild(controls);return row;};
 const centerAt=p=>zoomTo(p,1.07);
 const objectPoint=f=>f.points[Math.floor(f.points.length/2)];
 const redrawList=()=>{
  $('[data-carto-undo]').disabled=undo.length===0;$('[data-carto-redo]').disabled=redo.length===0;
  $('[data-carto-save-meta]').disabled=!editingFeatureId;
  $('[data-carto-finish]').disabled=!(['route','area'].includes(mode)&&draft.length>=(mode==='area'?3:2));
  $('[data-carto-point-undo]').disabled=mode==='edit-points'?!(editingFeatureId&&draft.length>(local.features.find(f=>f.id===editingFeatureId)?.type==='area'?3:2)):!draft.length;
  $('[data-carto-count]').textContent=String(local.features.length);
  list('[data-carto-objects]',local.features.map(f=>entry(`${names[f.type]}: ${f.title||'Bez názvu'}`,[['Zobrazit','show',f.id],['Upravit','edit',f.id],...(f.points.length>1?[['Body','edit-points',f.id]]:[]),['Smazat','remove',f.id]],f.type==='route'?`${formatKm(routeLength(f.points,map))} km`:f.type==='area'?`${formatKm(polygonArea(f.points,map))} km²`:f.note.slice(0,60))));
  list('[data-carto-bookmarks]',local.bookmarks.map(b=>entry(b.title,[['Přejít','bookmark',b.id],['Smazat','del-bookmark',b.id]])));
  list('[data-carto-history]',local.partyHistory.map((h,i)=>entry(`${i+1}. ${h.date||'Bez data'}`,[['Přejít','history',h.id],['Smazat','del-history',h.id]],h.note)));
  $('[data-carto-fog-toggle]').textContent=local.fog.enabled?'Vypnout mlhu':'Zapnout mlhu';
  const layerArea=$('[data-carto-layers]');layerArea.replaceChildren();
  for(const key of LAYERS){const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.checked=local.layers[key];input.dataset.cartoLayer=key;label.append(input,document.createTextNode(' '+({route:'Trasy',area:'Oblasti',radius:'Kružnice dosahu',draw:'Volné kreslení',arrow:'Šipky',text:'Texty',markers:'Vlastní značky',partyHistory:'Historie družiny',fog:'Mlha války'}[key])));layerArea.appendChild(label);}
  search();
 };
 const search=()=>{
  const q=$('[data-carto-search]').value.trim().toLocaleLowerCase('cs-CZ');const results=[];
  if(q){
   for(const item of markers())if([item.name,item.description,item.type].some(s=>String(s).toLocaleLowerCase('cs-CZ').includes(q)))results.push(entry(`⌖ ${item.name||'Značka'}`,[['Přejít','find-marker',item.id]]));
   for(const f of local.features)if([f.title,f.note,f.type,f.date].some(s=>String(s).toLocaleLowerCase('cs-CZ').includes(q)))results.push(entry(`${names[f.type]}: ${f.title||'Bez názvu'}`,[['Přejít','show',f.id]]));
   if(map.id==='overview'&&/^[ijkl][4567]$/i.test(q))results.push(entry(`Sektor ${q.toUpperCase()}`,[['Přejít','sector',q.toUpperCase()]]));
  }
  list('[data-carto-search-results]',results.slice(0,60));
 };
 const redraw=()=>{paintSvg();paintFog();redrawList();onLayersChange?.();};
 const clearMode=()=>{mode='';draft=[];painting=false;currentBrush=null;editingFeatureId=null;editVertex=null;editOriginal=null;modeField.value='';viewport.classList.remove('is-cartographing');redraw();};
 const setMode=value=>{if(value)onModeStart?.();mode=value;draft=[];painting=false;currentBrush=null;if(value!=='edit-points')editingFeatureId=null;viewport.classList.toggle('is-cartographing',!!mode);if(mode.startsWith('fog-')&&!local.fog.enabled){commit(()=>{local.fog.enabled=true;},'Mlha války');}redraw();};
 modeField.addEventListener('change',()=>setMode(modeField.value));
 const featureFromDraft=()=>({id:makeId(),type:mode,title:safeText(title.value,120),note:safeText(note.value,1500),date:safeText(date.value,80),color:color.value,opacity:Number(opacity.value),points:structuredClone(draft),...(mode==='radius'?{radiusKm:getRadius()}:{})});
 const finishFeature=()=>{
  if(!draft.length)return;
  if(['route','area','draw','arrow'].includes(mode)&&draft.length<(mode==='area'?3:2))return;
  if(local.features.length>=MAX_ITEMS){showStatus('Atlas: dosažen limit mapových objektů.');return;}
  const obj=featureFromDraft();
  if(commit(()=>{local.features.push(obj);},'Mapový objekt'))clearMode();
 };
 const addPoint=pt=>{
  if(!mode||!pt)return false;
  if(mode==='edit-points'){
   const f=local.features.find(x=>x.id===editingFeatureId);if(!f||f.points.length>=MAX_POINTS)return true;
   const pts=structuredClone(f.points);
   let best=Infinity,insert=pts.length;
   for(let i=0;i<pts.length-(f.type==='area'?0:1);i++){
    const a=pts[i],b=pts[(i+1)%pts.length],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((pt.x-a.x)*dx+(pt.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    const d=Math.hypot(pt.x-a.x-dx*t,pt.y-a.y-dy*t);if(d<best){best=d;insert=i+1;}
   }
   pts.splice(insert,0,pt);commit(()=>{f.points=pts;},'Nový vrchol');draft=structuredClone(f.points);redraw();return true;
  }
  if(['fog-reveal','fog-cover'].includes(mode)){
   if(!currentBrush){if(local.fog.strokes.length>=MAX_FOG){showStatus('Atlas: limit štětcových tahů.');return true;}currentBrush={action:mode==='fog-reveal'?'reveal':'cover',radiusKm:getRadius(),points:[]};}
   const prev=currentBrush.points.at(-1),step=currentBrush.radiusKm*map.pixelsPerKm*.45;
   if(prev&&Math.hypot(pt.x-prev.x,pt.y-prev.y)<step)return true;
   if(prev){const count=Math.min(30,Math.floor(Math.hypot(pt.x-prev.x,pt.y-prev.y)/Math.max(2,step)));for(let i=1;i<count;i++)currentBrush.points.push({x:prev.x+(pt.x-prev.x)*i/count,y:prev.y+(pt.y-prev.y)*i/count});}
   currentBrush.points.push(pt);if(currentBrush.points.length>MAX_POINTS)currentBrush.points.splice(0,currentBrush.points.length-MAX_POINTS);paintFog();return true;
  }
  if(mode==='radius'){draft=[pt];finishFeature();return true;}
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
   if(dist<=19){editVertex=nearest;editOriginal=structuredClone(f.points);draft=structuredClone(f.points);painting=true;}
   return true;
  }
  if(!['draw','arrow','fog-reveal','fog-cover'].includes(mode))return true;
  painting=true;
  if(['draw','arrow'].includes(mode))draft=[pt];else{currentBrush=null;addPoint(pt);}
  return true;
 };
 const pointerMove=e=>{
  if(!painting)return false;
  const pt=inMap(e.clientX,e.clientY);if(!pt)return true;
  if(mode==='edit-points'&&editVertex!==null){draft[editVertex]=pt;paintSvg();return true;}
  if(['draw','arrow'].includes(mode)){
   if(draft.length<MAX_POINTS&&(draft.length===0||Math.hypot(draft.at(-1).x-pt.x,draft.at(-1).y-pt.y)>2/getCamera().zoom)){draft.push(pt);paintSvg();}
  }else if(mode.startsWith('fog-'))addPoint(pt);
  return true;
 };
 const pointerEnd=()=>{
  if(!painting)return false;painting=false;
  if(mode==='edit-points'&&editVertex!==null){
   const f=local.features.find(x=>x.id===editingFeatureId);editVertex=null;
   if(f&&JSON.stringify(f.points)!==JSON.stringify(draft)){const next=structuredClone(draft);commit(()=>{f.points=next;},'Přemístění vrcholu');}
   return true;
  }
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
  const newTitle=title.value.slice(0,120),newNote=note.value.slice(0,1500),newDate=date.value.slice(0,80),newColor=COLORS.includes(color.value)?color.value:COLORS[0];
  const newRadius=getRadius(),newOpacity=Number(opacity.value);
  commit(()=>{f.title=newTitle;f.note=newNote;f.date=newDate;f.color=newColor;f.opacity=newOpacity;if(f.type==='radius')f.radiusKm=newRadius;},'Popis mapového objektu');
 });
 $('[data-carto-cancel]').addEventListener('click',clearMode);
 $('[data-carto-stop]').addEventListener('click',clearMode);
 $('[data-carto-undo]').addEventListener('click',()=>applySnapshot(undo,redo));
 $('[data-carto-redo]').addEventListener('click',()=>applySnapshot(redo,undo,true));
 $('[data-carto-search]').addEventListener('input',search);
 $('[data-carto-layers]').addEventListener('change',e=>{const key=e.target.dataset.cartoLayer;if(LAYERS.includes(key)){commit(()=>{local.layers[key]=e.target.checked;},'Viditelnost vrstvy');paintSvg();paintFog();onLayersChange?.();}});
 $('[data-carto-bookmark-add]').addEventListener('click',()=>{
  const title=$('[data-carto-bookmark-name]').value.trim()||`Pohled ${local.bookmarks.length+1}`;
  const cam=getCamera();const x=Math.max(0,Math.min(map.width,cam.centerX)),y=Math.max(0,Math.min(map.height,cam.centerY));
  if(local.bookmarks.length>=150)return;
  commit(()=>local.bookmarks.push({id:makeId(),title:title.slice(0,120),x,y,zoom:cam.zoom}),'Mapová záložka');$('[data-carto-bookmark-name]').value='';
 });
 const addHistory=(pt)=>{
  if(!pt||local.partyHistory.length>=1000)return false;
  const entry={id:makeId(),x:pt.x,y:pt.y,date:date.value.trim().slice(0,80),note:note.value.trim().slice(0,500)};
  return commit(()=>{local.partyHistory.push(entry);},'Poloha družiny');
 };
 $('[data-carto-history-add]').addEventListener('click',()=>{
  const p=markers().find(item=>item.type==='party');if(!p){showStatus('Nejdříve umístěte značku Pozice družiny.');return;}
  addHistory(p);
 });
 $('[data-carto-history-clear]').addEventListener('click',()=>{if(local.partyHistory.length&&window.confirm('Smazat celou historii pohybu družiny na této mapě?'))commit(()=>{local.partyHistory=[];},'Historie družiny');});
 $('[data-carto-fog-toggle]').addEventListener('click',()=>commit(()=>{local.fog.enabled=!local.fog.enabled;},'Viditelnost mlhy'));
 $('[data-carto-fog-reset]').addEventListener('click',()=>{if(window.confirm('Znovu zakrýt celou mapu a odstranit předchozí odhalení?'))commit(()=>{local.fog.enabled=true;local.fog.strokes=[];},'Mlha války');});
 $('[data-carto-fog-clear]').addEventListener('click',()=>{if(window.confirm('Odstranit všechno odhalování a vypnout mlhu?'))commit(()=>{local.fog.enabled=false;local.fog.strokes=[];},'Mlha války');});
 area.addEventListener('click',e=>{
  const btn=e.target.closest('[data-carto-action]');if(!btn)return;
  const action=btn.dataset.cartoAction,id=btn.dataset.cartoId;
  const f=local.features.find(x=>x.id===id),b=local.bookmarks.find(x=>x.id===id),h=local.partyHistory.find(x=>x.id===id);
  if(action==='show'&&f){highlightId=id;centerAt(objectPoint(f));redraw();}
  if(action==='find-marker')selectMarker(id);
  if(action==='sector'&&map.id==='overview'){
   if(id==='K5'){openSector?.('K5');return;}
   const col='IJKL'.indexOf(id[0]),row=Number(id[1])-4;
   if(col>=0&&row>=0&&row<4)centerAt({x:map.width*(col+.5)/4,y:map.height*(row+.5)/4});
  }
  if(action==='remove'&&f&&window.confirm(`Smazat ${names[f.type].toLowerCase()} „${f.title||'Bez názvu'}“?`))commit(()=>{local.features.splice(local.features.indexOf(f),1);highlightId=null;},'Odstranění objektu');
  if((action==='edit'||action==='edit-points')&&f){
   editingFeatureId=f.id;highlightId=f.id;
   title.value=f.title;note.value=f.note;date.value=f.date;color.value=f.color;
   if(f.type==='radius')radius.value=String(f.radiusKm);
   opacity.value=String(f.opacity??0.18);
   const details=modeField.closest('details');details.open=true;
   if(action==='edit-points'){
    setMode('edit-points');modeField.value='edit-points';draft=structuredClone(f.points);
    showStatus('Přetáhněte vrchol mapového objektu nebo klikněte pro přidání bodu. Změny se ukládají automaticky.');
   }else{
    clearMode();editingFeatureId=f.id;modeField.closest('details').open=true;
    showStatus('Upravte název, poznámku, datum, barvu nebo dosah a klikněte na Uložit změny popisu.');
   }
   centerAt(objectPoint(f));redraw();
  }
  if(action==='bookmark'&&b)setCamera({centerX:b.x,centerY:b.y,zoom:b.zoom});
  if(action==='del-bookmark'&&b)commit(()=>local.bookmarks.splice(local.bookmarks.indexOf(b),1),'Smazání záložky');
  if(action==='history'&&h)centerAt(h);
  if(action==='del-history'&&h)commit(()=>local.partyHistory.splice(local.partyHistory.indexOf(h),1),'Smazání záznamu');
 });
 redraw();
 return {
  get active(){return !!mode;},
  get mode(){return mode;},
  pointerStart,pointerMove,pointerEnd,
  cancelGesture(){painting=false;currentBrush=null;if(['draw','arrow'].includes(mode))draft=[];redraw();},
  handleClick(clientX,clientY){return !!mode&&addPoint(inMap(clientX,clientY));},
  repaint(){paintSvg();paintFog();},
  stop:clearMode,
  // Atlas markers are stored separately; layers hide them without touching the record.
  markersVisible(){return local.layers.markers;},
  refreshSearch:search,
  recordPartyMove(item){if(item?.type==='party')addHistory(item);},
  recordMarkerChange(before,after){undo.push({kind:'markers',before:structuredClone(before),after:structuredClone(after)});if(undo.length>30)undo.shift();redo.length=0;redrawList();},
  onLayerChange:()=>{onLayersChange?.();}
 };
}
