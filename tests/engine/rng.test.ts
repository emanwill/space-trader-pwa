import { afterEach, describe, expect, it } from 'vitest';
import {
  getRandom,
  getRandom2,
  randSeed,
  seededRandomSource,
  setRandomSource,
} from '../../src/engine/rng';

afterEach(() => setRandomSource(Math.random));

describe('getRandom', () => {
  it('returns integers in [min, max), like Random.Next', () => {
    setRandomSource(() => 0);
    expect(getRandom(10)).toBe(0);
    expect(getRandom(9, 14)).toBe(9);
    setRandomSource(() => 0.9999);
    expect(getRandom(10)).toBe(9);
    expect(getRandom(9, 14)).toBe(13);
  });

  it('returns min for an empty range and throws for a reversed one', () => {
    expect(getRandom(0)).toBe(0);
    expect(getRandom(5, 5)).toBe(5);
    expect(() => getRandom(-1)).toThrow(RangeError);
  });

  it('repeats a sequence from the same seed', () => {
    setRandomSource(seededRandomSource(42));
    const first = Array.from({ length: 20 }, () => getRandom(100));
    setRandomSource(seededRandomSource(42));
    const second = Array.from({ length: 20 }, () => getRandom(100));
    expect(second).toEqual(first);
    expect(new Set(first).size).toBeGreaterThan(5);
  });
});

describe('getRandom2', () => {
  // Expected values come from running the C# algorithm with arbitrary-precision
  // integers (Python), which is what C#'s 64-bit longs give for these seeds.
  it('matches the original seeded generator', () => {
    randSeed(5, 100);
    expect(Array.from({ length: 6 }, () => getRandom2(1000))).toEqual([
      108, 531, 787, 128, 368, 796,
    ]);
  });

  it('uses the default seeds for seeds of 0', () => {
    randSeed(0, 0);
    expect(Array.from({ length: 6 }, () => getRandom2(100))).toEqual([93, 35, 97, 11, 72, 54]);
  });
});
