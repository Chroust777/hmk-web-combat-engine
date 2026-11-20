/** HMK v93.918: confirm every due die of the noncombat multi-die chains.
 * Presentation-only: the existing authoritative submission handlers calculate,
 * check chronology/identity, and record evidence. No new RNG on render.
 * Scope deliberately excludes Combat and every autonomous Skill Workbench queue.
 */
import {writingPageSpread} from './hmk-scribing-work.js?v=94.006';
import {successLevel} from '../rules/tests.js';
import {groupConfirmedDieControls93928} from './hmk-confirmed-dice-ui-93928.js';
const SELECTOR='form[data-skill-critical-form],form[data-hmk-fishing-catch],form[data-herb-assess],form[data-weather-blood-start],'+
 'form[data-skill-cold-shock],form[data-weather-shock-followup],form[data-alchemy-finish],form[data-weather-trauma-course],form[data-weather-blood-complete],'+
 'form[data-faerie-roll],form[data-hmk-engineering-design],form[data-shipwright-roll],form[data-construction-roll],form[data-fletching-finish="roll"],form[data-brew-start],form[data-brew-wine],form[data-jewelcraft-work],form[data-writing-spread],form[data-script-reading]:not([data-script-reading="done"]),form[data-script-copy="test"],form[data-hmk-scribing-work],form[data-parallel-cold-reroll],form[data-parallel-cold-course],.hmk-weather-care form#hmk-frost-amputation-form';
const SELECTIONS={
 faerie:['consecration','craftSkill','bow','armour'],
 design:['edifice','randomizeTime'],writingSpread:['scope','writingRewrite','writingPurpose','writingIntent','writingPagesRandom','writingTimeRandom'],
 shipwright:[],construction:[],
 fletching:['timeStars'],skillFollowup:['activity','technique'],
 fishing:['technique','conditionsMode','gmCondition','saturation','saltWater','offshore'],
 herbs:['singlePotencyRoll','actorId'],
 blood:['method','healerId','hasWater','hasNeedleThread','hasHeatedTool','tourniquet'],
 shock:[], immersion:['condition'],
 frost:['wound','healerId'],
 bloodComplete:[],
 trauma:['restfulShelter','arcaneBonus','physicianStars'],
 alchemy:[],brewStart:['scope'],brewWine:['workshopTN'],jewelcraft:['jewelTime'],reading:['sourceId','condition','timeStars','exchanged','useCreativity'],copy:[],writing:['timeStars','subjectSkill']
};
const title={faerie:'Faeriecraft · potvrzení hodů',design:'Engineering · Design Roll',writingSpread:'Writing · rozptyl dle HMK 132',shipwright:'Shipwright · HMK 84',construction:'Construction Roll · HMK 78, 91',fletching:'Výroba · potvrzení hodů',brewStart:'Brewing · doba zrání',brewWine:'Brewing · cena vína',jewelcraft:'Jewelcraft · doba výroby',reading:'Reading · potvrzení hodů',copy:'Opis · potvrzení d100',writing:'Insight a Scribing · HMK 83, 132',skillFollowup:'Navazující Skill Test',fishing:'Fishing · Conditions a Catch',herbs:'Byliny · potence a rozpad',
 frost:'Frost Amputation · hody v pořadí',bloodComplete:'Blood Stoppage a případný Blood Loss',blood:'Blood Stoppage · obvazy',shock:'Shock a případná Coma',immersion:'Cold Water Shock',trauma:'Extended Shock / Coma · Course Rolls',alchemy:'Alchemy · povinné navazující hody'};
const value=(form,name)=>form.elements.namedItem(name)?.value||'';
const die=(n,max)=>/^\d+$/.test(String(n).trim())&&Number.isSafeInteger(Number(n))&&Number(n)>=1&&Number(n)<=max;
const stageKey=(step)=>step.key;
function kindOf(form){if(form.matches('[data-faerie-roll]'))return 'faerie';if(form.matches('[data-hmk-engineering-design]'))return 'design';if(form.matches('[data-writing-spread]'))return 'writingSpread';if(form.matches('[data-shipwright-roll]'))return 'shipwright';if(form.matches('[data-construction-roll]'))return 'construction';if(form.matches('[data-fletching-finish]'))return 'fletching';if(form.matches('[data-brew-start]'))return 'brewStart';if(form.matches('[data-brew-wine]'))return 'brewWine';if(form.matches('[data-jewelcraft-work]'))return 'jewelcraft';if(form.matches('[data-script-reading]'))return 'reading';if(form.matches('[data-script-copy]'))return 'copy';if(form.matches('[data-hmk-scribing-work]'))return 'writing';return form.matches('[data-skill-critical-form]')?'skillFollowup':form.id==='hmk-frost-amputation-form'?'frost':form.matches('[data-weather-blood-complete]')?'bloodComplete':form.matches('[data-hmk-fishing-catch]')?'fishing':
 form.matches('[data-herb-assess]')?'herbs':form.matches('[data-weather-blood-start]')?'blood':
 form.matches('[data-skill-cold-shock]')?'immersion':form.matches('[data-weather-shock-followup],[data-parallel-cold-reroll]')?'shock':form.matches('[data-weather-trauma-course],[data-parallel-cold-course]')?'trauma':'alchemy';}
function fieldsOf(form,kind){
 if(kind==='faerie')return ['spiritRoll','sacredRoll','craftRoll','spiritDie','willRoll'].filter(name=>form.elements.namedItem(name));
 if(kind==='writingSpread')return ['writingPageDie','writingTimeDie'];
 if(kind==='design')return ['designD10','timeD3A','timeD3B'];
 if(kind==='shipwright')return ['shipwrightDie'];
 if(kind==='construction')return ['constructionDie'];
 if(kind==='fletching')return ['fletchingDice'];
 if(kind==='brewStart')return ['brewAgingDice'];
 if(kind==='brewWine')return ['wineDice'];
 if(kind==='jewelcraft')return ['jewelDice'];
 if(kind==='reading')return ['readingDice','creativityD100'].filter(name=>form.elements.namedItem(name));
 if(kind==='copy')return ['copyD100'];
 if(kind==='writing')return ['insightD10','scribingD100'];
 if(kind==='skillFollowup')return ['followRoll'];
 if(kind==='frost')return ['physicianRoll','amputationRoll','shockRoll'];
 if(kind==='bloodComplete')return ['physicianRoll','strengthRoll'].filter(name=>form.elements.namedItem(name));
 if(kind==='fishing')return ['conditionsD100','catchD10'];
 if(kind==='herbs')return [...form.querySelectorAll('input[name^="dice_"]')].map(n=>n.name);
 if(kind==='blood')return ['bandageD6Rolls'];
 if(kind==='immersion')return ['d6_1','d6_2','d6_3','enduranceD100'];
 if(kind==='shock')return ['roll',...(form.elements.namedItem('initialComaD10')?['initialComaD10']:[])];
 if(kind==='trauma')return ['roll',...(value(form,'kind')==='coma'?['periodD10']:[])];
 return ['cfWillD10','dissolutionD100','crucialShockD100',
  ...[...form.querySelectorAll('input[name^="aug"]')].map(x=>x.name)].filter(name=>form.elements.namedItem(name));
}
function needsGMComaHR(form){
 const eml=Number(form.dataset.shockEml);
 return ['immersion','alchemy'].includes(form.dataset.shockComaMode)&&form.dataset.shockComaReady==='yes'&&
  die(value(form,'roll'),100)&&Number.isFinite(eml)&&successLevel(Number(value(form,'roll')),eml)===0;
}
function stepsFor(form,kind){
 const result=[];
 const add=(key,faces,label,fieldName=key,seq=null)=>result.push({key,faces,label,fieldName,seq});
 if(kind==='faerie'){
  if(form.elements.namedItem('spiritRoll'))add('spiritRoll',100,'Spirit Success Value d100');
  if(Number(value(form,'consecration'))>0)add('sacredRoll',10,'Siemist Sacred Ground d10');
  if(form.elements.namedItem('willRoll'))add('willRoll',100,'Will d100');
  if(form.elements.namedItem('craftRoll'))add('craftRoll',100,'Craft Success Value d100');
  if(form.elements.namedItem('spiritDie'))add('spiritDie',10,'Spirit Secondary Roll d10');
 }else if(kind==='design'){
  const count=Number(form.dataset.designStars);
  for(let i=0;i<count;i++)add('design'+i,10,'Mathematics d10 '+(i+1)+'/'+count,'designD10',i);
  if(form.elements.namedItem('randomizeTime').checked){
   add('timeD3A',3,'Rozptyl doby · první d3');
   add('timeD3B',3,'Rozptyl doby · druhý d3');
  }
 }else if(kind==='writingSpread'){
  const pages=writingPageSpread(value(form,'scope'));
  if(pages&&pages.max>pages.min&&form.elements.namedItem('writingPagesRandom').checked)
   add('writingPageDie',pages.max-pages.min+1,'Počet stran · d'+(pages.max-pages.min+1));
  if(form.elements.namedItem('writingTimeRandom').checked)add('writingTimeDie',41,'Doba práce · d41');
 }else if(kind==='shipwright')add('shipwrightDie',100,'Shipwright d100');
 else if(kind==='construction')add('constructionDie',100,'Construction Roll d100');
 else if(kind==='fletching'){
  if(form.dataset.fletchingFlaw==='6'){
   add('lost1',6,'Ztracené dny · d6 1/2','fletchingDice',0);
   add('lost2',6,'Ztracené dny · d6 2/2','fletchingDice',1);
  }else if(form.dataset.fletchingFlaw==='2')add('flaw',2,'Vada výrobku d2','fletchingDice',0);
  else{
   const count=Number(form.dataset.fletchingStars)-Number(value(form,'timeStars'));
   for(let i=0;i<count;i++)add('mws'+i,10,'Masterwork d10 '+(i+1)+'/'+count,'fletchingDice',i);
  }
 }else if(kind==='brewStart'){
  const count=Number(form.dataset.brewAgingCount),faces=Number(form.dataset.brewAgingFaces);
  for(let i=0;i<count;i++)add('age'+i,faces,'Zrání d'+faces+' '+(i+1)+'/'+count,'brewAgingDice',i);
 }else if(kind==='brewWine'){
  const count=Number(form.dataset.brewWine),tn=form.elements.namedItem('workshopTN');
  if(!tn.disabled&&tn.value)for(let i=0;i<count;i++)add('wine'+i,10,'Workshop d10 '+(i+1)+'/'+count,'wineDice',i);
 }else if(kind==='jewelcraft'){
  if(value(form,'jewelTime')==='dice')for(let i=0;i<3;i++)add('jewel'+i,6,'Doba výroby d6 '+(i+1)+'/3','jewelDice',i);
 }else if(kind==='reading'){
  const stage=form.dataset.scriptReading,count=Number(form.dataset.readingCount||0);
  if((stage==='register'||stage==='start'&&form.dataset.readingExternal!=='yes')&&['ancient','middle','modern'].includes(value(form,'condition')))add('condition',100,'Stav předlohy d100','readingDice');
  if(stage==='test'&&count)add('readTest',100,'Language (Script) d100','readingDice');
  if(stage==='read'||stage==='reflect')for(let i=0;i<count;i++)add('reading'+i,stage==='read'?10:6,
   (stage==='read'?(form.dataset.readingCipher==='yes'?'Luštění d10 ':'Insight d10 '):'Rozjímání d6 ')+(i+1)+'/'+count,'readingDice',i);
  if(stage==='reflect'&&count&&form.elements.namedItem('useCreativity')?.checked)add('creativityD100',100,'Creativity d100');
 }else if(kind==='copy'){
  if(form.dataset.scriptCopyDie==='yes')add('copyD100',100,'Opis d100');
 }else if(kind==='writing'){
  if(form.dataset.hmkWritingReady!=='yes')return result;
  const count=Number(form.dataset.hmkWritingInsightCount||0);
  for(let i=0;i<count;i++)add('insight'+i,10,'Insight d10 '+(i+1)+'/'+count,'insightD10',i);
  if(form.dataset.hmkWritingScribeDie==='yes')add('scribingD100',100,'Scribing d100');
 }else if(kind==='skillFollowup'){
  const field=form.elements.namedItem('followRoll');
  if(!field.disabled&&value(form,'technique'))add('followRoll',100,value(form,'technique')+' d100');
 }else if(kind==='bloodComplete'){
  if(value(form,'mode')==='loss')add('strengthRoll',100,'Blood Loss · Strength d100');
  else if(form.dataset.hmkStoppageEml!==''){
   const eml=Number(form.dataset.hmkStoppageEml),roll=value(form,'physicianRoll');
   if(Number.isFinite(eml)){
    add('physicianRoll',100,'Blood Stoppage · Physician d100');
    if(die(roll,100)&&successLevel(Number(roll),eml)!==3)add('strengthRoll',100,'Blood Loss · Strength d100');
   }
  }
 }else if(kind==='frost'){
  if(form.dataset.hmkFrostTreatmentEml==='')return result;
  const eml=Number(form.dataset.hmkFrostTreatmentEml),roll=value(form,'physicianRoll');
  if(!Number.isFinite(eml))return result;
  add('physicianRoll',100,'Physician · Treatment d100');
  if(die(roll,100)){
   if(successLevel(Number(roll),eml)===0&&form.dataset.hmkFrostTriangle==='yes')
    add('amputationRoll',100,'G5 Edge · Strength d100');
   add('shockRoll',100,'Location Shock d100');
  }
 }else if(kind==='fishing'){
  if(value(form,'conditionsMode')==='roll')add('conditionsD100',100,'Conditions d100');
  const origin=form.querySelector('h4')?.textContent||'';
  const sourceSV=Number((origin.match(/\bSV\s*(-?\d+)/i)||[])[1]);
  const adjusted=sourceSV+(value(form,'technique')==='bare'?-2:0)+
   (form.elements.namedItem('saltWater')?.checked&&/\bCS\b/.test(origin)?1:0);
  // The proof-linked v93.916 guide gives the authoritative expected dice.
  const fromGuide=form.dataset.hmkDiceCount;
  const count=/^(?:0|2|4)$/.test(fromGuide)?Number(fromGuide):
   Number.isFinite(adjusted)?adjusted<=0?0:adjusted<=2?2:4:0;
  for(let i=0;i<count;i++)add('catch'+i,10,'Catch d10 '+(i+1)+'/'+count,'catchD10',i);
 }else if(kind==='herbs'){
  const inputs=[...form.querySelectorAll('input[name^="dice_"]')];
  const doses=inputs.length/7;
  if(!Number.isSafeInteger(doses)||doses<1||doses>500)return [];
  const shared=form.elements.namedItem('singlePotencyRoll')?.checked;
  for(let i=0;i<doses;i++)for(let k=0;k<7;k++){
   if(shared&&k===0&&i!==0)continue;
   add(`dice_${i}_${k}`,k===0?10:6,
    `Dávka ${i+1}/${doses} · `+(k===0?(shared?'společná potence d10':'potence d10'):
      'rozpad '+Math.ceil(k/2)+' · d6 '+(k%2?'A':'B')));
  }
 }else if(kind==='blood'){
  const bp=Number(form.dataset.hmkBloodBp);
  if(value(form,'method')==='sta'&&Number.isInteger(bp)&&bp>0&&bp<=4)
   for(let i=0;i<bp;i++)add('bandage'+i,6,`Staunch · Blood Loss Point ${i+1}/${bp} · d6`,'bandageD6Rolls',i);
 }else if(kind==='immersion'){
  for(let n=1;n<=3;n++)add('d6_'+n,6,'Doba ponoření · d6 '+n+'/3');
  add('enduranceD100',100,'Cold Shock · Endurance d100');
 }else if(kind==='shock'){
  const primary=form.elements.namedItem('roll');
  if(primary&&!primary.disabled){
   add('roll',100,'Shock Reroll d100');
   const roll=Number(value(form,'roll')),eml=Number(form.dataset.shockEml);
   if(form.dataset.shockComaReady==='yes'&&die(value(form,'roll'),100)&&
    Number.isFinite(eml)&&successLevel(roll,eml)===0&&
    (!needsGMComaHR(form)||die(value(form,'immersionComaHR'),20)))
    add('initialComaD10',10,'UNC + CF · první Coma Course d10');
  }
 }else if(kind==='trauma'){
  if(form.elements.namedItem('roll')?.disabled)return result;
  add('roll',100,(value(form,'kind')==='coma'?'Coma':'Extended Shock')+' Course d100');
  if(value(form,'kind')==='coma'&&die(value(form,'roll'),100)){
   const hr=Number(form.dataset.hmkTraumaHr),hb=Number(form.dataset.hmkTraumaHb),
    fatigue=Number(form.dataset.hmkTraumaFatigue),arcane=Number(value(form,'arcaneBonus'));
   if(Number.isSafeInteger(hr)&&hr>=1&&hr<=20&&Number.isSafeInteger(hb)&&hb>=1&&
    Number.isSafeInteger(fatigue)&&Number.isSafeInteger(arcane)&&arcane>=0&&arcane<=100){
    const eml=hb*hr-fatigue+(value(form,'restfulShelter')==='yes'?0:-20)+arcane;
    const sl=successLevel(Number(value(form,'roll')),eml);
    const nextHR=hr+[-2,-1,1,2][sl];
    if(nextHR>0&&nextHR<6)add('periodD10',10,'Coma pokračuje · nový d10 do dalšího Course');
   }
  }
 }else if(kind==='alchemy'){
  if(form.elements.namedItem('cfWillD10')){
   add('cfWillD10',10,'CF · Will Secondary Roll d10');
   const will=Number(value(form,'cfWillD10')),index=Number(form.dataset.alchemyWillIndex);
   if(die(value(form,'cfWillD10'),10)){
    if(will>index){
     add('dissolutionD100',100,'Neúspěšný Will · Dissolution d100');
     const dissolution=Number(value(form,'dissolutionD100'));
     if(die(value(form,'dissolutionD100'),100)&&dissolution%5===0)
      add('crucialShockD100',100,'Crucial Dissolution · Shock d100');
    }else for(const f of form.querySelectorAll('input[name^="aug"]'))
     add(f.name,10,'Úspěšný Will · Augmentation d10 · '+f.name);
   }
  }else for(const f of form.querySelectorAll('input[name^="aug"]'))
    add(f.name,10,'Augmentation d10 · '+f.name);
 }
 return result;
}
/** Add one UI queue per source form. Returns the number of new queues. */
export function decorateConfirmedNoncombatChains93918(root,rollDie){
 if(!root||typeof rollDie!=='function')return 0;
 let decorated=0;
 for(const form of root.querySelectorAll(SELECTOR)){
  if(form.dataset.hmkConfirmedChain93918)continue;
  const kind=kindOf(form),allNames=fieldsOf(form,kind);
  // Owner's approved UI contract: a lone immediate INC/STN Shock d100 and
  // an Extended Shock Course d100 retain the ORIGINAL field, die button and
  // one final submit. Only UNC can branch into a mandatory Coma d10; only
  // Coma Course can require a second conditional interval d10.
  if(kind==='shock'&&!form.elements.namedItem('initialComaD10'))continue;
  if(kind==='trauma'&&value(form,'kind')!=='coma')continue;
  const sources=new Map(allNames.map(name=>[name,form.elements.namedItem(name)]));
  if([...sources.values()].some(el=>!(el instanceof HTMLInputElement)))continue;
  // Don't stage an inapplicable Staunch form (BP0 already needs one real bandage,
  // but not a dice roll); the original rules remain the only validator.
  form.dataset.hmkConfirmedChain93918=kind;
  const submit=form.querySelector('button[type=submit]');if(!submit)continue;
  // Hide obsolete bulk rollers and original raw fields, retaining FormData.
  for(const field of sources.values()){
   const label=field.closest('label');
   if(label){label.classList.add('hmk-chain-hidden-field-93918');label.hidden=true;}
   field.type='hidden';field.tabIndex=-1;
  }
  const legacy={
   fishing:'[data-hmk-followup-roll-all]',
   herbs:'[data-herb-auto],[data-herb-shared]',
   blood:'',shock:'[data-weather-coma-d10]',
   alchemy:'[data-alchemy-roll-will],[data-alchemy-roll-dissolution],[data-alchemy-roll-shock],[data-alchemy-roll-augment]'};
  if(legacy[kind])for(const b of form.querySelectorAll(legacy[kind])){b.hidden=true;b.disabled=true;}
  const wrapper=document.createElement('fieldset');
  wrapper.className='hmk-noncombat-chain-93918';wrapper.dataset.hmkChain93918=kind;
  wrapper.innerHTML='<legend></legend><p class="hmk-chain-prompt-93918" role="status" aria-live="polite"></p>'+
   '<label>Skutečný výsledek <span class="hmk-inline-die-controls">'+
   '<input data-hmk-chain-value-93918 type="number" min="1" step="1" inputmode="numeric" autocomplete="off">'+
   '<button type="button" data-hmk-chain-generate-93918>⚄ Generovat hod</button> '+
   '<button type="button" data-hmk-chain-accept-93918>Vložit hodnotu</button></span></label>'+
   '<div class="hmk-chain-actions-93918"><button type="button" class="secondary" data-hmk-chain-reset-93918>Změnit potvrzené hody</button></div>'+
   '<output data-hmk-chain-receipt-93918 role="status" aria-live="polite"></output>';
  wrapper.querySelector('legend').textContent=title[kind];
  const prompt=wrapper.querySelector('[data-hmk-chain-prompt-93918]')||wrapper.querySelector('.hmk-chain-prompt-93918');
  const input=wrapper.querySelector('[data-hmk-chain-value-93918]');
  const gen=wrapper.querySelector('[data-hmk-chain-generate-93918]');
  const accept=wrapper.querySelector('[data-hmk-chain-accept-93918]');
  const reset=wrapper.querySelector('[data-hmk-chain-reset-93918]');
  const receipt=wrapper.querySelector('[data-hmk-chain-receipt-93918]');
  groupConfirmedDieControls93928(input,gen,accept);
  submit.before(wrapper);
  const accepted=new Map();let generated=null;
  const mustHaveSteps=kind==='frost'||kind==='bloodComplete';
  const comaHR=kind==='shock'?form.elements.namedItem('immersionComaHR'):null;
  comaHR?.closest('label')?.classList.add('hmk-chain-hidden-field-93918');
  function syncUnderlying(){
   const steps=stepsFor(form,kind),activeKeys=new Set(steps.map(stageKey));
   for(const name of allNames){
    const field=sources.get(name);if(!field)continue;
    let literal='';
    const group=steps.filter(x=>x.fieldName===name&&accepted.has(x.key));
    if(group.length){literal=group.some(x=>x.seq!==null)?group.map(x=>accepted.get(x.key).value).join(','):
     String(accepted.get(group[0].key).value);}
    if(kind==='herbs'&&name.startsWith('dice_')){
     const p=Number(name.split('_')[1]);if(p>0&&name.endsWith('_0')&&
       form.elements.namedItem('singlePotencyRoll')?.checked&&accepted.has('dice_0_0')){
      literal=String(accepted.get('dice_0_0').value);
      group.length=0;
      group.push({key:'dice_0_0'});
     }
    }
    if(field.value!==literal){field.value=literal;
     if(kind==='shock'&&name==='roll')field.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const software=group.length&&group.every(x=>accepted.get(x.key)?.origin==='software');
    for(const property of ['herbGenerated','alchemyGenerated','hmkAutoDice'])delete field.dataset[property];
    if(software){if(kind==='herbs')field.dataset.herbGenerated=literal;
     if(kind==='alchemy')field.dataset.alchemyGenerated=literal;
     field.dataset.hmkAutoDice=literal;}
   }
  }
  function pending(){return stepsFor(form,kind).find(step=>!accepted.has(step.key)||
   !die(accepted.get(step.key).value,step.faces));}
  function repaint(){
   const steps=stepsFor(form,kind),next=pending();
   const showHR=!!comaHR&&needsGMComaHR(form),waitHR=showHR&&!die(comaHR.value,20);
   const done=!next&&!waitHR;
   const missingTechnique=kind==='skillFollowup'&&form.dataset.requiresFollowRoll==='yes'&&!value(form,'technique')||
    kind==='brewWine'&&!value(form,'workshopTN');
   if(comaHR){
    comaHR.closest('label').hidden=!showHR;
    comaHR.disabled=!showHR;
    comaHR.required=showHR;
    if(!showHR)comaHR.value='';
    comaHR.closest('label').classList.toggle('hc-medical-validation-error',waitHR);
   }
   if(kind==='frost'){
    const strength=form.elements.namedItem('amputationStrengthML');
    const needsStrength=steps.some(step=>step.key==='amputationRoll');
    if(strength){
     const label=strength.closest('label');if(label)label.hidden=!needsStrength||strength.readOnly;
     const details=strength.closest('details');if(details){details.hidden=!needsStrength||strength.readOnly;if(!details.hidden)details.open=true;}
    }
   }
   wrapper.hidden=!steps.length;wrapper.classList.toggle('hmk-chain-complete-93918',done);
   const position=next?steps.findIndex(x=>x.key===next.key):steps.length;
   prompt.textContent=waitHR?'ČERVENÝ AKTIVNÍ KROK · Nejprve určete počáteční Coma HR podle rozhodnutí GM.':next?'ČERVENÝ AKTIVNÍ KROK '+(position+1)+'/'+steps.length+
    ' · '+next.label+' · potvrďte každou kostku samostatně.':
    'Všechny právě požadované kostky jsou jednotlivě potvrzeny.';
   input.max=String(next?.faces||100);input.disabled=!next;gen.disabled=!next;
   accept.disabled=!next||!die(input.value,next?.faces||0);
   reset.hidden=!accepted.size;submit.disabled=!done||missingTechnique||(mustHaveSteps&&!steps.length)||submit.dataset.hmkExternalDisabled93918==='yes';
   receipt.textContent=accepted.size?'Potvrzené skutečné hody: '+steps.filter(x=>accepted.has(x.key)).map(x=>
    x.label+' = '+accepted.get(x.key).value+' ('+(accepted.get(x.key).origin==='software'?'generátor':'ručně')+')').join('; '):
    'Žádný hod zatím nebyl potvrzen.';
   if(done){input.value='';generated=null;}
  }
  function clear(){accepted.clear();generated=null;input.value='';syncUnderlying();repaint();}
  function acceptNext(){const step=pending();if(!step||!die(input.value,step.faces)){
    receipt.textContent='Nejprve zadejte platný skutečný d'+(step?.faces||'?')+'.';return;
   }
   const n=Number(input.value);accepted.set(step.key,{value:n,origin:generated===n?'software':'manual'});
   generated=null;input.value='';syncUnderlying();repaint();if(pending())input.focus({preventScroll:true});
   else if(comaHR&&!comaHR.disabled&&!die(comaHR.value,20))comaHR.focus({preventScroll:true});
  }
  gen.addEventListener('click',()=>{const step=pending();if(!step)return;
   try{const n=rollDie(step.faces);if(!die(n,step.faces))throw Error('neplatný výsledek');
    input.value=String(n);generated=n;repaint();input.focus({preventScroll:true});}
   catch(e){receipt.textContent='Generátor: '+String(e?.message||e);}
  });
  input.addEventListener('input',()=>{generated=null;repaint();});
  accept.addEventListener('click',acceptNext);
  comaHR?.addEventListener('input',()=>{
   accepted.delete('initialComaD10');generated=null;input.value='';syncUnderlying();repaint();
  });
  reset.addEventListener('click',()=>{clear();if(pending())input.focus({preventScroll:true});});
  form.addEventListener('change',event=>{if(SELECTIONS[kind].includes(event.target?.name)){
    // The source rule/number of dice has changed: never reuse old proofs.
    clear();
    if(kind==='fishing'||kind==='writing'||kind==='brewStart'||kind==='writingSpread')queueMicrotask(()=>{syncUnderlying();repaint();});
    if(kind==='skillFollowup'&&pending())input.focus({preventScroll:true});
  }},true);
  // Window capture precedes preexisting document-level rule submission.
  const guard=event=>{
   if(event.target!==form)return;
   syncUnderlying();const step=pending();
   if(!step&&mustHaveSteps&&!stepsFor(form,kind).length){
    event.preventDefault();event.stopImmediatePropagation();return;
   }
   if(comaHR&&needsGMComaHR(form)&&!die(comaHR.value,20)){
    event.preventDefault();event.stopImmediatePropagation();comaHR.focus();return;
   }
   if(!step&&!(kind==='fishing'&&value(form,'conditionsMode')==='gm'&&!value(form,'gmCondition')))return;
   event.preventDefault();event.stopImmediatePropagation();
   receipt.textContent='Uložení zablokováno: '+(step?'nejprve jednotlivě potvrďte červený hod '+step.label+'.':
    'GM musí zvolit skutečné Fishing Conditions.');
   if(step)input.focus({preventScroll:true});
  };
  window.addEventListener('submit',guard,true);
  const observer=new MutationObserver(()=>{if(!form.isConnected){window.removeEventListener('submit',guard,true);observer.disconnect();}});
  observer.observe(root,{subtree:true,childList:true});
  // Prevent submitting externally disabled forms from being unlocked by UI decoration.
  if(submit.disabled)submit.dataset.hmkExternalDisabled93918='yes';
  syncUnderlying();repaint();decorated++;
 }
 return decorated;
}
