'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
assert(raw.startsWith(prefix)&&raw.includes(marker),'Bundle must use the original CommonJS module registry');
const end=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-inventory-batch-522.js'];
for(const file of changed){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const compiled=ts.transpileModule(source,{fileName:file,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert(!compiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error),'Compile '+file);
 assert(modules[file]!==undefined,'Bundle is missing '+file);
 modules[file]=compiled.outputText;
}
const bundled=prefix+JSON.stringify(modules)+raw.slice(end);
assert(bundled.includes("APP_VERSION = '93.528'"),'Wrong runtime version');
assert(bundled.includes('const wornPlan = (0, hmk_outfit_optimizer_js_1.applyOptimalOutfit)')||
 bundled.includes('applyOptimalOutfit)(plan.virtual'),'Compiled unified outfit missing');
assert(!bundled.includes("Po vyzvednutí už návrh neodpovídá původním článkům."),'Old JSON comparison remains');
fs.writeFileSync(out,bundled);
console.log('PASS v93.528 compiled',changed.join(', '),'to',out,'size',Buffer.byteLength(bundled));
