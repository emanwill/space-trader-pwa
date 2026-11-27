// Generated from reference/Strings.cs by scripts/convert-data.mjs. Do not edit.
// Space Trader for Windows 2.00 (C) 2005 Jay French et al., GPL-2.0-or-later.

// Static text. Names match the original so ported code reads the same
// (Strings.X). Arrays are mutable on purpose: the game renames the commander
// (CrewMemberNames[0]) and custom ship (ShipNames[Custom]) at runtime.
//
// The Palm OS help strings commented out at the end of Strings.cs are not ported.

export class Strings {
  static BankInsuranceButtonText = '^1 Insurance';
  static BankInsuranceButtonBuy = 'Buy';
  static BankInsuranceButtonStop = 'Stop';
  static BankLoanStatementBorrow = 'You can borrow up to ^1.';
  static BankLoanStatementDebt = 'You have a debt of ^1.';

  static ChartDistance = '^1 to ^2.';

  static CargoBuyAfford = 'You can afford to buy ^1.';
  static CargoBuyAvailable = 'The trader has ^1 for sale.';
  static CargoBuying = 'buying';
  static CargoBuyNA = 'not sold';
  static CargoBuyQuestion = 'How many do you want to ^1?';
  static CargoBuyStatement = 'At ^1 each, you can buy up to ^2.';
  static CargoBuyStatementSteal = 'Your victim has ^1 of these goods.';
  static CargoBuyStatementTrader = 'The trader wants to sell ^1 for the price of ^2 each.';
  static CargoSellDumpCost = 'It costs ^1 per unit for disposal.';
  static CargoSelling = 'selling';
  static CargoSellNA = 'no trade';
  static CargoSellPaid = 'You paid about ^1 per unit.';
  static CargoSellPaidTrader = 'You paid about ^1 per unit, and can sell ^2.';
  static CargoSellProfit = 'Your ^1 per unit is ^2';
  static CargoSellQuestion = 'How many do you want to ^1?';
  static CargoSellStatement = 'You can sell up to ^1 at ^2 each.';
  static CargoSellStatementDump = 'You can ^1 up to ^2.';
  static CargoSellStatementTrader = 'The trader wants to buy ^1 and offers ^2 each.';
  static CargoTitle = '^1 ^2';
  static CargoUnit = 'unit';

  static CopyrightChar = '\u00a9';

  static DistanceUnit = 'parsec';
  static DistanceSubunit = 'click';

  static DockFuelCost = 'A full tank costs ^1';
  static DockFuelFull = 'Your tank is full.';
  static DockFuelStatus = 'You have fuel to fly ^1.';
  static DockHullCost = 'Full repairs will cost ^1';
  static DockHullFull = 'No repairs are needed.';
  static DockHullStatus = 'Your hull strength is at ^1%.';

  static EncounterActionCmdrChased = 'The ^1 is still following you.';
  static EncounterActionCmdrHit = 'The ^1 hits you.';
  static EncounterActionCmdrMissed = 'The ^1 missed you.';
  static EncounterActionOppAttacks = 'The ^1 attacks.';
  static EncounterActionOppChased = "The ^1 didn't get away.";
  static EncounterActionOppDisabled = 'The ^1 has been disabled.';
  static EncounterActionOppFleeing = 'The ^1 is fleeing.';
  static EncounterActionOppHit = 'You hit the ^1.';
  static EncounterActionOppMissed = 'You missed the ^1.';
  static EncounterActionOppSurrender = 'The ^1 hails that they wish to surrender to you.';
  static EncounterHidePrincess = 'the Princess';
  static EncounterHideSculpture = 'the stolen sculpture';
  static EncounterHullStrength = 'Hull at ^1%';
  static EncounterPiratesDestroyed = 'destroyed';
  static EncounterPiratesDisabled = 'disabled';
  static EncounterPiratesLocation = " (informing the police of the pirate's location)";
  static EncounterPoliceSubmitArrested = 'You will be arrested!';
  static EncounterPoliceSubmitGoods = 'illegal goods';
  static EncounterPoliceSubmitReactor = 'an illegal Ion Reactor';
  static EncounterPoliceSubmitSculpture = 'a stolen sculpture';
  static EncounterPoliceSubmitWild = 'Jonathan Wild';
  static EncounterPoliceSurrenderCargo = 'You have ^1 on board! ';
  static EncounterPoliceSurrenderAction = 'They will ^1. ';
  static EncounterPoliceSurrenderReactor = 'destroy the reactor';
  static EncounterPoliceSurrenderSculpt = 'confiscate the sculpture';
  static EncounterPoliceSurrenderWild = 'arrest Wild, too';
  static EncounterPretextAlien = 'an alien';
  static EncounterPretextBottle = 'a floating';
  static EncounterPretextCaptainAhab = 'the famous Captain Ahab in a';
  static EncounterPretextCaptainConrad = 'the famous Captain Conrad in a';
  static EncounterPretextCaptainHuie = 'the famous Captain Huie in a';
  static EncounterPretextMarie = 'a drifting';
  static EncounterPretextMariePolice = 'the Customs Police in a';
  static EncounterPretextPirate = 'a pirate';
  static EncounterPretextPolice = 'a police';
  static EncounterPretextScorpion = 'the kidnappers in a';
  static EncounterPretextSpaceMonster = 'a horrifying';
  static EncounterPretextStolen = 'a stolen';
  static EncounterPretextTrader = 'a trader';
  static EncounterPrincessRescued =
    '\n' +
    '\n' +
    'You land your ship near where the Space Corps has landed with the Scorpion in tow. The Princess is revived from hibernation and you get to see her for the first time. Instead of the spoiled child you were expecting, Ziyal is possible the most beautiful woman you\'ve ever seen. "What took you so long?" she demands. You notice a twinkle in her eye, and then she smiles. Not only is she beautiful, but she\'s got a sense of humor. She says, "Thank you for freeing me. I am in your debt." With that she give you a kiss on the cheek, then leaves. You hear her mumble, "Now about a ride home."';
  static EncounterShieldStrength = 'Shields at ^1%';
  static EncounterShieldNone = 'No Shields';
  static EncounterShipCaptain = 'Captain';
  static EncounterShipMantis = 'alien ship';
  static EncounterShipPirate = 'pirate ship';
  static EncounterShipPolice = 'police ship';
  static EncounterShipTrader = 'trader ship';
  static EncounterText = 'At ^1 from ^2 you encounter ^3 ^4.';
  static EncounterTextBottle = "It appears to be a rare bottle of Captain Marmoset's Skill Tonic!";
  static EncounterTextFamousCaptain = 'The Captain requests a brief meeting with you.';
  static EncounterTextMarieCeleste = 'The Marie Celeste appears to be completely abandoned.';
  static EncounterTextOpponentAttack = 'Your opponent attacks.';
  static EncounterTextOpponentFlee = 'Your opponent is fleeing.';
  static EncounterTextOpponentIgnore = 'It ignores you.';
  static EncounterTextOpponentNoNotice = "It doesn't notice you.";
  static EncounterTextPoliceInspection = 'The police summon you to submit to an inspection.';
  static EncounterTextPolicePostMarie =
    '"We know you removed illegal goods from the Marie Celeste. You must give them up at once!"';
  static EncounterTextPoliceSurrender = 'The police hail they want you to surrender.';
  static EncounterTextTrader = 'You are hailed with an offer to trade goods.';

  static EquipmentNoneForSale = 'None for sale';
  static EquipmentNoSlots = 'No slots';
  static EquipmentFreeSlot = ' - FREE SLOT - ';

  static FileFormatBad =
    'The file is not a Space Trader for Windows file, or is the wrong version or has been corrupted.';
  static FileFutureVersion =
    'The version of the file is greater than the current version. You should upgrade to the latest version of Space Trader for Windows.';

  static HighScoreStatus = '^1 in ^2, worth ^3 on ^4 level.';

  static Mercenaries = ' mercenaries';
  static MercenariesForHire = '^1 available for hire.';
  static MercenaryFire = 'Fire';
  static MercenaryHire = 'Hire';
  static MercOnBoard = 'Member of Crew (^1)';

  static MoneyRateSuffix = '^1 daily';
  static MoneyUnit = 'credit';

  static NA = 'N/A';

  static NewsMoonForSale = 'Seller in ^1 System has Utopian Moon available.';
  static NewsShipyard = 'Shipyard in ^1 System offers to design custom ships.';
  static NewsTribbleBuyer = 'Collector in ^1 System seeks to purchase Tribbles.';

  static PersonnelNoMercenaries = 'No one for hire';
  static PersonnelNoQuarters = 'No quarters available';
  static PersonnelVacancy = 'Vacancy';

  static QuestNone = 'There are no open quests.';
  static QuestArtifact = 'Deliver the alien artifact to Professor Berger at some hi-tech system.';
  static QuestDragonflyBaratas = 'Follow the Dragonfly to Baratas.';
  static QuestDragonflyMelina = 'Follow the Dragonfly to Melina.';
  static QuestDragonflyRegulas = 'Follow the Dragonfly to Regulas.';
  static QuestDragonflyShield = 'Get your lightning shield at Zalkon.';
  static QuestDragonflyZalkon = 'Follow the Dragonfly to Zalkon.';
  static QuestExperimentInformDays = "Stop Dr. Fehler's experiment at Daled within ^1.";
  static QuestExperimentInformTomorrow = "Stop Dr. Fehler's experiment at Daled by tomorrow.";
  static QuestGemulonFuel = 'Get your fuel compactor at Gemulon.';
  static QuestGemulonInformDays = 'Inform Gemulon about alien invasion within ^1.';
  static QuestGemulonInformTomorrow = 'Inform Gemulon about alien invasion by tomorrow.';
  static QuestJarek = 'Take ambassador Jarek to Devidia.';
  static QuestJarekImpatient =
    Strings.QuestJarek +
    '\n' +
    'Jarek is wondering why the journey is taking so long, and is no longer of much help in negotiating trades.';
  static QuestJaporiDeliver = 'Deliver antidote to Japori.';
  static QuestMoon = 'Claim your moon at Utopia.';
  static QuestPrincessCentauri = 'Follow the Scorpion to Centauri.';
  static QuestPrincessInthara = 'Follow the Scorpion to Inthara.';
  static QuestPrincessQonos = 'Follow the Scorpion to Qonos.';
  static QuestPrincessQuantum = 'Get your Quantum Disruptor at Galvon.';
  static QuestPrincessReturn = 'Transport ^1 from Qonos to Galvon.';
  static QuestPrincessReturning = 'Return ^1 to Galvon.';
  static QuestPrincessReturningImpatient =
    Strings.QuestPrincessReturning +
    '\n' +
    'She is becoming anxious to arrive at home, and is no longer of any help in engineering functions.';
  static QuestReactor = 'Deliver the unstable reactor to Nix for Henry Morgan.';
  static QuestReactorFuel = 'Deliver the unstable reactor to Nix before it consumes all its fuel.';
  static QuestReactorLaser = 'Get your special laser at Nix.';
  static QuestScarabFind =
    'Find and destroy the Scarab (which is hiding at the exit to a wormhole).';
  static QuestScarabHull = 'Get your hull upgraded at ^1.';
  static QuestScarabNotify = 'Notify the authorities at ^1 that the Scarab has been destroyed.';
  static QuestSculpture = 'Deliver the stolen sculpture to Endor.';
  static QuestSculptureHiddenBays = 'Have hidden compartments installed at Endor.';
  static QuestSpaceMonsterKill = 'Kill the space monster at Acamar.';
  static QuestTribbles = 'Get rid of those pesky tribbles.';
  static QuestWild = 'Smuggle Jonathan Wild to Kravat.';
  static QuestWildImpatient =
    Strings.QuestWild +
    '\n' +
    'Wild is getting impatient, and will no longer aid your crew along the way.';

  static ShipBuyGotOne = 'got one';
  static ShipBuyTransfer = ', and transfer your unique equipment to the new ship';

  static ShipInfoEscapePod = 'Escape Pod';

  static ShipNameCurrentShip = '<current ship>';
  static ShipNameCustomShip = 'Custom Ship';
  static ShipNameModified = '<modified>';
  static ShipNameTemplateSuffixDefault = ' (Default)';
  static ShipNameTemplateSuffixMinimum = ' (Minimum)';

  static ShipyardEquipForSale = 'There is equipment for sale.';
  static ShipyardEquipNoSale = 'No equipment for sale.';
  static ShipyardPodCost = 'You can buy an escape pod for 2,000 cr.';
  static ShipyardPodIF = 'You need 2,000 cr. to buy an escape pod.';
  static ShipyardPodInstalled = 'You have an escape pod installed.';
  static ShipyardPodNoSale = 'No escape pods for sale.';
  static ShipyardShipForSale = 'There are ships for sale.';
  static ShipyardShipNoSale = 'No ships for sale.';
  static ShipyardSizeItem = '^1 (Max ^2)';
  static ShipyardTitle = 'Ship Design at ^1 Shipyards';
  static ShipyardUnit = 'Unit';
  static ShipyardWarning =
    'Bear in mind that getting too close to the maximum number of units will result in a "Crowding Penalty" due to the engineering difficulty of squeezing everything in.  There is a modest penalty at 80%, and a more severe one at 90%.';
  static ShipyardWelcome = 'Welcome to ^1 Shipyards! Our best engineer, ^2, is at your service.';

  static SpecialCargoArtifact = 'An alien artifact.';
  static SpecialCargoExperiment = 'A portable singularity.';
  static SpecialCargoJapori = '10 bays of antidote.';
  static SpecialCargoJarek = 'A haggling computer.';
  static SpecialCargoNone = 'No special items.';
  static SpecialCargoReactor = 'An unstable reactor taking up 5 bays.';
  static SpecialCargoSculpture =
    'A stolen plastic sculpture of a man holding some kind of light sword.';
  static SpecialCargoReactorBays = ' of enriched fuel.';
  static SpecialCargoTribblesInfest = 'An infestation of tribbles.';
  static SpecialCargoTribblesCute = 'cute, furry tribble';

  static TimeUnit = 'day';

  static TribbleDangerousNumber = 'a dangerous number of';

  static Unknown = 'Unknown';

  static ActivityLevels: string[] = [
    'Absent',
    'Minimal',
    'Few',
    'Some',
    'Moderate',
    'Many',
    'Abundant',
    'Swarms',
  ];

  static CargoBuyOps: string[] = ['Buy', 'Buy', 'Steal'];

  static CargoSellOps: string[] = ['Sell', 'Sell', 'Dump', 'Jettison'];

  static CrewMemberNames: string[] = [
    'Commander',
    'Alyssa',
    'Armatur',
    'Bentos',
    'C2U2',
    "Chi'Ti",
    'Crystal',
    'Dane',
    'Deirdre',
    'Doc',
    'Draco',
    'Iranda',
    'Jeremiah',
    'Jujubal',
    'Krydon',
    'Luis',
    'Mercedez',
    'Milete',
    'Muri-L',
    'Mystyc',
    'Nandi',
    'Orestes',
    'Pancho',
    'PS37',
    'Quarck',
    'Sosumi',
    'Uma',
    'Wesley',
    'Wonton',
    'Yorvick',
    'Zeethibal', // anagram for Elizabeth

    // The rest are mercenaries I added - JAF
    'Opponent', // crew of opponent mantis, pirate, police, and trader ships
    'Wild', // now earns his keep!
    'Jarek', // now earns his keep!
    'Captain', // crew of famous captain ships
    'Dragonfly', // dummy crew member used in opponent ship
    'Scarab', // dummy crew member used in opponent ship
    'SpaceMonster', // dummy crew member used in opponent ship
    'Aragorn', // My first son's middle name, and from Lord of the Rings
    'Brady', // My third son's middle name, and QB of the New England Patriots
    'Eight of Nine', // From Star Trek - Seven's younger sibling ;)
    'Fangorn', // From Lord of the Rings
    'Gagarin', // The first man in space
    'Hoshi', // From ST: Enterprise
    'Jackson', // From Stargate - and my nephew's first name
    'Kaylee', // From FireFly
    'Marcus', // My second son's middle name
    "O'Neill", // From Stargate
    'Ripley', // From the Alien series
    'Stilgar', // From Dune
    'Taggart', // From Galaxy Quest
    'Vansen', // From Space: Above and Beyond
    'Xizor', // From Star Wars: Shadows of the Empire
    'Ziyal', // From ST: Deep Space 9
    'Scorpion', // dummy crew member used in opponent ship
  ];

  static DifficultyLevels: string[] = ['Beginner', 'Easy', 'Normal', 'Hard', 'Impossible'];

  static EquipmentDescriptions: string[][] = [
    [
      "The Pulse Laser is the weakest weapon available. It's small size allows only enough energy to build up to emit pulses of light.",
      'The Beam Laser is larger than the Pulse Laser, so can build up enough charge to power what are essentially two Pulse Lasers. The resulting effect appears more like a constant beam.',
      'The Military Laser is the largest commecially available weapon. It can build up enough charge to power three Pulse Lasers in series, resulting in a more dense and concentrated beam.',
      "Morgan's Laser has been constructed from a Beam Laser, which has been attached to an Ion Reactor that builds up an immense charge, resulting in the strongest weapon known to exist.",
      "The Photon Disruptor is a relatively weak weapon, but has the ability to disable an opponent's electrical systems, rendering them helpless.",
      "The Quantum Disruptor is a very powerful disabling weapon. Once an opponent's sheilds are down it will usually require only a single shot with the Quantum Disruptor to disable them.",
    ],
    [
      'The Energy Shield is a very basic deflector shield. Its operating principle is to absorb the energy directed at it.',
      'The Reflective Shield is twice as powerful as the Energy Shield. It works by reflecting the energy directed at it instead of absorbing that energy.',
      'The Lightning Shield is the most powerful shield known to exist. It features a Reflective Shield operating on a rotating frequency, which causes what looks like lightning to play across the shield barrier.',
    ],
    [
      'Extra Cargo Bays to store anything your ship can take on as cargo.',
      'The Auto-Repair System works to reduce the damage your ship sustains in battle, and repairs some damage in between encounters. It also boosts all other engineering functions.',
      'The Navigating System increases the overall Pilot skill of the ship, making it harder to hit in battle, and making it easier to flee an encounter.',
      'The Targeting System increases the overall Fighter skill of the ship, which increases the amount of damage done to an opponent in battle.',
      'The Cloaking Device can enable your ship to evade detection by an opponent, but only if the Engineer skill of your ship is greater than that of your opponent. It also makes your ship harder to hit in battle.',
      'The Fuel Compactor that you got as a reward for warning Gemulon of the invasion will increase the range of your ship by 3 parsecs.',
      'These extra bays will not be detected during routine police searches. They may be detected if you are arrested and the police perform a more thorough search.',
    ],
  ];

  static EquipmentTypes: string[] = ['Weapon', 'Shield', 'Gadget'];

  static GadgetNames: string[] = [
    '5 Extra Cargo Bays',
    'Auto-Repair System',
    'Navigating System',
    'Targeting System',
    'Cloaking Device',
    'Fuel Compactor',
    '5 Hidden Cargo Bays',
  ];

  static GameCompletionTypes: string[] = ['Was killed', 'Retired', 'Claimed moon'];

  static ListStrings: string[] = ['', '^1', '^1 and ^2', '^1, ^2, and ^3', '^1, ^2, ^3, and ^4'];

  /* In News Events, the following variables can be used:
   * ^1 Commander Name
   * ^2 Current System
   * ^3 Commander's Ship Type
   */
  static NewsEvent: string[] = [
    'Scientist Adds Alien Artifact to Museum Collection.',
    'Police Trace Orbiting Space Litter to ^1.',
    'Experimental Craft Stolen! Critics Demand Security Review.',
    'Investigators Report Strange Craft.',
    'Spectacular Display as Stolen Ship Destroyed in Fierce Space Battle.',
    'Rumors Continue: Melina Orbitted by Odd Starcraft.',
    'Strange Ship Observed in Regulas Orbit.',
    'Unidentified Ship: A Threat to Zalkon?',
    'Huge Explosion Reported at Research Facility.',
    'Travelers Report Timespace Damage, Warp Problems!',
    'Scientists Cancel High-profile Test! Committee to Investigate Design.',
    'Travelers Claim Sighting of Ship Materializing in Orbit!',
    'Editorial: Who Will Warn Gemulon?',
    'Alien Invasion Devastates Planet!',
    'Invasion Imminent! Plans in Place to Repel Hostile Invaders.',
    'Thug Assaults Captain Ahab!',
    "Destruction of Captain Ahab's Ship Causes Anger!",
    'Captain Conrad Comes Under Attack By Criminal!',
    "Captain Conrad's Ship Destroyed by Villain!",
    'Famed Captain Huie Attacked by Brigand!',
    "Citizens Mourn Destruction of Captain Huie's Ship!",
    'Editorial: We Must Help Japori!',
    'Disease Antidotes Arrive! Health Officials Optimistic.',
    'Ambassador Jarek Returns from Crisis.',
    'Security Scandal: Test Craft Confirmed Stolen.',
    'Wormhole Traffic Delayed as Stolen Craft Destroyed.',
    'Wormhole Travelers Harassed by Unusual Ship!',
    'Space Monster Threatens Homeworld!',
    'Hero Slays Space Monster! Parade, Honors Planned for Today.',
    'Notorious Criminal Jonathan Wild Arrested!',
    'Rumors Suggest Known Criminal J. Wild May Come to Kravat!',
    "Priceless collector's item stolen from home of Geurge Locas!",
    'Space Corps follows ^3 with alleged stolen sculpture to ^2.',
    'Member of Royal Family kidnapped!',
    'Aggressive Ship Seen in Orbit Around Centauri',
    'Dangerous Scorpion Damages Several Other Ships Near Inthara',
    'Kidnappers Holding Out at Qonos',
    'Scorpion Defeated! Kidnapped Member of Galvon Royal Family Freed!',
    'Beloved Royal Returns Home!',
  ];

  static NewsHeadlines: string[][] = [
    [
      'Riots, Looting Mar Factional Negotiations.',
      'Communities Seek Consensus.',
      'Successful Bakunin Day Rally!',
      'Major Faction Conflict Expected for the Weekend!',
    ],
    [
      'Editorial: Taxes Too High!',
      'Market Indices Read Record Levels!',
      'Corporate Profits Up!',
      'Restrictions on Corporate Freedom Abolished by Courts!',
    ],
    [
      'Party Reports Productivity Increase.',
      'Counter-Revolutionary Bureaucrats Purged from Party!',
      'Party: Bold New Future Predicted!',
      'Politburo Approves New 5-Year Plan!',
    ],
    [
      'States Dispute Natural Resource Rights!',
      'States Denied Federal Funds over Local Laws!',
      'Southern States Resist Federal Taxation for Capital Projects!',
      'States Request Federal Intervention in Citrus Conflict!',
    ],
    [
      'Robot Shortages Predicted for Q4.',
      'Profitable Quarter Predicted.',
      'CEO: Corporate Rebranding Progressing.',
      'Advertising Budgets to Increase.',
    ],
    [
      'Olympics: Software Beats Wetware in All Events!',
      'New Network Protocols To Be Deployed.',
      'Storage Banks to be Upgraded!',
      'System Backup Rescheduled.',
    ],
    [
      'Local Elections on Schedule!',
      'Polls: Voter Satisfaction High!',
      'Campaign Spending Aids Economy!',
      'Police, Politicians Vow Improvements.',
    ],
    [
      'New Palace Planned; Taxes Increase.',
      'Future Presents More Opportunities for Sacrifice!',
      'Insurrection Crushed: Rebels Executed!',
      'Police Powers to Increase!',
    ],
    [
      'Drug Smugglers Sentenced to Death!',
      'Aliens Required to Carry Visible Identification at All Times!',
      'Foreign Sabotage Suspected.',
      'Stricter Immigration Laws Installed.',
    ],
    [
      "Farmers Drafted to Defend Lord's Castle!",
      'Report: Kingdoms Near Flashpoint!',
      'Baron Ignores Ultimatum!',
      'War of Succession Threatens!',
    ],
    [
      'Court-Martials Up 2% This Year.',
      'Editorial: Why Wait to Invade?',
      'HQ: Invasion Plans Reviewed.',
      'Weapons Research Increases Kill-Ratio!',
    ],
    [
      'King to Attend Celebrations.',
      "Queen's Birthday Celebration Ends in Riots!",
      'King Commissions New Artworks.',
      'Prince Exiled for Palace Plot!',
    ],
    [
      'Dialog Averts Eastern Conflict!',
      'Universal Peace: Is it Possible?',
      'Editorial: Life in Harmony.',
      'Polls: Happiness Quotient High!',
    ],
    [
      'Government Promises Increased Welfare Benefits!',
      'State Denies Food Rationing Required to Prevent Famine.',
      "'Welfare Actually Boosts Economy,' Minister Says.",
      'Hoarder Lynched by Angry Mob!',
    ],
    ['Millions at Peace.', 'Sun Rises.', 'Countless Hearts Awaken.', 'Serenity Reigns.'],
    [
      'New Processor Hits 10 ZettaHerz!',
      'Nanobot Output Exceeds Expectation.',
      'Last Human Judge Retires.',
      'Software Bug Causes Mass Confusion.',
    ],
    [
      'High Priest to Hold Special Services.',
      'Temple Restoration Fund at 81%.',
      'Sacred Texts on Public Display.',
      'Dozen Blasphemers Excommunicated!',
    ],
  ];

  static NewsMastheads: string[][] = [
    ['The ^1 Arsenal', 'The Grassroot', 'Kick It!'],
    ['The Objectivist', 'The ^1 Market', 'The Invisible Hand'],
    ['The Daily Worker', "The People's Voice", 'The ^1 Proletariat'],
    ['Planet News', 'The ^1 Times', 'Interstate Update'],
    ['^1 Memo', 'News From The Board', 'Status Report'],
    ['Pulses', 'Binary Stream', 'The System Clock'],
    ['The Daily Planet', 'The ^1 Majority', 'Unanimity'],
    ['The Command', "Leader's Voice", 'The ^1 Mandate'],
    ['State Tribune', 'Motherland News', 'Homeland Report'],
    ['News from the Keep', 'The Town Crier', 'The ^1 Herald'],
    ['General Report', '^1 Dispatch', 'The ^1 Sentry'],
    ['Royal Times', 'The Loyal Subject', 'The Fanfare'],
    ['Pax Humani', 'Principle', 'The ^1 Chorus'],
    ['All for One', 'Brotherhood', "The People's Syndicate"],
    ['The Daily Koan', 'Haiku', 'One Hand Clapping'],
    ['The Future', 'Hardware Dispatch', 'TechNews'],
    ['The Spiritual Advisor', 'Church Tidings', 'The Temple Tribune'],
  ];

  static NewsPoliceRecordHero: string[] = [
    'Locals Welcome Visiting Hero ^1!',
    'Famed Hero ^1 to Visit System!',
    'Large Turnout At Spaceport to Welcome ^1!',
  ];

  static NewsPoliceRecordPsychopath: string[] = [
    'Police Warning: ^1 Will Dock At ^2!',
    'Notorious Criminal ^1 Sighted in ^2!',
    'Locals Rally to Deny Spaceport Access to ^1!',
    'Terror Strikes Locals on Arrival of ^1!',
  ];

  static NewsPressureExternal: string[] = [
    'Reports of ^1 in the ^2 System.',
    'News of ^1 in the ^2 System.',
    'New Rumors of ^1 in the ^2 System.',
    'Sources report ^1 in the ^2 System.',
    'Notice: ^1 in the ^2 System.',
    'Evidence Suggests ^1 in the ^2 System.',
  ];

  static NewsPressureExternalPressures: string[] = [
    '',
    'Strife and War',
    'Plague Outbreaks',
    'Severe Drought',
    'Terrible Boredom',
    'Cold Weather',
    'Crop Failures',
    'Labor Shortages',
  ];

  static NewsPressureInternal: string[] = [
    '',
    'War News: Offensives Continue!',
    'Plague Spreads! Outlook Grim.',
    'No Rain in Sight!',
    "Editors: Won't Someone Entertain Us?",
    'Cold Snap Continues!',
    'Serious Crop Failure! Must We Ration?',
    'Jobless Rate at All-Time Low!',
  ];

  static PoliceRecordNames: string[] = [
    'Psychopath',
    'Villain',
    'Criminal',
    'Crook',
    'Dubious',
    'Clean',
    'Lawful',
    'Trusted',
    'Liked',
    'Hero',
  ];

  static PoliticalSystemNames: string[] = [
    'Anarchy',
    'Capitalist State',
    'Communist State',
    'Confederacy',
    'Corporate State',
    'Cybernetic State',
    'Democracy',
    'Dictatorship',
    'Fascist State',
    'Feudal State',
    'Military State',
    'Monarchy',
    'Pacifist State',
    'Socialist State',
    'State of Satori',
    'Technocracy',
    'Theocracy',
  ];

  static ReputationNames: string[] = [
    'Harmless',
    'Mostly harmless',
    'Poor',
    'Average',
    'Above average',
    'Competent',
    'Dangerous',
    'Deadly',
    'Elite',
  ];

  static ShieldNames: string[] = ['Energy Shield', 'Reflective Shield', 'Lightning Shield'];

  static ShipNames: string[] = [
    'Flea',
    'Gnat',
    'Firefly',
    'Mosquito',
    'Bumblebee',
    'Beetle',
    'Hornet',
    'Grasshopper',
    'Termite',
    'Wasp',
    'Space Monster',
    'Dragonfly',
    'Mantis',
    'Scarab',
    'Bottle',
    Strings.ShipNameCustomShip,
    'Scorpion',
  ];

  static ShipyardEngineers: string[] = ['Wedge', 'Luke', 'Lando', 'Mara', 'Obi-Wan'];

  static ShipyardNames: string[] = [
    'Corellian Engineering',
    'Incom Corporation',
    'Kuat Drive Yards',
    'Sienar Fleet Systems',
    'Sorosuub Engineering',
  ];

  static ShipyardSkillDescriptions: string[] = [
    'All ships constructed at this shipyard use 2 fewer units per crew quarter.',
    'All ships constructed at this shipyard have 2 extra base fuel tanks.',
    'All ships constructed at this shipyard have the hull points increment by 5 more than usual.',
    'All ships constructed at this shipyard get shield slots for 2 fewer units.',
    'All ships constructed at this shipyard get weapon slots for 2 fewer units.',
  ];

  static ShipyardSkills: string[] = [
    'Crew Quartering',
    'Fuel Efficienty',
    'Hull Strength',
    'Shielding',
    'Weaponry',
  ];

  static Sizes: string[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

  static SpecialEventStrings: string[] = [
    'This alien artifact should be delivered to professor Berger, who is currently traveling. You can probably find him at a hi-tech solar system. The alien race which produced this artifact seems keen on getting it back, however, and may hinder the carrier. Are you, for a price, willing to deliver it?',
    "This is professor Berger. I thank you for delivering the alien artifact to me. I hope the aliens weren't too much of a nuisance. I have transferred 20000 credits to your account, which I assume compensates for your troubles.",
    'A trader in second-hand goods offers you 3 sealed cargo canisters for the sum of 1000 credits. It could be a good deal: they could contain robots. Then again, it might just be water. Do you want the canisters?',
    'This is Colonel Jackson of the Space Corps. An experimental ship, code-named "Dragonfly", has been stolen. It is equipped with very special, almost indestructible shields. It shouldn\'t fall into the wrong hands and we will reward you if you destroy it. It has been last seen in the Baratas system.',
    'A small ship of a weird design docked here recently for repairs. The engineer who worked on it said that it had a weak hull, but incredibly strong shields. I heard it took off in the direction of the Melina system.',
    "Hello, Commander. This is Colonel Jackson again. On behalf of the Space Corps, I thank you for your valuable assistance in destroying the Dragonfly. As a reward, we will install one of the experimental shields on your ship. Return here for that when you're ready.",
    'A ship with shields that seemed to be like lightning recently fought many other ships in our system. I have never seen anything like it before. After it left, I heard it went to the Regulas system.',
    'A small ship with shields like I have never seen before was here a few days ago. It destroyed at least ten police ships! Last thing I heard was that it went to the Zalkon system.',
    'Colonel Jackson here. Do you want us to install a lightning shield on your current ship?',
    'A hacker conveys to you that he has cracked the passwords to the galaxy-wide police computer network, and that he can erase your police record for the sum of 5000 credits. Do you want him to do that?',
    "While reviewing the plans for Dr. Fehler's new space-warping drive, Dr. Lowenstam discovered a critical error. If you don't go to Daled and stop the experiment within ten days, the time-space continuum itself could be damaged!",
    "Dr. Fehler can't understand why the experiment failed. But the failure has had a dramatic and disastrous effect on the fabric of space-time itself. It seems that Dr. Fehler won't be getting tenure any time soon... and you may have trouble when you warp!",
    'Upon your warning, Dr. Fehler calls off the experiment. As your  reward, you are given a Portable Singularity. This device will, for one time only, instantaneously transport you to any system in the galaxy. The Singularity can be accessed  by clicking the "J" (Jump) button on the Galactic Chart.',
    "We received word that aliens will invade Gemulon seven days from now. We know exactly at which coordinates they will arrive, but we can't warn Gemulon because an ion storm disturbs all forms of communication. We need someone, anyone, to deliver this info to Gemulon within six days.",
    'Do you wish us to install the fuel compactor on your current ship? (You need a free gadget slot)',
    'Alas, Gemulon has been invaded by aliens, which has thrown us back to pre-agricultural times. If only we had known the exact coordinates where they first arrived at our system, we might have prevented this tragedy from happening.',
    'This information of the arrival of the alien invasion force allows us to prepare a defense. You have saved our way of life. As a reward, we have a fuel compactor gadget for you, which will increase the travel distance by 3 parsecs for any ship. Return here to get it installed.',
    'A strange disease has invaded the Japori system. We would like you to deliver these ten canisters of special antidote to Japori. Note that, if you accept, ten of your cargo bays will remain in use on your way to Japori. Do you accept this mission?',
    "Thank you for delivering the medicine to us. We don't have any money to reward you, but we do have an alien fast-learning machine with which we will increase your skills.",
    'A recent change in the political climate of this solar system has forced Ambassador Jarek to flee back to his home system, Devidia. Would you be willing to give him a lift?',
    'Ambassador Jarek is very grateful to you for delivering him back to Devidia. As a reward, he gives you an experimental handheld haggling computer, which allows you to gain larger discounts when purchasing goods and equipment.',
    'You are lucky! While docking on the space port, you receive a message that you won 1000 credits in a lottery. The prize had been added to your account.',
    'There is a small but habitable moon for sale in the Utopia system, for the very reasonable sum of half a million credits. If you accept it, you can retire to it and live a peaceful, happy, and wealthy life. Do you wish to buy it?',
    'Welcome to the Utopia system. Your own moon is available for you to retire to it, if you feel inclined to do that. Are you ready to retire and lead a happy, peaceful, and wealthy life?',
    "Galactic criminal Henry Morgan wants this illegal ion reactor delivered to Nix. It's a very dangerous mission! The reactor and its fuel are bulky, taking up 15 bays. Worse, it's not stable -- its resonant energy will weaken your shields and hull strength while it's aboard your ship. Are you willing to deliver it?",
    'Henry Morgan takes delivery of the reactor with great glee. His men immediately set about stabilizing the fuel system. As a reward, Morgan offers you a special, high-powered laser that he designed. Return with an empty weapon slot when you want them to install it.',
    "Morgan's technicians are standing by with something that looks a lot like a military laser -- if you ignore the additional cooling vents and anodized ducts. Do you want them to install Morgan's special laser?",
    "Captain Renwick developed a new organic hull material for his ship which cannot be damaged except by Pulse lasers. While he was celebrating this success, pirates boarded and stole the craft, which they have named the Scarab. Rumors suggest it's being hidden at the exit to a wormhole. Destroy the ship for a reward!",
    "Space Corps is indebted to you for destroying the Scarab and the pirates who stole it. As a reward, we can have Captain Renwick upgrade the hull of your ship. Note that his upgrades won't be transferable if you buy a new ship! Come back with the ship you wish to upgrade.",
    "The organic hull used in the Scarab is still not ready for day-to-day use. But Captain Renwick can certainly upgrade your hull with some of his retrofit technology. It's light stuff, and won't reduce your ship's range. Should he upgrade your ship?",
    "An alien with a fast-learning machine offers to increase one of your skills for the reasonable sum of 3000 credits. You won't be able to pick that skill, though. Do you accept his offer?",
    "A space monster has invaded the Acamar system and is disturbing the trade routes. You'll be rewarded handsomely if you manage to destroy it.",
    'We thank you for destroying the space monster that circled our system for so long. Please accept 15000 credits as reward for your heroic deed.',
    'A merchant prince offers you a very special and wondrous item for the sum of 1000 credits. Do you accept?',
    'An eccentric alien billionaire wants to buy your collection of tribbles and offers half a credit for each of them. Do you accept his offer?',
    "Law Enforcement is closing in on notorious criminal kingpin Jonathan Wild. He would reward you handsomely for smuggling him home to Kravat. You'd have to avoid capture by the Police on the way. Are you willing to give him a berth?",
    'Jonathan Wild is most grateful to you for spiriting him to safety. As a reward, he has one of his Cyber Criminals hack into the Police Database, and clean up your record. He also offers you the opportunity to take his talented nephew Zeethibal along as a Mercenary with no pay.',
    "A hooded figure approaches you and asks if you'd be willing to deliver some recently aquired merchandise to Endor. He's holding a small sculpture of a man holding some kind of light sword that you strongly suspect was stolen. It appears to be made of plastic and not very valuable. \"I'll pay you 2,000 credits now, plus 15,000 on delivery,\" the figure says. After seeing the look on your face he adds, \"It's a collector's item. Will you deliver it or not?\"",
    'Yet another dark, hooded figure approaches. "Do you have the action fig- umm, the sculpture?" You hand it over and hear what sounds very much like a giggle from under the hood. "I know you were promised 15,000 credits on delivery, but I\'m strapped for cash right now. However, I have something better for you. I have an acquaintance who can install hidden compartments in your ship." Return with an empty gadget slot when you\'re ready to have it installed.',
    "You're taken to a warehouse and whisked through the door. A grubby alien of some humanoid species - you're not sure which one - approaches. \"So you're the being who needs Hidden Compartments. Should I install them in your ship?\" (It requires a free gadget slot.)",
    "A member of the Royal Family of Galvon has been kidnapped! Princess Ziyal was abducted by men while travelling across the planet. They escaped in a hi-tech ship called the Scorpion. Please rescue her! (You'll need to equip your ship with disruptors to be able to defeat the Scorpion without destroying it.) A ship bristling with weapons was blasting out of the system. It's trajectory before going to warp indicates that its destination was Centauri.",
    'A ship had its shields upgraded to Lighting Shields just two days ago. A shipyard worker overheard one of the crew saying they were headed to Inthara.',
    "Just yesterday a ship was seen in docking bay 327. A trader sold goods to a member of the crew, who was a native of Qonos. It's possible that's where they were going next.",
    "The Galvonian Ambassador to Qonos approaches you. The Princess needs a ride home. Will you take her? I don't think she'll feel safe with anyone else.",
    "His Majesty's Shipyard: Do you want us to install a quantum disruptor on your current ship?",
    'The King and Queen are extremely grateful to you for returning their daughter to them. The King says, "Ziyal is priceless to us, but we feel we must offer you something as a reward. Visit my shipyard captain and he\'ll install one of our new Quantum Disruptors."',
  ];

  static SpecialEventTitles: string[] = [
    'Alien Artifact',
    'Artifact Delivery',
    'Cargo For Sale',
    'Dragonfly',
    'Dragonfly Destroyed',
    'Weird Ship',
    'Lightning Ship',
    'Lightning Shield',
    'Strange Ship',
    'Erase Record',
    'Dangerous Experiment',
    'Experiment Failed',
    'Disaster Averted',
    'Alien Invasion',
    'Fuel Compactor',
    'Gemulon Invaded',
    'Gemulon Rescued',
    'Japori Disease',
    'Medicine Delivery',
    'Ambassador Jarek',
    'Jarek Gets Out',
    'Lottery Winner',
    'Moon For Sale',
    'Retirement',
    "Morgan's Reactor",
    'Reactor Delivered',
    "Install Morgan's Laser",
    'Scarab Stolen',
    'Scarab Destroyed',
    'Upgrade Hull',
    'Skill Increase',
    'Space Monster',
    'Monster Killed',
    'Merchant Prince',
    'Tribble Buyer',
    'Jonathan Wild',
    'Wild Gets Out',
    'Stolen Sculpture',
    'Sculpture Delivered',
    'Install Hidden Compartments',
    'Kidnapped',
    'Aggressive Ship',
    'Dangerous Scorpion',
    'Royal Rescue',
    'Quantum Disruptor',
    'Royal Return',
  ];

  static SpecialResources: string[] = [
    'Nothing Special',
    'Mineral Rich',
    'Mineral Poor',
    'Desert',
    'Sweetwater Oceans',
    'Rich Soil',
    'Poor Soil',
    'Rich Fauna',
    'Lifeless',
    'Weird Mushrooms',
    'Special Herbs',
    'Artistic Populace',
    'Warlike Populace',
  ];

  // *************************************************************************
  // Many of these names are from Star Trek: The Next Generation, or are small changes
  // to names of this series. A few have different origins.
  // JAF - Except where noted these comments are the previous author's.
  // *************************************************************************
  static SystemNames: string[] = [
    'Acamar', // JAF - TNG "The Vengeance Factor (Acamar III)"
    'Adahn', // The alternate personality for The Nameless One in "Planescape: Torment"
    'Aldea', // JAF - TNG "When the Bough Breaks"
    'Andevian', // JAF - ST Andoria?
    'Antedi', // JAF - TNG "Manhunt" (Antede III)
    'Balosnee',
    'Baratas', // JAF - TNG "The Emissary" (Barradas III)
    'Brax', // One of the heroes in Master of Magic
    'Bretel', // This is a Dutch device for keeping your pants up.
    'Calondia', // JAF - TNG "The Price" (Caldonia)
    'Campor', // JAF - TNG "Bloodlines" (Camor V) or DS9 "Defiant" (Campa III)
    'Capelle', // The city I lived in while programming this game
    'Carzon', // JAF - Character from DS9 (Kurzon)?
    'Castor', // A Greek demi-god
    'Cestus', // JAF - several ST episodes (Cestus III)
    'Cheron', // JAF - TOS "Let That Be Your Last Battlefield"
    'Courteney', // After Courteney Cox...
    'Daled', // JAF - TNG "The Dauphin" (Daled IV)
    'Damast',
    'Davlos', // JAF - DS9 "Time's Orphan" (Davlos Prime) or DS9 "Visionary" (Davlos III)
    'Deneb', // JAF - TOS "Wolf in the Fold" (Deneb II) or TOS "Where No Man Has Gone Before" and TNG "Encounter at Farpoint" (Deneb IV)
    'Deneva', // JAF - TOS "Operation -- Annihilate!"
    'Devidia', // JAF - TNG "Time's Arrow" (Devidia II)
    'Draylon', // JAF - DS9 "Sanctuary" (Draylon II)
    'Drema', // JAF - TNG "Pen Pals" (Drema IV)
    'Endor', // JAF - From Return of the Jedi
    'Esmee', // One of the witches in Pratchett's Discworld
    'Exo', // JAF - TOS "What Are Little Girls Made Of?" (Exo III)
    'Ferris', // Iron
    'Festen', // A great Scandinavian movie
    'Fourmi', // An ant, in French
    'Frolix', // A solar system in one of Philip K. Dick's novels
    'Gemulon', // JAF - TNG "Final Mission" (Gamalon V) or DS9 "Paradise" (Germulon V)
    'Guinifer', // One way of writing the name of king Arthur's wife
    'Hades', // The underworld
    'Hamlet', // From Shakespeare
    'Helena', // Of Troy
    'Hulst', // A Dutch plant
    'Iodine', // An element
    'Iralius',
    'Janus', // A seldom encountered Dutch boy's name
    'Japori', // JAF - DS9 "Improbable Cause" (Jaforay II)?
    'Jarada', // JAF - DS9 "Progress" (Jarido)?
    'Jason', // A Greek hero
    'Kaylon', // JAF - TNG "Half a Life" (Kalon II)
    'Khefka', // JAF - DS9 "Invasive Procedures" (Kafka IV)
    'Kira', // My dog's name
    'Klaatu', // From a classic SF movie
    'Klaestron', // JAF - DS9 "Dax" (Klaestron IV)
    'Korma', // An Indian sauce
    'Kravat', // Interesting spelling of the French word for "tie"
    'Krios', // JAF - TNG "The Mind's Eye"
    'Laertes', // A king in a Greek tragedy
    'Largo', // JAF - DS9 "Babel" (Largo V)
    'Lave', // The starting system in Elite
    'Ligon', // JAF - TNG "Code of Honor" (Ligon II)
    'Lowry', // The name of the "hero" in Terry Gilliam's "Brazil"
    'Magrat', // The second of the witches in Pratchett's Discworld
    'Malcoria', // JAF - "Star Trek: First Contact" (Malkor III)?
    'Melina', // JAF - TNG "Silicon Avatar" (Malona IV)?
    'Mentar', // The Psilon home system in Master of Orion
    'Merik', // JAF - TOS "The Cloud Minders" (Merak II)
    'Mintaka', // JAF - TNG "Who Watches the Watchers" (Mintaka III)
    'Montor', // A city in Ultima III and Ultima VII part 2
    'Mordan', // JAF - TNG "Too Short a Season" (Mordan IV)
    'Myrthe', // The name of my daughter
    'Nelvana', // JAF - TNG "The Defector" (Nelvana III)
    'Nix', // An interesting spelling of a word meaning "nothing" in Dutch
    'Nyle', // An interesting spelling of the great river
    'Odet',
    'Og', // The last of the witches in Pratchett's Discworld
    'Omega', // The end of it all
    'Omphalos', // Greek for navel
    'Orias',
    'Othello', // From Shakespeare
    'Parade', // This word means the same in Dutch and in English
    'Penthara', // JAF - TNG "A Matter of Time" (Penthara IV)
    'Picard', // The enigmatic captain from ST:TNG
    'Pollux', // Brother of Castor
    'Quator', // JAF - TNG "Unification: Part I" (Qualar II)?
    'Rakhar', // JAF - DS9 "Vortex"
    'Ran', // A film by Akira Kurosawa
    'Regulas', // JAF - "Star Trek II: The Wrath of Khan" (Regula) or DS9 "Fascination" (Regulus III) or TOS "Amok Time" (Regulus V)
    'Relva', // JAF - TNG "Coming of Age" (Relva VII)
    'Rhymus',
    'Rochani', // JAF - DS9 "Dramatis Personae" (Rochanie III)
    'Rubicum', // The river Ceasar crossed to get into Rome
    'Rutia', // JAF - TNG "The High Ground" (Ruteeya IV)
    'Sarpeidon', // JAF - DS9 "Tacking into the Wind" (Sarpeidon V) or TOS "All Our Yesterdays" (Sarpeidon)
    'Sefalla',
    'Seltrice',
    'Sigma',
    'Sol', // That's our own solar system
    'Somari',
    'Stakoron',
    'Styris', // JAF - TNG "Code of Honor" (Styrus IV)
    'Talani', // JAF - DS9 "Armageddon Game" (T'Lani III and T'Lani Prime)
    'Tamus',
    'Tantalos', // A king from a Greek tragedy
    'Tanuga',
    'Tarchannen',
    'Terosa', // JAF - DS9 "Second Sight" (Terosa Prime)
    'Thera', // A seldom encountered Dutch girl's name
    'Titan', // The largest moon of Jupiter
    'Torin', // A hero from Master of Magic
    'Triacus', // JAF - TOS "And the Children Shall Lead"
    'Turkana', // JAF - TNG "Legacy" (Turkana IV)
    'Tyrus',
    'Umberlee', // A god from AD&D, which has a prominent role in Baldur's Gate
    'Utopia', // The ultimate goal
    'Vadera',
    'Vagra', // JAF - TNG "Skin of Evil" (Vagra II)
    'Vandor', // JAF - TNG "We'll Always Have Paris" (Vando VI)?
    'Ventax', // JAF - TNG "Devil's Due" (Ventax II)
    'Xenon',
    'Xerxes', // A Greek hero
    'Yew', // A city which is in almost all of the Ultima games
    'Yojimbo', // A film by Akira Kurosawa
    'Zalkon', // TNG "Transfigurations" (Zalcon)
    'Zuul', // From the first Ghostbusters movie

    // The rest are systems I added - JAF
    'Centauri', // As in Alpha Centauri - the closest star outside our solar system
    'Galvon', // Star Trek: The Next Generation "Data's Day"
    'Inthara', // Star Trek: Voyager "Retrospect"
    'Meridian', // Star Trek: Deep Space Nine "Meridian"
    'Qonos', // Star Trek - Klinon Homeworld (QonoS - Kronos)
    'Rae', // My wife's middle name
    'Weytahn', // Star Trek: Enterprise "Cease Fire"
    'Zonama', // From the Star Wars: New Jedi Order series (and Rogue Planet)
  ];

  static SystemPressures: string[] = [
    'under no particular pressure', // Uneventful
    'at war', // Ore and Weapons in demand
    'ravaged by a plague', // Medicine in demand
    'suffering from a drought', // Water in demand
    'suffering from extreme boredom', // Games and Narcotics in demand
    'suffering from a cold spell', // Furs in demand
    'suffering from a crop failure', // Food in demand
    'lacking enough workers', // Machinery and Robots in demand
  ];

  static TechLevelNames: string[] = [
    'Pre-Agricultural',
    'Agricultural',
    'Medieval',
    'Renaissance',
    'Early Industrial',
    'Industrial',
    'Post-Industrial',
    'Hi-Tech',
  ];

  static TradeItemNames: string[] = [
    'Water',
    'Furs',
    'Food',
    'Ore',
    'Games',
    'Firearms',
    'Medicine',
    'Machines',
    'Narcotics',
    'Robots',
  ];

  static VeryRareEncounters: string[] = [
    'Marie Celeste',
    'Captain Ahab',
    'Captain Conrad',
    'Captain Huie',
    'Dated Tonic',
    'Good Tonic',
  ];

  static WeaponNames: string[] = [
    'Pulse Laser',
    'Beam Laser',
    'Military Laser',
    "Morgan's Laser",
    'Photon Disruptor',
    'Quantum Disruptor',
  ];
}
