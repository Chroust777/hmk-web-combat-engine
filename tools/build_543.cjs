'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),dest=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(dest,'utf8');const start='(()=>{const MOD=',marker=';const CACHE={};';
assert(raw.startsWith(start)&&raw.includes(marker),'Unexpected existing bundle');
const stop=raw.indexOf(marker),modules=JSON.parse(raw.slice(start.length,stop));
const name='app.js';assert(Object.hasOwn(modules,name));
const tr=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
assert.equal((tr.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'TS transpilation errors');
modules[name]=tr.outputText;
const bundle=start+JSON.stringify(modules)+raw.slice(stop);assert(bundle.includes("APP_VERSION = '93.543'"),'Bad version');
assert(bundle.includes('journalChronicleStatusHTML')&&bundle.includes('journalCategorySections'));
fs.writeFileSync(dest,bundle);console.log('PASS build v93.543',Buffer.byteLength(bundle));
