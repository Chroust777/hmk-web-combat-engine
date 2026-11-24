/** Independent shared chat document. Never writes the campaign or its pending queue. */
export const CHAT_PATH='campaigns/hmk-ledger-chat.json';
export const CHAT_LOCAL_KEY='hmk-ledger-chat-v1';
export const CHAT_PALETTE=[['#e7cfa9','Písková'],['#f7d9d6','Růžová'],['#dbe9cf','Zelená'],['#d8e9f7','Modrá'],['#e7ddf5','Fialová'],['#fff0ba','Žlutá'],['#f6ddc7','Broskvová'],['#d7e9e5','Tyrkysová'],['#e5e5e5','Šedá']];
export const GM_COLOR='#e7cfa9', PC_COLOR='#ffffff';
const FORMAT='hmk-ledger-chat-v1';
export const chatId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
export const emptyChat=()=>({format:FORMAT,nextSequence:1,messages:[],speakers:[],chronicle:{entries:[],generatedAt:null}});
const colors=new Set([...CHAT_PALETTE.map(c=>c[0]),PC_COLOR]);
const str=(v,n)=>typeof v==='string'&&v.length<=n;
const id=v=>str(v,180)&&!!v;
const rev=v=>Number.isSafeInteger(v)&&v>=1;
const date=v=>str(v,40)&&Number.isFinite(Date.parse(v));
const unique=arr=>new Set(arr).size===arr.length;
const validAuthor=a=>a&&['gm','pc','custom'].includes(a.kind)&&id(a.id)&&str(a.name,120)&&a.name.trim()&&colors.has(a.color)&&(a.kind!=='gm'||(a.id==='gm'&&a.name==='GameMaster'&&a.color===GM_COLOR))&&(a.kind!=='pc'||a.color===PC_COLOR);
export function validateChat(d){
 if(!d||d.format!==FORMAT||!rev(d.nextSequence)||!Array.isArray(d.messages)||!Array.isArray(d.speakers)||!Array.isArray(d.chronicle?.entries))throw Error('Neplatný formát chatového JSONu. Nic nebylo přepsáno.');
 if(!d.messages.every(m=>m&&id(m.id)&&rev(m.sequence)&&m.sequence<d.nextSequence&&rev(m.revision)&&validAuthor(m.author)&&str(m.text,12000)&&m.text.trim()&&date(m.createdAt)&&date(m.updatedAt)&&id(m.lastOp))||!unique(d.messages.map(m=>m.id))||!unique(d.messages.map(m=>m.sequence)))throw Error('Neplatné zprávy v chatovém JSONu.');
 if(!d.speakers.every(s=>s&&id(s.id)&&rev(s.revision)&&str(s.name,120)&&s.name.trim()&&CHAT_PALETTE.some(c=>c[0]===s.color)&&id(s.lastOp))||!unique(d.speakers.map(s=>s.id)))throw Error('Neplatná jména v chatovém JSONu.');
 if(!d.chronicle.entries.every(e=>e&&id(e.sourceId)&&rev(e.revision)&&rev(e.sequence)&&str(e.text,16000))||!unique(d.chronicle.entries.map(e=>e.sourceId))||(d.chronicle.generatedAt!==null&&!date(d.chronicle.generatedAt)))throw Error('Neplatná kronika v chatovém JSONu.');
 return d;
}
const textValue=(v,max)=>{const s=String(v??'').trim();if(!s||s.length>max)throw Error('Vyplňte text (nejvýše '+max+' znaků).');return s;};
const copy=x=>structuredClone(x);
export const orderedMessages=d=>[...d.messages].sort((a,b)=>a.sequence-b.sequence);
export function chatPages(d){const all=orderedMessages(d);return {latest:all.slice(-50),archive:all.slice(0,Math.max(0,all.length-50))};}
// Conservative local prose: don't invent actions, places, motives or outcomes.
// Common first-person action openings can be converted to third person, otherwise
// retain the precise account in a quoted literary attribution. GM narration is verbatim.
const verbs={'jdu':'jde','vcházím':'vchází','vstupuji':'vstupuje','vstoupím':'vstoupí','otevírám':'otevírá','otevřu':'otevře','zavírám':'zavírá','zavřu':'zavře','beru':'bere','vezmu':'vezme','hledám':'hledá','prohlížím':'prohlíží','čekám':'čeká','sedám':'sedá','vstávám':'vstává','odcházím':'odchází','vracím':'vrací','přicházím':'přichází','poslouchám':'poslouchá','zvedám':'zvedá','pokračuji':'pokračuje','sleduji':'sleduje','ptám':'ptá','říkám':'říká','odpovídám':'odpovídá'};
const finish=s=>/[.!?…»”]$/.test(s)?s:s+'.';
export function composeChatPassage(message){
 const raw=message.text.trim().replace(/\r\n/g,'\n');
 if(message.author.kind==='gm')return finish(raw);
 const name=message.author.name;
 const match=/^([\p{L}]+)(\s+[^\n]+)$/u.exec(raw);
 // Only uncomplicated, single-clause present/future statements can be rewritten.
 // A second clause, first-person pronoun, or quotation must stay exactly as written.
 if(match&&verbs[match[1].toLocaleLowerCase('cs')]&&!/[,;:„“".!?].+|\b(?:já|mě|mne|mně|mi|můj|moje|mé|mým|svůj|svoje|své|jsem|budu|chci)\b/iu.test(match[2])&&!/\b(?:a|ale|potom|pak|nebo|aby|protože|když)\b/iu.test(match[2]))return finish(name+' '+verbs[match[1].toLocaleLowerCase('cs')]+match[2]);
 if(raw.startsWith(name+' '))return finish(raw);
 return `V zápisu postavy ${name} stojí: „${raw.replace(/^„|“$/g,'')}“`;
}
export function buildChatChronicle(d,at){
 const previous=new Map(d.chronicle.entries.map(e=>[e.sourceId,e]));let changed=0;
 const entries=orderedMessages(d).map(m=>{const old=previous.get(m.id);if(old&&old.revision===m.revision&&old.sequence===m.sequence)return old;changed++;return {sourceId:m.id,revision:m.revision,sequence:m.sequence,text:composeChatPassage(m)};});
 const live=new Set(d.messages.map(m=>m.id));const removed=d.chronicle.entries.filter(e=>!live.has(e.sourceId)).length;
 if(!changed&&!removed)return {changed,removed};
 d.chronicle={entries,generatedAt:at};return {changed,removed};
}
export function applyChatOperation(doc,op){
 const d=copy(validateChat(doc));
 if(!id(op?.opId)||!date(op.at))throw Error('Neplatná operace chatu.');
 let result={};
 const check=(item)=>{if(!item)throw Error('Položka již neexistuje. Obnovte chat.');if(item.revision!==op.revision)throw Error('Položku mezitím změnilo jiné zařízení. Načtěte aktuální stav a upravte ji znovu.');};
 switch(op.type){
 case 'send':{
  if(!validAuthor(op.author))throw Error('Nejdříve vyberte jméno.');
  const existing=d.messages.find(m=>m.id===op.id);if(existing){if(existing.lastOp===op.opId)return {doc:d,result,changed:false};throw Error('Duplicitní identifikátor zprávy.');}
  // A removed custom identity cannot be used to send a new message.
  if(op.author.kind==='custom'){const s=d.speakers.find(s=>s.id===op.author.id);if(!s)throw Error('Toto jméno již není dostupné. Vyberte jiné.');op={...op,author:{kind:'custom',id:s.id,name:s.name,color:s.color}};}
  d.messages.push({id:op.id,sequence:d.nextSequence++,revision:1,author:copy(op.author),text:textValue(op.text,12000),createdAt:op.at,updatedAt:op.at,lastOp:op.opId});break;}
 case 'edit-message':{
  const m=d.messages.find(m=>m.id===op.id);if(m?.lastOp===op.opId)return {doc:d,result,changed:false};check(m);if(!op.gm&&m.author.kind==='gm')throw Error('Zprávu GameMastera může upravit jen GameMaster.');m.text=textValue(op.text,12000);m.revision++;m.updatedAt=op.at;m.lastOp=op.opId;break;}
 case 'delete-message':{
  const m=d.messages.find(m=>m.id===op.id);if(!m)return {doc:d,result,changed:false};check(m);if(!op.gm&&m.author.kind==='gm')throw Error('Zprávu GameMastera může odstranit jen GameMaster.');d.messages=d.messages.filter(x=>x.id!==op.id);break;}
 case 'save-speaker':{
  if(!op.gm)throw Error('Jména spravuje pouze GameMaster.');const name=textValue(op.name,120),color=op.color;if(!CHAT_PALETTE.some(c=>c[0]===color))throw Error('Vyberte barvu z palety.');if(name.toLocaleLowerCase('cs')==='gamemaster')throw Error('Toto jméno je vyhrazené GameMasterovi.');
  const s=d.speakers.find(s=>s.id===op.id);if(s?.lastOp===op.opId)return {doc:d,result,changed:false};
  if(d.speakers.some(x=>x.id!==op.id&&x.name.toLocaleLowerCase('cs')===name.toLocaleLowerCase('cs')))throw Error('Toto jméno již existuje.');
  if(op.revision){check(s);Object.assign(s,{name,color,revision:s.revision+1,lastOp:op.opId});}else{if(s)throw Error('Duplicitní jméno.');d.speakers.push({id:op.id,name,color,revision:1,lastOp:op.opId});}break;}
 case 'delete-speaker':{
  if(!op.gm)throw Error('Jména spravuje pouze GameMaster.');const s=d.speakers.find(s=>s.id===op.id);if(!s)return {doc:d,result,changed:false};check(s);d.speakers=d.speakers.filter(x=>x.id!==op.id);break;}
 case 'chronicle':
  if(!op.gm)throw Error('Kroniku vytváří pouze GameMaster.');result=buildChatChronicle(d,op.at);if(!result.changed&&!result.removed)return {doc:d,result,changed:false};break;
 default:throw Error('Neznámá operace chatu.');
 }
 return {doc:validateChat(d),result,changed:true};
}
export function createChatRepository({storage,connection,stale=()=>false}){
 const local=()=>{const raw=storage.getItem(CHAT_LOCAL_KEY);return raw===null?emptyChat():validateChat(JSON.parse(raw));};
 function current(){const c=connection();if(c?.configured&&!c.ready)throw Error('Chat: připojení soukromého GitHub Cloud není připravené.');return c?.configured?c:null;}
 const checkSize=d=>{const raw=JSON.stringify(d);if(new TextEncoder().encode(raw).length>900000)throw Error('Chatový JSON dosáhl limitu 900 KB. Žádná zpráva nebyla přepsána.');return raw;};
 async function read(){const c=current();if(!c)return {doc:local(),scope:'local'};const r=await c.read();return {doc:r?validateChat(JSON.parse(r.raw)):emptyChat(),scope:c.scope};}
 async function commit(op,expectedScope){
  if(stale())throw Error('Nejdříve obnovte novou verzi aplikace.');
  const c=current(),scope=c?.scope||'local';if(expectedScope!==scope)throw Error('Připojení chatu se změnilo. Obnovte chat před zápisem.');
  if(!c){const r=applyChatOperation(local(),op);if(r.changed)storage.setItem(CHAT_LOCAL_KEY,checkSize(r.doc));return {...r,scope};}
  // Read latest and CAS. Concurrent sends merge; conflicting edits do not overwrite.
  for(let attempt=0;attempt<4;attempt++){
   if(stale())throw Error('Nejdříve obnovte novou verzi aplikace.');
   const remote=await c.read();const d=remote?validateChat(JSON.parse(remote.raw)):emptyChat();const r=applyChatOperation(d,op);
   if(!r.changed)return {...r,scope};
   try{await c.write(checkSize(r.doc),remote?.sha||null);return {...r,scope};}catch(e){if(![409,422].includes(e.httpStatus)||attempt===3)throw e;}
  }
 }
 return {read,commit};
}
