'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const original=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!original.startsWith(prefix)||!original.includes(marker))throw Error('Unexpected bundle format');
const end=original.indexOf(marker),modules=JSON.parse(original.slice(prefix.length,end));
for(const name of ['app.js','src/integration/hmk-time-episodes.js','src/integration/hmk-foraging-supply-ledger.js']){
 const source=fs.readFileSync(path.join(root,name),'utf8');
 const output=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(output.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Compile error '+name);
 if(!Object.hasOwn(modules,name))throw Error('Bundle missing '+name);
 modules[name]=output.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+original.slice(end));
console.log('PASS rebuilt',Object.keys(modules).length,'modules; synced 3 changed source modules');
