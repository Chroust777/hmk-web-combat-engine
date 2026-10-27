'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),p=path.join(root,'hmk-app.bundle.js'),old=fs.readFileSync(p,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unrecognized production bundle wrapper');
const stop=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,stop));
const changes=['app.js','src/integration/hmk-group-travel.js','src/integration/hmk-trekking-animal-weather.js'];
for(const rel of changes){
 if(!fs.existsSync(path.join(root,rel)))throw Error('Missing '+rel);
 const compiled=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{fileName:rel,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(compiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('TypeScript transpilation failed '+rel);
 modules[rel]=compiled.outputText;
}
const result=prefix+JSON.stringify(modules)+old.slice(stop);
if(!result.includes("APP_VERSION = '93.518'")||!result.includes('hmk-trek-animal-weather-analogy-v1')||
 !result.includes('hmk-trek-animal-weather-analogy-v1')||!result.includes('hmk-animal-rest-analogy-v1'))throw Error('Incomplete Weather Hazard release bundle');
fs.writeFileSync(p,result);
console.log('PASS v93.518 production bundle',changes.length,'modules, bytes',Buffer.byteLength(result));
