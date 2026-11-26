import {gzip,ungzip} from '../vendor/pako-1.0.11.js';

const PREFIX='hmk-campaign-gzip-v1:';
const COMPRESSION_THRESHOLD=1024*1024;

function encodeCheckpoint(json){
 if(json.length<COMPRESSION_THRESHOLD)return json;
 const bytes=gzip(new TextEncoder().encode(json),{level:3});
 const parts=[];
 for(let i=0;i<bytes.length;i+=16384)
  parts.push(String.fromCharCode(...bytes.subarray(i,i+16384)));
 const packed=PREFIX+btoa(parts.join(''));
 return packed.length<json.length?packed:json;
}

function decodeCheckpoint(stored){
 if(!stored?.startsWith(PREFIX))return stored;
 try{
  const bytes=Uint8Array.from(atob(stored.slice(PREFIX.length)),byte=>byte.charCodeAt(0));
  return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(ungzip(bytes));
 }catch(error){
  throw Error('Místní komprimovaná kampaň je nečitelná.',{cause:error});
 }
}

// Only the canonical campaign key is transformed. The exact JSON at this
// boundary is the value used by the existing write verifier and cloud sync.
export function createCampaignStorage(storage,campaignKey){
 let lastStored,lastDecoded;
 return {
  getItem(key){
   const stored=storage.getItem(key);
   if(key!==campaignKey)return stored;
   if(stored!==lastStored){
    lastDecoded=decodeCheckpoint(stored);
    lastStored=stored;
   }
   return lastDecoded;
  },
  setItem(key,value){
   storage.setItem(key,key===campaignKey?encodeCheckpoint(value):value);
  },
  removeItem(key){storage.removeItem(key);}
 };
}
