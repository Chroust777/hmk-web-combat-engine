'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle format');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
const name='app.js';if(!Object.hasOwn(modules,name))throw Error('app.js missing');
const result=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compile failed');
modules[name]=result.outputText;
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(end));
console.log('PASS build 93.792, modules='+Object.keys(modules).length);
