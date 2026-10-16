/** HMK v1.2: named, source-verified Secondary Rolls that accompany skill tests.
 * Mode success is usable in unopposed, opposed and assistance resolution;
 * value is used with a corresponding Success Value activity. All require an
 * actual named activity; primary skill alone cannot imply environmental conditions.
 * Complex standalone rituals, fatigue periods and spell-specific SR are resolved
 * by their own subsystems, not silently treated as generic skill tests.
 */
export const HMK_SECONDARY_ROLL_ROUTINES=Object.freeze([
 {id:'alchemy-elixir',mode:'value',primary:'Alchemy',name:'Příprava / vynalézání elixíru',modifiers:['Herblore','Mineralogy'],rollSkill:'Mathematics',page:268,svBonus:1,bonusRequiresPrimarySuccess:true,effect:'Při primárním S/CS a úspěšném Mathematics SR přidej +1 SV. Při F/CF se bonus nepřidá.'},
 {id:'climbing-difficult',mode:'value',primary:'Climbing',name:'Náročné lezení',modifiers:[],rollSkill:'Endurance',page:67,effect:'Úspěšný Endurance SR snižuje přírůstek únavy o 5; primární výsledek Climbing tím není zrušen.'},
 {id:'eloquence-story',mode:'value',primary:'Eloquence',name:'Vyprávění příběhu',modifiers:['Folklore'],rollSkill:'Creativity',page:69,svBonus:1,effect:'Úspěšný Creativity SR přidává +1 SV.'},
 {id:'strength-row',mode:'value',primary:'Strength',name:'Veslování',modifiers:[],rollSkill:'Seamanship',page:83,svBonus:1,effect:'Úspěšný Seamanship SR přidá +1 SV.'},
 {id:'strength-lift',mode:'value',primary:'Strength',name:'Zvedání těžkého předmětu',modifiers:[],rollSkill:'Endurance',page:85,effect:'Úspěšný Endurance SR snižuje přírůstek únavy o 5.'},
 {id:'timbercraft-felling',mode:'value',primary:'Timbercraft',name:'Kácení stromu',modifiers:[],rollSkill:'Endurance',page:87,effect:'Úspěšný Endurance SR snižuje přírůstek únavy o 5.'},
 {id:'fletching-hartbow',requiresFolk:'Ælrhin',mode:'value',primary:'Fletching',name:'Hartbow – Ælrhin',modifiers:[],rollSkill:'Spirit',page:72,effect:'Úspěšný Spirit SR umožní popsanou zvláštní faeriecraft kvalitu hartbow; pouze při výrobě Ælrhin.'},
 {id:'weaponcraft-faerie',requiresFolk:'Ælrhin',mode:'value',primary:'Weaponcraft',name:'Faeriecraft – výroba Ælrhin',modifiers:[],rollSkill:'Spirit',page:93,effect:'Úspěšný Spirit SR propůjčí výrobku zvláštní faeriecraft kvalitu; pouze při výrobě Ælrhin.'},
 {id:'language-written',mode:'value',primary:'Language',name:'Psaní a vytváření textu',modifiers:[],rollSkill:'Creativity',page:132,svBonus:1,effect:'Úspěšný Creativity SR zvýší SV písemného díla o +1.'},
 {id:'astrology-astromancy',mode:'value',primary:'Astrology',name:'Astromancie – výklad osudu',modifiers:['Drawing'],rollSkill:'Mathematics',page:280,svBonus:1,bonusRequiresPrimarySuccess:true,effect:'Při primárním S/CS úspěšný Mathematics SR zvýší SV o +1.'},
 {id:'runecraft-masonry',mode:'value',primary:'Runecraft',name:'Rytí runy do kamene',modifiers:[],rollSkill:'Masonry',page:284,svBonus:1,bonusRequiresPrimarySuccess:true,effect:'Při primárním S/CS úspěšný Masonry SR zvýší SV o +1.'},
 {id:'runecraft-metal',mode:'value',primary:'Runecraft',name:'Rytí runy do kovu',modifiers:[],rollSkill:'Metalcraft',page:284,svBonus:1,bonusRequiresPrimarySuccess:true,effect:'Při primárním S/CS úspěšný Metalcraft SR zvýší SV o +1.'},
 {id:'runecraft-wood',mode:'value',primary:'Runecraft',name:'Rytí runy do dřeva',modifiers:[],rollSkill:'Woodworking',page:284,svBonus:1,bonusRequiresPrimarySuccess:true,effect:'Při primárním S/CS úspěšný Woodworking SR zvýší SV o +1.'},
 {id:'ritual-peoni-circle',mode:'value',primary:'Ritual (Peóni)',name:'Peóni – úřad Reslâva (Mendicant)',modifiers:[],rollSkill:'Creativity',page:335,effect:'Pouze pro peónský úřad Reslâva: Creativity SR nahrazuje standardní Intrigue SR při Ritual Success Value; neuděluje automatický bonus SV.'},
 {id:'ritual-peoni-ordeal',mode:'value',primary:'Ritual (Peóni)',name:'Peóni – Reslava-Kai Paledaur (ordeal)',modifiers:[],rollSkill:'Creativity',page:336,svBonus:1,effect:'Při ordealu Reslava-Kai Paledaur: úspěšný Creativity SR přidá +1 SV ke zkoušce Ritual, nikoli k obecnému úřadu.'},
 {id:'ritual-siem-circle',mode:'value',primary:'Ritual (Siém)',name:'Siém – postup v církevním kruhu',modifiers:[],rollSkill:'Spirit',page:341,effect:'Pro Siémské duchovní Spirit SR nahrazuje standardní Intrigue SR; nad IV. kruhem je navíc nutné absolvovat Natural Mysteries ordeal.'},
 {id:'melee-sarajin-song',mode:'value',primary:'Melee',name:'Sárajìn – Song of Lynraal ordeal',modifiers:[],rollSkill:'Initiative',page:338,svBonus:1,effect:'Semi-rituální boj: úspěšný Initiative SR přidá +1 SV k Melee testu, jehož SV stanoví utrpěné zranění.'},
 {id:'folklore-saveknor-order',mode:'value',primary:'Folklore',name:'Sávè-Knôr – zkouška specializace kněze',modifiers:[],rollSkill:'Creativity',page:339,svBonus:1,effect:'Pouze během tvorby kněze Sávè-Knôra: úspěšný Creativity SR přidá +1 SV; výsledek SV7+ dovoluje vstup do vybraných řádů.'},
 {id:'ritual-advancement',mode:'value',primary:'Ritual',name:'Postup v církevním kruhu / úřad',modifiers:[],rollSkill:'Intrigue',page:315,effect:'Intrigue SR NEDÁVÁ +1 SV. U kruhu I stačí úspěch Ritual nebo SR; u II–III musí uspět oba; u IV–VII je třeba Ritual CS a úspěšný SR.'},
 {id:'convocation-research',mode:'value',primary:'Convocation',name:'Shèk-Pvâr – výzkum nebo vynález kouzla',modifiers:[],rollSkill:'Creativity',page:206,svBonus:1,bonusRequiresPrimarySuccess:true,effect:'Pouze při dokončení výzkumu kouzla (HMK str.206): Creativity SR po S/CS zvýší SV o +1; CF vyžaduje vlastní Will test.'},
 {id:'creativity-scholarly-work',mode:'value',primary:'Creativity',name:'Psaní odborného díla (Folklore SR)',modifiers:[],rollSkill:'Folklore',page:132,effect:'Při tvorbě textu ověřit specifickou předlohu a účinek Folklore SR; nelze automaticky přidat +1 SV.'},
 {id:'awareness-danger-sense',requiresSkill:'Prescience',mode:'success',primary:'Awareness',name:'Danger Sense – aktivní Prescience',modifiers:[],rollSkill:'Prescience',page:263,slBonus:1,effect:'Jen při aktivním talentu Prescience a fyzickém nebezpečí v předepsaném dosahu: úspěšný SR zvýší primární úroveň úspěchu o 1.'},
 {id:'stealth-reverie',requiresFolk:'Ælrhin',mode:'success',primary:'Stealth',name:'Woodcraft Reverie – elf proti neelfovi',modifiers:[],rollSkill:'Spirit',page:308,slBonus:1,effect:'Pouze při aktivním 24h Woodcraft Reverie proti ne-Ælrhin: úspěšný Spirit SR zvýší Stealth o 1 úroveň, i z neúspěchu.'},
 {id:'spirit-reembodiment',mode:'success',primary:'Spirit',name:'Návrat do těla (Reembodiment)',modifiers:[],rollSkill:'Trance',page:298,slBonus:1,effect:'Úspěšný Trance SR zvýší primární Spirit při návratu do těla o 1 úroveň.'},
]);
export function skillSecondaryRoutines(primary,mode='value'){
 return HMK_SECONDARY_ROLL_ROUTINES.filter(x=>(x.primary===primary||(['Language','Ritual','Convocation'].includes(x.primary)&&primary.startsWith(x.primary+' ('))||x.primary==='Convocation'&&/^(Fývria|Jmôrvi|Pèleáhn|Lyáhvi|Sàvôrya|Odívshè|Fyvria|Jmorvi|Peleahn|Lyahvi|Savorya|Odivshe)/i.test(primary))&&x.mode===mode);
}
export function skillSecondaryRoutineById(id,primary,mode='value'){
 return skillSecondaryRoutines(primary,mode).find(x=>x.id===id)||null;
}

export function skillSecondaryRoutineEligible(routine,person,masteries=[]){
 if(routine?.requiresFolk==='Ælrhin'&&!['Sinái','Sidhé','Hwæthârwyn'].includes(person?.hmk?.folk))return false;
 if(routine?.requiresSkill&&!masteries.some(x=>x.name===routine.requiresSkill||x.name==='Talent ('+routine.requiresSkill+')'))return false;
 return true;
}
