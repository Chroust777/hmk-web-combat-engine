/** HMK 1.2, chapter 7 (pp.354-400): short, editorial summaries of the
 * descriptions found in the user-supplied rulebook. These are display-only;
 * they never stand in for unimplemented creature abilities. */
const A={
 bovine:'Skot a příbuzná velká stádová zvířata. Využívají se k tahu pluhů a vozů, pro mléko i maso.',
 camel:'Odolné pouštní pracovní a jezdecké zvíře z Hepekérie, přizpůsobené dlouhým cestám.',
 cat:'Drobná domácí šelma lovící škůdce; v některých tradicích se pojí s esoterikou.',
 ratter:'Malý, houževnatý pes vycvičený k hubení škůdců a pronikání do úzkých prostor.',
 hunter:'Střední lovecký pes využívaný při sledování a pronásledování zvěře.',
 guard:'Mohutnější hlídací a útočný pes určený k obraně a ochraně.',
 donkey:'Menší tvrdohlavý příbuzný koně, používaný k přenášení nákladů.',
 pony:'Menší kůň; některá plemena slouží jako rychlá a jistá válečná jízdní zvířata.',
 mule:'Kříženec osla a koně, odolný pracovní soumar s vlastními pravidly zatížení a ovládání.',
 palfrey:'Středně velký kůň pro jízdu, práci na poli a tah povozů.',
 courser:'Rychlý jezdecký kůň vhodný pro lov a lehké válečné nasazení.',
 charger:'Válečný kůň šlechtěný a cvičený pro boj v sedle.',
 destrier:'Velký bojový kůň, schopný nést i těžce obrněného válečníka.',
 ram:'Beran nebo kozel; samci a samice mají podle HMK odlišné hodnoty síly a zásahu.',
 'bear-grey':'Menší šedý či černý medvěd, běžně klidný; při hladu nebo ohrožení bývá nebezpečný.',
 'bear-lythian':'Mohutný hnědý lýthijský medvěd, agresivnější než menší horské druhy.',
 'bear-kyani':'Obrovský světle zbarvený medvěd polárních a subarktických oblastí s mimořádným čichem.',
 boar:'Divoký kanec lovený i obřadně; zvláště v období páření může prudce zaútočit kly.',
 crow:'Velký krkavcovitý pták, ceněný pro mazanost a v některých tradicích spojovaný s magií.',
 eagle:'Velký dravý pták s ostrým zrakem, silnými pařáty a zahnutým zobákem.',
 elephant:'Mohutné pracovní a válečné zvíře; v některých krajích slouží jako plošina pro lučištníky.',
 fox:'Malá až střední všežravá psovitá šelma, spojovaná s obratností a lstivostí.',
 hawk:'Střední dravec cvičený k lovu drobné zvěře; vyžaduje soustavnou péči a výcvik.',
 lion:'Horská kočkovitá šelma Lýthie, která při zahnaní do kouta útočí skoky, kousáním a drápy.',
 'snake-venom':'Jedovatý had, který útočí převážně při vyrušení nebo ohrožení. Ne každý zásah vypustí jed.',
 'snake-constrictor':'Velký škrtič, který se zakusuje a kořist následně omotává a dusí.',
 stag:'Parohatá býložravá zvěř; samec někdy útočí při ochraně mláďat.',
 wolf:'Smečková šelma lovící kopytníky a menší savce; pověsti ji spojují s vlčími válečníky – wargy.'
};
const S={
 'ahvisian-air-360':'Vzdušný elementál ukrytý v oblacích či proudění. Ovládá vítr, světlo a povětrnostní jevy.',
 'beleras-fire-360':'Ohnivý elementál, jehož forma a síla souvisejí s množstvím vázaného ohně.',
 'orivax-metal-361':'Kovový elementál působící skrze materiál svého vázaného kovového těla.',
 'ivrihn-earth-361':'Zemní elementál schopný cestovat půdou, narušovat zem a v některých podobách útočit údery.',
 'sheor-water-362':'Vodní elementál, jehož projevy závisejí na vázaném množství vody.',
 'savir-s-aura-362':'Aurální elementál, který se váže k auře živého hostitele; nejde o běžného hmotného tvora.',
 'sinai-forester-366':'Ukázkový sinájský lesník. Elfí schopnosti a výcvik jsou uvedeny v jeho vlastním profilu.',
 'kuzha-mercantyler-367':'Ukázkový kúzhajský obchodník pocházející z trpasličího prostředí.',
 'kuzha-mercenary-367':'Ukázkový kúzhajský žoldnéř s bojovým výcvikem.',
 'malak-368':'Malák je neobvyklý příslušník staršího lidu, s vlastnostmi uvedenými v samostatné tabulce.',
 'gargu-arak-370':'Menší druh gârgúna, jedné z odlišných orčích populací Kèthîry.',
 'gargu-hyeka-370':'Druh gârgúna; jeho sociální a bojové odlišnosti popisuje oddíl Gârgún.',
 'gargu-khanu-370':'Mohutnější, velký druh gârgúna s vlastním profilem síly a výcviku.',
 'gargu-kyani-370':'Bílý typ gârgúna, jeden z druhů popsaných v bestiáři.',
 'gargu-viasal-370':'Další druh gârgúna uvedený mezi orčími populacemi Kèthîry.',
 'aklash-373':'Neobvyklý tvor Ívashù; jeho zvláštní útoky jsou uvedeny v samostatném pravidlovém popisu.',
 'domorser-373':'Noční lovec podobný velkému šupinatému vlku; loví ve smečkách a umí ochromit kořist.',
 'hru-374':'Velký a velmi odolný tvor Ívashù s vlastními tělesnými zvláštnostmi.',
 'nolah-374':'Tvor Ívashù s esoterickou schopností Geas a nestandardním chováním.',
 'umbath-375':'Neobvyklý létající tvor Ívashù s aurálními a psychickými schopnostmi.',
 'vlasta-375':'Malý, rychlý a neobvyklý tvor Ívashù.',
 'ivashu-generated-species-376':'Pravidlově generovaný druh Ívashù. Jeho konečné vlastnosti závisí na zvláštním generovacím postupu.',
 'amorvrin-free-undead-379':'Svobodný nemrtvý, jehož vědomí a schopnosti se řídí pravidly Môrvrin.',
 'dalmorvrin-lesser-undead-381':'Nižší nemrtvý s odlišným stupněm autonomie a odpovídajícími pravidly.',
 'gulmorvrin-unfree-undead-382':'Nesvobodný nemrtvý pod cizí vůlí; není totožný s běžným živým bojovníkem.',
 'amorvrus-printed-example-383':'Ukázková konkrétní nemrtvá bytost Amôrvrus s vypsanými charakteristikami.',
 'gulmora-printed-example-384':'Ukázkový nesvobodný nemrtvý Gùlmôra s vlastním profilem.',
 'young-dragon-388':'Mladý drak – vzácná a mocná reptilní bytost s létáním a zvláštními schopnostmi.',
 'mature-dragon-388':'Dospělý drak; větší, silnější a nebezpečnější než mladý jedinec.',
 'old-dragon-388':'Starý drak – mimořádně mohutná bytost vyžadující vlastní útoky, anatomii a magii.',
 'gryphon-griffin-marenu-390':'Gryf spojující znaky lva a orla. Loví ve vysokých horách, především pasoucí se zvěř.',
 'hirenu-hippogriff-390':'Hipogryf s hlavou a předními končetinami orla a tělem menšího koně; žije v horách a kaňonech.',
 'yelgri-harpy-392':'Harpyje s křídly a drápy, které se shlukují v horských lesích a používají i jednoduché zbraně.',
 'unicorn-ermael-391':'Inteligentní jednorožec z odlehlých hájů; jeho kouzelný roh má i léčivou moc.',
 'warg-dire-wolf-391':'Obrovský, lstivý vlk, který se někdy staví do čela obyčejných vlčích smeček.',
 'wyre-wyvern-392':'Agresivní teritoriální wyverna se dvěma nohama a křídly; některé mají jedovatý ocas.',
 'asir-air-sprite-394':'Drobný vzdušný duch, který se může projevit jako opar či vílí postava a vyhledává enchantmenty.',
 'da-anchen-eldest-ones-395':'Temná ether-korporální bytost vyskytující se u trhlin mezi fyzickým a duchovním světem.',
 'ghost-396':'Duch zemřelého, který zůstal poután k místu či události kvůli silnému traumatu.',
 'greater-gytevsha-397':'Mocný démonický duch sloužící Navehovi, působící především v duchovním konfliktu.',
 'lesser-gytevsha-397':'Nižší Gytévsha, duchovní služebník spojovaný s Navehem a jeho kněžstvem.',
 'place-energy-l-llyn-398':'Místo s výraznou astrální energií, nikoli běžný tvor; mění místní esoterické podmínky.',
 'v-hir-general-rules-399':'Agrikánský démon V’hîr; pravidla rozlišují osm řádů, inkarnaci a zvláštní bojové účinky.'
};
const F={
 'Rural Courtier':'Ukázkový dvorský příslušník venkovského prostředí.',
 'Rural Farmer':'Ukázkový venkovský zemědělec.',
 'Rural Fisher':'Ukázkový venkovský rybář.',
 'Rural Herder':'Ukázkový venkovský pastevec.',
 'Rural Hunter':'Ukázkový lovec z venkovského prostředí.',
 'Rural Knight':'Ukázkový rytíř ze šlechtické a vojenské vrstvy.',
 'Rural Man-at-arms':'Ukázkový profesionální ozbrojenec.',
 'Rural Yeoman':'Ukázkový svobodný venkovan schopný vojenské služby.',
 'Urban Beggar':'Ukázkový městský žebrák, jehož každodenní život závisí na podpoře ostatních.',
 'Urban Labourer':'Ukázkový městský námezdní dělník.',
 'Urban Lìa-Kaváir':'Ukázkový městský příslušník povolání Lìa-Kaváir.',
 'Urban Mercantyler':'Ukázkový městský obchodník.',
 'Urban Mercenary':'Ukázkový městský žoldnéř.',
 'Urban Physician':'Ukázkový městský lékař, který se věnuje diagnostice a ošetřování.',
 'Urban Scholar':'Ukázkový učenec zabývající se studiem a písemnými znalostmi.',
 'Urban Weaponcrafter':'Ukázkový řemeslník vyrábějící zbraně.'
};
const fallback={
 'Elementals':'Elementární bytost. Její síla a účinky se řídí vázanou formou; fyzický boj se nemusí uplatnit.',
 'Folk':'Ukázkový příslušník jednoho z lidů Kèthîry. Následující údaje jsou konkrétním příkladem, nikoli šablonou pro každého.',
 'Gârgún':'Příslušník některého druhu gârgúna; různé druhy mají odlišné tělesné a společenské vlastnosti.',
 'Ívashù':'Tvor z rozmanitého, nepřirozeného společenství Ívashù, které je podle legend spojeno s bohem Ilvírem.',
 'Môrvrin':'Nemrtvá bytost s pravidly odlišnými od živých tvorů.',
 'Mythic Creatures':'Mytická bytost s neobvyklou anatomií nebo schopnostmi; běžná zvířecí pravidla nemusí stačit.',
 'Spirits':'Duchovní či ether-korporální entita, pro kterou je nutné rozlišovat duchovní a fyzické působení.'
};
export function creatureIntro569(entry){
 const id=entry?.id||'';
 if(A[id])return A[id];
 if(S[id])return S[id];
 if(F[entry?.name])return F[entry.name];
 if(id.endsWith('-400')&&String(entry?.name).includes('V’hîr'))return 'Agrikánský démon příslušného řádu. Má specifické vlastnosti inkarnace, bojové taktiky a práce se světlem.';
 if(['su-ura-4th-order-400','ban-v-hir-6th-order-400','vayera-7th-order-400','vii-8th-order-400'].includes(id))return 'Agrikánský démon určitého řádu; jeho vliv a omezení se mění podle světelných podmínek a zvláštních pravidel V’hîr.';
 return fallback[entry?.group]||'Druh bestiáře; věrohodná identifikace je v tištěné kapitole HMK.';
}
// A source-anchored limitation is always shown along with the descriptive summary.
export function creatureSource569(entry){return `HMK 1.2, Bestiary, str. ${entry?.page||'—'}`;}
