import {trackForm} from './hmk-form-work.js';
import {groupConfirmedDieControls93928} from './hmk-confirmed-dice-ui-93928.js';
import {trekSurpriseProcedure} from './hmk-trekking-wilderness-tasks.js';

const forestTerrains=new Set(['mixed-forest','mixed-woodland','cold-woodland','needleleaf-forest']);
const dice={d4:4,hearingD10:10,partyRoll:100,foeRoll:100};
const labels={d4:'Vzdálenost · d4',hearingD10:'Hearing · d10',partyRoll:'Družina · d100',foeRoll:'Protistrana · d100'};

export function decorateEpisodeEncounter93949(root,rollDie,preview){
 for(const form of root.querySelectorAll('form[data-episode-encounter-gm-93902]')){
  if(form.dataset.confirmedEncounterDice)continue;
  form.dataset.confirmedEncounterDice='true';
  const fields=form.elements;
  const guidance=form.querySelector('[data-episode-surprise-guidance]');
  const result=form.querySelector('[data-episode-surprise-result]');
  const submit=form.querySelector('button[type=submit]');
  const reset=form.querySelector('[data-episode-surprise-reset]');
  const accepted=new Map();
  const controls=new Map();
  const party={effective:form.dataset.partyWatchfulness,skills:form.dataset.partySkills.split(',')};
  for(const [name,faces] of Object.entries(dice)){
   const input=fields.namedItem(name);
   const generate=document.createElement('button');
   generate.type='button';generate.textContent='⚄ Generovat d'+faces;
   const confirm=document.createElement('button');
   confirm.type='button';confirm.textContent='Vložit hod';
   confirm.setAttribute('aria-label','Potvrdit hod · '+labels[name]);
   input.after(generate,confirm);
   groupConfirmedDieControls93928(input,generate,confirm);
   controls.set(name,{input,generate,confirm});
   generate.addEventListener('click',()=>{input.value=String(rollDie(faces));repaint();input.focus();});
   confirm.addEventListener('click',()=>{
    if(confirm.disabled)return;
    accepted.set(name,input.value);
    const next=repaint();
    next?.focus();
   });
  }
  function setField(name,show,enabled=show,required=enabled){
   const field=fields.namedItem(name);
   field.closest('label').hidden=!show;
   field.disabled=!enabled;
   field.required=required;
   return field;
  }
  function repaint(){
   const sourceReady=fields.offset.value!==''&&fields.offset.validity.valid;
   // Distance choices stay fixed once a distance die is confirmed.
   const distanceLocked=accepted.has('d4');
   fields.offset.readOnly=distanceLocked;
   for(const control of [fields.terrain,fields.moon,fields.wantHearing])control.disabled=distanceLocked;
   const forest=forestTerrains.has(fields.terrain.value);
   if(!forest&&!distanceLocked)fields.wantHearing.checked=false;
   fields.wantHearing.closest('label').hidden=!forest;
   const hasHearing=forest&&fields.wantHearing.checked;
   const distanceReady=distanceLocked&&(!hasHearing||accepted.has('hearingD10'));
   const kind=setField('encounterKind',distanceReady);
   const calm=distanceReady&&kind.value==='calm';
   const opposedEncounter=distanceReady&&kind.value==='surprise';
   const beast=setField('foeIsBeast',opposedEncounter,opposedEncounter,false);
   const stance=setField('foeWatchfulness',opposedEncounter&&!beast.checked);
   const foe=opposedEncounter?(beast.checked?'alert':stance.value):'';
   const procedure=foe?trekSurpriseProcedure({party,foe}):null;
   const sides=procedure?.kind==='opposed'?['party','foe']:procedure?.kind==='unopposed'?[procedure.preferred]:[];
   const stanceLocked=accepted.has('partyRoll')||accepted.has('foeRoll');
   // FormData must include stance after lock. Selects are re-enabled only
   // while constructing the validated receipt input in app.js.
   if(stanceLocked){kind.disabled=true;beast.disabled=true;stance.disabled=true;}
   let next=sourceReady?(!distanceLocked?'d4':hasHearing&&!accepted.has('hearingD10')?'hearingD10':
    !kind.value?'encounterKind':opposedEncounter&&!foe?'foeWatchfulness':null):'offset';
   let earlierReady=!!procedure;
   for(const side of ['party','foe']){
    const show=sides.includes(side)&&earlierReady;
    const locked=accepted.has(side+'Roll');
    const skills=side==='party'?party.skills:foe==='alert'?['Awareness','Stealth']:['Awareness'];
    const skill=setField(side+'Skill',show,show&&!locked);
    const eml=setField(side+'EML',show);
    eml.readOnly=locked;
    for(const option of skill.options)option.disabled=!!option.value&&!skills.includes(option.value);
    if(show){
     if(skills.length===1)skill.value=skills[0];
     else if(!skills.includes(skill.value))skill.value='';
     if(!skill.value)next||=side+'Skill';
     else if(eml.value===''||!eml.validity.valid)next||=side+'EML';
     else if(!locked)next||=side+'Roll';
    }
    if(sides.includes(side)&&!locked)earlierReady=false;
   }
   const required=['d4',...(hasHearing?['hearingD10']:[]),...sides.map(side=>side+'Roll')];
   for(const [name,{input,generate,confirm}] of controls){
    const locked=accepted.has(name);
    const show=required.includes(name)&&(locked||name===next);
    setField(name,show);
    input.readOnly=locked;
    generate.hidden=confirm.hidden=locked;
    generate.disabled=!show||locked;
    confirm.disabled=!show||locked||input.value===''||!input.validity.valid;
   }
   const canResolve=calm||!!procedure&&required.every(name=>accepted.has(name));
   let outcome=null;
   result.textContent='';
   if(canResolve)try{
    outcome=preview(form,calm);
    const s=outcome.surprise;
    const sidesResult=s?[s.partyLevel&&'družina '+s.partyLevel,s.foeLevel&&'protistrana '+s.foeLevel].filter(Boolean).join(' · '):'';
    result.textContent='Vzdálenost '+outcome.distance.sightingFeet+' ft'+(s?
     ' · '+(s.winner==='party'?'Překvapila družina':s.winner==='foe'?'Překvapila protistrana':'Bez překvapení')+
     (sidesResult?' · '+sidesResult:''):' · Klidné setkání');
   }catch(error){result.textContent=error.message;}
   const decision=setField('decision',!!outcome&&!calm);
   const ambush=decision.querySelector('[value="ambush"]');
   ambush.disabled=!outcome?.surprise?.winner||Number(fields.offset.value)!==Number(fields.offset.max);
   if(decision.value==='ambush'&&ambush.disabled)decision.value='';
   if(!next&&outcome&&!calm&&!decision.value)next='decision';
   for(const label of form.querySelectorAll('label.hc-episode-needs-input'))label.classList.remove('hc-episode-needs-input');
   const target=next?fields.namedItem(next):null;
   target?.closest('label')?.classList.add('hc-episode-needs-input');
   const nextMessage=labels[next]||({offset:'Minuta setkání',encounterKind:'Druh setkání',foeWatchfulness:'Ostražitost protistrany',decision:'Rozhodnutí po Surprise',
    partySkill:'Dovednost družiny',foeSkill:'Dovednost protistrany',partyEML:'Doložené EML družiny',foeEML:'Doložené EML protistrany'})[next];
   guidance.textContent=nextMessage?'Aktuální krok · '+nextMessage+'.':outcome?'Výsledek je připravený k uložení.':'Doplňte podmínky setkání.';
   submit.disabled=!outcome||!!next;
   reset.hidden=!accepted.size;
   return target;
  }
  trackForm(form,'encounter',['offset','terrain','moon','wantHearing','encounterKind','foeIsBeast','foeWatchfulness','partySkill','foeSkill','partyEML','foeEML','decision'],
   ()=>({accepted:[...accepted],values:[...controls].map(([k,c])=>[k,c.input.value])}),saved=>{
    accepted.clear();for(const [k,v] of saved.values){const c=controls.get(k);if(!c)return false;c.input.value=v}
    for(const [k,v] of saved.accepted){const next=repaint(),c=controls.get(k);if(!c||next!==c.input||v!==c.input.value||!c.input.validity.valid){accepted.clear();repaint();return false}
     accepted.set(k,v)}
    repaint();return true;
   });
  reset.addEventListener('click',()=>{
   accepted.clear();
   for(const {input} of controls.values())input.value='';
   fields.decision.value='';
   repaint()?.focus();
  });
  form.addEventListener('input',repaint);
  form.addEventListener('change',repaint);
  repaint();
 }
}
