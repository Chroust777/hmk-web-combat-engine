'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
const part=src.slice(src.indexOf('/** v93.543:'),src.indexOf('function journalConditionDetailsHTML('));
assert(part.includes('journalChronicleStatusHTML'));
const actor={id:'a',name:'Průvodce'};
const clock={minute:2000,characterIds:['a']};
const data={characters:[actor],journal:[],campaignClock:clock};
const context={data,calendarMemberIds:(clock,chars)=>chars.filter(x=>clock.characterIds.includes(x.id)),
 activeHMKActivities:()=>[],campaignCalendarAgenda:()=>({all:[],unknown:[]}),
 displayCampaignMinute:x=>'minuta '+x,esc:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
 isPersonalNote:j=>!!j.id&&!!j.characterId&&!j.cashReceipt&&Object.keys(j).every(k=>['id','characterId','title','body','createdAt','updatedAt'].includes(k))};
vm.createContext(context);vm.runInContext(part,context);
const status=(state)=>context.journalChronicleStatusHTML(actor,state);
let checks=0;const ok=(cond,msg)=>{assert(cond,msg);checks++};
const clean={shock:'NONE',wounds:[],posture:{}};
ok(status(clean).includes('schopna běžných činností'),'Normal status');
ok(status({shock:'KIA',death:{cause:'zásah šípem'},wounds:[]}).includes('zásah šípem'),'Certified cause of death');
ok(status({shock:'KIA',wounds:[]}).includes('není v aktuálním zdravotním záznamu výslovně doložena'),'No invented cause');
ok(status({shock:'KIA',wounds:[],events:[{type:'coma-course',details:{after:'KIA',dead:true}}]}).includes('úmrtí během doloženého Coma Course'),'Derived confirmed cause from event');
ok(status({shock:'KIA',wounds:[],events:[{type:'confirmed-hit',details:{shock:'KIA',location:'tx'}}]}).includes('zásahu v oblasti tx'),'Verified fatal location');
ok(status({shock:'UNC',wounds:[],posture:{prone:true}}).includes('bezvědomí'),'Unconscious');
ok(status({shock:'INC',wounds:[],posture:{prone:true}}).includes('incapacitated'),'Inc');
ok(status({shock:'NONE',extendedShock:{hr:3},wounds:[]}).includes('prodlouženém šoku'),'Extended Shock');
ok(status({shock:'NONE',coma:{active:true},wounds:[]}).includes('v kómatu'),'Coma');
ok(status({shock:'NONE',wounds:[{location:'sh',side:'L',severity:'S',level:3,bleeding:true,healed:false}]}).includes('SH L S3'),'Wound/side');
ok(status({shock:'NONE',wounds:[{location:'sh',side:'L',severity:'S',level:3,bleeding:true,healed:false}]}).includes('Probíhá krvácení'),'Bleeding');
context.activeHMKActivities=()=>[{characterId:'a',calendarActivityProof:{kind:'rest',endMinute:2123}}];
ok(status(clean).includes('Postava odpočívá'),'Rest');ok(status(clean).includes('2 h 3 min'),'Actual remaining countdown');
context.activeHMKActivities=()=>[{characterId:'a',calendarActivityProof:{kind:'rest',startMinute:2030,endMinute:2123}}];
ok(!status(clean).includes('Postava odpočívá')&&status(clean).includes('má naplánovanou činnost rest'),'Future rest not falsely active');
context.activeHMKActivities=()=>[];
context.campaignCalendarAgenda=()=>({all:[{characterId:'a',minute:2210,kind:'healing',description:'Healing Roll (5 dní)'}],unknown:[]});
ok(status({shock:'NONE',wounds:[{location:'ft',healed:false,healing:{treated:true}}]}).includes('3 h 30 min'),'Healing next roll in future');
context.campaignCalendarAgenda=()=>({all:[],unknown:[{characterId:'a',kind:'healing',description:'Chybí čas kotvy'}]});
ok(status({shock:'NONE',wounds:[{location:'ft',healed:false}]}).includes('Chybí čas kotvy'),'Unknown origin clearly surfaced');
for(const [j,group] of [[{skillTestProof:{type:'success'},title:'Awareness'},'skills'],[{combatProof:{},title:'hit'},'health'],[{origin:'cash',title:'purchase'},'finance'],[{calendarInventoryDisposition:{},title:'převod'},'equipment'],[{origin:'calendar-clock',title:'time'},'calendar'],[{id:'note-2',characterId:'a',title:'deníkový záznam'},'notes']]){
 ok(context.journalHistoryCategory(j)===group,`${group} categorization`);
}
ok(context.journalHistoryCategory({id:'note-1',characterId:'a',title:'Poznámka',body:'',createdAt:'2026-10-27',origin:'journal'})==='notes','Personal note preserved in GM projection');
const items=[{id:'note-3',characterId:'a',title:'První zápis'},{title:'Druhý zápis',skillTestProof:{type:'success'}}];
const html=context.journalCategorySections(items,rows=>rows.map(x=>x.title).join('|'));
ok(html.includes('data-history-kind="skills"')&&html.includes('data-history-kind="notes"'),'Separated category blocks');
ok(html.includes('První zápis')&&html.includes('Druhý zápis'),'No missing entries');
console.log(`PASS ${checks} Chronicle status/history v93.543 assertions`);
