const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'),path=require('path');
const root='/mnt/data/hmk_work_93807/hmk-web-combat-engine-main';
const options={allowJs:true,checkJs:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Node10};
const program=ts.createProgram([path.join(root,'app.js'),path.join(root,'src/integration/hmk-campaign-calendar-ui.js')],options);
const diagnostics=ts.getPreEmitDiagnostics(program);
const blocker=diagnostics.filter(d=>[2305,2307,1192,2614,2306,2724,2459,1005,1109,1128].includes(d.code));
console.log('TS files',program.getSourceFiles().filter(f=>f.fileName.startsWith(root)).length,'all diagnostics',diagnostics.length,'import/export/syntax blockers',blocker.length);
for(const d of blocker.slice(0,20)){const file=d.file&&path.relative(root,d.file.fileName);console.log(file+':'+(d.start??0)+' '+d.code+':'+ts.flattenDiagnosticMessageText(d.messageText,' '));}
if(blocker.length)process.exit(1);
