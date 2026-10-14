/** Rule-backed, deliberately scoped chapter 2 tables; HMK v1.2 pp.24–33,42–49,51–55.
 * Partial datasets MUST NOT silently validate unsupported realms or occupations. Pure, no RNG. */
export const SOCIETY_TABLES=Object.freeze({
 Feudal:{d100:[[65,'Unfree'],[80,'Free'],[90,'Guilded'],[95,'Military'],[96,'Priestly'],[100,'Noble']],d20:[[9,'Free'],[14,'Guilded'],[17,'Military'],[18,'Priestly'],[20,'Noble']]},
 Imperial:{d100:[[30,'Unfree'],[80,'Free'],[90,'Guilded'],[98,'Military'],[99,'Priestly'],[100,'Noble']],d20:[[13,'Free'],[16,'Guilded'],[18,'Military'],[19,'Priestly'],[20,'Noble']]},
 'City-State':{d100:[[50,'Unfree'],[75,'Free'],[90,'Guilded'],[98,'Military'],[99,'Priestly'],[100,'Noble']],d20:[[12,'Free'],[16,'Guilded'],[18,'Military'],[19,'Priestly'],[20,'Noble']]},
 Tribal:{d100:[[3,'Unfree'],[97,'Free'],[99,'Priestly'],[100,'Noble']],d20:[[18,'Free'],[19,'Priestly'],[20,'Noble']]},
 'Tribal-Settled':{d100:[[1,'Unfree'],[90,'Free'],[97,'Guilded'],[99,'Priestly'],[100,'Noble']],d20:[[16,'Free'],[18,'Guilded'],[19,'Priestly'],[20,'Noble']]},
 Tributary:{d100:[[50,'Unfree'],[85,'Free'],[95,'Guilded'],[98,'Military'],[99,'Priestly'],[100,'Noble']],d20:[[14,'Free'],[17,'Guilded'],[18,'Military'],[19,'Priestly'],[20,'Noble']]},

 Viking:{d100:[[50,'Unfree'],[85,'Free'],[95,'Guilded'],[98,'Military'],[99,'Priestly'],[100,'Noble']],d20:[[14,'Free'],[17,'Guilded'],[18,'Military'],[19,'Priestly'],[20,'Noble']]},
 'Chélemby':{d100:[[12,'Unfree'],[67,'Free'],[92,'Guilded'],[97,'Military'],[98,'Priestly'],[100,'Noble']],d20:[[9,'Free'],[15,'Guilded'],[18,'Military'],[19,'Priestly'],[20,'Noble']]},
 'Kúzhan':{d100:[[15,'Larkuz'],[25,'Tolkuz'],[45,'Azkuz'],[50,'Erkuz'],[80,'Zerkuz'],[99,'Konkuz'],[100,'Yankuz']],d20:[[1,'Larkuz'],[3,'Tolkuz'],[7,'Azkuz'],[9,'Erkuz'],[15,'Zerkuz'],[19,'Konkuz'],[20,'Yankuz']]},
 'Sináin':{d100:[[70,'Free'],[98,'Crafter'],[99,'Military'],[100,'Valpalen']],d20:[[13,'Free'],[18,'Crafter'],[19,'Military'],[20,'Valpalen']]},
 // HMK Appendix I p.423, two remaining player-character Elder Folk societies.
 'Malák':{d100:[[100,'Military']],d20:[[20,'Military']]},
 'Mizúni':{d100:[[90,'Free'],[99,'Crafter'],[100,'Noble']],d20:[[16,'Free'],[19,'Crafter'],[20,'Noble']]},
});
export const SOCIETIES=Object.freeze([...Object.keys(SOCIETY_TABLES),'Feudal/Imperial']);
export function classFromRoll(society,die,sides=100){
 if(!Number.isInteger(Number(die))||String(die).trim()===''||![20,100].includes(Number(sides))||Number(die)<1||Number(die)>Number(sides))throw Error('Neplatný fyzický Class d20/d100');
 const table=SOCIETY_TABLES[society==='Feudal/Imperial'?'Feudal':society];
 if(!table)throw Error('Společnost bez úplné Class tabulky');
 return table['d'+sides].find(([limit])=>Number(die)<=limit)?.[1];
}
/** Fully intervalled realm subtables are listed below; any unlisted Appendix I region needs GM verification. */
/** Fully intervalled realm tables transcribed from HMK v1.2 Appendix I, pp.416–422.
 * Regions with additional language/tribal subrolls still require GM review. */
export const VERIFIED_REGIONS=Object.freeze({
// HMK v1.2 Appendix I p.423: Elder Folk have their OWN complete d100
// tables. The printed roll is across the Ælrhin or Kúzhai realms, not a
// 22-region Venârivè d1000 roll. No synthetic random roll is introduced.
 'Ælrhin (Elder Folk)':Object.freeze([
  {max:45,realm:'Eváel Kingdom',society:'Sináin',pantheon:'Siém',nativeLanguage:'Sináin',regionalLanguages:['Járin','Hârnic','Eméla']},
  {max:100,realm:'Hwæthârwyn lands',society:'Sináin',pantheon:'Siém',nativeLanguage:'Sináin',regionalLanguages:['Áltic','Ivínian','Reksýni']}
 ]),
 'Malákta (Elder Folk)':Object.freeze([
  {max:100,realm:'Malákrhyn fort',society:'Malák',pantheon:'—',nativeLanguage:'Malánuk',regionalLanguages:['Eméla']}
 ]),
 'Nâdi (Elder Folk)':Object.freeze([
  {max:100,realm:'Mizúna site',society:'Mizúni',pantheon:'—',nativeLanguage:'Mizúni',regionalLanguages:['Eméla','Shôrka','Triérzi']}
 ]),
 'Kúzhai (Elder Folk)':Object.freeze([
  {max:30,realm:'Ázadmêre Kingdom',society:'Kúzhan',pantheon:'Seréniel',nativeLanguage:'Kúzhan',regionalLanguages:['Járin','Hârnic']},
  {max:80,realm:'Êrdar Kingdom',society:'Kúzhan',pantheon:'Seréniel',nativeLanguage:'Kúzhan',regionalLanguages:['Nâblúgi','Uméni']},
  {max:87,realm:'Hârhakeim city',society:'Kúzhan',pantheon:'Seréniel',nativeLanguage:'Kúzhan',regionalLanguages:['Yaríli','Ivínian']},
  {max:100,realm:'Kóndasgel city',society:'Kúzhan',pantheon:'Seréniel',nativeLanguage:'Kúzhan',regionalLanguages:['Yaríli','Ivínian']}
 ]),
// HMK v1.2 Appendix I p.418: printed Hârn main regional table.
// The Elder Realms entry describes Járin HUMAN residents; Elder Folk use p.423.
// No unprinted die is inferred from the 90/10 residence proportions.
 'Hârn':Object.freeze([
  {max:1,realm:'Chybísa Kingdom',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Hârnic',regionalLanguages:['Járin']},
  {max:2,realm:'Elder Realms',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Járin',regionalLanguages:[],harnElder:true},
  {max:16,realm:'Káldôr Kingdom',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Hârnic',regionalLanguages:['Járin']},
  {max:28,realm:'Kandáy Kingdom',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Hârnic',regionalLanguages:[]},
  {max:49,realm:'Mèlderýn Kingdom',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Hârnic',regionalLanguages:['Járin']},
  {max:50,realm:'Orbáal Kingdom',society:'Tributary',pantheon:'W. Venârian',nativeLanguage:'Orbáaler',regionalLanguages:['Járin','Hârnic'],harnOrbaal:'Ivínian rulers'},
  {max:58,realm:'Orbáal Kingdom',society:'Tributary',pantheon:'W. Venârian',nativeLanguage:'Járin',regionalLanguages:['Orbáaler','Hârnic'],harnOrbaal:'Subjugated Járin'},
  {max:70,realm:'Réthem Kingdom',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Hârnic',regionalLanguages:['Járin']},
  {max:83,realm:'Thârdic Republic',society:'Feudal/Imperial',pantheon:'W. Venârian',nativeLanguage:'Hârnic',regionalLanguages:[]},
  {max:100,realm:'Tribal lands',society:'Tribal',pantheon:'various',nativeLanguage:null,regionalLanguages:[],harnTribal:true}
 ]),
 "Áltôr":Object.freeze([
 // HMK Appendix I p.416: two native languages for both towns, with no
 // prescribed additional die. The percentages are context, not dice tables.
 {max:6,realm:'Amlácht town',society:'Tributary',pantheon:'Altic-Ivínian',nativeLanguage:null,nativeLanguageChoices:['Áltic-eastern','Ivínian'],nativeLanguageMode:'gm-choice',regionalLanguages:[],nativePopulationNote:'50% Álti / 50% Ivínian'},
 {max:11,realm:'Lýbath town',society:'Tributary',pantheon:'Altic',nativeLanguage:null,nativeLanguageChoices:['Áltic-eastern','Ivínian'],nativeLanguageMode:'gm-choice',regionalLanguages:['Sináin'],nativePopulationNote:'80% Álti / 20% Ivínian'},
 {max:57,realm:'West Álti lands',society:'Tribal',pantheon:'Altic',nativeLanguage:'Áltic-western',regionalLanguages:['Ivínian','Quârphic'],alticTribal:true},
 {max:100,realm:'East Álti lands',society:'Tribal',pantheon:'Altic',nativeLanguage:'Áltic-eastern',regionalLanguages:['Ivínian','Reksýni'],alticTribal:true}
 ]),
 // HMK v1.2 Appendix I p.416. At 98, 99, and 00 a second physical d10
 // resolves the printed d100•d10 rows; multiple native dialects require a
 // bounded GM determination, not an invented additional die.
 'Ázeryàn':Object.freeze([
  {max:5,realm:'Áshon Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['eastern'],regionalLanguages:['Tonátri','Quârphic','Reksýni'],regionalLanguageDialects:{'Quârphic':'southern'}},
  {max:13,realm:'Ázen Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime','eastern'],regionalLanguages:[]},
  {max:17,realm:'Helén Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['western'],regionalLanguages:[]},
  {max:24,realm:'Îlis Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime'],regionalLanguages:[]},
  {max:30,realm:'Kántreda Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime','southern'],regionalLanguages:[]},
  {max:36,realm:'Læma Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['northern'],regionalLanguages:['Tonátri']},
  {max:40,realm:'Lótmîr Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['central','western'],regionalLanguages:[]},
  {max:42,realm:'Ménkrè Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['eastern'],regionalLanguages:[]},
  {max:45,realm:'Mísonæ Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime'],regionalLanguages:[]},
  {max:51,realm:'Nâliat Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime'],regionalLanguages:[]},
  {max:54,realm:'Ontónas Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['southern','island'],regionalLanguages:[]},
  {max:58,realm:'Rámien Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['eastern'],regionalLanguages:[]},
  {max:63,realm:'Sásala Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['central','southern'],regionalLanguages:[]},
  {max:68,realm:'Skôraz Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime'],regionalLanguages:[]},
  {max:74,realm:'Thonâru Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['prime','eastern'],regionalLanguages:['Tonátri']},
  {max:78,realm:'Tonátra Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['northern','western'],regionalLanguages:['Tonátri']},
  {max:81,realm:'Válenæ Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['western'],regionalLanguages:[]},
  {max:85,realm:'Vedóra Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['central','northern'],regionalLanguages:[]},
  {max:87,realm:'Alám Garés Military Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['southern','western'],regionalLanguages:[]},
  {max:89,realm:'Alám Lóas Military Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['southern','Terâzin'],regionalLanguages:[]},
  {max:92,realm:'Berónium Military Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['western'],regionalLanguages:[]},
  {max:95,realm:'Ìndâral Military Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['island'],regionalLanguages:[]},
  {max:97,realm:'Sános Military Province',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['island'],regionalLanguages:[]},
  {max:98,subRollOptions:[
    {max:1,realm:'Góthmîr Garés March',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Reksýni',regionalLanguages:['Nâsik Azéri','Quârphic'],regionalLanguageDialects:{'Nâsik Azéri':'eastern','Quârphic':'eastern'}},
    {max:7,realm:'Góthmîr Lóas March',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['eastern'],regionalLanguages:['Reksýni']},
    {max:8,realm:'Kàlinelâri March',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Reksýni',regionalLanguages:['Quârphic','Nâsik Azéri'],regionalLanguageDialects:{'Quârphic':['eastern','southern'],'Nâsik Azéri':'eastern'}},
    {max:10,realm:'Tonátri lands',society:'Tribal',pantheon:'Tonátri',nativeLanguage:'Tonátri',regionalLanguages:[]}
  ]},
  {max:99,subRollOptions:[
    {max:2,realm:'Principality of Gôris',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['Górik'],regionalLanguages:[]},
    {max:10,realm:'Grand Principality of Lánkor',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['Lánkori'],regionalLanguages:['Eméla','Tonátri','Quârphic'],regionalLanguageDialects:{'Quârphic':'southern'}}
  ]},
  {max:100,subRollOptions:[
    {max:9,realm:'Grand Principality of Lánkor',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialects:['Lánkori'],regionalLanguages:['Eméla','Tonátri','Quârphic'],regionalLanguageDialects:{'Quârphic':'southern'}},
    {max:10,realm:'Lánkor Émhlè',society:'Tribal',pantheon:'Covenant',nativeLanguage:'Émhlèn',regionalLanguages:['Nâsik Azéri','Quârphic','Shôrka'],regionalLanguageDialects:{'Nâsik Azéri':'Lánkori','Quârphic':['western','southern'],'Shôrka':'eastern'}}
  ]}
 ]),
 // HMK v1.2 Appendix I p.418, 23 Hepekeria rows. The two
 // community-conditioned rows require a bounded GM decision, NOT a die.
 'Hèpekéria':Object.freeze([
  {max:3,realm:'Air sub-nation',society:'Tribal',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:[],numecDialectCommunity:'Air',subsistence:'Herding'},
  {max:6,realm:'Azúwirat lands',society:'Tribal-Settled',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:['Dálani'],numecDialectCommunity:'Azúwirat',subsistence:'Herding'},
  {max:9,realm:'Íwil sub-nation',society:'Tribal',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:[],numecDialectCommunity:'Íwil',subsistence:'Herding'},
  {max:10,realm:'Dúrqa Âwrím lands',society:'Tribal',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:[],numecDialectCommunity:'Dúrqa Âwrím',subsistence:'Herding'},
  {max:14,realm:'Lawâta sub-nation',society:'Tribal',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:[],numecDialectCommunity:'Lawâta',subsistence:'Herding'},
  {max:16,realm:"Naj'er sub-nation",society:'Tribal',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:[],numecDialectCommunity:"Naj'er",subsistence:'Herding'},
  {max:19,realm:'Údan sub-nation',society:'Tribal',pantheon:'Númec',nativeLanguage:'Númer',regionalLanguages:[],numecDialectCommunity:'Údan',subsistence:'Herding'},
  {max:23,realm:'Charinátrè Kingdom',society:'Feudal/Imperial',pantheon:'Azéri',nativeLanguage:'Kôrlic',regionalLanguages:['Númer']},
  {max:26,realm:'Dýsor Kingdom',society:'Feudal/Imperial',pantheon:null,nativeLanguage:'Kôrlic',regionalLanguages:['Númer'],communityOptions:[
    {id:'Coastal Kôrlic',pantheon:'Azéri'}, {id:'Inland Númec',pantheon:'Númec'}]},
  {max:30,realm:'Geména Kingdom',society:'Feudal/Imperial',pantheon:'Azéri',nativeLanguage:'Kôrlic',regionalLanguages:['Nâsik Azéri','Dálani'],regionalLanguageDialects:{'Nâsik Azéri':'Dálazeri'}},
  {max:36,realm:'Isýnen area',society:'City-State',pantheon:'Númec-Venârian',nativeLanguage:'Kôrlic',regionalLanguages:[]},
  {max:45,realm:'Kôrlúa Kingdom',society:'Tributary',pantheon:'Ivínian-Númec',nativeLanguage:null,regionalLanguages:[],communityOptions:[
    {id:'Ivínian rulers',nativeLanguage:'Ivínian',regionalLanguages:['Kôrlic'],populationPercent:20}, {id:'Kôrlic common folk',nativeLanguage:'Kôrlic',regionalLanguages:['Ivínian'],populationPercent:80}]},
  {max:56,realm:'Menêma Kingdom',society:'Tributary',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialect:'Kólvisar',regionalLanguages:['Dálani','Ivínian']},
  {max:68,realm:'Vítho Kingdom',society:'Feudal/Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialect:'Dálazeri',regionalLanguages:['Dálani']},
  {max:80,realm:'Xêrium Kingdom',society:'Imperial',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri',nativeDialect:'Dálazeri',regionalLanguages:['Búqdin']},
  {max:82,realm:'Búqdin lands',society:'Tribal',pantheon:'Búqdin',nativeLanguage:'Búqdin',regionalLanguages:[],subsistence:'Herding'},
  {max:84,realm:'Dálani lands',society:'Tribal-Settled',pantheon:'Dálani',nativeLanguage:'Dálani',regionalLanguages:[],subsistence:'Herding'},
  {max:87,realm:'Bothísa area',society:'City-State',pantheon:'Númec',nativeLanguage:'Faláni',regionalLanguages:[]},
  {max:89,realm:'Silgôra area',society:'City-State',pantheon:'Númec',nativeLanguage:'Faláni',regionalLanguages:[]},
  {max:91,realm:'Thúbeliz area',society:'City-State',pantheon:'Númec',nativeLanguage:'Faláni',regionalLanguages:[]},
  {max:94,realm:'Falânian towns',society:'Imperial',pantheon:'Númec',nativeLanguage:'Faláni',regionalLanguages:[]},
  {max:95,realm:'Falânian colonies',society:'Imperial',pantheon:'Númec',nativeLanguage:'Faláni',regionalLanguages:['Thónian']},
  {max:100,realm:'Tribal Faláni lands',society:'Tribal-Settled',pantheon:'Númec',nativeLanguage:'Faláni',regionalLanguages:[],subsistence:'Herding'}
 ]),
 "Tríerzòn":Object.freeze([ // HMK v1.2 Appendix I p.422, d100 00 -> physical d10
  {"max":2,"realm":"Ágelos County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Treágelan"]},
  {"max":3,"realm":"Àmesúma County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Jezálin"]},
  {"max":7,"realm":"Anfáldon County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Mélsa-fáldon"]},
  {"max":11,"realm":"Àreshómes County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Aresh´ymen"]},
  {"max":13,"realm":"Báldemè County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Shólin","Central"]},
  {"max":15,"realm":"Bodíma County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Cher´ykan"]},
  {"max":17,"realm":"Bomédus County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["E. Zánori","Treágelan"]},
  {"max":19,"realm":"Chímas County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Cher´ykan"]},
  {"max":22,"realm":"Devái County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Treágelan"]},
  {"max":24,"realm":"Dòválin County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Nâsik Azéri"],"regionalLanguageDialects":{"Nâsik Azéri":"Terâzin"},"trierziDialects":["Tengálin"]},
  {"max":26,"realm":"Enála County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["W. Zánori"]},
  {"max":28,"realm":"Fâldin County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Central"]},
  {"max":29,"realm":"Faléo County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Nâsik Azéri","regionalLanguages":[],"nativeDialect":"Terâzin"},
  {"max":31,"realm":"Gelâmo County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Alonádi"]},
  {"max":32,"realm":"Hálmo County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Ilásomen","Cher´ykan","Aresh´ymen"]},
  {"max":33,"realm":"Hedámes County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Tamálan"]},
  {"max":36,"realm":"Iláska County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Ilásomen","Cher´ykan"]},
  {"max":40,"realm":"Ílbra County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Ílbro"]},
  {"max":41,"realm":"Ilóna County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Omégen"]},
  {"max":43,"realm":"Jaléda County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Alonádi"]},
  {"max":44,"realm":"Janôra County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Jezálin"]},
  {"max":46,"realm":"Kogámin County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["E. Zánori"]},
  {"max":49,"realm":"Korún County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Ilásomen","W. Zánori","Aresh´ymen"]},
  {"max":51,"realm":"Latíma County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Alonádi","W. Zánori"]},
  {"max":52,"realm":"Magália County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Nâsik Azéri","regionalLanguages":[],"nativeDialect":"Terâzin"},
  {"max":54,"realm":"Málagos County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Central"]},
  {"max":56,"realm":"Mánas County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["W. Zánori","Ilásomen"]},
  {"max":60,"realm":"Mankónia County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Central"]},
  {"max":63,"realm":"Melesúma County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Mélsa-fáldon","Nadámin"]},
  {"max":67,"realm":"Nadámia County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Nadámin"]},
  {"max":68,"realm":"Omégen County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Omégen"]},
  {"max":69,"realm":"Paláma County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Tamálan"]},
  {"max":72,"realm":"Peltáne County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Central","Treágelan"]},
  {"max":74,"realm":"Pêrna County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Central"]},
  {"max":76,"realm":"Ríndi County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Alonádi"]},
  {"max":80,"realm":"Sènedâlo County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["Sénedâr","Gálishèn","S. Stálfi"]},
  {"max":83,"realm":"Stalfôrè County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":["Émhlèn"],"trierziDialects":["S. Stálfi","N. Stálfi"]},
  {"max":85,"realm":"Tamála County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Tamálan","Cher´ykan"]},
  {"max":86,"realm":"Tashónès County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Tashín"]},
  {"max":88,"realm":"Tengéla County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Tengálin"]},
  {"max":92,"realm":"Trabánt County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Cher´ykan"]},
  {"max":94,"realm":"Ubái County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Central"]},
  {"max":96,"realm":"Védin County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["Treágelan","Alonádi"]},
  {"max":99,"realm":"Zhôren County","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Triérzi","regionalLanguages":[],"trierziDialects":["E. Zánori","Tengálin"]},
  {"max":100,"subRollOptions":[{"max":5,"realm":"Tríerzi Émhlè lands","society":"Tribal","pantheon":"Kuélrhyn","nativeLanguage":"Émhlèn","regionalLanguages":[],subsistence:'Foraging'},{"max":10,"realm":"Târkáin Principality","society":"Feudal","pantheon":"W. Venârian","nativeLanguage":"Ivínian","regionalLanguages":[],"nativeDialect":"Târkáiner"}]},
 ]),
 "Ûmélria":Object.freeze([
 {"max": 4, "realm": "Baráth Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Karéjian", "regionalLanguages": []},
 {"max": 5, "realm": "Erk´ynè Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Ûrméch", "regionalLanguages": ["Reksýni"]},
 {"max": 25, "realm": "Fêgon Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Ûrméch", "regionalLanguages": []},
 {"max": 43, "realm": "Gêlon Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Ûrméch", "regionalLanguages": []},
 {"max": 50, "realm": "Genôro Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Karéjian", "regionalLanguages": []},
 {"max": 65, "realm": "Lekûria Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Karéjian", "regionalLanguages": ["Ûrméch"]},
 {"max": 78, "realm": "Pârthias Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Ûrméch", "regionalLanguages": ["Karéjian"]},
 {"max": 97, "realm": "R´ydaz Province", "society": "City-State", "pantheon": "Azéri", "nativeLanguage": "Ûrméch", "regionalLanguages": ["Karéjian"]},
 {"max": 100, "realm": "Uméni lands", "society": "Tribal", "pantheon": "Uméni", "nativeLanguage": "Uméni", "regionalLanguages": [],subsistence:'Herding'},
 ]),
 "Býria":Object.freeze([
 {"max": 11, "realm": "Ârmala Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": []},
 {"max": 18, "realm": "Aýen Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-eastern"]},
 {"max": 21, "realm": "Bámen Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-western"]},
 {"max": 35, "realm": "Dária Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": []},
 {"max": 46, "realm": "Elónas Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-western"]},
 {"max": 57, "realm": "Ìnrítha Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": []},
 {"max": 64, "realm": "Ìnsúlana Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-western"]},
 {"max": 76, "realm": "Kàntránas Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": []},
 {"max": 84, "realm": "Kínis Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-eastern"]},
 {"max": 88, "realm": "Láselàna Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-eastern"]},
 {"max": 93, "realm": "Môrálas Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": []},
 {"max": 96, "realm": "Nâran Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": []},
 {"max": 100, "realm": "Nôrva Province", "society": "Feudal/Imperial", "pantheon": "Azéri", "nativeLanguage": "Býrian", "regionalLanguages": ["Tuvâran-western"]},
 ]),
 "Chogôro & Mafán":Object.freeze([
 {"max": 14, "realm": "Ámvâr Kingdom", "society": "Feudal", "pantheon": "Mafáni", "nativeLanguage": "Pèchalâri", "regionalLanguages": ["Chogôri"]},
 {"max": 37, "realm": "Boliâfra League", "society": "Imperial", "pantheon": "Mafáni", "nativeLanguage": "Mafáni", "regionalLanguages": ["Chogôri"]},
 {"max": 50, "realm": "Chifâr League", "society": "Imperial", "pantheon": "Mafáni", "nativeLanguage": "Mafáni", "regionalLanguages": []},
 {"max": 59, "realm": "Delúma Republic", "society": "Feudal/Imperial", "pantheon": "Mafáni", "nativeLanguage": "Chogôri", "regionalLanguages": ["Mafáni"]},
 {"max": 75, "realm": "Génjes Kingdom", "society": "Feudal", "pantheon": "Mafáni", "nativeLanguage": "Mafáni", "regionalLanguages": ["Chogôri"]},
 {"max": 83, "realm": "Lútra Kingdom", "society": "Feudal", "pantheon": "Mafáni", "nativeLanguage": "Chogôri", "regionalLanguages": ["Mafáni"]},
 {"max": 100, "realm": "Sérianàpi League", "society": "Imperial", "pantheon": "Mafáni & Anzelôrian", "nativeLanguage": "Shénti", "regionalLanguages": ["Mafáni"]},
 ]),
 "Hârbáal":Object.freeze([
 {"max": 6, "realm": "Ánvâl", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 16, "realm": "Ávastran", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 21, "realm": "Gátenlund", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 25, "realm": "Elgósa & Gildwáal", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 36, "realm": "Gávrios", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 44, "realm": "Géltheim", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 52, "realm": "Ketánia", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 62, "realm": "Lédenheim", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": ["Quârphic"]},
 {"max": 67, "realm": "Lýtheim", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 75, "realm": "Pádona", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 81, "realm": "Sáliom", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 89, "realm": "Tónanby", "society": "Viking", "pantheon": "Ivínian (mix)", "nativeLanguage": "Hârbáaler", "regionalLanguages": []},
 {"max": 96, "realm": "Chélemby Kingdom", "society": "Chélemby", "pantheon": "W. Venârian", "nativeLanguage": "Chéler", "regionalLanguages": []},
 {"max": 100, "realm": "Yârla lands", "society": "Tribal", "pantheon": "Yârla", "nativeLanguage": "Yârla", "regionalLanguages": ["Hârbáaler", "Quârphic"],subsistence:'Herding'}
 ]),
 "Hácherdad":Object.freeze([
 {"max": 8, "realm": "Bálshel Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 17, "realm": "Échrum Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 52, "realm": "Hácherùl Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 57, "realm": "Kûladith Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 68, "realm": "Mârshum Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 76, "realm": "Môrchad Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 90, "realm": "Ócharim Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 {"max": 100, "realm": "Shélum Principality", "society": "Imperial", "pantheon": "Hácherian", "nativeLanguage": "Hácherian", "regionalLanguages": []},
 ]),
 "Ketârh & Béshakan":Object.freeze([
 {"max": 26, "realm": "Ánil Ketâri lands", "society": "Tribal", "pantheon": "Ketâri", "nativeLanguage": "Ánil Ketâri", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 29, "realm": "Ketâri lands", "society": "Tribal", "pantheon": "Ketâri", "nativeLanguage": "Ketâri", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 94, "realm": "Bésha lands", "society": "Tribal", "pantheon": "Bésha", "nativeLanguage": "Bésha", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 100, "realm": "Namârdim lands", "society": "Tribal", "pantheon": "Bésha", "nativeLanguage": "Namârdi", "regionalLanguages": [],subsistence:'Foraging'},
 ]),
 "Northern Anzelôria":Object.freeze([
 {"max": 7, "realm": "Neshái lands", "society": "Tribal-Settled", "pantheon": "Anzelôrian", "nativeLanguage": "Neshái", "regionalLanguages": [],subsistence:'Farming'},
 {"max": 43, "realm": "Pèchalâri lands", "society": "Tribal-Settled", "pantheon": "Anzelôrian", "nativeLanguage": "Pèchalâri", "regionalLanguages": [],subsistence:'Farming'},
 {"max": 45, "realm": "Sogôranélè City-State", "society": "Imperial", "pantheon": "Anzelôrian", "nativeLanguage": "Pèchalâri", "regionalLanguages": []},
 {"max": 69, "realm": "Tuvâran lands, Eastern", "society": "Tribal-Settled", "pantheon": "Anzelôrian", "nativeLanguage": "Tuvâran-eastern", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 79, "realm": "Tuvâran lands, Southern", "society": "Tribal-Settled", "pantheon": "Anzelôrian", "nativeLanguage": "Tuvâran-southern", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 100, "realm": "Tuvâran lands, Western", "society": "Tribal-Settled", "pantheon": "Anzelôrian", "nativeLanguage": "Tuvâran-western", "regionalLanguages": [],subsistence:'Herding'},
 ]),
 "Quârphor":Object.freeze([
 {"max": 3, "realm": "Aúlumon Principality", "society": "Tributary", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-western", "regionalLanguages": ["Nâsik Azéri-Lánkori", "Eméla"]},
 {"max": 10, "realm": "Ékenon Principality", "society": "Tributary", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-southern", "regionalLanguages": []},
 {"max": 11, "realm": "Kvârfent Principality", "society": "Tributary", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-western", "regionalLanguages": []},
 {"max": 18, "realm": "Orlét town", "society": "Tributary", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-northern", "regionalLanguages": ["Ivínian"]},
 {"max": 24, "realm": "Vâben Principality", "society": "Tributary", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-northern", "regionalLanguages": ["Ivínian"]},
 {"max": 39, "realm": "Minor Quârphic States", "society": "Tributary", "pantheon": "Quârphic", "nativeLanguage": "Quârphic (varies)", "regionalLanguages": []},
 {"max": 43, "realm": "Quârph lands, Eastern", "society": "Tribal-Settled", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-eastern", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 60, "realm": "Quârph lands, Northern", "society": "Tribal-Settled", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-northern", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 80, "realm": "Quârph lands, Southern", "society": "Tribal-Settled", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-southern", "regionalLanguages": [],subsistence:'Herding'},
 {"max": 100, "realm": "Quârph lands, Western", "society": "Tribal-Settled", "pantheon": "Quârphic", "nativeLanguage": "Quârphic-western", "regionalLanguages": [],subsistence:'Herding'},
 ]),
 "Palíthanè":Object.freeze([ // HMK v1.2 Appendix I p.420: each printed d100 row, including repeated shires
  {max:12,realm:'Áthamas Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Eméla']},
  {max:20,realm:'Batána Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi','Émhlèn']},
  {max:22,realm:'Batána Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner','Émhlèn']},
  {max:31,realm:'Gavás Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi']},
  {max:33,realm:'Gavás Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner']},
  {max:37,realm:'Ligúno Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi']},
  {max:45,realm:'Ligúno Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner']},
  {max:48,realm:'Luíndar Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi']},
  {max:54,realm:'Luíndar Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner','Émhlèn']},
  {max:67,realm:'Nórimar Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi','Émhlèn']},
  {max:73,realm:'Nórimar Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner','Émhlèn']},
  {max:83,realm:'Skagía Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi']},
  {max:87,realm:'Skagía Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner']},
  {max:88,realm:'Tàmanías March',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Pálithàner',regionalLanguages:['Triérzi']},
  {max:97,realm:'Tàmanías March',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Triérzi',regionalLanguages:['Pálithàner']},
  {max:100,realm:'Luíndè Émhlè lands',society:'Tribal',pantheon:'Kuélrhyn',nativeLanguage:'Émhlèn',regionalLanguages:['Triérzi','Pálithàner'],subsistence:'Foraging'}
 ]),
 "Huriséa":Object.freeze([ // HMK v1.2 Appendix I p.419: 12 intervals, 11 major principalities + minor
  {max:10,realm:'Ántol Principality',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:['Quârphic-western']},
  {max:36,realm:'Beldîra Principality',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:['Quârphic-western']},
  {max:41,realm:'Chêgen Principality',society:'Tributary',pantheon:'W. Ven.-Quâr.',nativeLanguageChoices:['Shôrka','Huriséan'],nativeLanguageMode:'gm-choice',regionalLanguages:['Quârphic-western']},
  {max:45,realm:'Déchen Principality',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:[]},
  {max:49,realm:'Ékedon Principality',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:['Quârphic-western']},
  {max:50,realm:'Fîgend Principality',society:'Tributary',pantheon:'Ivínian-Quâr.',nativeLanguageChoices:['Ivínian','Huriséan'],nativeLanguageMode:'gm-choice',regionalLanguages:['Quârphic-western']},
  {max:59,realm:'Hélgen Principality',society:'Tributary',pantheon:'Ivínian-Quâr.',nativeLanguageChoices:['Hârbáaler','Huriséan'],nativeLanguageMode:'gm-choice',regionalLanguages:['Quârphic-western']},
  {max:65,realm:'Jóndes Principality',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:['Quârphic-western']},
  {max:69,realm:'Ogéned Principality',society:'Tributary',pantheon:'W. Ven.-Quâr.',nativeLanguageChoices:['Shôrka','Huriséan'],nativeLanguageMode:'gm-choice',regionalLanguages:['Quârphic-western']},
  {max:73,realm:'Pónel Principality',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:[]},
  {max:74,realm:'Únten Principality',society:'Tributary',pantheon:'Ivínian-Quâr.',nativeLanguageChoices:['Ivínian','Huriséan'],nativeLanguageMode:'gm-choice',regionalLanguages:['Quârphic-western','Áltic-western']},
  {max:100,realm:'Minor Principalities',society:'Tributary',pantheon:'Quârphic',nativeLanguage:'Huriséan',regionalLanguages:['Quârphic-western']}
 ]),
 "Ivínia":Object.freeze([ // HMK v1.2 Appendix I p.419, 80 and 97 require actual GM d10
  {max:8,realm:'Balísheim',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:12,realm:'Gélemâr',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:17,realm:'Gílbenmark',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:24,realm:'Lókemheim',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:34,realm:'Séldenbàal',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:['Yaríli']},
  {max:35,realm:'Beshéa Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:36,realm:'Éldeskaal Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:50,realm:'Govýna Grt. Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:['Yaríli','Áltic-western']},
  {max:72,realm:'Íbanvaal Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:['Yaríli']},
  {max:79,realm:'Járenmark Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:['Áltic-western']},
  {max:80,society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[],subRollOptions:[
   {max:2,realm:'Lókis Kingdom'},
   {max:10,realm:'Menglána Kingdom',regionalLanguages:['Yaríli']}
  ]},
  {max:94,realm:'Menglána Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:['Yaríli']},
  {max:96,realm:'Rógna Kingdom',society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[]},
  {max:97,society:'Viking',pantheon:'Ivínian',nativeLanguage:'Ivínian',regionalLanguages:[],subRollOptions:[
   {max:9,realm:'Rógna Kingdom'},
   {max:10,realm:'Tâvu Kingdom'}
  ]},
  {max:100,realm:'Yaríli lands',society:'Tribal',pantheon:'Yaríli',nativeLanguage:'Yaríli',regionalLanguages:['Ivínian'],subsistence:'Herding'}
 ]),
 "Dalkésh":Object.freeze([
  {max:3,realm:"Ádesh Province",society:"Imperial",pantheon:"Dálken",nativeLanguageChoices:["Elbýthian", "Bésha"],regionalLanguages:["Dálken"]},
  {max:5,realm:"Ákamar Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Pèchalâri"]},
  {max:14,realm:"Anínis Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Elbýthian"]},
  {max:23,realm:"Déhar Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:[]},
  {max:24,realm:"Donólash Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Bésha"]},
  {max:30,realm:"Galpûra Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:[]},
  {max:35,realm:"Hepónpura Province",society:"Imperial",pantheon:"Dálken",nativeLanguageChoices:["Dálken", "Karéjian"],regionalLanguages:[]},
  {max:43,realm:"Khálik Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Pèchalâri"]},
  {max:51,realm:"Khánesh Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Bésha"]},
  {max:55,realm:"Khédan Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Pèchalâri", "Tuvâran-eastern"]},
  {max:66,realm:"Nágran Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:[]},
  {max:67,realm:"Nálhaman Province",society:"Imperial",pantheon:"Dálken",nativeLanguageChoices:["Dálken", "Bésha"],regionalLanguages:[]},
  {max:75,realm:"Nàthapúra Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:[]},
  {max:84,realm:"Onripúra Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:[]},
  {max:94,realm:"Résikhar Province",society:"Imperial",pantheon:"Dálken",nativeLanguageChoices:["Elbýthian", "Karéjian"],regionalLanguages:["Dálken"]},
  {max:96,realm:"Sóbrash Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:["Tuvâran-eastern"]},
  {max:100,realm:"Tíbelos Province",society:"Imperial",pantheon:"Dálken",nativeLanguage:"Dálken",regionalLanguages:[]},
 ]),
'Emélrenè':Object.freeze([
 {max:8,realm:'Quándas Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:['Shôrka']},
 {max:25,realm:'Álgram Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:[]},
 {max:36,realm:'Fándàlon Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:[]},
 {max:54,realm:'Âlwìna Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:[]},
 {max:67,realm:'Malád Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:[]},
 {max:83,realm:'Beréma Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:['Pálithàner','Tríerzi']},
 {max:93,realm:'Úlamà Shire',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:['Pálithàner']},
 {max:94,realm:'Jerinála March',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Emélan',regionalLanguages:[]},
 {max:100,realm:'Émhlè Range',society:'Tribal',pantheon:'Covenant',nativeLanguage:'Émhlèn',regionalLanguages:[],subsistence:'Foraging'}
 ]),
 'Karéjia':Object.freeze([
 {max:10,realm:'Ájygàl Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:['Ûrméch','Hácherian']},
 {max:12,realm:'Arkéth Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Nâsik Azéri-island',regionalLanguages:['Karéjian']},
 {max:24,realm:'Dúrien Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:['Elbýthian']},
 {max:35,realm:'Gílech Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Elbýthian',regionalLanguages:['Karéjian','Bésha']},
 {max:45,realm:'Helás Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:['Nâsik Azéri-island']},
 {max:53,realm:'Hóritar Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]},
 {max:58,realm:'Ìchényah Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]},
 {max:66,realm:'Kólomîr Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Elbýthian',regionalLanguages:['Karéjian','Hácherian']},
 {max:72,realm:'Livélis Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]},
 {max:79,realm:'Nárolis Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]},
 {max:86,realm:'Phanósia Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]},
 {max:93,realm:'Rykál Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:['Nâsik Azéri-island']},
 {max:98,realm:'Shélon Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]},
 {max:100,realm:'Tázach Military Province',society:'City-State',pantheon:'Azéri',nativeLanguage:'Karéjian',regionalLanguages:[]}
 ]),
 'Reksýna':Object.freeze([
 {max:18,realm:'Eastern lands',society:'Tribal-Settled',pantheon:'Reksýni',nativeLanguage:'Reksýni',regionalLanguages:[],subsistence:'Herding'},
 {max:53,realm:'Northern lands',society:'Tribal-Settled',pantheon:'Reksýni',nativeLanguage:'Reksýni',regionalLanguages:[],subsistence:'Herding'},
 {max:80,realm:'Southern lands',society:'Tribal-Settled',pantheon:'Reksýni',nativeLanguage:'Reksýni',regionalLanguages:['Quârphic-eastern'],subsistence:'Herding'},
 {max:90,realm:'Western lands',society:'Tribal-Settled',pantheon:'Reksýni',nativeLanguage:'Reksýni',regionalLanguages:['Quârphic-eastern'],subsistence:'Herding'},
 {max:100,realm:'Mengólan lands',society:'Tribal-Settled',pantheon:'Mengólan',nativeLanguage:'Mengólan',regionalLanguages:[],subsistence:'Foraging'}
 ]),
 'Shôrkýnè':Object.freeze([
 {max:6,realm:'Bódoe County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:['Émhlèn']},
 {max:11,realm:'Méloda County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:['Émhlèn']},
 {max:15,realm:'Pélodia County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:['Émhlèn']},
 {max:19,realm:'Aneóla County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:['Quârphic-western']},
 {max:22,realm:'Ávan County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:['Émhlèn']},
 {max:25,realm:'Dumâla County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:[]},
 {max:29,realm:'Hídel County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-eastern',regionalLanguages:['Émhlèn']},
 {max:32,realm:'Istebínia County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-eastern',regionalLanguages:['Émhlèn', 'Quârphic-western']},
 {max:38,realm:'Kitálin County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-eastern',regionalLanguages:[]},
 {max:44,realm:'Nistónè County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-eastern',regionalLanguages:['Émhlèn', 'Quârphic-western']},
 {max:47,realm:'Falímæ County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-southern',regionalLanguages:['Émhlèn', 'Triérzi']},
 {max:49,realm:'Chómu County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:['Quârphic-western']},
 {max:54,realm:'Kolârè County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:[]},
 {max:58,realm:'Loála County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:[]},
 {max:61,realm:'Malpýnia County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:[]},
 {max:62,realm:'Netéla County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-coastal',regionalLanguages:[]},
 {max:65,realm:'Pilátha County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka',regionalLanguages:['Eméla']},
 {max:70,realm:'Sâbinia County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-eastern',regionalLanguages:['Émhlèn']},
 {max:76,realm:'Sháplane County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-eastern',regionalLanguages:['Quârphic-western']},
 {max:78,realm:'Kémol County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-southern',regionalLanguages:['Émhlèn']},
 {max:81,realm:'Montível County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-southern',regionalLanguages:['Triérzi']},
 {max:87,realm:'Quáreld County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-southern',regionalLanguages:['Émhlèn']},
 {max:90,realm:'Elavóna County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-southern',regionalLanguages:['Émhlèn']},
 {max:98,realm:'Vádone County',society:'Feudal',pantheon:'W. Venârian',nativeLanguage:'Shôrka-southern',regionalLanguages:[]},
 {max:100,realm:'Shôrkýnì Émhlè lands',society:'Tribal',pantheon:'Kuélrhyn',nativeLanguage:'Émhlèn',regionalLanguages:['Shôrka'],subsistence:'Foraging'}
 ]),
 'Thónia':Object.freeze([
 {max:6,realm:'Inner lands',society:'Tribal',pantheon:'Anzelôrian',nativeLanguage:'Thónian-inner',regionalLanguages:[]},
 {max:19,realm:'Laker lands',society:'Tribal',pantheon:'Anzelôrian',nativeLanguage:'Thónian-laker',regionalLanguages:[]},
 {max:23,realm:'Mountain lands',society:'Tribal',pantheon:'Anzelôrian',nativeLanguage:'Thónian-mountain',regionalLanguages:[]},
 {max:28,realm:'Northern lands',society:'Tribal',pantheon:'Anzelôrian',nativeLanguage:'Thónian-northern',regionalLanguages:[]},
 {max:39,realm:'Southern lands',society:'Tribal',pantheon:'Anzelôrian',nativeLanguage:'Thónian-southern',regionalLanguages:[]},
 {max:42,realm:'Western lands',society:'Tribal',pantheon:'Anzelôrian',nativeLanguage:'Thónian-western',regionalLanguages:[]},
 {max:88,realm:'Ârlanto Kingdom',society:'Feudal/Imperial',pantheon:'Azéri',nativeLanguage:'Hérei',regionalLanguages:['Elánasi']},
 {max:92,realm:'Elánasi lands (coastal)',society:'Tribal',pantheon:'Elánasi',nativeLanguage:'Elánasi',regionalLanguages:[],subsistence:'Fishing'},
 {max:96,realm:'Elánasi lands (inland)',society:'Tribal',pantheon:'Elánasi',nativeLanguage:'Elánasi',regionalLanguages:[],subsistence:'Herding'},
 {max:100,realm:'Hérei lands',society:'Tribal',pantheon:'Hérei',nativeLanguage:'Hérei',regionalLanguages:[],subsistence:'Herding'}
 ])});
/** Palíthanè Notes, HMK v1.2 p.420. The dialect roll is OPTIONAL
 * ("roll d100 if needed"). A missing roll on a variable-dialect realm
 * means unspecified dialect, NOT an invented default. All named Triérzi
 * dialects remain part of one base language for skills.
 */
export const PALITHANE_TRIERZI_DIALECTS=Object.freeze({
 'Áthamas Shire':Object.freeze([{max:100,dialect:'Ligúno-Áthaman'}]),
 'Batána Shire':Object.freeze([{max:100,dialect:'Lúinden'}]),
 'Gavás Shire':Object.freeze([{max:20,dialect:'Ligúno-Áthaman'},{max:100,dialect:'Ýapenan'}]),
 'Ligúno Shire':Object.freeze([{max:100,dialect:'Ligúno-Áthaman'}]),
 'Luíndar Shire':Object.freeze([{max:50,dialect:'Ligúno-Áthaman'},{max:100,dialect:'Lúinden'}]),
 'Nórimar Shire':Object.freeze([{max:100,dialect:'Palgánin'}]),
 'Skagía Shire':Object.freeze([{max:25,dialect:'Lúinden'},{max:100,dialect:'Ýapenan'}]),
 'Tàmanías March':Object.freeze([{max:60,dialect:'Tàmánian'},{max:100,dialect:'Gálishèn'}]),
 'Luíndè Émhlè lands':Object.freeze([{max:65,dialect:'Ligúno-Áthaman'},{max:100,dialect:'Lúinden'}])
});
/** Appendix I p.418, 18 Hârnic tribal groups; ALL 100 physical d100 results.
 * Additional subsistence references derive only from Tribal table on p.29.
 * Adaénum and Goz´yda have multiple documented subgroup economies; GM
 * chooses which subgroup, without an invented demographic roll. */
export const HARN_TRIBES=Object.freeze([
 {max:5,tribe:'Adaénum',nativeLanguage:'Járin',nativeLanguageDialect:'Adaénian',communityOptions:[{id:'Anac',subsistence:'Fishing'},{id:'Shu',subsistence:'Farming'}]},
 {max:9,tribe:'Anoa',nativeLanguage:'Járin',nativeLanguageDialect:'Nuthélan',subsistence:'Foraging'},
 {max:12,tribe:'Bújoc',nativeLanguage:'Hârnic',nativeLanguageDialect:'Ánadel',subsistence:'Foraging'},
 {max:16,tribe:'Chélni',nativeLanguage:'Hârnic',nativeLanguageDialect:'Chóhar',subsistence:'Foraging'},
 {max:17,tribe:'Ch´ymak',nativeLanguage:'Ch´yma',subsistence:'Fishing'},
 {max:23,tribe:'Equáni',nativeLanguage:'Járin',nativeLanguageDialect:'Peránic',subsistence:'Foraging'},
 {max:27,tribe:'Goz´yda',nativeLanguage:'Hârnic',nativeLanguageDialect:'Uphâri',communityOptions:[{id:'Domi',subsistence:'Fishing'},{id:'Mim./Ram.',subsistence:'Foraging'}]},
 {max:43,tribe:'Hodíri',nativeLanguage:'Hârnic',nativeLanguageDialect:'Chóhar',subsistence:'Herding'},
 {max:44,tribe:'Kablóqui',nativeLanguage:'Járin',nativeLanguageDialect:'Peránic',subsistence:'Foraging'},
 {max:46,tribe:'Kamáki',nativeLanguage:'Kamákin',subsistence:'Fishing'},
 {max:48,tribe:'Kath',nativeLanguage:'Hârnic',nativeLanguageDialect:'Uphâri',subsistence:'Foraging'},
 {max:56,tribe:'Kùbôra',nativeLanguage:'Járin',nativeLanguageDialect:'Peránic',subsistence:'Foraging'},
 {max:68,tribe:'Pagáèlin',nativeLanguage:'Hârnic',subsistence:'Foraging'},
 {max:71,tribe:'Solôri',nativeLanguage:'Hârnic',nativeLanguageDialect:'Sôlora',subsistence:'Foraging'},
 {max:82,tribe:'Taélda',nativeLanguage:'Járin',nativeLanguageDialect:'Nuthélan',subsistence:'Foraging'},
 {max:92,tribe:'Túlwyn',nativeLanguage:'Hârnic',nativeLanguageDialect:'Uphâri',subsistence:'Foraging'},
 {max:98,tribe:'Ûrdu',nativeLanguage:'Járin',nativeLanguageDialect:'Peránic',subsistence:'Foraging'},
 {max:100,tribe:'Ymódi',nativeLanguage:'Járin',nativeLanguageDialect:'Nuthélan',subsistence:'Foraging'}
]);
/** Appendix I p.416: a second physical d100 determines the Álti tribe.
 * The Valley Álti are the Settled subtype (HMK p.29); no app RNG. */
export const ALTI_TRIBES=Object.freeze([
 {max:20,tribe:'Forest Álti',subsistence:'Foraging',society:'Tribal'},
 {max:60,tribe:'Great Álti',subsistence:'Herding',society:'Tribal'},
 {max:80,tribe:'Valley Álti',subsistence:'Farming',society:'Tribal-Settled'},
 {max:100,tribe:'Water Álti',subsistence:'Fishing',society:'Tribal'}
]);
/** Required physical tribe d100 for Hârn Tribal lands or Álti lands. */
export function regionHarnTribeDieRequired(region,{roll=null,realm=null}={}){
 if(!['Hârn','Áltôr'].includes(region))return null;
 const given=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 if(given){const n=Number(roll);if(!Number.isInteger(n)||n<1||n>100)return null;
  return region==='Hârn'?(n>=84?100:null):(n>=12?100:null);}
 return region==='Hârn'?(realm==='Tribal lands'?100:null):(['West Álti lands','East Álti lands'].includes(realm)?100:null);
}
export function regionHarnCommunityChoices(region,{roll=null,realm=null,tribeRoll=null}={}){
 if(region!=='Hârn')return [];
 const has=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 const n=Number(roll);if(has&&(!Number.isInteger(n)||n<1||n>100))return [];
 const row=has?VERIFIED_REGIONS['Hârn'].find(r=>n<=r.max):regionRealmRows('Hârn').find(r=>r.realm===realm);
 if(!row)return [];
 if(row.harnElder)return ['Ázadmêre (Kúzhai rule)','Eváel (Sináin rule)'];
 if(row.realm==='Orbáal Kingdom'&&!has)return ['Ivínian rulers','Subjugated Járin'];
 if(row.harnTribal){
  const die=Number(tribeRoll);if(tribeRoll===null||tribeRoll===undefined||String(tribeRoll).trim()===''||!Number.isInteger(die)||die<1||die>100)return [];
  return (HARN_TRIBES.find(t=>die<=t.max)?.communityOptions??[]).map(x=>x.id);
 }
 return [];
}

/** Public helper for UI: optional physical d100 only when dialect varies. */
export function regionDialectDieRequired(region,{roll=null,realm=null}={}){
 if(region!=='Palíthanè')return null;
 const n=Number(roll),given=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 if(given&&(!Number.isInteger(n)||n<1||n>100))return null;
 const selected=given?VERIFIED_REGIONS[region].find(r=>n<=r.max)?.realm:realm;
 return (PALITHANE_TRIERZI_DIALECTS[selected]?.length??0)>1?100:null;
}
/** Appendix I p.422 notes: these eight eponymous duchies include the named counties.
 * This is descriptive region metadata, not an additional dice roll. */
export const TRIERZON_DUCHIES=Object.freeze({
 'Ágelos County':['Jaléda County'],
 'Fâldin County':['Báldemè County'],
 'Kogámin County':['Magália County'],
 'Melesúma County':['Àmesúma County','Bomédus County'],
 'Stalfôrè County':['Enála County','Ílbra County'],
 'Trabánt County':['Chímas County','Védin County'],
 'Ubái County':null,
 'Mankónia County':null
});
/** Appendix I p.422 groups the two royal domains together, without
 * dividing the constituent counties between the two duchies. */
export const TRIERZON_ROYAL_DOMAIN=Object.freeze({
 duchies:['Ubái County','Mankónia County'],
 counties:['Janôra County','Korún County','Latíma County','Omégen County','Paláma County','Pêrna County','Tashónès County']
});
/** Trierzi has 26 printed dialects (p.422 and Language note O, p.425).
 * Multiple dialects are a bounded GM CHOICE, not a printed dice subtable.
 * The first is usually dominant but no dialect is invented without choosing.
 */
export function regionTrierzonDialectChoices(region,{roll=null,realm=null,subRoll=null}={}){
 if(region!=='Tríerzòn')return [];
 const rows=VERIFIED_REGIONS[region];const has=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 let selected;
 if(has){const n=Number(roll);if(!Number.isInteger(n)||n<1||n>100)return [];
  selected=rows.find(r=>n<=r.max);
  if(selected?.subRollOptions){const d=Number(subRoll);if(!Number.isInteger(d)||d<1||d>10||subRoll===null||String(subRoll).trim()==='')return [];
   selected=selected.subRollOptions.find(r=>d<=r.max);
  }
 }else selected=regionRealmRows(region).find(r=>r.realm===realm);
 return [...(selected?.trierziDialects??[])];
}
/** HMK Appendix I p.416: the first listed native Nâsik Azéri dialect is
 * not a mandated default when multiple variants are printed. No random die.
 * For a shared Realm on d100=99/00 the same printed Lánkori variant applies.
 */
export function regionAzeriDialectChoices(region,{roll=null,realm=null,subRoll=null}={}){
 if(region!=='Ázeryàn')return [];
 const rows=VERIFIED_REGIONS[region];const has=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 let selected;
 if(has){const n=Number(roll);if(!Number.isInteger(n)||n<1||n>100)return [];
  selected=rows.find(r=>n<=r.max);
  if(selected?.subRollOptions){const d=Number(subRoll);if(subRoll===undefined||subRoll===null||String(subRoll).trim()===''||!Number.isInteger(d)||d<1||d>10)return [];
   selected=selected.subRollOptions.find(r=>d<=r.max);
  }
 }else selected=regionRealmRows(region).find(r=>r.realm===realm);
 return [...(selected?.nativeDialects??[])];
}
/** Appendix I p.417, Dalkésh: where two native languages are printed, each
 * has equal chance (GM rolls d2). The unselected one becomes regional.
 * This resolver is shared by physical d100 and direct-GM Realm selection.
 */
/** Return only the printed Appendix I sub-die requirement, never a random result. */
export function regionSubDieRequired(region,die){
 const rows=VERIFIED_REGIONS[region];
 if(!rows||die===undefined||die===null||String(die).trim()==='')return null;
 const n=Number(die);
 if(!Number.isInteger(n)||n<1||n>100)return null;
 return rows.find(row=>n<=row.max)?.subRollOptions?10:null;
}
export function regionRealmRows(region){
 return (VERIFIED_REGIONS[region]??[]).flatMap(row=>row.subRollOptions?
  row.subRollOptions.map(o=>({...row,...o,subRollOptions:undefined})):[row]);
}
/** In Huriséa and the towns of Áltôr, printed alternatives are GM decisions, not a d2.
 * Appendix I p.419 note: the ruler languages prevail in ruling families,
 * Huriséan among most non-nobility. No invented random distribution.
 */
export function regionNativeLanguageChoices(region,{roll=null,realm=null}={}){
 const rows=VERIFIED_REGIONS[region];if(!rows)return [];
 const die=roll===null||roll===undefined||String(roll).trim()===''?null:Number(roll);
 const hasRoll=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 if(hasRoll&&(!Number.isInteger(die)||die<1||die>100))return [];
 const row=hasRoll?rows.find(x=>die<=x.max):regionRealmRows(region).find(x=>x.realm===realm);
 if(region==='Palíthanè'&&!hasRoll){
  const languages=[...new Set(rows.filter(x=>x.realm===realm).map(x=>x.nativeLanguage))];
  return languages.length>1?languages:[];
 }
 return row?.nativeLanguageMode==='gm-choice'?[...row.nativeLanguageChoices]:[];
}
/** Hèpekéria p.418: these two society-conditioned entries specify no die.
 * In Kôrlúa the ruling Ivinian minority is 20% and Korlic common folk 80%;
 * those descriptive percentages are NOT a mandated physical d100 roll.
 */
export function regionHepekeriaCommunityChoices(region,{roll=null,realm=null}={}){
 if(region!=='Hèpekéria')return [];
 const n=Number(roll),given=roll!==null&&roll!==undefined&&String(roll).trim()!=='';
 if(given&&(!Number.isInteger(n)||n<1||n>100))return [];
 const row=given?VERIFIED_REGIONS[region].find(x=>n<=x.max):regionRealmRows(region).find(x=>x.realm===realm);
 return (row?.communityOptions??[]).map(x=>x.id);
}
function regionResult(region,row,{roll=null,languageRoll=null,selectedByGM=false,languageChoice=null,dialectRoll=null,dialectChoice=null,azeriDialectChoice=null,regionCommunityChoice=null,regionTribeRoll=null}={}){
 const choices=row.nativeLanguageChoices;
 let nativeLanguage=row.nativeLanguage??(row.nativeLanguageChoices?.join(' or ')??null),regionalLanguages=[...row.regionalLanguages];
 if(row.nativeLanguageMode==='gm-choice'){
  if(languageRoll!==null&&languageRoll!==undefined&&String(languageRoll).trim()!=='')throw Error(region==='Huriséa'?'Huriséa: pro volbu mateřské řeči není v HMK stanoven d2 (p.419)':'Áltôr: pro dvojjazyčné towns není předepsán d2 (p.416)');
  if(!choices.includes(languageChoice))throw Error(region==='Huriséa'?'Huriséa: GM musí zvolit jeden ze dvou uvedených mateřských jazyků (p.419)':'Áltôr: GM musí zvolit jednu z povolených mateřských řečí (p.416)');
  nativeLanguage=languageChoice;
 }else if(region==='Palíthanè'&&selectedByGM&&languageChoice!==null&&languageChoice!==undefined&&String(languageChoice).trim()!==''){
  if(VERIFIED_REGIONS[region].filter(x=>x.realm===row.realm).length===1||row.nativeLanguage!==languageChoice)throw Error('Palíthanè: GM zvolil nepřípustný mateřský jazyk');
 }else if(languageChoice!==null&&languageChoice!==undefined&&String(languageChoice).trim()!=='')throw Error('Native Language GM volba není povolena pro tento Realm');
 if(choices&&row.nativeLanguageMode!=='gm-choice'){
  if(languageRoll!==null&&languageRoll!==undefined&&String(languageRoll).trim()!==''){
   const n=Number(languageRoll);
   if(!/^[12]$/.test(String(languageRoll))||!Number.isInteger(n))throw Error('Fyzický Native Language d2 musí být 1–2');
   nativeLanguage=choices[n-1];regionalLanguages.push(choices[2-n]);
  }
 }else if(languageRoll!==null&&languageRoll!==undefined&&String(languageRoll).trim()!=='')throw Error('Native Language d2 je povolen pouze při dvou jazycích v Appendix I');
 const result={region,realm:row.realm,society:row.society,pantheon:row.pantheon,nativeLanguage,regionalLanguages};
 if(choices){result.nativeLanguageOptions=[...choices];if(row.nativeLanguageMode==='gm-choice')result.languageChoice=nativeLanguage;else if(nativeLanguage!==null)result.languageRoll=Number(languageRoll);}
 if(region==='Palíthanè'){
  const variants=PALITHANE_TRIERZI_DIALECTS[row.realm];
  if(selectedByGM&&languageChoice!==null&&languageChoice!==undefined&&String(languageChoice).trim()!=='')result.languageChoice=languageChoice;
  if(dialectRoll!==null&&dialectRoll!==undefined&&String(dialectRoll).trim()!==''){
   const d=Number(dialectRoll);
   if(variants.length===1)throw Error('Palíthanè: pro pevný dialekt není další d100 potřeba');
   if(!/^(100|[1-9][0-9]?)$/.test(String(dialectRoll))||!Number.isInteger(d)||d<1||d>100)throw Error('Palíthanè: neplatný fyzický d100 pro dialekt');
   result.trierziDialect=variants.find(x=>d<=x.max).dialect;
   result.dialectRoll=d;
  }else if(variants.length===1)result.trierziDialect=variants[0].dialect;
 }else if(dialectRoll!==null&&dialectRoll!==undefined&&String(dialectRoll).trim()!=='')throw Error('Fyzický d100 pro dialekt platí jen pro Palíthanè');
 if(region==='Tríerzòn'){
  const valid=row.trierziDialects??[];
  if(dialectChoice!==null&&dialectChoice!==undefined&&String(dialectChoice).trim()!==''){
   if(!valid.includes(dialectChoice))throw Error('Tríerzòn: GM zvolil nepřípustný dialekt Triérzi (p.422)');
   result.trierziDialect=dialectChoice;result.dialectChoice=dialectChoice;
  }else if(valid.length===1)result.trierziDialect=valid[0];
  else if(valid.length>1)result.trierziDialectOptions=[...valid];
  if(row.nativeDialect)result.nativeLanguageDialect=row.nativeDialect;
  if(row.regionalLanguageDialects)result.regionalLanguageDialects={...row.regionalLanguageDialects};
  if(TRIERZON_DUCHIES[row.realm])result.duchyCounties=[...TRIERZON_DUCHIES[row.realm]];
  if(TRIERZON_ROYAL_DOMAIN.duchies.includes(row.realm))result.royalDomain={duchies:[...TRIERZON_ROYAL_DOMAIN.duchies],counties:[...TRIERZON_ROYAL_DOMAIN.counties]};
 }else if(dialectChoice!==null&&dialectChoice!==undefined&&String(dialectChoice).trim()!=='')throw Error('GM volba dialektu Triérzi platí jen pro Tríerzòn');
 if(region==='Ázeryàn'){
  const valid=row.nativeDialects??[];
  if(azeriDialectChoice!==null&&azeriDialectChoice!==undefined&&String(azeriDialectChoice).trim()!==''){
   if(!valid.includes(azeriDialectChoice))throw Error('Ázeryàn: GM zvolil nepřípustný dialekt Nâsik Azéri (p.416)');
   result.nativeLanguageDialect=azeriDialectChoice;
   result.azeriDialectChoice=azeriDialectChoice;
  }else if(valid.length===1)result.nativeLanguageDialect=valid[0];
  else if(valid.length>1)result.nativeLanguageDialectOptions=[...valid];
  if(row.regionalLanguageDialects)result.regionalLanguageDialects={...row.regionalLanguageDialects};
  // p.416 & Appendix II p.424: a native Nâsik Azéri speaker with 5 native DP
  // additionally receives 4 native Zakimladal DP. Skill specialisation is
  // still pending; preserve the rule metadata without silently allocating DP.
  if(row.nativeLanguage==='Nâsik Azéri')result.zakimladalRule={whenNativeNasikDP:5,language:'Zâkimladal',nativeDP:4,applied:false,sourcePage:416};
 }else if(azeriDialectChoice!==null&&azeriDialectChoice!==undefined&&String(azeriDialectChoice).trim()!=='')throw Error('GM volba dialektu Nâsik Azéri platí jen pro Ázeryàn');
 if(region==='Áltôr'){
  if(row.alticTribal){
   const t=Number(regionTribeRoll);
   if(regionTribeRoll===undefined||regionTribeRoll===null||String(regionTribeRoll).trim()===''||!Number.isInteger(t)||t<1||t>100||!/^(100|[1-9][0-9]?)$/.test(String(regionTribeRoll)))
    throw Error('Áltôr: West/East Álti lands vyžadují fyzický tribe d100 (Appendix I p.416)');
   const tribe=ALTI_TRIBES.find(x=>t<=x.max);
   result.tribeRoll=t;result.tribe=tribe.tribe;
   result.society=tribe.society;result.subsistence=tribe.subsistence;
   result.alticTribeEvidence={sourcePage:416,subsistenceSourcePage:29,settled:tribe.society==='Tribal-Settled'};
  }else if(regionTribeRoll!==undefined&&regionTribeRoll!==null&&String(regionTribeRoll).trim()!=='')
   throw Error('Áltôr: tribe d100 lze zadat pouze ve West/East Álti lands');
  if(row.nativePopulationNote)result.nativePopulationNote=row.nativePopulationNote;
 }
 if(region==='Hârn'){
  if(row.harnElder){
   const choices=regionHarnCommunityChoices('Hârn',{roll,realm:row.realm});
   if(!choices.includes(regionCommunityChoice))throw Error('Hârn Elder Realms: GM musí zvolit doložené lidské sídlo (p.418)');
   result.regionCommunityChoice=regionCommunityChoice;
   result.regionalLanguages=[regionCommunityChoice.startsWith('Ázadmêre')?'Kúzhan':'Sináin'];
   result.harnElderEvidence={humanJarin:true,residence:regionCommunityChoice,sourcePage:418,physicalRollRequired:false};
  }else if(row.realm==='Orbáal Kingdom'){
   // The physical regional d100 selects the rulers or the subjugated Járin;
   // only an unrolled direct-GM choice needs the bounded distinction.
   const community=selectedByGM?regionCommunityChoice:row.harnOrbaal;
   if(!['Ivínian rulers','Subjugated Járin'].includes(community))throw Error('Hârn Orbáal: GM musí zvolit doloženou komunitu');
   if(!selectedByGM&&regionCommunityChoice!==null&&regionCommunityChoice!==undefined&&String(regionCommunityChoice).trim()!=='')throw Error('Hârn Orbáal: fyzický d100 již komunitu určil');
   result.regionCommunityChoice=selectedByGM?community:undefined;
   result.harnOrbaal=community;
   result.nativeLanguage=community==='Ivínian rulers'?'Orbáaler':'Járin';
   result.regionalLanguages=community==='Ivínian rulers'?['Járin','Hârnic']:['Orbáaler','Hârnic'];
  }else if(!row.harnTribal&&regionCommunityChoice!==null&&regionCommunityChoice!==undefined&&String(regionCommunityChoice).trim()!=='')throw Error('Hârn: volba komunity není povolena v daném Realm');
  if(row.harnTribal){
   const d=Number(regionTribeRoll);
   if(regionTribeRoll===undefined||regionTribeRoll===null||String(regionTribeRoll).trim()===''||!Number.isInteger(d)||d<1||d>100||!/^(100|[1-9][0-9]?)$/.test(String(regionTribeRoll)))
    throw Error('Hârn Tribal lands vyžadují fyzický d100 pro tribe (Appendix I, p.418)');
   const tribe=HARN_TRIBES.find(x=>d<=x.max);
   result.tribeRoll=d;result.tribe=tribe.tribe;
   result.nativeLanguage=tribe.nativeLanguage;result.nativeLanguageDialect=tribe.nativeLanguageDialect??null;
   result.tribalPantheonGMRequired=true; // printed 'various', not silently guessed
   if(tribe.communityOptions){
    const opt=tribe.communityOptions.find(x=>x.id===regionCommunityChoice);
    if(!opt)throw Error('Hârn: pro kmen Adaénum/Goz´yda musí GM určit podskupinu dle obživy p.29');
    result.regionCommunityChoice=opt.id;result.subsistence=opt.subsistence;
   }else{result.subsistence=tribe.subsistence;
    if(regionCommunityChoice!==null&&regionCommunityChoice!==undefined&&String(regionCommunityChoice).trim()!=='')throw Error('Hârn: nepřípustná kmenová podskupina');}
  }else if(regionTribeRoll!==undefined&&regionTribeRoll!==null&&String(regionTribeRoll).trim()!=='')throw Error('Hârn: tribe d100 lze zadat jen pro Tribal lands');
 }else if(region!=='Áltôr'&&regionTribeRoll!==undefined&&regionTribeRoll!==null&&String(regionTribeRoll).trim()!=='')throw Error('Tribe d100 nelze zadat v jiném regionu než Hârn/Áltôr');
 if(region==='Hèpekéria'){
  const valid=row.communityOptions??[];
  if(valid.length){
   const chosen=valid.find(x=>x.id===regionCommunityChoice);
   if(!chosen)throw Error('Hèpekéria: GM musí potvrdit povolenou komunitu Dýsor/Kôrlúa (p.418)');
   result.regionCommunityChoice=chosen.id;
   result.pantheon=chosen.pantheon??result.pantheon;
   result.nativeLanguage=chosen.nativeLanguage??result.nativeLanguage;
   result.regionalLanguages=[...(chosen.regionalLanguages??result.regionalLanguages)];
   result.communityEvidence={choice:chosen.id,sourcePage:418,physicalRollRequired:false};
   if(chosen.populationPercent)result.communityEvidence.populationPercent=chosen.populationPercent;
  }else if(regionCommunityChoice!==null&&regionCommunityChoice!==undefined&&String(regionCommunityChoice).trim()!=='')
   throw Error('Hèpekéria: komunita není povolená v tomto Realm (p.418)');
  if(row.numecDialectCommunity)result.numecDialectCommunity=row.numecDialectCommunity;
  if(row.nativeDialect)result.nativeLanguageDialect=row.nativeDialect;
  if(row.regionalLanguageDialects)result.regionalLanguageDialects={...row.regionalLanguageDialects};
  if(row.subsistence)result.subsistence=row.subsistence;
 }else if(region!=='Hârn'&&regionCommunityChoice!==null&&regionCommunityChoice!==undefined&&String(regionCommunityChoice).trim()!=='')
  throw Error('Volba komunity Hèpekéria není povolená v jiném regionu');
 // Subsistence printed in HMK p.29 is authoritative for the linked tribe.
 if(row.subsistence)result.subsistence=row.subsistence;
 if(selectedByGM)result.selectedByGM=true;else result.roll=Number(roll);
 return result;
}
export function realmFromRegionRoll(region,die,languageRoll=null,subRoll=null,languageChoice=null,dialectRoll=null,dialectChoice=null,azeriDialectChoice=null,regionCommunityChoice=null,regionTribeRoll=null){
 const rows=VERIFIED_REGIONS[region];if(!rows)throw Error('Nepodporovaná automatická regionální tabulka');
 const n=Number(die);if(!Number.isInteger(n)||n<1||n>100||String(die).trim()==='')throw Error('Fyzický region d100 1–100');
 let row=rows.find(r=>n<=r.max),resolvedSub=null;
 if(row.subRollOptions){
  if(subRoll===undefined||subRoll===null||String(subRoll).trim()==='')throw Error(`${region} d100 ${n}: povinný fyzický d10 pro Realm (Appendix I, p.${region==='Tríerzòn'?422:region==='Ázeryàn'?416:419})`);
  const m=Number(subRoll);
  if(!Number.isInteger(m)||m<1||m>10||!/^(10|[1-9])$/.test(String(subRoll)))throw Error('Neplatný fyzický Realm d10 (1–10)');
  const selection=row.subRollOptions.find(o=>m<=o.max);
  row={...row,...selection};resolvedSub=m;
 }else if(subRoll!==undefined&&subRoll!==null&&String(subRoll).trim()!=='')throw Error('Fyzický Realm d10 je povolen pouze pro regiony a hody s předepsanou podtabulkou v Appendix I');
 const result=regionResult(region,row,{roll:n,languageRoll,languageChoice,dialectRoll,dialectChoice,azeriDialectChoice,regionCommunityChoice,regionTribeRoll});
 if(resolvedSub!==null)result.subRoll=resolvedSub;
 return result;
}
export function realmFromRegionSelection(region,realm,languageRoll=null,subRoll=null,languageChoice=null,dialectRoll=null,dialectChoice=null,azeriDialectChoice=null,regionCommunityChoice=null,regionTribeRoll=null){
 if(subRoll!==undefined&&subRoll!==null&&String(subRoll).trim()!=='')throw Error('Vědomá volba Realm nepoužívá žádný dodatečný d10');
 const variants=regionRealmRows(region).filter(x=>x.realm===realm);
 if(!variants.length)throw Error('Zvolený Realm není mezi povolenými možnostmi příslušného Region Appendix I');
 if(region==='Palíthanè'&&variants.length>1&&!variants.some(x=>x.nativeLanguage===languageChoice))
  throw Error('Palíthanè: při přímé volbě tohoto Realm musí GM vybrat povolený mateřský jazyk (p.420)');
 if(region==='Hârn'&&realm==='Orbáal Kingdom'&&!['Ivínian rulers','Subjugated Járin'].includes(regionCommunityChoice))throw Error('Hârn: při přímé volbě Orbáal musí GM určit ruling/subjugated community');
 const row=region==='Palíthanè'&&variants.length>1?variants.find(x=>x.nativeLanguage===languageChoice):region==='Hârn'&&realm==='Orbáal Kingdom'?variants.find(x=>x.harnOrbaal===regionCommunityChoice):variants[0];
 return regionResult(region,row,{selectedByGM:true,languageRoll,languageChoice,dialectRoll,dialectChoice,azeriDialectChoice,regionCommunityChoice,regionTribeRoll});
}
export const BACKGROUND_SKILL_POOLS=Object.freeze({
 Rural:['Agriculture','Animalcraft','Awareness','Brewing','Cookery','Fishing','Fletching','Hideworking','Metalcraft','Riding','Seamanship','Swimming','Timbercraft','Woodworking'],
 Urban:['Animalcraft','Brewing','Ceramics','Cookery','Dancing','Drawing','Intrigue','Folklore','Hideworking','Metalcraft','Musician','Seamanship','Textilecraft','Woodworking'],
 Wilderness:['Herblore','Tracking','Survival'],City:['Language','Mercantilism','Theatrics'],
 Sinái:['Fletching','Folklore','Herblore','Initiative','Physician','Pvârism','Riding','Spirit','Tracking'],
 Kúzhai:['Command','Folklore','Initiative','Mercantilism'],Malákta:['Command','Initiative','Melee']
});
export function availableBackgroundSkills(background,{viking=false,folk='Human',emhle=false}={}){
 let key=background==='City'?'Urban':background==='Wilderness'?'Rural':background;
 if(!BACKGROUND_SKILL_POOLS[key])throw Error('Neznámý Background');
 const extras=[...(BACKGROUND_SKILL_POOLS[background]??[])];
 if(viking)extras.push('Seamanship','Piloting');
 if(emhle)extras.push('Ritual'); // HMK p.343: Émhlè added to Background options
 // The printed p.46 special columns supplement the ordinary Background options.
 const heritage=folk==='Sidhé'?'Sinái':folk;
 if(BACKGROUND_SKILL_POOLS[heritage])extras.push(...BACKGROUND_SKILL_POOLS[heritage]);
 return [...new Set([...BACKGROUND_SKILL_POOLS[key],...extras])];
}
// HMK pp.42–44: each *alternative* is one completely specified printed DP list.
// Chandler's One Craft is any skill listed in the Craft GROUP on p.46.
// Thespian chooses two DISTINCT items among three: the first receives 4 DP,
// the second 3 DP. No new die or phantom composite Skill is introduced.
// HMK v1.2 printed p.44: every Slave receives TWO DIFFERENT Physical
// skills (p.46) at 2 DP EACH, plus the type-specific grants below.
// No die is rolled for these skills; the player selects a bounded pair.
export const SLAVE_PHYSICAL_CHOICES=Object.freeze(['Acrobatics','Awareness','Climbing','Dancing','Jumping','Legerdemain','Riding','Stealth','Swimming']);
export const SLAVE_TYPE_GRANTS=Object.freeze({
 Craft:{Woodworking:4,Metalcraft:3},
 Domestic:{Textilecraft:4,Herblore:1,Cookery:2},
 Farming:{Agriculture:4,Animalcraft:3},
 Fishing:{Fishing:4,Seamanship:3},
 Herding:{Animalcraft:4,Survival:3}
});
const SLAVE_PROFILES=Object.freeze(Object.fromEntries(Object.entries(SLAVE_TYPE_GRANTS).flatMap(([type,grants])=>
 SLAVE_PHYSICAL_CHOICES.flatMap((first,i)=>SLAVE_PHYSICAL_CHOICES.slice(i+1).map(second=>{
  const name=`Slave (${type}: ${first} + ${second})`;
  return [name,{die:0,skills:{...grants,[first]:2,[second]:2}}];
 }))
)));
export const SLAVE_VARIANTS=Object.freeze(Object.keys(SLAVE_PROFILES));
export function slaveVariantsForType(name){
 const match=/^Slave \((Craft|Domestic|Farming|Fishing|Herding)\)$/.exec(String(name??''));
 return match?SLAVE_VARIANTS.filter(n=>n.startsWith(`Slave (${match[1]}:`)):[];
}
export const CHANDLER_CRAFT_CHOICES=Object.freeze(['Ceramics','Drawing','Fletching','Glassworking','Hideworking','Jewelcraft','Lockcraft','Masonry','Metalcraft','Milling','Musician','Textilecraft','Weaponcraft','Woodworking']);
export const THESPIAN_EXTRA_CHOICES=Object.freeze(['Acrobatics','Legerdemain','Musician']);
export function occupationVariantNames(name){
 // The Parent Occupation d20 (p.27/32) and, when needed, physical d6 (p.195)
 // are already resolved by parentOccupationFromRoll. Fyvria alone still needs
 // the printed bounded GM choice of two DIFFERENT crafts from its five choices.
 const arcanistFyvria=/^(?:Gentry: )?Arcanist \(Shèk-Pvâr\) \(Fývria\)$/.test(name);
 if(arcanistFyvria)return PVAR_VARIANTS.filter(n=>n.startsWith('Shèk-Pvâr (Fývria:'));
 if(name==='Hunter or Trapper')return ['Hunter','Trapper'];
 if(slaveVariantsForType(name).length)return slaveVariantsForType(name);
 if(name==='Shaman')return [...SHAMAN_VARIANTS];
 if(name==='Invoker')return ['Invoker',...TRIBAL_INVOKER_VARIANTS];
 if(name==='Priest'||name==='Gentry: Priest')return [...PRIEST_VARIANTS];
  if(name==='Shèk-Pvâr')return [...PVAR_VARIANTS];
 if(name==='Shèk-Pvâr (Fývria)')return PVAR_VARIANTS.filter(n=>n.startsWith('Shèk-Pvâr (Fývria:'));
  if(name==='Chandler')return CHANDLER_CRAFT_CHOICES.map(skill=>`Chandler (${skill})`);
 if(name==='Lìa-Kaváir')return ['Lìa-Kaváir (Acrobatics)','Lìa-Kaváir (Guile)'];
 if(name==='Thespian')return THESPIAN_EXTRA_CHOICES.flatMap(first=>THESPIAN_EXTRA_CHOICES.filter(other=>other!==first).map(second=>`Thespian (${first} 4, ${second} 3)`));
 return [];
}
// HMK v1.2 pp.42,44: Shaman's last grant is ONE of Spirit or an
// ALREADY PHYSICALLY GENERATED Arcane Talent.  Invoker's 2 talents are
// prerequisites (not +2 invented Talent DP). Tribal Invoker also gains one
// culture-determined livelihood skill and Ritual 3.
import {TALENT_NAMES} from './hmk-arcane-talent.js';
export const SHAMAN_VARIANTS=Object.freeze(['Shaman (Spirit)',...TALENT_NAMES.map(n=>`Shaman (Talent: ${n})`)]);
const SHAMAN_BASE={Trance:4,Herblore:3,Ritual:3,Survival:2,Folklore:2,Physician:2};
const SHAMAN_OCCUPATIONS=Object.fromEntries(SHAMAN_VARIANTS.map(n=>{
 const type=n==='Shaman (Spirit)'?'Spirit':`Talent (${n.slice('Shaman (Talent: '.length,-1)})`;
 return [n,{die:2,skills:{...SHAMAN_BASE,[type]:2}}];
}));
const INVOKER_BASE={Tarotry:3,Folklore:3,Survival:2,Herblore:3,Physician:2};
export const TRIBAL_INVOKER_SUBSISTENCE=Object.freeze({Farming:'Agriculture',Fishing:'Fishing',Herding:'Animalcraft',Foraging:'Tracking'});
export const TRIBAL_INVOKER_VARIANTS=Object.freeze(Object.keys(TRIBAL_INVOKER_SUBSISTENCE).map(n=>`Invoker (Tribal: ${n})`));
const INVOKER_OCCUPATIONS={
 Invoker:{die:2,skills:{...INVOKER_BASE}},
 ...Object.fromEntries(Object.entries(TRIBAL_INVOKER_SUBSISTENCE).map(([livelihood,skill])=>[
  `Invoker (Tribal: ${livelihood})`,{die:2,skills:{...INVOKER_BASE,Ritual:3,[skill]:4}}
 ]))
};
export function isArcaneOccupationEligible(character,name){
 const n=String(name??''),h=character?.hmk??{},p=h.creation?.values?.arcaneTalentProof,available=p?.generated??[];
 if(n.startsWith('Shaman (Talent: '))return available.includes(n.slice('Shaman (Talent: '.length,-1));
 if(n==='Invoker')return new Set(available).size>=2;
 if(TRIBAL_INVOKER_VARIANTS.includes(n))return new Set(available).size>=2&& ['Tribal','Tribal-Settled'].includes(h.society)&&n===`Invoker (Tribal: ${h.creation?.values?.regionProof?.subsistence??h.creation?.values?.subsistence})`;
 return true;
}
// HMK v1.2 p.43: West Venarian Priest occupations.
// Ilvîr selects one out of three crafts; Siém uses Runecraft only for Kúzhai.
// Wealth is *not* fixed d6 for PC priests (Circle × 2, p.51); the die
// is deliberately unresolved until the Circle is GM-verified.
export const PRIEST_RELIGIONS=Object.freeze(['Ágrik','Haléa','Ilvîr','Laráni','Môrgath','Navéh','Peóni','Sárajìn','Sávè-K’nôr','Siém']);
const PRIEST_BASE={Ritual:3,'Native Language':1,Discourse:2,Script:4,Folklore:2};
const PRIEST_BONUS={
 'Ágrik':{Command:2,'Language (Surikal)':4,Heraldry:2,Initiative:1,Melee:1,Summoning:1},
 'Haléa':{Charm:2,Perfumery:2,Dancing:2,Intrigue:2,Musician:2,Embalming:2},
 'Laráni':{Command:2,Embalming:2,Riding:2,Melee:1,Heraldry:2,Initiative:1},
 'Môrgath':{Embalming:4,'Language (Ormauk)':4,Woodworking:2,'Script (Nùvesârl)':4,Hideworking:2,Summoning:1},
 'Navéh':{Guile:2,Lockcraft:2,Stealth:2,Melee:1,Legerdemain:2,Summoning:1},
 'Peóni':{Agriculture:3,Herblore:2,Animalcraft:3,Embalming:2,Physician:2},
 'Sárajìn':{Command:2,Melee:1,Runecraft:2,Initiative:1,Seamanship:2},
 'Sávè-K’nôr':{Mathematics:3,Embalming:2,Drawing:2,Folklore:1,Law:2,Language:4,Heraldry:2,'2nd Script':4},
};
const priestMake=(extra)=>{const grants={...PRIEST_BASE};for(const [skill,dp] of Object.entries(extra))grants[skill]=(grants[skill]??0)+dp;return {die:null,skills:grants}};
export const PRIEST_VARIANTS=Object.freeze([
 ...PRIEST_RELIGIONS.filter(n=>!['Ilvîr','Siém'].includes(n)).map(n=>`Priest (${n})`),
 ...['Ceramics','Drawing','Textilecraft'].map(n=>`Priest (Ilvîr: ${n})`),
 'Priest (Siém: Astrology)','Priest (Siém: Runecraft)'
]);
const PRIEST_OCCUPATIONS=Object.fromEntries([
 ...Object.entries(PRIEST_BONUS).map(([faith,bonus])=>[`Priest (${faith})`,priestMake(bonus)]),
 ...['Ceramics','Drawing','Textilecraft'].map(craft=>[`Priest (Ilvîr: ${craft})`,priestMake({Animalcraft:3,'Language (Ivashi)':4,Physician:2,'2nd Script':4,[craft]:3})]),
 ['Priest (Siém: Astrology)',priestMake({Astrology:3,Survival:2,Tracking:2,Herblore:2,Spirit:1})],
 ['Priest (Siém: Runecraft)',priestMake({Runecraft:3,Survival:2,Tracking:2,Herblore:2,Spirit:1})],
]);
export function priestReligionOf(name){const key=String(name??'');if(!key.startsWith('Priest ('))return null;const rest=key.slice(8);return rest.startsWith('Ilvîr:')?'Ilvîr':rest.startsWith('Siém:')?'Siém':rest.replace(/\)$/, '');}
// HMK v1.2 p.44: six Shèk-Pvâr primary convocations.
// The Fývria choice is exactly two DIFFERENT Skills from the printed five.
export const PVAR_CONVOCATIONS=Object.freeze(['Fývria','Jmôrvi','Pèleáhn','Lyáhvi','Sàvôrya','Odívshè']);
export const FYVRIA_SELECTABLE=Object.freeze(['Animalcraft','Herblore','Physician','Timbercraft','Tracking']);
export const PVAR_VARIANTS=Object.freeze([
 ...FYVRIA_SELECTABLE.flatMap((first,i)=>FYVRIA_SELECTABLE.slice(i+1).map(second=>`Shèk-Pvâr (Fývria: ${first} + ${second})`)),
 ...PVAR_CONVOCATIONS.slice(1).map(n=>`Shèk-Pvâr (${n})`)
]);
const PVAR_BASE={Pvârism:3,Tarotry:2,Folklore:2,'Native Language':2,Discourse:2,Script:5};
const PVAR_SPEC={
 'Jmôrvi':{Metalcraft:3,Mineralogy:2,Lockcraft:2,Weaponcraft:2},
 'Pèleáhn':{Cookery:2,Melee:1,Mineralogy:2,Initiative:1,Metalcraft:1},
 'Lyáhvi':{Glassworking:3,Legerdemain:3,Jewelcraft:3},
 'Sàvôrya':{Mathematics:4,Drawing:1,Folklore:1,Language:4,Spirit:1,'2nd Script':4},
 'Odívshè':{Brewing:3,Seamanship:2,Fishing:2,Swimming:2}
};
const PVAR_OCCUPATIONS={
 ...Object.fromEntries(FYVRIA_SELECTABLE.flatMap((first,i)=>FYVRIA_SELECTABLE.slice(i+1).map(second=>[
 `Shèk-Pvâr (Fývria: ${first} + ${second})`,{die:4,skills:{...PVAR_BASE,Agriculture:3,Survival:2,[first]:2,[second]:2}}
 ]))),
 ...Object.fromEntries(Object.entries(PVAR_SPEC).map(([convocation,bonus])=>{
  const combined={...PVAR_BASE};for(const [skill,dp] of Object.entries(bonus))combined[skill]=(combined[skill]??0)+dp;
  return [`Shèk-Pvâr (${convocation})`,{die:4,skills:combined}];
 }))
};
const OPTIONAL_OCCUPATIONS={
 ...Object.fromEntries(CHANDLER_CRAFT_CHOICES.map(skill=>[`Chandler (${skill})`,{die:3,skills:{Mercantilism:4,Cookery:1,Mineralogy:2,[skill]:2,Herblore:2,Script:3}}])),
 'Lìa-Kaváir (Acrobatics)':{die:3,skills:{Legerdemain:4,Awareness:2,Lockcraft:3,Intrigue:2,Acrobatics:2,Stealth:2,Guile:2}},
 'Lìa-Kaváir (Guile)':{die:3,skills:{Legerdemain:4,Awareness:2,Lockcraft:3,Intrigue:2,Guile:4,Stealth:2}},
 ...Object.fromEntries(THESPIAN_EXTRA_CHOICES.flatMap(first=>THESPIAN_EXTRA_CHOICES.filter(other=>other!==first).map(second=>[`Thespian (${first} 4, ${second} 3)`,{die:2,skills:{Theatrics:3,Dancing:2,Singing:2,'Native Language':2,[first]:4,[second]:3}}]))),
};
// HMK v1.2 p.42: Chieftain inherits one complete subsistence trade, then
// Law 3, Command 2 and Intrigue 1. Foraging tribes use Hunter.
export const CHIEFTAIN_SUBSISTENCE=Object.freeze({Farming:'Farmer',Fishing:'Fisher',Herding:'Herder',Foraging:'Hunter'});
export const CHIEFTAIN_VARIANTS=Object.freeze(Object.values(CHIEFTAIN_SUBSISTENCE).map(n=>`Chieftain (${n})`));
export function chieftainVariantForSubsistence(subsistence){const trade=CHIEFTAIN_SUBSISTENCE[subsistence];return trade?`Chieftain (${trade})`:null;}
const CHIEFTAIN_TRADES={
 Farmer:{Agriculture:4,Woodworking:2,Animalcraft:3,Survival:1,Herblore:2},
 Fisher:{Fishing:4,Piloting:2,Seamanship:4,Shipwright:2},
 Herder:{Animalcraft:4,Tracking:3,Survival:3,Hideworking:2},
 Hunter:{Tracking:4,Hideworking:2,Survival:3,Herblore:2,Archery:3,Fletching:2}
};
// HMK v1.2 p.44: Tenant Officer is an Unfree farmer with the
// complete Farmer skills PLUS the printed d20 office bonus; die d3.
const TENANT_OFFICER_BONUSES=Object.freeze({
 Beadle:{Law:3,Animalcraft:3,Melee:1,Survival:1},
 Herder:{Animalcraft:4,Survival:2,Woodworking:1,Masonry:1},
 Reeve:{Law:3,Mercantilism:2,Animalcraft:3,Survival:1},
 Woodward:{Timbercraft:3,Survival:2,Animalcraft:3,Woodworking:1}
});
const TENANT_FARMER_BASE=Object.freeze({Agriculture:4,Woodworking:2,Animalcraft:3,Survival:1,Herblore:2});
const TENANT_OFFICER_PROFILES=Object.freeze(Object.fromEntries(Object.entries(TENANT_OFFICER_BONUSES).map(([office,bonus])=>{
 const skills={...TENANT_FARMER_BASE};
 for(const [skill,dp] of Object.entries(bonus))skills[skill]=(skills[skill]??0)+dp;
 return [`Tenant Officer (${office})`,{die:3,skills}];
})));
const CHIEFTAIN_PROFILES=Object.fromEntries(Object.entries(CHIEFTAIN_TRADES).map(([trade,skills])=>[
 `Chieftain (${trade})`,{die:4,skills:{...skills,Law:(skills.Law??0)+3,Command:(skills.Command??0)+2,Intrigue:(skills.Intrigue??0)+1}}
]));
/** Verified occupational DP excerpts from printed pp.42–44; unsupported professions = GM review. */
const GLADIATOR_SKILLS=Object.freeze({Melee:2,Weaponcraft:2,Archery:2,Initiative:1,Throwing:2,Physician:1,Riding:2});
export const OCCUPATIONS=Object.freeze({
 ...CHIEFTAIN_PROFILES,
 ...TENANT_OFFICER_PROFILES,
 ...SLAVE_PROFILES,
 ...PVAR_OCCUPATIONS,
 ...PRIEST_OCCUPATIONS,
 ...SHAMAN_OCCUPATIONS,
 ...INVOKER_OCCUPATIONS,
 Forester:{die:2,skills:{...CHIEFTAIN_TRADES.Hunter,Law:2,Melee:1}},
 ...OPTIONAL_OCCUPATIONS,
 Bureaucrat:{die:4,skills:{Law:4,Intrigue:2,Heraldry:3,Language:4,Discourse:2,Scripts:5}},
 Gladiator:{die:4,skills:{...GLADIATOR_SKILLS}},
 'Slave (Gladiator)':{die:0,skills:{...GLADIATOR_SKILLS}},
 "Servant, Domestic":{die:2,skills:{Textilecraft:4,Agriculture:2,Cookery:3,Herblore:2}},
 // v93.206: HMK pp.42–44, p.46. These are COMPLETE printed fixed DP
 // branches. Archer's culturally optional Slings replacement is a distinct
 // GM-confirmed profile; no invented die determines the culture.
 'Cartographer/Artist':{die:4,skills:{Drawing:3,Mineralogy:2,Folklore:2,Script:4,Mathematics:2,'2nd Script':3}},
 'Man-at-arms (Archer)':{die:3,skills:{Archery:3,Fletching:2,Throwing:2,Melee:1,Survival:2,Initiative:1,Heraldry:2,Physician:1}},
 'Man-at-arms (Archer, Slings)':{die:3,skills:{Slings:4,Hideworking:2,Throwing:2,Melee:1,Survival:2,Initiative:1,Heraldry:2,Physician:1}},
 // HMK p.43 prints Missile 3 as a projectile CATEGORY, not a separate
 // p.46 Skill. The GM expressly selects one real projectile Skill. Printed
 // Throwing 2 always remains; choosing Throwing adds the Missile 3 grant
 // to it (total Throwing 5), not a second fictitious Throwing Skill.
 'Man-at-arms (Cavalry, Melee)':{die:4,skills:{Riding:3,Throwing:2,Animalcraft:2,Initiative:1,Survival:2,Physician:1,Melee:2,Weaponcraft:2}},
 ...Object.fromEntries(['Archery','Slings','Throwing'].map(missile=>[
  `Man-at-arms (Cavalry, Missile: ${missile})`,
  {die:4,skills:{Riding:3,Throwing:2+(missile==='Throwing'?3:0),Animalcraft:2,Initiative:1,Survival:2,Physician:1,Melee:1,Fletching:2,...(missile==='Throwing'?{}:{[missile]:3})}}
 ])),
 'Yeoman (Archer)':{die:3,skills:{Agriculture:4,Survival:2,Animalcraft:3,Initiative:1,Archery:3,Melee:1,Fletching:2}},
 'Yeoman (Foot)':{die:3,skills:{Agriculture:4,Survival:2,Animalcraft:3,Initiative:1,Melee:2,Weaponcraft:2}},
 'Yeoman (Horse)':{die:4,skills:{Agriculture:4,Survival:2,Animalcraft:3,Initiative:1,Riding:3,Weaponcraft:2,Melee:2}},

 // v93.205: HMK v1.2 pp.42-44. Second and third singular Script
 // are distinct printed grants, each assigned to one distinct script.
 'Lexigrapher':{die:3,skills:{Drawing:3,Script:4,Hideworking:3,'2nd Script':4,Mineralogy:2}},
 'Scholar':{die:4,skills:{Folklore:3,'Native Language':2,Mathematics:3,Language:6,Discourse:2,Script:5,Drawing:1,'2nd Script':4}},
 'Scribe':{die:3,skills:{Drawing:3,Language:4,Mathematics:2,Script:5,Folklore:1,'2nd Script':5,'Native Language':1,'3rd Script':5}},
 'Pilot':{die:6,skills:{Piloting:4,Mathematics:2,Seamanship:3,Drawing:1,Shipwright:2,'Language (Kántâl)':3,Mercantilism:2,Script:2}},
 'Legionnaire':{die:3,skills:{Melee:2,Weaponcraft:2,Throwing:2,Language:3,Survival:2,Initiative:1,Heraldry:2,Physician:1}},

 // HMK v1.2 pp.42-43: additional occupational blocks. Named Language/Script
 // instances are resolved in the creation calculation (p.47-48); plural
 // Languages DP can later be split by the GM (not silently randomised).
 'Runemaster':{die:4,skills:{Runecraft:4,Metalcraft:2,Folklore:3,Woodworking:2,Mineralogy:3,Script:4,Masonry:2}},
 'Seaman':{die:2,skills:{Seamanship:4,Shipwright:2,Fishing:3,Climbing:2,Piloting:2,'Language (Kántâl)':3}},
 'Swordmaster':{die:6,skills:{Melee:2,Heraldry:2,Throwing:2,Initiative:1,Discourse:2,Physician:1,Weaponcraft:3,Language:3}},
 'Astrologer':{die:4,skills:{Astrology:4,Folklore:2,Mathematics:3,Discourse:2,Tarotry:3,'Native Language':1,Drawing:2,Script:4}},
 'Harper/Skald':{die:2,skills:{Musician:4,Woodworking:3,Folklore:3,'Native Language':2,Singing:2,Script:3}},
 'Harper':{die:2,skills:{Musician:4,Woodworking:3,Folklore:3,'Native Language':2,Singing:2,Script:3}},
 'Herald':{die:4,skills:{Heraldry:4,Discourse:2,Drawing:3,'Native Language':1,Intrigue:2,Language:3,Guile:2,Script:4}},
 'Innkeeper':{die:3,skills:{Brewing:4,Intrigue:2,Cookery:2,Language:2,Guile:2,Script:2}},
 'Litigant':{die:4,skills:{Law:4,Intrigue:2,Discourse:2,Language:4,Guile:2,Script:4}},
 'Mercantyler':{die:6,skills:{Mercantilism:4,Guile:2,Mathematics:3,Language:2,Intrigue:2,Script:3}},
 // HMK v1.2 p.42: Labourer is three different fixed DP lists, same d2.
 'Labourer, Farm':{die:2,skills:{Agriculture:4,Woodworking:2,Animalcraft:2,Metalcraft:2}},
 'Labourer, Semi-skilled':{die:2,skills:{Woodworking:3,Animalcraft:2,Metalcraft:2,Engineering:2,Masonry:2}},
 'Labourer, Unskilled':{die:2,skills:{Woodworking:2,Animalcraft:2,Metalcraft:2,Engineering:2,Masonry:2}},
 // HMK v1.2 p.44: Armourer and Bowyer are exclusive Weaponcrafter specialties.
 'Weaponcrafter (Armourer)':{die:6,skills:{Weaponcraft:4,Mineralogy:3,Metalcraft:4,Hideworking:3}},
 'Weaponcrafter (Bowyer)':{die:6,skills:{Fletching:4,Timbercraft:3,Woodworking:4,Metalcraft:3}},
 // HMK v1.2 p.42: first small verified block of non-specialised professions.
 // These exact named Skills also exist in the authoritative p.46 Skill List.
 'Animal Trainer':{die:3,skills:{Animalcraft:4,Metalcraft:2,Riding:3,Hideworking:2}},
 'Beggar':{die:1,skills:{Guile:2,Stealth:2,Awareness:2,Legerdemain:2,Intrigue:2}},
 'Clothier':{die:3,skills:{Textilecraft:4,Jewelcraft:3,Hideworking:3,Script:2}},
 'Glassworker':{die:3,skills:{Glassworking:4,Mineralogy:3,Ceramics:3,Script:2}},
 // HMK v1.2 p.42. Farmer WD: d2 (freehold) / d1 (unfree serf); skills unchanged.
 'Farmer':{die:2,skills:{Agriculture:4,Woodworking:2,Animalcraft:3,Survival:1,Herblore:2}},
 'Gaoler':{die:2,skills:{Law:3,Heraldry:2,Melee:2,Lockcraft:2,Command:2,Intrigue:1}},
 'Embalmer':{die:2,skills:{Embalming:2,Woodworking:2,Mineralogy:2,Ceramics:2,Perfumery:2,Script:2}},
 'Jeweller':{die:3,skills:{Jewelcraft:4,Metalcraft:3,Mineralogy:4,Script:3}},
 'Cook':{die:2,skills:{Cookery:2,Agriculture:2,Herblore:3,Animalcraft:2,Mineralogy:2}},
 'Hunter':{die:2,skills:{Tracking:4,Hideworking:2,Survival:3,Herblore:2,Archery:3,Fletching:2}},
 'Fisher':{die:2,skills:{Fishing:4,Piloting:2,Seamanship:4,Shipwright:2}},
 'Herder':{die:2,skills:{Animalcraft:4,Tracking:3,Survival:3,Hideworking:2}},
 'Man-at-arms':{die:3,skills:{Melee:2,Weaponcraft:2,Throwing:2,Archery:1,Survival:2,Initiative:1,Heraldry:2,Physician:1}},
 'Mercenary':{die:3,skills:{Melee:2,Weaponcraft:2,Throwing:2,Intrigue:1,Survival:2,Initiative:1,Heraldry:2,Physician:1}},
 'Alchemist':{die:4,skills:{Alchemy:4,Discourse:2,Mathematics:3,Physician:1,Herblore:2,'Native Language':1,Mineralogy:2,Script:4,Folklore:2}},
 'Apothecary':{die:3,skills:{Herblore:4,Survival:2,Mineralogy:2,Script:3,Mathematics:2,Physician:1}},
 'Charcoaler':{die:2,skills:{Timbercraft:4,Metalcraft:2,Survival:2,Woodworking:2}},
 'Timberwright':{die:4,skills:{Timbercraft:4,Climbing:2,Survival:3,Metalcraft:2,Woodworking:3}},
 'Miller':{die:4,skills:{Milling:4,Cookery:2,Engineering:3,Mathematics:2,Agriculture:3,Script:2}},
 'Physician':{die:4,skills:{Physician:3,Discourse:2,Herblore:3,Script:3,Mineralogy:2,Folklore:1,Mathematics:2}},
 'Potter':{die:2,skills:{Ceramics:4,Mineralogy:3,Glassworking:3,Drawing:2}},
 // HMK v1.2 printed p.43: four further complete professions; no optional skills or dice.
 'Locksmith':{die:3,skills:{Lockcraft:4,Masonry:2,Metalcraft:4,Script:2,Woodworking:3}},
 'Longshoreman':{die:2,skills:{Seamanship:2,Metalcraft:2,Climbing:2,Engineering:2,Woodworking:2}},
 'Metalsmith':{die:4,skills:{Metalcraft:4,Weaponcraft:2,Mineralogy:3,Woodworking:2}},
 'Miner':{die:4,skills:{Mineralogy:4,Jewelcraft:2,Engineering:3,Metalcraft:2,Woodworking:3,Survival:1}},
 // HMK v1.2 printed p.43: four further occupations with unconditional skill DP.
 'Mason':{die:6,skills:{Masonry:4,Mathematics:3,Woodworking:3,Mineralogy:2,Engineering:3,Script:2}},
 'Ostler':{die:3,skills:{Animalcraft:4,Woodworking:2,Riding:2,Metalcraft:2,Hideworking:2}},
 'Perfumer':{die:3,skills:{Perfumery:4,Mineralogy:3,Herblore:3,Script:2}},
 'Man-at-arms (Sapper)':{die:3,skills:{Engineering:3,Weaponcraft:2,Woodworking:3,Mathematics:2,Masonry:3,Melee:1,Mineralogy:2,Initiative:1}},
 // HMK v1.2 pp.42 and 44: fixed-DP occupation blocks, without unimplemented specialisation choices.
 "Courtesan":{die:4,skills:{Charm:2,Dancing:2,Intrigue:2,Musician:2,Singing:2,Script:3}}, // p.42
 "Hideworker":{die:3,skills:{Hideworking:4,Mineralogy:2,Textilecraft:3,Animalcraft:2}}, // p.42
 "Huscarl":{die:6,skills:{Melee:2,Survival:2,Riding:2,Weaponcraft:2,Throwing:2,Initiative:1,Archery:2,Physician:1,Heraldry:2}}, // p.42
 "Jester":{die:2,skills:{Theatrics:3,Guile:2,Acrobatics:3,Intrigue:2,Legerdemain:3,Folklore:1}}, // p.42
 "Prostitute":{die:2,skills:{Charm:2,Intrigue:2,Guile:2,Textilecraft:2,Awareness:2}}, // p.44
 "Ratter":{die:3,skills:{Animalcraft:4,Herblore:2,Survival:2,Melee:1,Tracking:2}}, // p.44
 "Salter":{die:2,skills:{Mineralogy:4,Survival:2,Fishing:3,Cookery:1,Herblore:3}}, // p.44
 "Shipwright":{die:6,skills:{Shipwright:4,Mathematics:3,Woodworking:3,Seamanship:2,Timbercraft:3,Script:3,Metalcraft:3}}, // p.44
 "Teamster":{die:4,skills:{Animalcraft:4,Metalcraft:2,Riding:3,Survival:1,Woodworking:2}}, // p.44
 "Tentmaker":{die:3,skills:{Textilecraft:4,Woodworking:2,Hideworking:3,Metalcraft:2}}, // p.44
 "Thatcher":{die:2,skills:{Woodworking:4,Masonry:2,Timbercraft:3,Engineering:2}}, // p.44
 "Toymaker":{die:2,skills:{Woodworking:4,Ceramics:2,Textilecraft:3,Metalcraft:2,Drawing:2,Lockcraft:2}}, // p.44
 "Trapper":{die:2,skills:{Tracking:4,Woodworking:2,Survival:3,Metalcraft:2,Hideworking:3,Lockcraft:2}}, // p.44
 "Woodcrafter":{die:3,skills:{Woodworking:4,Metalcraft:2,Timbercraft:2,Drawing:2,Hideworking:2}}, // p.44
 "Woodcutter":{die:2,skills:{Timbercraft:4,Woodworking:2,Survival:2,Climbing:2}}, // p.44
});
/** Parent Weaponcrafter has a generic printed entry (p.27–32). Its family
 * skills are not defined until the GM selects the printed specialty (p.44).
 * This uses the SAME occupational data, not a parallel family table. */
/** HMK v1.2 p.43, NOBILITY sidebar (Family Skills, NOT a second
 * occupational DP table). All noble parents grant these six possibilities,
 * each capped at ONE Family DP. Gentry adds only HALF OF THE FIRST listed
 * occupational skill (the printed example is Gentry Pilot => Piloting 2).
 * Non-gentry nobles add only the skills marked * in the printed table.
 * The p.43 table distinguishes parent Family choices from the child's own
 * occupational skill list: those are NOT interchangeable. */
export const NOBLE_COMMON_FAMILY_SKILLS=Object.freeze({Melee:2,Dancing:2,Riding:2,Heraldry:2,Intrigue:2,Script:2});
const NOBLE_STARRED_FAMILY=Object.freeze({
 'Gentry: Courtier':{Musician:2,Survival:2,Language:4},
 'Knight Bachelor':{Throwing:2,Survival:2,Weaponcraft:2},
 'Manor Lord, Appointed':{Throwing:2,Survival:2,Weaponcraft:2,Law:3,Agriculture:2,Discourse:2},
 'Manor Lord, Enfeoffed':{Throwing:2,Survival:2,Weaponcraft:2,Law:3,Agriculture:2,Discourse:2},
 'Tenant-in-chief':{Throwing:2,Survival:2,Weaponcraft:2,Law:3,Agriculture:2,Discourse:2,Command:2},
 'Patrician (Minor)':{},'Patrician (Major)':{},
 'Clanhead (Minor)':{},'Clanhead (Major)':{},'Clanhead (Royal)':{}
});
function nobleFamilyFromGentryTrade(profile){
 if(!profile?.skills)return null;
 const [first,dp]=Object.entries(profile.skills)[0]??[];
 if(!first||!Number.isInteger(dp))return null;
 const skills={...NOBLE_COMMON_FAMILY_SKILLS};
 // The one Gentry speciality can raise the family maximum beyond the common
 // one-DP limit when it is the same skill (e.g. Gentry Herald: Heraldry).
 skills[first]=Math.max(skills[first]??0,dp);
 return {die:profile.die,skills,nobleFamily:true,gentryFirstSkill:first};
}
function nobleFamilyFromStarred(name){
 const star=NOBLE_STARRED_FAMILY[name];
 if(!star)return null;
 return {die:null,skills:{...NOBLE_COMMON_FAMILY_SKILLS,...star},nobleFamily:true};
}
export function familyOccupationProfile(familyOccupation, specialty=null, martialType=null, familyVariant=null, subsistence=null){
 if(familyOccupation==='Chieftain')return OCCUPATIONS[chieftainVariantForSubsistence(subsistence)]??null;
 // Source labels in the society/caste tables are not always the profession's
 // actual printed name. Resolve only source-supported aliases, never invent DP.
 if(familyOccupation==='Farmer (Thrall)')return OCCUPATIONS.Farmer;
 const nobility=nobleFamilyFromStarred(familyOccupation);if(nobility)return nobility;
 if(familyOccupation==='Artist')return OCCUPATIONS['Cartographer/Artist'];
 if(familyOccupation==='Servant')return OCCUPATIONS['Servant, Domestic'];
 if(familyOccupation==='Priest (Siém)')return OCCUPATIONS['Priest (Siém: Astrology)'];
 if(familyOccupation==='Slave (Gladiator)')return OCCUPATIONS['Slave (Gladiator)'];
 // Raw 'Slave' still needs its mandatory printed d20 subtype (pp.27–30).
 if(familyOccupation==='Slave')return null;
 // Noble gentry retain the printed OCCUPATIONAL skills of their specific
 // profession (pp.27,42–44); 'Gentry:' modifies Class/Wealth, not DP.
 // Courtier has no corresponding printed occupational profile: DO NOT invent one.
 const gentrySkillTrades=Object.freeze({
  'Gentry: Cartographer':'Cartographer/Artist', 'Gentry: Forester':'Forester',
  'Gentry: Harper':'Harper', 'Gentry: Herald':'Herald',
  'Gentry: Litigant':'Litigant', 'Gentry: Mercantyler':'Mercantyler',
  'Gentry: Mercenary':'Mercenary', 'Gentry: Physician':'Physician',
  'Gentry: Pilot':'Pilot', 'Gentry: Scholar':'Scholar'
 });
 if(Object.hasOwn(gentrySkillTrades,familyOccupation))return nobleFamilyFromGentryTrade(OCCUPATIONS[gentrySkillTrades[familyOccupation]]);
 // Gentry Arcanist and Sináin Valpalen Arcanist are different printed
 // societies, but share the same Alchemist/Astrologer/Shèk-Pvâr occupations.
 // Their subclass is NOT a fresh GM choice: it is the result of the earlier
 // physical d20. A Shèk-Pvâr convocation is the earlier physical d6.
 const arcanistFixed=/^(?:Gentry: )?Arcanist \((Alchemist|Astrologer)\)$/.exec(familyOccupation??'');
 if(arcanistFixed)return familyOccupation.startsWith('Gentry:')?nobleFamilyFromGentryTrade(OCCUPATIONS[arcanistFixed[1]]):OCCUPATIONS[arcanistFixed[1]];
 const arcanistPvar=/^(?:Gentry: )?Arcanist \(Shèk-Pvâr\) \((Fývria|Jmôrvi|Pèleáhn|Lyáhvi|Sàvôrya|Odívshè)\)$/.exec(familyOccupation??'');
 if(arcanistPvar){
  const convocation=arcanistPvar[1];
  const profession=convocation==='Fývria'?(occupationVariantNames(familyOccupation).includes(familyVariant)?OCCUPATIONS[familyVariant]:null):OCCUPATIONS[`Shèk-Pvâr (${convocation})`];
  return familyOccupation.startsWith('Gentry:')?nobleFamilyFromGentryTrade(profession):(profession??null);
 }

 if(occupationVariantNames(familyOccupation).length){
  const profession=occupationVariantNames(familyOccupation).includes(familyVariant)?OCCUPATIONS[familyVariant]:null;
  return familyOccupation==='Gentry: Priest'?nobleFamilyFromGentryTrade(profession):profession;
 }
 if(familyOccupation==='Man-at-arms (Archer)'){
  if(!['Archery','Slings'].includes(martialType))return null;
  return OCCUPATIONS[martialType==='Slings'?'Man-at-arms (Archer, Slings)':'Man-at-arms (Archer)'];
 }
 if(familyOccupation==='Man-at-arms (Cavalry)'){
  if(martialType==='Melee')return OCCUPATIONS['Man-at-arms (Cavalry, Melee)'];
  // The explicit GM choice is the named p.46 skill that receives Missile 3.
  if(['Archery','Slings','Throwing'].includes(martialType))return OCCUPATIONS[`Man-at-arms (Cavalry, Missile: ${martialType})`];
  return null;
 }
 if(familyOccupation==='Weaponcrafter'){
  if(!['Armourer','Bowyer'].includes(specialty))return null;
  return OCCUPATIONS[`Weaponcrafter (${specialty})`];
 }
 return OCCUPATIONS[familyOccupation]??null;
}
/** p.47 Family allocation: bounded per-skill caps also work for the
 * printed plural 'Scripts' and 'Languages' when realised as named skills.
 * There is ONE shared printed DP pool, not a fresh allowance per script. */
export function familySkillCap(profile,skillName){
 if(!profile?.skills)return 0;
 const m=/^(Language|Script|Ritual) \((.+)\)$/.exec(String(skillName));
 const original=m?.[1]??skillName;
 const printed=profile.skills[skillName]??profile.skills[original]??
  (original==='Script'?profile.skills.Scripts:undefined)??0;
 return Math.floor(printed/2);
}
export function validateFamilySkillAllocation(profile,points){
 if(!profile?.skills)return false;
 if(Object.values(points??{}).reduce((n,v)=>n+v,0)>5)return false;
 if(Object.entries(points??{}).some(([skill,dp])=>!Number.isInteger(dp)||dp<0||dp>familySkillCap(profile,skill)))return false;
 // Singular Language and plural Scripts printed grant one occupational
 // amount; distributing it does not multiply its Family DP allowance.
 for(const [printed,instance] of [['Language','Language'],['Scripts','Script']]){
  if(!profile.skills[printed])continue;
  const used=Object.entries(points??{}).reduce((sum,[name,dp])=>sum+(name===printed||name.startsWith(instance+' (')?dp:0),0);
  if(used>Math.floor(profile.skills[printed]/2))return false;
 }
 return true;
}
export const OCCUPATION_PAGES=Object.freeze({...Object.fromEntries(Object.keys(TENANT_OFFICER_PROFILES).map(n=>[n,44])),...Object.fromEntries(CHIEFTAIN_VARIANTS.map(n=>[n,42])),Forester:42,...Object.fromEntries(PVAR_VARIANTS.map(n=>[n,44])),...Object.fromEntries(PRIEST_VARIANTS.map(n=>[n,43])),...Object.fromEntries(SHAMAN_VARIANTS.map(n=>[n,44])),...Object.fromEntries(TRIBAL_INVOKER_VARIANTS.map(n=>[n,42])),...Object.fromEntries(occupationVariantNames("Chandler").map(x=>[x,42])),...Object.fromEntries(occupationVariantNames("Lìa-Kaváir").map(x=>[x,43])),...Object.fromEntries(occupationVariantNames("Thespian").map(x=>[x,44])),Gladiator:42,"Servant, Domestic":44,'Cartographer/Artist':42,'Man-at-arms (Archer)':43,'Man-at-arms (Archer, Slings)':43,'Man-at-arms (Cavalry, Melee)':43,...Object.fromEntries(['Archery','Slings','Throwing'].map(n=>[`Man-at-arms (Cavalry, Missile: ${n})`,43])),'Yeoman (Archer)':44,'Yeoman (Foot)':44,'Yeoman (Horse)':44,'Lexigrapher':43,'Scholar':44,'Scribe':44,'Pilot':43,'Legionnaire':43,'Runemaster':44,'Seaman':44,'Swordmaster':44,'Astrologer':42,'Harper/Skald':42,'Harper':42,'Herald':42,'Innkeeper':42,'Litigant':43,'Mercantyler':43,'Labourer, Farm':42,'Labourer, Semi-skilled':42,'Labourer, Unskilled':42,'Weaponcrafter (Armourer)':44,'Weaponcrafter (Bowyer)':44,'Man-at-arms':43,'Mercenary':43,'Miller':43,'Physician':43,'Potter':43,'Timberwright':44,'Locksmith':43,'Longshoreman':43,'Metalsmith':43,'Miner':43,'Mason':43,'Ostler':43,'Perfumer':43,'Man-at-arms (Sapper)':43,"Courtesan":42,"Hideworker":42,"Huscarl":42,"Jester":42,"Prostitute":44,"Ratter":44,"Salter":44,"Shipwright":44,"Teamster":44,"Tentmaker":44,"Thatcher":44,"Toymaker":44,"Trapper":44,"Woodcrafter":44,"Woodcutter":44});
export const WEALTH_CLASSES=Object.freeze([[1,'Poor'],[4,'Poor'],[9,'Meagre'],[19,'Comfortable'],[49,'Affluent'],[149,'Ostentatious']]);
export function standingFromWealth(amount){if(!Number.isInteger(amount)||amount<0)throw Error('Wealth musí být celé nezáporné');
 const bracket=WEALTH_CLASSES.find(([max])=>amount<=max);return {wealth:amount,lifestyle:bracket?.[1]??'Beyond standing table (GM review)',possessionsPence:amount*100,coinsPence:amount*10,sourcePage:52};}
/** p.42 Farmer lists d2 · d1. The first is the freehold farmer, the second the unfree serf.
 * It changes the Wealth die only; the printed Occupational DP are identical.
 * Do not use this for unverified composite occupation types. */
export function occupationWealthDie(occupation,socialClass=null){
 const name=String(occupation??'');
 if(name==='Farmer (Thrall)')return 1;
 if(name==='Farmer'&&socialClass==='Unfree')return 1;
 if(name==='Slave (Gladiator)'||name.startsWith('Slave ('))return 0;
 if(name==='Artist')return OCCUPATIONS['Cartographer/Artist'].die;
 if(name==='Servant')return OCCUPATIONS['Servant, Domestic'].die;
 if(name==='Hunter or Trapper')return 2;
 if(name==='Priest (Siém)')return null; // Priest is Circle based, no fictitious die
 if(name==='Chieftain')return 4;
 if(name==='Gladiator'||name==='Servant, Domestic')return socialClass==='Unfree'?0:(name==='Gladiator'?4:2);
 if(occupationVariantNames(name).length)return OCCUPATIONS[name]?.die??null;
 if(['Chandler','Lìa-Kaváir','Thespian'].includes(name))return ({Chandler:3,'Lìa-Kaváir':3,Thespian:2})[name];
 if(name==='Man-at-arms (Archer, Slings)'||name==='Man-at-arms (Archer)')return 3;
 if(name==='Man-at-arms (Cavalry)'||name==='Man-at-arms (Cavalry, Melee)'||/^Man-at-arms \(Cavalry, Missile: (?:Archery|Slings|Throwing)\)$/.test(name))return 4;
 if(name.startsWith('Yeoman ('))return name==='Yeoman (Horse)'?4:3;
 if(name==='Weaponcrafter')return 6; // parent generic entry; both specialties d6 (p.44)
 return OCCUPATIONS[name]?.die??null;
}
/** HMK p.51 nobility and Priest sizes; return null for unsupported professions. */
export function printedParentWealthDie(occupation,title=null,socialClass=null){
 const name=String(occupation??'');
 if(name.startsWith('Gentry:'))return 6;
 if(name==='Priest'||name.startsWith('Priest ('))return 6; // parent assumes Circle III
 if(name==='Knight Bachelor')return 8;
 if(name==='Manor Lord, Enfeoffed')return 24;
 if(name==='Tenant-in-chief')return 30;
 if(name==='Manor Lord, Appointed')return ({Bailiff:8,'Bailiff (Hundred)':10,Constable:12,Sheriff:20})[title]??null;
 return occupationWealthDie(name,socialClass);
}
export function wealthDiceCounts(estrangement,ageGroup,folk='Human'){
 const family={Outcast:1,Unpopular:2,Accepted:3,Popular:4,Favourite:5}[estrangement];
 const occupation=['Kúzhai','Sinái','Sidhé'].includes(folk)||ageGroup==='Old'?3:ageGroup==='Mature'?2:ageGroup==='Young'?1:null;
 if(!family||!occupation)throw Error('Chybí doložené Estrangement / Age pro Wealth');return {family,occupation};
}
export function evaluateWealthDice({estrangement,ageGroup,folk,occupation,occupationDie,parentDie,familyRolls,occupationRolls,advantage=true,socialClass=null}){
 const counts=wealthDiceCounts(estrangement,ageGroup,folk),pcExtra=advantage?1:0;
 const validate=(dice,n,sides,label)=>{if(!Number.isInteger(sides)||sides<0||sides>30)throw Error('Neplatná velikost '+label+' die');
  if(sides===0){if(!Array.isArray(dice)||dice.length!==0)throw Error('d0 nevyžaduje fyzické hody '+label);return [];}
  if(!Array.isArray(dice)||dice.length!==n)throw Error(`Nesprávný počet fyzických ${label} hodů`);
  return dice.map(x=>{if(!Number.isInteger(Number(x))||String(x).trim()===''||Number(x)<1||Number(x)>sides)throw Error('Neplatný fyzický hod '+label);return Number(x)});};
 const printedDie=occupationWealthDie(occupation,socialClass);const od=printedDie??Number(occupationDie);
 if(printedDie!==null&&Number(occupationDie)!==printedDie)throw Error('Occupation Wealth musí mít tištěnou velikost kostky (p.42–44)');
 const f=validate(familyRolls,counts.family+pcExtra,Number(parentDie),'Family Wealth');
 const o=validate(occupationRolls,counts.occupation+pcExtra,od,'Occupation Wealth');
 const keptF=advantage&&Number(parentDie)>0?f.slice().sort((a,b)=>a-b).slice(1):f.slice();
 const keptO=advantage&&od>0?o.slice().sort((a,b)=>a-b).slice(1):o.slice();
 const wealth=[...keptF,...keptO].reduce((n,v)=>n+v,0);
 return {...standingFromWealth(wealth),counts,advantage,parentDie:Number(parentDie),occupationDie:od,familyRolls:f,occupationRolls:o,keptFamily:keptF,keptOccupation:keptO,occupation,sourcePage:51};
}
export function ritualFollowerFromML(ml,{clergy=false,fightingOrder=false,orthodoxyPenalty=0}={}){
 if(!Number.isInteger(ml)||ml<0||!Number.isInteger(orthodoxyPenalty)||orthodoxyPenalty<0)throw Error('Neplatný Ritual ML / Morality penalty');
 if(clergy&&fightingOrder)throw Error('Nelze současně používat pravidlovou tabulku Clergy a Fighting Order');
 let circle=0;if(ml>0&&clergy){if(ml<20)throw Error('Clergy vyžaduje Ritual ML20');circle=ml>=60?3:ml>=30?2:1;}
 else if(ml>=20&&fightingOrder)circle=ml>=40?2:1;
 const blessing=ml>0?Math.floor(ml/10)+1:0;
 return {circle,blessingBonus:blessing,maxPiety:ml>0?Math.max(0,circle+1-orthodoxyPenalty):0,sourcePage:55};
}
/** Complete Tribal Free class occupation outcomes for four subsistence variants, p.29. */
export const TRIBAL_FREE_OCCUPATIONS=Object.freeze({
 Farming:[[70,'Farmer',0],[80,'Fisher',0],[90,'Herder',0],[100,'Hunter',0]],
 Fishing:[[90,'Fisher',0],[95,'Herder',0],[100,'Hunter',0]],
 Foraging:[[12,'Fisher',0],[25,'Herder',0],[100,'Hunter',0]],
 Herding:[[65,'Herder',0],[100,'Hunter',0]]
});
export function tribalFreeOccupation(subsistence,die){const table=TRIBAL_FREE_OCCUPATIONS[subsistence];
 const n=Number(die);if(!table||!Number.isInteger(n)||n<1||n>100||String(die).trim()==='')throw Error('Chybí povolená Tribal Free subsistence / fyzický d100');
 const row=table.find(([max])=>n<=max);return {name:row[1],urbanChance:row[2],society:'Tribal',socialClass:'Free',subsistence,roll:n,sourcePage:29};}
/** Folk Skill DP (p.45): physical d10, duplicate results use special rule. */
export function folkSkillsFromDice(folk,rolls){
 const count=folk==='Kúzhai'?2:['Sinái','Sidhé'].includes(folk)?4:0;
 if(!count)throw Error('Přesná Folk d10 tabulka není pro tuto rasu přepsaná');
 if(!Array.isArray(rolls)||rolls.length!==count||rolls.some(d=>!Number.isInteger(Number(d))||Number(d)<1||Number(d)>10||String(d).trim()===''))throw Error(`Fyzické Folk Skills: ${count}×d10`);
 const table=folk==='Kúzhai'?
 ['Engineering','Engineering','Jewelcraft','Lockcraft','Masonry','Masonry','Metalcraft','Metalcraft','Mineralogy','Weaponcraft']:
 ['Ceramics','Glassworking','Jewelcraft','Musician','Perfumery','Shipwright','Textilecraft','Timbercraft','Weaponcraft','Woodworking'];
 const skills=folk==='Kúzhai'?{Melee:1,Language:3}:{Awareness:1,Dancing:3,Language:5,Melee:1,Archery:2,Singing:2,Stealth:1,Survival:3};
 const hits={};for(const die of rolls){const name=table[Number(die)-1],old=hits[name]??0;hits[name]=old+1;
  if(folk==='Kúzhai')skills[name]=old?3:2;
  else skills[name]=(skills[name]??0)+(old?1:2);
 }
 return {folk,rolls:rolls.map(Number),skills,sourcePage:45};
}
/** HMK p.40 Grace (physical d20), not the same as ritual Blessing/Piety. */
export function graceFromDie(die){const d=Number(die);if(!Number.isInteger(d)||d<1||d>20||String(die).trim()==='')throw Error('Grace vyžaduje fyzický d20');
 return {roll:d,grace:d>=19?2:d>=17?1:0,marked:d>=15&&d<=16,sourcePage:40};}
/** HMK p.54: starting ARP budget. Individual spell costs, chantry and artefact prerequisites pending. */
export function arcaneStartingResearch(pvarismML,ageGroup,folk='Human'){
 const ml=Number(pvarismML);if(!Number.isInteger(ml)||ml<0||ml>200)throw Error('Pvârism ML musí být ověřené celé číslo');
 let multiplier=ageGroup==='Young'?0.25:ageGroup==='Mature'?0.5:ageGroup==='Old'?1:null;
 if(folk==='Kúzhai')multiplier=0.5;
 if(['Sinái','Sidhé'].includes(folk))multiplier=1;
 if(multiplier===null)throw Error('Neznámá věková skupina');
 return {pvarismML:ml,multiplier,startingARP:ml*multiplier,neutralSpells:ml>=40?['Detect','Reveal','Dispel']:[],sourcePage:54};
}
/** Appendix I p.415: ALL 22 geographic regions, d1000 weighted list. Elder Folk page 423 are additional, not in d1000. */
export const REGION_D1000=Object.freeze([
 [7,'Áltôr'],[272,'Ázeryàn'],[321,'Býria'],[404,'Chogôro & Mafán'],[531,'Dalkésh'],[540,'Emélrenè'],
 [566,'Hácherdad'],[576,'Hârbáal'],[587,'Hârn'],[627,'Hèpekéria'],[630,'Huriséa'],[641,'Ivínia'],
 [735,'Karéjia'],[747,'Ketârh & Béshakan'],[765,'Northern Anzelôria'],[779,'Palíthanè'],[791,'Quârphor'],
 [810,'Reksýna'],[839,'Shôrkýnè'],[849,'Thónia'],[956,'Tríerzòn'],[1000,'Ûmélria']]);
// All four player-character Elder Folk groups have independent p.423 tables.
// These do not belong to the 22 Human-population d1000 region weights.
export const ELDER_FOLK_REGIONS=Object.freeze(['Ælrhin (Elder Folk)','Kúzhai (Elder Folk)','Malákta (Elder Folk)','Nâdi (Elder Folk)']);
export function regionAllowedForFolk(region,folk){
 if(region==='Ælrhin (Elder Folk)')return ['Sinái','Sidhé'].includes(folk);
 if(region==='Kúzhai (Elder Folk)')return folk==='Kúzhai';
 if(region==='Malákta (Elder Folk)')return folk==='Malákta';
 if(region==='Nâdi (Elder Folk)')return folk==='Nâdi';
 return true;
}
export function regionFromD1000(die){const n=Number(die);if(!Number.isInteger(n)||n<1||n>1000||String(die).trim()==='')throw Error('Fyzický Region d1000 musí být 1–1000');
 return {roll:n,region:REGION_D1000.find(([max])=>n<=max)[1],sourcePage:415};}
