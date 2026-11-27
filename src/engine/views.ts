// Text the original's information screens built from game state:
// Form_ViewQuests.cs, Form_ViewShip.cs and Form_ViewCommander.cs. The UI lays
// these out; the wording and conditions are the original's.

import { Consts } from './data/consts';
import { CrewMemberId, GadgetType, SpecialEventType } from './data/enums';
import { Strings } from './data/strings';
import { formatMoney, formatNumber, multiples, stringVars } from './format';
import type { Game } from './game';
import { idiv } from './math';
import { SpecialEvent } from './model/special-event';

// #region Quests (Form_ViewQuests.cs)

/** FormViewQuests.GetQuestStrings: one entry per open quest. Empty means Strings.QuestNone. */
export function questStrings(game: Game): string[] {
  const quests: string[] = [];
  const ship = game.commander.ship;

  if (
    game.questStatusGemulon > SpecialEvent.StatusGemulonNotStarted &&
    game.questStatusGemulon < SpecialEvent.StatusGemulonDate
  ) {
    if (game.questStatusGemulon === SpecialEvent.StatusGemulonDate - 1)
      quests.push(Strings.QuestGemulonInformTomorrow);
    else
      quests.push(
        stringVars(
          Strings.QuestGemulonInformDays,
          multiples(SpecialEvent.StatusGemulonDate - game.questStatusGemulon, 'day'),
        ),
      );
  } else if (game.questStatusGemulon === SpecialEvent.StatusGemulonFuel)
    quests.push(Strings.QuestGemulonFuel);

  if (
    game.questStatusExperiment > SpecialEvent.StatusExperimentNotStarted &&
    game.questStatusExperiment < SpecialEvent.StatusExperimentDate
  ) {
    if (game.questStatusExperiment === SpecialEvent.StatusExperimentDate - 1)
      quests.push(Strings.QuestExperimentInformTomorrow);
    else
      quests.push(
        stringVars(
          Strings.QuestExperimentInformDays,
          multiples(SpecialEvent.StatusExperimentDate - game.questStatusExperiment, 'day'),
        ),
      );
  }

  if (ship.reactorOnBoard) {
    if (game.questStatusReactor === SpecialEvent.StatusReactorFuelOk)
      quests.push(Strings.QuestReactor);
    else quests.push(Strings.QuestReactorFuel);
  } else if (game.questStatusReactor === SpecialEvent.StatusReactorDelivered)
    quests.push(Strings.QuestReactorLaser);

  if (game.questStatusSpaceMonster === SpecialEvent.StatusSpaceMonsterAtAcamar)
    quests.push(Strings.QuestSpaceMonsterKill);

  if (game.questStatusJapori === SpecialEvent.StatusJaporiInTransit)
    quests.push(Strings.QuestJaporiDeliver);

  switch (game.questStatusDragonfly) {
    case SpecialEvent.StatusDragonflyFlyBaratas:
      quests.push(Strings.QuestDragonflyBaratas);
      break;
    case SpecialEvent.StatusDragonflyFlyMelina:
      quests.push(Strings.QuestDragonflyMelina);
      break;
    case SpecialEvent.StatusDragonflyFlyRegulas:
      quests.push(Strings.QuestDragonflyRegulas);
      break;
    case SpecialEvent.StatusDragonflyFlyZalkon:
      quests.push(Strings.QuestDragonflyZalkon);
      break;
    case SpecialEvent.StatusDragonflyDestroyed:
      quests.push(Strings.QuestDragonflyShield);
      break;
  }

  const princess = game.mercenaries[CrewMemberId.Princess]!.name;
  switch (game.questStatusPrincess) {
    case SpecialEvent.StatusPrincessFlyCentauri:
      quests.push(Strings.QuestPrincessCentauri);
      break;
    case SpecialEvent.StatusPrincessFlyInthara:
      quests.push(Strings.QuestPrincessInthara);
      break;
    case SpecialEvent.StatusPrincessFlyQonos:
      quests.push(Strings.QuestPrincessQonos);
      break;
    case SpecialEvent.StatusPrincessReturned:
      quests.push(Strings.QuestPrincessQuantum);
      break;
    default:
      // PORT: the original matched only StatusPrincessRescued here, so the
      // log was empty for the days she is aboard (statuses 5 to 14) and its
      // impatient line could never show. Match the whole range.
      if (
        game.questStatusPrincess >= SpecialEvent.StatusPrincessRescued &&
        game.questStatusPrincess <= SpecialEvent.StatusPrincessImpatient
      ) {
        if (ship.princessOnBoard) {
          if (game.questStatusPrincess === SpecialEvent.StatusPrincessImpatient)
            quests.push(stringVars(Strings.QuestPrincessReturningImpatient, princess));
          else quests.push(stringVars(Strings.QuestPrincessReturning, princess));
        } else quests.push(stringVars(Strings.QuestPrincessReturn, princess));
      }
      break;
  }

  if (game.questStatusScarab === SpecialEvent.StatusScarabHunting)
    quests.push(Strings.QuestScarabFind);
  else if (game.questStatusScarab === SpecialEvent.StatusScarabDestroyed) {
    if (Consts.SpecialEvents[SpecialEventType.ScarabUpgradeHull]!.location === null)
      quests.push(
        stringVars(
          Strings.QuestScarabNotify,
          Consts.SpecialEvents[SpecialEventType.ScarabDestroyed]!.location!.name,
        ),
      );
    else
      quests.push(
        stringVars(
          Strings.QuestScarabHull,
          Consts.SpecialEvents[SpecialEventType.ScarabUpgradeHull]!.location!.name,
        ),
      );
  }

  if (ship.sculptureOnBoard) quests.push(Strings.QuestSculpture);
  else if (game.questStatusReactor === SpecialEvent.StatusReactorDelivered)
    quests.push(Strings.QuestSculptureHiddenBays);

  if (game.questStatusArtifact === SpecialEvent.StatusArtifactOnBoard)
    quests.push(Strings.QuestArtifact);

  if (ship.jarekOnBoard) {
    if (game.questStatusJarek === SpecialEvent.StatusJarekImpatient)
      quests.push(Strings.QuestJarekImpatient);
    else quests.push(Strings.QuestJarek);
  }

  if (ship.wildOnBoard) {
    if (game.questStatusWild === SpecialEvent.StatusWildImpatient)
      quests.push(Strings.QuestWildImpatient);
    else quests.push(Strings.QuestWild);
  }

  if (ship.tribbles > 0) quests.push(Strings.QuestTribbles);

  if (game.questStatusMoon === SpecialEvent.StatusMoonBought) quests.push(Strings.QuestMoon);

  return quests;
}

/** A piece of quest text: plain, or a system name the player can tap to select (lblQuests links). */
export type TextPart = { text: string; system?: undefined } | { text: string; system: number };

/** Splits text into plain parts and system names, as FormViewQuests made links of every system name. */
export function linkSystemNames(text: string): TextPart[] {
  const names = Strings.SystemNames.map((name, id) => ({ name, id }))
    .filter(({ name }) => text.includes(name))
    // Longer names first, so a name that contains another wins.
    .sort((a, b) => b.name.length - a.name.length);
  if (names.length === 0) return [{ text }];

  const pattern = new RegExp(
    `(${names.map(({ name }) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  );
  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => {
      const match = names.find(({ name }) => name === part);
      return match ? { text: part, system: match.id } : { text: part };
    });
}

// #endregion

// #region Ship (Form_ViewShip.cs)

/** FormViewShip.DisplayEquipment as sections: "Hull", "Equipment" and "Unfilled". */
export interface ShipInfoSection {
  label: string;
  lines: string[];
}

/** FormViewShip.DisplayEquipment. */
export function shipEquipment(game: Game): ShipInfoSection[] {
  const ship = game.commander.ship;
  const sections: ShipInfoSection[] = [];

  if (game.questStatusScarab === SpecialEvent.StatusScarabDone)
    sections.push({ label: 'Hull', lines: ['Hardened'] });

  const equipment: string[] = [];
  for (const weapon of Consts.Weapons) {
    const count = ship.weapons.filter((w) => w !== null && w.type === weapon.type).length;
    if (count > 0) equipment.push(multiples(count, weapon.name));
  }
  for (const shield of Consts.Shields) {
    const count = ship.shields.filter((s) => s !== null && s.type === shield.type).length;
    if (count > 0) equipment.push(multiples(count, shield.name));
  }
  Consts.Gadgets.forEach((gadget, i) => {
    let count = ship.gadgets.filter((g) => g !== null && g.type === gadget.type).length;
    if (count > 0) {
      if (i === GadgetType.ExtraCargoBays || i === GadgetType.HiddenCargoBays) {
        count *= 5;
        equipment.push(formatNumber(count) + gadget.name.substring(1));
      } else equipment.push(multiples(count, gadget.name));
    }
  });
  if (ship.escapePod) equipment.push('1 ' + Strings.ShipInfoEscapePod);
  if (equipment.length > 0) sections.push({ label: 'Equipment', lines: equipment });

  if (ship.freeSlots > 0) {
    const unfilled: string[] = [];
    if (ship.freeSlotsWeapon > 0) unfilled.push(multiples(ship.freeSlotsWeapon, 'weapon slot'));
    if (ship.freeSlotsShield > 0) unfilled.push(multiples(ship.freeSlotsShield, 'shield slot'));
    if (ship.freeSlotsGadget > 0) unfilled.push(multiples(ship.freeSlotsGadget, 'gadget slot'));
    sections.push({ label: 'Unfilled', lines: unfilled });
  }

  return sections;
}

/** FormViewShip.DisplaySpecialCargo. Empty means Strings.SpecialCargoNone. */
export function specialCargo(game: Game): string[] {
  const ship = game.commander.ship;
  const cargo: string[] = [];

  if (ship.tribbles > 0) {
    if (ship.tribbles === Consts.MaxTribbles) cargo.push(Strings.SpecialCargoTribblesInfest);
    else cargo.push(multiples(ship.tribbles, Strings.SpecialCargoTribblesCute) + '.');
  }

  if (game.questStatusJapori === SpecialEvent.StatusJaporiInTransit)
    cargo.push(Strings.SpecialCargoJapori);

  if (ship.artifactOnBoard) cargo.push(Strings.SpecialCargoArtifact);

  if (game.questStatusJarek === SpecialEvent.StatusJarekDone) cargo.push(Strings.SpecialCargoJarek);

  if (ship.reactorOnBoard) {
    cargo.push(Strings.SpecialCargoReactor);
    cargo.push(
      multiples(10 - idiv(game.questStatusReactor - 1, 2), 'bay') + Strings.SpecialCargoReactorBays,
    );
  }

  if (ship.sculptureOnBoard) cargo.push(Strings.SpecialCargoSculpture);

  if (game.canSuperWarp) cargo.push(Strings.SpecialCargoExperiment);

  return cargo;
}

// #endregion

// #region Commander (Form_ViewCommander.cs)

/** FormViewCommander's bounty line: a bounty on a crook, or angry kingpins for a hero. */
export function commanderBounty(game: Game): { label: string; value: string } | null {
  const score = game.commander.policeRecordScore;
  if (score <= Consts.PoliceRecordScoreCrook)
    return { label: 'Bounty offered', value: formatMoney(-1000 * score) };
  if (score >= Consts.PoliceRecordScoreTrusted)
    return { label: 'Angry kingpins', value: formatNumber(idiv(score, 5)) };
  return null;
}

// #endregion
