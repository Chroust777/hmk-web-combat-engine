// Run only on the server. Display each new personal key once.
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
const [file,role,name]=process.argv.slice(2);
if(!file||!['gm','player'].includes(role)||!name?.trim())throw Error('Použití: node chat/account.mjs /privatni/chat.json gm|player "Jméno"');
const lock=await open(file+'.lock','wx',0o600);
try{
 const config=JSON.parse(await readFile(file,'utf8'));if(!Array.isArray(config.accounts))throw Error('Chybí pole accounts.');
 const key=randomBytes(32).toString('base64url');
 config.accounts.push({id:randomUUID(),name:name.trim(),role,hash:createHash('sha256').update(key).digest('hex')});
 const tmp=file+'.'+randomUUID();
 await writeFile(tmp,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});await rename(tmp,file);
 console.log('Osobní klíč pro '+name+' (předejte soukromě): '+key);
}finally{await lock.close();await unlink(file+'.lock')}
