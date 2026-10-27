'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let ts;
try { ts=require('typescript'); }
catch { ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
assert(raw.startsWith(prefix)&&raw.includes(marker),'Neočekávaný formát produkčního bundle');
const end=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,end));
const src=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(src.includes("const APP_VERSION='93.530'"),'Výchozí verze app.js není v93.530');
const result=ts.transpileModule(src,{
 fileName:'app.js',
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 reportDiagnostics:true
});
const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
assert(errors.length===0,'Chyba překladu: '+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
modules['app.js']=result.outputText;
const bundle=prefix+JSON.stringify(modules)+raw.slice(end);
assert(bundle.includes("APP_VERSION = '93.530'"),'Chybí výsledná verze');
assert(bundle.includes('hsk-saved-proof')&&bundle.includes('skillReceipts'),'Poškozená návaznost Skill Tests v93.529');
fs.writeFileSync(out,bundle);
console.log('PASS v93.530 production bundle:',Buffer.byteLength(bundle),'bytes');
