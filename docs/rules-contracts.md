# HMK combat source-contract matrix (working audit)

Authority: HârnMaster Kèthîra PDF only. Excel data may populate reference records but never defines rules.

Status values: CORE = operative core rule; REFERENCE = summary/cross-reference of core rule; OPTION = explicitly named option; A&O = appears in Advice & Options but heading itself is not explicitly labelled "option"; GM = explicit GM adjudication.

| Contract | Class | Source | Engine requirement |
|---|---|---|---|
| EML normal bounds | CORE | p.60 | Final EML normally clamps to 05..95; specific rules may override; GM may adjudicate automatic outcomes in extremes. |
| Grab / Hold | CORE | p.106 | Winning Melee initiator must also win one opposed d6+STR roll. Hold forces target Pass next turn; retest on grabber's next turn; relation is pairwise and zone-specific. |
| Press | CORE | p.106 | Separate opposed d6+STR branch after victorious Melee; no normal location/impact injury path. |
| Trip | CORE | p.106 | Separate opposed d6+STR branch after victorious Melee; 10+ margin offers automatic Grab Take/Hold. |
| Tactical Advantages | CORE | p.171 | Action/Impact/Precision/Setup; timing and per-round restrictions must be explicit state. |
| Prone | CORE | p.171 | Affects EZ stopping, aim, In Close, outnumbering, Melee, RCH/aim, crawl and rising. |
| Two-weapon Fighting | CORE | p.171 | Off-hand weapon Length >=2 permits two Melee Attack Action TA in same round, one per hand. |
| In Close | CORE | p.171 | Pairwise engagement state; reverses reach disadvantage; persists until one moves at least 5 ft away. |
| Tight Quarters | GM | p.171 | GM decision node: automatic In Close while confined; awkward weapon may receive -20 or be disallowed; thrust often avoids restriction. |
| Natural Weapons | CORE | p.171 | Natural-vs-armed attack/defence has special contact and Limb Block/Grab interactions; separate resolver branch. |
| Mounted Combat | CORE | p.172 | Control Roll, Mounted Penalty, shared rider IR, movement, mounted melee/defence and reach/impact adjustments. |
| Free Press Roll | CORE | p.172 | Offered after successful Melee with higher SL without tiebreak; after injury/mishap, before Action TA; excluded for Press and Dodge defender; special mount/Mighty Strike rules. |
| Chase Attack | CORE | p.172 | Pursuer may attack after full/double Move at -20; non-Dodge defences -20; GM may require Stumble. |
| Deadly Attacks | REFERENCE | p.191 | Do not create option toggle. Summarises Unaware/Helpless core behavior and exact-location concentration rule. |
| Allies | A&O | p.191 | Offset Outnumbered Penalty by 10 per valid unique ally/foe pairing. |
| Flanking | A&O | p.191 | Worsen Outnumbered Penalty by 10 once; new flank triggers immediate Awareness test and Ignore relation on failure. |
| Melee Maximum Foe | OPTION | p.191 | Max 3 known active foes; extras Ignored/unthreatened; designation lasts one round or until no longer exceeded; Pass raises active max to 4 until next turn. |
| Unique Injury Effects | OPTION | p.191 | Face/groin and serious/grievous leg/torso special effects; must be gated as an option. |
| Weapon Damage | A&O | p.191 | WQ loss/destruction resolver; Block tie uses tiebreak only for weapon damage; modifiers for CS, shield, thrust, natural weapon; metal armour back-damage branch. |

Open audit items are not silently inferred. Each is added only after direct PDF verification.

## Audit additions — engagement/options/traits/shields
- Allies (p191): OPTION. Offset Outnumbered by 10 per legal ally↔threatening-foe pairing; each ally and foe at most once. Implemented as maximum matching.
- Flanking (p191): OPTION. One -10 Outnumbered modifier if any exact 180° threatening pair; newly flanked target tests Awareness immediately and pairwise Ignore state persists until attack/retest success.
- Melee Maximum Foe (p191): OPTION. 3 active known foes; extras forced Ignore; designation lasts one round from noted IR or until count drops. Pass raises active limit to 4 until next turn.
- Weapon traits (p98): data-driven helpers for AR, block/defence/melee, counter-only availability, couched, entangle, envelop, impact-TA override, long, low aim, opp defence, shield mod, slow, thrust. Envelop is persistent -20 attack/defence/Move with Grope Dexterity-SV escape at accumulated SV15.
- Passive Deflect (p98): CORE trait, independent of awareness; successful front/shield-side interception checks Weapon Damage against shield.
- Shield Missile Block (p133): OPTION, active once/round, awareness and > half point-blank range; unavailable while threatened unless threats are Ignored for the round.
- Shield Wall (p133): OPTION, +10 shield mod/+2 deflect with qualifying ally on non-shield side; Difficult half Move in consort at lowest IR; lost out of In Close, beyond half Move, prone; bucklers excluded.
- Melee post-resolution (p172): hard phase gate Injury -> Mishaps -> Free Press -> Action TA.

## Shock state / Extended Shock / Coma
- CORE, Injury Sequence pp.169–170 and Healing Sequence p.179.
- SHK <=6 none, 7 STN, 8 INC, 9 UNC, 10+ KIA; Shock SL modifiers CF +2/F +1/S 0/CS -1.
- Repeated STN while STN => INC; repeated INC while INC => UNC. Only most severe state otherwise applies.
- STN recovery: Shock test end next turn, retry each round; success removes STN. INC reroll end next turn; UNC reroll ten minutes after original Shock Roll; rerolls -20 and fatigue, never injury impairment.
- Shock Reroll CF => Extended Shock HR4; UNC CF additionally Coma. F => Extended Shock HR5. S => STN. CS => state removed.
- Extended Shock is an independent trauma retaining INC/UNC until HR6+, Course every four hours; HR0 death. Coma is independent of Extended Shock, initial HR=12-location shock-injury level, Course every d10 days.

## Bleeding / Blood Loss
- CORE, Healing Sequence p.178.
- Each bleeder makes a Strength Advance Roll every five minutes, excluding fatigue/impairment (non-Folk beasts ML50): CF +3 BP, F +2, S +1, CS +0.
- Accumulated BP: 1 STN, 2 INC, 3 UNC, 4 KIA; 5 weakness fatigue per BP.
- Blood-loss states combine with current state using normal same-state escalation (explicit example: INC while INC => UNC).
- Blood-loss STN/INC/UNC persists until all bleeding stops; then STN clears automatically, INC/UNC make Shock Reroll.
- Blood Stoppage: CF continues + Advance; F same and +10 next Staunch; S stops after one final Advance; CS stops immediately.

## Injury Sequence: impact, compound injury, bleeding, amputation

Source authority: HMK Injury Sequence, printed pp. 167–169; Bleeding/Healing Sequence p. 178.

- Effective impact: 1–4 M1, 5–9 S2, 10–14 S3, 15–19 G4, 20+ G5. Impact <=0 causes no injury.
- Glancing Blow: E/P effective impact 1–4 against rigid armour creates no recorded M1 injury, but contributes Injury Shock 1 and +10 to the Shock test.
- Compound Injury is location-specific, not merely body-zone-specific. TN is total compatible IL including the new injury. Success raises the highest-IL injury by one; ties raise the most recent injury. Fire/Frost compound only with Fire/Frost; Area only with Area.
- A compounded G5 stays IL5 but contributes Injury Shock 6. Any successful Compound uses the compounded injury's resulting IL for step 4.2 Shock, even if an older injury was the one increased.
- Bleeding is determined from the causal injury and the location bleeding mark. Blood Loss begins five minutes later, separately for every Bleeder.
- Amputation applies only to G5 Edge in a location with an amputation triangle. Strength test uses triangle modifier +20/0/-20. Beast fixed ML is 70/50/30 respectively.
- Amputation CF: severed; neck = immediate death; force Bleeder even where location normally does not bleed.
- Amputation F: severed; neck = immediate death; force Bleeder only where location normally produces Bleeders.
- Amputation S: not severed; ensuing Shock test -20. CS: not severed, no extra effect.
- The PDF does not establish a permanent post-amputation Strength-ML reduction in this rule; none is inferred from workbook behaviour.

## Unified Injury Sequence (p167–171)
- Step 1 is data-driven by each creature's Body Location table. Zone Aim counts from the selected ZN; a ZD result outside the table misses. Precision adds ZD; player chooses a ZD result first, then receives one extra d10 LD for each additional ZD indicating that same body zone. Helpless + one-round concentration may select exact Zone/Location. Area skips Step 1; Press/Trip skip Steps 1–2.
- Step 2: effective impact = strike impact − aspect AV; negative AV/effective impact is preserved. Area uses Area AV.
- Optional Metal Armour transformation occurs after initial injury severity is known but before Compound/Bleeding/Amputation: S/G edge through scale/mail, or S/G edge/point through plate, becomes blunt one IL lower.
- Step 3 order is Compound → Glancing/Bleeding/Amputation as applicable. Compound shock may derive from a different (older) injury than the causal injury used by Bleeding/Amputation.
- Step 4 uses Location Shock + Injury Shock + Shock-test result; Shock tests include fatigue, exclude injury impairment. Glancing adds +10 to the Shock test. Existing STN+new STN escalates INC; INC+new INC escalates UNC.
- Step 5: M impairment 0 for 10 minutes after S/CS Shock then 5; failed Shock makes it 5 immediately. S=10. G=unusable. Mishap profile is zone/severity specific. Projectile S3+ is impaled.
- Resolver never invents required random outcomes: missing Compound, Amputation, Shock, ZD/LD, or Precision choices are surfaced as pending inputs.

## Missile → Injury integration (p163–164, p167)
- Range bands: PB ≤ BR/2 (+10 test, d6 default ZD, +2 impact); Direct ≤ BR (d8, +0); Volley ×2 (d10, −2 impact); ×3 (−20 test, d10, −3); ×4 (−40, d10, −4).
- Charging thrown attacks use the charging column and maximum Volley ×3; thrown PB uses its weapon-specific PB ZD.
- Final adjusted EML ≤ −40 is Spoiled Attack and does not receive the ordinary minimum-EML05 test.
- Direct Still success gets one automatic Precision TA; CS gets one additional choice TA. Moving/Evading S/CS do not get the automatic Still Precision.
- Failed Direct attack checks nearby targets only if EML >05. A nearby hit uses d10 (or target zone count if larger) and d10 5/0 grants one projectile Impact TA.
- Passive shield Deflect is resolved after a missile strike but before Injury; success causes no target injury and invokes shield Weapon Damage.

## Unified strike-to-injury adapters
- Direct and Volley Missile, ordinary Melee strikes, and Area Fire/Frost now enter the same deterministic Injury Sequence core.
- Direct/Volley projectile strikes gate passive shield Deflect before Injury; a successful Deflect produces no Injury Sequence and instead requests shield Weapon Damage.
- Volley uses d20 target count normally; CS Volley Precision replaces it with d10, with further precision dice selected by the player. The separate d10 result 5/0 grants one projectile Impact TA.
- Volley injury ZD is d10 or a die equal to target body-zone count when larger.
- Area Fire/Frost skips ZD/LD, uses Area AV and Location Shock 6. A prior Evade Dodge S/CS reduces final Shock Index by 1/2 and the evader becomes prone.

## Weapon calculations and special Strike Modes
- STR Impact follows p97 exactly; off-hand and thrown each reduce the STR Impact modifier by 1.
- Heft: -5 per STR below HFT; two-handed use reduces HFT by 5; off-hand increases HFT by 5 and has a minimum -10 penalty, except shield Block/Press.
- A swung weapon used two-handed gets +1 strike impact only when STR meets the weapon's unadjusted listed HFT.
- Half-sword: swords only; LNG -2 min 3; thrust; Point; two-handed Heft. Without gauntlets, non-estoc strike/block CF causes independent M1e gripping-hand injury.
- Handle: axes, clubs, non-whip flails, knives, swords; LNG1, d6 ZD, d6+0b; knife/sword Block worsens by 10.
- Shaft: polearms; LNG -2, d6 ZD, d6+1b, removes slow/thrust, adds melee -5 except staff.

## RC additions verified against PDF
- Missile situational EML: target movement, moving shooter exception for throwers, thrown Heft/object shape, Direct/Volley crosswind, trauma, Aim, range modifier and Direct TAR bonus. Wet bows/crossbows halve BR before range bands.
- Grenade deviation uses the distance/SL table; CF is a mishap, not deviation.
- Projectile heads remain data-driven: Bodkin AR4p/Impact TA3p, Blunt halves final impact, Broad bleeding 5.
- Animal abilities: Clench, Constrict, Dive, Gore and Trample are trait-driven rather than universal creature rules.
- Long action commitment: 1-round/1+-round concentration forces Ignore and removes EZ until abandoned; 1-turn actions do not.
- Persistence validates schema, duplicate combatant UUIDs, timed-event references and pairwise relation references; export is canonical.
- Possessions options: Kurbul/Plate AV by zone, Kurbul Breakage, Quick Area AV, Armour Maintenance combat effects.
- Unique Injury Effects remain optional; advisory 'might' Face effects are GM decisions.
- Creature-vs-human aim, Eluding, natural anatomy Reach and Flying rules are explicit contracts.
- Protection Behind Hard Cover is core combat protection; Oversized Target Zone is optional.
- Bestiary ABE options are independent: Aberrant Morale, Attenuated ABE, Group ABE, Relative ABE.

## RC coverage additions after checkpoint 205

### Alertness / Reaction (CORE, pp.158–159)
- Alertness is pair/context-sensitive: Aware, Confused, Unaware.
- Opposed Surprise uses success-level difference; tied successes => both Aware, tied failures => both Confused.
- Confused: only Block with readied weapon or Dodge; must Pass; no TA; Reaction at end of turn.
- Unaware: must Ignore, no actions; once alerted makes immediate Reaction: F/CF => Confused, S/CS => Aware.
- Reaction is Initiative EML; ordinary success enables normal action on next turn, failure repeats.

### Engagement / Initiative order (CORE, pp.159–160)
- EZ = max(5 ft, longest readied weapon RCH); only Aware, non-helpless combatants exude EZ/Reach Effect.
- Threat is elective and requires target in EZ with unimpeded weapon reach.
- Entering an elected threatening EZ stops movement; threatened characters may leave at start of own turn.
- IR ties: higher Awareness EML, then PC before NPC; same-side residual tie is player/GM order.
- Initiative Reaction Roll sidebar is an explicit optional combat setting and defaults OFF.
- Aware loaded-crossbow archers may shoot before the regular opening IR sequence, ordered by IR.

### Action legality (CORE, pp.160–161)
- Charge starts only unthreatened; half Move; thrown attack only if still unthreatened, or melee against engaged target.
- Barge after Melee Attack only if unthreatened; Difficult half Move.
- Evade: not stunned, 10 ft minimum through half Move, no melee strikes, missile penalty = 5 x Effective Dodge Index.
- One free action before a 1-turn action only; none after it or with 1-round+ action; second free action consumes the main action.
- Five-foot free move may occur in EZ but not before Charge/Evade/Move movement.
- Only 1-turn Attack/Grope/Move may be readied; readied Move max half Move; resolving it changes actor IR to interruption IR.

### Mishaps (CORE, p.161)
- Natural combat CF: CF0 Fumble, CF5 Stumble; Dodge CF always Stumble.
- If a condition downgrades natural F to CF: even units digit => Fumble, odd => Stumble.
- Fumble tests DEX or Legerdemain; failed result drops item. No DEX / non-DEX action converts Fumble to Stumble.
- Stumble tests AGL or Acrobatics; failure => prone; legless creature instead Passes next turn.
- Recover dropped item: 1-turn Grope; if threatened also successful Melee required or turn ends.

### Morale triggers / Vanquished (CORE, p.162)
- S/G injury trigger waits until recovery from associated Shock State.
- Group cohesion can trigger repeatedly as successive half-remaining-ally thresholds are crossed.
- Vanquished includes catatonic, withdrawing, surrendered, incapacitated, terrified, unconscious, routed, killed, and effects preventing movement/aggression.
- Situational functional incapacitation and disarmed-vs-armed cases remain GM judgement where PDF says so.

### Fear / Aberrance (CORE, pp.187–188)
- Fear tests Will; ABE applies -5 per ABE to Will and Initiative tests.
- CF0 Catatonic PSY 2+ABE; CF5 Terrified PSY 1+ABE; F Afraid PSY ABE; S Steady PSY floor(ABE/2); CS Brave +20 for 5 min.
- Fear states have their own action/recovery rules and are not collapsed into Morale states.

### Missile action contracts (CORE, p.163)
- Bow/Sling load, Aim, Shoot; Crossbow Span/Load/Aim/Shoot; Thrown Aim/Throw/Charge preserve exact movement/time/defence contracts.
- Bow Aim requires Pull exceed Draw by at least 75.
- Accessible projectile may load as Free, with DEX/Missile test if situation calls for it.
- Aware combatant may abandon an Ignore-inducing missile action to defend normally; action is lost.

## RC coverage additions after checkpoint 247

### Engagement-space correction / Spirit initiative (CORE, p.159)
- Corrected a real prior kernel error: map EZ conversion is RCH 0–7 = 1 space, 8–12 = 2, 13–17 = 3 (continuing in five-point bands). The previous `ceil(RCH/5)` overstated several boundaries.
- Spirit-world entities, and entities without Initiative, use Spirit ML for Initiative Rank. In the astralscape Empathy EML is the IR tiebreak before residual PC/NPC ordering.

### Melee declaration contracts (CORE, p.165)
- Unaware/helpless defenders are forced to Ignore; voluntary Ignore lasts one round.
- Confused defenders may only Dodge or Block with a readied weapon; Evade likewise permits Block/Dodge only.
- Block designates a readied blocking weapon but may use a different threatening readied weapon for Reach/Thrust reference. Dodge still designates a readied Reach/Thrust reference. Counterstrike requires its own readied strike weapon and Zone Options.
- Unsheathe is Free; unsling is a 1-turn Grope; resheath/resling is a 1-turn Grope; dropping an item requires no action.

### Fatigue core (CORE, pp.176–177)
- Personal Fatigue = modified ENC + 5. Windedness, weariness and weakness sum into the global fatigue penalty.
- Fatigue penalises Success Tests and Move except explicit exceptions: END Secondary Rolls, Secondary Modifiers/Rolls, and Spirit tests by an active soul inhabiting the spirit world.
- A successful applicable END SR reduces an accrual by 5 and is itself not fatigue-penalised.
- Windedness: qualifying 10-minute rest removes 5, once per hour. Weariness: 4-hour rest removes 5 and 8-hour sleep removes 15, each once per day. Weakness only abates with its causal condition.

### Encumbrance / Bulk / Move derivation (CORE, pp.56,112,117,122)
- Gear ENC = 5 per 20 full effective pounds; poorly stowed/awkward gear counts double. Add armour+gear before STR adjustment; final ENC minimum 0. Low STR increases ENC only when base ENC is at least 5. Mounted use improves the STR ENC modifier by 15.
- ENC penalises Move, Agility tests and skills with Agility in the Skill Base. Bulk is independent and applies -5 per violated Body Zone required by the test.
- Human-sized folk base Move 50; Kuzhai base 30. Modifier uses the AGL/STR average, rounding up only when AGL > STR, then the explicit p.56 table. No unsupported extrapolation beyond the printed table.
- Evasion = Effective Dodge Index ×5.

## Healing lifecycle — CORE (HMK pp.177–182)

The rules kernel now keeps long-term recovery distinct from the acute Injury Sequence.

- Healing Base is the END/WIL average, with a half point rounded upward only when END is greater than WIL.
- Treatment EML includes the treatment's own difficulty and -5 per elapsed day; Area injury treatment adds a further -20. Boxed surgery/extraction/amputation entries may supply the Physician DEX Secondary Modifier through the data-driven treatment definition.
- A later healer may attempt the same injury only with a strictly higher Physician Index than every previous healer. Any CF treatment supersedes all other treatment results; otherwise the highest SL applies.
- Grievous Injury HR is capped at Physician Index, except that its CF-table HR is a floor if higher. Untreated injuries use the treatment characteristics of their CF result.
- A Grievous CF/untreated wound is a Grim Wound. Area G4f/G5f is always grim regardless of treatment. Grim wounds schedule a Location Shock roll once per day and prevent concentration while active.
- Injury Healing Rolls occur separately every five days at HB x HR. F/CF do not heal; S reduces IL by 1; CS by 2. A CF infects an infection-eligible wound. Area and cauterised wounds expand failed-roll CF faces to 3/5/8/0.
- Infection suspends ordinary Healing Rolls for all injuries. Its initial HR is injury HR +1, maximum 5; Course Rolls occur daily. CF/F/S/CS change HR by -2/-1/+1/+2; HR <=0 kills, HR >=6 defeats infection. Infection HR 1–2/3–4/5 imposes 10/5/0 weakness fatigue.
- Blood Loss healing is an END test every ten days: S restores 1 BP, CS 2 BP; CF skips the next ten-day period. Anaemia remains 5 weakness fatigue per BP.
- Healing-stage impairment is not added to acute impairment. G is unusable; S is 10; M is 5 only at HR <=5. Eligible permanent impairment accrues 5 per full 20 days to reach Minor, maximum 25, including time spent fighting infection; only the higher permanent/indefinite penalty applies.
- Static injury healing periods are CORE. The d3+3 day random period is an explicit Random Option and is not silently enabled.


## Treatment Roll data contract — CORE (HMK pp.178, 180)

The visually verified Treatment tables are now authoritative kernel data rather than inferred from corrupted text extraction.

- All 6 aspects (Blunt, Edge, Point, Projectile, Fire, Frost), 3 severities and 4 Treatment SL results are represented: 72 result cells.
- Treatment type and difficulty are exact per table. Boxed SUR/EXT/AMP cells alone include the healer's DEX Secondary Modifier. Projectile S3 uses EXT while S2 uses CLN. Broadhead modifiers are 0/-20/-30 for M/S/G projectile treatment.
- Cell symbols are explicit state, not decoration: infection chance, permanent-impairment eligibility, bleeding, combined impairment+bleeding, Minor impairment elimination, immediate HEAL, and Frost-amputation replacement Edge injury.
- G-injury HR cap is applied with the CF HR as floor and all table effects are downgraded commensurately with the capped HR.
- Untreated injuries use their CF treatment characteristics. G CF/untreated injuries are grim; Area G4f/G5f is grim regardless of treatment.
- Grievous Frost limb/facial-feature injury may use AMP; other Grievous Frost locations have no treatment and are automatically grim.
- Treatment requirements are enforced: CLN water+bandages (and needle/thread for Serious Edge/Point, including Projectile as a Point type); EXT/SUR surgery tools; SUR/STA inherit the Clean & Dress water+bandage requirements. No unsupported surgery-tool requirement is invented for AMP.
- Treatment times are represented from p.178, including CLN 5 min per IL and WRM 2 hr.

### Serious Injury Aggravation — explicit OPTION (HMK p.182)
- Disabled by default.
- CF on an Impaired test requires an aggravation Shock SR for each Serious injury whose zone was used; plausibly aggravated Grievous injuries also check. Deliberate use of an unusable G zone is already automatic CF and therefore checks.
- Failed Shock SR lowers injury HR by 1 to minimum HR1. For untreated injuries the reduction is carried into the HR later produced by treatment.
- Serious head/torso/leg injury: half Move requires AGL every four hours; full Move and Charge every turn; Double Move is prohibited.

## RC integration invariants

- Every exported rule function is directly referenced by the deterministic test suite; indirect-only helpers are not accepted as RC coverage.
- Passive shield Deflect is a complete gate: successful Deflect prevents target injury and immediately resolves (or explicitly pends for missing WQ data) the required shield Weapon Damage check.
- Creature Poison does not own a parallel poison model. Species HR/course-period data delegates to the common p.186 Poison/Toxin `ailmentCourse`/`ailmentOutcome` contract.
- Fear/Aberrance results that accrue PSY delegate to Mental Trauma. The engine never invents the resulting psyche trait; missing trait selection is an explicit pending player/GM choice.

## Physical ailments — HMK pp.183–187
- Asphyxia: breath capacity is END rounds, or half Swimming ML when higher, extended by Will SV. Beyond half capacity produces 5 windedness on completion. After capacity, unconsciousness is immediate; death follows in half END + d10 rounds. Rescue before death uses END SL on Shock Reroll without the usual -20.
- Stranglehold is not ordinary asphyxia: a won Grab (Hold) to Head establishes it; each full maintained round requires Shock against SHK7; immediate release after UNC leaves 3d6 rounds unconsciousness.
- Shared ailment Outcome: HR5=5 weakness, HR4=10 weakness, HR3=STN, HR2=INC, HR1=UNC, HR0=dead, HR6=defeated. Outcomes replace rather than combine.
- Disease/poison Course: CF -2 HR, F -1, S +1, CS +2. Contagion tests CI x END; CF halves onset; CS improves CI by one on next exposure to same disease.
- Exposure Advance: CF -2, F -1, S no change, CS no change and skip next Advance. Exposure Healing: CF no change and skip next recovery, F no change, S +1, CS +2.
- Cold recovery uses Warming and HBx5 every 2h. Heat recovery uses Compress and HBx5 every 15m, or every 5m in cool water.
- Starvation/thirst cadence and half-ration/rest doubling are data contracts; weather/trek generation remains outside combat kernel.
- Sleep deprivation: 15 weariness per 24h without sleep, reduced to 10 by successful END SR; each full 30 sleep-deprivation fatigue creates 1 PSY, which carries 5 indefinite weakness.
- Disease non-lethal states preserve exact combat restrictions for blindness, deafness, muteness and paralysis.
- Arcane Recovery (p.183): when an arcane source grants an immediate Healing, Course, or Advance Roll, F/CF have no adverse effect; only successful results apply. This invariant is enforced for ailment Course, Exposure Advance/Healing, injury Healing, and Blood Loss Healing.

## Mental trauma — HMK pp.188–190
- Psyche Stress instances carry PSY levels and a psyche trait. Trait manifests about 10m after trauma; once manifested it gives 5 weakness per PSY.
- Repeated same trait combines PSY and raises intensity Trait -> Impulse -> Disorder. Impulse requires Will S to suppress; Disorder requires Will CS.
- Psyche Recovery is one Will test every d6 days, with no fatigue penalty: CF makes indefinite trait permanent, or raises intensity if already permanent; F no change; S -1 PSY; CS -2 PSY. Each removed PSY removes 5 associated weakness.
- Aural Shock levels combine. Each level gives 5 weakness. While any level remains, Aura/Aura-modified tests (including Fate, Spirit and Esoterica) cannot be made voluntarily and forced tests are automatic CF; new/existing attunement use is blocked.
- Aural Shock Recovery is Will daily without fatigue or impairment: CF +1 PSY, F no recovery, S -1 Aural Shock, CS -2.
- Spirits suffer soul dissolution for one day per would-be Aural Shock level and cannot act; physical incarnation is destroyed. Soul dissolution conceals True Form.
- Possession Recovery p.190 is connected to the Spirit Conflict/possession p.296–297 resolver; S/CS awaken into a real Spirit Conflict and its result terminates or restarts possession.

## RC end-to-end integration audit after checkpoint 325

The following contracts were added or tightened by whole-pipeline tests rather than isolated helper tests:

- **Persistent Injury commit:** a completed Injury Sequence is committed with a caller-supplied stable injury id; all injury-scoped timed events carry the same id. Pending sequences cannot be committed. Persistence rejects injury-scoped events whose injury id is dangling.
- **Scheduler timing:** events marked `end-turn` are not exposed as due at ordinary turn/IR activation. Failed STN recovery remains STN and schedules the required retry at the end of the next turn.
- **Delayed Morale debt:** Serious/Grievous injury Morale obligations are stored per persistent injury and remain unavailable until the associated Shock State has ended.
- **Broad projectile head (p108):** `bleeding 5` is applied as +5 virtual Effective Impact only for the Bleeding check. It never changes the actual Injury Severity/Level or Shock. The p173 Nolora/Faldrik 11p -> virtual 16p skull example is a regression test.
- **Protection Behind Hard Cover (p191):** a successful strike to a protected location is stopped before AV/Injury resolution in both melee and missile strike pipelines.
- **Charging Throw (p163):** the Charge action may attack a target at least 5 ft away, but the special charge range/impact modifier requires at least 20 ft of Charge movement.
- **Spoiled Missile Attack (p164):** EML -40 or worse surfaces the rule-dependent disposition (`action-wasted` or `automatic-fail`). Automatic failure rolls against EML05 only to determine whether the failure is CF and therefore which mishap applies.
- **Volley Precision (p164):** re-audited against source; existing d10 replacement/additional-d10 choice contract is retained unchanged.

- **Export audit:** 380/380 exports under `src` have a direct test reference in the RC 338 checkpoint.

## RC integration additions after checkpoint 338

### Mounted shared-turn lifecycle / Bestiary p.354–355
- Rider Impact earned from straight mount movement persists through the earning turn and the ensuing round; 100+ ft grants the full mount Rider Impact bonus, 50+ ft grants half.
- An unmounted defender facing both rider and mount attacks on their shared turn may Block or Counterstrike one and must Dodge the other; the pair restriction is tracked across both attacks.
- Mounted Reach penalty is data-driven: the ordinary p.172 value is 1 RCH, while creature data may override it (e.g. camel 2 RCH).
- Failed mount Stumble inflicts d10+0b to a random mount location; CF adds +5 impact. Leg-injury treatment HR modifiers are M -1, S -2, G -3.
- A rider thrown from a mount suffers d10-2b to one location (d10 ZD), +5 at Full/Double Move, and then continues through the normal Falling/Injury flow.

### Melee post-resolution integrity
- The enforced order remains Injury -> Mishaps -> Free Press -> Action TA.
- A phase with an unresolved/pending roll or decision cannot be marked complete and skipped by the caller/UI.

## RC lifecycle additions after checkpoint 345

### Creature Clench / Constrict lifecycle (Bestiary p.354)
- A successful Clench persists the exact bite location; later successful clenched bites use that same location and receive +20.
- Constrict begins only after the subsequent Grab (Hold) wins. Pinning the target's arms is a TA choice, not automatic.
- A maintained constriction calls for SHK6 (torso) or SHK7 (head) on each snake turn.
- Reaching UNC on a constriction Shock Roll does not itself cause cardiac death. A target already UNC dies on its next failed maintained-constriction Shock Roll.
- Breaking/releasing the hold ends the constriction and any arm pin.

### Extended Shock + Coma lifecycle (Healing Sequence p.179)
- Extended Shock Course Rolls recur every four hours while HR remains 1..5.
- Coma is an independent concurrent condition caused by UNC Shock Reroll CF and can outlast Extended Shock.
- Ending Extended Shock cannot wake a patient while Coma remains active.
- Coma Course intervals are separately rolled d10 days; the kernel requires that roll and never invents it.

### Infection suspension (Healing Sequence p.181)
- Active infection suppresses ordinary Injury Healing Rolls while leaving Infection Course and unrelated trauma events due.
- After infection is defeated, each suspended injury resumes on a fresh five-day Injury Healing cadence; missed rolls are not retroactively resolved.

### Blood Stoppage / Advance atomicity (p.178)
- A Blood Stoppage attempt and the bleeder's five-minute Advance slot are resolved atomically so the same period cannot generate two Blood Loss Advance Rolls.
- CF/F: advance once and bleeding continues; S: one final advance then bleeding stops; CS: bleeding stops immediately with no advance.

## RC integration additions after checkpoint 352

### Combined trauma state
- Blood Loss BP is persistent absolute state. Anaemic weakness is always `BP × 5`; Advance/Healing transitions replace that value rather than cumulatively adding it.
- New STN while already STN still escalates to INC regardless of source, as stated by the general Shock State rule on p169.
- Multi-injury impairment is applied before Difficult Movement. The printed Faldrik sequence (Move 50, 10 impairment => Effective Move 40; prone + STN => 10 ft) is an end-to-end regression.

### Central action-state gate
- `state/action-state.js` composes Shock State, Alertness, Fear, Morale, concentration and unusable-zone constraints before individual action resolvers are invoked.
- INC/UNC/KIA cannot take independent actions; STN cannot Evade or Double Move; Confused must Pass and Unaware cannot act.
- Grievous/unusable-zone use remains an automatic CF rather than being silently prohibited.

### Initiative / Shock modifier boundary
- Initiative and Shock are not Impaired tests. Injury impairment never reduces their EML.
- Fatigue applies to both; Glancing +10 and Shock Reroll -20 apply only to Shock.

### Persistence regression
- A Faldrik-style state with two Serious injuries, INC, two delayed Morale debts and an end-turn Shock Reroll survives canonical export/import without losing action legality or debt/event state.

## Action lifecycle — HMK pp.160–163, 202
- A 1-turn action starts and ends on the actor's IR in the same round.
- An N-round action starts on IR X of round R and completes immediately before IR X of round R+N; concentration is required throughout.
- While concentrating on a 1+ round action, the actor exudes no Engagement Zone and must Ignore attacks unless an aware actor abandons the action to defend normally.
- Automatic concentration blockers (including STN/INC/UNC and other p182 conditions) interrupt an in-progress commitment.
- Readied actions are limited to 1-turn Attack, Grope, or Move; readied Move is capped at Half Move. Resolution interrupts the current actor and permanently changes the readied actor's IR to the trigger IR.
- Concrete Missile Action Times (including 2/4/8-round crossbow spanning) feed directly into the generic action scheduler.
- Spell casting Time is a concentration commitment; completing spellstart does not itself resolve the spell. Spellfire is a separate 1-turn Incant action on the next IR (free-time spells are the explicit same-IR exception).

## Melee end-to-end integration invariants (RC 381)
- p165 declaration choices are frozen before the opposed Melee test: target, attacker weapon/Strike Mode/Zone Die/Zone Aim, defence, and any Block/Dodge Reach reference or Counterstrike strike declaration.
- Tactical Advantages are allocated explicitly from the actual victory stars before Injury. The kernel validates the player's choices against the outcome; it never optimises them.
- Impact and Precision allocations are available before Injury resolution. Only an actually selected Action TA creates a later Action-TA phase; Counterstrike cannot invent one because its legal TA types are Impact/Precision only.
- Post-resolution flow is derived from the actual Melee outcome, carries exact Mishap ownership and TA allocation, and preserves Injury -> Mishaps -> Free Press -> Action TA ordering for phases that exist.
- A readied interruption resolves before the interrupted turn resumes. The interrupted actor's original action is revalidated against post-interrupt state; INC/UNC/KIA or other new restrictions can prevent resumption.

## RC Injury / Bestiary integration invariants (checkpoint 393)
- Precision Step 1 is resumable after both Zone Die and Location Die player choices; the kernel rejects any location that was not actually rolled.
- Hard Cover is checked against the finally selected location before Impact/Injury.
- Metal Armour transformation precedes Compound Injury; later compounding cannot restore the original Edge/Point aspect or create an Amputation from a transformed Blunt injury.
- Same-location secondary Fire trauma (V'hir Flame) is a separate Injury Sequence. Weapon Impact TA never modifies its Fire impact, and Fire/Frost Compound compatibility excludes the simultaneous weapon-aspect injury.
- V'hir unarmed-contact Flame and Blood of Agrik never invent a location; unresolved contact locations remain explicit pending inputs.
- Dragon Breath readiness is a turn-start state: CF idles 2 rounds, F 1 round, S readies, CS readies with +5 impact. It is own-IR only and cannot be used as an Action TA.
- Dragon Breath range bands/cone width are data-driven and feed the common Area Injury resolver.


## Final audited RC — 407 tests
- Initiative Reaction Roll option is integrated into first-turn alertness rather than existing only as a settings flag.
- Oversized Target Zone d6 placement is integrated into Injury Step 1 and validates legal LN placement.
- Armour composition applies Kurbul/Plate zone thickness and Maintenance AQ before summing location AV; Quick Area AV uses resolved Thorax F-AV minus one.
- Psyche expression duration, Aural Shock astral dissolution/reembodiment, and Possession Recovery lifecycle are explicit.
- Spirit Conflict p.296 breaks tied successes but not tied failures, applies Native Soul defence, dissolution by loss stars, and connects natural-spirit victory to p.297 possession.
- Persistence stress tests preserve nested pending decisions and injury-linked timed events across repeated canonical export/import.
- Final deterministic regression: 407/407 PASS; all exports have direct test references.
