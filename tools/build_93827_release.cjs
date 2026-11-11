'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle structure');
const end=old.indexOf(marker),mods=JSON.parse(old.slice(prefix.length,end));
const names=['app.js','src/integration/persistent-combat-state.js','src/integration/hmk-concurrent-shock-projection.js','src/integration/hmk-calendar-automatic-followups.js','src/integration/hmk-campaign-calendar.js'];
for(const name of names){const code=fs.readFileSync(path.join(root,name),'utf8');const out=ts.transpileModule(code,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});if(out.diagnostics?.some(d=>d.category===1))throw Error('Compile '+name);mods[name]=out.outputText;}
fs.writeFileSync(file,prefix+JSON.stringify(mods)+old.slice(end));
console.log('PASS bundle rebuilt',names.length,'modules',Object.keys(mods).length);
