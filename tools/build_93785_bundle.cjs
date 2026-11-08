'use strict';
// Recompile only the two audited production modules. Other modules untouched.
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unsupported production bundle format');
const at=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,at));
const changed=['app.js','src/integration/hmk-episode-travel-detail.js'];
for(const name of changed){
 if(!Object.hasOwn(modules,name))throw Error('Unknown production module '+name);
 const source=fs.readFileSync(path.join(root,name),'utf8');
 const out=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(out.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compile: '+name+' '+out.diagnostics.map(x=>x.messageText).join('; '));
 modules[name]=out.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(at));
console.log('PASS v93.785 bundle: '+changed.join(', ')+', '+Object.keys(modules).length+' modules');
