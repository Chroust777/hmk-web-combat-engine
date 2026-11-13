/** v93.863: The occurrence minute of a mid-window Accident never edits the
 * GM-booked interval. The activity stops moving at the incident; the entire
 * planned window remains reserved by Calendar. No dice, injuries, or time writes.
 * Old historical receipts are validated by their original version policy. */
export function incidentMinutes93863({minutes,atMinute,kind,incomingDelay=0}={}){
 if(!Number.isSafeInteger(minutes)||minutes<1||minutes>10080||
    !Number.isSafeInteger(atMinute)||atMinute<1||atMinute>minutes||
    !Number.isSafeInteger(incomingDelay)||incomingDelay<0||incomingDelay>10000000)
   throw Error('Accident: zadejte celé číslo minuty nehody v rozsahu 1 až délka původního intervalu.');
 const idleMinutes=minutes-atMinute;
 return {windowMinutes:minutes,atMinute,idleMinutes,
  movementMinutes:kind==='travel'?Math.max(0,atMinute-incomingDelay):null,
  medicalAtWindowEnd:true};
}
