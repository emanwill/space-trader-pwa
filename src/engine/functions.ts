// Port of the game-logic helpers in Functions.cs. The random-number functions
// are in rng.ts, the string formatting in format.ts; file, registry and
// drawing helpers are replaced by the UI and persistence layers.

import { Difficulty } from './data/enums';
import { currentGame } from './game-context';
import type { StarSystem } from './model/star-system';
import { toInt } from './math';
import { getRandom } from './rng';

export function adjustSkillForDifficulty(skill: number): number {
  switch (currentGame().difficulty) {
    case Difficulty.Beginner:
    case Difficulty.Easy:
      skill++;
      break;
    case Difficulty.Hard:
    case Difficulty.Impossible:
      skill--;
      break;
    default:
      break;
  }

  return skill;
}

/** Distance between two systems, or between a system and a point, rounded down. */
export function distance(a: StarSystem, b: StarSystem): number;
export function distance(a: StarSystem, x: number, y: number): number;
export function distance(a: StarSystem, b: StarSystem | number, y?: number): number {
  const [x, by] = typeof b === 'number' ? [b, y!] : [b.x, b.y];
  return toInt(Math.floor(Math.sqrt(Math.pow(a.x - x, 2) + Math.pow(a.y - by, 2))));
}

export function randomSkill(): number {
  return 1 + getRandom(5) + getRandom(6);
}

/**
 * True if there is a wormhole from a to b. With system ids, b < 0 means "a
 * wormhole from a to anywhere".
 */
export function wormholeExists(a: number, b: number): boolean;
export function wormholeExists(a: StarSystem, b: StarSystem): boolean;
export function wormholeExists(a: number | StarSystem, b: number | StarSystem): boolean {
  const game = currentGame();
  const wormholes = game.wormholes;

  if (typeof a === 'number') {
    const i = wormholes.indexOf(a);
    return i >= 0 && ((b as number) < 0 || wormholes[(i + 1) % wormholes.length] === b);
  }

  const i = wormholes.indexOf(a.id);
  return i >= 0 && game.universe[wormholes[(i + 1) % wormholes.length]!] === b;
}

export function wormholeTarget(a: number): StarSystem | null {
  const game = currentGame();
  const wormholes = game.wormholes;
  const i = wormholes.indexOf(a);
  return i >= 0 ? game.universe[wormholes[(i + 1) % wormholes.length]!]! : null;
}
