import { afterEach, describe, expect, it } from 'vitest';
import { Consts } from '../../../src/engine/data/consts';
import {
  CrewMemberId,
  PoliticalSystemType,
  ShipType,
  ShipyardId,
  Size,
  SpecialEventType,
  SpecialResource,
  SystemPressure,
  TechLevel,
  TradeItemType,
} from '../../../src/engine/data/enums';
import { setCurrentGame } from '../../../src/engine/game-context';
import { Ship } from '../../../src/engine/model/ship';
import { SpecialEvent } from '../../../src/engine/model/special-event';
import { StarSystem } from '../../../src/engine/model/star-system';
import { setRandomSource } from '../../../src/engine/rng';
import { makeSystem, useFakeGame } from '../fake-game';

afterEach(() => {
  setCurrentGame(null);
  setRandomSource(Math.random);
});

describe('StarSystem trade item quantities', () => {
  // With a random source of 0, GetRandom(9, 14) is 9 and the +/- GetRandom(10)
  // adjustment is 0. A Medium system has size factor 2 + 1 = 3.
  const generate = (options: Parameters<typeof makeSystem>[1] = {}) => {
    useFakeGame();
    setRandomSource(() => 0);
    return makeSystem(0, { size: Size.Medium, techLevel: TechLevel.HiTech, ...options });
  };

  it('scales by size and distance from the top production tech level', () => {
    const system = generate();
    // Water peaks at Medieval (2): 3 * (9 - |2 - 7|) = 12.
    expect(system.tradeItems[TradeItemType.Water]).toBe(12);
  });

  it('limits narcotics and robots by difficulty', () => {
    const system = generate();
    // Robots peak at HiTech: 3 * 9 = 27, then 27 * 3 / 4 + 1 = 21 on Normal.
    expect(system.tradeItems[TradeItemType.Robots]).toBe(21);
    // Narcotics peak at Industrial (5): 3 * 7 = 21, then 21 * 3 / 4 + 1 = 16.
    expect(system.tradeItems[TradeItemType.Narcotics]).toBe(16);
  });

  it('cuts supply under the matching pressure', () => {
    const system = generate({ systemPressure: SystemPressure.Drought });
    expect(system.tradeItems[TradeItemType.Water]).toBe(2); // 12 / 5
  });

  it('ignores special resources at creation, because the system is not yet visited', () => {
    const system = generate({ specialResource: SpecialResource.SweetOceans });
    expect(system.specialResource).toBe(SpecialResource.Nothing);
    expect(system.tradeItems[TradeItemType.Water]).toBe(12);

    system.visited = true;
    expect(system.specialResource).toBe(SpecialResource.SweetOceans);
    system.initializeTradeItems();
    expect(system.tradeItems[TradeItemType.Water]).toBe(16); // 12 * 4 / 3
  });

  it('can be priced by TradeItem.standardPrice', () => {
    const system = generate();
    // Water at HiTech: 30 + 7 * 3 = 51. Democracy has many traders (5): 51 * 90 / 100 = 45.
    // Medium size (2): 45 * 98 / 100 = 44.
    expect(Consts.TradeItems[TradeItemType.Water]!.standardPrice(system)).toBe(44);
  });

  it('has none of what the system cannot produce', () => {
    const fascist = generate({ politicalSystemType: PoliticalSystemType.Fascist });
    expect(fascist.itemTraded(Consts.TradeItems[TradeItemType.Narcotics]!)).toBe(false);
    expect(fascist.tradeItems[TradeItemType.Narcotics]).toBe(0);

    const primitive = generate({ techLevel: TechLevel.PreAgricultural });
    expect(primitive.tradeItems[TradeItemType.Robots]).toBe(0);
    // Pre-agricultural systems can't make robots, but anyone can use water.
    expect(primitive.itemUsed(Consts.TradeItems[TradeItemType.Water]!)).toBe(true);
    expect(primitive.itemUsed(Consts.TradeItems[TradeItemType.Robots]!)).toBe(false);
  });
});

describe('StarSystem', () => {
  it('measures distance from the commander and checks warp range', () => {
    const game = useFakeGame();
    const [here, near, far] = [game.universe[0]!, game.universe[1]!, game.universe[2]!];

    expect(near.distance).toBe(10);
    expect(far.distance).toBe(50);
    expect(here.destOk).toBe(false);
    expect(near.destOk).toBe(true); // 10 <= 14 fuel
    expect(far.destOk).toBe(false);

    game.wormholes = [0, 2];
    expect(far.destOk).toBe(true);
  });

  it("lists mercenaries at the commander's system who aren't aboard", () => {
    const game = useFakeGame();
    const alyssa = game.mercenaries[CrewMemberId.Alyssa]!;
    const here = game.universe[0]!;

    expect(here.mercenariesForHire).toEqual([]);
    alyssa.currentSystemId = 0;
    expect(here.mercenariesForHire).toEqual([alyssa]);
    // Like the original, any system reports the mercenaries at the commander's system.
    expect(game.universe[2]!.mercenariesForHire).toEqual([alyssa]);

    game.cmdr.ship = new Ship(ShipType.Beetle); // three crew quarters
    game.cmdr.ship.crew[0] = game.cmdr;
    game.cmdr.ship.hire(alyssa);
    expect(here.mercenariesForHire).toEqual([]);
  });

  it('looks up its shipyard and special event', () => {
    const game = useFakeGame();
    const system = game.universe[0]!;
    expect(system.shipyard).toBeNull();
    expect(system.specialEvent).toBeNull();

    system.shipyardId = ShipyardId.Corellian;
    system.specialEventType = SpecialEventType.Lottery;
    expect(system.shipyard).toBe(Consts.Shipyards[ShipyardId.Corellian]);
    expect(system.specialEvent).toBe(Consts.SpecialEvents[SpecialEventType.Lottery]);
  });

  it('shows special events when their conditions are met', () => {
    const game = useFakeGame();
    const system = game.universe[0]!;
    const show = (type: SpecialEventType) => {
      system.specialEventType = type;
      return system.showSpecialButton();
    };

    expect(show(SpecialEventType.NA)).toBe(false);
    expect(show(SpecialEventType.Lottery)).toBe(true);

    // Clean record: Jarek's request is shown, the Wild one isn't.
    expect(show(SpecialEventType.Jarek)).toBe(true);
    expect(show(SpecialEventType.Wild)).toBe(false);
    game.cmdr.policeRecordScore = Consts.PoliceRecordScoreDubious - 1;
    expect(show(SpecialEventType.Jarek)).toBe(false);
    expect(show(SpecialEventType.Wild)).toBe(true);

    // The moon is offered once the commander is worth 80% of its price.
    expect(show(SpecialEventType.Moon)).toBe(false);
    game.cmdr.cash = SpecialEvent.MoonCost;
    expect(show(SpecialEventType.Moon)).toBe(true);
    game.questStatusMoon = SpecialEvent.StatusMoonBought;
    expect(show(SpecialEventType.Moon)).toBe(false);
    expect(show(SpecialEventType.MoonRetirement)).toBe(true);

    // Dragonfly leg 2 shows only after leg 1.
    expect(show(SpecialEventType.DragonflyMelina)).toBe(false);
    game.questStatusDragonfly = SpecialEvent.StatusDragonflyFlyMelina;
    expect(show(SpecialEventType.DragonflyMelina)).toBe(true);
  });

  it('round-trips through its save format without generating new quantities', () => {
    const game = useFakeGame();
    const system = game.universe[1]!;
    system.visited = true;
    system.countDown = 3;
    system.shipyardId = ShipyardId.Sienar;
    const hash = JSON.parse(JSON.stringify(system.serialize()));

    setRandomSource(() => {
      throw new Error('fromHash should not use the RNG');
    });
    const loaded = StarSystem.fromHash(hash);
    expect(loaded.serialize()).toEqual(hash);
    expect(loaded.name).toBe(system.name);
    expect(loaded.tradeItems).not.toBe(system.tradeItems);
  });
});
