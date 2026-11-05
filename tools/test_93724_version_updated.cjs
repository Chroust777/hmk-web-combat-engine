'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'repo');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let count=0;const ok=(v,m)=>{assert.ok(v,m);count++};
const weatherUI=app.slice(app.indexOf('function openCalendarWeatherRoll('),app.indexOf('function weatherFormSides('));
const weatherSubmit=app.slice(app.indexOf("if(!form?.matches?.('[data-trek-weather-roll]'))return;"),app.indexOf('/** A calendar notification points'));
ok(weatherUI.includes('calculateWeatherAreaAV({inventory:data.inventory,actorId:actor.id})'),'calendar UI must derive live AV');
ok(weatherUI.includes('readonly data-hmk-derived="worn-armour"'),'manual AV input must be read-only');
ok(!weatherUI.includes('required placeholder="Z doloženého vybavení"'),'manual AV input removed');
ok(weatherSubmit.includes('calculateWeatherAreaAV({inventory:data.inventory,actorId:actor.id})'),'recompute from authoritative inventory at submission');
ok(weatherSubmit.includes('areaAV:verifiedAreaAV.value'),'never accept submitted AV');
ok(!weatherSubmit.includes("Number(fd.get('areaAV'))"),'ignore forged AV');
ok(weatherSubmit.includes('if(!verifiedAreaAV.ready)throw Error'),'fail closed on unverified equipped armour');
for(const msg of [
'Dovednosti účastníka právě běžící Initiative','Zranění účastníka Initiative lze měnit',
'Atributy účastníka Initiative lze měnit','Dovednosti účastníka Initiative lze měnit',
'Nová rána účastníka Initiative','Záznamy účastníka Initiative nelze ručně mazat']){
 ok(app.includes(`if(combatInitiativeSequence?.order?.includes(c.id))return alert('${msg}`),'participant-only UI guard '+msg);
}
ok(app.includes('assertLegacyMutationDoesNotChangeCombat(previous,data,'),'underlying authority guard present');
ok(app.includes('assertGlobalActionLedgerAppendOnly(previous,data)'),'global ledger append-only protected');
ok(app.includes('validate(data);'),'document validator present');
ok(html.includes('93.725')&&app.includes("const APP_VERSION='93.725'"),'cache bust and version aligned');
console.log(`PASS ${count} v93.725 targeted AV/UI/Combat static assertions`);
