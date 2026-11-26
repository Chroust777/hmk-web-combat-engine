const PREFIX='hmk-travel-draft-dictionary-v1\n';
// Witnesses contain repeated identifiers and field names, including inside
// quoted JSON. A dictionary substitutes only exact runs of safe characters.
const words=/[A-Za-z0-9_-]{4,}/g;

export function packTravelDraft(raw){
 const counts=new Map();
 for(const word of raw.match(words)||[])counts.set(word,(counts.get(word)||0)+1);
 const vocabulary=[];
 const references=new Map();
 for(const [word,count] of counts){
  if(count<2)continue;
  const ref='~'+vocabulary.length.toString(36)+'~';
  if(count*(word.length-ref.length)<=word.length+3)continue;
  vocabulary.push(word);
  references.set(word,ref);
 }
 const packed=PREFIX+JSON.stringify(vocabulary)+'\n'+raw.replace(/~|[A-Za-z0-9_-]{4,}/g,
  word=>word==='~'?'~~':references.get(word)??word);
 return packed.length<raw.length?packed:raw;
}

export function unpackTravelDraft(stored){
 if(!stored.startsWith(PREFIX))return stored;
 const end=stored.indexOf('\n',PREFIX.length);
 if(end<0)throw Error('Chybí slovník rozpracovaného cestování.');
 const vocabulary=JSON.parse(stored.slice(PREFIX.length,end));
 if(!Array.isArray(vocabulary)||!vocabulary.every(word=>typeof word==='string'&&/^[A-Za-z0-9_-]{4,}$/.test(word)))
  throw Error('Neplatný slovník rozpracovaného cestování.');
 return stored.slice(end+1).replace(/~~|~[0-9a-z]+~|~/g,token=>{
  if(token==='~~')return '~';
  const index=parseInt(token.slice(1,-1),36);
  if(!Object.hasOwn(vocabulary,index))throw Error('Neplatný odkaz ve slovníku rozpracovaného cestování.');
  return vocabulary[index];
 });
}
