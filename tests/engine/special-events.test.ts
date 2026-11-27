import { describe, expect, it } from 'vitest';
import { DialogResult } from '../../src/engine/data/alerts';
import { Consts } from '../../src/engine/data/consts';
import {
  AlertType,
  CrewMemberId,
  GameEndType,
  ShipType,
  SpecialEventType,
  StarSystemId,
  WeaponType,
} from '../../src/engine/data/enums';
import type { Game } from '../../src/engine/game';
import { GameEndError } from '../../src/engine/game-end-error';
import { Ship } from '../../src/engine/model/ship';
import { SpecialEvent } from '../../src/engine/model/special-event';
import { acceptSpecialEvent } from '../../src/engine/services';
import { moveTo, newGame, useGameCleanup } from './game-helpers';

useGameCleanup();

/** A game whose current system has the given event. */
function eventGame(type: SpecialEventType, options: Parameters<typeof newGame>[0] = {}) {
  const result = newGame(options);
  const system = result.game.commander.currentSystem!;
  system.specialEventType = type;
  return { ...result, cmdr: result.game.commander, system };
}

function roomyShip(game: Game): Ship {
  const cmdr = game.commander;
  cmdr.ship = new Ship(ShipType.Wasp);
  cmdr.ship.crew[0] = cmdr;
  cmdr.ship.addEquipment(Consts.Weapons[WeaponType.BeamLaser]!);
  return cmdr.ship;
}

describe('accepting a special event', () => {
  it('charges its price and removes it', async () => {
    const { game, ui, cmdr, system } = eventGame(SpecialEventType.Skill);
    cmdr.cash = 5000;
    const skills = cmdr.skills.reduce((a, b) => a + b, 0);

    await acceptSpecialEvent(game);
    expect(ui.names).toEqual(['SpecialSkillIncrease']);
    expect(cmdr.cash).toBe(2000);
    expect(cmdr.skills.reduce((a, b) => a + b, 0)).toBe(skills + 1);
    expect(system.specialEventType).toBe(SpecialEventType.NA);
  });

  it('refuses when the commander cannot pay', async () => {
    const { game, ui, system } = eventGame(SpecialEventType.Moon);
    await acceptSpecialEvent(game);
    expect(ui.names).toEqual(['SpecialIF']);
    expect(system.specialEventType).toBe(SpecialEventType.Moon);
  });

  it('pays out a negative price, like the lottery', async () => {
    const { game, cmdr } = eventGame(SpecialEventType.Lottery);
    await acceptSpecialEvent(game);
    expect(cmdr.cash).toBe(2000);
  });
});

describe('special events', () => {
  it('sells the moon, then ends the game in retirement there', async () => {
    const { game, cmdr, system } = eventGame(SpecialEventType.Moon);
    cmdr.cash = 600000;
    await game.handleSpecialEvent();
    expect(game.questStatusMoon).toBe(SpecialEvent.StatusMoonBought);
    expect(cmdr.cash).toBe(100000);

    system.specialEventType = SpecialEventType.MoonRetirement;
    const error = await game.handleSpecialEvent().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameEndError);
    expect((error as GameEndError).endType).toBe(GameEndType.BoughtMoon);
    expect(game.endStatus).toBe(GameEndType.BoughtMoon);
    expect(game.questStatusMoon).toBe(SpecialEvent.StatusMoonDone);
  });

  it('takes Jarek aboard only if there is room, and lets him off at Devidia', async () => {
    const { game, ui, cmdr, system } = eventGame(SpecialEventType.Jarek);

    await game.handleSpecialEvent();
    expect(ui.names).toEqual(['SpecialNoQuarters']);
    expect(system.specialEventType).toBe(SpecialEventType.Jarek);

    roomyShip(game);
    await game.handleSpecialEvent();
    expect(cmdr.ship.jarekOnBoard).toBe(true);
    expect(game.questStatusJarek).toBe(SpecialEvent.StatusJarekStarted);
    expect(ui.alerts[1]!.args).toEqual(['Jarek']);
    expect(system.specialEventType).toBe(SpecialEventType.NA);

    const devidia = moveTo(game, StarSystemId.Devidia);
    expect(devidia.specialEventType).toBe(SpecialEventType.JarekGetsOut);
    await game.handleSpecialEvent();
    expect(cmdr.ship.jarekOnBoard).toBe(false);
    expect(game.questStatusJarek).toBe(SpecialEvent.StatusJarekDone);
  });

  it('keeps the Japori quest available, since it can be failed and retried', async () => {
    const { game, ui, system } = eventGame(SpecialEventType.Japori);
    await game.handleSpecialEvent();
    expect(ui.names).toEqual(['AntidoteOnBoard']);
    expect(game.questStatusJapori).toBe(SpecialEvent.StatusJaporiInTransit);
    expect(system.specialEventType).toBe(SpecialEventType.Japori);
  });

  it('erases a criminal record and raises sell prices to match', async () => {
    const { game, cmdr } = eventGame(SpecialEventType.EraseRecord);
    cmdr.cash = 10000;
    cmdr.policeRecordScore = -50;
    game.priceCargoSell.fill(90);

    await game.handleSpecialEvent();
    expect(cmdr.policeRecordScore).toBe(Consts.PoliceRecordScoreClean);
    expect(game.priceCargoSell[0]).toBe(100);
  });

  it('sells sealed canisters of something random', async () => {
    const { game, cmdr } = eventGame(SpecialEventType.CargoForSale);
    await game.handleSpecialEvent();
    expect(cmdr.ship.filledCargoBays).toBe(3);
    expect(cmdr.priceCargo.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(cmdr.cash).toBe(0);
  });

  it('upgrades the hull after the Scarab is destroyed, without removing the event', async () => {
    const { game, cmdr, system } = eventGame(SpecialEventType.ScarabUpgradeHull);
    const hull = cmdr.ship.hull;
    await game.handleSpecialEvent();
    expect(cmdr.ship.hullUpgraded).toBe(true);
    expect(cmdr.ship.hull).toBe(hull + Consts.HullUpgrade);
    expect(game.questStatusScarab).toBe(SpecialEvent.StatusScarabDone);
    expect(system.specialEventType).toBe(SpecialEventType.ScarabUpgradeHull);
  });

  it('advances the Dragonfly chase one system at a time', async () => {
    const { game, system } = eventGame(SpecialEventType.Dragonfly);
    await game.handleSpecialEvent();
    expect(game.questStatusDragonfly).toBe(SpecialEvent.StatusDragonflyFlyBaratas);
    system.specialEventType = SpecialEventType.DragonflyBaratas;
    await game.handleSpecialEvent();
    expect(game.questStatusDragonfly).toBe(SpecialEvent.StatusDragonflyFlyMelina);
  });

  it('turns the reactor down when Wild would rather stay', async () => {
    const { game, ui, cmdr, system } = eventGame(SpecialEventType.Reactor, {
      ui: { answers: { [AlertType.WildWontStayAboardReactor]: [DialogResult.Cancel] } },
    });
    roomyShip(game);
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Wild]!);
    game.questStatusWild = SpecialEvent.StatusWildStarted;

    await game.handleSpecialEvent();
    expect(ui.names).toEqual(['WildWontStayAboardReactor']);
    expect(system.specialEventType).toBe(SpecialEventType.Reactor);

    // This time, say goodbye to Wild.
    await game.handleSpecialEvent();
    expect(ui.names.slice(1)).toEqual([
      'WildWontStayAboardReactor',
      'WildLeavesShip',
      'ReactorOnBoard',
    ]);
    expect(cmdr.ship.wildOnBoard).toBe(false);
    expect(game.questStatusReactor).toBe(SpecialEvent.StatusReactorFuelOk);
  });

  it("leaves Wild's nephew at Kravat, skilled where the commander is weakest", async () => {
    const { game, cmdr } = eventGame(SpecialEventType.WildGetsOut, { skills: [9, 2, 6, 3] });
    roomyShip(game);
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Wild]!);

    await game.handleSpecialEvent();
    const zeethibal = game.mercenaries[CrewMemberId.Zeethibal]!;
    expect(zeethibal.currentSystemId).toBe(StarSystemId.Kravat);
    expect(zeethibal.skills).toEqual([5, 10, 5, 8]);
    expect(cmdr.ship.wildOnBoard).toBe(false);
    expect(game.questStatusWild).toBe(SpecialEvent.StatusWildDone);
  });

  it('buys tribbles off the commander', async () => {
    const { game, cmdr } = eventGame(SpecialEventType.TribbleBuyer);
    cmdr.ship.tribbles = 1001;
    await game.handleSpecialEvent();
    expect(cmdr.ship.tribbles).toBe(0);
    expect(cmdr.cash).toBe(1500);
  });
});
