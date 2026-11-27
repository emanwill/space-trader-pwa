// Helpers for tests that run a real Game.

import { afterEach } from 'vitest';
import { CrewMemberId, Difficulty, StarSystemId } from '../../src/engine/data/enums';
import { Strings } from '../../src/engine/data/strings';
import { Game } from '../../src/engine/game';
import { setCurrentGame } from '../../src/engine/game-context';
import { seededRandomSource, setRandomSource } from '../../src/engine/rng';
import type { StarSystem } from '../../src/engine/model/star-system';
import { ScriptedUI, type ScriptedUIOptions } from './scripted-ui';

export interface NewGameOptions {
  seed?: number;
  difficulty?: Difficulty;
  /** Pilot, fighter, trader, engineer. They must add up to 20 in the real game. */
  skills?: [number, number, number, number];
  ui?: ScriptedUI | ScriptedUIOptions;
  name?: string;
}

/** A seeded new game with a ScriptedUI. Call `useGameCleanup()` in the test file. */
export function newGame(options: NewGameOptions = {}): { game: Game; ui: ScriptedUI } {
  setRandomSource(seededRandomSource(options.seed ?? 1));
  const ui = options.ui instanceof ScriptedUI ? options.ui : new ScriptedUI(options.ui ?? {});
  const [pilot, fighter, trader, engineer] = options.skills ?? [5, 5, 5, 5];
  const game = Game.newGame(
    options.name ?? 'Tester',
    options.difficulty ?? Difficulty.Normal,
    pilot,
    fighter,
    trader,
    engineer,
    ui,
  );
  return { game, ui };
}

/** Clears the current game, the random source and the commander's name after each test. */
export function useGameCleanup(): void {
  const originalName = Strings.CrewMemberNames[CrewMemberId.Commander]!;
  afterEach(() => {
    setCurrentGame(null);
    setRandomSource(Math.random);
    Strings.CrewMemberNames[CrewMemberId.Commander] = originalName;
  });
}

/** Saves and reloads the game through JSON, as a save file would. */
export function reload(game: Game, ui = game.ui): Game {
  return Game.fromHash(JSON.parse(JSON.stringify(game.serialize())), ui);
}

/** Moves the commander to a system, as if they had just arrived, and recalculates prices. */
export function moveTo(game: Game, system: StarSystem | StarSystemId): StarSystem {
  const target = typeof system === 'number' ? game.universe[system]! : system;
  game.commander.currentSystem = target;
  target.visited = true;
  game.selectedSystemId = target.id;
  // calculatePrices is private; warpDirect's pricing is what a test needs, minus the arrival.
  (game as unknown as { calculatePrices(s: StarSystem): void }).calculatePrices(target);
  return target;
}

/** The first system other than the current one that the commander can reach. */
export function reachableSystem(game: Game): StarSystem {
  const id = game.destinations.find((d) => d !== game.commander.currentSystemId);
  if (id === undefined) throw new Error('No reachable system');
  return game.universe[id]!;
}
