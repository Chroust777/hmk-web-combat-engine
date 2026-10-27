'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const app=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const index=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(require('node:path').join(__dirname,'../book-templates.css'),'utf8');
const checks=[
 ['version',app.includes("APP_VERSION='93.538'")&&index.includes('v93.538')],
 ['fishing gear form and origin proof',app.includes('function hskFishingGearForm')&&app.includes('fishingGearDue(data.journal,entry)')],
 ['gear follows F/CF but before CF injury',app.includes('hskFishingGearForm(x)+hskSkillPhysicalImpactForm(x)')],
 ['no CF injury before material choice',app.includes("if(fishing&&fishingGearDue(data.journal,entry))return ''")],
 ['one source evidence and calendar time',app.includes('commitFishingGear(data,')],
 ['global invalid-field emphasis',app.includes("form.matches?.('#creation-step-form')")&&css.includes('.hsk-required-invalid')],
 ['generator old name not saved',index.includes('delete draft.name')],
 ['generator old cached name not restored',index.includes('delete snapshot.name')],
 ['random generator fresh name',app.includes("#hmk-random-name-form [name=\"name\"]")],
 ['trait generator fresh name',app.includes("#hmk-generator-config [name=\"name\"]")],
 ['manual creation fresh name',app.includes("#creation-new-form [name=\"name\"]")],
 ['production module URL',index.includes('app.js?v=93.538')]
];
for(const [name,valid] of checks){assert(valid,'Missing '+name);console.log('OK '+name)}
console.log('PASS '+checks.length+' UI/provenance static checks');
