'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),bundlePath=path.join(root,'hmk-app.bundle.js'),old=fs.readFileSync(bundlePath,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unrecognized production bundle');
const stop=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,stop));
const paths=['app.js','src/integration/hmk-calendar-expedition.js','src/integration/hmk-calendar-activities.js',
 'src/integration/hmk-trekking-party-modes.js','src/integration/hmk-group-travel.js',
 'src/integration/hmk-trekking-orienteering.js','src/integration/hmk-trekking-routine.js',
 'src/integration/hmk-trekking-readiness.js','src/integration/hmk-trekking-followups.js',
 'src/integration/hmk-trekking-handoff.js'];
for(const rel of paths){
 if(!Object.hasOwn(modules,rel))throw Error('Missing original bundled module '+rel);
 const source=fs.readFileSync(path.join(root,rel),'utf8');
 const built=ts.transpileModule(source,{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(built.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Compilation failed '+rel);
 modules[rel]=built.outputText;
}
fs.writeFileSync(bundlePath,prefix+JSON.stringify(modules)+old.slice(stop));
const check=fs.readFileSync(bundlePath,'utf8');
if(!check.includes("APP_VERSION = '93.512'")||!check.includes('finishInterruptedHMKTravel')||!check.includes('animalsPresent'))throw Error('Stale bundle');
console.log('PASS production bundle',paths.length,'updated embedded modules',fs.statSync(bundlePath).size,'bytes');
