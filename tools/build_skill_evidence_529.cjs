 'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
assert(raw.startsWith(prefix)&&raw.includes(marker),'Unexpected bundle format');
const end=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-campaign-calendar-ui.js','src/integration/hmk-skill-result-evidence-529.js'];
for(const name of changed){
 const src=fs.readFileSync(path.join(root,name),'utf8');
 const result=ts.transpileModule(src,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 if(errors.length)throw Error('Transpile '+name+': '+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')).join('; '));
 modules[name]=result.outputText;
}
const bundle=prefix+JSON.stringify(modules)+raw.slice(end);
assert(bundle.includes('93.529')&&bundle.includes('hsk-saved-proof')&&bundle.includes('skillReceipts'),'Incomplete bundle');
fs.writeFileSync(out,bundle);
console.log('PASS v93.529 bundle',changed.join(', '),Buffer.byteLength(bundle),'bytes');
