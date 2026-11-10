'use strict';
const fs=require('node:fs'),path=require('node:path'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected browser bundle');
const offset=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,offset));
for(const relative of ['app.js','src/integration/hmk-stable-hub-574.js','src/integration/hmk-travel-equipment-guide-93812.js','src/integration/hmk-travel-riding-93823.js']){
 const src=fs.readFileSync(path.join(root,relative),'utf8');
 const out=ts.transpileModule(src,{fileName:relative,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 if(out.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Invalid JS '+relative);
 modules[relative]=out.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(offset));
console.log('v93.823 Chromium test bundle rebuilt, modules=',Object.keys(modules).length);
