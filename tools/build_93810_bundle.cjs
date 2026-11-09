'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!raw.startsWith(prefix)||!raw.includes(marker))throw Error('Unexpected bundled module format');
const at=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,at));
for(const name of ['app.js','src/integration/hmk-travel-vehicle-93756.js']){
 if(!Object.hasOwn(modules,name))throw Error('Bundled module absent: '+name);
 const output=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{
  fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 const errors=output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error)||[];
 if(errors.length)throw Error('Syntax error in '+name+': '+errors.map(x=>x.messageText).join('; '));
 modules[name]=output.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+raw.slice(at));
console.log('PASS v93.810: '+Object.keys(modules).length+' bundled modules; app and transport module match source');
