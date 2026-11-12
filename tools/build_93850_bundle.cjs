'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!raw.startsWith(prefix)||!raw.includes(marker))throw Error('Unexpected module bundle format');
const at=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,at));
for(const name of ['app.js','src/integration/hmk-time-episodes.js']){
 const output=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{
  fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 const errors=output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error)||[];
 if(errors.length)throw Error('Compile error: '+name+' '+errors.map(x=>x.messageText).join('; '));
 modules[name]=output.outputText;
}
for(const name of Object.keys(modules))if(!fs.existsSync(path.join(root,name)))throw Error('Missing source '+name);
fs.writeFileSync(file,prefix+JSON.stringify(modules)+raw.slice(at));
console.log('PASS v93.850 bundle, modules',Object.keys(modules).length);
