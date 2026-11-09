'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js'),old=fs.readFileSync(file,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
for(const name of ['app.js','src/integration/hmk-episode-fixed-93773.js','src/integration/hmk-time-episodes.js','src/integration/hmk-library-ranged-filters-93805.js']){
 const source=fs.readFileSync(path.join(root,name),'utf8');
 const result=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compile failed '+name);
 modules[name]=result.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(end));
console.log('PASS v93.773 bundle',Object.keys(modules).length,'modules');
