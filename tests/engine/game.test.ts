import { describe, expect, it } from 'vitest';
import { Consts } from '../../src/engine/data/consts';
import {
  CrewMemberId,
  Difficulty,
  PoliticalSystemType,
  ShipType,
  ShipyardId,
  Size,
  SpecialEventType,
  StarSystemId,
  TechLevel,
  VeryRareEncounter,
} from '../../src/engine/data/enums';
import { Strings } from '../../src/engine/data/strings';
import { distance } from '../../src/engine/functions';
import { FutureVersionError, Game } from '../../src/engine/game';
import { currentGame } from '../../src/engine/game-context';
import { Ship } from '../../src/engine/model/ship';
import { newGame, reload, useGameCleanup } from './game-helpers';

useGameCleanup();

/** System ids with each special event type. */
function eventLocations(game: Game): Map<SpecialEventType, StarSystemId[]> {
  const map = new Map<SpecialEventType, StarSystemId[]>();
  for (const system of game.universe) {
    const list = map.get(system.specialEventType) ?? [];
    list.push(system.id);
    map.set(system.specialEventType, list);
  }
  return map;
}

describe('Game.newGame', () => {
  it('becomes the current game and names the commander', () => {
    const { game } = newGame({ name: 'Jameson' });
    expect(currentGame()).toBe(game);
    expect(game.commander.name).toBe('Jameson');
    expect(game.mercenaries[CrewMemberId.Commander]).toBe(game.commander);
  });

  it('is reproducible from the random seed', () => {
    const a = JSON.stringify(newGame({ seed: 42 }).game.serialize());
    const b = JSON.stringify(newGame({ seed: 42 }).game.serialize());
    const c = JSON.stringify(newGame({ seed: 43 }).game.serialize());
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  for (const seed of [1, 2, 3, 4, 5]) {
    it(`generates a valid universe (seed ${seed})`, () => {
      const { game } = newGame({ seed });
      const universe = game.universe;

      expect(universe).toHaveLength(Strings.SystemNames.length);
      universe.forEach((system, i) => {
        expect(system.id).toBe(i);
        expect(system.x).toBeGreaterThanOrEqual(0);
        expect(system.x).toBeLessThanOrEqual(Consts.GalaxyWidth);
        expect(system.y).toBeGreaterThanOrEqual(0);
        expect(system.y).toBeLessThanOrEqual(Consts.GalaxyHeight);
        // Galvon is forced to hi-tech below, whatever its government allows.
        const polSys = system.politicalSystem;
        if (system.id !== StarSystemId.Galvon) {
          expect(system.techLevel).toBeGreaterThanOrEqual(polSys.minimumTechLevel);
          expect(system.techLevel).toBeLessThanOrEqual(polSys.maximumTechLevel);
        }
      });

      // Galvon is a large hi-tech monarchy (the princess's home).
      const galvon = universe[StarSystemId.Galvon]!;
      expect(galvon.size).toBe(Size.Large);
      expect(galvon.politicalSystemType).toBe(PoliticalSystemType.Monarchy);
      expect(galvon.techLevel).toBe(TechLevel.HiTech);

      // Six wormholes, at six different systems.
      expect(new Set(game.wormholes).size).toBe(6);

      // Every shipyard is at a hi-tech system.
      const shipyards = universe.filter((s) => s.shipyardId !== ShipyardId.NA);
      expect(shipyards.length).toBeGreaterThan(0);
      expect(shipyards.length).toBeLessThanOrEqual(Consts.Shipyards.length);
      for (const s of shipyards) expect(s.techLevel).toBe(TechLevel.HiTech);
    });

    it(`places every special event (seed ${seed})`, () => {
      const { game } = newGame({ seed });
      const events = eventLocations(game);

      // Fixed locations.
      const fixed: [StarSystemId, SpecialEventType][] = [
        [StarSystemId.Baratas, SpecialEventType.DragonflyBaratas],
        [StarSystemId.Zalkon, SpecialEventType.DragonflyDestroyed],
        [StarSystemId.Utopia, SpecialEventType.MoonRetirement],
        [StarSystemId.Kravat, SpecialEventType.WildGetsOut],
        [StarSystemId.Galvon, SpecialEventType.Princess],
        [StarSystemId.Qonos, SpecialEventType.PrincessQonos],
      ];
      for (const [id, type] of fixed) expect(game.universe[id]!.specialEventType).toBe(type);

      // The Scarab waits at the end of a wormhole.
      const scarab = events.get(SpecialEventType.ScarabDestroyed)!;
      expect(scarab).toHaveLength(1);
      expect(game.wormholes).toContain(scarab[0]);

      // The artifact goes to a hi-tech system.
      const artifact = events.get(SpecialEventType.ArtifactDelivery)!;
      expect(game.universe[artifact[0]!]!.techLevel).toBe(TechLevel.HiTech);

      // Quests that start far from where they end.
      const distant: [SpecialEventType, StarSystemId][] = [
        [SpecialEventType.Reactor, StarSystemId.Nix],
        [SpecialEventType.Gemulon, StarSystemId.Gemulon],
        [SpecialEventType.Experiment, StarSystemId.Daled],
        [SpecialEventType.Sculpture, StarSystemId.Endor],
      ];
      for (const [type, base] of distant) {
        const at = events.get(type)!;
        expect(at).toHaveLength(1);
        expect(distance(game.universe[at[0]!]!, game.universe[base]!)).toBeGreaterThanOrEqual(70);
      }

      // Each randomly placed event appears as often as its Occurrence says.
      // (Below Normal, the commander's system also gets a Lottery; not here.)
      for (const event of Consts.SpecialEvents)
        if (event.occurrence > 0)
          expect(events.get(event.type) ?? [], SpecialEventType[event.type]).toHaveLength(
            event.occurrence,
          );
    });

    it(`starts the commander somewhere sensible (seed ${seed})`, () => {
      const { game } = newGame({ seed });
      const cmdr = game.commander;
      const start = cmdr.currentSystem!;

      expect(start.visited).toBe(true);
      expect(start.specialEventType).toBe(SpecialEventType.NA);
      expect(start.techLevel).toBeGreaterThan(TechLevel.PreAgricultural);
      expect(start.techLevel).toBeLessThan(TechLevel.HiTech);
      const reachable = game.universe.filter(
        (s) => s !== start && distance(s, start) <= cmdr.ship.fuelTanks,
      );
      expect(reachable.length).toBeGreaterThanOrEqual(3);

      expect(cmdr.ship.type).toBe(ShipType.Gnat);
      expect(cmdr.cash).toBe(1000);
      expect(game.warpSystem).toBeNull();
    });

    it(`hires out mercenaries, at most three per system (seed ${seed})`, () => {
      const { game } = newGame({ seed });
      const perSystem = new Map<number, number>();
      game.mercenaries.forEach((merc, i) => {
        expect(merc, `mercenary ${i}`).not.toBeNull();
        expect(merc!.id).toBe(i);
        if (!Consts.SpecialCrewMemberIds.includes(i) && i !== CrewMemberId.Zeethibal) {
          const id = merc!.currentSystemId;
          expect(id).not.toBe(StarSystemId.NA);
          perSystem.set(id, (perSystem.get(id) ?? 0) + 1);
        }
      });
      for (const [id, count] of perSystem)
        expect(count, Strings.SystemNames[id]).toBeLessThanOrEqual(
          id === StarSystemId.Kravat ? 2 : 3,
        );
    });
  }

  it('crews the special ships with their pilots, scaled by difficulty', () => {
    const { game } = newGame({ difficulty: Difficulty.Hard });
    expect(game.dragonfly.crew[0]).toBe(game.mercenaries[CrewMemberId.Dragonfly]);
    expect(game.mercenaries[CrewMemberId.Dragonfly]!.skills).toEqual([7, 9, 1, 9]);
    expect(game.mercenaries[CrewMemberId.SpaceMonster]!.skills).toEqual([11, 11, 1, 4]);
    expect(game.spaceMonster.weapons.filter((w) => w !== null)).toHaveLength(3);
    expect(game.scorpion.shields.filter((s) => s !== null)).toHaveLength(2);
  });

  it('prices goods at the starting system', () => {
    const { game } = newGame();
    const system = game.commander.currentSystem!;
    Consts.TradeItems.forEach((item, i) => {
      if (system.itemTraded(item)) {
        expect(game.priceCargoBuy[i]).toBeGreaterThan(game.priceCargoSell[i]!);
      } else expect(game.priceCargoBuy[i]).toBe(0);
    });
  });

  it('lists all six very rare encounters', () => {
    const { game } = newGame();
    expect(game.veryRareEncounters).toEqual([
      VeryRareEncounter.MarieCeleste,
      VeryRareEncounter.CaptainAhab,
      VeryRareEncounter.CaptainConrad,
      VeryRareEncounter.CaptainHuie,
      VeryRareEncounter.BottleOld,
      VeryRareEncounter.BottleGood,
    ]);
  });

  it('puts a lottery win at the start below Normal difficulty', () => {
    expect(
      newGame({ difficulty: Difficulty.Easy }).game.commander.currentSystem!.specialEventType,
    ).toBe(SpecialEventType.Lottery);
    expect(
      newGame({ difficulty: Difficulty.Normal }).game.commander.currentSystem!.specialEventType,
    ).toBe(SpecialEventType.NA);
  });
});

describe('Game save data', () => {
  it('survives a save and load unchanged', () => {
    const { game } = newGame({ seed: 7 });
    game.commander.cash = 12345;
    game.questStatusJarek = 3;
    game.newsAddEvent(5);
    game.options.autoFuel = true;
    game.selectedSystemId = game.destinations[0]!;

    const saved = JSON.stringify(game.serialize());
    const loaded = reload(game);

    expect(currentGame()).toBe(loaded);
    expect(JSON.stringify(loaded.serialize())).toBe(saved);
    expect(loaded.commander.cash).toBe(12345);
    expect(loaded.options.autoFuel).toBe(true);
    expect(loaded.warpSystem!.id).toBe(game.warpSystem!.id);
  });

  it('links the loaded commander and crew to the loaded mercenaries', () => {
    const { game } = newGame({ seed: 8 });
    const merc = game.mercenaries[5]!;
    game.commander.ship.crew[1] = merc;

    const loaded = reload(game);
    expect(loaded.mercenaries[CrewMemberId.Commander]).toBe(loaded.commander);
    expect(loaded.commander.ship.crew[0]).toBe(loaded.commander);
    expect(loaded.commander.ship.crew[1]).toBe(loaded.mercenaries[5]);
    expect(loaded.dragonfly.crew[0]).toBe(loaded.mercenaries[CrewMemberId.Dragonfly]);
  });

  it('removes very rare encounters after a load', () => {
    // The original couldn't: see the PORT note in Game.fromHash.
    const { game } = newGame();
    const loaded = reload(game);
    loaded.veryRareEncounters.splice(
      loaded.veryRareEncounters.indexOf(VeryRareEncounter.BottleOld),
      1,
    );
    expect(loaded.veryRareEncounters).not.toContain(VeryRareEncounter.BottleOld);
  });

  it('refuses saves from a newer version', () => {
    const { game, ui } = newGame();
    const hash = { ...game.serialize(), _version: '3.00' };
    expect(() => Game.fromHash(hash, ui)).toThrow(FutureVersionError);
  });

  it('fills in missing options with defaults', () => {
    const { game, ui } = newGame();
    const hash = game.serialize();
    delete hash._options;
    const loaded = Game.fromHash(JSON.parse(JSON.stringify(hash)), ui);
    expect(loaded.options.alwaysIgnoreTraders).toBe(true);
    expect(loaded.options.remindLoans).toBe(true);
  });
});

describe('Game properties', () => {
  it('computes the score from worth, days and how the game ended', () => {
    const { game } = newGame({ difficulty: Difficulty.Normal });
    const cmdr = game.commander;
    cmdr.cash = 100000 - cmdr.ship.price; // worth 100,000
    cmdr.days = 50;

    game.endStatus = 0; // Killed: 3 * 90 * 100,000 / 250,000
    expect(game.score).toBe(108);
    game.endStatus = 1; // Retired: 3 * 95 * 100,000 / 250,000
    expect(game.score).toBe(114);
    game.endStatus = 2; // Moon: 3 * 100 * ((300 - 50) * 1000 + 100,000) / 250,000
    expect(game.score).toBe(420);
  });

  it('counts only a tenth of worth above a million towards the score', () => {
    const { game } = newGame();
    game.commander.cash = 2000000 - game.commander.ship.price;
    game.endStatus = 1;
    // worth counted as 1,100,000
    expect(game.score).toBe(Math.trunc((3 * 95 * 1100000) / 250000));
  });

  it('selects a system by part of its name', () => {
    const { game } = newGame();
    game.selectedSystemName = 'kRAv';
    expect(game.selectedSystemId).toBe(StarSystemId.Kravat);
    expect(game.warpSystemId).toBe(StarSystemId.Kravat);
  });

  it('targets the far end of a wormhole', () => {
    const { game } = newGame();
    const [a, b] = game.wormholes;
    game.selectedSystemId = a!;
    game.targetWormhole = true;
    expect(game.selectedSystemId).toBe(a);
    expect(game.warpSystemId).toBe(b);
  });

  it('steps through the systems in range', () => {
    const { game } = newGame();
    const dest = game.destinations;
    expect(dest.length).toBeGreaterThanOrEqual(3);

    const visited: number[] = [];
    for (let i = 0; i < dest.length; i++) {
      game.selectNextSystemWithinRange(true);
      visited.push(game.warpSystemId);
    }
    expect(new Set(visited).size).toBe(dest.length);
    game.selectNextSystemWithinRange(true);
    expect(game.warpSystemId).toBe(visited[0]);
    game.selectNextSystemWithinRange(false);
    expect(game.warpSystemId).toBe(visited[visited.length - 1]);
  });

  it('adds up the daily costs', () => {
    const { game } = newGame();
    const cmdr = game.commander;
    expect(game.currentCosts).toBe(0);

    cmdr.debt = 1000;
    expect(game.interestCosts).toBe(100);
    cmdr.ship = new Ship(ShipType.Wasp); // The Gnat has no room for crew.
    cmdr.ship.crew[0] = cmdr;
    cmdr.ship.hire(game.mercenaries[3]!);
    expect(game.mercenaryCosts).toBe(game.mercenaries[3]!.rate);
    cmdr.ship.escapePod = true;
    cmdr.insurance = true;
    expect(game.insuranceCosts).toBeGreaterThan(0);
    expect(game.currentCosts).toBe(game.interestCosts + game.mercenaryCosts + game.insuranceCosts);
  });
});
