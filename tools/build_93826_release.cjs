'use strict';
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),file=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(file,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Expected HMK bundle layout');
const end=old.indexOf(marker),modules=JSON.parse(old.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-gm-shock-state-93826.js',
 'src/integration/persistent-combat-state.js','src/integration/hmk-medical-origin.js',
 'src/integration/hmk-chronicle-health-558.js',
 'src/integration/hmk-campaign-calendar.js'];
for(const name of changed){const source=fs.readFileSync(path.join(root,name),'utf8');
 const compiled=ts.transpileModule(source,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(compiled.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Syntax failed '+name);
 modules[name]=compiled.outputText;
}
fs.writeFileSync(file,prefix+JSON.stringify(modules)+old.slice(end));
console.log('PASS built v93.826 modules='+Object.keys(modules).length+', changed='+changed.length);
