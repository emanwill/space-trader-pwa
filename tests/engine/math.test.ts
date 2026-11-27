import { describe, expect, it } from 'vitest';
import { idiv, imod, roundHalfEven, toInt } from '../../src/engine/math';

describe('idiv', () => {
  it('truncates toward zero like C# integer division', () => {
    expect(idiv(7, 2)).toBe(3);
    expect(idiv(-7, 2)).toBe(-3);
    expect(idiv(7, -2)).toBe(-3);
    expect(idiv(100 * 3, 4)).toBe(75);
  });

  it('throws on division by zero', () => {
    expect(() => idiv(1, 0)).toThrow(RangeError);
  });
});

describe('imod', () => {
  it('keeps the sign of the dividend', () => {
    expect(imod(-7, 3)).toBe(-1);
    expect(imod(7, -3)).toBe(1);
  });
});

describe('toInt', () => {
  it('truncates toward zero like a C# (int) cast', () => {
    expect(toInt(2.9)).toBe(2);
    expect(toInt(-2.9)).toBe(-2);
  });
});

describe('roundHalfEven', () => {
  it('rounds midpoints to the nearest even integer like C# Math.Round', () => {
    expect(roundHalfEven(0.5)).toBe(0);
    expect(roundHalfEven(1.5)).toBe(2);
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(-0.5) === 0).toBe(true); // sign of zero is irrelevant for game math
    expect(roundHalfEven(-1.5)).toBe(-2);
    expect(roundHalfEven(-2.5)).toBe(-2);
  });

  it('rounds non-midpoints normally', () => {
    expect(roundHalfEven(2.4)).toBe(2);
    expect(roundHalfEven(2.6)).toBe(3);
    expect(roundHalfEven(-2.6)).toBe(-3);
  });
});
