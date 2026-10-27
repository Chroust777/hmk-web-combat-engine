'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
assert(raw.startsWith(prefix)&&raw.includes(marker),'Unsupported bundle format');
const end=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,end));
for(const name of ['app.js','src/integration/hmk-fishing-cf-gear-538.js']){
 const src=fs.readFileSync(path.join(root,name),'utf8');
 const result=ts.transpileModule(src,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert(!(result.diagnostics||[]).some(x=>x.category===ts.DiagnosticCategory.Error),'JS transpilation '+name);
 modules[name]=result.outputText;
}
const bundle=prefix+JSON.stringify(modules)+raw.slice(end);
assert(bundle.includes("APP_VERSION = '93.538'")&&bundle.includes('commitFishingGear'),'Bundled changes missing');
fs.writeFileSync(out,bundle);
console.log('PASS production bundle v93.538, bytes='+Buffer.byteLength(bundle));
