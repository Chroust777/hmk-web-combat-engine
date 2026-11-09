'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const file=path.join(root,'hmk-app.bundle.js'),raw=fs.readFileSync(file,'utf8');
const prefix='(()=>{const MOD=',split=';const CACHE={};';if(!raw.startsWith(prefix)||!raw.includes(split))throw Error('Unexpected bundle');
const cut=raw.indexOf(split),modules=JSON.parse(raw.slice(prefix.length,cut));
const changes=['app.js','src/integration/hmk-gm-health-override.js'];
for(const name of changes){
 if(!Object.hasOwn(modules,name))throw Error('Module is not in production bundle: '+name);
 const r=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,allowJs:true},reportDiagnostics:true});
 if(r.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Syntax error '+name);
 modules[name]=r.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+raw.slice(cut));
console.log('PASS 93.798 production bundle regenerated from '+changes.join(', ')+'. '+Object.keys(modules).length+' modules');
