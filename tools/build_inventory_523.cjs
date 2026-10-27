'use strict';
const fs=require('node:fs'),path=require('node:path');let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),bundle=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(bundle,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected original bundle wrapper');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
const parts=['app.js','src/integration/hmk-outfit-optimizer.js','src/integration/hmk-inventory-batch-522.js','src/integration/hmk-inventory-sale-523.js'];
for(const name of parts){const src=fs.readFileSync(path.join(root,name),'utf8');const converted=ts.transpileModule(src,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(converted.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Transpile failure '+name);modules[name]=converted.outputText;}
const current=prefix+JSON.stringify(modules)+old.slice(end);
if(!current.includes("APP_VERSION = '93.523'")||!current.includes('applyInventorySale')||!current.includes('previewChestOutfit'))throw Error('Incomplete bundle');
fs.writeFileSync(bundle,current);console.log('PASS compiled v93.523',parts.length,'modules,',Buffer.byteLength(current),'bytes');
