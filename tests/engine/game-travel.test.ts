import { describe, expect, it } from 'vitest';
import { DialogResult } from '../../src/engine/data/alerts';
import { Consts } from '../../src/engine/data/consts';
import {
  AlertType,
  CrewMemberId,
  Difficulty,
  GameEndType,
  NewsEvent,
  PoliticalSystemType,
  ShipType,
  SpecialEventType,
  StarSystemId,
  TechLevel,
  TradeItemType,
  WeaponType,
} from '../../src/engine/data/enums';
import { distance } from '../../src/engine/functions';
import type { Game } from '../../src/engine/game';
import { GameEndError } from '../../src/engine/game-end-error';
import { Ship } from '../../src/engine/model/ship';
import { SpecialEvent } from '../../src/engine/model/special-event';
import { setRandomSource } from '../../src/engine/rng';
import { moveTo, newGame, reachableSystem, useGameCleanup } from './game-helpers';

useGameCleanup();

/** No encounters, no pressure changes, no fabric rips: every random roll is high. */
function quietSpace(): void {
  setRandomSource(() => 0.999);
}

/** A bigger ship with room for crew, so tests can hire. */
function biggerShip(game: Game): Ship {
  const cmdr = game.commander;
  cmdr.ship = new Ship(ShipType.Wasp);
  cmdr.ship.crew[0] = cmdr;
  cmdr.ship.addEquipment(Consts.Weapons[WeaponType.BeamLaser]!);
  return cmdr.ship;
}

describe('warping to a system in range', () => {
  it('uses fuel, takes a day and arrives', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    const start = cmdr.currentSystem!;
    const target = reachableSystem(game);
    game.selectedSystemId = target.id;
    game.newsAddEvent(NewsEvent.CaughtLittering);
    quietSpace();

    const fuel = cmdr.ship.fuel;
    await game.warp(false);

    expect(ui.names).toEqual(['TravelUneventfulTrip']);
    expect(cmdr.currentSystem).toBe(target);
    expect(target.visited).toBe(true);
    expect(cmdr.ship.fuel).toBe(fuel - distance(start, target));
    expect(cmdr.days).toBe(1);
    expect(game.clicks).toBe(0);
    // Set on departure, then counted down on arrival like every other system's.
    expect(start.countDown).toBe(game.countDownStart - 1);
    expect(game.newsEvents).toEqual([]);
    expect(game.paidForNewspaper).toBe(false);
  });

  it('pays mercenaries, insurance and interest on departure', async () => {
    const { game } = newGame();
    const cmdr = game.commander;
    biggerShip(game);
    const merc = game.mercenaries[4]!;
    cmdr.ship.hire(merc);
    cmdr.ship.escapePod = true;
    cmdr.insurance = true;
    cmdr.debt = 2000;
    cmdr.cash = 10000;
    const costs = game.mercenaryCosts + game.insuranceCosts;
    const interest = game.interestCosts;
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    await game.warp(false);
    expect(cmdr.cash).toBe(10000 - costs - interest);
    expect(cmdr.noClaim).toBe(1);
  });

  it("won't leave with too much debt or unpaid costs", async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    game.selectedSystemId = reachableSystem(game).id;

    cmdr.debt = Consts.DebtTooLarge + 1;
    await game.warp(false);
    cmdr.debt = 0;

    biggerShip(game);
    cmdr.ship.hire(game.mercenaries[4]!);
    cmdr.cash = 0;
    await game.warp(false);

    expect(ui.names).toEqual(['DebtTooLargeGrounded', 'LeavingIFMercenaries']);
    expect(cmdr.days).toBe(0);
  });

  it('goes through a wormhole for the tax instead of fuel', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    const [from, to] = game.wormholes;
    moveTo(game, from!);
    game.targetWormhole = true;
    expect(game.warpSystemId).toBe(to);
    cmdr.cash = 5000;
    quietSpace();

    const fuel = cmdr.ship.fuel;
    const tax = game.wormholeCosts;
    expect(tax).toBe(Consts.WormDist * cmdr.ship.fuelCost);

    await game.warp(false);
    expect(ui.names).toEqual(['TravelUneventfulTrip']);
    expect(cmdr.currentSystemId).toBe(to);
    expect(cmdr.ship.fuel).toBe(fuel);
    expect(cmdr.cash).toBe(5000 - tax);
    expect(game.arrivedViaWormhole).toBe(true);
  });

  it('asks Wild to leave when the ship lacks a beam laser', async () => {
    const { game, ui } = newGame({
      ui: { answers: { [AlertType.WildWontStayAboardLaser]: [DialogResult.Cancel] } },
    });
    const cmdr = game.commander;
    biggerShip(game);
    cmdr.ship.removeEquipment(0, 0); // The beam laser.
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Wild]!);
    game.questStatusWild = SpecialEvent.StatusWildStarted;
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    // Cancel: stay put.
    await game.warp(false);
    expect(cmdr.days).toBe(0);

    // OK: Wild stays behind.
    await game.warp(false);
    expect(ui.names).toEqual([
      'WildWontStayAboardLaser',
      'WildWontStayAboardLaser',
      'WildLeavesShip',
      'TravelUneventfulTrip',
    ]);
    expect(game.questStatusWild).toBe(SpecialEvent.StatusWildNotStarted);
    expect(cmdr.ship.wildOnBoard).toBe(false);
  });
});

describe('arriving', () => {
  it('refuels and repairs automatically when those options are on', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    game.options.autoFuel = true;
    game.options.autoRepair = true;
    cmdr.ship.hull = 50;
    cmdr.cash = 100000;
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    await game.warp(false);
    expect(ui.names).toEqual(['TravelUneventfulTrip']);
    expect(cmdr.ship.fuel).toBe(cmdr.ship.fuelTanks);
    expect(cmdr.ship.hull).toBe(cmdr.ship.hullStrength);
    expect(cmdr.cash).toBeLessThan(100000);
  });

  it("says so when it can't afford the automatic fuel and repairs", async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    game.options.autoFuel = true;
    game.options.autoRepair = true;
    cmdr.ship.hull = 10;
    cmdr.cash = 0;
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    await game.warp(false);
    expect(ui.names).toEqual(['TravelUneventfulTrip', 'ArrivalIFFuelRepairs']);
  });

  it('warns about large debts and reminds about small ones every five days', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    cmdr.cash = 100000;
    quietSpace();

    cmdr.debt = Consts.DebtWarning;
    game.selectedSystemId = reachableSystem(game).id;
    await game.warp(false);
    expect(ui.names).toContain('DebtWarning');

    ui.clear();
    cmdr.debt = 100;
    cmdr.days = 4; // The trip makes it day 5.
    cmdr.ship.fuel = cmdr.ship.fuelTanks;
    game.selectedSystemId = reachableSystem(game).id;
    await game.warp(false);
    expect(ui.names).toContain('DebtReminder');
  });

  it('shows the newspaper on arrival if asked to, paying for it', async () => {
    const { game, ui } = newGame({
      ui: { answers: { [AlertType.ArrivalBuyNewspaper]: [DialogResult.Yes] } },
    });
    game.options.newsAutoShow = true;
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    await game.warp(false);
    expect(ui.names).toEqual(['TravelUneventfulTrip', 'ArrivalBuyNewspaper', 'Alert']);
    expect(game.commander.cash).toBe(1000 - 3);
    expect(game.paidForNewspaper).toBe(true);
    const [head, text] = ui.alerts[2]!.args;
    expect(head).toBe(game.newspaperHead);
    expect(text!.length).toBeGreaterThan(0);
  });

  it('feeds tribbles on the food in the hold', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    cmdr.ship.tribbles = 10;
    cmdr.ship.cargo[TradeItemType.Food] = 5;
    cmdr.priceCargo[TradeItemType.Food] = 500;
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    await game.warp(false);
    // With every roll at its highest: 5 - 4 = 1 unit eaten, making 100 more
    // tribbles, which then breed 1 + 109 more.
    expect(ui.names).toEqual(['TravelUneventfulTrip', 'TribblesAteFood', 'TribblesInspector']);
    expect(ui.alerts[2]!.args).toEqual(['220']);
    expect(cmdr.ship.cargo[TradeItemType.Food]).toBe(4);
    expect(cmdr.priceCargo[TradeItemType.Food]).toBe(400);
    expect(cmdr.ship.tribbles).toBe(220);
  });

  it('melts down an undelivered reactor', async () => {
    const { game, ui } = newGame();
    game.questStatusReactor = SpecialEvent.StatusReactorDate - 1;
    game.commander.ship.cargo.fill(0);
    game.selectedSystemId = reachableSystem(game).id;
    quietSpace();

    const error = await game.warp(false).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameEndError);
    expect(game.endStatus).toBe(GameEndType.Killed);
    expect(ui.names.slice(-2)).toEqual(['ReactorMeltdown', 'ReactorDestroyed']);
  });

  it('gives the lightning shield to a commander with exactly one of everything at Og', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    cmdr.ship = new Ship(ShipType.Wasp);
    cmdr.ship.crew[0] = cmdr;
    cmdr.ship.cargo.fill(1);
    game.selectedSystemId = StarSystemId.Og;
    quietSpace();

    await game.warpDirect();
    expect(ui.names).toContain('Egg');
    expect(cmdr.ship.hasShield(2)).toBe(true);
    expect(cmdr.ship.cargo.every((n) => n === 0)).toBe(true);
  });
});

describe('the passing of days', () => {
  it('lets the police record drift back towards neutral', async () => {
    const { game } = newGame({ difficulty: Difficulty.Hard });
    const cmdr = game.commander;

    cmdr.policeRecordScore = 20;
    await game.incDays(9);
    expect(cmdr.policeRecordScore).toBe(17);

    cmdr.policeRecordScore = -50;
    await game.incDays(9); // Hard: one point per three days.
    expect(cmdr.policeRecordScore).toBe(-47);
  });

  it('lets Gemulon fall if the warning comes too late', async () => {
    const { game } = newGame();
    game.questStatusGemulon = SpecialEvent.StatusGemulonDate;
    await game.incDays(1);

    const gemulon = game.universe[StarSystemId.Gemulon]!;
    expect(game.questStatusGemulon).toBe(SpecialEvent.StatusGemulonTooLate);
    expect(gemulon.specialEventType).toBe(SpecialEventType.GemulonInvaded);
    expect(gemulon.techLevel).toBe(TechLevel.PreAgricultural);
    expect(gemulon.politicalSystemType).toBe(PoliticalSystemType.Anarchy);
  });

  it('runs the experiment if nobody stops it', async () => {
    const { game, ui } = newGame();
    game.questStatusExperiment = SpecialEvent.StatusExperimentDate;
    await game.incDays(1);

    expect(game.questStatusExperiment).toBe(SpecialEvent.StatusExperimentPerformed);
    expect(game.fabricRipProbability).toBe(Consts.FabricRipInitialProbability);
    expect(game.universe[StarSystemId.Daled]!.specialEventType).toBe(
      SpecialEventType.ExperimentFailed,
    );
    expect(ui.names).toEqual(['SpecialExperimentPerformed']);
    expect(game.newsEvents).toEqual([NewsEvent.ExperimentPerformed]);
  });

  it('makes passengers impatient, then useless', async () => {
    const { game, ui } = newGame();
    biggerShip(game);
    const jarek = game.mercenaries[CrewMemberId.Jarek]!;
    game.commander.ship.hire(jarek);
    game.questStatusJarek = SpecialEvent.StatusJarekStarted;

    for (let day = 0; day < 12; day++) await game.incDays(1);
    expect(ui.names).toEqual(['SpecialPassengerConcernedJarek', 'SpecialPassengerImpatientJarek']);
    expect(jarek.skills).toEqual([0, 0, 0, 0]);
    expect(game.questStatusJarek).toBe(SpecialEvent.StatusJarekImpatient);
  });

  it('restores the space monster 5% a day', async () => {
    const { game } = newGame();
    game.spaceMonster.hull = 100;
    await game.incDays(2);
    expect(game.spaceMonster.hull).toBe(110); // 100 * 1.05^2 = 110.25
  });
});

describe('being arrested', () => {
  it('jails, fines and clears the record', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    cmdr.policeRecordScore = -40;
    cmdr.cash = 10000;
    cmdr.ship.cargo[TradeItemType.Narcotics] = 3;
    const worth = cmdr.worth;

    await game.arrested();

    const fine = (1 + Math.trunc((worth * 40) / 50000)) * 500;
    expect(ui.names).toEqual(['EncounterArrested', 'JailConvicted', 'JailIllegalGoodsImpounded']);
    expect(ui.alerts[1]!.args).toEqual(['40 days', `${fine.toLocaleString('en-US')} credits`]);
    expect(cmdr.cash).toBe(10000 - fine);
    expect(cmdr.ship.cargo[TradeItemType.Narcotics]).toBe(0);
    expect(cmdr.policeRecordScore).toBe(Consts.PoliceRecordScoreDubious);
    expect(cmdr.days).toBe(40);
  });

  it('sells the ship to pay a fine the commander can’t afford', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    cmdr.policeRecordScore = -80;
    cmdr.cash = 0;
    cmdr.ship = new Ship(ShipType.Wasp);
    cmdr.ship.crew[0] = cmdr;

    await game.arrested();
    expect(ui.names).toContain('JailShipSold');
    expect(ui.names).toContain('FleaBuilt');
    expect(cmdr.ship.type).toBe(ShipType.Flea);
    expect(cmdr.ship.crew[0]).toBe(cmdr);
  });

  it('sends every mercenary away, even a single one', async () => {
    // The original kept a lone mercenary: see the PORT note in Game.arrested.
    const { game, ui } = newGame();
    const cmdr = game.commander;
    biggerShip(game);
    cmdr.cash = 100000;
    cmdr.policeRecordScore = -30;
    cmdr.ship.hire(game.mercenaries[4]!);

    await game.arrested();
    expect(ui.names).toContain('JailMercenariesLeave');
    expect(cmdr.ship.crew.slice(1).every((c) => c === null)).toBe(true);
  });

  it('takes passengers home and off the ship', async () => {
    // The original reset the quests but left the passengers aboard.
    const { game, ui } = newGame();
    const cmdr = game.commander;
    biggerShip(game);
    cmdr.cash = 1000000;
    cmdr.policeRecordScore = -30;
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Jarek]!);
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Wild]!);
    game.questStatusJarek = 3;
    game.questStatusWild = 3;

    await game.arrested();
    expect(ui.names).toEqual([
      'EncounterArrested',
      'JailConvicted',
      'WildArrested',
      'JarekTakenHome',
    ]);
    expect(cmdr.ship.crewCount).toBe(1);
    expect(game.questStatusJarek).toBe(SpecialEvent.StatusJarekNotStarted);
    expect(game.questStatusWild).toBe(SpecialEvent.StatusWildNotStarted);
    expect(game.newsEvents).toEqual([NewsEvent.WildArrested]);
  });

  it('resets passenger quests even when mercenaries leave too', async () => {
    // The original cleared every crew slot when mercenaries left, so the
    // passenger checks that followed found nobody and the quests got stuck.
    const { game, ui } = newGame();
    const cmdr = game.commander;
    biggerShip(game);
    cmdr.cash = 1000000;
    cmdr.policeRecordScore = -30;
    cmdr.ship.hire(game.mercenaries[4]!);
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Jarek]!);
    game.questStatusJarek = 3;

    await game.arrested();
    expect(ui.names).toEqual([
      'EncounterArrested',
      'JailConvicted',
      'JailMercenariesLeave',
      'JarekTakenHome',
    ]);
    expect(cmdr.ship.crewCount).toBe(1);
    expect(game.questStatusJarek).toBe(SpecialEvent.StatusJarekNotStarted);
  });
});

describe('escaping in the pod', () => {
  it('pays out the insurance and builds a flea', async () => {
    const { game, ui } = newGame();
    const cmdr = game.commander;
    cmdr.ship.escapePod = true;
    cmdr.insurance = true;
    cmdr.cash = 100;
    const payout = cmdr.ship.baseWorth(true);

    await game.escapeWithPod();
    expect(ui.names).toEqual(['EncounterEscapePodActivated', 'InsurancePayoff', 'FleaBuilt']);
    expect(cmdr.cash).toBe(100 + payout - Consts.FleaConversionCost);
    expect(cmdr.ship.type).toBe(ShipType.Flea);
    expect(cmdr.insurance).toBe(false);
    expect(cmdr.days).toBe(3);
  });

  it('borrows for the flea when cash runs short', async () => {
    const { game } = newGame();
    const cmdr = game.commander;
    cmdr.cash = 500;

    await game.escapeWithPod();
    expect(cmdr.cash).toBe(0);
    expect(cmdr.debt).toBe(Consts.FleaConversionCost - 500);
  });
});

describe('the newspaper', () => {
  it('costs difficulty + 1 credits, once per visit', async () => {
    const { game, ui } = newGame({
      difficulty: Difficulty.Easy,
      ui: { answers: { [AlertType.ArrivalBuyNewspaper]: [DialogResult.Yes] } },
    });
    await game.showNewspaper();
    await game.showNewspaper();
    expect(ui.names).toEqual(['ArrivalBuyNewspaper', 'Alert', 'Alert']);
    expect(game.commander.cash).toBe(998);
  });

  it('prints the same stories each time it is read on the same day', () => {
    const { game } = newGame();
    game.newsAddEvent(NewsEvent.CaughtLittering);
    const text = game.newspaperText;
    expect(text).toContain(game.commander.name);
    expect(game.newspaperText).toBe(text);
  });

  it('replaces a news event, as when a famous captain is destroyed', () => {
    const { game } = newGame();
    game.newsAddEvent(NewsEvent.CaptAhabAttacked);
    game.newsAddEvent(NewsEvent.CaughtLittering);
    game.newsReplaceEvent(NewsEvent.CaptAhabAttacked, NewsEvent.CaptAhabDestroyed);
    expect(game.newsEvents).toEqual([NewsEvent.CaughtLittering, NewsEvent.CaptAhabDestroyed]);
  });
});
