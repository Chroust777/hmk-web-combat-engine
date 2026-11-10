'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!raw.startsWith(prefix)||!raw.includes(marker))throw Error('Unexpected bundle form');
const stop=raw.indexOf(marker),mods=JSON.parse(raw.slice(prefix.length,stop));
for(const name of ['app.js','src/integration/hmk-character-creation-ui.js']){
 if(!Object.hasOwn(mods,name))throw Error('Module missing from distribution: '+name);
 const out=ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{
  fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if((out.diagnostics||[]).some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Syntax error in '+name);
 mods[name]=out.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(mods)+raw.slice(stop));
console.log('PASS v93.817: source and browser bundle refreshed; modules='+Object.keys(mods).length);
