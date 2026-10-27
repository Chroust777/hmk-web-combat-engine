'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),p=path.join(root,'hmk-app.bundle.js'),old=fs.readFileSync(p,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unrecognized bundle wrapper');
const stop=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,stop));
const changes=['app.js','src/integration/hmk-group-travel.js','src/integration/hmk-calendar-activities.js','src/integration/hmk-trekking-party-modes.js','src/integration/hmk-trekking-animal-load.js','src/integration/hmk-trekking-animal-timeline.js','src/integration/hmk-trekking-animal-rest.js','src/integration/hmk-campaign-calendar-ui.js'];
for(const rel of changes){
 if(!fs.existsSync(path.join(root,rel)))throw Error('Missing module '+rel);
 if(!Object.hasOwn(modules,rel)&&!rel.endsWith('hmk-trekking-animal-load.js')&&!rel.endsWith('hmk-trekking-animal-timeline.js')&&!rel.endsWith('hmk-trekking-animal-rest.js'))throw Error('Missing pre-existing bundled module '+rel);
 const transpiled=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(transpiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Transpile failure '+rel);
 modules[rel]=transpiled.outputText;
}
const result=prefix+JSON.stringify(modules)+old.slice(stop);
if(!result.includes("APP_VERSION = '93.517'")||!result.includes('hmk-trek-animal-load-lb-v1')||!result.includes('hmk-calendar-animal-fatigue-v1')||!result.includes('hmk-animal-rest-analogy-v1'))throw Error('Incomplete bundle');
fs.writeFileSync(p,result);
console.log('PASS v93.517 production bundle: '+changes.length+' modules, '+Buffer.byteLength(result)+' bytes');
