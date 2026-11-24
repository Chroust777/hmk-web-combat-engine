/** Independent shared chat document. Never writes the campaign or its pending queue. */
export const CHAT_PATH='campaigns/hmk-ledger-chat.json';
export const CHAT_LOCAL_KEY='hmk-ledger-chat-v1';
export const CHAT_PALETTE=[['#ffffff','Bílá'],['#f6b9b9','Světle červená'],['#f4c1dc','Růžová'],['#ffd0a1','Oranžová'],['#fff39a','Žlutá'],['#cce8a1','Jarní zelená'],['#a8e0b8','Mátová'],['#a6e4df','Tyrkysová'],['#b4d8fa','Nebeská modrá'],['#c6c6f7','Levandulová'],['#e3c4f5','Fialová'],['#d4dce5','Stříbrná']];
// Read existing snapshots without changing their colors; the old sand is no longer offered.
const LEGACY_COLORS=['#e7cfa9','#f7d9d6','#dbe9cf','#d8e9f7','#e7ddf5','#fff0ba','#f6ddc7','#d7e9e5','#e5e5e5'];
export const GM_COLOR='#dbc08f', PC_COLOR='#ffffff';
const GM_LEGACY_COLORS=['#e7cfa9'];
const FORMAT='hmk-ledger-chat-v1';
export const chatId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
export const emptyChat=()=>({format:FORMAT,nextSequence:1,messages:[],speakers:[],chronicle:{entries:[],generatedAt:null,revision:0,manual:null,proseVersion:2}});
const colors=new Set([...CHAT_PALETTE.map(c=>c[0]),...LEGACY_COLORS,GM_COLOR,PC_COLOR]);
const str=(v,n)=>typeof v==='string'&&v.length<=n;
const id=v=>str(v,180)&&!!v;
const rev=v=>Number.isSafeInteger(v)&&v>=1;
const date=v=>str(v,40)&&Number.isFinite(Date.parse(v));
const unique=arr=>new Set(arr).size===arr.length;
const validAuthor=a=>a&&['gm','pc','custom'].includes(a.kind)&&id(a.id)&&str(a.name,120)&&a.name.trim()&&colors.has(a.color)&&(a.kind!=='gm'||(a.id==='gm'&&a.name==='GameMaster'&&[GM_COLOR,...GM_LEGACY_COLORS].includes(a.color)))&&(a.kind!=='pc'||a.color===PC_COLOR);
export function validateChat(d){
 if(!d||d.format!==FORMAT||!rev(d.nextSequence)||!Array.isArray(d.messages)||!Array.isArray(d.speakers)||!Array.isArray(d.chronicle?.entries))throw Error('Neplatný formát chatového JSONu. Nic nebylo přepsáno.');
 if(!d.messages.every(m=>m&&id(m.id)&&rev(m.sequence)&&m.sequence<d.nextSequence&&rev(m.revision)&&validAuthor(m.author)&&str(m.text,12000)&&m.text.trim()&&date(m.createdAt)&&date(m.updatedAt)&&id(m.lastOp)&&(m.gameDate===undefined||m.gameDate===null||str(m.gameDate,120)))||!unique(d.messages.map(m=>m.id))||!unique(d.messages.map(m=>m.sequence)))throw Error('Neplatné zprávy v chatovém JSONu.');
 if(!d.speakers.every(s=>s&&id(s.id)&&rev(s.revision)&&str(s.name,120)&&s.name.trim()&&colors.has(s.color)&&id(s.lastOp))||!unique(d.speakers.map(s=>s.id)))throw Error('Neplatná jména v chatovém JSONu.');
 if(!d.chronicle.entries.every(e=>e&&id(e.sourceId)&&rev(e.revision)&&rev(e.sequence)&&str(e.text,16000))||!unique(d.chronicle.entries.map(e=>e.sourceId))||(d.chronicle.generatedAt!==null&&!date(d.chronicle.generatedAt)))throw Error('Neplatná kronika v chatovém JSONu.');
 const c=d.chronicle;
 if(c.revision!==undefined&&(!Number.isSafeInteger(c.revision)||c.revision<0))throw Error('Neplatná revize kroniky.');
 if(c.manual!=null&&(!str(c.manual.text,400000)||!Number.isSafeInteger(c.manual.throughSequence)||c.manual.throughSequence<0))throw Error('Neplatná ruční úprava kroniky.');
 if(c.manualDays!==undefined&&(!Array.isArray(c.manualDays)||!c.manualDays.every(m=>m&&str(m.day,120)&&m.day.length>0&&str(m.text,400000)&&Number.isSafeInteger(m.throughSequence)&&m.throughSequence>=0)||!unique(c.manualDays.map(m=>m.day))))throw Error('Neplatné denní úpravy kroniky.');
 if(c.manual?.day!==undefined&&(!str(c.manual.day,120)||!c.manual.day))throw Error('Neplatné datum ruční úpravy kroniky.');
 if(!c.entries.every(e=>e.gameDay===undefined||str(e.gameDay,120)&&e.gameDay.length>0))throw Error('Neplatné datum zápisu kroniky.');
 return d;
}
const textValue=(v,max)=>{const s=String(v??'').trim();if(!s||s.length>max)throw Error('Vyplňte text (nejvýše '+max+' znaků).');return s;};
const copy=x=>structuredClone(x);
export const orderedMessages=d=>[...d.messages].sort((a,b)=>a.sequence-b.sequence);
export function chatPages(d){const all=orderedMessages(d);return {latest:all.slice(-50),archive:all.slice(0,Math.max(0,all.length-50))};}
// Local Czech prose, no invented outcomes or external requests. Preserve dialogue if
// it cannot be safely converted. Roll prompts/results use adjacent chat context.
const verbs={'jdu':'jde','vcházím':'vchází','vstupuji':'vstupuje','vstoupím':'vstoupí','otevírám':'otevírá','otevřu':'otevře','zavírám':'zavírá','zavřu':'zavře','beru':'bere','vezmu':'vezme','hledám':'hledá','prohlížím':'prohlíží','čekám':'čeká','sedám':'sedá','vstávám':'vstává','odcházím':'odchází','vracím':'vrací','přicházím':'přichází','poslouchám':'poslouchá','zvedám':'zvedá','pokračuji':'pokračuje','sleduji':'sleduje','ptám':'ptá','říkám':'říká','odpovídám':'odpovídá','chci':'chce','zkouším':'zkouší','snažím':'snaží','mám':'má','vidím':'vidí','slyším':'slyší','kupuji':'kupuje','platím':'platí','podávám':'podává','dávám':'dává','prosím':'prosí','volám':'volá','rozhlížím':'rozhlíží','vytahuji':'vytahuje','tasím':'tasí','útočím':'útočí','běžím':'běží','utíkám':'utíká','pomáhám':'pomáhá','házím':'hází','hodím':'hodí','ptám se':'ptá se'};
const finish=s=>!s||/[.!?…»”]$/.test(s)?s:s+'.';
const upper=s=>s.charAt(0).toLocaleUpperCase('cs')+s.slice(1);
const lower=s=>s.charAt(0).toLocaleLowerCase('cs')+s.slice(1);
const promptRoll=s=>/^\s*(?:([^,!.?\n]+),?\s+)?(?:hoď|hod|hoďte|hodte|házej|hazej|proveď|proved)\s+(?:si\s+)?(?:test\s+)?(?:na\s+)?([\p{L}][\p{L} &'\-]{0,60}?)(?:\s+(?:test|d100))?[.!?]?\s*$/iu.exec(s);
const rollValue=s=>/^\s*(?:hozeno|hodil(?:a)? jsem|hodil(?:a)?|padlo(?: mi)?|hod|výsledek|vysledek|d100)\s*[:=]?\s*(\d{1,3})\s*[.!]?\s*$/iu.exec(s)||/^\s*(\d{1,3})\s*$/.exec(s);
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('cs').trim();
function targetMatches(target,name){if(!target)return true;const a=fold(target),b=fold(name);return a===b||(a.length>=3&&b.length>=3&&a.slice(0,-1)===b.slice(0,-1))||a===b+'e'||a===b+'i'||a===b+'u';}
function cleanIntro(raw,name){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return raw.replace(new RegExp('^(?:Ahoj[,.! ]*|Dobrý den[,.! ]*)?(?:já\\s+)?(?:jak\\s+)?jsem\\s+'+escaped+'[.!?,\\s]+','iu'),'').trim();}
export function composeChatPassage(message,context={}){
 let raw=message.text.trim().replace(/\r\n/g,'\n');const name=message.author.name;
 if(message.author.kind==='gm'){
  if(context.skipPrompt)return '';
  // A direct second-person outcome immediately after a roll is narration about
  // that roller. Only rewrite clear Czech constructions, not uncertain claims.
  if(context.outcomeName){const past=/^([\p{L}]+)\s+jsi\s+([\s\S]+)$/iu.exec(raw);if(past&&/l[ao]?$/iu.test(past[1]))return finish(context.outcomeName+' '+lower(past[1])+' '+past[2]);const forms={'uspěl jsi':'uspěl','uspěla jsi':'uspěla','neuspěl jsi':'neuspěl','neuspěla jsi':'neuspěla','ztrácíš':'ztrácí','padáš':'padá','narážíš':'naráží','získáváš':'získává','nacházíš':'nachází','vidíš':'vidí','slyšíš':'slyší','daří se ti':'se daří','podařilo se ti':'se podařilo'};for(const [from,to] of Object.entries(forms))if(raw.toLocaleLowerCase('cs').startsWith(from+' '))return finish(context.outcomeName+' '+to+raw.slice(from.length));}
  return finish(raw);
 }
 const rolled=rollValue(raw);if(context.roll&&rolled&&Number(rolled[1])<=100)return `${name} si hází na ${context.roll[2]} a na d100 mu padlo (${Number(rolled[1])===0?100:Number(rolled[1])}).`;
 raw=cleanIntro(raw,name)||raw;
 const query=/^(?:chci se zeptat|rád bych se zeptal|ráda bych se zeptala|ptám se|zeptám se)\s+([\s\S]+)$/iu.exec(raw);
 if(query){let rest=query[1].replace(/,?\s+zda\s+nemá\s+(?:nějaké|nejake|něco|neco)\s+jídlo\s+na\s+prodej[.!?]?$/iu,', co má za jídlo na prodej').replace(/,?\s+zda\s+nemá\s+něco\s+na\s+prodej[.!?]?$/iu,', co má na prodej');return finish(name+' se ptá '+rest);}
 if(raw.startsWith(name+' '))return finish(raw);
 // Convert straightforward action openings, including common intentions. Preserve
 // direct speech verbatim for uncertain grammar, rather than assert a new action.
 const match=/^([\p{L}]+)(\s+[\s\S]+)$/u.exec(raw);
 if(match&&verbs[match[1].toLocaleLowerCase('cs')]&&!/\b(?:já|jsem|budu|můj|moje|mně)\b/iu.test(match[2])&&!/[,;:„“"].+|[.!?]\s+\S/u.test(match[2]))return finish(name+' '+verbs[match[1].toLocaleLowerCase('cs')]+match[2]);
 return `${name} říká: „${finish(raw.replace(/^„|“$/g,''))}“`;
}
// A stored manual edit is a protected prefix; subsequent generations append new
// passages. Source revisions remain tracked even for edited text.
export function chronicleText(c){const manual=c.manual;return [manual?.text,...c.entries.filter(e=>!manual||e.sequence>manual.throughSequence).map(e=>e.text)].filter(Boolean).join(' ');}
// Day keys come exclusively from the message's saved game-clock snapshot.
export const UNKNOWN_CHRONICLE_DAY='Herní datum nedoloženo';
export const LEGACY_CHRONICLE_DAY='Starší ruční kronika (více dnů)';
export const chatGameDay=value=>String(value??'').replace(/\s*·\s*\d{1,2}:\d{2}\s*$/u,'').trim()||UNKNOWN_CHRONICLE_DAY;
function datedEntries(d){const dates=new Map(d.messages.map(m=>[m.id,chatGameDay(m.gameDate)]));return d.chronicle.entries.map(e=>({...e,gameDay:e.gameDay||dates.get(e.sourceId)||UNKNOWN_CHRONICLE_DAY}));}
function legacyDay(c,entries){if(!c.manual)return null;if(c.manual.day)return c.manual.day;const days=[...new Set(entries.filter(e=>e.sequence<=c.manual.throughSequence).map(e=>e.gameDay))];return days.length===1?days[0]:LEGACY_CHRONICLE_DAY;}
function hydrateChronicle(d){const c=d.chronicle;c.entries=datedEntries(d);if(c.manual&&!c.manual.day)c.manual.day=legacyDay(c,c.entries);}
// A multi-day legacy manual text cannot safely be split. Keep it as a separate
// readable/editable item, alongside the original generated daily passages.
export function chronicleDays(d){const c=d.chronicle,entries=datedEntries(d),groups=new Map();
 for(const e of [...entries].sort((a,b)=>a.sequence-b.sequence)){if(!groups.has(e.gameDay))groups.set(e.gameDay,[]);groups.get(e.gameDay).push(e);}
 const edits=new Map((c.manualDays||[]).map(m=>[m.day,m]));const legacy=legacyDay(c,entries);if(legacy&&!edits.has(legacy))edits.set(legacy,c.manual);
 for(const day of edits.keys())if(!groups.has(day))groups.set(day,[]);
 return [...groups].map(([day,items])=>{const manual=edits.get(day),tail=items.filter(e=>!manual||e.sequence>manual.throughSequence).map(e=>e.text.replace(/\s+/gu,' ').trim()).filter(Boolean).join(' ');return {day,text:manual?manual.text+(manual.text&&tail&&!/\s$/u.test(manual.text)?' ':'')+tail:tail,count:items.length,throughSequence:Math.max(manual?.throughSequence||0,...items.map(e=>e.sequence),0)};});
}
export function buildChatChronicle(d,at){
 hydrateChronicle(d);const c=d.chronicle,previous=new Map(c.entries.map(e=>[e.sourceId,e])),all=orderedMessages(d),contexts=new Map(),pending=[];
 for(let i=0;i<all.length;i++){const m=all[i];if(m.author.kind==='gm'){const p=promptRoll(m.text);if(p)pending.push({m,p,i});else {const prior=all[i-1],ctx=prior&&contexts.get(prior.id);if(ctx?.roll)contexts.set(m.id,{outcomeName:prior.author.name,key:`${prior.id}:${prior.revision}:${ctx.key}`});}continue;}
  const r=rollValue(m.text);if(!r||Number(r[1])>100)continue;
  const idx=pending.findLastIndex(x=>i-x.i<=12&&targetMatches(x.p[1],m.author.name));if(idx<0)continue;const {m:request,p}=pending.splice(idx,1)[0];contexts.set(request.id,{skipPrompt:true,key:`${m.id}:${m.revision}`});contexts.set(m.id,{roll:p,key:`${request.id}:${request.revision}`});}
 let changed=0;const entries=all.map(m=>{const old=previous.get(m.id),ctx=contexts.get(m.id)||{},contextKey=ctx.key||'';if(c.proseVersion===2&&old&&old.revision===m.revision&&old.sequence===m.sequence&&(old.contextKey||'')===contextKey)return old;changed++;return {sourceId:m.id,revision:m.revision,sequence:m.sequence,contextKey,gameDay:chatGameDay(m.gameDate),text:composeChatPassage(m,ctx)};});
 const live=new Set(all.map(m=>m.id)),removed=c.entries.filter(e=>!live.has(e.sourceId)).length;if(!changed&&!removed)return {changed,removed};
 d.chronicle={...c,entries,generatedAt:at,proseVersion:2,revision:(c.revision||0)+1};return {changed,removed};
}
export function applyChatOperation(doc,op){
 const d=copy(validateChat(doc));hydrateChronicle(d);
 if(!id(op?.opId)||!date(op.at))throw Error('Neplatná operace chatu.');
 let result={};
 const check=(item)=>{if(!item)throw Error('Položka již neexistuje. Obnovte chat.');if(item.revision!==op.revision)throw Error('Položku mezitím změnilo jiné zařízení. Načtěte aktuální stav a upravte ji znovu.');};
 switch(op.type){
 case 'send':{
  if(!validAuthor(op.author)||op.author.kind==='pc'||(op.gm?op.author.kind!=='gm':op.author.kind!=='custom'))throw Error('Nejdříve vyberte jméno.');
  const existing=d.messages.find(m=>m.id===op.id);if(existing){if(existing.lastOp===op.opId)return {doc:d,result,changed:false};throw Error('Duplicitní identifikátor zprávy.');}
  // A removed custom identity cannot be used to send a new message.
  if(op.author.kind==='custom'){const s=d.speakers.find(s=>s.id===op.author.id);if(!s)throw Error('Toto jméno již není dostupné. Vyberte jiné.');op={...op,author:{kind:'custom',id:s.id,name:s.name,color:s.color}};}
  d.messages.push({id:op.id,sequence:d.nextSequence++,revision:1,author:copy(op.author),text:textValue(op.text,12000),createdAt:op.at,updatedAt:op.at,gameDate:str(op.gameDate,120)?op.gameDate:null,lastOp:op.opId});break;}
 case 'edit-message':{
  const m=d.messages.find(m=>m.id===op.id);if(m?.lastOp===op.opId)return {doc:d,result,changed:false};check(m);if(!op.gm&&m.author.kind==='gm')throw Error('Zprávu GameMastera může upravit jen GameMaster.');m.text=textValue(op.text,12000);m.revision++;m.updatedAt=op.at;m.lastOp=op.opId;break;}
 case 'delete-message':{
  const m=d.messages.find(m=>m.id===op.id);if(!m)return {doc:d,result,changed:false};check(m);if(!op.gm&&m.author.kind==='gm')throw Error('Zprávu GameMastera může odstranit jen GameMaster.');d.messages=d.messages.filter(x=>x.id!==op.id);break;}
 case 'save-speaker':{
  if(!op.gm)throw Error('Jména spravuje pouze GameMaster.');const name=textValue(op.name,120),color=op.color;if(!CHAT_PALETTE.some(c=>c[0]===color)&&!d.speakers.some(s=>s.id===op.id&&s.color===color))throw Error('Vyberte barvu z palety.');if(name.toLocaleLowerCase('cs')==='gamemaster')throw Error('Toto jméno je vyhrazené GameMasterovi.');
  const s=d.speakers.find(s=>s.id===op.id);if(s?.lastOp===op.opId)return {doc:d,result,changed:false};
  if(d.speakers.some(x=>x.id!==op.id&&x.name.toLocaleLowerCase('cs')===name.toLocaleLowerCase('cs')))throw Error('Toto jméno již existuje.');
  if(op.revision){check(s);Object.assign(s,{name,color,revision:s.revision+1,lastOp:op.opId});}else{if(s)throw Error('Duplicitní jméno.');d.speakers.push({id:op.id,name,color,revision:1,lastOp:op.opId});}break;}
 case 'delete-speaker':{
  if(!op.gm)throw Error('Jména spravuje pouze GameMaster.');const s=d.speakers.find(s=>s.id===op.id);if(!s)return {doc:d,result,changed:false};check(s);d.speakers=d.speakers.filter(x=>x.id!==op.id);break;}
 case 'chronicle':
  if(!op.gm)throw Error('Kroniku vytváří pouze GameMaster.');result=buildChatChronicle(d,op.at);if(!result.changed&&!result.removed)return {doc:d,result,changed:false};break;
 case 'edit-chronicle': case 'clear-chronicle':{
  if(!op.gm)throw Error('Kroniku upravuje pouze GameMaster.');const c=d.chronicle;if(c.lastOp===op.opId)return {doc:d,result,changed:false};if((c.revision||0)!==op.revision)throw Error('Kroniku mezitím změnilo jiné zařízení.');
  if(op.type==='clear-chronicle'){d.chronicle={entries:[],generatedAt:null,manual:null,proseVersion:2,revision:(c.revision||0)+1,lastOp:op.opId};}
  else{if(!str(op.text,400000))throw Error('Kronika je příliš dlouhá.');if(op.day!==undefined){const day=chronicleDays(d).find(x=>x.day===op.day);if(!day)throw Error('Vybraný den již v kronice neexistuje.');c.manualDays=[...(c.manualDays||[]).filter(m=>m.day!==op.day),{day:op.day,text:op.text,throughSequence:day.throughSequence}];}else{c.manual={text:op.text,throughSequence:Math.max(c.manual?.throughSequence||0,...c.entries.map(e=>e.sequence),0)};}c.revision=(c.revision||0)+1;c.lastOp=op.opId;}break;}
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
