import { afterEach, describe, expect, it } from 'vitest';
import { Difficulty } from '../../src/engine/data/enums';
import {
  adjustSkillForDifficulty,
  distance,
  wormholeExists,
  wormholeTarget,
} from '../../src/engine/functions';
import { setCurrentGame } from '../../src/engine/game-context';
import { makeSystem, useFakeGame } from './fake-game';

afterEach(() => setCurrentGame(null));

describe('distance', () => {
  it('rounds down', () => {
    useFakeGame();
    const origin = makeSystem(0);
    expect(distance(origin, makeSystem(1, { x: 3, y: 4 }))).toBe(5);
    expect(distance(origin, makeSystem(1, { x: 1, y: 1 }))).toBe(1); // 1.41
    expect(distance(origin, 6, 6)).toBe(8); // 8.49
  });
});

describe('wormholes', () => {
  it('link each system in the list to the next, wrapping around', () => {
    const game = useFakeGame();
    game.wormholes = [0, 2, 1];
    const [a, b, c] = [game.universe[0]!, game.universe[1]!, game.universe[2]!];

    expect(wormholeExists(0, 2)).toBe(true);
    expect(wormholeExists(0, 1)).toBe(false);
    expect(wormholeExists(1, 0)).toBe(true);
    expect(wormholeExists(0, -1)).toBe(true);
    expect(wormholeExists(5, -1)).toBe(false);

    expect(wormholeExists(a, c)).toBe(true);
    expect(wormholeExists(a, b)).toBe(false);

    expect(wormholeTarget(2)).toBe(b);
    expect(wormholeTarget(5)).toBeNull();
  });
});

describe('adjustSkillForDifficulty', () => {
  it('helps on easy levels and hinders on hard ones', () => {
    const game = useFakeGame();
    const expected: [Difficulty, number][] = [
      [Difficulty.Beginner, 6],
      [Difficulty.Easy, 6],
      [Difficulty.Normal, 5],
      [Difficulty.Hard, 4],
      [Difficulty.Impossible, 4],
    ];
    for (const [difficulty, skill] of expected) {
      game.difficulty = difficulty;
      expect(adjustSkillForDifficulty(5)).toBe(skill);
    }
  });
});
