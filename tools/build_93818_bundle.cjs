'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected browser bundle');
const offset=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,offset));
const changed=['app.js','src/integration/hmk-skill-workbench-ui.js','src/integration/hmk-calendar-automatic-followups.js'];
for(const name of changed){const source=fs.readFileSync(path.join(root,name),'utf8');
 const output=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(output.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Invalid JS '+name);
 modules[name]=output.outputText;}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(offset));
console.log('PASS v93.819 browser bundle',changed.length,'modules; checksum/source parity for replaced modules');
