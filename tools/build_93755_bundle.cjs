'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),bundle=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(bundle,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unknown bundle form');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-trekking-party-modes.js','src/integration/hmk-time-episodes.js'];
for(const name of changed){
 const file=path.join(root,name),source=fs.readFileSync(file,'utf8');
 const compiled=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 if(compiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compilation failed '+name);
 modules[name]=compiled.outputText;
}
fs.writeFileSync(bundle,prefix+JSON.stringify(modules)+old.slice(end));
console.log('PASS v93.755 bundle rebuild:',changed.length,'changed modules;',Object.keys(modules).length,'total');
