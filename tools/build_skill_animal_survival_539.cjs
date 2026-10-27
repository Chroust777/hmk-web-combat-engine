'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
assert(raw.startsWith(prefix)&&raw.includes(marker),'Unknown bundle loader');
const end=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,end));
for(const name of ['app.js','src/integration/hmk-skill-physical-consequences.js','src/integration/hmk-skill-animal-survival-539.js','src/integration/hmk-calendar-automatic-followups.js','src/integration/hmk-mounted-live-animal-falling.js','src/integration/hmk-guided-mandatory.js']){
 const src=fs.readFileSync(path.join(root,name),'utf8');
 const output=ts.transpileModule(src,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert(!(output.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),'Bad module: '+name);
 modules[name]=output.outputText;
}
const bundle=prefix+JSON.stringify(modules)+raw.slice(end);
assert(bundle.includes("APP_VERSION = '93.539'")&&bundle.includes('prepareAnimalSurvivalAccident'), 'New module missing from built app');
fs.writeFileSync(out,bundle);
console.log('PASS bundle v93.539',Buffer.byteLength(bundle),'bytes');
