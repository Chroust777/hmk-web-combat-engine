'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),bundlePath=path.join(root,'hmk-app.bundle.js'),old=fs.readFileSync(bundlePath,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle structure');
const stop=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,stop));
const paths=['app.js','src/integration/hmk-calendar-expedition.js','src/integration/hmk-trekking-party-modes.js','src/integration/hmk-group-travel.js'];
for(const rel of paths){
 const source=fs.readFileSync(path.join(root,rel),'utf8');
 const transpiled=ts.transpileModule(source,{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 if(transpiled.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Failed to build '+rel);
 if(!Object.hasOwn(modules,rel))throw Error('Missing existing bundle module '+rel);
 modules[rel]=transpiled.outputText;
}
fs.writeFileSync(bundlePath,prefix+JSON.stringify(modules)+old.slice(stop));
const verify=fs.readFileSync(bundlePath,'utf8');
if(!verify.includes("APP_VERSION = '93.511'")||!verify.includes('allowCertifiedWeatherAccrual'))throw Error('Stale version or incomplete new bundle');
console.log('PASS production bundle:',paths.length,'modules',fs.statSync(bundlePath).size,'bytes');
