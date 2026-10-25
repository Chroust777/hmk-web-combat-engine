const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');const app=fs.readFileSync(path.join(root,'app.js'),'utf8');const ui=fs.readFileSync(path.join(root,'src/integration/hmk-skill-workbench-ui.js'),'utf8');const kit=fs.readFileSync(path.join(root,'src/integration/hmk-auto-starting-kit.js'),'utf8');const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
const checks=[
 [idx.includes('v93.483'),'release version'],
 [app.includes("['hazards','Nebezpečí / Trauma']"),'Hazards in permanent chapter navigation'],
 [app.indexOf("['notes','Notes & Logbook']",app.indexOf('function journalSectionNav()'))>app.indexOf('...specialties.map(x=>[x.id,x.label])',app.indexOf('function journalSectionNav()')),'Notes last'],
 [!ui.includes('name="footpadQuiet'),'no blanket Footpad checkbox'],
 [app.includes('silenceConfirmed:false'),'Footpad Legerdemain never guessed'],
 [ui.includes('data-hsk-special-dice'),'special dice button'],
 [ui.includes('data-hsk-roll-d10'),'activity die button'],
 [app.includes("secureAutoDie(10)")&&app.includes("input.dataset.hmkAutoDice=input.value"),'secure software dice with origin tracking'],
 [app.includes("source:form.elements.namedItem('specialDice')?.value?.trim()?(form.elements.namedItem('specialDice')?.dataset.hmkAutoDice"),'origin recorded in proof'],
 [app.includes('data-hmk-help="${esc(invHelp[name]||name)}"'),'inv load help'],
 [app.includes('Naplnění ${i+1} · zbývá ${l.remaining} gal'),'opaque IDs hidden'],
 [!app.includes('Původní naplnění<select'),'old water ID presentation removed'],
 [!app.includes('Vybavení · počáteční hodnota</strong>'),'initial wealth summary removed'],
 [app.includes('výběr do počáteční výbavy je orientační, nikoli povinný'),'legacy inventory description filtered in presentation'],
 [app.includes('function historyStep(direction)'),'history navigation preserved'],
 [app.includes('function hskSpecialRun(form)'),'actual special roll writer preserved'],
 [app.includes('function physicalWaterPanel(actor)'),'water writer preserved'],
 ];
for(const [ok,reason] of checks)assert.ok(ok,reason);
console.log('PASS: '+checks.length+' v93.483 UI, dice, provenance and navigation invariants');
