'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!raw.startsWith(prefix)||!raw.includes(marker))throw Error('Unsupported bundle format');
const at=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,at));
for(const name of ['app.js','src/integration/hmk-character-registry-separation-93813.js']){
 const parsed=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 const errors=parsed.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error)||[];
 if(errors.length)throw Error('Compile error '+name+': '+errors.map(x=>x.messageText).join('; '));
 modules[name]=parsed.outputText;
}
// This bundle is a test/distribution mirror; GitHub uses original app.js.
for(const [name,src] of Object.entries(modules)){
 const rex=/require\(['"]([^'"]+)['"]\)/g;
 for(const m of src.matchAll(rex)){
  let next=path.posix.normalize(path.posix.join(path.posix.dirname(name),m[1]));
  if(!next.endsWith('.js'))next+='.js';
  if(!(next in modules))throw Error('Missing dependency '+next+' required by '+name);
 }
}
fs.writeFileSync(out,prefix+JSON.stringify(modules)+raw.slice(at));
console.log('PASS v93.813: '+Object.keys(modules).length+' bundled modules and resolved source imports');
