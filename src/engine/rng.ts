// Port of the random-number functions in Functions.cs.
//
// Gameplay randomness (the original's System.Random) goes through an
// injectable source so tests and scripted games can be deterministic. The
// news generator's seeded generator (Pieter's Rand/RandSeed, used through
// GetRandom2) is ported exactly, because the original relies on it producing
// the same headlines for the same system and day.

/** Returns a float in [0, 1), like Math.random(). */
export type RandomSource = () => number;

let source: RandomSource = Math.random;

/** Replaces the gameplay random source. Returns the previous one. */
export function setRandomSource(next: RandomSource): RandomSource {
  const previous = source;
  source = next;
  return previous;
}

/** A small seedable generator (mulberry32) for tests and reproducible games. */
export function seededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * C# `Functions.GetRandom(max)` / `GetRandom(min, max)`, i.e. `Random.Next(min, max)`:
 * an integer in [min, max), or min when max equals min. Throws if max < min, as .NET does.
 */
export function getRandom(max: number): number;
export function getRandom(min: number, max: number): number;
export function getRandom(a: number, b?: number): number {
  const [min, max] = b === undefined ? [0, a] : [a, b];
  if (max < min) throw new RangeError(`getRandom: max (${max}) is less than min (${min})`);
  return min + Math.floor(source() * (max - min));
}

// Pieter's seeded generator, tweaked a bit by SjG.

const DEFSEEDX = 521288629;
const DEFSEEDY = 362436069;
const MAX_WORD = 65535;

let seedX = DEFSEEDX;
let seedY = DEFSEEDY;

// The C# does this in 64-bit longs. Seeds start below 2^31 and each step keeps
// them there (18000 * 65535 + 32767 and 30903 * 65535 + 32767 are both below
// 2^31), so the result stays below 2^47 and doubles represent it exactly. The
// shifts are written as multiplication and division because JS bitwise
// operators work on 32 bits.
function rand(): number {
  const a = 18000;
  const b = 30903;

  seedX = a * (seedX % (MAX_WORD + 1)) + Math.floor(seedX / 65536);
  seedY = b * (seedY % (MAX_WORD + 1)) + Math.floor(seedY / 65536);

  return seedX * 65536 + (seedY % (MAX_WORD + 1));
}

/** C# `Functions.GetRandom2(max)`: the next value from the seeded generator, in [0, max). */
export function getRandom2(max: number): number {
  return rand() % max;
}

/** C# `Functions.RandSeed`: a seed of 0 or less selects the default. */
export function randSeed(seed1: number, seed2: number): void {
  seedX = seed1 > 0 ? seed1 : DEFSEEDX;
  seedY = seed2 > 0 ? seed2 : DEFSEEDY;
}
