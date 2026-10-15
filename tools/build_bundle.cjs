/* Offline reproducible GitHub Pages build. Node.js + TypeScript (build-time only).
 * No server, npm package, paid API or runtime dependency on TypeScript.
 */
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript');}catch(e){ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const root=path.resolve(__dirname,'..');const files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){
 const p=path.join(dir,name),st=fs.statSync(p);if(st.isDirectory()){if(name!=='node_modules'&&name!=='tools')walk(p);}else if(name.endsWith('.js')&&name!=='hmk-app.bundle.js')files.push(p);}}
walk(root);
const modules={};for(const p of files){const key=path.relative(root,p).replaceAll('\\','/');
 const source=fs.readFileSync(p,'utf8');const t=ts.transpileModule(source,{fileName:key,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,allowJs:true}});
 if(t.diagnostics?.length){throw Error(key+': '+t.diagnostics.map(x=>x.messageText).join('; '));}
 modules[key]=t.outputText;
}
const body=`(()=>{const MOD=${JSON.stringify(modules)};const CACHE={};
function requireModule(key){key=key.replaceAll('\\\\','/');if(CACHE[key])return CACHE[key].exports;
if(!(key in MOD))throw Error('Missing module '+key);const module={exports:{}};CACHE[key]=module;
const req=(rel)=>{if(rel.startsWith('.')){const parts=key.split('/');parts.pop();for(const section of rel.split('/')){if(section==='..')parts.pop();else if(section!=='.')parts.push(section)}let target=parts.join('/');if(!target.endsWith('.js'))target+='.js';return requireModule(target)}throw Error('External module '+rel)};
new Function('require','module','exports',MOD[key])(req,module,module.exports);return module.exports;}
window.__hmkBundled=true;requireModule('app.js');})();\n`;
fs.writeFileSync(path.join(root,'hmk-app.bundle.js'),body);console.log('Bundled',files.length,'modules',body.length,'bytes');
