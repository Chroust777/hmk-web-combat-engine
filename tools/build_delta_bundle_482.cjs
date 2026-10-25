const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),prev='/mnt/data/hmk_work_93481/hmk-app.bundle.js',orig=fs.readFileSync(prev,'utf8');
const mark='(()=>{const MOD=';if(!orig.startsWith(mark))throw Error('Unknown source bundle');
let pos=mark.length,level=0,string=false,esc=false;for(;pos<orig.length;pos++){
 const ch=orig[pos];if(string){if(esc)esc=false;else if(ch==='\\')esc=true;else if(ch==='"')string=false;continue}
 if(ch==='"'){string=true;continue;}if(ch==='{')level++;else if(ch==='}'&&!--level){pos++;break}
}
const mods=JSON.parse(orig.slice(mark.length,pos));if(Object.keys(mods).length!==316)throw Error('Expected 316 source modules');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
mods['app.js']=ts.transpileModule(fs.readFileSync(path.join(root,'app.js'),'utf8'),{fileName:'app.js',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,allowJs:true}}).outputText;
fs.writeFileSync(path.join(root,'hmk-app.bundle.js'),mark+JSON.stringify(mods)+orig.slice(pos));
console.log('PASS: 316 modules; app.js is the sole replaced module');
