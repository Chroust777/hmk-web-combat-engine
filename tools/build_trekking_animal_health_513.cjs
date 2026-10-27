'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),bundlePath=path.join(root,'hmk-app.bundle.js'),old=fs.readFileSync(bundlePath,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unknown production bundle wrapper');
const stop=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,stop));
const changes=['app.js','src/integration/hmk-trekking-party-modes.js',
 'src/integration/hmk-trekking-animal-health.js','src/integration/hmk-group-travel.js',
 'src/integration/hmk-calendar-activities.js'];
for(const rel of changes){
 if(rel!=='src/integration/hmk-trekking-animal-health.js'&&!Object.hasOwn(modules,rel))throw Error('Bundle missing known module '+rel);
 const source=fs.readFileSync(path.join(root,rel),'utf8');
 const built=ts.transpileModule(source,{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(built.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('TypeScript transpile errors in '+rel);
 modules[rel]=built.outputText;
}
fs.writeFileSync(bundlePath,prefix+JSON.stringify(modules)+old.slice(stop));
const check=fs.readFileSync(bundlePath,'utf8');
if(!check.includes("APP_VERSION = '93.513'")||!check.includes('hmk-trek-animal-health-v1')||!check.includes('trekRegisteredAnimalHealth'))throw Error('Stale/partial bundle');
console.log('PASS v93.513 bundle: '+changes.length+' modules, '+Buffer.byteLength(check)+' bytes');
