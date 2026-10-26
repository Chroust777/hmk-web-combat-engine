const fs=require('fs'),assert=require('assert'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');const s=fs.readFileSync(path.join(root,'app.js'),'utf8');
const section=s.slice(s.indexOf('const LIBRARY_FIELD_HELP='),s.indexOf('function catalogParameters(item){'));
const get=vm.runInNewContext(section+'\nlibraryFieldHelp;',{});
const checks={
 'WQ':['Weapon Damage','191'], 'HFT / LNG':['STR','Reach'],
 'Dostřel / střela':['Base Range','Volley'], 'Impact':['Injury Sequence','b='],
 'Heft':['STR','−5'],'Délka':['Reach'], 'Block':['obrann','štít'],
 'Deflect':['odklon','štít'],'ENC':['AGL','zbroj'],
 'Základní dostřel (ft)':['BR','stopách'],
 'Třída zbraně':['common','chivalric'],
 'Útočné režimy':['Impact','modifikátor']};
for(const [key,parts] of Object.entries(checks)) {const value=get(key);for(const fragment of parts)assert.ok(value.includes(fragment),key+': '+fragment+' not in '+value);assert.ok(!value.includes('Doplňující doložený parametr'));}
assert.ok(!get('neznámý-neověřený-parametr').includes('Doplňující doložený parametr'));
assert.ok(s.includes('title="${esc(libraryFieldHelp(headings[index]))}"'));
console.log('PASS:',Object.keys(checks).length,'rule descriptions and per-cell tooltips');
