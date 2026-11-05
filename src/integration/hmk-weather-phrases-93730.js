/** Accessible Czech descriptions; HMK pp.144,149 supply qualitative categories,
 * not actual Celsius, rainfall amount or independent hail probabilities. */
export function visibleWeather({hazard=null,precipitation='none',continuous=null}={}){
 const cold=hazard==='cold',heat=hazard==='heat';
 const precip=precipitation==='rain'?'déšť':precipitation==='snow'?'sněžení':
  precipitation==='sleet'?'déšť se sněhem / mrznoucí déšť':precipitation==='unconfirmed'?'srážky dosud neurčeny':
  'beze srážek';
 const temp=cold?'nebezpečný chlad':heat?'nebezpečné horko':'bez teplotního nebezpečí';
 const heading=precipitation==='unconfirmed'?'Počasí zatím neurčeno':
  cold&&precipitation==='snow'?'Sněžení a silný chlad':
  cold&&precipitation==='sleet'?'Plískanice a silný chlad':
  cold&&precipitation==='rain'?'Chladné deštivé počasí':
  cold?'Silný chlad':
  heat&&precipitation==='rain'?'Horko a déšť':heat?'Horké počasí':
  precipitation==='snow'?'Sněžení':precipitation==='sleet'?'Déšť se sněhem':
  precipitation==='rain'?'Deštivé počasí':'Bez srážek';
 const label=continuous===true&&precipitation!=='none'&&precipitation!=='unconfirmed'?'Vytrvalý '+precip:
  continuous===false&&precipitation!=='none'&&precipitation!=='unconfirmed'?'Slabý / nevýznamný '+precip:
  precip;
 return {heading,temperature:temp,precipitation:label,
  badge:hazard==='cold'?'Riziko prochladnutí':hazard==='heat'?'Riziko přehřátí':'Bez teplotního rizika',
  icon:cold?'❄️':heat?'☀️':precipitation==='rain'?'🌧️':precipitation==='snow'?'🌨️':precipitation==='sleet'?'🌨️':'⛅'};
}
