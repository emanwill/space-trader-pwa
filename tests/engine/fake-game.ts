// A stand-in for the running game, for tests of code that reads currentGame().
// It holds real model objects (commander, ship, star systems, mercenaries) but
// none of the Game logic, which arrives in Phase 3.

import {
  CrewMemberId,
  Difficulty,
  PoliticalSystemType,
  ShipType,
  Size,
  SpecialResource,
  type StarSystemId,
  SystemPressure,
  TechLevel,
} from '../../src/engine/data/enums';
import { Strings } from '../../src/engine/data/strings';
import { type GameContext, setCurrentGame } from '../../src/engine/game-context';
import { Commander } from '../../src/engine/model/commander';
import { CrewMember } from '../../src/engine/model/crew-member';
import { Ship } from '../../src/engine/model/ship';
import { StarSystem } from '../../src/engine/model/star-system';
import { seededRandomSource, setRandomSource } from '../../src/engine/rng';

export class FakeGame implements GameContext {
  difficulty = Difficulty.Normal;
  commander: Commander | null = null;
  mercenaries: (CrewMember | null)[] = new Array<CrewMember | null>(
    Strings.CrewMemberNames.length,
  ).fill(null);
  universe: StarSystem[] = [];
  wormholes: number[] = [];
  warpSystem: StarSystem | null = null;
  opponent: Ship = new Ship(ShipType.Gnat);
  opponentDisabled = false;
  priceCargoBuy: number[] = new Array<number>(10).fill(0);
  priceCargoSell: number[] = new Array<number>(10).fill(0);
  options = { reserveMoney: false };
  currentCosts = 0;

  questStatusArtifact = 0;
  questStatusDragonfly = 0;
  questStatusExperiment = 0;
  questStatusGemulon = 0;
  questStatusJapori = 0;
  questStatusJarek = 0;
  questStatusMoon = 0;
  questStatusPrincess = 0;
  questStatusReactor = 0;
  questStatusScarab = 0;
  questStatusSculpture = 0;
  questStatusSpaceMonster = 0;

  /** Systems passed to recalculateBuyPrices, in order. */
  readonly recalculated: StarSystem[] = [];

  recalculateBuyPrices(system: StarSystem): void {
    this.recalculated.push(system);
  }

  get cmdr(): Commander {
    return this.commander!;
  }
}

export interface SystemOptions {
  x?: number;
  y?: number;
  size?: Size;
  techLevel?: TechLevel;
  politicalSystemType?: PoliticalSystemType;
  systemPressure?: SystemPressure;
  specialResource?: SpecialResource;
}

export function makeSystem(id: StarSystemId, options: SystemOptions = {}): StarSystem {
  return new StarSystem(
    id,
    options.x ?? 0,
    options.y ?? 0,
    options.size ?? Size.Medium,
    options.techLevel ?? TechLevel.HiTech,
    options.politicalSystemType ?? PoliticalSystemType.Democracy,
    options.systemPressure ?? SystemPressure.None,
    options.specialResource ?? SpecialResource.Nothing,
  );
}

export interface FakeGameOptions {
  difficulty?: Difficulty;
  /** Tech level of the commander's current system (system 0). */
  techLevel?: TechLevel;
  /** The commander's skills: pilot, fighter, trader, engineer. */
  skills?: [number, number, number, number];
  seed?: number;
}

/**
 * Sets up and installs a fake game: a seeded RNG, three systems (0 at the
 * origin, where the commander is; 1 at distance 10; 2 at distance 50), a
 * commander in a Gnat with a pulse laser, and every other crew member waiting
 * nowhere (StarSystemId.NA) with skills of 5.
 */
export function useFakeGame(options: FakeGameOptions = {}): FakeGame {
  setRandomSource(seededRandomSource(options.seed ?? 1));

  const game = new FakeGame();
  game.difficulty = options.difficulty ?? Difficulty.Normal;
  setCurrentGame(game);

  game.universe = [
    makeSystem(0, { techLevel: options.techLevel ?? TechLevel.HiTech }),
    makeSystem(1, { x: 10 }),
    makeSystem(2, { x: 30, y: 40 }),
  ];
  game.warpSystem = game.universe[1]!;

  for (let id = 1; id < game.mercenaries.length; id++)
    game.mercenaries[id] = new CrewMember(id, 5, 5, 5, 5, -1);

  const [pilot, fighter, trader, engineer] = options.skills ?? [5, 5, 5, 5];
  const commander = new Commander(
    new CrewMember(CrewMemberId.Commander, pilot, fighter, trader, engineer, 0),
  );
  game.commander = commander;
  game.mercenaries[CrewMemberId.Commander] = commander;

  return game;
}
