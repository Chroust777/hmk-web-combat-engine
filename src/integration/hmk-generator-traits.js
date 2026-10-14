/** Authoring preferences only. NOT HMK stat/trait rolls and not clinical inference.
 * Rules are enforced by the existing 14-stage creation validator.
 */
const groups={
 'Tělesná stavba':['Štíhlý','Hubený','Podsaditý','Mohutný','Svalnatý','Obézní','Vysoký','Nízký','Drobné postavy','Zavalitý','Mrštný','Nemotorný','Vytrvalý','Křehký'],
 'Vystupování a energie':['Tichý','Výřečný','Společenský','Samotářský','Sebevědomý','Plachý','Dominantní','Nenápadný','Energický','Klidný','Impulzivní','Rozvážný'],
 'Svědomitost a návyky':['Pracovitý','Líný','Pečlivý','Pořádný','Chaotický','Trpělivý','Netrpělivý','Disciplinovaný','Spolehlivý','Tvrdohlavý','Přizpůsobivý','Perfekcionista'],
 'Vztah k ostatním':['Soucitný','Empatický','Obětavý','Laskavý','Nedůvěřivý','Podezíravý','Manipulativní','Diplomatický','Přátelský','Konfliktní','Čestný','Lstivý'],
 'Zvídavost a myšlení':['Zvídavý','Učenlivý','Analytický','Vynalézavý','Kreativní','Pragmatický','Snílek','Skeptický','Tradiční','Dobrodružný','Zbožný','Pověrčivý'],
 'Emoce a morálka':['Odvážný','Bojácný','Optimistický','Pesimistický','Úzkostný','Vznětlivý','Pomstychtivý','Milosrdný','Ctižádostivý','Pokorný','Věrný','Vzpurný'],
 'Motivace a zkušenosti':['Hledá vědění','Touží po moci','Chrání slabé','Touží po bohatství','Hledá pomstu','Touží cestovat','Oddán víře','Miluje přírodu','Žije pro řemeslo','Touží po slávě','Vyhledává samotu','Dává přednost rodině']
};
export const GENERATOR_TRAIT_GROUPS=Object.freeze(Object.entries(groups).map(([name,traits])=>({name,traits:Object.freeze(traits)})));
export const GENERATOR_TRAITS=Object.freeze(Object.values(groups).flat());
export const GENERATOR_FOLKS=Object.freeze(['Náhodně podle HMK','Human','Kúzhai','Ænarin','Sinái','Sidhé','Malákta','Nâdi']);
export const GENERATOR_OCCUPATION_PREFERENCES=Object.freeze(['Bez preference','Man-at-arms','Yeoman','Mercenary','Swordmaster','Scholar','Scribe','Astrologer','Shèk-Pvâr','Alchemist','Shaman','Priest','Pilot','Hunter','Forester','Seaman','Herder','Fisher','Weaponcrafter','Carpenter','Potter','Metalsmith','Bureaucrat','Harper','Herald','Merchant','Farmer','Servant','Thespian']);
const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const associations=[
 [/odvaz|bojovn|svalnat|mohutn|vznetliv|pomst|slav|dominant|konfliktn|vzpurn|bojovat|valecn/, 'warrior'],
 [/zvidav|ucen|analyt|vede|vedomost|skept|snilek|stud|knih|zkusen|filosof|filozof/, 'scholar'],
 [/vir|zboz|duchovn|pover|myst|tajemn|ritual|mag|kouzl|carod|vize/, 'mystic'],
 [/remes|vynalez|kreativ|pecliv|pracovit|disci|porad|kovar|truhlar|umel|tvurc|perfekcion/, 'artisan'],
 [/cestov|prirod|dobrodruz|samot|vytrval|mrstn|hleda|pruzkum|les|lov|stopar|namor/, 'explorer'],
 [/vyrec|spolecen|diplomat|laskav|empat|pratel|lstiv|manipul|slecht|politic|obchod|moc/, 'social'],
 [/oddan vire|knez|covenant|emhl|beona|poutnik viry/, 'covenant']
];
export function interpretCharacterDescription(text='',selectedTraits=[]){
 const description=String(text).slice(0,3000);const chosen=[...new Set(selectedTraits.filter(v=>GENERATOR_TRAITS.includes(v)))];
 const score={warrior:0,scholar:0,mystic:0,artisan:0,explorer:0,social:0,covenant:0};
 for(const phrase of [...chosen,description]){const normalized=fold(phrase);for(const [rx,id] of associations)if(rx.test(normalized))score[id]+=phrase===description?2:3;}
 const ranking=Object.entries(score).sort((a,b)=>b[1]-a[1]);
 return {traits:chosen,description,score,primary:ranking[0][1]>0?ranking[0][0]:'random',ranking:ranking.filter(x=>x[1]>0).map(x=>x[0])};
}
