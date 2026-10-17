/** HMK p191 Deadly Attacks reference rules. */
export function deadlyAttackState({unaware=false,helpless=false,concentratedRound=false}={}){
  const forcedIgnore=!!(unaware||helpless);
  return {
    forcedDefence:forcedIgnore?'ignore':null,
    automaticFourStarCS:!!helpless,
    victoryStars:helpless?4:null,
    chooseExactLocation:!!(helpless&&concentratedRound),
    unaware:!!unaware,
    helpless:!!helpless
  };
}
