'use strict';
const fs=require('node:fs'),path=require('node:path');let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(__dirname,'..'),out=path.join(root,'hmk-app.bundle.js');
const raw=fs.readFileSync(out,'utf8'),prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!raw.startsWith(prefix)||!raw.includes(marker))throw Error('Unexpected bundle format');
const end=raw.indexOf(marker),modules=JSON.parse(raw.slice(prefix.length,end));
const changed=['app.js','src/integration/hmk-outfit-optimizer.js','src/integration/hmk-inventory-batch-522.js','src/integration/armour-layer-evaluation.js','src/integration/hmk-exact-layer-order-524.js'];
for(const name of changed){const src=fs.readFileSync(path.join(root,name),'utf8');const result=ts.transpileModule(src,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(result.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('Transpile '+name);
 modules[name]=result.outputText;
}
const bundle=prefix+JSON.stringify(modules)+raw.slice(end);
if(!bundle.includes("APP_VERSION = '93.524'")||!bundle.includes('findExactArmourOrder')||!bundle.includes('locallyPossibleArmourArticles'))throw Error('Incomplete build');
fs.writeFileSync(out,bundle);console.log('PASS v93.524 bundled '+changed.join(', ')+' '+Buffer.byteLength(bundle)+' bytes');
