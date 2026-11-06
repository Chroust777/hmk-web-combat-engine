'use strict';
// Keep the optional in-memory Chromium test bundle aligned with GitHub Pages ESM.
const fs=require('node:fs'),path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const bundle=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(bundle,'utf8'),prefix='(()=>{const MOD=',suffix=';const CACHE={};';
if(!raw.startsWith(prefix))throw Error('Invalid browser bundle header');
const split=raw.indexOf(suffix);if(split<0)throw Error('Invalid browser bundle envelope');
const modules=JSON.parse(raw.slice(prefix.length,split));
for(const relative of ['app.js','src/integration/hmk-episode-travel-detail.js','src/integration/hmk-time-episodes.js']){
 const js=fs.readFileSync(path.join(root,relative),'utf8');
 const compiled=ts.transpileModule(js,{fileName:relative,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 if(compiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compilation error '+relative);
 modules[relative]=compiled.outputText;
}
fs.writeFileSync(bundle,prefix+JSON.stringify(modules)+raw.slice(split));
console.log('PASS rebuilt '+Object.keys(modules).length+' modules for version 93.749');
