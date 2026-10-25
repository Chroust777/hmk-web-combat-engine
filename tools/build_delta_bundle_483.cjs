const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),prev='/mnt/data/hmk_work_93482/hmk-app.bundle.js',orig=fs.readFileSync(prev,'utf8');
const mark='(()=>{const MOD=';if(!orig.startsWith(mark))throw Error('Unknown source bundle');
let pos=mark.length,level=0,string=false,escaped=false;
for(;pos<orig.length;pos++){
 const c=orig[pos];if(string){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')string=false;continue;}
 if(c==='"'){string=true;continue}if(c==='{')level++;else if(c==='}'&&!--level){pos++;break;}
}
const mods=JSON.parse(orig.slice(mark.length,pos));if(Object.keys(mods).length!==316)throw Error('Expected 316 source modules');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
for(const rel of ['app.js','src/integration/hmk-skill-workbench-ui.js']){
 if(!mods[rel])throw Error('Unknown module '+rel);
 mods[rel]=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,allowJs:true}}).outputText;
}
fs.writeFileSync(path.join(root,'hmk-app.bundle.js'),mark+JSON.stringify(mods)+orig.slice(pos));
console.log('PASS: 316 modules; two precisely replaced');
