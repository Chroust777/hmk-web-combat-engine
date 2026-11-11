'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle format');
const i=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,i));
for(const name of ['app.js','src/integration/hmk-pc-sheltered-stay-93730.js']){
 const output=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(output.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Compile error '+name);
 modules[name]=output.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(i));
console.log('PASS bundle',Object.keys(modules).length);
