'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle format');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-trek-positions-93764.js','src/integration/hmk-travel-vehicle-93756.js'];
for(const name of changed){const source=fs.readFileSync(path.join(root,name),'utf8');
 const result=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compile failed '+name);
 modules[name]=result.outputText;}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(end));
console.log('PASS v93.764 build',changed.length,'modules',Object.keys(modules).length);
