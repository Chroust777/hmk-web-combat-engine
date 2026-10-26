'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),bundle=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(bundle,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle structure');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-campaign-calendar-ui.js','src/integration/hmk-calendar-event-routing.js','src/integration/hmk-calendar-planner.js'];
for(const name of changed){const file=path.join(root,name),source=fs.readFileSync(file,'utf8');
 const compiled=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 if(compiled.diagnostics?.some(e=>e.category===ts.DiagnosticCategory.Error))throw Error('Invalid module '+name);
 modules[name]=compiled.outputText;
}
fs.writeFileSync(bundle,prefix+JSON.stringify(modules)+old.slice(end));
console.log('Built v93.504: '+changed.length+' source modules, '+Object.keys(modules).length+' modules total');
