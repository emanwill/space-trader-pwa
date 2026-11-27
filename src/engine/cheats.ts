// Port of Form_SpaceTrader.btnFind_Click: the Find box, which also takes the
// original's cheat codes. "Cheetah" turns cheats on (and marks the game, so
// it can't enter the high score table); after that the other words work.
// Anything else is a system name to find (and optionally track).

import { AlertType } from './data/enums';
import { Consts } from './data/consts';
import { Strings } from './data/strings';
import type { Game } from './game';

/** What the caller should do after a Find. */
export type FindResult =
  /** Searched for a system (or did nothing). */
  | 'find'
  /** Ran a cheat. */
  | 'cheat'
  /** "Go": the system is selected; the caller makes the direct warp (WarpDirect, with autosaves). */
  | 'go'
  /** "Monster.com": show the mercenary, quest and shipyard lists. */
  | 'monster'
  /** "Test": show the test (debug) panel. */
  | 'test';

/** Functions.IsInt: int.Parse would succeed (optional sign and surrounding spaces, 32-bit). */
export function isInt(text: string): boolean {
  if (!/^\s*[+-]?\d+\s*$/.test(text)) return false;
  const n = Number(text);
  return n >= -2147483648 && n <= 2147483647;
}

function parseInt32(text: string): number {
  return isInt(text) ? Number(text) : 0;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** btnFind_Click, after the Find dialog closed with OK. */
export async function find(game: Game, text: string, trackSystem: boolean): Promise<FindResult> {
  const cmdr = game.commander;
  const ship = cmdr.ship;

  const words = text.split(' ');

  const first = words.length > 0 ? words[0]! : '';
  const second = words.length > 1 ? words[1]! : '';
  const third = words.length > 2 ? words[2]! : '';
  const num1 = parseInt32(second);
  const num2 = parseInt32(third);

  let result: FindResult = 'cheat';

  if (game.cheatEnabled) {
    switch (first) {
      case 'Bazaar':
        game.chanceOfTradeInOrbit = clamp(num1, 0, 1000);
        break;
      case 'Cover':
        if (num1 >= 0 && num1 < ship.shields.length && num2 >= 0 && num2 < Consts.Shields.length)
          ship.shields[num1] = Consts.Shields[num2]!.clone();
        break;
      case 'DeLorean':
        cmdr.days = Math.max(0, num1);
        break;
      case 'Diamond':
        ship.hullUpgraded = !ship.hullUpgraded;
        break;
      case 'Energize':
        game.canSuperWarp = !game.canSuperWarp;
        break;
      case 'Events':
        if (second === 'Reset') game.resetVeryRareEncounters();
        else {
          const lines = game.veryRareEncounters.map((e) => Strings.VeryRareEncounters[e]!);
          await game.ui.alert(
            AlertType.Alert,
            'Remaining Very Rare Encounters',
            lines.join('\n').trim(),
          );
        }
        break;
      case 'Fame':
        cmdr.reputationScore = Math.max(0, num1);
        break;
      case 'Go':
        game.selectedSystemName = second;
        if (game.selectedSystem!.name.toLowerCase() === second.toLowerCase()) result = 'go';
        break;
      case 'Ice':
        switch (second) {
          case 'Pirate':
            cmdr.killsPirate = Math.max(0, num2);
            break;
          case 'Police':
            cmdr.killsPolice = Math.max(0, num2);
            break;
          case 'Trader':
            cmdr.killsTrader = Math.max(0, num2);
            break;
        }
        break;
      case 'Indemnity':
        cmdr.noClaim = Math.max(0, num1);
        break;
      case 'IOU':
        cmdr.debt = Math.max(0, num1);
        break;
      case 'Iron':
        if (num1 >= 0 && num1 < ship.weapons.length && num2 >= 0 && num2 < Consts.Weapons.length)
          ship.weapons[num1] = Consts.Weapons[num2]!.clone();
        break;
      case 'Juice':
        ship.fuel = clamp(num1, 0, ship.fuelTanks);
        break;
      case 'Knack':
        if (num1 >= 0 && num1 < game.mercenaries.length) {
          const skills = third.split(',');
          const merc = game.mercenaries[num1]!;
          for (let i = 0; i < merc.skills.length && i < skills.length; i++) {
            if (isInt(skills[i]!))
              merc.skills[i] = clamp(parseInt32(skills[i]!), 1, Consts.MaxSkill);
          }
        }
        break;
      case "L'Engle":
        game.fabricRipProbability = clamp(num1, 0, Consts.FabricRipInitialProbability);
        break;
      case 'LifeBoat':
        ship.escapePod = !ship.escapePod;
        break;
      case 'Monster.com':
        result = 'monster';
        break;
      case 'PlanB':
        game.autoSave = true;
        break;
      case 'Posse':
        if (
          num1 > 0 &&
          num1 < ship.crew.length &&
          num2 > 0 &&
          num2 < game.mercenaries.length &&
          !Consts.SpecialCrewMemberIds.includes(num2)
        ) {
          const skill = ship.trader;
          ship.crew[num1] = game.mercenaries[num2]!;
          if (ship.trader !== skill) game.recalculateBuyPrices(cmdr.currentSystem!);
        }
        break;
      case 'RapSheet':
        cmdr.policeRecordScore = num1;
        break;
      case 'Rarity':
        game.chanceOfVeryRareEncounter = clamp(num1, 0, 1000);
        break;
      case 'Scratch':
        cmdr.cash = Math.max(0, num1);
        break;
      case 'Skin':
        ship.hull = clamp(num1, 0, ship.hullStrength);
        break;
      case 'Status':
        await status(game, second, num2);
        break;
      case 'Swag':
        if (num1 >= 0 && num1 < ship.cargo.length)
          ship.cargo[num1] = clamp(num2, 0, ship.freeCargoBays + ship.cargo[num1]!);
        break;
      case 'Test':
        result = 'test';
        break;
      case 'Tool':
        if (num1 >= 0 && num1 < ship.gadgets.length && num2 >= 0 && num2 < Consts.Gadgets.length)
          ship.gadgets[num1] = Consts.Gadgets[num2]!.clone();
        break;
      case 'Varmints':
        ship.tribbles = Math.max(0, num1);
        break;
      case 'Yellow':
        game.easyEncounters = true;
        break;
      default:
        result = 'find';
        break;
    }
  } else {
    switch (first) {
      case 'Cheetah':
        await game.ui.alert(AlertType.Cheater);
        game.cheatEnabled = true;
        break;
      default:
        result = 'find';
        break;
    }
  }

  if (result === 'find') {
    game.selectedSystemName = text;
    if (trackSystem && game.selectedSystem?.name.toLowerCase() === text.toLowerCase())
      game.trackedSystemId = game.selectedSystemId;
  }

  return result;
}

/** The quest statuses, in the order "Status" lists them, with their setters. */
const QUESTS = [
  'Artifact',
  'Dragonfly',
  'Experiment',
  'Gemulon',
  'Japori',
  'Jarek',
  'Moon',
  'Princess',
  'Reactor',
  'Scarab',
  'Sculpture',
  'SpaceMonster',
  'Wild',
] as const;

type QuestKey = `questStatus${(typeof QUESTS)[number]}`;

/** The "Status" cheat: sets one quest's status, or lists them all. */
async function status(game: Game, quest: string, value: number): Promise<void> {
  if ((QUESTS as readonly string[]).includes(quest)) {
    game[`questStatus${quest}` as QuestKey] = Math.max(0, value);
    return;
  }
  const text = QUESTS.map((q) => `${q}: ${game[`questStatus${q}` as QuestKey]}`).join('\n');
  await game.ui.alert(AlertType.Alert, 'Status of Quests', text);
}
