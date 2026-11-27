// Generated from reference/Form_Alert.cs (FormAlert.Alert) by scripts/convert-data.mjs. Do not edit.
// Space Trader for Windows 2.00 (C) 2005 Jay French et al., GPL-2.0-or-later.

import { AlertType } from './enums';

// Result of a dialog button, as in WinForms DialogResult.
export enum DialogResult {
  None = 0,
  OK = 1,
  Cancel = 2,
  Yes = 6,
  No = 7,
}

// Full-screen images some alerts show instead of text and buttons.
export enum AlertImage {
  Splash,
  GameEndKilled,
  GameEndRetired,
  GameEndBoughtMoon,
  GameEndBoughtMoonGirl,
}

export interface AlertButton {
  text: string;
  result: DialogResult;
}

// Title and message may contain ^1, ^2, ^3 placeholders (see stringVars).
export type AlertDef =
  | { title: string; message: string; buttons: [AlertButton] | [AlertButton, AlertButton] }
  | { title: string; image: AlertImage };

export const Alerts: Record<AlertType, AlertDef> = {
  [AlertType.Alert]: {
    title: '^1',
    message: '^2',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.AntidoteOnBoard]: {
    title: 'Antidote',
    message: 'Ten of your cargo bays now contain antidote for the Japori system.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.AntidoteDestroyed]: {
    title: 'Antidote Destroyed',
    message:
      'The antidote for the Japori system has been destroyed with your ship. You should return to ^1 and get some more.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.AntidoteTaken]: {
    title: 'Antidote Taken',
    message:
      'The Space Corps removed the antidote for Japori from your ship and delivered it, fulfilling your assignment.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.AppStart]: { title: 'Space Trader for Windows', image: AlertImage.Splash },
  [AlertType.ArrivalBuyNewspaper]: {
    title: 'Buy Newspaper?',
    message: 'The local newspaper costs ^1. Do you wish to buy a copy?',
    buttons: [
      { text: 'Buy Newspaper', result: DialogResult.Yes },
      { text: 'Cancel', result: DialogResult.No },
    ],
  },
  [AlertType.ArrivalIFFuel]: {
    title: 'No Full Tanks',
    message: 'You do not have enough money to buy full tanks.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ArrivalIFFuelRepairs]: {
    title: 'Not Enough Money',
    message: "You don't have enough money to get a full tank or full hull repairs.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ArrivalIFNewspaper]: {
    title: "Can't Afford it!",
    message: "Sorry! A newspaper costs ^1 in this system. You don't have enough money!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ArrivalIFRepairs]: {
    title: 'No Full Repairs',
    message: "You don't have enough money to get your hull fully repaired.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ArtifactLost]: {
    title: 'Artifact Lost',
    message: 'The alien artifact has been lost in the wreckage of your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ArtifactRelinquished]: {
    title: 'Artifact Relinquished',
    message: 'The aliens take the artifact from you.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CargoIF]: {
    title: 'Not Enough Money',
    message: "You don't have enough money to spend on any of these goods.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CargoNoEmptyBays]: {
    title: 'No Empty Bays',
    message: "You don't have any empty cargo holds available at the moment",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CargoNoneAvailable]: {
    title: 'Nothing Available',
    message: 'None of these goods are available.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CargoNoneToSell]: {
    title: 'None To ^1',
    message: 'You have none of these goods in your cargo bays.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CargoNotInterested]: {
    title: 'Not Interested',
    message: 'Nobody in this system is interested in buying these goods.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CargoNotSold]: {
    title: 'Not Available',
    message: 'That item is not available in this system.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ChartJump]: {
    title: 'Use Singularity?',
    message: 'Do you wish to use the Portable Singularity to transport immediately to ^1?',
    buttons: [
      { text: 'Use Singularity', result: DialogResult.Yes },
      { text: "Don't use it", result: DialogResult.No },
    ],
  },
  [AlertType.ChartJumpCurrent]: {
    title: 'Cannot Jump',
    message:
      "You are tracking the system where you are currently located. It's useless to jump to your current location.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ChartJumpNoSystemSelected]: {
    title: 'No System Selected',
    message: 'To use the Portable Singularity, track a system before clicking on this button.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ChartTrackSystem]: {
    title: 'Track System?',
    message: '^1?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.ChartWormholeUnreachable]: {
    title: 'Wormhole Unreachable',
    message: 'The wormhole to ^1 is only accessible from ^2.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.Cheater]: {
    title: 'Cheater!',
    message: 'Cheaters never prosper!  (Well, not with that command, anyway.)',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.CrewFireMercenary]: {
    title: 'Fire Mercenary',
    message: 'Are you sure you wish to fire ^1?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.CrewNoQuarters]: {
    title: 'No Quarters Available',
    message: 'You do not have any crew quarters available for ^1.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtNoBuy]: {
    title: 'You Have A Debt',
    message: "You can't buy that as long as you have debts.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtNone]: {
    title: 'No Debt',
    message: 'You have no debts.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtReminder]: {
    title: 'Loan Notification',
    message:
      "The Bank's  Loan Officer reminds you that your debt continues to accrue interest. You currently owe ^1.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtTooLargeGrounded]: {
    title: 'Large Debt',
    message:
      'Your debt is too large.  You are not allowed to leave this system until your debt is lowered.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtTooLargeLoan]: {
    title: 'Debt Too High',
    message: 'Your debt is too high to get another loan.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtTooLargeTrade]: {
    title: 'Large Debt',
    message: 'Your debt is too large.  Nobody will trade with you.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.DebtWarning]: {
    title: 'Warning: Large Debt',
    message:
      'Your debt is getting too large. Reduce it quickly or your ship will be put on a chain!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.Egg]: {
    title: 'Egg',
    message:
      'Congratulations! An eccentric Easter Bunny decides to exchange your trade goods for a special present!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterAliensSurrender]: {
    title: 'Surrender',
    message:
      'If you surrender to the aliens, they will take the artifact. Are you sure you wish to do that?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterArrested]: {
    title: 'Arrested',
    message:
      'You are arrested and taken to the space station, where you are brought before a court of law.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterAttackCaptain]: {
    title: 'Really Attack?',
    message:
      'Famous Captains get famous by, among other things, destroying everyone who attacks them. Do you really want to attack?',
    buttons: [
      { text: 'Really Attack', result: DialogResult.Yes },
      { text: "OK, I Won't", result: DialogResult.No },
    ],
  },
  [AlertType.EncounterAttackNoDisruptors]: {
    title: 'No Disabling Weapons',
    message:
      'You have no disabling weapons! You would only be able to destroy your opponent, which would defeat the purpose of your quest.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterAttackNoLasers]: {
    title: 'No Hull-Damaging Weapons',
    message: 'You only have disabling weapons, but your opponent cannot be disabled!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterAttackNoWeapons]: {
    title: 'No Weapons',
    message: "You can't attack without weapons!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterAttackPolice]: {
    title: 'Attack Police',
    message: 'Are you sure you wish to attack the police? This will turn you into a criminal!',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterAttackTrader]: {
    title: 'Attack Trader',
    message:
      'Are you sure you wish to attack the trader? This will immediately set your police record to dubious!',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterBothDestroyed]: {
    title: 'Both Destroyed',
    message: 'You and your opponent have managed to destroy each other.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterDisabledOpponent]: {
    title: 'Opponent Disabled',
    message:
      "You have disabled your opponent. Without life support they'll have to hibernate. You notify Space Corps, and they come and tow the ^1 to the planet, where the crew is revived and then arrested. ^2",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterDrinkContents]: {
    title: 'Drink Contents?',
    message:
      'You have come across an extremely rare bottle of Captain Marmoset\'s Amazing Skill Tonic! The "use-by" date is illegible, but might still be good.  Would you like to drink it?',
    buttons: [
      { text: 'Yes, Drink It', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterDumpAll]: {
    title: 'Dump All?',
    message: 'You paid ^1 credits for these items. Are you sure you want to just dump them?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  // PORT: the original set Game.LitterWarning = true when showing this alert.
  // The engine must do that itself (Phase 3, CargoSell/Jettison).
  [AlertType.EncounterDumpWarning]: {
    title: 'Space Littering',
    message:
      'Dumping cargo in space is considered littering. If the police find your dumped goods and track them to you, this will influence your record. Do you really wish to dump?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterEscaped]: {
    title: 'Escaped',
    message: 'You have managed to escape your opponent.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterEscapedHit]: {
    title: 'You Escaped',
    message: 'You got hit, but still managed to escape.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterEscapePodActivated]: {
    title: 'Escape Pod Activated',
    message:
      'Just before the final demise of your ship, your escape pod gets activated and ejects you. After a few days, the Space Corps picks you up and drops you off at a nearby space port.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterLooting]: {
    title: 'Looting',
    message:
      'The pirates board your ship and transfer as much of your cargo to their own ship as their cargo bays can hold.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterMarieCeleste]: {
    title: 'Engage Marie Celeste',
    message:
      "The ship is empty: there is nothing in the ship's log, but the crew has vanished, leaving food on the tables and cargo in the holds. Do you wish to offload the cargo to your own holds? ",
    buttons: [
      { text: 'Yes, Take Cargo', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterMarieCelesteNoBribe]: {
    title: 'No Bribe',
    message:
      "We'd love to take your money, but Space Command already knows you've got illegal goods onboard.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterOpponentEscaped]: {
    title: 'Opponent Escaped',
    message: 'Your opponent has managed to escape.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPiratesBounty]: {
    title: 'Bounty',
    message: 'You ^1 the pirate ship^2 and earned a bounty of ^3.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPiratesExamineReactor]: {
    title: 'Pirates Examine Reactor',
    message:
      "The pirates poke around the Ion Reactor while trying to figure out if it's valuable. They finally conclude that the Reactor is worthless, not to mention dangerous, and leave it on your ship.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPiratesFindNoCargo]: {
    title: 'Pirates Find No Cargo',
    message:
      'The pirates are very angry that they find no cargo on your ship. To stop them from destroying you, you have no choice but to pay them an amount equal to 5% of your current worth - ^1.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPiratesSurrenderPrincess]: {
    title: 'You Have the Princess',
    message:
      "Pirates are not nice people, and there's no telling what they might do to the Princess. Better to die fighting than give her up to them!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPiratesTakeSculpture]: {
    title: 'Pirates Take Sculpture',
    message:
      'As the pirates ransack your ship, they find the stolen sculpture. "This is worth thousands!" one pirate exclaims, as he stuffs it into his pack.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPoliceBribe]: {
    title: 'Bribe',
    message: 'These police officers are willing to forego inspection for the amount of ^1.',
    buttons: [
      { text: 'Offer Bribe', result: DialogResult.Yes },
      { text: 'Forget It', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterPoliceBribeCant]: {
    title: 'No Bribe',
    message: "These police officers can't be bribed.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPoliceBribeLowCash]: {
    title: 'Not Enough Cash',
    message: "You don't have enough cash for a bribe.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPoliceFine]: {
    title: 'Caught',
    message:
      'The police discovers illegal goods in your cargo holds. These goods impounded and you are fined ^1 credits.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPoliceNothingFound]: {
    title: 'Nothing Found',
    message:
      'The police find nothing illegal in your cargo holds, and apologize for the inconvenience.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPoliceNothingIllegal]: {
    title: 'You Have Nothing Illegal',
    message:
      'Are you sure you want to do that? You are not carrying illegal goods, so you have nothing to fear!',
    buttons: [
      { text: 'Yes, I still want to', result: DialogResult.Yes },
      { text: "OK, I won't", result: DialogResult.No },
    ],
  },
  [AlertType.EncounterPoliceSubmit]: {
    title: 'You Have Illegal Goods',
    message: 'Are you sure you want to let the police search you? You are carrying ^1! ^2',
    buttons: [
      { text: 'Yes, let them', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterPoliceSurrender]: {
    title: 'Surrender',
    message:
      '^1If you surrender, you will spend some time in prison and will have to pay a hefty fine. ^2Are you sure you want to do that?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterPostMarie]: {
    title: 'Contraband Removed',
    message:
      'The Customs Police confiscated all of your illegal cargo, but since you were cooperative, you avoided stronger fines or penalties.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterPostMarieFlee]: {
    title: 'Criminal Act!',
    message:
      'Are you sure you want to do that? The Customs Police know you have engaged in criminal activity, and will report it!',
    buttons: [
      { text: 'Yes, I still want to', result: DialogResult.Yes },
      { text: "OK, I won't", result: DialogResult.No },
    ],
  },
  [AlertType.EncounterScoop]: {
    title: 'Scoop Canister',
    message: 'A canister from the destroyed ship, labeled ^1, drifts within range of your scoops.',
    buttons: [
      { text: 'Pick It Up', result: DialogResult.Yes },
      { text: 'Let It Go', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterScoopNoRoom]: {
    title: 'No Room To Scoop',
    message:
      "You don't have any room in your cargo holds. Do you wish to jettison goods to make room, or just let it go.",
    buttons: [
      { text: 'Make Room', result: DialogResult.Yes },
      { text: 'Let it go', result: DialogResult.No },
    ],
  },
  [AlertType.EncounterScoopNoScoop]: {
    title: 'No Scoop',
    message:
      'You regret finding nothing in your holds that can be dumped, and let the canister go.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterSurrenderRefused]: {
    title: 'To The Death!',
    message: 'Surrender? Hah! We want your HEAD!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterTonicConsumedGood]: {
    title: 'Tonic Consumed',
    message:
      "Mmmmm. Captain Marmoset's Amazing Skill Tonic not only fills you with energy, but tastes like a fine single-malt." +
      '\n',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterTonicConsumedStrange]: {
    title: 'Tonic Consumed',
    message:
      "While you don't know what it was supposed to taste like, you get the feeling that this dose of tonic was a bit off.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterTradeCompleted]: {
    title: 'Trade Completed',
    message: "Thanks for ^1 the ^2. It's been a pleasure doing business with you.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterYouLose]: {
    title: 'You Lose',
    message: 'Your ship has been destroyed by your opponent.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EncounterYouWin]: {
    title: 'You Win',
    message: 'You have destroyed your opponent.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentAlreadyOwn]: {
    title: 'You Already Have One',
    message: "It's not useful to buy more than one of this item.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentBuy]: {
    title: 'Buy ^1',
    message: 'Do you wish to buy this item for ^2 credits?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EquipmentEscapePod]: {
    title: 'Escape Pod',
    message: 'Do you want to buy an escape pod for 2000 credits?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.EquipmentExtraBaysInUse]: {
    title: 'Cargo Bays Full',
    message:
      "The extra cargo bays are still filled with goods. You can only sell them when they're empty.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentFuelCompactor]: {
    title: 'Fuel Compactor',
    message: 'You now have a fuel compactor installed on your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentHiddenCompartments]: {
    title: 'Hidden Compartments',
    message:
      "You now have hidden compartments equivalent to 5 extra cargo bays installed in your ship. Police won't find illegal cargo hidden in these compartments.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentIF]: {
    title: 'Not Enough Money',
    message: "You don't have enough money to spend on this item.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentLightningShield]: {
    title: 'Lightning Shield',
    message: 'You now have one lightning shield installed on your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentMorgansLaser]: {
    title: "Morgan's Laser",
    message: "You now have Henry Morgan's special laser installed on your ship.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentNotEnoughSlots]: {
    title: 'Not Enough Slots',
    message: 'You have already filled all of your available slots for this type of item.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentQuantumDisruptor]: {
    title: 'Quantum Disruptor',
    message: 'You now have one quantum disruptor installed on your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.EquipmentSell]: {
    title: 'Sell Item',
    message: 'Are you sure you want to sell this item?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.FileErrorOpen]: {
    title: 'Error',
    message: 'An error occurred while trying to open ^1.' + '\n' + '\n' + '^2',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.FileErrorSave]: {
    title: 'Error',
    message: 'An error occurred while trying to save ^1.' + '\n' + '\n' + '^2',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.FleaBuilt]: {
    title: 'Flea Built',
    message: 'In 3 days and with 500 credits, you manage to convert your pod into a Flea.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.GameAbandonConfirm]: {
    title: 'Are You Sure?',
    message: 'Are you sure you want to abandon your current game?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.GameClearHighScores]: {
    title: 'Clear High Scores',
    message: 'Are you sure you wish to clear the high score table?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.GameEndBoughtMoon]: { title: 'You Have Retired', image: AlertImage.GameEndBoughtMoon },
  [AlertType.GameEndBoughtMoonGirl]: {
    title: 'You Have Retired with the Princess',
    image: AlertImage.GameEndBoughtMoonGirl,
  },
  [AlertType.GameEndHighScoreAchieved]: {
    title: 'Congratulations!',
    message: 'You have made the high-score list!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.GameEndHighScoreCheat]: {
    title: 'Naughy, Naughty!',
    message: "You would have made the high-score list if you weren't a Cheat!.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.GameEndHighScoreMissed]: {
    title: 'Sorry',
    message: 'Alas! This is not enough to enter the high-score list.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.GameEndKilled]: { title: 'You Are Dead', image: AlertImage.GameEndKilled },
  [AlertType.GameEndRetired]: { title: 'You Have Retired', image: AlertImage.GameEndRetired },
  [AlertType.GameEndScore]: {
    title: 'Score',
    message: 'You achieved a score of ^1.^2%.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.GameRetire]: {
    title: 'Retire',
    message: 'Are you sure you wish to retire?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.InsuranceNoEscapePod]: {
    title: 'No Escape Pod',
    message: "Insurance isn't useful for you, since you don't have an escape pod.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.InsurancePayoff]: {
    title: 'Insurance',
    message:
      'Since your ship was insured, the bank pays you the total worth of the destroyed ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.InsuranceStop]: {
    title: 'Stop Insurance',
    message: 'Do you really wish to stop your insurance and lose your no-claim?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.JailConvicted]: {
    title: 'Convicted',
    message: 'You are convicted to ^1 in prison and a fine of ^2.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JailFleaReceived]: {
    title: 'Flea Received',
    message:
      'When you leave prison, the police have left a second-hand Flea for you so you can continue your travels.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JailHiddenCargoBaysRemoved]: {
    title: 'Hidden Compartments Removed',
    message:
      'When your ship is impounded, the police go over it with a fine-toothed comb. You hidden compartments are found and removed.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JailIllegalGoodsImpounded]: {
    title: 'Illegal Goods Impounded',
    message: 'The police also impound all of the illegal goods you have on board.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JailInsuranceLost]: {
    title: 'Insurance Lost',
    message: "Since you cannot pay your insurance while you're in prison, it is retracted.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JailMercenariesLeave]: {
    title: 'Mercenaries Leave',
    message: 'Any mercenaries who were traveling with you have left.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JailShipSold]: {
    title: 'Ship Sold',
    message: "Because you don't have the credits to pay your fine, your ship is sold.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.JarekTakenHome]: {
    title: 'Jarek Taken Home',
    message: 'The Space Corps decides to give ambassador Jarek a lift home to Devidia.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.LeavingIFInsurance]: {
    title: 'Not Enough Money',
    message: "You don't have enough cash to pay for your insurance.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.LeavingIFMercenaries]: {
    title: 'Pay Mercenaries',
    message:
      "You don't have enough cash to pay your mercenaries to come with you on this trip. Fire them or make sure you have enough cash.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.LeavingIFWormholeTax]: {
    title: 'Wormhole Tax',
    message: "You don't have enough money to pay for the wormhole tax.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.MeetCaptainAhab]: {
    title: 'Meet Captain Ahab',
    message:
      'Captain Ahab is in need of a spare shield for an upcoming mission. He offers to trade you some piloting lessons for your reflective shield. Do you wish to trade?',
    buttons: [
      { text: 'Yes, Trade Shield', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.MeetCaptainConrad]: {
    title: 'Meet Captain Conrad',
    message:
      'Captain Conrad is in need of a military laser. She offers to trade you some engineering training for your military laser. Do you wish to trade?',
    buttons: [
      { text: 'Yes, Trade Laser', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.MeetCaptainHuie]: {
    title: 'Meet Captain Huie',
    message:
      'Captain Huie is in need of a military laser. She offers to exchange some bargaining training for your military laser. Do you wish to trade?',
    buttons: [
      { text: 'Yes, Trade Laser', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.NewGameConfirm]: {
    title: 'New Game',
    message: 'Are you sure you wish to start a new game?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.NewGameMoreSkillPoints]: {
    title: 'More Skill Points',
    message: "You haven't awarded all 20 skill points yet.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.OptionsNoGame]: {
    title: 'No Game Active',
    message: "You don't have a game open, so you can only change the default options.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.PreciousHidden]: {
    title: 'Precious Cargo Hidden',
    message:
      'You quickly hide ^1 in your hidden cargo bays before the pirates board your ship. This would never work with the police, but pirates are usually in more of a hurry.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.PrincessTakenHome]: {
    title: 'Princess Taken Home',
    message:
      "The Space Corps decides to give the Princess a ride home to Galvon since you obviously weren't up to the task.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorConfiscated]: {
    title: 'Police Confiscate Reactor',
    message:
      'The Police confiscate the Ion reactor as evidence of your dealings with unsavory characters.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorDestroyed]: {
    title: 'Reactor Destroyed',
    message:
      'The destruction of your ship was made much more spectacular by the added explosion of the Ion Reactor.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorOnBoard]: {
    title: 'Reactor',
    message:
      'Five of your cargo bays now contain the unstable Ion Reactor, and ten of your bays contain enriched fuel.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorMeltdown]: {
    title: 'Reactor Meltdown!',
    message:
      'Just as you approach the docking bay, the reactor explodes into a huge radioactive fireball!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorWarningFuel]: {
    title: 'Reactor Warning',
    message:
      'You notice the Ion Reactor has begun to consume fuel rapidly. In a single day, it has burned up nearly half a bay of fuel!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorWarningFuelGone]: {
    title: 'Reactor Warning',
    message:
      "The Ion Reactor is emitting a shrill whine, and it's shaking. The display indicates that it is suffering from fuel starvation.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ReactorWarningTemp]: {
    title: 'Reactor Warning',
    message:
      'The Ion Reactor is smoking and making loud noises. The display warns that the core is close to the melting temperature.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.RegistryError]: {
    title: 'Error...',
    message: 'Error accessing the Registry: ^1',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SculptureConfiscated]: {
    title: 'Police Confiscate Sculpture',
    message: 'The Police confiscate the stolen sculpture and return it to its rightful owner.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SculptureSaved]: {
    title: 'Sculpture Saved',
    message:
      'On your way to the escape pod, you grab the stolen sculpture. Oh well, at least you saved something.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyConfirm]: {
    title: 'Buy New Ship',
    message: 'Are you sure you wish to trade in your ^1 for a new ^2^3?',
    buttons: [
      { text: 'Yes', result: DialogResult.Yes },
      { text: 'No', result: DialogResult.No },
    ],
  },
  [AlertType.ShipBuyCrewQuarters]: {
    title: 'Too Many Crewmembers',
    message:
      "The new ship you picked doesn't have enough quarters for all of your crewmembers. First you will have to fire one or more of them.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyIF]: {
    title: 'Not Enough Money',
    message: "You don't have enough money to buy this ship.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyIFTransfer]: {
    title: 'Not Enough Money',
    message:
      "You won't have enough money to buy this ship and pay the cost to transfer all of your unique equipment. You should choose carefully which items you wish to transfer!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyNoSlots]: {
    title: "Can't Transfer Item",
    message:
      "If you trade your ship in for a ^1, you won't be able to transfer your ^2 because the new ship has insufficient ^3 slots!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyNotAvailable]: {
    title: 'Ship Not Available',
    message: 'That type of ship is not available in the current system.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyNoTransfer]: {
    title: "Can't Transfer Item",
    message:
      "Unfortunately, if you make this trade, you won't be able to afford to transfer your ^1 to the new ship!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyPassengerQuarters]: {
    title: 'Passenger Needs Quarters',
    message: 'You must get a ship with enough crew quarters so that ^1 can stay on board.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyReactor]: {
    title: 'Shipyard Engineer',
    message:
      "Sorry! We can't take your ship as a trade-in. That Ion Reactor looks dangerous, and we have no way of removing it. Come back when you've gotten rid of it.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipBuyTransfer]: {
    title: 'Transfer ^1',
    message: "I'll transfer your ^2 to your new ship for ^3 credits.",
    buttons: [
      { text: 'Do it!', result: DialogResult.Yes },
      { text: 'No thanks', result: DialogResult.No },
    ],
  },
  [AlertType.ShipDesignIF]: {
    title: 'Not Enough Money',
    message: "You don't have enough money to create this design.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipDesignThanks]: {
    title: 'Thank you!',
    message: '^1 thanks you for your business!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.ShipHullUpgraded]: {
    title: 'Hull Upgraded',
    message: 'Technicians spend the day retrofitting the hull of your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialCleanRecord]: {
    title: 'Clean Record',
    message: 'The hacker resets your police record to Clean.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialExperimentPerformed]: {
    title: 'Experiment Performed',
    message:
      "The galaxy is abuzz with news of a terrible malfunction in Dr. Fehler's laboratory. Evidently, he was not warned in time and he performed his experiment... with disastrous results!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialIF]: {
    title: 'Not Enough Money',
    message: "You don't have enough cash to spend to accept this offer.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialMoonBought]: {
    title: 'Moon Bought',
    message: 'You bought a moon in the Utopia system. Go there to claim it.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialNoQuarters]: {
    title: 'No Free Quarters',
    message: 'There are currently no free crew quarters on your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialNotEnoughBays]: {
    title: 'Not Enough Bays',
    message: "You don't have enough empty cargo bays at the moment.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerConcernedJarek]: {
    title: "Ship's Comm.",
    message: 'Commander? Jarek here. Do you require any assitance in charting a course to Devidia?',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerConcernedPrincess]: {
    title: "Ship's Comm.",
    message: '[Ziyal] Oh Captain? (giggles) Would it help if I got out and pushed?',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerConcernedWild]: {
    title: "Ship's Comm.",
    message: "Bridge? This is Jonathan. Are we there yet? Heh, heh. Sorry, I couldn't resist.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerImpatientJarek]: {
    title: "Ship's Comm.",
    message: 'Captain! This is the Ambassador speaking. We should have been there by now?!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerImpatientPrincess]: {
    title: "Ship's Comm.",
    message: 'Sir! Are you taking me home or merely taking the place of my previous captors?!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerImpatientWild]: {
    title: "Ship's Comm.",
    message: "Commander! Wild here. What's taking us so long?!",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialPassengerOnBoard]: {
    title: 'Passenger On Board',
    message:
      'You have taken ^1 on board. While on board ^1 will lend you expertise, but may stop helping if the journey takes too long.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialSealedCanisters]: {
    title: 'Sealed Canisters',
    message: 'You bought the sealed canisters and put them in your cargo bays.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialSkillIncrease]: {
    title: 'Skill Increase',
    message: 'The alien increases one of your skills. ',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialTimespaceFabricRip]: {
    title: 'Timespace Fabric Rip',
    message:
      "You have flown through a tear in the timespace continuum caused by Dr. Fehler's failed experiment. You may not have reached" +
      '\n' +
      ' your planned destination!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.SpecialTrainingCompleted]: {
    title: 'Training Completed',
    message:
      'After a few hours of training with a top expert, you feel your abilities have improved significantly.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TravelArrival]: {
    title: 'Arrival',
    message: 'You arrive at your destination.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TravelUneventfulTrip]: {
    title: 'Uneventful Trip',
    message: 'After an uneventful trip, you arrive at your destination.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesAllDied]: {
    title: 'All The Tribbles Died',
    message:
      'The radiation from the Ion Reactor is deadly to Tribbles. All of the Tribbles on board your ship have died.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesAteFood]: {
    title: 'Tribbles Ate Food',
    message: 'You find that, instead of food, some of your cargo bays contain only tribbles!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesGone]: {
    title: 'No More Tribbles',
    message:
      'The alien uses his alien technology to beam over your whole collection of tribbles to his ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesHalfDied]: {
    title: 'Half The Tribbles Died',
    message:
      'The radiation from the Ion Reactor seems to be deadly to Tribbles. Half the Tribbles on board died.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesKilled]: {
    title: 'Tribbles Killed',
    message: 'Your tribbles all died in the explosion.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesMostDied]: {
    title: 'Most Tribbles Died',
    message:
      'You find that, instead of narcotics, some of your cargo bays contain only dead tribbles!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesOwn]: {
    title: 'A Tribble',
    message: 'You are now the proud owner of a little, cute, furry tribble.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesRemoved]: {
    title: 'Tribbles Removed',
    message: 'The tribbles were sold with your ship.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesInspector]: {
    title: 'Space Port Inspector',
    message:
      'Our scan reports you have ^1 tribbles on board your ship. Tribbles are pests worse than locusts! You are running the risk of getting a hefty fine!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesSqueek]: {
    title: 'A Tribble',
    message: 'Squeek!',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.TribblesTradeIn]: {
    title: "You've Got Tribbles",
    message:
      "Hm. I see you got a tribble infestation on your current ship. I'm sorry, but that severely reduces the trade-in price.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildArrested]: {
    title: 'Wild Arrested',
    message: 'Jonathan Wild is arrested, and taken away to stand trial.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildChatsPirates]: {
    title: 'Wild Chats With Pirates',
    message:
      "The Pirate Captain turns out to be an old associate of Jonathan Wild's. They talk about old times, and you get the feeling that Wild would switch ships if the Pirates had any quarters available.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildGoesPirates]: {
    title: 'Wild Goes With Pirates',
    message:
      "The Pirate Captain turns out to be an old associate of Jonathan Wild's, and invites him to go to Kravat aboard the Pirate ship. Wild accepts the offer and thanks you for the ride.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildLeavesShip]: {
    title: 'Wild Leaves Ship',
    message: 'Jonathan Wild leaves your ship, and goes into hiding on ^1.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildSculpture]: {
    title: 'Wild Eyes Sculpture',
    message:
      'Jonathan Wild sees the stolen sculpture. "Wow, I only know of one of these left in the whole Universe!" he exclaims, "Geurge Locas must be beside himself with it being stolen." He seems very impressed with you, which makes you feel much better about the item your delivering.',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildWontBoardLaser]: {
    title: "Wild Won't Board Ship",
    message:
      "Jonathan Wild isn't willing to go with you if you're not armed with at least a Beam Laser. He'd rather take his chances hiding out here." +
      '\n',
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildWontBoardReactor]: {
    title: "Wild Won't Board Ship",
    message:
      "Jonathan Wild doesn't like the looks of that Ion Reactor. He thinks it's too dangerous, and won't get on board.",
    buttons: [{ text: 'Ok', result: DialogResult.OK }],
  },
  [AlertType.WildWontStayAboardLaser]: {
    title: "Wild Won't Stay Aboard",
    message:
      "Jonathan Wild isn't about to go with you if you're not armed with at least a Beam Laser. He'd rather take his chances hiding out here on ^1." +
      '\n',
    buttons: [
      { text: 'Say Goodbye to Wild', result: DialogResult.OK },
      { text: 'Cancel', result: DialogResult.Cancel },
    ],
  },
  [AlertType.WildWontStayAboardReactor]: {
    title: "Wild Won't Stay Aboard",
    message:
      "Jonathan Wild isn't willing to go with you if you bring that Reactor on board. He'd rather take his chances hiding out here on ^1." +
      '\n',
    buttons: [
      { text: 'Say Goodbye to Wild', result: DialogResult.OK },
      { text: 'Cancel', result: DialogResult.Cancel },
    ],
  },
};
