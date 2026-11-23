// Explicitly registered rule forms only. Controllers export data; restoring never submits.
const controllers=new WeakMap();
export function trackForm(form,kind,options,snapshot,restore){
 const identity=()=>JSON.stringify([kind,form.id,...Array.from(form.elements)
  .filter(x=>x.type==='hidden'&&/^(sourceId|actorId|targetId|characterId|woundId|index|episodeId|dayIndex|campaignId)$/.test(x.name))
  .map(x=>[x.name,x.value])]);
 const choices=()=>options.flatMap(name=>{const x=form.elements.namedItem(name);return x?[[name,x.value,x.checked??null]]:[]});
 controllers.set(form,{identity,snapshot:()=>({identity:identity(),choices:choices(),state:snapshot()}),
  restore(saved){
   for(const [name,v,checked] of saved.choices){const x=form.elements.namedItem(name);if(!options.includes(name)||!x)return false;
    x.value=v;if(typeof checked==='boolean')x.checked=checked}
   if(!restore(saved.state))return false;
   for(let el=form.parentElement;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;
   return true;
  }});
}
export function readFormWork(form){return controllers.get(form)?.snapshot()||null}
export function restoreFormWork(saved){
 if(!saved)return false;
 const matches=[...document.forms].map(f=>controllers.get(f)).filter(c=>c?.identity()===saved.identity);
 return matches.length===1&&matches[0].restore(saved);
}
