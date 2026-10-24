const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root=path.resolve(__dirname,'..'),bundlePath=path.join(root,'hmk-app.bundle.js');
const old=fs.readFileSync(bundlePath,'utf8');
const prefix='(()=>{const MOD=',marker=';const CACHE={};';
if(!old.startsWith(prefix)||!old.includes(marker))throw Error('Unexpected bundle envelope');
const split=old.indexOf(marker);let modules=JSON.parse(old.slice(prefix.length,split));
const changed=['app.js','src/integration/hmk-campaign-calendar-ui.js','src/integration/hmk-ui-navigation-history.js'];
for(const rel of changed){const source=fs.readFileSync(path.join(root,rel),'utf8');
 const result=ts.transpileModule(source,{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 if(result.diagnostics?.some(x=>x.category===ts.DiagnosticCategory.Error))throw Error('TypeScript error '+rel);
 modules[rel]=result.outputText;
 if(!modules[rel].includes('exports')&&!modules[rel].includes('require('))throw Error('Uncompiled module '+rel);
}
fs.writeFileSync(bundlePath,prefix+JSON.stringify(modules)+old.slice(split));
console.log('BUNDLE',Object.keys(modules).length,'modules',fs.statSync(bundlePath).size,'bytes');
