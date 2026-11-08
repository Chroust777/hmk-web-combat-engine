'use strict';
// Release helper: only the audited app source changes in this patch.
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unsupported bundle');
const idx=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,idx));
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const out=ts.transpileModule(source,{fileName:'app.js',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
if(out.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error(out.diagnostics.map(x=>x.messageText).join(';'));
modules['app.js']=out.outputText;
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(idx));
console.log('PASS bundle for v93.783, modules',Object.keys(modules).length);
